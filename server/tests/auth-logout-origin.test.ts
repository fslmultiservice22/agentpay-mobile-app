import { describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../../shared/const";
import { ENV } from "../_core/env";
import { sdk } from "../_core/sdk";
import { appRouter } from "../routers";

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
    const previousAppId = ENV.appId;
    const previousCookieSecret = ENV.cookieSecret;
    ENV.appId = "test-app";
    ENV.cookieSecret = "test-secret-with-sufficient-entropy-1234567890";
    try {
      const token = await sdk.signSession({
        openId: "native-user",
        appId: ENV.appId,
        name: "Native User",
      });
      const { ctx, clearCookie } = makeContext({
        cookie: `${COOKIE_NAME}=session`,
        authorization: `Bearer ${token}`,
      });

      await expect(appRouter.createCaller(ctx).auth.logout()).resolves.toEqual({
        success: true,
      });
      expect(clearCookie).toHaveBeenCalledOnce();
    } finally {
      ENV.appId = previousAppId;
      ENV.cookieSecret = previousCookieSecret;
    }
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
