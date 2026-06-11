import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VerificationLevel = 'unverified' | 'basic' | 'intermediate' | 'advanced' | 'elite';

export interface VerificationData {
  level: VerificationLevel;
  verifiedAt?: string;
  expiresAt?: string;
  documents: {
    idVerification: boolean;
    addressVerification: boolean;
    incomeVerification: boolean;
    bankVerification: boolean;
  };
  score: number; // 0-100
  badges: string[];
  restrictions?: {
    maxDailyTrades?: number;
    maxMonthlyVolume?: number;
  };
}

export interface TraderVerificationProfile {
  traderId: string;
  verification: VerificationData;
  trustScore: number;
  followerCount: number;
  totalTrades: number;
  winRate: number;
}

const VERIFICATION_LEVELS = {
  unverified: {
    name: 'Unverified',
    color: '#9BA1A6',
    icon: '❌',
    requirements: [],
    benefits: [],
  },
  basic: {
    name: 'Basic Verified',
    color: '#687076',
    icon: '✓',
    requirements: ['Email Verification'],
    benefits: ['Can trade', 'Can follow traders'],
  },
  intermediate: {
    name: 'Intermediate',
    color: '#F59E0B',
    icon: '⭐',
    requirements: ['Email', 'ID Verification', 'Address Verification'],
    benefits: ['Higher trading limits', 'Can copy trade', 'Can message traders'],
  },
  advanced: {
    name: 'Advanced',
    color: '#3B82F6',
    icon: '⭐⭐',
    requirements: ['Email', 'ID', 'Address', 'Income Verification'],
    benefits: ['Highest trading limits', 'Featured in leaderboard', 'Priority support'],
  },
  elite: {
    name: 'Elite Verified',
    color: '#FFD700',
    icon: '👑',
    requirements: ['All documents', 'Bank verification', 'Track record review'],
    benefits: ['Unlimited trading', 'Featured trader', 'Exclusive community'],
  },
};

export function useTraderVerification(traderId: string) {
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [profile, setProfile] = useState<TraderVerificationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVerification();
  }, [traderId]);

  const loadVerification = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(`verification_${traderId}`);
      if (stored) {
        const data = JSON.parse(stored);
        setVerification(data);
        calculateProfile(data);
      } else {
        const defaultVerification: VerificationData = {
          level: 'unverified',
          documents: {
            idVerification: false,
            addressVerification: false,
            incomeVerification: false,
            bankVerification: false,
          },
          score: 0,
          badges: [],
        };
        setVerification(defaultVerification);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification');
    } finally {
      setLoading(false);
    }
  };

  const calculateProfile = (verificationData: VerificationData) => {
    const profile: TraderVerificationProfile = {
      traderId,
      verification: verificationData,
      trustScore: calculateTrustScore(verificationData),
      followerCount: Math.floor(Math.random() * 10000),
      totalTrades: Math.floor(Math.random() * 500),
      winRate: Math.random() * 100,
    };
    setProfile(profile);
  };

  const calculateTrustScore = (verificationData: VerificationData): number => {
    let score = 0;
    const { documents, level } = verificationData;

    // Base score from level
    const levelScores: Record<VerificationLevel, number> = {
      unverified: 10,
      basic: 30,
      intermediate: 60,
      advanced: 80,
      elite: 100,
    };
    score += levelScores[level];

    // Document bonuses
    if (documents.idVerification) score += 10;
    if (documents.addressVerification) score += 10;
    if (documents.incomeVerification) score += 15;
    if (documents.bankVerification) score += 15;

    return Math.min(score, 100);
  };

  const submitVerification = async (level: VerificationLevel, documents: Partial<VerificationData['documents']>) => {
    try {
      const updatedVerification: VerificationData = {
        ...verification!,
        level,
        documents: { ...verification!.documents, ...documents },
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        score: calculateTrustScore({ ...verification!, level, documents: { ...verification!.documents, ...documents } }),
        badges: generateBadges(level),
      };

      await AsyncStorage.setItem(`verification_${traderId}`, JSON.stringify(updatedVerification));
      setVerification(updatedVerification);
      calculateProfile(updatedVerification);
      return updatedVerification;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit verification';
      setError(message);
      throw err;
    }
  };

  const generateBadges = (level: VerificationLevel): string[] => {
    const badges: string[] = [];
    if (level === 'basic') badges.push('verified');
    if (level === 'intermediate') badges.push('verified', 'trader');
    if (level === 'advanced') badges.push('verified', 'trader', 'professional');
    if (level === 'elite') badges.push('verified', 'trader', 'professional', 'elite');
    return badges;
  };

  const getVerificationInfo = (level: VerificationLevel) => {
    return VERIFICATION_LEVELS[level];
  };

  const updateDocument = async (documentType: keyof VerificationData['documents'], verified: boolean) => {
    if (!verification) return;

    const updated: VerificationData = {
      ...verification,
      documents: { ...verification.documents, [documentType]: verified },
    };

    await AsyncStorage.setItem(`verification_${traderId}`, JSON.stringify(updated));
    setVerification(updated);
    calculateProfile(updated);
  };

  const getVerificationProgress = (): number => {
    if (!verification) return 0;
    const { documents } = verification;
    const verified = Object.values(documents).filter(Boolean).length;
    return (verified / Object.keys(documents).length) * 100;
  };

  return {
    verification,
    profile,
    loading,
    error,
    submitVerification,
    updateDocument,
    getVerificationInfo,
    getVerificationProgress,
    VERIFICATION_LEVELS,
  };
}
