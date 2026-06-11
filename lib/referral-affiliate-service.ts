/**
 * Referral & Affiliate Program Service
 * Referral links, commission tracking, tiered rewards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ReferralCode {
  code: string;
  userId: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  usageCount: number;
  totalRewards: number;
}

export interface ReferredUser {
  referredUserId: string;
  referrerUserId: string;
  referralCode: string;
  referredAt: number;
  status: 'pending' | 'active' | 'inactive';
  totalTradesReferred: number;
  totalCommissionEarned: number;
}

export interface CommissionTier {
  tier: number;
  name: string;
  minReferrals: number;
  commissionPercentage: number;
  bonusReward?: number;
}

export interface AffiliateStats {
  userId: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCommissionEarned: number;
  currentTier: number;
  nextTierRequirement: number;
  monthlyCommission: number;
  lastPayoutDate?: number;
}

export interface CommissionRecord {
  id: string;
  affiliateId: string;
  referredUserId: string;
  tradeId: string;
  tradeAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  createdAt: number;
  status: 'pending' | 'approved' | 'paid';
  paidAt?: number;
}

class ReferralAffiliateService {
  private referralCodes: Map<string, ReferralCode> = new Map();
  private referredUsers: Map<string, ReferredUser> = new Map();
  private affiliateStats: Map<string, AffiliateStats> = new Map();
  private commissionRecords: Map<string, CommissionRecord> = new Map();

  private readonly REFERRAL_CODES_STORAGE_KEY = 'referral_codes';
  private readonly REFERRED_USERS_STORAGE_KEY = 'referred_users';
  private readonly AFFILIATE_STATS_STORAGE_KEY = 'affiliate_stats';
  private readonly COMMISSION_RECORDS_STORAGE_KEY = 'commission_records';

  private readonly COMMISSION_TIERS: CommissionTier[] = [
    { tier: 1, name: 'Bronze', minReferrals: 0, commissionPercentage: 5 },
    { tier: 2, name: 'Silver', minReferrals: 10, commissionPercentage: 7.5, bonusReward: 100 },
    { tier: 3, name: 'Gold', minReferrals: 50, commissionPercentage: 10, bonusReward: 500 },
    { tier: 4, name: 'Platinum', minReferrals: 100, commissionPercentage: 12.5, bonusReward: 1000 },
    { tier: 5, name: 'Diamond', minReferrals: 250, commissionPercentage: 15, bonusReward: 2500 },
  ];

  constructor() {
    this.loadData();
  }

  /**
   * Generate referral code
   */
  async generateReferralCode(userId: string, expiresIn?: number): Promise<ReferralCode> {
    const code = `REF_${userId.substring(0, 4)}_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const referralCode: ReferralCode = {
      code,
      userId,
      createdAt: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      isActive: true,
      usageCount: 0,
      totalRewards: 0,
    };

    this.referralCodes.set(code, referralCode);
    await this.persistData();

    return referralCode;
  }

  /**
   * Get referral code
   */
  getReferralCode(code: string): ReferralCode | undefined {
    return this.referralCodes.get(code);
  }

  /**
   * Get user referral codes
   */
  getUserReferralCodes(userId: string): ReferralCode[] {
    return Array.from(this.referralCodes.values()).filter(c => c.userId === userId);
  }

  /**
   * Use referral code
   */
  async useReferralCode(code: string, referredUserId: string): Promise<boolean> {
    const referralCode = this.referralCodes.get(code);
    if (!referralCode || !referralCode.isActive) return false;

    if (referralCode.expiresAt && Date.now() > referralCode.expiresAt) {
      referralCode.isActive = false;
      return false;
    }

    const referredUser: ReferredUser = {
      referredUserId,
      referrerUserId: referralCode.userId,
      referralCode: code,
      referredAt: Date.now(),
      status: 'pending',
      totalTradesReferred: 0,
      totalCommissionEarned: 0,
    };

    this.referredUsers.set(referredUserId, referredUser);
    referralCode.usageCount++;

    // Initialize affiliate stats if not exists
    if (!this.affiliateStats.has(referralCode.userId)) {
      this.affiliateStats.set(referralCode.userId, {
        userId: referralCode.userId,
        totalReferrals: 0,
        activeReferrals: 0,
        totalCommissionEarned: 0,
        currentTier: 1,
        nextTierRequirement: 10,
        monthlyCommission: 0,
      });
    }

    const stats = this.affiliateStats.get(referralCode.userId)!;
    stats.totalReferrals++;
    stats.activeReferrals++;

    await this.persistData();
    return true;
  }

  /**
   * Record commission
   */
  async recordCommission(
    affiliateId: string,
    referredUserId: string,
    tradeId: string,
    tradeAmount: number
  ): Promise<CommissionRecord | null> {
    const referredUser = this.referredUsers.get(referredUserId);
    if (!referredUser || referredUser.referrerUserId !== affiliateId) return null;

    const stats = this.affiliateStats.get(affiliateId);
    if (!stats) return null;

    const tier = this.getAffiliateCurrentTier(stats.totalReferrals);
    const commissionPercentage = tier.commissionPercentage;
    const commissionAmount = (tradeAmount * commissionPercentage) / 100;

    const record: CommissionRecord = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      affiliateId,
      referredUserId,
      tradeId,
      tradeAmount,
      commissionPercentage,
      commissionAmount,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.commissionRecords.set(record.id, record);

    stats.totalCommissionEarned += commissionAmount;
    stats.monthlyCommission += commissionAmount;
    referredUser.totalCommissionEarned += commissionAmount;
    referredUser.totalTradesReferred++;

    await this.persistData();
    return record;
  }

  /**
   * Get affiliate stats
   */
  getAffiliateStats(userId: string): AffiliateStats | undefined {
    return this.affiliateStats.get(userId);
  }

  /**
   * Get affiliate current tier
   */
  getAffiliateCurrentTier(referralCount: number): CommissionTier {
    let currentTier = this.COMMISSION_TIERS[0];

    for (const tier of this.COMMISSION_TIERS) {
      if (referralCount >= tier.minReferrals) {
        currentTier = tier;
      } else {
        break;
      }
    }

    return currentTier;
  }

  /**
   * Get next tier requirement
   */
  getNextTierRequirement(referralCount: number): number {
    for (const tier of this.COMMISSION_TIERS) {
      if (referralCount < tier.minReferrals) {
        return tier.minReferrals;
      }
    }
    return this.COMMISSION_TIERS[this.COMMISSION_TIERS.length - 1].minReferrals;
  }

  /**
   * Get commission records
   */
  getCommissionRecords(affiliateId?: string, status?: string): CommissionRecord[] {
    let records = Array.from(this.commissionRecords.values());

    if (affiliateId) {
      records = records.filter(r => r.affiliateId === affiliateId);
    }

    if (status) {
      records = records.filter(r => r.status === status);
    }

    return records;
  }

  /**
   * Approve commission
   */
  async approveCommission(commissionId: string): Promise<boolean> {
    const record = this.commissionRecords.get(commissionId);
    if (!record) return false;

    record.status = 'approved';
    await this.persistData();

    return true;
  }

  /**
   * Pay commission
   */
  async payCommission(commissionId: string): Promise<boolean> {
    const record = this.commissionRecords.get(commissionId);
    if (!record) return false;

    record.status = 'paid';
    record.paidAt = Date.now();

    const stats = this.affiliateStats.get(record.affiliateId);
    if (stats) {
      stats.lastPayoutDate = Date.now();
    }

    await this.persistData();

    return true;
  }

  /**
   * Get referred users
   */
  getReferredUsers(affiliateId: string): ReferredUser[] {
    return Array.from(this.referredUsers.values()).filter(r => r.referrerUserId === affiliateId);
  }

  /**
   * Get top affiliates
   */
  getTopAffiliates(limit: number = 10): AffiliateStats[] {
    return Array.from(this.affiliateStats.values())
      .sort((a, b) => b.totalCommissionEarned - a.totalCommissionEarned)
      .slice(0, limit);
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 100): Array<{
    rank: number;
    userId: string;
    totalReferrals: number;
    totalCommissionEarned: number;
    currentTier: string;
  }> {
    return Array.from(this.affiliateStats.values())
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, limit)
      .map((stats, index) => ({
        rank: index + 1,
        userId: stats.userId,
        totalReferrals: stats.totalReferrals,
        totalCommissionEarned: stats.totalCommissionEarned,
        currentTier: this.getAffiliateCurrentTier(stats.totalReferrals).name,
      }));
  }

  /**
   * Persist data
   */
  private async persistData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.REFERRAL_CODES_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.referralCodes))),
        AsyncStorage.setItem(this.REFERRED_USERS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.referredUsers))),
        AsyncStorage.setItem(this.AFFILIATE_STATS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.affiliateStats))),
        AsyncStorage.setItem(this.COMMISSION_RECORDS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.commissionRecords))),
      ]);
    } catch (error) {
      console.error('Failed to persist referral data:', error);
    }
  }

  /**
   * Load data
   */
  private async loadData(): Promise<void> {
    try {
      const [codes, users, stats, records] = await Promise.all([
        AsyncStorage.getItem(this.REFERRAL_CODES_STORAGE_KEY),
        AsyncStorage.getItem(this.REFERRED_USERS_STORAGE_KEY),
        AsyncStorage.getItem(this.AFFILIATE_STATS_STORAGE_KEY),
        AsyncStorage.getItem(this.COMMISSION_RECORDS_STORAGE_KEY),
      ]);

      if (codes) this.referralCodes = new Map(Object.entries(JSON.parse(codes)));
      if (users) this.referredUsers = new Map(Object.entries(JSON.parse(users)));
      if (stats) this.affiliateStats = new Map(Object.entries(JSON.parse(stats)));
      if (records) this.commissionRecords = new Map(Object.entries(JSON.parse(records)));
    } catch (error) {
      console.error('Failed to load referral data:', error);
    }
  }
}

export const referralAffiliateService = new ReferralAffiliateService();
