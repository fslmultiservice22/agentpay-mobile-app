import { spawnSync } from "node:child_process";

if (process.argv.includes("--watch")) {
  console.log("TypeScript watch skipped in the managed preview; run pnpm check for a full validation.");
  process.exit(0);
}

const executable = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(executable, ["exec", "tsc", "--noEmit", "--pretty", "false"], {
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error("Unable to run TypeScript validation:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
