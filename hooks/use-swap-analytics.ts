import { useCallback, useState, useEffect } from 'react';
import { MOCK_SWAP_HISTORY, calculateSwapStatistics, calculateBlockchainStats, calculateTokenStats, generateTimeSeries, exportSwapsToCSV, type SwapRecord, type SwapAnalyticsData } from '@/lib/analytics/swap-analytics-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'agentpay_swap_history';

/**
 * Hook for analyzing swap history
 */
export function useSwapAnalytics() {
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [analytics, setAnalytics] = useState<SwapAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('7d');

  // Initialize swap history
  useEffect(() => {
    loadSwapHistory();
  }, []);

  // Recalculate analytics when swaps or time range changes
  useEffect(() => {
    calculateAnalytics();
  }, [swaps, timeRange]);

  const loadSwapHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      const history: SwapRecord[] = cached ? JSON.parse(cached) : MOCK_SWAP_HISTORY;
      // Pre-calculate analytics synchronously before clearing isLoading
      // to avoid a render where isLoading=false but analytics=null
      const now = Date.now();
      const filtered = history.filter((s) => now - s.timestamp <= 7 * 24 * 60 * 60 * 1000);
      const statistics = calculateSwapStatistics(filtered);
      const blockchainStats = calculateBlockchainStats(filtered);
      const tokenStats = calculateTokenStats(filtered);
      const timeSeries = generateTimeSeries(filtered);
      setAnalytics({
        statistics,
        blockchainStats,
        tokenStats,
        timeSeries,
        recentSwaps: filtered.slice(-10).reverse(),
      });
      setSwaps(history);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load swap history';
      setError(errorMessage);
      // Fallback: compute analytics from mock data
      try {
        const filtered = MOCK_SWAP_HISTORY.filter((s) => Date.now() - s.timestamp <= 7 * 24 * 60 * 60 * 1000);
        setAnalytics({
          statistics: calculateSwapStatistics(filtered),
          blockchainStats: calculateBlockchainStats(filtered),
          tokenStats: calculateTokenStats(filtered),
          timeSeries: generateTimeSeries(filtered),
          recentSwaps: filtered.slice(-10).reverse(),
        });
      } catch (_) {}
      setSwaps(MOCK_SWAP_HISTORY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateAnalytics = useCallback(() => {
    try {
      // Filter swaps by time range
      let filteredSwaps = swaps;
      const now = Date.now();

      switch (timeRange) {
        case '7d':
          filteredSwaps = swaps.filter((s) => now - s.timestamp <= 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          filteredSwaps = swaps.filter((s) => now - s.timestamp <= 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          filteredSwaps = swaps.filter((s) => now - s.timestamp <= 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          filteredSwaps = swaps;
      }

      const statistics = calculateSwapStatistics(filteredSwaps);
      const blockchainStats = calculateBlockchainStats(filteredSwaps);
      const tokenStats = calculateTokenStats(filteredSwaps);
      const timeSeries = generateTimeSeries(filteredSwaps);

      setAnalytics({
        statistics,
        blockchainStats,
        tokenStats,
        timeSeries,
        recentSwaps: filteredSwaps.slice(-10).reverse(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate analytics';
      setError(errorMessage);
    }
  }, [swaps, timeRange]);

  const addSwap = useCallback(
    async (swap: SwapRecord) => {
      try {
        const updated = [...swaps, swap];
        setSwaps(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add swap';
        setError(errorMessage);
      }
    },
    [swaps]
  );

  const deleteSwap = useCallback(
    async (swapId: string) => {
      try {
        const updated = swaps.filter((s) => s.id !== swapId);
        setSwaps(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete swap';
        setError(errorMessage);
      }
    },
    [swaps]
  );

  const exportToCSV = useCallback(() => {
    try {
      return exportSwapsToCSV(swaps);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export CSV';
      setError(errorMessage);
      return null;
    }
  }, [swaps]);

  const getSwapsByBlockchain = useCallback(
    (blockchain: string) => {
      return swaps.filter((s) => s.blockchain === blockchain);
    },
    [swaps]
  );

  const getSwapsByToken = useCallback(
    (token: string) => {
      return swaps.filter((s) => s.tokenIn === token || s.tokenOut === token);
    },
    [swaps]
  );

  const getSwapsByStatus = useCallback(
    (status: 'pending' | 'completed' | 'failed') => {
      return swaps.filter((s) => s.status === status);
    },
    [swaps]
  );

  const clearHistory = useCallback(async () => {
    try {
      setSwaps([]);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear history';
      setError(errorMessage);
    }
  }, []);

  return {
    swaps,
    analytics,
    isLoading,
    error,
    timeRange,
    setTimeRange,
    addSwap,
    deleteSwap,
    exportToCSV,
    getSwapsByBlockchain,
    getSwapsByToken,
    getSwapsByStatus,
    clearHistory,
    refetch: loadSwapHistory,
  };
}
