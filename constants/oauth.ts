import * as Linking from "expo-linking";
import * as ReactNative from "react-native";
import { APPROVED_NATIVE_API_ORIGINS } from "./native-api-origin-policy";

// Must stay aligned with app.config.ts.
const schemeFromBundleId = "agentpay";

const env = {
  portal: process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  server: process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.EXPO_PUBLIC_APP_ID ?? "",
  ownerId: process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  ownerName: process.env.EXPO_PUBLIC_OWNER_NAME ?? "",
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Return a configured API origin only when it is a canonical HTTPS origin.
 *
 * Native callers must not turn a missing or malformed configuration into a
 * relative request. The helper deliberately accepts no path (including a
 * trailing slash), port, userinfo, query, fragment, whitespace, or controls.
 * It is pure so callers and tests can validate an explicit candidate without
 * reading host environment values.
 */
export function getConfiguredApiOrigin(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  if (value !== value.trim() || /[\s\u0000-\u001F\u007F-\u009F]/u.test(value)) {
    return "";
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      url.pathname !== "/" ||
      value !== url.origin
    ) {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

/** Syntax is not trust: native credentials require a separately approved origin. */
export function getApprovedNativeApiOrigin(value: unknown): string {
  const origin = getConfiguredApiOrigin(value);
  if (!origin) return "";

  const hostname = new URL(origin).hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".") ||
    !hostname.includes(".") ||
    /^[\d.]+$/.test(hostname) ||
    hostname.includes(":") ||
    hostname.startsWith("[")
  ) {
    return "";
  }

  return APPROVED_NATIVE_API_ORIGINS.includes(origin) ? origin : "";
}

/**
 * Get the API base URL, deriving from current hostname if not configured.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 *
 * A configured value is used only when getConfiguredApiOrigin accepts it.
 * On web an absent or invalid configured value may still use the existing
 * 8081-to-3000 derivation, otherwise the empty string intentionally preserves
 * relative same-origin requests. On native an empty string means unavailable;
 * network clients must fail closed before reading auth or fetching.
 */
export function getApiBaseUrl(): string {
  if (ReactNative.Platform.OS !== "web") {
    return getApprovedNativeApiOrigin(API_BASE_URL);
  }

  const configuredOrigin = getConfiguredApiOrigin(API_BASE_URL);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  // On web, derive from current hostname by replacing port 8081 with 3000
  if (
    ReactNative.Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location
  ) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // Fallback to empty (will use relative URL)
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

/**
 * Get the redirect URI for OAuth callback.
 * - Web: uses API server callback endpoint
 * - Native: uses deep link scheme
 */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    return `${getApiBaseUrl()}/api/oauth/callback`;
  } else {
    return Linking.createURL("/oauth/callback", {
      scheme: env.deepLinkScheme,
    });
  }
};

export const getLoginUrl = async () => {
  const redirectUri = getRedirectUri();
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) throw new Error("OAuth API base URL is not configured");
  const stateResponse = await fetch(`${apiBaseUrl}/api/oauth/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirectUri }),
  });
  if (!stateResponse.ok) throw new Error("Unable to initialize OAuth state");
  const { state } = (await stateResponse.json()) as { state?: string };
  if (!state) throw new Error("OAuth state is missing");

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Start OAuth login flow.
 *
 * On native platforms (iOS/Android), open the system browser directly so
 * the OAuth callback returns via deep link to the app.
 *
 * On web, this simply redirects to the login URL.
 *
 * @returns Always null, the callback is handled via deep link.
 */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = await getLoginUrl();

  if (ReactNative.Platform.OS === "web") {
    // On web, just redirect
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }

  const supported = await Linking.canOpenURL(loginUrl);
  if (!supported) {
    console.warn("[OAuth] Cannot open login URL: URL scheme not supported");
    // 可考虑抛出错误或返回错误状态，让调用方处理
    return null;
  }

  try {
    await Linking.openURL(loginUrl);
  } catch (error) {
    console.error("[OAuth] Failed to open login URL:", error);
    // 可考虑抛出错误让调用方处理
  }

  // The OAuth callback will reopen the app via deep link.
  return null;
}
