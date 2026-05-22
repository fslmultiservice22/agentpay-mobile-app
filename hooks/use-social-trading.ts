import { useCallback, useState, useEffect } from 'react';
import {
  generateMockTraderProfiles,
  generateMockTraderStats,
  generateMockSharedTrades,
  calculateTraderMetrics,
  type TraderProfile,
  type TraderStats,
  type SharedTrade,
  type TraderFollow,
  type CopyTrade,
} from '@/lib/social/social-trading-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TRADERS_STORAGE_KEY = 'agentpay_traders';
const FOLLOWS_STORAGE_KEY = 'agentpay_follows';
const COPY_TRADES_STORAGE_KEY = 'agentpay_copy_trades';

/**
 * Hook for managing social trading features
 */
export function useSocialTrading(userId: string) {
  const [traders, setTraders] = useState<TraderProfile[]>([]);
  const [follows, setFollows] = useState<TraderFollow[]>([]);
  const [copyTrades, setCopyTrades] = useState<CopyTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize social trading data
  useEffect(() => {
    loadSocialTradingData();
  }, [userId]);

  const loadSocialTradingData = useCallback(async () => {
    try {
      setIsLoading(true);
      const cachedTraders = await AsyncStorage.getItem(TRADERS_STORAGE_KEY);
      const cachedFollows = await AsyncStorage.getItem(`${FOLLOWS_STORAGE_KEY}_${userId}`);
      const cachedCopyTrades = await AsyncStorage.getItem(`${COPY_TRADES_STORAGE_KEY}_${userId}`);

      const loadedTraders = cachedTraders ? JSON.parse(cachedTraders) : generateMockTraderProfiles();
      const loadedFollows = cachedFollows ? JSON.parse(cachedFollows) : [];
      const loadedCopyTrades = cachedCopyTrades ? JSON.parse(cachedCopyTrades) : [];

      setTraders(loadedTraders);
      setFollows(loadedFollows);
      setCopyTrades(loadedCopyTrades);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load social trading data';
      setError(errorMessage);
      setTraders(generateMockTraderProfiles());
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const followTrader = useCallback(
    async (traderId: string, autoTrade: boolean = false, copyPercentage: number = 50) => {
      try {
        const newFollow: TraderFollow = {
          id: `follow_${Date.now()}`,
          userId,
          traderId,
          followedAt: Date.now(),
          autoTrade,
          copyPercentage,
        };

        const updated = [...follows, newFollow];
        setFollows(updated);
        await AsyncStorage.setItem(`${FOLLOWS_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
        setError(null);
        return newFollow;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to follow trader';
        setError(errorMessage);
        return null;
      }
    },
    [userId, follows]
  );

  const unfollowTrader = useCallback(
    async (traderId: string) => {
      try {
        const updated = follows.filter((f) => f.traderId !== traderId);
        setFollows(updated);
        await AsyncStorage.setItem(`${FOLLOWS_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to unfollow trader';
        setError(errorMessage);
      }
    },
    [userId, follows]
  );

  const createCopyTrade = useCallback(
    async (traderId: string, tradeId: string, copyPercentage: number) => {
      try {
        const newCopyTrade: CopyTrade = {
          id: `copy_${Date.now()}`,
          userId,
          traderId,
          tradeId,
          status: 'pending',
          copyPercentage,
          entryPrice: 0,
          createdAt: Date.now(),
        };

        const updated = [...copyTrades, newCopyTrade];
        setCopyTrades(updated);
        await AsyncStorage.setItem(`${COPY_TRADES_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
        setError(null);
        return newCopyTrade;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create copy trade';
        setError(errorMessage);
        return null;
      }
    },
    [userId, copyTrades]
  );

  const closeCopyTrade = useCallback(
    async (copyTradeId: string, exitPrice: number, profit: number) => {
      try {
        const updated = copyTrades.map((ct) =>
          ct.id === copyTradeId
            ? {
                ...ct,
                status: 'closed' as const,
                exitPrice,
                profit,
                roi: (profit / (ct.entryPrice * ct.copyPercentage)) * 100,
                closedAt: Date.now(),
              }
            : ct
        );
        setCopyTrades(updated);
        await AsyncStorage.setItem(`${COPY_TRADES_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to close copy trade';
        setError(errorMessage);
      }
    },
    [userId, copyTrades]
  );

  const getFollowedTraders = useCallback(() => {
    return traders.filter((t) => follows.some((f) => f.traderId === t.id));
  }, [traders, follows]);

  const getTraderStats = useCallback((traderId: string): TraderStats => {
    return generateMockTraderStats(traderId);
  }, []);

  const getTraderTrades = useCallback((traderId: string): SharedTrade[] => {
    return generateMockSharedTrades(traderId, 10);
  }, []);

  const getActiveCopyTrades = useCallback(() => {
    return copyTrades.filter((ct) => ct.status === 'active' || ct.status === 'pending');
  }, [copyTrades]);

  const getClosedCopyTrades = useCallback(() => {
    return copyTrades.filter((ct) => ct.status === 'closed');
  }, [copyTrades]);

  const calculateFollowerStats = useCallback((traderId: string) => {
    const traderFollows = follows.filter((f) => f.traderId === traderId);
    const totalCopyPercentage = traderFollows.reduce((sum, f) => sum + f.copyPercentage, 0);
    const autoCopyCount = traderFollows.filter((f) => f.autoTrade).length;

    return {
      followerCount: traderFollows.length,
      totalCopyPercentage,
      autoCopyCount,
      averageCopyPercentage: traderFollows.length > 0 ? totalCopyPercentage / traderFollows.length : 0,
    };
  }, [follows]);

  const isFollowing = useCallback(
    (traderId: string) => {
      return follows.some((f) => f.traderId === traderId);
    },
    [follows]
  );

  const getFollowData = useCallback(
    (traderId: string) => {
      return follows.find((f) => f.traderId === traderId);
    },
    [follows]
  );

  return {
    traders,
    follows,
    copyTrades,
    isLoading,
    error,
    followTrader,
    unfollowTrader,
    createCopyTrade,
    closeCopyTrade,
    getFollowedTraders,
    getTraderStats,
    getTraderTrades,
    getActiveCopyTrades,
    getClosedCopyTrades,
    calculateFollowerStats,
    isFollowing,
    getFollowData,
    refetch: loadSocialTradingData,
  };
}
