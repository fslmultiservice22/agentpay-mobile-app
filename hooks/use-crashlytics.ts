import { useEffect, useCallback, useRef } from 'react';
import { firebaseCrashlyticsService, type CrashReport, type ErrorMetrics } from '@/lib/firebase-crashlytics-service';

interface UseCrashlyticsOptions {
  enabled?: boolean;
  appVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  userId?: string;
}

export function useCrashlytics(options: UseCrashlyticsOptions = {}) {
  const isInitializedRef = useRef(false);

  // Initialize Crashlytics on mount
  useEffect(() => {
    if (isInitializedRef.current) return;

    firebaseCrashlyticsService.initialize({
      enabled: options.enabled !== false,
      appVersion: options.appVersion,
      osVersion: options.osVersion,
      deviceModel: options.deviceModel,
    });

    if (options.userId) {
      firebaseCrashlyticsService.setUserId(options.userId);
    }

    isInitializedRef.current = true;

    // Set up global error handler
    const handleError = (event: ErrorEvent) => {
      firebaseCrashlyticsService.recordError(event.error, 'critical');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      firebaseCrashlyticsService.recordError(event.reason, 'high');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, [options]);

  // Record error
  const recordError = useCallback(
    (error: Error | string, severity: 'low' | 'medium' | 'high' | 'critical' = 'high', context?: Record<string, any>) => {
      firebaseCrashlyticsService.recordError(error, severity, context);
    },
    []
  );

  // Record warning
  const recordWarning = useCallback((message: string, context?: Record<string, any>) => {
    firebaseCrashlyticsService.recordWarning(message, context);
  }, []);

  // Record log
  const recordLog = useCallback((message: string, data?: Record<string, any>) => {
    firebaseCrashlyticsService.recordLog(message, data);
  }, []);

  // Get crash reports
  const getCrashReports = useCallback((): CrashReport[] => {
    return firebaseCrashlyticsService.getCrashReports();
  }, []);

  // Get metrics
  const getMetrics = useCallback((): ErrorMetrics => {
    return firebaseCrashlyticsService.getMetrics();
  }, []);

  // Send batch crash reports
  const sendBatchCrashReports = useCallback(async () => {
    return firebaseCrashlyticsService.sendBatchCrashReports();
  }, []);

  // Get crash-free rate
  const getCrashFreeRate = useCallback((): number => {
    return firebaseCrashlyticsService.getCrashFreeRate();
  }, []);

  // Set user ID
  const setUserId = useCallback((userId: string) => {
    firebaseCrashlyticsService.setUserId(userId);
  }, []);

  // Clear crashes
  const clearCrashes = useCallback(() => {
    firebaseCrashlyticsService.clearCrashes();
  }, []);

  // Export crash data
  const exportCrashData = useCallback(() => {
    return firebaseCrashlyticsService.exportCrashData();
  }, []);

  return {
    recordError,
    recordWarning,
    recordLog,
    getCrashReports,
    getMetrics,
    sendBatchCrashReports,
    getCrashFreeRate,
    setUserId,
    clearCrashes,
    exportCrashData,
  };
}
