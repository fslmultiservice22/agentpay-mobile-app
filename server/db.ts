import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type OAuthStateReservationInput = {
  stateHash: string;
  reservationId: string;
  expiresAtMs: number;
  nowMs: number;
};

async function requireOAuthStateDatabase() {
  const db = await getDb();
  if (!db) {
    throw new Error("OAuth state persistence database is not available");
  }
  return db;
}

/** Atomically inserts one reservation; duplicate state hashes never replace an existing row. */
export async function reserveOAuthStateReservation(
  input: OAuthStateReservationInput,
): Promise<boolean> {
  const db = await requireOAuthStateDatabase();
  const retainUntilMs = input.nowMs - 24 * 60 * 60 * 1000;

  // Retain consumed/recovery records for 24h after token expiry, then prune a bounded batch.
  await db.execute(sql`
    DELETE FROM oauth_state_reservations
    WHERE expiresAtMs <= ${retainUntilMs}
    ORDER BY expiresAtMs
    LIMIT 500
  `);

  const [result] = await db.execute(sql`
    INSERT IGNORE INTO oauth_state_reservations
      (stateHash, status, reservationId, expiresAtMs)
    VALUES
      (${input.stateHash}, 'reserved', ${input.reservationId}, ${input.expiresAtMs})
  `);
  return result.affectedRows === 1;
}

/** Consumes only a live reservation owned by this attempt. */
export async function consumeOAuthStateReservation(input: {
  stateHash: string;
  reservationId: string;
  nowMs: number;
}): Promise<boolean> {
  const db = await requireOAuthStateDatabase();
  const [result] = await db.execute(sql`
    UPDATE oauth_state_reservations
    SET status = 'consumed', reservationId = NULL, consumedAt = CURRENT_TIMESTAMP(3)
    WHERE stateHash = ${input.stateHash}
      AND status = 'reserved'
      AND reservationId = ${input.reservationId}
      AND expiresAtMs > ${input.nowMs}
  `);
  return result.affectedRows === 1;
}

/** Releases only a still-reserved row owned by this attempt. */
export async function releaseOAuthStateReservation(input: {
  stateHash: string;
  reservationId: string;
}): Promise<boolean> {
  const db = await requireOAuthStateDatabase();
  const [result] = await db.execute(sql`
    DELETE FROM oauth_state_reservations
    WHERE stateHash = ${input.stateHash}
      AND status = 'reserved'
      AND reservationId = ${input.reservationId}
  `);
  return result.affectedRows === 1;
}
