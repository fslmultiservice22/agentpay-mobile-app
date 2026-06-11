import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CopyTrade {
  id: string;
  traderId: string;
  traderName: string;
  originalTradeId: string;
  fromToken: string;
  toToken: string;
  amount: number;
  copyPercentage: number;
  status: 'active' | 'closed' | 'pending';
  entryPrice: number;
  currentPrice: number;
  profit: number;
  profitPercentage: number;
  roi: number;
  timestamp: number;
  closedAt?: number;
  traderProfit: number;
  traderROI: number;
}

export interface CopyTradeMetrics {
  totalActiveCopies: number;
  totalClosedCopies: number;
  totalProfit: number;
  totalROI: number;
  averageROI: number;
  winRate: number;
  profitFactor: number;
  bestPerformingCopy: CopyTrade | null;
  worstPerformingCopy: CopyTrade | null;
  correlationWithTrader: number;
}

const COPY_TRADE_STORAGE_KEY = 'copy_trades';
const COPY_TRADE_METRICS_KEY = 'copy_trade_metrics';

export function useCopyTradeTracking(traderId?: string) {
  const [copyTrades, setCopyTrades] = useState<CopyTrade[]>([]);
  const [metrics, setMetrics] = useState<CopyTradeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load copy trades from storage
  const loadCopyTrades = useCallback(async () => {
    try {
      setIsLoading(true);
      const key = traderId ? `${COPY_TRADE_STORAGE_KEY}_${traderId}` : COPY_TRADE_STORAGE_KEY;
      const data = await AsyncStorage.getItem(key);
      const trades = data ? JSON.parse(data) : [];
      setCopyTrades(trades);
      calculateMetrics(trades);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load copy trades';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [traderId]);

  // Calculate metrics from copy trades
  const calculateMetrics = useCallback((trades: CopyTrade[]) => {
    if (trades.length === 0) {
      setMetrics(null);
      return;
    }

    const activeTrades = trades.filter((t) => t.status === 'active');
    const closedTrades = trades.filter((t) => t.status === 'closed');

    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    const totalROI = trades.reduce((sum, t) => sum + t.roi, 0);
    const averageROI = trades.length > 0 ? totalROI / trades.length : 0;

    const winningTrades = trades.filter((t) => t.profit > 0).length;
    const winRate = trades.length > 0 ? winningTrades / trades.length : 0;

    const totalGain = trades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = Math.abs(
      trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)
    );
    const profitFactor = totalLoss > 0 ? totalGain / totalLoss : totalGain > 0 ? 1 : 0;

    const bestPerformingCopy = trades.reduce((best, current) =>
      current.roi > (best?.roi || -Infinity) ? current : best
    );

    const worstPerformingCopy = trades.reduce((worst, current) =>
      current.roi < (worst?.roi || Infinity) ? current : worst
    );

    // Calculate correlation with trader
    const traderROIs = trades.map((t) => t.traderROI);
    const copyROIs = trades.map((t) => t.roi);
    const correlation = calculateCorrelation(traderROIs, copyROIs);

    const calculatedMetrics: CopyTradeMetrics = {
      totalActiveCopies: activeTrades.length,
      totalClosedCopies: closedTrades.length,
      totalProfit,
      totalROI,
      averageROI,
      winRate,
      profitFactor,
      bestPerformingCopy: bestPerformingCopy || null,
      worstPerformingCopy: worstPerformingCopy || null,
      correlationWithTrader: correlation,
    };

    setMetrics(calculatedMetrics);
  }, []);

  // Calculate Pearson correlation coefficient
  const calculateCorrelation = (arr1: number[], arr2: number[]): number => {
    if (arr1.length !== arr2.length || arr1.length === 0) return 0;

    const mean1 = arr1.reduce((a, b) => a + b) / arr1.length;
    const mean2 = arr2.reduce((a, b) => a + b) / arr2.length;

    const numerator = arr1.reduce((sum, val, i) => sum + (val - mean1) * (arr2[i] - mean2), 0);
    const denominator1 = Math.sqrt(arr1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0));
    const denominator2 = Math.sqrt(arr2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0));

    if (denominator1 === 0 || denominator2 === 0) return 0;
    return numerator / (denominator1 * denominator2);
  };

  // Add new copy trade
  const addCopyTrade = useCallback(
    async (trade: Omit<CopyTrade, 'id'>) => {
      try {
        const newTrade: CopyTrade = {
          ...trade,
          id: `copy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        };

        const updatedTrades = [...copyTrades, newTrade];
        const key = traderId ? `${COPY_TRADE_STORAGE_KEY}_${traderId}` : COPY_TRADE_STORAGE_KEY;
        await AsyncStorage.setItem(key, JSON.stringify(updatedTrades));

        setCopyTrades(updatedTrades);
        calculateMetrics(updatedTrades);
      } catch (err) {
        console.error('Failed to add copy trade:', err);
      }
    },
    [copyTrades, traderId, calculateMetrics]
  );

  // Update copy trade
  const updateCopyTrade = useCallback(
    async (tradeId: string, updates: Partial<CopyTrade>) => {
      try {
        const updatedTrades = copyTrades.map((t) =>
          t.id === tradeId ? { ...t, ...updates } : t
        );

        const key = traderId ? `${COPY_TRADE_STORAGE_KEY}_${traderId}` : COPY_TRADE_STORAGE_KEY;
        await AsyncStorage.setItem(key, JSON.stringify(updatedTrades));

        setCopyTrades(updatedTrades);
        calculateMetrics(updatedTrades);
      } catch (err) {
        console.error('Failed to update copy trade:', err);
      }
    },
    [copyTrades, traderId, calculateMetrics]
  );

  // Close copy trade
  const closeCopyTrade = useCallback(
    async (tradeId: string, closePrice: number) => {
      try {
        const trade = copyTrades.find((t) => t.id === tradeId);
        if (!trade) return;

        const finalProfit = trade.amount * ((closePrice - trade.entryPrice) / trade.entryPrice);
        const finalROI = ((closePrice - trade.entryPrice) / trade.entryPrice) * 100;

        await updateCopyTrade(tradeId, {
          status: 'closed',
          currentPrice: closePrice,
          profit: finalProfit,
          profitPercentage: finalROI,
          roi: finalROI,
          closedAt: Date.now(),
        });
      } catch (err) {
        console.error('Failed to close copy trade:', err);
      }
    },
    [copyTrades, updateCopyTrade]
  );

  // Get active copy trades
  const getActiveCopyTrades = useCallback(() => {
    return copyTrades.filter((t) => t.status === 'active');
  }, [copyTrades]);

  // Get closed copy trades
  const getClosedCopyTrades = useCallback(() => {
    return copyTrades.filter((t) => t.status === 'closed');
  }, [copyTrades]);

  // Get copy trades for specific trader
  const getCopyTradesForTrader = useCallback((traderIdFilter: string) => {
    return copyTrades.filter((t) => t.traderId === traderIdFilter);
  }, [copyTrades]);

  // Get performance comparison with trader
  const getPerformanceComparison = useCallback((tradeId: string) => {
    const trade = copyTrades.find((t) => t.id === tradeId);
    if (!trade) return null;

    const difference = trade.roi - trade.traderROI;
    const differencePercentage = ((trade.roi - trade.traderROI) / Math.abs(trade.traderROI)) * 100;

    return {
      copyROI: trade.roi,
      traderROI: trade.traderROI,
      difference,
      differencePercentage,
      isOutperforming: trade.roi > trade.traderROI,
    };
  }, [copyTrades]);

  // Initialize
  useEffect(() => {
    loadCopyTrades();
  }, [loadCopyTrades]);

  return {
    copyTrades,
    metrics,
    isLoading,
    error,
    addCopyTrade,
    updateCopyTrade,
    closeCopyTrade,
    getActiveCopyTrades,
    getClosedCopyTrades,
    getCopyTradesForTrader,
    getPerformanceComparison,
    refetch: loadCopyTrades,
  };
}
