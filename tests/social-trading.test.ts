import { describe, it, expect } from 'vitest';
import {
  generateMockTraderProfiles,
  generateMockTraderStats,
  generateMockSharedTrades,
  calculateTraderMetrics,
  validateCopyTrade,
  calculateCopyTradeAmount,
  getTraderRank,
  calculateTraderScore,
  formatTraderProfile,
  type TraderProfile,
} from '../lib/social/social-trading-config';

describe('Social Trading', () => {
  describe('generateMockTraderProfiles', () => {
    it('should generate trader profiles', () => {
      const profiles = generateMockTraderProfiles();
      expect(profiles.length).toBeGreaterThan(0);
    });

    it('should have valid trader data', () => {
      const profiles = generateMockTraderProfiles();
      profiles.forEach((profile) => {
        expect(profile.id).toBeDefined();
        expect(profile.username).toBeDefined();
        expect(profile.winRate).toBeGreaterThan(0);
        expect(profile.winRate).toBeLessThan(1);
        expect(profile.roi).toBeGreaterThan(0);
      });
    });

    it('should include verified traders', () => {
      const profiles = generateMockTraderProfiles();
      const verified = profiles.filter((p) => p.verified);
      expect(verified.length).toBeGreaterThan(0);
    });
  });

  describe('generateMockTraderStats', () => {
    it('should generate trader stats', () => {
      const stats = generateMockTraderStats('trader_1');
      expect(stats.traderId).toBe('trader_1');
      expect(stats.totalVolume).toBeGreaterThan(0);
      expect(stats.profitFactor).toBeGreaterThan(0);
    });

    it('should have valid metrics', () => {
      const stats = generateMockTraderStats('trader_1');
      expect(stats.sharpeRatio).toBeGreaterThanOrEqual(0);
      expect(stats.maxDrawdown).toBeGreaterThanOrEqual(0);
      expect(stats.maxDrawdown).toBeLessThanOrEqual(1);
    });
  });

  describe('generateMockSharedTrades', () => {
    it('should generate shared trades', () => {
      const trades = generateMockSharedTrades('trader_1', 10);
      expect(trades).toHaveLength(10);
    });

    it('should have valid trade data', () => {
      const trades = generateMockSharedTrades('trader_1', 5);
      trades.forEach((trade) => {
        expect(trade.id).toBeDefined();
        expect(trade.symbol).toBeDefined();
        expect(trade.side).toMatch(/buy|sell/);
        expect(trade.entryPrice).toBeGreaterThan(0);
        expect(trade.amount).toBeGreaterThan(0);
      });
    });
  });

  describe('calculateTraderMetrics', () => {
    it('should calculate metrics from trades', () => {
      const trades = generateMockSharedTrades('trader_1', 20);
      const metrics = calculateTraderMetrics(trades);

      expect(metrics.totalVolume).toBeGreaterThan(0);
      expect(typeof metrics.sharpeRatio).toBe('number');
      expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty trades', () => {
      const metrics = calculateTraderMetrics([]);
      expect(metrics.totalVolume).toBe(0);
      expect(typeof metrics.sharpeRatio).toBe('number');
    });
  });

  describe('validateCopyTrade', () => {
    it('should validate valid copy trade', () => {
      const result = validateCopyTrade(50, 10000, 100);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid percentage', () => {
      const result = validateCopyTrade(0, 10000, 100);
      expect(result.valid).toBe(false);
    });

    it('should reject insufficient balance', () => {
      const result = validateCopyTrade(50, 100, 100);
      expect(result.valid).toBe(false);
    });

    it('should reject percentage over 100', () => {
      const result = validateCopyTrade(150, 10000, 100);
      expect(result.valid).toBe(false);
    });
  });

  describe('calculateCopyTradeAmount', () => {
    it('should calculate correct copy amount', () => {
      const amount = calculateCopyTradeAmount(10, 50, 1000);
      expect(amount).toBeLessThanOrEqual(10);
      expect(amount).toBeLessThanOrEqual(500);
    });

    it('should respect balance limit', () => {
      const amount = calculateCopyTradeAmount(1000, 50, 100);
      expect(amount).toBe(50);
    });
  });

  describe('getTraderRank', () => {
    it('should assign correct rank', () => {
      const stats = generateMockTraderStats('trader_1');
      const rank = getTraderRank(stats);
      expect(['Elite', 'Expert', 'Advanced', 'Intermediate', 'Beginner']).toContain(rank);
    });
  });

  describe('calculateTraderScore', () => {
    it('should calculate score between 0-100', () => {
      const stats = generateMockTraderStats('trader_1');
      const score = calculateTraderScore(stats);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('formatTraderProfile', () => {
    it('should format profile correctly', () => {
      const profile: TraderProfile = {
        id: 'trader_1',
        username: 'TestTrader',
        avatar: 'https://example.com/avatar.jpg',
        bio: 'Test bio',
        followers: 1000,
        following: 100,
        totalTrades: 500,
        winRate: 0.65,
        totalProfit: 50000,
        roi: 150,
        verified: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const formatted = formatTraderProfile(profile);
      expect(formatted).toContain('TestTrader');
      expect(formatted).toContain('150.0%');
      expect(formatted).toContain('ROI');
    });
  });

  describe('Social Trading Scenarios', () => {
    it('should handle trader discovery', () => {
      const profiles = generateMockTraderProfiles();
      expect(profiles.length).toBeGreaterThan(0);

      const topTraders = profiles.sort((a, b) => b.roi - a.roi).slice(0, 5);
      expect(topTraders.length).toBeLessThanOrEqual(5);
    });

    it('should calculate portfolio metrics', () => {
      const trades = generateMockSharedTrades('trader_1', 50);
      const metrics = calculateTraderMetrics(trades);

      expect(metrics.trades24h).toBeGreaterThanOrEqual(0);
      expect(metrics.trades7d).toBeGreaterThanOrEqual(metrics.trades24h);
      expect(metrics.trades30d).toBeGreaterThanOrEqual(metrics.trades7d);
    });

    it('should validate copy trading workflow', () => {
      const balance = 10000;
      const copyPercentage = 50;
      const tradeAmount = 100;

      const validation = validateCopyTrade(copyPercentage, balance, 50);
      expect(validation.valid).toBe(true);

      const copyAmount = calculateCopyTradeAmount(tradeAmount, copyPercentage, balance);
      expect(copyAmount).toBeLessThanOrEqual(balance * (copyPercentage / 100));
    });
  });
});
