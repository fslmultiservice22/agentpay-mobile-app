import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LeaderboardUser {
  id: string;
  address: string;
  username: string;
  avatar?: string;
  rank: number;
  score: number;
  category: 'referrers' | 'traders' | 'stakers' | 'overall';
  weeklyScore?: number;
  monthlyScore?: number;
  totalRewards: number;
  joinedAt: number;
  lastUpdatedAt: number;
}

export interface LeaderboardStats {
  totalUsers: number;
  updateFrequency: 'daily' | 'weekly' | 'monthly';
  lastUpdatedAt: number;
  nextUpdateAt: number;
}

export interface LeaderboardState {
  users: LeaderboardUser[];
  stats: LeaderboardStats;
  userRank?: LeaderboardUser;
  isLoading: boolean;
  error: string | null;
}

const LEADERBOARD_KEY = 'agentpay_leaderboard';
const LEADERBOARD_STATS_KEY = 'agentpay_leaderboard_stats';

// Genera dati leaderboard simulati
const generateLeaderboardData = (): LeaderboardUser[] => {
  const categories: Array<'referrers' | 'traders' | 'stakers' | 'overall'> = [
    'referrers',
    'traders',
    'stakers',
    'overall',
  ];
  const users: LeaderboardUser[] = [];

  for (let i = 0; i < 50; i++) {
    for (const category of categories) {
      users.push({
        id: `user_${category}_${i}`,
        address: `0x${Math.random().toString(16).substring(2, 42)}`,
        username: `User${i + 1}`,
        rank: i + 1,
        score: Math.max(0, 10000 - i * 100 + Math.random() * 500),
        category,
        weeklyScore: Math.max(0, 1000 - i * 10 + Math.random() * 100),
        monthlyScore: Math.max(0, 5000 - i * 50 + Math.random() * 300),
        totalRewards: (i + 1) * 100 + Math.random() * 500,
        joinedAt: Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000,
        lastUpdatedAt: Date.now(),
      });
    }
  }

  return users;
};

export function useLeaderboard(userAddress: string | null) {
  const [state, setState] = useState<LeaderboardState>({
    users: [],
    stats: {
      totalUsers: 0,
      updateFrequency: 'weekly',
      lastUpdatedAt: Date.now(),
      nextUpdateAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Carica il leaderboard
  const loadLeaderboard = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(LEADERBOARD_KEY);
      const users = stored ? JSON.parse(stored) : generateLeaderboardData();

      const statsStored = await AsyncStorage.getItem(LEADERBOARD_STATS_KEY);
      const stats = statsStored
        ? JSON.parse(statsStored)
        : {
            totalUsers: users.length,
            updateFrequency: 'weekly',
            lastUpdatedAt: Date.now(),
            nextUpdateAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          };

      // Trova il rank dell'utente
      const userRank = userAddress
        ? users.find((u: LeaderboardUser) => u.address.toLowerCase() === userAddress.toLowerCase())
        : undefined;

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          users,
          stats,
          userRank,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [userAddress]);

  // Ottieni il leaderboard per categoria
  const getLeaderboardByCategory = useCallback(
    (category: 'referrers' | 'traders' | 'stakers' | 'overall', limit: number = 10): LeaderboardUser[] => {
      return state.users
        .filter(u => u.category === category)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    [state.users],
  );

  // Ottieni il rank dell'utente per categoria
  const getUserRankByCategory = useCallback(
    (category: 'referrers' | 'traders' | 'stakers' | 'overall'): LeaderboardUser | undefined => {
      return state.users.find(u => u.category === category && u.address.toLowerCase() === userAddress?.toLowerCase());
    },
    [state.users, userAddress],
  );

  // Aggiorna il leaderboard
  const updateLeaderboard = useCallback(async (): Promise<boolean> => {
    try {
      // Genera nuovi dati
      const updatedUsers = generateLeaderboardData();

      const updatedStats = {
        ...state.stats,
        totalUsers: updatedUsers.length,
        lastUpdatedAt: Date.now(),
        nextUpdateAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      await AsyncStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updatedUsers));
      await AsyncStorage.setItem(LEADERBOARD_STATS_KEY, JSON.stringify(updatedStats));

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          users: updatedUsers,
          stats: updatedStats,
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to update leaderboard:', err);
      return false;
    }
  }, [state.stats]);

  // Ottieni i top 10 per categoria
  const getTop10 = useCallback(
    (category: 'referrers' | 'traders' | 'stakers' | 'overall'): LeaderboardUser[] => {
      return getLeaderboardByCategory(category, 10);
    },
    [getLeaderboardByCategory],
  );

  // Ottieni i top 100 per categoria
  const getTop100 = useCallback(
    (category: 'referrers' | 'traders' | 'stakers' | 'overall'): LeaderboardUser[] => {
      return getLeaderboardByCategory(category, 100);
    },
    [getLeaderboardByCategory],
  );

  // Carica il leaderboard al mount
  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    loadLeaderboard,
    getLeaderboardByCategory,
    getUserRankByCategory,
    updateLeaderboard,
    getTop10,
    getTop100,
  };
}
