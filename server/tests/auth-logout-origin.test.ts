import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../../shared/const";
import { ENV } from "../_core/env";
import { sdk, setSessionTokenRevocationPersistenceForTests } from "../_core/sdk";
import { appRouter } from "../routers";
import { createMemorySessionTokenRevocationPersistence } from "./session-revocation-fixtures";

const originalAppId = ENV.appId;
const originalCookieSecret = ENV.cookieSecret;

beforeEach(() => {
  ENV.appId = "test-app";
  ENV.cookieSecret = "test-secret-with-sufficient-entropy-1234567890";
  setSessionTokenRevocationPersistenceForTests(createMemorySessionTokenRevocationPersistence());
});

afterEach(() => {
  setSessionTokenRevocationPersistenceForTests(null);
  ENV.appId = originalAppId;
  ENV.cookieSecret = originalCookieSecret;
});

function makeContext({ cookie, origin, authorization }: { cookie?: string; origin?: string; authorization?: string } = {}) {
  const clearCookie = vi.fn();
  const req = {
    headers: {
      ...(cookie === undefined ? {} : { cookie }),
      ...(origin === undefined ? {} : { origin }),
      ...(authorization === undefined ? {} : { authorization }),
    },
    protocol: "http",
    hostname: "localhost",
  } as any;
  return {
    ctx: { req, res: { clearCookie }, user: null } as any,
    clearCookie,
  };
}

describe("auth.logout cookie origin guard", () => {
  it("rifiuta un cookie senza Origin", async () => {
    const { ctx, clearCookie } = makeContext({ cookie: `${COOKIE_NAME}=session` });

    await expect(appRouter.createCaller(ctx).auth.logout()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(clearCookie).not.toHaveBeenCalled();
  });

  it("rifiuta un cookie di sessione vuoto senza Origin", async () => {
    const { ctx, clearCookie } = makeContext({ cookie: `${COOKIE_NAME}=` });

    await expect(appRouter.createCaller(ctx).auth.logout()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(clearCookie).not.toHaveBeenCalled();
  });

  it("rifiuta un Origin non attendibile con cookie", async () => {
    const { ctx, clearCookie } = makeContext({
      cookie: `${COOKIE_NAME}=session`,
      origin: "https://evil.example",
    });

    await expect(appRouter.createCaller(ctx).auth.logout()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(clearCookie).not.toHaveBeenCalled();
  });

  it("consente gli Origin già ammessi dalla policy CORS", async () => {
    const { ctx, clearCookie } = makeContext({
      cookie: `${COOKIE_NAME}=session`,
      origin: "http://localhost:8081",
    });

    await expect(appRouter.createCaller(ctx).auth.logout()).resolves.toEqual({
      success: true,
    });
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it("consente senza Origin un cookie accompagnato da un Bearer valido", async () => {
    const token = await sdk.createSessionToken("native-user", { name: "Native User" });
    const { ctx, clearCookie } = makeContext({
      cookie: `${COOKIE_NAME}=session`,
      authorization: `Bearer ${token}`,
    });

    await expect(sdk.verifySession(token)).resolves.not.toBeNull();
    await expect(appRouter.createCaller(ctx).auth.logout()).resolves.toEqual({
      success: true,
    });
    expect(clearCookie).toHaveBeenCalledOnce();
    await expect(sdk.verifySession(token)).resolves.toBeNull();
  });

  it("revoca una sessione cookie-only e imposta un clearCookie coerente", async () => {
    const token = await sdk.createSessionToken("browser-user", { name: "Browser User" });
    const { ctx, clearCookie } = makeContext({
      cookie: `${COOKIE_NAME}=${token}`,
      origin: "http://localhost:8081",
    });

    await expect(sdk.verifySession(token)).resolves.not.toBeNull();
    await expect(appRouter.createCaller(ctx).auth.logout()).resolves.toEqual({
      success: true,
    });
    expect(clearCookie).toHaveBeenCalledOnce();
    expect(clearCookie.mock.calls[0]?.[0]).toBe(COOKIE_NAME);
    expect(clearCookie.mock.calls[0]?.[1]).not.toHaveProperty("maxAge");
    await expect(sdk.verifySession(token)).resolves.toBeNull();
  });

  it("non accetta un Bearer non valido come sostituto dell'Origin", async () => {
    const { ctx, clearCookie } = makeContext({
      cookie: `${COOKIE_NAME}=session`,
      authorization: "Bearer not-a-valid-session",
    });

    await expect(appRouter.createCaller(ctx).auth.logout()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(clearCookie).not.toHaveBeenCalled();
  });

  it("consente il logout nativo senza cookie e senza Origin", async () => {
    const { ctx, clearCookie } = makeContext();

    await expect(appRouter.createCaller(ctx).auth.logout()).resolves.toEqual({
      success: true,
    });
    expect(clearCookie).toHaveBeenCalledOnce();
  });
});
