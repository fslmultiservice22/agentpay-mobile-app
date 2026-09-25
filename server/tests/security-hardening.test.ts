import express, { type Request } from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import {
  createOAuthState,
  consumeOAuthState,
  isAllowedOAuthRedirectUri,
  OAUTH_STATE_TTL_MS,
  resetOAuthStateForTests,
} from "../_core/oauth-state";
import { createApiRateLimitMiddleware } from "../_core/rate-limit";

const servers: ReturnType<typeof express.application.listen>[] = [];

beforeEach(() => {
  ENV.cookieSecret = "test-secret-with-sufficient-entropy-1234567890";
  resetOAuthStateForTests();
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("OAuth state hardening", () => {
  it("firma, limita nel tempo e consuma lo state una sola volta", () => {
    const now = 1_800_000_000_000;
    const redirectUri = "agentpay:///oauth/callback";
    const state = createOAuthState(redirectUri, now);

    expect(state).not.toContain(redirectUri);
    expect(consumeOAuthState(state, now + 1_000)).toBe(redirectUri);
    expect(() => consumeOAuthState(state, now + 2_000)).toThrow(/already been used/i);
  });

  it("rifiuta redirect arbitrari, state alterati e state scaduti", () => {
    const now = 1_800_000_000_000;
    expect(isAllowedOAuthRedirectUri("https://evil.example/callback")).toBe(false);
    expect(() => createOAuthState("https://evil.example/callback", now)).toThrow(/not allowed/i);

    const state = createOAuthState("https://agentpayapp-q3spezws.manus.space/api/oauth/callback", now);
    expect(() => consumeOAuthState(`${state}x`, now + 1_000)).toThrow(/signature/i);
    resetOAuthStateForTests();
    expect(() => consumeOAuthState(state, now + OAUTH_STATE_TTL_MS + 1)).toThrow(/expired/i);
  });
});

describe("API rate limit", () => {
  it("restituisce 429 e Retry-After oltre la soglia", async () => {
    let currentTime = 1_800_000_000_000;
    const app = express();
    app.use(createApiRateLimitMiddleware({ maxRequests: 2, windowMs: 60_000, now: () => currentTime }));
    app.get("/api/health", (_req, res) => res.json({ ok: true }));
    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Porta di test non disponibile");
    const url = `http://127.0.0.1:${address.port}/api/health`;

    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url)).status).toBe(200);
    const blocked = await fetch(url);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBe("60");

    currentTime += 60_001;
    expect((await fetch(url)).status).toBe(200);
  });
});

describe("Cookie sessione", () => {
  it("usa cookie host-only sui domini pubblici e condivisione solo nelle preview Manus", () => {
    const publicOptions = getSessionCookieOptions({
      hostname: "agentpayapp-q3spezws.manus.space",
      protocol: "https",
      headers: {},
    } as Request);
    expect(publicOptions).toMatchObject({ domain: undefined, httpOnly: true, secure: true, sameSite: "none" });

    const previewOptions = getSessionCookieOptions({
      hostname: "3000-preview.us1.manus.computer",
      protocol: "https",
      headers: {},
    } as Request);
    expect(previewOptions.domain).toBe(".manus.computer");
  });
});
