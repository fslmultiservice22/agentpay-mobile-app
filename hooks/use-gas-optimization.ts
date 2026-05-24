import { useState, useCallback, useEffect } from 'react';
import {
  getCurrentGasPrices,
  estimateGasCost,
  getGasOptimization,
  getGasPriceTrend,
  getGasPriceStats,
  calculateOptimalGasPrice,
  formatGasPrice,
  type GasPrice,
  type GasEstimate,
  type GasOptimization,
} from '@/lib/gas-fee-optimization-service';

export interface UseGasOptimizationReturn {
  // State
  gasPrices: GasPrice | null;
  gasEstimate: GasEstimate | null;
  optimization: GasOptimization | null;
  trend: { trend: 'up' | 'down' | 'stable'; changePercent: string; averagePrice: string } | null;
  stats: { min: string; max: string; average: string; median: string } | null;
  isLoading: boolean;
  error: string | null;

  // Methods
  loadGasPrices: () => Promise<void>;
  estimateGas: (gasLimit: string, gasPrice: string, ethPrice?: string) => Promise<void>;
  getOptimization: (currentGasPrice: string) => Promise<void>;
  loadTrend: () => Promise<void>;
  loadStats: () => Promise<void>;
  getOptimalPrice: (priority?: 'low' | 'medium' | 'high') => string | null;
  formatPrice: (gasPrice: string) => string;
  refreshAll: () => Promise<void>;
}

/**
 * Hook for gas fee optimization
 */
export function useGasOptimization(): UseGasOptimizationReturn {
  const [gasPrices, setGasPrices] = useState<GasPrice | null>(null);
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [optimization, setOptimization] = useState<GasOptimization | null>(null);
  const [trend, setTrend] = useState<{ trend: 'up' | 'down' | 'stable'; changePercent: string; averagePrice: string } | null>(null);
  const [stats, setStats] = useState<{ min: string; max: string; average: string; median: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load current gas prices
   */
  const loadGasPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const prices = await getCurrentGasPrices();
      setGasPrices(prices);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load gas prices';
      setError(errorMessage);
      console.error('Load gas prices error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Estimate gas cost
   */
  const handleEstimateGas = useCallback(
    async (gasLimit: string, gasPrice: string, ethPrice?: string) => {
      setError(null);

      try {
        const estimate = await estimateGasCost(gasLimit, gasPrice, ethPrice);
        setGasEstimate(estimate);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to estimate gas';
        setError(errorMessage);
        console.error('Estimate gas error:', err);
      }
    },
    []
  );

  /**
   * Get optimization recommendation
   */
  const handleGetOptimization = useCallback(async (currentGasPrice: string) => {
    setError(null);

    try {
      const opt = await getGasOptimization(currentGasPrice);
      setOptimization(opt);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get optimization';
      setError(errorMessage);
      console.error('Get optimization error:', err);
    }
  }, []);

  /**
   * Load gas price trend
   */
  const loadTrend = useCallback(async () => {
    setError(null);

    try {
      const trendData = await getGasPriceTrend();
      setTrend(trendData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trend';
      setError(errorMessage);
      console.error('Load trend error:', err);
    }
  }, []);

  /**
   * Load gas price statistics
   */
  const loadStats = useCallback(async () => {
    setError(null);

    try {
      const statsData = await getGasPriceStats();
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stats';
      setError(errorMessage);
      console.error('Load stats error:', err);
    }
  }, []);

  /**
   * Get optimal price
   */
  const getOptimalPrice = useCallback(
    (priority: 'low' | 'medium' | 'high' = 'medium'): string | null => {
      if (!gasPrices) return null;
      return calculateOptimalGasPrice(gasPrices, priority);
    },
    [gasPrices]
  );

  /**
   * Format price for display
   */
  const formatPrice = useCallback((gasPrice: string): string => {
    return formatGasPrice(gasPrice);
  }, []);

  /**
   * Refresh all data
   */
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [prices, trendData, statsData] = await Promise.all([
        getCurrentGasPrices(),
        getGasPriceTrend(),
        getGasPriceStats(),
      ]);

      setGasPrices(prices);
      setTrend(trendData);
      setStats(statsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      setError(errorMessage);
      console.error('Refresh all error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadGasPrices();
    loadTrend();
    loadStats();
  }, [loadGasPrices, loadTrend, loadStats]);

  return {
    gasPrices,
    gasEstimate,
    optimization,
    trend,
    stats,
    isLoading,
    error,
    loadGasPrices,
    estimateGas: handleEstimateGas,
    getOptimization: handleGetOptimization,
    loadTrend,
    loadStats,
    getOptimalPrice,
    formatPrice,
    refreshAll,
  };
}
