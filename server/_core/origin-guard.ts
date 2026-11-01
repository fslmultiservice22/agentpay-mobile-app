import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { COOKIE_NAME } from "../../shared/const.js";
import { isAllowedAgentPayOrigin } from "../cors-policy";
import { sdk } from "./sdk";

/**
 * Cookie-authenticated state-changing requests must carry a trusted Origin.
 * Requests without the session cookie are native/bearer-style callers and do
 * not require an Origin header.
 */
export function hasSessionCookie(req: Pick<Request, "headers">): boolean {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== "string") return false;
  return Object.prototype.hasOwnProperty.call(
    parseCookieHeader(cookieHeader),
    COOKIE_NAME,
  );
}

export async function isTrustedSessionCookieOrigin(
  req: Pick<Request, "headers">,
): Promise<boolean> {
  if (!hasSessionCookie(req)) return true;
  const origin = req.headers.origin;
  if (typeof origin === "string") return isAllowedAgentPayOrigin(origin);

  const authorization = req.headers.authorization;
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return false;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return Boolean(token && (await sdk.verifySession(token)));
}
