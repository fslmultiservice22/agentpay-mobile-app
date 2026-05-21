import { useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';

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
    try {
      Sentry.withScope((scope) => {
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
    (message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>) => {
      try {
        Sentry.withScope((scope) => {
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
      level: Sentry.SeverityLevel = 'info',
      data?: Record<string, any>
    ) => {
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
