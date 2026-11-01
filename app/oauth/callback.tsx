import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import {
  consumePendingOAuthState,
  hasPendingOAuthState,
} from "@/lib/oauth-pending-state";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type OAuthCallbackParams = {
  code: string | null;
  state: string | null;
  error: string | null;
};

/**
 * Parse only parameters that belong to the authorization-code callback.
 * A session token in a deep link is deliberately ignored; tokens must only
 * arrive from the server after exchangeOAuthCode verifies the state.
 */
export function parseOAuthCallbackUrl(url: string): OAuthCallbackParams {
  try {
    const parsed = new URL(url, "agentpay://oauth/callback");
    return {
      code: parsed.searchParams.get("code"),
      state: parsed.searchParams.get("state"),
      error: parsed.searchParams.get("error"),
    };
  } catch {
    return { code: null, state: null, error: null };
  }
}

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
  }>();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRouteParams = Object.keys(params).length > 0;

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL from params or Linking
        let url: string | null = null;
        let code: string | null = params.code ?? null;
        let state: string | null = params.state ?? null;
        let error: string | null = params.error ?? null;

        // Try to get from local search params first (works with expo-router)
        if (hasRouteParams) {
          // Ignore unknown query parameters, including sessionToken.
          console.log("[OAuth] Using authorization callback route params");
        } else {
          console.log(
            "[OAuth] No params found, checking Linking.getInitialURL()...",
          );
          // Fallback: try to get from Linking
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) {
            url = initialUrl;
          }
        }

        if (url) {
          const parsed = parseOAuthCallbackUrl(url);
          code = parsed.code;
          state = parsed.state;
          error = parsed.error;
        }

        // Check for error
        if (error) {
          setStatus("error");
          setErrorMessage(error || "OAuth error occurred");
          return;
        }

        // Check for code and state
        // Otherwise, exchange code for session token
        if (!code || !state) {
          console.error("[OAuth] Missing code or state parameter", {
            hasCode: !!code,
            hasState: !!state,
          });
          setStatus("error");
          setErrorMessage("Missing code or state parameter");
          return;
        }

        // Bind the callback to a login initiated by this app instance. Keep
        // the state pending until the server successfully exchanges the code.
        if (!(await hasPendingOAuthState(state))) {
          console.error("[OAuth] Invalid or expired OAuth state");
          setStatus("error");
          setErrorMessage("Invalid or expired OAuth state");
          return;
        }

        // Exchange code for session token
        const result = await Api.exchangeOAuthCode(code, state);
        if (!(await consumePendingOAuthState(state))) {
          setStatus("error");
          setErrorMessage("Invalid or expired OAuth state");
          return;
        }
        console.log("[OAuth] Exchange result:", {
          hasSessionToken: !!result.sessionToken,
          hasUser: !!result.user,
        });

        if (result.sessionToken) {
          console.log("[OAuth] Session token received, storing...");
          // Store session token
          await Auth.setSessionToken(result.sessionToken);
          console.log("[OAuth] Session token stored successfully");

          // Store user info if available
          if (result.user) {
            const userInfo: Auth.User = {
              id: result.user.id,
              openId: result.user.openId,
              name: result.user.name,
              email: result.user.email,
              loginMethod: result.user.loginMethod,
              lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
            };
            await Auth.setUserInfo(userInfo);
          } else {
            console.log("[OAuth] No user data in result");
          }

          setStatus("success");
          console.log(
            "[OAuth] Authentication successful, redirecting to home...",
          );

          // Redirect to home after a short delay
          setTimeout(() => {
            console.log("[OAuth] Executing redirect...");
            router.replace("/(tabs)");
          }, 1000);
        } else {
          console.error("[OAuth] No session token in result");
          setStatus("error");
          setErrorMessage("No session token received");
        }
      } catch (error) {
        console.error("[OAuth] Callback failed");
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to complete authentication",
        );
      }
    };

    handleCallback();
  }, [
    params.code,
    params.state,
    params.error,
    hasRouteParams,
    router,
  ]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        {status === "processing" && (
          <>
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base leading-6 text-center text-foreground">
              Completing authentication...
            </Text>
          </>
        )}
        {status === "success" && (
          <>
            <Text className="text-base leading-6 text-center text-foreground">
              Authentication successful!
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              Redirecting...
            </Text>
          </>
        )}
        {status === "error" && (
          <>
            <Text className="mb-2 text-xl font-bold leading-7 text-error">
              Authentication failed
            </Text>
            <Text className="text-base leading-6 text-center text-foreground">
              {errorMessage}
            </Text>
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}
