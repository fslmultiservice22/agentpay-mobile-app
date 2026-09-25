import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform, Linking } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import {
  initManusRuntime,
  subscribeSafeAreaInsets,
} from "@/lib/_core/manus-runtime";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { setupNotificationHandler, getNotificationTargetScreen } from '@/lib/notifications/recurring-reminders';
import { shouldRequireAuth, getBiometricEnabledStatus } from '@/lib/biometric-auth';
import { OfflineBanner } from '@/components/offline-banner';
import { ErrorBoundary } from '@/components/error-boundary';
import { FinancialRouteGuard } from "@/components/financial-route-guard";
import { shouldUseGlobalFinancialRouteGuard } from "@/lib/financial-route-policy";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
    // Setup notification handler (must be called before any notification is shown)
    if (Platform.OS !== 'web') {
      setupNotificationHandler();
    }
  }, []);

  // Handle notification tap → navigate to target screen
  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Handle notification tapped while app was closed/background
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      const screen = getNotificationTargetScreen(lastResponse.notification);
      if (screen) {
        setTimeout(() => router.push(screen as any), 500);
      }
    }
    // Handle notification tapped while app is open
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const screen = getNotificationTargetScreen(response.notification);
      if (screen) router.push(screen as any);
    });
    return () => sub.remove();
  }, [router]);

  // Check if onboarding has been completed
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem('onboarding_completed');
        if (!completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, []);

  // Redirect to onboarding or biometric lock
  useEffect(() => {
    if (isCheckingOnboarding) return;
    if (showOnboarding) {
      router.replace('/onboarding');
      return;
    }
    // Check biometric lock on second+ launch
    if (Platform.OS !== 'web') {
      shouldRequireAuth().then(async (required) => {
        if (required) {
          const status = await getBiometricEnabledStatus();
          if (status.available && status.enrolled) {
            router.replace('/biometric-lock');
          }
        }
      }).catch(() => {});
    }
  }, [isCheckingOnboarding, router, showOnboarding]);

  // Handle deep links from MetaMask and app startup
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      
      try {
        // If URL is empty or just the scheme, do nothing — Expo Router handles initial navigation
        if (!url || url === '' || url === 'agentpay://' || url === 'agentpay:///' || url.trim() === '') {
          return;
        }
        
        const route = url.replace(/.*?:\/\//g, '');
        
        // Handle MetaMask and WalletConnect responses
        if (route.includes('wallet-connect') || route.includes('wc')) {
          router.push('/(tabs)/trading');
          return;
        }


        // Handle agentpay scheme with specific routes
        if (url.includes('agentpay://')) {
          if (route.includes('trading')) {
            router.push('/(tabs)/trading');
            return;
          }
          if (route.includes('portfolio')) {
            router.push('/(tabs)/portfolio');
            return;
          }
          if (route.includes('settings')) {
            router.push('/(tabs)/settings');
            return;
          }
        }
        
        // Fallback: route not recognized, do nothing
      } catch (error) {
        console.error('Error handling deep link:', error);
        // Do NOT navigate on error — let Expo Router handle it
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL when app starts
    // NOTE: Do NOT call router.push when there is no URL — Expo Router handles
    // initial navigation automatically via unstable_settings.anchor.
    // Calling router.push here conflicts with onboarding/biometric redirects.
    Linking.getInitialURL().then((url) => {
      // Only handle real deep links (not empty scheme, not null)
      if (url != null && url !== '' && url !== 'agentpay://' && url !== 'agentpay:///' && url.trim() !== '') {
        handleDeepLink({ url });
      }
      // If null or empty scheme: do nothing — let Expo Router handle initial navigation
    }).catch((error) => {
      console.error('Error getting initial URL:', error);
      // Do NOT navigate on error
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable automatic refetching on window focus for mobile
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? {
      insets: initialInsets,
      frame: initialFrame,
    };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            {/* Default to hiding native headers so raw route segments don't appear (e.g. "(tabs)", "products/[id]"). */}
            {/* If a screen needs the native header, explicitly enable it and set a human title via Stack.Screen options. */}
            {/* in order for ios apps tab switching to work properly, use presentation: "fullScreenModal" for login page, whenever you decide to use presentation: "modal*/}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="monitor-log" options={{ animation: "slide_from_right" }} />
              <Stack.Screen name="oauth/callback" />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="biometric-lock" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="add-bank-account" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="bank-accounts-manage" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="security-settings" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="user-profile" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="notification-settings" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="virtual-account" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="transfer-history" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="transfer-detail" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="credit-transfer" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="global-search" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="monthly-summary" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="spending-analysis" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="spending-goal" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="category-budget" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="budget-history" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="month-comparison" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="frequent-contacts" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="recurring-transfer" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="currency-converter" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="notification-history" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="advanced-settings" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="pin-setup" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="yearly-stats" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="favorites" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="widget-order" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="incoming-transfers" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="frequent-senders" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="sender-detail" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="favorite-senders" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="reminders" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="income-stats" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="export-data" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="balance-history" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="tax-report" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="budget-vs-actual" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="recurring-calendar" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="balance-sweep" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="annual-summary" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="savings-goal" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="savings-goals" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="financial-planner" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="social-login" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="social-settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="social-feed" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="social-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="spending-insights" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="category-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="budget-planner" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="expense-report" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="financial-calendar" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="financial-report" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="recurring-payments" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="investment-tracker" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="expense-split" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="loan-simulator" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="fuel-tracker" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="warranty-tracker" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="price-compare" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="net-worth" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="tip-calculator" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="history" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="kyc-process" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="qr-scanner" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="send" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="trader-chat" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="trader-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="wallet-export" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="wallet-import" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="shopping-list" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="debt-tracker" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="savings-challenge" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="carbon-footprint" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="subscription-budget" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="financial-goals" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="goal-contributions-history" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="expense-categories-editor" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="subscription-history" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="savings-plan" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="expense-trends" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="cash-flow-forecast" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="net-worth-history" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="bill-splitter" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="loyalty-points" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="financial-health-score" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="tax-estimator" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="pdf-reports" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="spending-forecast" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="recurring-optimizer" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="subscription-tracker" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="eosio-transfer" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="price-alerts" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="transaction-history" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="payment-queue" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="monthly-comparison" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="crypto-tutorial" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="wallet-tx-history" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="credit-card" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="wallet-detail" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="wallet-receive" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="emergency-fund" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="ob-connect" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="weekly-digest" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="crypto-collateral" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="card-subscriptions" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="add-to-wallet" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="spending-report" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="wlfi-dashboard" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="wlfi-transfer" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
              <Stack.Screen name="wlfi-policy" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="wlfi-markets" options={{ headerShown: false, animation: 'slide_from_right' }} />
              <Stack.Screen name="wlfi-swap" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            </Stack>
            <OfflineBanner />
            <StatusBar style="auto" />
          </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const guardedContent = shouldUseGlobalFinancialRouteGuard(pathname) ? <FinancialRouteGuard pathname={pathname} /> : content;
  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {guardedContent}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          {guardedContent}
        </SafeAreaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
