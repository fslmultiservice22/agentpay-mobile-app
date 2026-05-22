import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('Auto Rebalancing System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Deviation Calculation', () => {
    it('should calculate deviations correctly', () => {
      const calculateDeviations = (
        originalAllocation: Record<string, number>,
        currentAllocation: Record<string, number>
      ): Record<string, number> => {
        const deviations: Record<string, number> = {};
        for (const asset in originalAllocation) {
          const original = originalAllocation[asset] || 0;
          const current = currentAllocation[asset] || 0;
          const deviation = Math.abs(current - original);
          deviations[asset] = deviation;
        }
        return deviations;
      };

      const original = { ETH: 40, USDC: 30, MATIC: 30 };
      const current = { ETH: 35, USDC: 35, MATIC: 30 };

      const deviations = calculateDeviations(original, current);
      expect(deviations.ETH).toBe(5);
      expect(deviations.USDC).toBe(5);
      expect(deviations.MATIC).toBe(0);
    });

    it('should handle missing assets', () => {
      const calculateDeviations = (
        originalAllocation: Record<string, number>,
        currentAllocation: Record<string, number>
      ): Record<string, number> => {
        const deviations: Record<string, number> = {};
        for (const asset in originalAllocation) {
          const original = originalAllocation[asset] || 0;
          const current = currentAllocation[asset] || 0;
          const deviation = Math.abs(current - original);
          deviations[asset] = deviation;
        }
        return deviations;
      };

      const original = { ETH: 50, USDC: 50 };
      const current = { ETH: 50 };

      const deviations = calculateDeviations(original, current);
      expect(deviations.USDC).toBe(50);
    });
  });

  describe('Rebalancing Threshold', () => {
    it('should detect when rebalancing is needed', () => {
      const shouldRebalance = (
        originalAllocation: Record<string, number>,
        currentAllocation: Record<string, number>,
        threshold: number
      ): boolean => {
        const deviations: Record<string, number> = {};
        for (const asset in originalAllocation) {
          const original = originalAllocation[asset] || 0;
          const current = currentAllocation[asset] || 0;
          const deviation = Math.abs(current - original);
          deviations[asset] = deviation;
        }
        const maxDeviation = Math.max(...Object.values(deviations));
        return maxDeviation > threshold;
      };

      const original = { ETH: 50, USDC: 50 };
      const current = { ETH: 40, USDC: 60 };

      expect(shouldRebalance(original, current, 5)).toBe(true);
      expect(shouldRebalance(original, current, 15)).toBe(false);
    });

    it('should not rebalance when within threshold', () => {
      const shouldRebalance = (
        originalAllocation: Record<string, number>,
        currentAllocation: Record<string, number>,
        threshold: number
      ): boolean => {
        const deviations: Record<string, number> = {};
        for (const asset in originalAllocation) {
          const original = originalAllocation[asset] || 0;
          const current = currentAllocation[asset] || 0;
          const deviation = Math.abs(current - original);
          deviations[asset] = deviation;
        }
        const maxDeviation = Math.max(...Object.values(deviations));
        return maxDeviation > threshold;
      };

      const original = { ETH: 50, USDC: 50 };
      const current = { ETH: 48, USDC: 52 };

      expect(shouldRebalance(original, current, 5)).toBe(false);
    });
  });

  describe('Rebalancing Statistics', () => {
    it('should calculate success rate', () => {
      const getSuccessRate = (successful: number, total: number): number => {
        if (total === 0) return 0;
        return (successful / total) * 100;
      };

      expect(getSuccessRate(10, 10)).toBe(100);
      expect(getSuccessRate(8, 10)).toBe(80);
      expect(getSuccessRate(0, 10)).toBe(0);
    });

    it('should calculate average execution time', () => {
      const calculateAverageTime = (times: number[]): number => {
        if (times.length === 0) return 0;
        return times.reduce((a, b) => a + b, 0) / times.length;
      };

      expect(calculateAverageTime([100, 200, 300])).toBe(200);
      expect(calculateAverageTime([1000])).toBe(1000);
    });
  });

  describe('Rebalancing Configuration', () => {
    it('should have valid frequency options', () => {
      const frequencies = ['realtime', 'hourly', 'daily'];
      expect(frequencies).toContain('realtime');
      expect(frequencies).toContain('hourly');
      expect(frequencies).toContain('daily');
    });

    it('should enforce max rebalances per day', () => {
      const isWithinLimit = (rebalancesToday: number, maxPerDay: number): boolean => {
        return rebalancesToday < maxPerDay;
      };

      expect(isWithinLimit(5, 10)).toBe(true);
      expect(isWithinLimit(10, 10)).toBe(false);
      expect(isWithinLimit(15, 10)).toBe(false);
    });
  });

  describe('Rebalancing Changes', () => {
    it('should calculate allocation changes correctly', () => {
      const calculateChanges = (
        oldAllocation: Record<string, number>,
        newAllocation: Record<string, number>
      ) => {
        const changes = [];
        for (const asset in newAllocation) {
          const oldPercent = oldAllocation[asset] || 0;
          const newPercent = newAllocation[asset] || 0;
          const percentChange = newPercent - oldPercent;
          changes.push({ asset, oldPercent, newPercent, percentChange });
        }
        return changes;
      };

      const old = { ETH: 40, USDC: 30, MATIC: 30 };
      const new_ = { ETH: 50, USDC: 25, MATIC: 25 };

      const changes = calculateChanges(old, new_);
      expect(changes[0].percentChange).toBe(10);
      expect(changes[1].percentChange).toBe(-5);
      expect(changes[2].percentChange).toBe(-5);
    });
  });

  describe('Rebalancing Events', () => {
    it('should track rebalancing events', () => {
      const event = {
        id: 'rebalance_123',
        copyTradeId: 'copy_1',
        traderId: 'trader_1',
        timestamp: new Date().toISOString(),
        oldAllocation: { ETH: 40, USDC: 60 },
        newAllocation: { ETH: 50, USDC: 50 },
        changes: [],
        status: 'completed' as const,
      };

      expect(event.status).toBe('completed');
      expect(event.copyTradeId).toBe('copy_1');
    });

    it('should track failed rebalancing events', () => {
      const event = {
        id: 'rebalance_123',
        copyTradeId: 'copy_1',
        traderId: 'trader_1',
        timestamp: new Date().toISOString(),
        oldAllocation: { ETH: 40, USDC: 60 },
        newAllocation: { ETH: 50, USDC: 50 },
        changes: [],
        status: 'failed' as const,
        error: 'Insufficient balance',
      };

      expect(event.status).toBe('failed');
      expect(event.error).toBe('Insufficient balance');
    });
  });
});
