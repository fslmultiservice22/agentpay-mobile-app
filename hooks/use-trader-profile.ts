import { useCallback, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateMockSharedTrades, calculateTraderMetrics } from '@/lib/social/social-trading-config';

export interface TraderStats {
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  totalVolume: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  avgWinLoss: number;
  winStreak: number;
  lossStreak: number;
  bestTrade: number;
  worstTrade: number;
  roi: number;
}

export interface TraderProfile {
  id: string;
  username: string;
  avatar: string;
  verified: boolean;
  bio: string;
  followers: number;
  following: number;
  joinDate: number;
  stats: TraderStats;
  trades: any[];
  badges: string[];
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
}

const TRADER_PROFILE_STORAGE_KEY = 'agentpay_trader_profile';

/**
 * Hook for managing trader profile
 */
export function useTraderProfile(traderId: string) {
  const [profile, setProfile] = useState<TraderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize profile data
  useEffect(() => {
    loadTraderProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traderId]);

  const loadTraderProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Generate mock trades
      const trades = generateMockSharedTrades(traderId, 50);
      const metrics = calculateTraderMetrics(trades);

      // Calculate additional metrics
      const wins = trades.filter((t: any) => (t.profit || 0) > 0).length;

      // Create profile
      const totalProfit = trades.reduce((sum: number, t: any) => sum + (t.profit || 0), 0);
      const totalVolume = trades.reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const bestTrade = Math.max(...trades.map((t: any) => t.profit || 0), 0);
      const worstTrade = Math.min(...trades.map((t: any) => t.profit || 0), 0);

      const traderProfile: TraderProfile = {
        id: traderId,
        username: `Trader${traderId.slice(0, 8)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${traderId}`,
        verified: Math.random() > 0.7,
        bio: 'Professional trader with 5+ years of experience in crypto trading.',
        followers: Math.floor(Math.random() * 10000) + 100,
        following: Math.floor(Math.random() * 500) + 10,
        joinDate: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        stats: {
          totalTrades: trades.length,
          winRate: wins / (trades.length || 1),
          totalProfit,
          totalVolume,
          sharpeRatio: 1.5,
          maxDrawdown: 0.15,
          profitFactor: 2.1,
          avgWinLoss: 0.8,
          winStreak: Math.floor(Math.random() * 20) + 1,
          lossStreak: Math.floor(Math.random() * 5) + 1,
          bestTrade,
          worstTrade,
          roi: ((totalProfit / 10000) * 100),
        },
        trades,
        badges: ['elite', 'consistent', 'popular'],
        socialLinks: {
          twitter: `https://twitter.com/trader_${traderId.slice(0, 8)}`,
          discord: `discord_${traderId.slice(0, 8)}`,
          telegram: `@trader_${traderId.slice(0, 8)}`,
        },
      };

      setProfile(traderProfile);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trader profile';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [traderId]);

  const getTraderStats = useCallback((): TraderStats | null => {
    if (!profile?.stats) return null;
    return { ...profile.stats };
  }, [profile]);

  const getTraderTrades = useCallback((limit?: number) => {
    if (!profile) return [];
    const trades = profile.trades || [];
    return limit ? trades.slice(0, limit) : [...trades];
  }, [profile]);

  const getTraderRankings = useCallback(() => {
    if (!profile?.stats) return null;

    const stats = profile.stats;
    return {
      winRate: `${(stats.winRate * 100).toFixed(1)}%`,
      roi: `${stats.roi.toFixed(1)}%`,
      profitFactor: stats.profitFactor.toFixed(2),
      sharpeRatio: stats.sharpeRatio.toFixed(2),
      maxDrawdown: `${(stats.maxDrawdown * 100).toFixed(1)}%`,
      avgWinLoss: stats.avgWinLoss.toFixed(2),
    };
  }, [profile]);

  const getTradeHistory = useCallback((limit: number = 10) => {
    if (!profile?.trades) return [];
    
    return profile.trades.slice(0, limit).map((trade: any, index: number) => ({
      ...trade,
      rank: index + 1,
    }));
  }, [profile]);

  const getTraderPerformance = useCallback(() => {
    if (!profile?.stats) return null;

    const stats = profile.stats;
    const isExcellent = stats.roi > 100 && stats.winRate > 0.65;
    const isGood = stats.roi > 50 && stats.winRate > 0.55;
    const isAverage = stats.roi > 0 && stats.winRate > 0.45;

    let level = 'poor';
    if (isExcellent) level = 'excellent';
    else if (isGood) level = 'good';
    else if (isAverage) level = 'average';

    const score = (stats.roi + stats.winRate * 100 + stats.profitFactor * 10) / 3;

    return {
      level,
      score,
    };
  }, [profile]);

  const getMonthlyPerformance = useCallback(() => {
    if (!profile?.trades) return [];

    const monthlyData: Record<string, { profit: number; trades: number; wins: number }> = {};

    profile.trades.forEach((trade: any) => {
      const date = new Date(trade.timestamp || Date.now());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { profit: 0, trades: 0, wins: 0 };
      }

      monthlyData[monthKey].profit += trade.profit || 0;
      monthlyData[monthKey].trades += 1;
      if ((trade.profit || 0) > 0) {
        monthlyData[monthKey].wins += 1;
      }
    });

    return Object.entries(monthlyData).map(([month, monthData]) => ({
      month,
      ...monthData,
      winRate: monthData.trades > 0 ? (monthData.wins / monthData.trades) * 100 : 0,
    }));
  }, [profile]);

  const getTopAssets = useCallback(() => {
    if (!profile?.trades) return [];

    const assetStats: Record<string, { profit: number; trades: number; wins: number }> = {};

    profile.trades.forEach((trade: any) => {
      const asset = trade.fromToken || 'Unknown';

      if (!assetStats[asset]) {
        assetStats[asset] = { profit: 0, trades: 0, wins: 0 };
      }

      assetStats[asset].profit += trade.profit || 0;
      assetStats[asset].trades += 1;
      if ((trade.profit || 0) > 0) {
        assetStats[asset].wins += 1;
      }
    });

    return Object.entries(assetStats)
      .map(([asset, assetData]) => ({
        asset,
        ...assetData,
        winRate: assetData.trades > 0 ? (assetData.wins / assetData.trades) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [profile]);

  const followTrader = useCallback(async () => {
    if (!profile) return;
    
    try {
      const key = `${TRADER_PROFILE_STORAGE_KEY}_${traderId}_follow`;
      await AsyncStorage.setItem(key, 'true');
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          followers: prev.followers + 1,
        };
      });
    } catch (err) {
      console.error('Failed to follow trader:', err);
    }
  }, [traderId]);

  const unfollowTrader = useCallback(async () => {
    if (!profile) return;
    
    try {
      const key = `${TRADER_PROFILE_STORAGE_KEY}_${traderId}_follow`;
      await AsyncStorage.removeItem(key);
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          followers: Math.max(0, prev.followers - 1),
        };
      });
    } catch (err) {
      console.error('Failed to unfollow trader:', err);
    }
  }, [traderId]);

  const isFollowing = useCallback(async (): Promise<boolean> => {
    try {
      const key = `${TRADER_PROFILE_STORAGE_KEY}_${traderId}_follow`;
      const value = await AsyncStorage.getItem(key);
      return value === 'true';
    } catch (err) {
      console.error('Failed to check following status:', err);
      return false;
    }
  }, [traderId]);

  return {
    profile,
    isLoading,
    error,
    getTraderStats,
    getTraderTrades,
    getTraderRankings,
    getTradeHistory,
    getTraderPerformance,
    getMonthlyPerformance,
    getTopAssets,
    followTrader,
    unfollowTrader,
    isFollowing,
    refetch: loadTraderProfile,
  };
}
