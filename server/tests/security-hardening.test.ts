import express, { type Request } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import {
  createOAuthState,
  consumeOAuthState,
  exchangeWithOAuthState,
  isAllowedOAuthRedirectUri,
  OAUTH_STATE_TTL_MS,
  setOAuthStatePersistenceForTests,
  type OAuthStatePersistence,
} from "../_core/oauth-state";
import { createApiRateLimitMiddleware } from "../_core/rate-limit";
import { registerOAuthRoutes } from "../_core/oauth";
import { sdk } from "../_core/sdk";

const servers: ReturnType<typeof express.application.listen>[] = [];

function createMemoryOAuthStatePersistence(): OAuthStatePersistence {
  const rows = new Map<
    string,
    { reservationId: string | null; expiresAtMs: number; status: "reserved" | "consumed" }
  >();

  return {
    reserve: async ({ stateHash, reservationId, expiresAtMs, nowMs }) => {
      if (expiresAtMs <= nowMs || rows.has(stateHash)) return false;
      rows.set(stateHash, { reservationId, expiresAtMs, status: "reserved" });
      return true;
    },
    consume: async ({ stateHash, reservationId, expiresAtMs, nowMs }) => {
      const row = rows.get(stateHash);
      if (
        !row ||
        row.status !== "reserved" ||
        row.reservationId !== reservationId ||
        row.expiresAtMs !== expiresAtMs ||
        row.expiresAtMs <= nowMs
      ) {
        return false;
      }
      row.status = "consumed";
      row.reservationId = null;
      return true;
    },
    release: async ({ stateHash, reservationId }) => {
      const row = rows.get(stateHash);
      if (!row || row.status !== "reserved" || row.reservationId !== reservationId) {
        return false;
      }
      rows.delete(stateHash);
      return true;
    },
  };
}

