import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMs: number; // milliseconds
  message: string;
}

export interface RateLimitStatus {
  endpoint: string;
  remaining: number;
  total: number;
  resetTime: number;
  isLimited: boolean;
}

export interface RequestRecord {
  endpoint: string;
  timestamp: number;
  statusCode: number;
  responseTime: number;
}

export function useRateLimiting() {
  const [configs, setConfigs] = useState<RateLimitConfig[]>([]);
  const [requestRecords, setRequestRecords] = useState<RequestRecord[]>([]);
  const [limitedEndpoints, setLimitedEndpoints] = useState<Set<string>>(new Set());

  const DEFAULT_CONFIGS: RateLimitConfig[] = [
    {
      endpoint: '/api/wallet/balance',
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      message: 'Too many balance requests',
    },
    {
      endpoint: '/api/wallet/send',
      maxRequests: 10,
      windowMs: 60000, // 1 minute
      message: 'Too many send requests',
    },
    {
      endpoint: '/api/wallet/swap',
      maxRequests: 20,
      windowMs: 60000, // 1 minute
      message: 'Too many swap requests',
    },
    {
      endpoint: '/api/auth/login',
      maxRequests: 5,
      windowMs: 300000, // 5 minutes
      message: 'Too many login attempts',
    },
    {
      endpoint: '/api/kyc/verify',
      maxRequests: 3,
      windowMs: 3600000, // 1 hour
      message: 'Too many verification attempts',
    },
  ];

  // Load rate limit config
  const loadConfig = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_rate_limit_config');
      if (stored) {
        setConfigs(JSON.parse(stored));
      } else {
        setConfigs(DEFAULT_CONFIGS);
        await AsyncStorage.setItem('agentpay_rate_limit_config', JSON.stringify(DEFAULT_CONFIGS));
      }
    } catch (error) {
      console.error('Failed to load rate limit config:', error);
      setConfigs(DEFAULT_CONFIGS);
    }
  }, []);

  // Check rate limit
  const checkRateLimit = useCallback(
    (endpoint: string): RateLimitStatus => {
      const config = configs.find((c) => c.endpoint === endpoint);
      if (!config) {
        return {
          endpoint,
          remaining: -1,
          total: 0,
          resetTime: 0,
          isLimited: false,
        };
      }

      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Count requests in current window
      const requestsInWindow = requestRecords.filter(
        (r) => r.endpoint === endpoint && r.timestamp > windowStart
      ).length;

      const remaining = Math.max(0, config.maxRequests - requestsInWindow);
      const isLimited = remaining === 0;

      // Calculate reset time
      const oldestRequest = requestRecords
        .filter((r) => r.endpoint === endpoint && r.timestamp > windowStart)
        .sort((a, b) => a.timestamp - b.timestamp)[0];

      const resetTime = oldestRequest ? oldestRequest.timestamp + config.windowMs : now;

      return {
        endpoint,
        remaining,
        total: config.maxRequests,
        resetTime,
        isLimited,
      };
    },
    [configs, requestRecords]
  );

  // Record request
  const recordRequest = useCallback(
    async (endpoint: string, statusCode: number, responseTime: number) => {
      try {
        const record: RequestRecord = {
          endpoint,
          timestamp: Date.now(),
          statusCode,
          responseTime,
        };

        const updated = [...requestRecords, record];
        setRequestRecords(updated);

        // Check if rate limited
        const status = checkRateLimit(endpoint);
        if (status.isLimited) {
          setLimitedEndpoints((prev) => new Set([...prev, endpoint]));
        } else {
          setLimitedEndpoints((prev) => {
            const next = new Set(prev);
            next.delete(endpoint);
            return next;
          });
        }

        // Clean old records (older than 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        const cleaned = updated.filter((r) => r.timestamp > oneHourAgo);
        setRequestRecords(cleaned);

        await AsyncStorage.setItem('agentpay_request_records', JSON.stringify(cleaned));
      } catch (error) {
        console.error('Failed to record request:', error);
      }
    },
    [requestRecords, checkRateLimit]
  );

  // Get rate limit status for endpoint
  const getStatus = useCallback(
    (endpoint: string): RateLimitStatus => {
      return checkRateLimit(endpoint);
    },
    [checkRateLimit]
  );

  // Get all limited endpoints
  const getLimitedEndpoints = useCallback(() => {
    return Array.from(limitedEndpoints);
  }, [limitedEndpoints]);

  // Reset rate limit for endpoint
  const resetEndpoint = useCallback(
    async (endpoint: string) => {
      try {
        const updated = requestRecords.filter((r) => r.endpoint !== endpoint);
        setRequestRecords(updated);
        setLimitedEndpoints((prev) => {
          const next = new Set(prev);
          next.delete(endpoint);
          return next;
        });
        await AsyncStorage.setItem('agentpay_request_records', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to reset endpoint:', error);
      }
    },
    [requestRecords]
  );

  // Get request statistics
  const getStats = useCallback(() => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const stats = {
      totalRequests: requestRecords.length,
      requestsLastHour: requestRecords.filter((r) => r.timestamp > oneHourAgo).length,
      averageResponseTime:
        requestRecords.length > 0
          ? requestRecords.reduce((sum, r) => sum + r.responseTime, 0) / requestRecords.length
          : 0,
      errorRate:
        requestRecords.length > 0
          ? (requestRecords.filter((r) => r.statusCode >= 400).length / requestRecords.length) * 100
          : 0,
      limitedEndpoints: Array.from(limitedEndpoints),
    };

    return stats;
  }, [requestRecords, limitedEndpoints]);

  // Initialize
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    configs,
    requestRecords,
    limitedEndpoints: Array.from(limitedEndpoints),
    checkRateLimit,
    recordRequest,
    getStatus,
    getLimitedEndpoints,
    resetEndpoint,
    getStats,
  };
}
