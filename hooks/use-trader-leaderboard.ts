import { useCallback, useState, useEffect } from 'react';
import {
  calculateLeaderboardRank,
  calculateLeaderboardStats,
  filterLeaderboardByTimeframe,
  getTraderBadges,
  getTopTraders,
  getTraderPercentile,
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardTimeframe,
  type LeaderboardStats,
  type RankingBadge,
} from '@/lib/leaderboard/leaderboard-config';
import { generateMockTraderProfiles } from '@/lib/social/social-trading-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEADERBOARD_STORAGE_KEY = 'agentpay_leaderboard';

/**
 * Hook for managing trader leaderboard
 */
export function useTraderLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [metric, setMetric] = useState<LeaderboardMetric>('roi');
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize leaderboard data
  useEffect(() => {
    loadLeaderboardData();
  }, [metric, timeframe]);

  const loadLeaderboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, metric, timeframe);
      const filtered = filterLeaderboardByTimeframe(ranked, timeframe);
      const leaderboardStats = calculateLeaderboardStats(filtered, metric, timeframe);

      setEntries(filtered);
      setStats(leaderboardStats);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [metric, timeframe]);

  const getTraderRank = useCallback(
    (traderId: string): LeaderboardEntry | undefined => {
      return entries.find((e) => e.traderId === traderId);
    },
    [entries]
  );

  const getTraderPercentileRank = useCallback(
    (traderId: string): number => {
      const entry = getTraderRank(traderId);
      if (!entry) return 0;
      return getTraderPercentile(entry.rank, entries.length);
    },
    [entries, getTraderRank]
  );

  const getTopTradersForMetric = useCallback(
    (count: number = 10): LeaderboardEntry[] => {
      return getTopTraders(entries, count);
    },
    [entries]
  );

  const getTraderBadgesForId = useCallback(
    (traderId: string): RankingBadge[] => {
      const entry = getTraderRank(traderId);
      if (!entry) return [];

      const stats = {
        roi: entry.metric,
        winRate: 0.65,
        totalTrades: 100,
        followers: entry.followers,
        totalProfit: entry.metric * 1000,
        rankImprovement: Math.random() * 20,
      };

      return getTraderBadges(stats);
    },
    [getTraderRank]
  );

  const searchTrader = useCallback(
    (query: string): LeaderboardEntry[] => {
      return entries.filter((e) => e.username.toLowerCase().includes(query.toLowerCase()));
    },
    [entries]
  );

  const getLeaderboardByMetric = useCallback(
    (newMetric: LeaderboardMetric): void => {
      setMetric(newMetric);
    },
    []
  );

  const getLeaderboardByTimeframe = useCallback(
    (newTimeframe: LeaderboardTimeframe): void => {
      setTimeframe(newTimeframe);
    },
    []
  );

  const getLeaderboardSummary = useCallback(() => {
    return {
      totalTraders: entries.length,
      topTrader: entries[0],
      averageMetric: stats?.averageMetric || 0,
      medianMetric: stats?.medianMetric || 0,
      currentMetric: metric,
      currentTimeframe: timeframe,
    };
  }, [entries, stats, metric, timeframe]);

  const getTraderRankHistory = useCallback((traderId: string) => {
    // In a real app, this would fetch historical rank data
    return [
      { date: Date.now() - 86400000 * 7, rank: Math.floor(Math.random() * 100) + 1 },
      { date: Date.now() - 86400000 * 6, rank: Math.floor(Math.random() * 100) + 1 },
      { date: Date.now() - 86400000 * 5, rank: Math.floor(Math.random() * 100) + 1 },
      { date: Date.now() - 86400000 * 4, rank: Math.floor(Math.random() * 100) + 1 },
      { date: Date.now() - 86400000 * 3, rank: Math.floor(Math.random() * 100) + 1 },
      { date: Date.now() - 86400000 * 2, rank: Math.floor(Math.random() * 100) + 1 },
      { date: Date.now() - 86400000, rank: Math.floor(Math.random() * 100) + 1 },
      { date: Date.now(), rank: getTraderRank(traderId)?.rank || 0 },
    ];
  }, [getTraderRank]);

  return {
    entries,
    stats,
    metric,
    timeframe,
    isLoading,
    error,
    getTraderRank,
    getTraderPercentileRank,
    getTopTradersForMetric,
    getTraderBadgesForId,
    searchTrader,
    getLeaderboardByMetric,
    getLeaderboardByTimeframe,
    getLeaderboardSummary,
    getTraderRankHistory,
    refetch: loadLeaderboardData,
  };
}