beforeEach(() => {
  ENV.appId = "test-app";
  ENV.cookieSecret = "test-secret-with-sufficient-entropy-1234567890";
  setOAuthStatePersistenceForTests(createMemoryOAuthStatePersistence());
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("OAuth state hardening", () => {
  it("firma, limita nel tempo e consuma lo state una sola volta", async () => {
    const now = 1_800_000_000_000;
    const redirectUri = "agentpay:///oauth/callback";
    const state = createOAuthState(redirectUri, now);

    expect(state).not.toContain(redirectUri);
    await expect(consumeOAuthState(state, now + 1_000)).resolves.toBe(redirectUri);
    await expect(consumeOAuthState(state, now + 2_000)).rejects.toThrow(/already been used/i);
  });

  it("rifiuta redirect arbitrari, state alterati e state scaduti", async () => {
    const now = 1_800_000_000_000;
    expect(isAllowedOAuthRedirectUri("https://evil.example/callback")).toBe(false);
    expect(() => createOAuthState("https://evil.example/callback", now)).toThrow(/not allowed/i);

    const state = createOAuthState("https://agentpayapp-q3spezws.manus.space/api/oauth/callback", now);
    await expect(consumeOAuthState(`${state}x`, now + 1_000)).rejects.toThrow(/signature/i);
    await expect(consumeOAuthState(state, now + OAUTH_STATE_TTL_MS + 1)).rejects.toThrow(/expired/i);
  });

  it("rilascia lo state se lo scambio fallisce e lo consuma al retry riuscito", async () => {
    const state = createOAuthState("agentpay:///oauth/callback");

    await expect(
      exchangeWithOAuthState(state, async (redirectUri) => {
        expect(redirectUri).toBe("agentpay:///oauth/callback");
        throw new Error("temporary upstream failure");
      }),
    ).rejects.toThrow("temporary upstream failure");

    await expect(
      exchangeWithOAuthState(state, async (redirectUri) => `token:${redirectUri}`),
    ).resolves.toBe("token:agentpay:///oauth/callback");
    await expect(consumeOAuthState(state)).rejects.toThrow(/already been used/i);
  });

  it("fallisce chiuso se il DB non prenota e non chiama l’exchange", async () => {
    const exchange = vi.fn(async () => "should not run");
    setOAuthStatePersistenceForTests({
      reserve: async () => {
        throw new Error("database unavailable");
      },
      consume: async () => false,
      release: async () => false,
    });

    await expect(
      exchangeWithOAuthState(createOAuthState("agentpay:///oauth/callback"), exchange),
    ).rejects.toThrow("database unavailable");
    expect(exchange).not.toHaveBeenCalled();
  });

  it("non rilascia la reservation se il provider è riuscito ma il tombstone non si salva", async () => {
    const release = vi.fn(async () => true);
    setOAuthStatePersistenceForTests({
      reserve: async () => true,
      consume: async () => false,
      release,
    });

    await expect(
      exchangeWithOAuthState(createOAuthState("agentpay:///oauth/callback"), async () => "token"),
    ).rejects.toThrow(/could not be consumed/i);
    expect(release).not.toHaveBeenCalled();
  });

  it("propaga un errore DB durante consume senza rilasciare la reservation", async () => {
    const consume = vi.fn(async () => {
      throw new Error("simulated database consume failure");
    });
    const release = vi.fn(async () => true);
    const exchange = vi.fn(async () => "token");
    setOAuthStatePersistenceForTests({
      reserve: async () => true,
      consume,
      release,
    });

    await expect(
      exchangeWithOAuthState(createOAuthState("agentpay:///oauth/callback"), exchange),
    ).rejects.toThrow("simulated database consume failure");
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
  });

  it("propaga un errore DB durante release senza ripetere lo scambio", async () => {
    const consume = vi.fn(async () => true);
    const release = vi.fn(async () => {
      throw new Error("simulated database release failure");
    });
    const exchange = vi.fn(async () => {
      throw new Error("simulated upstream failure");
    });
    setOAuthStatePersistenceForTests({
      reserve: async () => true,
      consume,
      release,
    });

    await expect(
      exchangeWithOAuthState(createOAuthState("agentpay:///oauth/callback"), exchange),
    ).rejects.toThrow("simulated database release failure");
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
    expect(consume).not.toHaveBeenCalled();
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

describe("JWT di sessione vincolato all'app", () => {
  it("rifiuta un token con appId diverso da quello configurato", async () => {
    const token = await sdk.signSession({ openId: "user-1", appId: "other-app", name: "User" });

    await expect(sdk.verifySession(token)).resolves.toBeNull();
  });

  it("fallisce chiuso quando appId non è configurato", async () => {
    const token = await sdk.signSession({ openId: "user-1", appId: "test-app", name: "User" });
    ENV.appId = "";

    await expect(sdk.verifySession(token)).resolves.toBeNull();
  });
});

describe("Logout e protezione CSRF", () => {
  async function startOAuthTestServer() {
    const app = express();
    registerOAuthRoutes(app);
    const server = app.listen(0);
    servers.push(server);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Porta di test non disponibile");
    return `http://127.0.0.1:${address.port}`;
  }

  it("rifiuta logout con cookie senza Origin o con Origin non attendibile", async () => {
    const url = await startOAuthTestServer();
    const cookie = `${COOKIE_NAME}=session-token`;

    expect((await fetch(`${url}/api/auth/logout`, { method: "POST", headers: { Cookie: cookie } })).status).toBe(403);
    expect(
      (
        await fetch(`${url}/api/auth/logout`, {
          method: "POST",
          headers: { Cookie: cookie, Origin: "https://evil.example" },
        })
      ).status,
    ).toBe(403);
  });

  it("accetta Origin attendibile con cookie e logout con Bearer valido senza Origin", async () => {
    const url = await startOAuthTestServer();
    const cookie = `${COOKIE_NAME}=session-token`;

    expect(
      (
        await fetch(`${url}/api/auth/logout`, {
          method: "POST",
          headers: { Cookie: cookie, Origin: "https://agentpayapp-q3spezws.manus.space" },
        })
      ).status,
    ).toBe(200);

    const validBearer = await sdk.createSessionToken("native-user", {
      name: "Native User",
    });
    expect(
      (
        await fetch(`${url}/api/auth/logout`, {
          method: "POST",
          headers: {
            Cookie: cookie,
            Authorization: `Bearer ${validBearer}`,
          },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await fetch(`${url}/api/auth/logout`, {
          method: "POST",
          headers: {
            Cookie: cookie,
            Authorization: "Bearer invalid-token",
          },
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await fetch(`${url}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: "Bearer native-session-token" },
        })
      ).status,
    ).toBe(200);
  });
});
