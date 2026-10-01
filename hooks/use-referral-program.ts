import { useCallback, useState } from 'react';

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

const UNAVAILABLE = 'Referral e premi non sono disponibili nella beta tecnica AgentPay.';
const EMPTY_STATS: ReferralStats = {
  totalReferrals: 0,
  activeReferrals: 0,
  totalRewards: 0,
  monthlyRewards: 0,
  referralCode: '',
  referralLink: '',
  tier: 'bronze',
};
const NO_REFERRALS: ReferralUser[] = [];
const NO_REWARDS: ReferralReward[] = [];

/**
 * API conservata per compatibilità con il codice futuro, ma inattiva.
 * Non ripristinare URL/referral o premi senza un servizio FSL verificato e autorizzato.
 */
export function useReferralProgram(_address: string | null) {
  const [error, setError] = useState<string | null>(UNAVAILABLE);
  const loadReferralData = useCallback(async (): Promise<void> => {
    setError(UNAVAILABLE);
  }, []);
  const unavailable = useCallback(async (): Promise<boolean> => {
    setError(UNAVAILABLE);
    return false;
  }, []);
  const calculateTransactionReward = useCallback((): number => 0, []);

  return {
    stats: EMPTY_STATS,
    referrals: NO_REFERRALS,
    rewards: NO_REWARDS,
    isLoading: false,
    error,
    loadReferralData,
    addReferral: unavailable,
    addReward: unavailable,
    calculateTransactionReward,
  };
}
