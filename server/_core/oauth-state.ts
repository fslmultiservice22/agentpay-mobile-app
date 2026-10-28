import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  consumeOAuthStateReservation,
  releaseOAuthStateReservation,
  reserveOAuthStateReservation,
} from "../db";
import { ENV } from "./env";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  redirectUri: string;
  nonce: string;
  expiresAt: number;
};

type OAuthStateClaimInput = {
  stateHash: string;
  reservationId: string;
  expiresAtMs: number;
  nowMs: number;
};

export interface OAuthStatePersistence {
  reserve(input: OAuthStateClaimInput): Promise<boolean>;
  consume(input: OAuthStateClaimInput): Promise<boolean>;
  release(input: Pick<OAuthStateClaimInput, "stateHash" | "reservationId">): Promise<boolean>;
}

const databaseOAuthStatePersistence: OAuthStatePersistence = {
  reserve: reserveOAuthStateReservation,
  consume: consumeOAuthStateReservation,
  release: releaseOAuthStateReservation,
};

let testPersistence: OAuthStatePersistence | null = null;

/** Test-only dependency injection; production always defaults to the persistent DB store. */
export function setOAuthStatePersistenceForTests(
  persistence: OAuthStatePersistence | null,
) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("OAuth state test persistence can only be set in test mode");
  }
  testPersistence = persistence;
}

function persistence(): OAuthStatePersistence {
  return testPersistence ?? databaseOAuthStatePersistence;
}

function configuredRedirectUris(): string[] {
  return (
    process.env.OAUTH_ALLOWED_REDIRECT_URIS
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

export function isAllowedOAuthRedirectUri(redirectUri: string): boolean {
  if (configuredRedirectUris().includes(redirectUri)) return true;
  const lowerRedirectUri = redirectUri.toLowerCase();
  if (
    lowerRedirectUri === "agentpay://oauth/callback" ||
    lowerRedirectUri === "agentpay:///oauth/callback"
  ) {
    return true;
  }
  if (redirectUri === "http://localhost:3000/api/oauth/callback") return true;
  if (redirectUri === "https://agentpayapp-q3spezws.manus.space/api/oauth/callback") return true;
  return /^https:\/\/3000-[a-z0-9-]+\.(?:us1|us2)\.manus\.computer\/api\/oauth\/callback$/i.test(
    redirectUri,
  );
}

function stateSecret(): string {
  if (!ENV.cookieSecret) throw new Error("OAuth state secret is not configured");
  return ENV.cookieSecret;
}

function sign(encodedPayload: string): string {
  return createHmac("sha256", stateSecret()).update(encodedPayload).digest("base64url");
}

export function createOAuthState(redirectUri: string, now = Date.now()): string {
  if (!isAllowedOAuthRedirectUri(redirectUri)) {
    throw new Error("OAuth redirect URI is not allowed");
  }

  const payload: OAuthStatePayload = {
    redirectUri,
    nonce: randomBytes(24).toString("base64url"),
    expiresAt: now + OAUTH_STATE_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

type VerifiedOAuthState = OAuthStatePayload & { stateHash: string };

function verifyOAuthState(state: string, now: number): VerifiedOAuthState {
  if (typeof state !== "string" || state.length > 4096) {
    throw new Error("OAuth state is invalid");
  }

  const [encodedPayload, receivedSignature, ...extra] = state.split(".");
  if (!encodedPayload || !receivedSignature || extra.length > 0) {
    throw new Error("OAuth state is invalid");
  }

  const expectedSignature = sign(encodedPayload);
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error("OAuth state signature is invalid");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("OAuth state payload is invalid");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("OAuth state payload is invalid");
  }
  const payload = parsed as Record<string, unknown>;
  if (
    typeof payload.redirectUri !== "string" ||
    typeof payload.nonce !== "string" ||
    !/^[A-Za-z0-9_-]{32}$/.test(payload.nonce) ||
    typeof payload.expiresAt !== "number" ||
    !Number.isSafeInteger(payload.expiresAt) ||
    payload.expiresAt <= now ||
    !isAllowedOAuthRedirectUri(payload.redirectUri)
  ) {
    throw new Error("OAuth state is expired or invalid");
  }

  return {
    redirectUri: payload.redirectUri,
    nonce: payload.nonce,
    expiresAt: payload.expiresAt,
    // Persist only a digest of the signed nonce, never the raw OAuth state or code.
    stateHash: createHash("sha256").update(payload.nonce).digest("hex"),
  };
}

async function claimOAuthState(state: string, now = Date.now()) {
  const payload = verifyOAuthState(state, now);
  const reservationId = randomBytes(24).toString("base64url");
  const claimInput: OAuthStateClaimInput = {
    stateHash: payload.stateHash,
    reservationId,
    expiresAtMs: payload.expiresAt,
    nowMs: now,
  };

  if (!(await persistence().reserve(claimInput))) {
    throw new Error("OAuth state has already been used or is in progress");
  }

  let finalized = false;
  return {
    redirectUri: payload.redirectUri,
    consume: async () => {
      if (finalized) throw new Error("OAuth state reservation is no longer active");
      const consumed = await persistence().consume({
        ...claimInput,
        nowMs: Date.now(),
      });
      if (!consumed) {
        throw new Error("OAuth state reservation could not be consumed");
      }
      finalized = true;
    },
    release: async () => {
      if (finalized) return false;
      const released = await persistence().release({
        stateHash: claimInput.stateHash,
        reservationId: claimInput.reservationId,
      });
      if (!released) {
        throw new Error("OAuth state reservation could not be released by this attempt");
      }
      finalized = true;
      return true;
    },
  };
}

export async function consumeOAuthState(state: string, now = Date.now()): Promise<string> {
  const claim = await claimOAuthState(state, now);
  await claim.consume();
  return claim.redirectUri;
}

export async function exchangeWithOAuthState<T>(
  state: string,
  exchange: (redirectUri: string) => Promise<T>,
): Promise<T> {
  const claim = await claimOAuthState(state);
  let result: T;
  try {
    result = await exchange(claim.redirectUri);
  } catch (error) {
    // A failed exchange releases only this attempt's reservation; DB errors fail closed.
    await claim.release();
    throw error;
  }

  // Do not release after a successful exchange if persisting the tombstone fails.
  await claim.consume();
  return result;
}
