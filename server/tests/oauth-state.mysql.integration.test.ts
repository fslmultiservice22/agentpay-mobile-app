import { createHash, randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";

import { createConnection } from "mysql2/promise";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { ENV } from "../_core/env";
import { createOAuthState, OAUTH_STATE_TTL_MS } from "../_core/oauth-state";

const TEST_SECRET = "oauth-state-db-test-secret-with-sufficient-entropy-1234567890";
const RUN_DATABASE_TESTS = process.env.AGENTPAY_RUN_OAUTH_STATE_DB_TESTS === "1";
const rawDatabaseUrl = process.env.AGENTPAY_OAUTH_STATE_TEST_DATABASE_URL;

function validateDisposableDatabaseUrl(value: string | undefined): string {
  if (!value) {
    throw new Error("OAuth state DB tests require AGENTPAY_OAUTH_STATE_TEST_DATABASE_URL");
  }

  const url = new URL(value);
  const databaseName = url.pathname.slice(1);
  if (
    url.protocol !== "mysql:" ||
    url.hostname !== "127.0.0.1" ||
    !url.port ||
    url.username !== "agentpay_oauth_test" ||
    !url.password ||
    !/^agentpay_oauth_state_test_[a-z0-9_-]+$/.test(databaseName) ||
    url.search ||
    url.hash
  ) {
    throw new Error("OAuth state DB tests accept only the named disposable MySQL loopback database");
  }
  return value;
}

const databaseUrl = RUN_DATABASE_TESTS ? validateDisposableDatabaseUrl(rawDatabaseUrl) : undefined;
const workerPath = join(process.cwd(), "server/tests/oauth-state-process-worker.ts");

type WorkerInput = {
  operation?: "exchange" | "reserve" | "consume" | "release";
  state?: string;
  mode?: "success" | "fail" | "hold";
  delayMs?: number;
  stateHash?: string;
  reservationId?: string;
  expiresAtMs?: number;
  nowMs?: number;
};

type WorkerResult = {
  ok: boolean;
  changed?: boolean;
  exchangeInvoked?: boolean;
  error?: string;
  value?: string;
};

type WorkerHandle = {
  child: ChildProcess;
  started: Promise<void>;
  result: Promise<WorkerResult>;
};

function startWorker(input: WorkerInput): WorkerHandle {
  const child = spawn(process.execPath, ["--import", "tsx", workerPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl!,
      NODE_ENV: "test",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  let buffer = "";
  let stderr = "";
  let settled = false;
  let resolveStarted!: () => void;
  let resolveResult!: (result: WorkerResult) => void;
  let rejectResult!: (error: Error) => void;
  const started = new Promise<void>((resolve) => {
    resolveStarted = resolve;
  });
  const result = new Promise<WorkerResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line === "EXCHANGE_STARTED") {
        resolveStarted();
      } else if (line.startsWith("RESULT ")) {
        settled = true;
        try {
          resolveResult(JSON.parse(line.slice("RESULT ".length)) as WorkerResult);
        } catch {
          rejectResult(new Error("OAuth worker returned malformed test output"));
        }
      }
    }
  });
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    stderr += chunk;
  });
  child.on("error", (error) => {
    settled = true;
    rejectResult(error);
  });
  child.on("exit", (code, signal) => {
    if (!settled) {
      settled = true;
      rejectResult(new Error(`OAuth worker exited without a result (${signal ?? code}); stderr bytes=${stderr.length}`));
    }
  });
  child.stdin?.end(JSON.stringify(input));

  return { child, started, result };
}

async function waitForStarted(worker: WorkerHandle) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      worker.started,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("OAuth worker did not reach the exchange callback")), 15_000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function waitForExit(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("OAuth worker did not exit after termination")), 10_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function clearReservations() {
  const connection = await createConnection(databaseUrl!);
  try {
    await connection.query("DELETE FROM oauth_state_reservations");
  } finally {
    await connection.end();
  }
}

type ReservationSeed = {
  stateHash: string;
  status: "reserved" | "consumed";
  reservationId: string | null;
  expiresAtMs: number;
};

