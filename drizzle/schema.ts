import {
  bigint,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const oauthStateReservations = mysqlTable(
  "oauth_state_reservations",
  {
    stateHash: varchar("stateHash", { length: 64 }).primaryKey(),
    status: mysqlEnum("status", ["reserved", "consumed"]).notNull(),
    reservationId: varchar("reservationId", { length: 64 }),
    expiresAtMs: bigint("expiresAtMs", { mode: "number", unsigned: true }).notNull(),
    reservedAt: timestamp("reservedAt", { mode: "date", fsp: 3 }).defaultNow().notNull(),
    consumedAt: timestamp("consumedAt", { mode: "date", fsp: 3 }),
  },
  (table) => [index("oauth_state_reservations_expires_idx").on(table.expiresAtMs)],
);

export const sessionTokenRevocations = mysqlTable(
  "session_token_revocations",
  {
    tokenHash: varchar("tokenHash", { length: 64 }).primaryKey(),
    expiresAtMs: bigint("expiresAtMs", { mode: "number", unsigned: true }).notNull(),
    revokedAt: timestamp("revokedAt", { mode: "date", fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [index("session_token_revocations_expires_idx").on(table.expiresAtMs)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here
