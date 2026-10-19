import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { Platform } from "react-native";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  const baseUrl = getApiBaseUrl();
  const nativeApiUnavailable = Platform.OS !== "web" && !baseUrl;
  const trpcUrl = baseUrl ? `${baseUrl}/api/trpc` : "/api/trpc";

  return trpc.createClient({
    links: [
      httpBatchLink({
        url: trpcUrl,
        async headers() {
          if (nativeApiUnavailable) {
            throw new Error("API base URL is not configured");
          }
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        // Custom fetch to include credentials for cookie-based auth
        fetch(url, options) {
          if (nativeApiUnavailable) {
            return Promise.reject(new Error("API base URL is not configured"));
          }
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
