import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { ENV } from "./env";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type OAuthStatePayload = {
  redirectUri: string;
  nonce: string;
  expiresAt: number;
};

const consumedStates = new Map<string, number>();

function configuredRedirectUris(): string[] {
  return process.env.OAUTH_ALLOWED_REDIRECT_URIS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
}

export function isAllowedOAuthRedirectUri(redirectUri: string): boolean {
  if (configuredRedirectUris().includes(redirectUri)) return true;
  if (/^agentpay:\/{2,3}oauth\/callback$/i.test(redirectUri)) return true;
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

function pruneConsumedStates(now: number) {
  for (const [stateId, expiresAt] of consumedStates) {
    if (expiresAt <= now) consumedStates.delete(stateId);
  }
}

export function createOAuthState(redirectUri: string, now = Date.now()): string {
  if (!isAllowedOAuthRedirectUri(redirectUri)) throw new Error("OAuth redirect URI is not allowed");

  const payload: OAuthStatePayload = {
    redirectUri,
    nonce: randomBytes(24).toString("base64url"),
    expiresAt: now + OAUTH_STATE_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function consumeOAuthState(state: string, now = Date.now()): string {
  const [encodedPayload, receivedSignature, ...extra] = state.split(".");
  if (!encodedPayload || !receivedSignature || extra.length > 0) throw new Error("OAuth state is invalid");

  const expectedSignature = sign(encodedPayload);
  const receivedBuffer = Buffer.from(receivedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    throw new Error("OAuth state signature is invalid");
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("OAuth state payload is invalid");
  }

  if (
    typeof payload.redirectUri !== "string" ||
    typeof payload.nonce !== "string" ||
    typeof payload.expiresAt !== "number" ||
    payload.expiresAt <= now ||
    !isAllowedOAuthRedirectUri(payload.redirectUri)
  ) {
    throw new Error("OAuth state is expired or invalid");
  }

  pruneConsumedStates(now);
  const stateId = `${payload.nonce}.${receivedSignature}`;
  if (consumedStates.has(stateId)) throw new Error("OAuth state has already been used");
  consumedStates.set(stateId, payload.expiresAt);

  return payload.redirectUri;
}

export function resetOAuthStateForTests() {
  consumedStates.clear();
}
