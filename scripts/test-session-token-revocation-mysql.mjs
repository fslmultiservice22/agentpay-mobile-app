#!/usr/bin/env node
/**
 * Disposable, loopback-only MySQL 8 integration check for session-token revocation.
 * Requires `mysqld`, `mysql`, pnpm, and repository dependencies to be installed.
 * It creates a fresh datadir and DB/user, applies Drizzle migrations, checks
 * hash-only persistence plus bearer/cookie rejection in new processes, removes
 * migration 0002's table and ledger row, proves Drizzle can replay it, verifies
 * SQL cleanup, then stops the server and deletes the entire datadir.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { accessSync, constants, existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { delimiter, dirname, join, resolve, basename } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createConnection } from "mysql2/promise";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const TEMP_PREFIX = "agentpay-session-revocation-mysql-";
const TEST_APP_ID = "agentpay-session-revocation-disposable";
const TEST_JWT_SECRET =
  "session-revocation-disposable-only-secret-9f3e72d8a4c15b6e";
const TEST_DB_USER = "agentpay_revocation_test";
const MIGRATION_TAG = "0002_session-token-revocations";
const ENV_KEYS_TO_CLEAR = [
  "DATABASE_URL",
  "MYSQL_PWD",
  "MYSQL_HOST",
  "MYSQL_TCP_PORT",
  "MYSQL_UNIX_PORT",
  "MYSQL_USER",
  "MYSQL_PASSWORD",
  "NODE_OPTIONS",
  "OAUTH_SERVER_URL",
  "BUILT_IN_FORGE_API_URL",
  "BUILT_IN_FORGE_API_KEY",
  "OWNER_OPEN_ID",
  "AGENTPAY_RUN_OAUTH_STATE_DB_TESTS",
  "AGENTPAY_OAUTH_STATE_TEST_DATABASE_URL",
  "AGENTPAY_RUN_SESSION_REVOCATION_DB_TESTS",
  "AGENTPAY_SESSION_REVOCATION_TEST_DATABASE_URL",
];

let tempDirectory;
let serverProcess;
let serverSpawnError;
let socketPath;
let databaseName;
let testDatabaseUrl;
let directConnection;
let appDatabase;
let cleanupSqlVerified = false;
let cleanupSqlError;

function cleanEnvironment(overrides = {}) {
  const env = { ...process.env };
  for (const key of ENV_KEYS_TO_CLEAR) delete env[key];
  return { ...env, ...overrides };
}

function findExecutable(name) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    const candidate = join(directory, name);
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue searching PATH.
    }
  }
  throw new Error(`Required executable not found on PATH: ${name}`);
}

function runSync(
  command,
  args,
  { env = cleanEnvironment(), timeout = 60_000 } = {},
) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env,
    encoding: "utf8",
    timeout,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const rawDetail = (result.stderr || result.stdout || "")
      .trim()
      .slice(0, 2_000);
    const detail = testDatabaseUrl
      ? rawDetail.replaceAll(
          testDatabaseUrl,
          "[disposable database URL redacted]",
        )
      : rawDetail;
    throw new Error(
      `${basename(command)} failed with status ${result.status}: ${detail}`,
    );
  }
  return (result.stdout ?? "").trim();
}

function runMysqlRoot(sql) {
  const mysql = findExecutable("mysql");
  return runSync(
    mysql,
    [
      "--no-defaults",
      "--protocol=SOCKET",
      "-uroot",
      "-S",
      socketPath,
      "-N",
      "-B",
      "-e",
      sql,
    ],
    { env: cleanEnvironment(), timeout: 10_000 },
  );
}

async function getFreeLoopbackPort() {
  const listener = createServer();
  await new Promise((resolveListen, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", resolveListen);
  });
  const address = listener.address();
  if (!address || typeof address === "string")
    throw new Error("Could not allocate a loopback port");
  const port = address.port;
  await new Promise((resolveClose, reject) =>
    listener.close((error) => (error ? reject(error) : resolveClose())),
  );
  return port;
}

const sleep = (milliseconds) =>
  new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

async function waitForMysql(mysqlPath, logPath) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (serverSpawnError) throw serverSpawnError;
    if (
      serverProcess &&
      (serverProcess.exitCode !== null || serverProcess.signalCode !== null)
    ) {
      throw new Error(
        `Disposable mysqld exited early (${serverProcess.signalCode ?? serverProcess.exitCode})`,
      );
    }
    const probe = spawnSync(
      mysqlPath,
      [
        "--no-defaults",
        "--protocol=SOCKET",
        "-uroot",
        "-S",
        socketPath,
        "-N",
        "-B",
        "-e",
        "SELECT VERSION()",
      ],
      { cwd: ROOT, env: cleanEnvironment(), encoding: "utf8", timeout: 3_000 },
    );
    if (probe.status === 0 && /^8\./.test((probe.stdout ?? "").trim()))
      return (probe.stdout ?? "").trim();
    await sleep(250);
  }
  let log = "";
  try {
    log = (await readFile(logPath, "utf8")).slice(-4_000);
  } catch {
    // Include no path or credentials; the main error remains actionable.
  }
  throw new Error(
    `Disposable MySQL 8 did not become ready.${log ? ` Server log tail: ${log}` : ""}`,
  );
}

function unwrapModule(moduleNamespace) {
  return moduleNamespace.default && typeof moduleNamespace.default === "object"
    ? moduleNamespace.default
    : moduleNamespace;
}

async function loadProjectModules() {
  const envModule = unwrapModule(
    await import(new URL("../server/_core/env.ts", import.meta.url).href),
  );
  const sdkModule = unwrapModule(
    await import(new URL("../server/_core/sdk.ts", import.meta.url).href),
  );
  const dbModule = unwrapModule(
    await import(new URL("../server/db.ts", import.meta.url).href),
  );
  const constModule = unwrapModule(
    await import(new URL("../shared/const.ts", import.meta.url).href),
  );
  return {
    ENV: envModule.ENV,
    sdk: sdkModule.sdk,
    db: dbModule,
    COOKIE_NAME: constModule.COOKIE_NAME,
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function workerMain() {
  const { ENV, sdk, db } = await loadProjectModules();
  ENV.appId = process.env.VITE_APP_ID ?? "";
  ENV.cookieSecret = process.env.JWT_SECRET ?? "";
  const input = JSON.parse(await readStdin());
  const revoked = await db.isSessionTokenRevoked(input.tokenHash);
  const session = await sdk.verifySession(input.token);
  const result = { valid: session !== null, revoked };
  const database = await db.getDb();
  if (database?.$client?.end) await database.$client.end();
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function verifyInFreshProcess(token, tokenHash) {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", SCRIPT_PATH, "--worker"],
    {
      cwd: ROOT,
      env: cleanEnvironment({
        DATABASE_URL: testDatabaseUrl,
        VITE_APP_ID: TEST_APP_ID,
        JWT_SECRET: TEST_JWT_SECRET,
        NODE_ENV: "development",
      }),
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
  child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
  child.stdin.end(JSON.stringify({ token, tokenHash }));

  return await new Promise((resolveResult, rejectResult) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectResult(new Error("Fresh-process revocation check timed out"));
    }, 20_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectResult(error);
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) {
        rejectResult(
          new Error(
            `Fresh-process verifier failed (${signal ?? code}): ${stderr.trim().slice(0, 1_000)}`,
          ),
        );
        return;
      }
      try {
        resolveResult(JSON.parse(stdout.trim()));
      } catch {
        rejectResult(
          new Error(
            `Fresh-process verifier returned invalid output: ${stdout.trim().slice(0, 1_000)}`,
          ),
        );
      }
    });
  });
}

async function cleanup() {
  if (directConnection) {
    try {
      await directConnection.end();
    } catch {
      // Cleanup continues to remove the disposable datadir.
    }
    directConnection = null;
  }
  if (appDatabase?.$client?.end) {
    try {
      await appDatabase.$client.end();
    } catch {
      // Cleanup continues to remove the disposable datadir.
    }
    appDatabase = null;
  }

  if (
    serverProcess &&
    serverProcess.exitCode === null &&
    serverProcess.signalCode === null
  ) {
    if (socketPath && existsSync(socketPath)) {
      if (databaseName) {
        try {
          runMysqlRoot(
            `DROP DATABASE IF EXISTS \`${databaseName}\`; DROP USER IF EXISTS '${TEST_DB_USER}'@'127.0.0.1'; FLUSH PRIVILEGES;`,
          );
          const remaining = runMysqlRoot(
            `SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name='${databaseName}'; ` +
              `SELECT COUNT(*) FROM mysql.user WHERE User='${TEST_DB_USER}' AND Host='127.0.0.1';`,
          )
            .split(/\r?\n/)
            .map(Number);
          assert.deepEqual(
            remaining,
            [0, 0],
            "disposable database and user must be removed",
          );
          cleanupSqlVerified = true;
        } catch (error) {
          cleanupSqlError = error;
        }
      }
      try {
        runMysqlRoot("SHUTDOWN");
      } catch {
        // Fall back to a signal if the administrative shutdown command fails.
      }
    }
    for (
      let attempt = 0;
      attempt < 50 &&
      serverProcess.exitCode === null &&
      serverProcess.signalCode === null;
      attempt += 1
    ) {
      await sleep(100);
    }
    if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
      serverProcess.kill("SIGTERM");
      for (
        let attempt = 0;
        attempt < 30 &&
        serverProcess.exitCode === null &&
        serverProcess.signalCode === null;
        attempt += 1
      ) {
        await sleep(100);
      }
    }
    if (serverProcess.exitCode === null && serverProcess.signalCode === null) {
      serverProcess.kill("SIGKILL");
      for (
        let attempt = 0;
        attempt < 20 &&
        serverProcess.exitCode === null &&
        serverProcess.signalCode === null;
        attempt += 1
      ) {
        await sleep(100);
      }
    }
  }

  if (tempDirectory && existsSync(tempDirectory)) {
    const resolvedTemp = resolve(tempDirectory);
    if (
      dirname(resolvedTemp) !== tmpdir() ||
      !basename(resolvedTemp).startsWith(TEMP_PREFIX)
    ) {
      throw new Error("Refusing to remove an unexpected temporary path");
    }
    await rm(resolvedTemp, { recursive: true, force: true });
  }
  if (databaseName && !cleanupSqlVerified) {
    const detail =
      cleanupSqlError instanceof Error ? `: ${cleanupSqlError.message}` : "";
    throw new Error(
      `Could not verify disposable database/user cleanup; datadir removed${detail}`,
    );
  }
}

function applyMigrations(pnpm) {
  const output = runSync(pnpm, ["exec", "drizzle-kit", "migrate"], {
    env: cleanEnvironment({
      DATABASE_URL: testDatabaseUrl,
      CI: "1",
      EXPO_NO_DOTENV: "1",
      EXPO_NO_TELEMETRY: "1",
      NODE_ENV: "development",
    }),
    timeout: 120_000,
  });
  if (output) console.log(output);
}

async function workerMode() {
  await workerMain();
}

async function main() {
  if (process.argv.includes("--worker")) {
    await workerMode();
    return;
  }

  const mysqld = findExecutable("mysqld");
  const mysql = findExecutable("mysql");
  const pnpm = findExecutable("pnpm");
  const versionResult = spawnSync(mysqld, ["--version"], {
    encoding: "utf8",
    env: cleanEnvironment(),
  });
  if (
    versionResult.status !== 0 ||
    !/\bVer 8\./.test(
      `${versionResult.stdout ?? ""}${versionResult.stderr ?? ""}`,
    )
  ) {
    throw new Error("This check requires a MySQL 8.x mysqld binary");
  }

  tempDirectory = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
  let result;
  try {
    const dataDirectory = join(tempDirectory, "data");
    await mkdir(dataDirectory);
    socketPath = join(tempDirectory, "mysql.sock");
    const pidPath = join(tempDirectory, "mysql.pid");
    const logPath = join(tempDirectory, "mysql.log");
    const port = await getFreeLoopbackPort();
    const basedir = resolve(dirname(mysqld), "..");
    runSync(
      mysqld,
      [
        "--no-defaults",
        "--initialize-insecure",
        `--basedir=${basedir}`,
        `--datadir=${dataDirectory}`,
      ],
      {
        env: cleanEnvironment(),
        timeout: 120_000,
      },
    );
    serverProcess = spawn(
      mysqld,
      [
        "--no-defaults",
        `--basedir=${basedir}`,
        `--datadir=${dataDirectory}`,
        `--socket=${socketPath}`,
        `--pid-file=${pidPath}`,
        `--port=${port}`,
        "--bind-address=127.0.0.1",
        "--skip-name-resolve",
        "--max-connections=40",
        `--log-error=${logPath}`,
      ],
      { cwd: ROOT, env: cleanEnvironment(), stdio: "ignore" },
    );
    serverProcess.once("error", (error) => {
      serverSpawnError = error;
    });

    const mysqlVersion = await waitForMysql(mysql, logPath);
    const rootProbe = runMysqlRoot(
      "SELECT VERSION(), @@port, @@bind_address",
    ).split("\t");
    assert.match(
      rootProbe[0] ?? "",
      /^8\./,
      "temporary server must be MySQL 8.x",
    );
    assert.equal(
      Number(rootProbe[1]),
      port,
      "temporary server must use its allocated loopback port",
    );
    assert.equal(
      rootProbe[2],
      "127.0.0.1",
      "temporary server must bind loopback only",
    );

    databaseName = `agentpay_session_revocation_test_${process.pid}_${randomBytes(4).toString("hex")}`;
    const password = randomBytes(24).toString("hex");
    runMysqlRoot(
      `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; ` +
        `CREATE USER '${TEST_DB_USER}'@'127.0.0.1' IDENTIFIED BY '${password}'; ` +
        `GRANT ALL PRIVILEGES ON \`${databaseName}\`.* TO '${TEST_DB_USER}'@'127.0.0.1'; FLUSH PRIVILEGES;`,
    );
    testDatabaseUrl = `mysql://${TEST_DB_USER}:${password}@127.0.0.1:${port}/${databaseName}`;

    const journal = JSON.parse(
      await readFile(join(ROOT, "drizzle/meta/_journal.json"), "utf8"),
    );
    const revocationMigration = journal.entries.find(
      (entry) => entry.tag === MIGRATION_TAG,
    );
    assert.ok(
      revocationMigration && Number.isSafeInteger(revocationMigration.when),
      "Drizzle journal must contain migration 0002",
    );
    const revocationMigrationSql = await readFile(
      join(ROOT, "drizzle", `${MIGRATION_TAG}.sql`),
    );
    const revocationMigrationHash = createHash("sha256")
      .update(revocationMigrationSql)
      .digest("hex");

    applyMigrations(pnpm);

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.VITE_APP_ID = TEST_APP_ID;
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.NODE_ENV = "development";
    const { ENV, sdk, db, COOKIE_NAME } = await loadProjectModules();
    ENV.appId = TEST_APP_ID;
    ENV.cookieSecret = TEST_JWT_SECRET;

    directConnection = await createConnection(testDatabaseUrl);
    const [serverRows] = await directConnection.query(
      "SELECT VERSION() AS version, DATABASE() AS databaseName, @@port AS port, @@bind_address AS bindAddress",
    );
    const serverInfo = serverRows[0];
    assert.match(String(serverInfo.version), /^8\./);
    assert.equal(serverInfo.databaseName, databaseName);
    assert.equal(Number(serverInfo.port), port);
    assert.equal(serverInfo.bindAddress, "127.0.0.1");
    const [migrationTableRows] = await directConnection.query(
      "SHOW TABLES LIKE 'session_token_revocations'",
    );
    assert.equal(
      migrationTableRows.length,
      1,
      "Drizzle migration 0002 must create the revocation table",
    );
    const [migrationLedgerRows] = await directConnection.execute(
      "SELECT hash, created_at FROM __drizzle_migrations WHERE hash = ? AND created_at = ?",
      [revocationMigrationHash, revocationMigration.when],
    );
    assert.equal(
      migrationLedgerRows.length,
      1,
      "Drizzle must register migration 0002",
    );

    appDatabase = await db.getDb();
    assert.ok(
      appDatabase,
      "application DB layer must use the disposable database URL",
    );

    async function assertCrossProcessRevocation(
      token,
      expectedHash,
      requestHeaders,
      label,
    ) {
      const before = await verifyInFreshProcess(token, expectedHash);
      assert.deepEqual(
        before,
        { valid: true, revoked: false },
        `${label}: fresh process should accept before logout`,
      );
      await sdk.revokeSessionsFromRequest({ headers: requestHeaders });
      assert.equal(
        await db.isSessionTokenRevoked(expectedHash),
        true,
        `${label}: app DB lookup should see the revocation`,
      );
      const [storedRows] = await directConnection.execute(
        "SELECT tokenHash FROM session_token_revocations WHERE tokenHash = ?",
        [expectedHash],
      );
      assert.equal(
        storedRows.length,
        1,
        `${label}: revocation hash should be stored`,
      );
      assert.equal(
        storedRows[0].tokenHash,
        expectedHash,
        `${label}: only the SHA-256 fingerprint should be stored`,
      );
      assert.notEqual(
        storedRows[0].tokenHash,
        token,
        `${label}: raw bearer/cookie must not be stored`,
      );
      const after = await verifyInFreshProcess(token, expectedHash);
      assert.deepEqual(
        after,
        { valid: false, revoked: true },
        `${label}: fresh process must reject after logout`,
      );
    }

    const bearerToken = await sdk.createSessionToken(
      "mysql-disposable-bearer",
      { name: "Disposable Bearer" },
    );
    const bearerHash = createHash("sha256")
      .update(bearerToken, "utf8")
      .digest("hex");
    await assertCrossProcessRevocation(
      bearerToken,
      bearerHash,
      { authorization: `Bearer ${bearerToken}` },
      "bearer",
    );

    const cookieToken = await sdk.createSessionToken(
      "mysql-disposable-cookie",
      { name: "Disposable Cookie" },
    );
    const cookieHash = createHash("sha256")
      .update(cookieToken, "utf8")
      .digest("hex");
    await assertCrossProcessRevocation(
      cookieToken,
      cookieHash,
      { cookie: `${COOKIE_NAME}=${cookieToken}` },
      "cookie",
    );

    if (appDatabase?.$client?.end) await appDatabase.$client.end();
    appDatabase = null;
    await directConnection.query("DROP TABLE session_token_revocations");
    const [rollbackRows] = await directConnection.query(
      "SHOW TABLES LIKE 'session_token_revocations'",
    );
    assert.equal(
      rollbackRows.length,
      0,
      "rollback must remove the table created by migration 0002",
    );
    await directConnection.execute(
      "DELETE FROM __drizzle_migrations WHERE hash = ? AND created_at = ?",
      [revocationMigrationHash, revocationMigration.when],
    );
    const [rollbackLedgerRows] = await directConnection.execute(
      "SELECT hash, created_at FROM __drizzle_migrations WHERE hash = ? AND created_at = ?",
      [revocationMigrationHash, revocationMigration.when],
    );
    assert.equal(
      rollbackLedgerRows.length,
      0,
      "rollback must remove only migration 0002's ledger row",
    );
    await directConnection.end();
    directConnection = null;

    applyMigrations(pnpm);
    directConnection = await createConnection(testDatabaseUrl);
    const [reappliedTableRows] = await directConnection.query(
      "SHOW TABLES LIKE 'session_token_revocations'",
    );
    assert.equal(
      reappliedTableRows.length,
      1,
      "Drizzle must reapply migration 0002 after rollback",
    );
    const [reappliedLedgerRows] = await directConnection.execute(
      "SELECT hash, created_at FROM __drizzle_migrations WHERE hash = ? AND created_at = ?",
      [revocationMigrationHash, revocationMigration.when],
    );
    assert.equal(
      reappliedLedgerRows.length,
      1,
      "re-applied migration 0002 must be registered again",
    );

    result = {
      mysqlVersion,
      boundTo: "127.0.0.1",
      migration0002: "applied",
      bearer: "persisted and rejected by a fresh process",
      cookie: "persisted and rejected by a fresh process",
      rollback:
        "0002 table and ledger row removed, then migration replayed successfully",
      cleanup: "temporary database/user verified absent; datadir removed",
    };
  } finally {
    await cleanup();
    if (tempDirectory && existsSync(tempDirectory))
      throw new Error("Disposable MySQL temporary directory was not removed");
    if (
      serverProcess &&
      serverProcess.exitCode === null &&
      serverProcess.signalCode === null
    ) {
      throw new Error("Disposable MySQL server did not stop");
    }
  }
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(
    `Disposable MySQL session-revocation check failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