function randomStateHash() {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

async function seedReservations(rows: ReservationSeed[]) {
  const connection = await createConnection(databaseUrl!);
  try {
    const placeholders = rows.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const values = rows.flatMap((row) => [
      row.stateHash,
      row.status,
      row.reservationId,
      row.expiresAtMs,
      row.status === "consumed" ? new Date() : null,
    ]);
    await connection.execute(
      `INSERT INTO oauth_state_reservations (stateHash, status, reservationId, expiresAtMs, consumedAt) VALUES ${placeholders}`,
      values,
    );
  } finally {
    await connection.end();
  }
}

async function getPresentReservationHashes(stateHashes: string[]) {
  const connection = await createConnection(databaseUrl!);
  try {
    const placeholders = stateHashes.map(() => "?").join(", ");
    const [rows] = await connection.execute(
      `SELECT stateHash FROM oauth_state_reservations WHERE stateHash IN (${placeholders})`,
      stateHashes,
    );
    return new Set((rows as Array<{ stateHash: string }>).map((row) => row.stateHash));
  } finally {
    await connection.end();
  }
}

const databaseDescribe = describe.skipIf(!RUN_DATABASE_TESTS);

databaseDescribe("OAuth state MySQL integration", () => {
  beforeAll(async () => {
    ENV.cookieSecret = TEST_SECRET;
    const connection = await createConnection(databaseUrl!);
    try {
      const [rows] = await connection.query("SHOW TABLES LIKE 'oauth_state_reservations'");
      if (!Array.isArray(rows) || rows.length !== 1) {
        throw new Error("Apply the candidate Drizzle migrations to the disposable test database first");
      }
    } finally {
      await connection.end();
    }
  });

  afterEach(async () => {
    await clearReservations();
  });

  it("keeps successful consumption across a fresh process", async () => {
    const state = createOAuthState("agentpay:///oauth/callback");
    const first = await startWorker({ state, mode: "success" }).result;
    const restarted = await startWorker({ state, mode: "success" }).result;

    expect(first).toMatchObject({ ok: true, exchangeInvoked: true });
    expect(restarted.ok).toBe(false);
    expect(restarted.exchangeInvoked).toBe(false);
    expect(restarted.error).toMatch(/already been used|in progress/i);
  }, 30_000);

  it("allows exactly one exchange across two concurrent Node processes", async () => {
    const state = createOAuthState("agentpay:///oauth/callback");
    const winner = startWorker({ state, mode: "success", delayMs: 700 });
    try {
      await waitForStarted(winner);
      const contender = startWorker({ state, mode: "success" });
      const [winnerResult, contenderResult] = await Promise.all([winner.result, contender.result]);

      expect(winnerResult).toMatchObject({ ok: true, exchangeInvoked: true });
      expect(contenderResult.ok).toBe(false);
      expect(contenderResult.exchangeInvoked).toBe(false);
      expect(contenderResult.error).toMatch(/already been used|in progress/i);
    } finally {
      if (winner.child.exitCode === null && winner.child.signalCode === null) {
        winner.child.kill("SIGKILL");
      }
    }
  }, 30_000);

  it("releases a failed attempt for retry, while concurrent attempts remain blocked", async () => {
    const state = createOAuthState("agentpay:///oauth/callback");
    const failing = startWorker({ state, mode: "fail", delayMs: 8_000 });
    try {
      await waitForStarted(failing);
      const concurrent = await startWorker({ state, mode: "success" }).result;
      const failure = await failing.result;
      const retry = await startWorker({ state, mode: "success" }).result;

      expect(concurrent.ok).toBe(false);
      expect(concurrent.exchangeInvoked).toBe(false);
      expect(failure).toMatchObject({ ok: false, exchangeInvoked: true, error: "simulated upstream failure" });
      expect(retry).toMatchObject({ ok: true, exchangeInvoked: true });
    } finally {
      if (failing.child.exitCode === null && failing.child.signalCode === null) {
        failing.child.kill("SIGKILL");
      }
    }
  }, 30_000);

  it("prunes at the inclusive 24-hour cutoff and limits each cleanup to 500 rows", async () => {
    const nowMs = Date.now();
    const cutoffMs = nowMs - 24 * 60 * 60 * 1000;
    const expiredRows: ReservationSeed[] = Array.from({ length: 501 }, (_, index) => ({
      stateHash: randomStateHash(),
      status: "reserved",
      reservationId: randomBytes(24).toString("base64url"),
      expiresAtMs: cutoffMs - (501 - index),
    }));
    const atCutoff: ReservationSeed = {
      stateHash: randomStateHash(),
      status: "consumed",
      reservationId: null,
      expiresAtMs: cutoffMs,
    };
    const withinRetention: ReservationSeed = {
      stateHash: randomStateHash(),
      status: "consumed",
      reservationId: null,
      expiresAtMs: cutoffMs + 1,
    };
    await seedReservations([...expiredRows, atCutoff, withinRetention]);

    const reserveOnce = () =>
      startWorker({
        operation: "reserve",
        stateHash: randomStateHash(),
        reservationId: randomBytes(24).toString("base64url"),
        expiresAtMs: nowMs + OAUTH_STATE_TTL_MS,
        nowMs,
      }).result;

    expect(await reserveOnce()).toMatchObject({ ok: true, changed: true });
    const afterFirstPass = await getPresentReservationHashes([
      ...expiredRows.map((row) => row.stateHash),
      atCutoff.stateHash,
      withinRetention.stateHash,
    ]);
    expect(expiredRows.slice(0, 500).every((row) => !afterFirstPass.has(row.stateHash))).toBe(true);
    expect(afterFirstPass.has(expiredRows[500].stateHash)).toBe(true);
    expect(afterFirstPass.has(atCutoff.stateHash)).toBe(true);
    expect(afterFirstPass.has(withinRetention.stateHash)).toBe(true);

    expect(await reserveOnce()).toMatchObject({ ok: true, changed: true });
    const afterSecondPass = await getPresentReservationHashes([
      ...expiredRows.map((row) => row.stateHash),
      atCutoff.stateHash,
      withinRetention.stateHash,
    ]);
    expect(expiredRows.filter((row) => afterSecondPass.has(row.stateHash))).toHaveLength(0);
    expect(afterSecondPass.has(atCutoff.stateHash)).toBe(false);
    expect(afterSecondPass.has(withinRetention.stateHash)).toBe(true);
    expect(
      await startWorker({
        operation: "reserve",
        stateHash: withinRetention.stateHash,
        reservationId: randomBytes(24).toString("base64url"),
        expiresAtMs: nowMs + OAUTH_STATE_TTL_MS,
        nowMs,
      }).result,
    ).toMatchObject({ ok: true, changed: false });
  }, 30_000);

  it("propagates SQL failures in consume and release without losing the reservation", async () => {
    const stateHash = randomStateHash();
    const reservationId = randomBytes(24).toString("base64url");
    const competingReservationId = randomBytes(24).toString("base64url");
    const nowMs = Date.now();
    const expiresAtMs = nowMs + OAUTH_STATE_TTL_MS;
    expect(
      await startWorker({
        operation: "reserve",
        stateHash,
        reservationId,
        expiresAtMs,
        nowMs,
      }).result,
    ).toMatchObject({ ok: true, changed: true });

    const connection = await createConnection(databaseUrl!);
    const renamedTable = `oauth_state_reservations_missing_${randomBytes(4).toString("hex")}`;
    let tableRenamed = false;
    try {
      await connection.query(`RENAME TABLE oauth_state_reservations TO \`${renamedTable}\``);
      tableRenamed = true;

      const consumeFailure = await startWorker({
        operation: "consume",
        stateHash,
        reservationId,
        nowMs,
      }).result;
      const releaseFailure = await startWorker({ operation: "release", stateHash, reservationId }).result;

      expect(consumeFailure.ok).toBe(false);
      expect(consumeFailure.error).toMatch(/oauth_state_reservations/i);
      expect(releaseFailure.ok).toBe(false);
      expect(releaseFailure.error).toMatch(/oauth_state_reservations/i);
    } finally {
      try {
        if (tableRenamed) {
          await connection.query(`RENAME TABLE \`${renamedTable}\` TO oauth_state_reservations`);
        }
      } finally {
        await connection.end();
      }
    }

    expect(
      await startWorker({
        operation: "reserve",
        stateHash,
        reservationId: competingReservationId,
        expiresAtMs,
        nowMs,
      }).result,
    ).toMatchObject({ ok: true, changed: false });
    expect(await startWorker({ operation: "release", stateHash, reservationId }).result).toMatchObject({
      ok: true,
      changed: true,
    });
  }, 30_000);

  it("keeps a reservation after process death and releases only its owning attempt", async () => {
    const state = createOAuthState("agentpay:///oauth/callback");
    const crashed = startWorker({ state, mode: "hold" });
    void crashed.result.catch(() => undefined);
    try {
      await waitForStarted(crashed);
      crashed.child.kill("SIGKILL");
      await waitForExit(crashed.child);
    } finally {
      if (crashed.child.exitCode === null && crashed.child.signalCode === null) {
        crashed.child.kill("SIGKILL");
      }
    }

    const afterCrash = await startWorker({ state, mode: "success" }).result;
    expect(afterCrash.ok).toBe(false);
    expect(afterCrash.exchangeInvoked).toBe(false);

    const stateHash = createHash("sha256").update(randomBytes(32)).digest("hex");
    const nowMs = Date.now();
    const expiresAtMs = nowMs + OAUTH_STATE_TTL_MS;
    const attemptA = "attempt-A";
    const attemptB = "attempt-B";
    const attemptC = "attempt-C";
    const direct = (operation: WorkerInput["operation"], reservationId: string) =>
      startWorker({ operation, stateHash, reservationId, expiresAtMs, nowMs }).result;

    expect(await direct("reserve", attemptA)).toMatchObject({ ok: true, changed: true });
    expect(await direct("reserve", attemptB)).toMatchObject({ ok: true, changed: false });
    expect(await direct("release", attemptB)).toMatchObject({ ok: true, changed: false });
    expect(await direct("release", attemptA)).toMatchObject({ ok: true, changed: true });
    expect(await direct("reserve", attemptB)).toMatchObject({ ok: true, changed: true });
    expect(await direct("release", attemptA)).toMatchObject({ ok: true, changed: false });
    expect(await direct("reserve", attemptC)).toMatchObject({ ok: true, changed: false });
    expect(await direct("consume", attemptB)).toMatchObject({ ok: true, changed: true });
    expect(await direct("reserve", attemptC)).toMatchObject({ ok: true, changed: false });
  }, 30_000);
});
