import { ENV } from "../_core/env";
import { exchangeWithOAuthState } from "../_core/oauth-state";
import {
  consumeOAuthStateReservation,
  releaseOAuthStateReservation,
  reserveOAuthStateReservation,
} from "../db";

const TEST_SECRET = "oauth-state-db-test-secret-with-sufficient-entropy-1234567890";

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

function sendResult(value: Record<string, unknown>) {
  process.stdout.write(`RESULT ${JSON.stringify(value)}\n`, () => process.exit(0));
}

async function readInput(): Promise<WorkerInput> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as WorkerInput;
}

async function main() {
  const input = await readInput();
  ENV.cookieSecret = TEST_SECRET;

  if (input.operation === "reserve") {
    const changed = await reserveOAuthStateReservation({
      stateHash: input.stateHash!,
      reservationId: input.reservationId!,
      expiresAtMs: input.expiresAtMs!,
      nowMs: input.nowMs!,
    });
    sendResult({ ok: true, changed });
    return;
  }

  if (input.operation === "consume") {
    const changed = await consumeOAuthStateReservation({
      stateHash: input.stateHash!,
      reservationId: input.reservationId!,
      nowMs: input.nowMs!,
    });
    sendResult({ ok: true, changed });
    return;
  }

  if (input.operation === "release") {
    const changed = await releaseOAuthStateReservation({
      stateHash: input.stateHash!,
      reservationId: input.reservationId!,
    });
    sendResult({ ok: true, changed });
    return;
  }

  let exchangeInvoked = false;
  try {
    const value = await exchangeWithOAuthState(input.state!, async () => {
      exchangeInvoked = true;
      process.stdout.write("EXCHANGE_STARTED\n");
      if (input.mode === "hold") await new Promise<void>(() => {});
      if (input.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, input.delayMs));
      }
      if (input.mode === "fail") throw new Error("simulated upstream failure");
      return "simulated-token";
    });
    sendResult({ ok: true, exchangeInvoked, value });
  } catch (error) {
    sendResult({
      ok: false,
      exchangeInvoked,
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
}

void main().catch((error) => {
  sendResult({ ok: false, error: error instanceof Error ? error.message : "unknown error" });
});
