import * as Linking from "expo-linking";
import * as ReactNative from "react-native";
import { savePendingOAuthState } from "../lib/oauth-pending-state";
import {
  isTrustedApiOrigin,
  PUBLISHED_API_BASE_URL,
  resolveApiBaseUrl,
  validateApiBaseUrl,
} from "../lib/api-base-url-policy";

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
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  const isDevelopment = typeof __DEV__ !== "undefined" && __DEV__ === true;

  // Explicit configuration is accepted only when the policy allowlists it.
  if (API_BASE_URL) return resolveApiBaseUrl(API_BASE_URL, { isDevelopment });

  // On web, derive a development preview API only from a known preview host.
  if (
    ReactNative.Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location
  ) {
    const { protocol, hostname, origin } = window.location;
    if (isDevelopment && hostname === "localhost" && protocol === "http:") {
      return resolveApiBaseUrl("http://localhost:3000", { isDevelopment });
    }
    // Pattern: 8081-preview...us1/us2.manus.computer -> 3000-preview...
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (isDevelopment && apiHostname !== hostname) {
      const candidate = `${protocol}//${apiHostname}`;
      const validated = validateApiBaseUrl(candidate, { isDevelopment });
      if (validated) return validated;
    }
    // Relative URLs are safe only on the published backend's own origin.
    if (isTrustedApiOrigin(origin)) return "";
  }

  return PUBLISHED_API_BASE_URL;
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
    return `${getApiBaseUrl() || PUBLISHED_API_BASE_URL}/api/oauth/callback`;
  } else {
    return Linking.createURL("/oauth/callback", {
      scheme: env.deepLinkScheme,
    });
  }
};

export const getLoginUrl = async () => {
  const redirectUri = getRedirectUri();
  const apiBaseUrl = getApiBaseUrl();
  const stateResponse = await fetch(`${apiBaseUrl}/api/oauth/state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redirectUri }),
  });
  if (!stateResponse.ok) throw new Error("Unable to initialize OAuth state");
  const { state } = (await stateResponse.json()) as { state?: string };
  if (typeof state !== "string" || !state) throw new Error("OAuth state is missing");

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  await savePendingOAuthState(state);

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
