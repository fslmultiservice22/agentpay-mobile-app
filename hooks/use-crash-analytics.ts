import { useEffect, useCallback } from 'react';

// Sentry is optional - only import if available
let Sentry: any = null;
try {
  Sentry = require('@sentry/react-native');
} catch (error) {
  console.warn('Sentry not installed, crash analytics disabled');
}

export interface CrashEvent {
  id: string;
  timestamp: number;
  message: string;
  severity: 'fatal' | 'error' | 'warning' | 'info';
  context: Record<string, any>;
  stackTrace?: string;
}

export interface CrashAnalyticsState {
  isInitialized: boolean;
  lastCrashEvent: CrashEvent | null;
  crashCount: number;
}

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://examplePublicKey@o0.ingest.sentry.io/0';

export function useCrashAnalytics() {
  // Initialize Sentry on mount
  useEffect(() => {
    if (!Sentry) return;
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.1,
        environment: process.env.NODE_ENV || 'production',
        integrations: [
          new Sentry.ReactNativeTracing({
            routingInstrumentation: Sentry.ReactNavigationInstrumentation,
          }),
        ],
      });
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }, []);

  // Capture exception
  const captureException = useCallback((error: Error, context?: Record<string, any>) => {
    if (!Sentry) {
      console.error('Crash analytics not available:', error);
      return;
    }
    try {
      Sentry.withScope((scope: any) => {
        if (context) {
          Object.entries(context).forEach(([key, value]) => {
            scope.setContext(key, value);
          });
        }
        Sentry.captureException(error);
      });
    } catch (err) {
      console.error('Failed to capture exception:', err);
    }
  }, []);

  // Capture message
  const captureMessage = useCallback(
    (message: string, level: any = 'info', context?: Record<string, any>) => {
      if (!Sentry) {
        console.log('Crash analytics message:', message);
        return;
      }
      try {
        Sentry.withScope((scope: any) => {
          if (context) {
            Object.entries(context).forEach(([key, value]) => {
              scope.setContext(key, value);
            });
          }
          Sentry.captureMessage(message, level);
        });
      } catch (error) {
        console.error('Failed to capture message:', error);
      }
    },
    []
  );

  // Set user context
  const setUserContext = useCallback((userId: string, email?: string, username?: string) => {
    if (!Sentry) return;
    try {
      Sentry.setUser({
        id: userId,
        email,
        username,
      });
    } catch (error) {
      console.error('Failed to set user context:', error);
    }
  }, []);

  // Clear user context
  const clearUserContext = useCallback(() => {
    if (!Sentry) return;
    try {
      Sentry.setUser(null);
    } catch (error) {
      console.error('Failed to clear user context:', error);
    }
  }, []);

  // Add breadcrumb
  const addBreadcrumb = useCallback(
    (
      message: string,
      category: string,
      level: any = 'info',
      data?: Record<string, any>
    ) => {
      if (!Sentry) return;
      try {
        Sentry.addBreadcrumb({
          message,
          category,
          level,
          data,
          timestamp: Date.now() / 1000,
        });
      } catch (error) {
        console.error('Failed to add breadcrumb:', error);
      }
    },
    []
  );

  // Track transaction
  const startTransaction = useCallback((name: string, op: string) => {
    if (!Sentry) return null;
    try {
      return Sentry.startTransaction({
        name,
        op,
      });
    } catch (error) {
      console.error('Failed to start transaction:', error);
      return null;
    }
  }, []);

  // Capture transaction
  const captureTransaction = useCallback((transaction: any) => {
    if (!Sentry) return;
    try {
      if (transaction) {
        transaction.finish();
      }
    } catch (error) {
      console.error('Failed to finish transaction:', error);
    }
  }, []);

  // Get crash report
  const getCrashReport = useCallback(async () => {
    if (!Sentry) {
      return { totalCrashes: 0, lastCrash: null, crashRate: 0 };
    }
    try {
      // This would typically fetch from Sentry API
      // For now, return mock data
      return {
        totalCrashes: 0,
        lastCrash: null,
        crashRate: 0,
      };
    } catch (error) {
      console.error('Failed to get crash report:', error);
      return null;
    }
  }, []);

  return {
    captureException,
    captureMessage,
    setUserContext,
    clearUserContext,
    addBreadcrumb,
    startTransaction,
    captureTransaction,
    getCrashReport,
  };
}
