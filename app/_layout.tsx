import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
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
// import { WalletProvider } from "@/lib/web3/wallet-context";
// import { BlockchainProvider } from "@/lib/blockchain/blockchain-context";

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

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

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

  // Handle deep links from MetaMask and app startup
  useEffect(() => {
    const handleDeepLink = ({ url }: { url: string }) => {
      console.log('=== DEEP LINK DEBUG ===');
      console.log('Raw URL:', url);
      console.log('URL length:', url?.length);
      console.log('URL is empty:', !url || url === '' || url === 'agentpay://' || url === 'agentpay:///');
      
      try {
        // If URL is empty or just the scheme, navigate to home
        if (!url || url === '' || url === 'agentpay://' || url === 'agentpay:///' || url.trim() === '') {
          console.log('Empty URL detected, navigating to home');
          router.push('/(tabs)');
          return;
        }
        
        const route = url.replace(/.*?:\/\//g, '');
        console.log('Parsed route:', route);
        
        // Handle MetaMask and WalletConnect responses
        if (route.includes('wallet-connect') || route.includes('wc')) {
          console.log('WalletConnect detected, navigating to trading');
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
        
        // Fallback: always go to home if route is not recognized
        console.log('Route not recognized, falling back to home');
        router.push('/(tabs)');
      } catch (error) {
        console.error('Error handling deep link:', error);
        // Safety fallback
        router.push('/(tabs)');
      }
      console.log('====================');
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL when app starts
    Linking.getInitialURL().then((url) => {
      console.log('Initial URL on app start:', url);
      if (url != null) {
        handleDeepLink({ url });
      } else {
        // No initial URL, navigate to home
        console.log('No initial URL, navigating to home');
        router.push('/(tabs)');
      }
    }).catch((error) => {
      console.error('Error getting initial URL:', error);
      router.push('/(tabs)');
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
              <Stack.Screen name="oauth/callback" />
            </Stack>
            <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>
        {content}
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
