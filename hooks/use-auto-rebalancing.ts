import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RebalancingConfig {
  enabled: boolean;
  threshold: number; // % deviation before rebalancing
  frequency: 'realtime' | 'hourly' | 'daily';
  maxRebalancesPerDay: number;
}

export interface RebalancingEvent {
  id: string;
  copyTradeId: string;
  traderId: string;
  timestamp: string;
  oldAllocation: Record<string, number>;
  newAllocation: Record<string, number>;
  changes: Array<{
    asset: string;
    oldPercent: number;
    newPercent: number;
    percentChange: number;
  }>;
  status: 'pending' | 'completed' | 'failed';
  executedAt?: string;
  error?: string;
}

export interface RebalancingStats {
  totalRebalances: number;
  successfulRebalances: number;
  failedRebalances: number;
  averageExecutionTime: number;
  lastRebalanceAt?: string;
  totalAssetsRebalanced: number;
}

export function useAutoRebalancing(copyTradeId: string) {
  const [config, setConfig] = useState<RebalancingConfig>({
    enabled: true,
    threshold: 5, // 5% deviation
    frequency: 'realtime',
    maxRebalancesPerDay: 10,
  });
  const [events, setEvents] = useState<RebalancingEvent[]>([]);
  const [stats, setStats] = useState<RebalancingStats>({
    totalRebalances: 0,
    successfulRebalances: 0,
    failedRebalances: 0,
    averageExecutionTime: 0,
    totalAssetsRebalanced: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRebalancingData();
  }, [copyTradeId]);

  const loadRebalancingData = async () => {
    try {
      setLoading(true);
      const [configData, eventsData, statsData] = await Promise.all([
        AsyncStorage.getItem(`rebalancing_config_${copyTradeId}`),
        AsyncStorage.getItem(`rebalancing_events_${copyTradeId}`),
        AsyncStorage.getItem(`rebalancing_stats_${copyTradeId}`),
      ]);

      if (configData) setConfig(JSON.parse(configData));
      if (eventsData) setEvents(JSON.parse(eventsData));
      if (statsData) setStats(JSON.parse(statsData));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rebalancing data');
    } finally {
      setLoading(false);
    }
  };

  const calculateDeviations = (
    originalAllocation: Record<string, number>,
    currentAllocation: Record<string, number>
  ): Record<string, number> => {
    const deviations: Record<string, number> = {};
    for (const asset in originalAllocation) {
      const original = originalAllocation[asset] || 0;
      const current = currentAllocation[asset] || 0;
      const deviation = Math.abs(current - original);
      deviations[asset] = deviation;
    }
    return deviations;
  };

  const shouldRebalance = (
    originalAllocation: Record<string, number>,
    currentAllocation: Record<string, number>
  ): boolean => {
    if (!config.enabled) return false;

    const deviations = calculateDeviations(originalAllocation, currentAllocation);
    const maxDeviation = Math.max(...Object.values(deviations));
    return maxDeviation > config.threshold;
  };

  const executeRebalancing = useCallback(
    async (
      traderId: string,
      originalAllocation: Record<string, number>,
      currentAllocation: Record<string, number>
    ): Promise<RebalancingEvent> => {
      const startTime = Date.now();
      const rebalancingEvent: RebalancingEvent = {
        id: `rebalance_${Date.now()}`,
        copyTradeId,
        traderId,
        timestamp: new Date().toISOString(),
        oldAllocation: currentAllocation,
        newAllocation: originalAllocation,
        changes: [],
        status: 'pending',
      };

      try {
        // Calculate changes
        for (const asset in originalAllocation) {
          const oldPercent = currentAllocation[asset] || 0;
          const newPercent = originalAllocation[asset] || 0;
          const percentChange = newPercent - oldPercent;

          rebalancingEvent.changes.push({
            asset,
            oldPercent,
            newPercent,
            percentChange,
          });
        }

        // Simulate execution
        await new Promise((resolve) => setTimeout(resolve, 1000));

        rebalancingEvent.status = 'completed';
        rebalancingEvent.executedAt = new Date().toISOString();

        // Update stats
        const executionTime = Date.now() - startTime;
        const newStats: RebalancingStats = {
          totalRebalances: stats.totalRebalances + 1,
          successfulRebalances: stats.successfulRebalances + 1,
          failedRebalances: stats.failedRebalances,
          averageExecutionTime:
            (stats.averageExecutionTime * stats.totalRebalances + executionTime) /
            (stats.totalRebalances + 1),
          lastRebalanceAt: new Date().toISOString(),
          totalAssetsRebalanced: stats.totalAssetsRebalanced + rebalancingEvent.changes.length,
        };

        // Save to storage
        const updatedEvents = [...events, rebalancingEvent];
        await Promise.all([
          AsyncStorage.setItem(`rebalancing_events_${copyTradeId}`, JSON.stringify(updatedEvents)),
          AsyncStorage.setItem(`rebalancing_stats_${copyTradeId}`, JSON.stringify(newStats)),
        ]);

        setEvents(updatedEvents);
        setStats(newStats);

        return rebalancingEvent;
      } catch (err) {
        rebalancingEvent.status = 'failed';
        rebalancingEvent.error = err instanceof Error ? err.message : 'Unknown error';

        const newStats: RebalancingStats = {
          ...stats,
          totalRebalances: stats.totalRebalances + 1,
          failedRebalances: stats.failedRebalances + 1,
        };

        const updatedEvents = [...events, rebalancingEvent];
        await Promise.all([
          AsyncStorage.setItem(`rebalancing_events_${copyTradeId}`, JSON.stringify(updatedEvents)),
          AsyncStorage.setItem(`rebalancing_stats_${copyTradeId}`, JSON.stringify(newStats)),
        ]);

        setEvents(updatedEvents);
        setStats(newStats);

        throw err;
      }
    },
    [copyTradeId, events, stats]
  );

  const updateConfig = async (newConfig: Partial<RebalancingConfig>) => {
    const updated = { ...config, ...newConfig };
    await AsyncStorage.setItem(`rebalancing_config_${copyTradeId}`, JSON.stringify(updated));
    setConfig(updated);
  };

  const getRebalancingHistory = (limit: number = 10): RebalancingEvent[] => {
    return events.slice(-limit).reverse();
  };

  const getSuccessRate = (): number => {
    if (stats.totalRebalances === 0) return 0;
    return (stats.successfulRebalances / stats.totalRebalances) * 100;
  };

  const getRebalancesPerDay = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events.filter((e) => new Date(e.timestamp) >= today).length;
  };

  return {
    config,
    events,
    stats,
    loading,
    error,
    updateConfig,
    executeRebalancing,
    shouldRebalance,
    calculateDeviations,
    getRebalancingHistory,
    getSuccessRate,
    getRebalancesPerDay,
  };
}
