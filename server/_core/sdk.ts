import {
  AXIOS_TIMEOUT_MS,
  COOKIE_NAME,
  SESSION_TTL_MS,
} from "../../shared/const.js";
import { ForbiddenError } from "../../shared/_core/errors.js";
import { createHash, randomBytes } from "node:crypto";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import type { SessionTokenRevocationInput } from "../db";
import { ENV } from "./env";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";
import { exchangeWithOAuthState } from "./oauth-state";
import {
  requireTrustedOAuthServerUrl,
  validateOAuthServerUrl,
} from "./oauth-server-url-policy";
// Utility function
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

export interface SessionTokenRevocationPersistence {
  isRevoked(tokenHash: string): Promise<boolean>;
  revoke(input: SessionTokenRevocationInput): Promise<void>;
}

const databaseSessionTokenRevocationPersistence: SessionTokenRevocationPersistence =
  {
    isRevoked: db.isSessionTokenRevoked,
    revoke: db.recordSessionTokenRevocation,
  };

let testSessionTokenRevocationPersistence: SessionTokenRevocationPersistence | null =
  null;

export function setSessionTokenRevocationPersistenceForTests(
  persistence: SessionTokenRevocationPersistence | null,
): void {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "Session revocation test persistence can only be set in test mode",
    );
  }
  testSessionTokenRevocationPersistence = persistence;
}

function sessionTokenRevocationPersistence(): SessionTokenRevocationPersistence {
  return (
    testSessionTokenRevocationPersistence ??
    databaseSessionTokenRevocationPersistence
  );
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function getSessionExpiresAtMs(exp: unknown, nowMs: number): number | null {
  if (typeof exp !== "number" || !Number.isSafeInteger(exp)) return null;
  const expiresAtMs = exp * 1000;
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= nowMs) return null;
  return expiresAtMs;
}

const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    const trustedUrl = validateOAuthServerUrl(ENV.oAuthServerUrl);
    if (trustedUrl) {
      console.log("[OAuth] Initialized with trusted OAuth origin");
    } else {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is missing or not a trusted HTTPS OAuth origin",
      );
    }
  }

  async getTokenByCode(
    code: string,
    state: string,
  ): Promise<ExchangeTokenResponse> {
    requireTrustedOAuthServerUrl(ENV.oAuthServerUrl);
    return exchangeWithOAuthState(state, async (redirectUri) => {
      const payload: ExchangeTokenRequest = {
        clientId: ENV.appId,
        grantType: "authorization_code",
        code,
        redirectUri,
      };

      const { data } = await this.client.post<ExchangeTokenResponse>(
        EXCHANGE_TOKEN_PATH,
        payload,
      );
      return data;
    });
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse,
  ): Promise<GetUserInfoResponse> {
    requireTrustedOAuthServerUrl(ENV.oAuthServerUrl);
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      },
    );

    return data;
  }
}

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    // Invalid configuration deliberately becomes unusable; each OAuth method
    // asserts the same policy again immediately before sending credentials.
    baseURL: validateOAuthServerUrl(ENV.oAuthServerUrl) ?? undefined,
    timeout: AXIOS_TIMEOUT_MS,
    maxRedirects: 0,
  });

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined,
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string"),
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(
    code: string,
    state: string,
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null,
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }

    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {},
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || "",
      },
      options,
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {},
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? SESSION_TTL_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setJti(randomBytes(18).toString("base64url"))
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(
    cookieValue: string | undefined | null,
  ): Promise<{ openId: string; appId: string; name: string } | null> {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }

    // An empty app ID must never act as a wildcard, and a token copied from
    // another application must not be accepted by this server.
    if (!isNonEmptyString(ENV.appId)) {
      console.error(
        "[Auth] Session verification unavailable: app ID is not configured",
      );
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const { openId, appId, name, exp } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      if (getSessionExpiresAtMs(exp, Date.now()) === null) {
        console.warn("[Auth] Session payload is missing a valid expiration");
        return null;
      }

      if (appId !== ENV.appId) {
        console.warn("[Auth] Session app ID does not match this application");
        return null;
      }

      if (
        await sessionTokenRevocationPersistence().isRevoked(
          hashSessionToken(cookieValue),
        )
      ) {
        console.warn("[Auth] Session has been revoked");
        return null;
      }

      return {
        openId,
        appId,
        name,
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async revokeSessionToken(token: string): Promise<boolean> {
    if (!token || !isNonEmptyString(ENV.appId)) return false;

    let payload: Record<string, unknown>;
    try {
      const verified = await jwtVerify(token, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      payload = verified.payload as Record<string, unknown>;
    } catch {
      return false;
    }

    const { openId, appId, name, exp } = payload;
    const nowMs = Date.now();
    const expiresAtMs = getSessionExpiresAtMs(exp, nowMs);
    if (
      !isNonEmptyString(openId) ||
      !isNonEmptyString(appId) ||
      !isNonEmptyString(name) ||
      appId !== ENV.appId ||
      expiresAtMs === null
    ) {
      return false;
    }

    await sessionTokenRevocationPersistence().revoke({
      tokenHash: hashSessionToken(token),
      expiresAtMs,
      nowMs,
    });
    return true;
  }

  async revokeSessionsFromRequest(
    req: Pick<Request, "headers">,
  ): Promise<void> {
    const tokens: string[] = [];
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const bearer = authHeader.slice("Bearer ".length).trim();
      if (bearer) tokens.push(bearer);
    }

    const cookieToken = this.parseCookies(req.headers.cookie).get(COOKIE_NAME);
    if (cookieToken) tokens.push(cookieToken);

    for (const token of new Set(tokens)) {
      await this.revokeSessionToken(token);
    }
  }

  async getUserInfoWithJwt(
    jwtToken: string,
  ): Promise<GetUserInfoWithJwtResponse> {
    requireTrustedOAuthServerUrl(ENV.oAuthServerUrl);
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload,
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null,
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    // Regular authentication flow
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim();
    }

    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = token || cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // If user not in DB, sync from OAuth server automatically
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

const CRON_OPEN_ID_PREFIX = "cron_";

/** Result of `sdk.authenticateRequest`. Cron callbacks set `isCron=true` and `taskUid`; see `/home/ubuntu/skills/webdev-periodic-updates/SKILL.md`. */
export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

function buildCronUser(
  userInfo: GetUserInfoWithJwtResponse,
): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? undefined,
    isCron: true,
  } as AuthenticatedUser;
}

export const sdk = new SDKServer();
