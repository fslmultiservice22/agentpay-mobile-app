import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReferralUser {
  id: string;
  address: string;
  joinedAt: number;
  totalRewards: number;
  status: 'active' | 'inactive';
}

export interface ReferralReward {
  id: string;
  type: 'referral' | 'trading_fee' | 'staking' | 'bonus';
  amount: number;
  currency: string;
  earnedAt: number;
  description: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalRewards: number;
  monthlyRewards: number;
  referralCode: string;
  referralLink: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface ReferralState {
  stats: ReferralStats;
  referrals: ReferralUser[];
  rewards: ReferralReward[];
  isLoading: boolean;
  error: string | null;
}

const REFERRAL_CODE_KEY = 'agentpay_referral_code';
const REFERRAL_STATS_KEY = 'agentpay_referral_stats';
const REFERRAL_REWARDS_KEY = 'agentpay_referral_rewards';

// Genera un codice referral unico
const generateReferralCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Calcola il tier in base ai referral
const calculateTier = (totalReferrals: number): ReferralStats['tier'] => {
  if (totalReferrals >= 100) return 'platinum';
  if (totalReferrals >= 50) return 'gold';
  if (totalReferrals >= 20) return 'silver';
  return 'bronze';
};

// Calcola la percentuale di reward in base al tier
const getRewardPercentage = (tier: ReferralStats['tier']): number => {
  switch (tier) {
    case 'platinum':
      return 0.05; // 5%
    case 'gold':
      return 0.04; // 4%
    case 'silver':
      return 0.03; // 3%
    case 'bronze':
      return 0.02; // 2%
  }
};

export function useReferralProgram(address: string | null) {
  const [state, setState] = useState<ReferralState>({
    stats: {
      totalReferrals: 0,
      activeReferrals: 0,
      totalRewards: 0,
      monthlyRewards: 0,
      referralCode: '',
      referralLink: '',
      tier: 'bronze',
    },
    referrals: [],
    rewards: [],
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Carica i dati del referral program
  const loadReferralData = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      // Carica il codice referral
      let referralCode = await AsyncStorage.getItem(`${REFERRAL_CODE_KEY}_${address}`);
      if (!referralCode) {
        referralCode = generateReferralCode();
        await AsyncStorage.setItem(`${REFERRAL_CODE_KEY}_${address}`, referralCode);
      }

      // Carica le statistiche
      const statsJson = await AsyncStorage.getItem(`${REFERRAL_STATS_KEY}_${address}`);
      const stats = statsJson ? JSON.parse(statsJson) : null;

      // Carica i reward
      const rewardsJson = await AsyncStorage.getItem(`${REFERRAL_REWARDS_KEY}_${address}`);
      const rewards = rewardsJson ? JSON.parse(rewardsJson) : [];

      const tier = calculateTier(stats?.totalReferrals || 0);
      const referralLink = `https://agentpay.app/ref/${referralCode}`;

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          stats: {
            totalReferrals: stats?.totalReferrals || 0,
            activeReferrals: stats?.activeReferrals || 0,
            totalRewards: stats?.totalRewards || 0,
            monthlyRewards: stats?.monthlyRewards || 0,
            referralCode,
            referralLink,
            tier,
          },
          rewards,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load referral data';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Aggiungi un referral
  const addReferral = useCallback(
    async (referralAddress: string): Promise<boolean> => {
      if (!address) return false;

      try {
        const newReferral: ReferralUser = {
          id: `ref_${Date.now()}`,
          address: referralAddress,
          joinedAt: Date.now(),
          totalRewards: 0,
          status: 'active',
        };

        const updated = state.referrals.concat(newReferral);

        // Aggiorna le statistiche
        const tier = calculateTier(state.stats.totalReferrals + 1);
        const updatedStats = {
          ...state.stats,
          totalReferrals: state.stats.totalReferrals + 1,
          activeReferrals: state.stats.activeReferrals + 1,
          tier,
        };

        await AsyncStorage.setItem(`${REFERRAL_STATS_KEY}_${address}`, JSON.stringify(updatedStats));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            referrals: updated,
            stats: updatedStats,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to add referral:', err);
        return false;
      }
    },
    [address, state.referrals, state.stats],
  );

  // Aggiungi un reward
  const addReward = useCallback(
    async (type: ReferralReward['type'], amount: number, description: string): Promise<boolean> => {
      if (!address) return false;

      try {
        const reward: ReferralReward = {
          id: `reward_${Date.now()}`,
          type,
          amount,
          currency: 'AGNT',
          earnedAt: Date.now(),
          description,
        };

        const updated = state.rewards.concat(reward);

        // Aggiorna le statistiche
        const updatedStats = {
          ...state.stats,
          totalRewards: state.stats.totalRewards + amount,
          monthlyRewards: state.stats.monthlyRewards + amount,
        };

        await AsyncStorage.setItem(`${REFERRAL_REWARDS_KEY}_${address}`, JSON.stringify(updated));
        await AsyncStorage.setItem(`${REFERRAL_STATS_KEY}_${address}`, JSON.stringify(updatedStats));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            rewards: updated,
            stats: updatedStats,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to add reward:', err);
        return false;
      }
    },
    [address, state.rewards, state.stats],
  );

  // Calcola il reward per una transazione
  const calculateTransactionReward = useCallback((transactionAmount: number): number => {
    const percentage = getRewardPercentage(state.stats.tier);
    return transactionAmount * percentage;
  }, [state.stats.tier]);

  // Carica i dati al mount
  useEffect(() => {
    loadReferralData();
  }, [address, loadReferralData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    loadReferralData,
    addReferral,
    addReward,
    calculateTransactionReward,
  };
}
