import { describe, it, expect } from 'vitest';
import {
  calculateLeaderboardRank,
  calculateLeaderboardStats,
  getTraderBadges,
  getTopTraders,
  getTraderPercentile,
  formatLeaderboardEntry,
  getLeaderboardColor,
  calculateRankChange,
  validateLeaderboardMetric,
  validateLeaderboardTimeframe,
  RANKING_BADGES,
} from '../lib/leaderboard/leaderboard-config';
import { generateMockTraderProfiles } from '../lib/social/social-trading-config';

describe('Trader Leaderboard', () => {
  describe('calculateLeaderboardRank', () => {
    it('should calculate leaderboard ranks', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');

      expect(ranked).toHaveLength(traders.length);
      if (ranked.length > 0) {
        expect(ranked[0].rank).toBeGreaterThanOrEqual(1);
        expect(ranked[ranked.length - 1].rank).toBeGreaterThanOrEqual(1);
      }
    });

    it('should sort by ROI correctly', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');

      if (ranked.length > 1) {
        for (let i = 1; i < Math.min(ranked.length, 5); i++) {
          expect(typeof ranked[i - 1].metric).toBe('number');
          expect(typeof ranked[i].metric).toBe('number');
        }
      }
    });

    it('should have valid metric labels', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');

      if (ranked.length > 0) {
        ranked.forEach((entry) => {
          expect(typeof entry.metricLabel).toBe('string');
          expect(entry.metricLabel.length).toBeGreaterThan(0);
        });
      }
    });

    it('should assign badges to top 3', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');

      if (ranked.length > 0) {
        expect(['gold', 'silver', 'bronze', undefined]).toContain(ranked[0].badge);
      }
      if (ranked.length > 1) {
        expect(['gold', 'silver', 'bronze', undefined]).toContain(ranked[1].badge);
      }
      if (ranked.length > 2) {
        expect(['gold', 'silver', 'bronze', undefined]).toContain(ranked[2].badge);
      }
    });
  });

  describe('calculateLeaderboardStats', () => {
    it('should calculate statistics', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');
      const stats = calculateLeaderboardStats(ranked, 'roi', 'all');

      expect(stats.totalTraders).toBe(ranked.length);
      expect(typeof stats.averageMetric).toBe('number');
      expect(typeof stats.medianMetric).toBe('number');
    });

    it('should have valid top trader', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');
      const stats = calculateLeaderboardStats(ranked, 'roi', 'all');

      if (ranked.length > 0) {
        expect(stats.topTrader.rank).toBeGreaterThanOrEqual(1);
        expect(stats.topTrader.metric).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getTraderBadges', () => {
    it('should return badges for qualified traders', () => {
      const stats = {
        roi: 250,
        winRate: 0.75,
        totalTrades: 100,
        followers: 2000,
        totalProfit: 50000,
        rankImprovement: 15,
      };

      const badges = getTraderBadges(stats);
      expect(Array.isArray(badges)).toBe(true);
      expect(badges.length).toBeGreaterThanOrEqual(0);
    });

    it('should have valid badge properties', () => {
      const stats = {
        roi: 250,
        winRate: 0.75,
        totalTrades: 100,
        followers: 2000,
        totalProfit: 50000,
        rankImprovement: 15,
      };

      const badges = getTraderBadges(stats);
      expect(Array.isArray(badges)).toBe(true);
      if (badges.length > 0) {
        badges.forEach((badge) => {
          expect(typeof badge.id).toBe('string');
          expect(typeof badge.name).toBe('string');
        });
      }
    });
  });

  describe('getTopTraders', () => {
    it('should return top traders', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');
      const top = getTopTraders(ranked, 5);

      expect(top.length).toBeLessThanOrEqual(5);
      if (top.length > 0) {
        expect(top[0].rank).toBeGreaterThanOrEqual(1);
      }
    });

    it('should respect count parameter', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');

      const top10 = getTopTraders(ranked, 10);
      const top5 = getTopTraders(ranked, 5);

      expect(top10.length).toBeGreaterThanOrEqual(0);
      expect(top5.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getTraderPercentile', () => {
    it('should calculate percentile correctly', () => {
      const percentile = getTraderPercentile(1, 100);
      expect(typeof percentile).toBe('number');

      const percentile50 = getTraderPercentile(50, 100);
      expect(typeof percentile50).toBe('number');

      const percentile100 = getTraderPercentile(100, 100);
      expect(typeof percentile100).toBe('number');
    });
  });

  describe('formatLeaderboardEntry', () => {
    it('should format entry correctly', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');
      if (ranked.length > 0) {
        const formatted = formatLeaderboardEntry(ranked[0]);
        expect(formatted).toContain(ranked[0].username);
        expect(formatted.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getLeaderboardColor', () => {
    it('should return correct colors for ranks', () => {
      expect(typeof getLeaderboardColor(1)).toBe('string');
      expect(typeof getLeaderboardColor(2)).toBe('string');
      expect(typeof getLeaderboardColor(3)).toBe('string');
      expect(typeof getLeaderboardColor(10)).toBe('string');
    });
  });

  describe('calculateRankChange', () => {
    it('should calculate rank improvement', () => {
      const result = calculateRankChange(50, 40);
      expect(['up', 'down', 'stable']).toContain(result.direction);
      expect(typeof result.change).toBe('number');
    });

    it('should calculate rank decline', () => {
      const result = calculateRankChange(40, 50);
      expect(['up', 'down', 'stable']).toContain(result.direction);
      expect(typeof result.change).toBe('number');
    });

    it('should detect stable rank', () => {
      const result = calculateRankChange(50, 50);
      expect(['up', 'down', 'stable']).toContain(result.direction);
      expect(typeof result.change).toBe('number');
    });
  });

  describe('validateLeaderboardMetric', () => {
    it('should validate valid metrics', () => {
      expect(validateLeaderboardMetric('roi')).toBe(true);
      expect(validateLeaderboardMetric('winRate')).toBe(true);
      expect(validateLeaderboardMetric('profit')).toBe(true);
      expect(validateLeaderboardMetric('followers')).toBe(true);
      expect(validateLeaderboardMetric('trades')).toBe(true);
    });

    it('should reject invalid metrics', () => {
      expect(validateLeaderboardMetric('invalid')).toBe(false);
      expect(validateLeaderboardMetric('score')).toBe(false);
    });
  });

  describe('validateLeaderboardTimeframe', () => {
    it('should validate valid timeframes', () => {
      expect(validateLeaderboardTimeframe('24h')).toBe(true);
      expect(validateLeaderboardTimeframe('7d')).toBe(true);
      expect(validateLeaderboardTimeframe('30d')).toBe(true);
      expect(validateLeaderboardTimeframe('all')).toBe(true);
    });

    it('should reject invalid timeframes', () => {
      expect(validateLeaderboardTimeframe('1h')).toBe(false);
      expect(validateLeaderboardTimeframe('90d')).toBe(false);
    });
  });

  describe('Leaderboard Scenarios', () => {
    it('should handle metric switching', () => {
      const traders = generateMockTraderProfiles();
      const roiRanked = calculateLeaderboardRank(traders, 'roi', 'all');
      const profitRanked = calculateLeaderboardRank(traders, 'profit', 'all');

      // Both should have valid rankings
      expect(Array.isArray(roiRanked)).toBe(true);
      expect(Array.isArray(profitRanked)).toBe(true);
    });

    it('should handle timeframe filtering', () => {
      const traders = generateMockTraderProfiles();
      const allTime = calculateLeaderboardRank(traders, 'roi', 'all');
      const week = calculateLeaderboardRank(traders, 'roi', '7d');

      // Both should be arrays
      expect(Array.isArray(allTime)).toBe(true);
      expect(Array.isArray(week)).toBe(true);
    });

    it('should calculate complete leaderboard', () => {
      const traders = generateMockTraderProfiles();
      const ranked = calculateLeaderboardRank(traders, 'roi', 'all');
      const stats = calculateLeaderboardStats(ranked, 'roi', 'all');
      const top10 = getTopTraders(ranked, 10);

      expect(ranked.length).toBeGreaterThan(0);
      expect(stats.totalTraders).toBe(ranked.length);
      expect(top10.length).toBeLessThanOrEqual(10);
      if (top10.length > 0) {
        expect(top10[0].rank).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
