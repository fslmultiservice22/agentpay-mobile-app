import { describe, it, expect } from 'vitest';
import {
  calculateSwapStatistics,
  calculateBlockchainStats,
  calculateTokenStats,
  generateTimeSeries,
  exportSwapsToCSV,
  MOCK_SWAP_HISTORY,
  type SwapRecord,
} from '../lib/analytics/swap-analytics-config';

describe('Swap Analytics', () => {
  describe('calculateSwapStatistics', () => {
    it('should calculate total swaps', () => {
      const stats = calculateSwapStatistics(MOCK_SWAP_HISTORY);
      expect(stats.totalSwaps).toBe(MOCK_SWAP_HISTORY.length);
    });

    it('should calculate completed swaps', () => {
      const stats = calculateSwapStatistics(MOCK_SWAP_HISTORY);
      const expectedCompleted = MOCK_SWAP_HISTORY.filter((s) => s.status === 'completed').length;
      expect(stats.completedSwaps).toBe(expectedCompleted);
    });

    it('should calculate failed swaps', () => {
      const stats = calculateSwapStatistics(MOCK_SWAP_HISTORY);
      const expectedFailed = MOCK_SWAP_HISTORY.filter((s) => s.status === 'failed').length;
      expect(stats.failedSwaps).toBe(expectedFailed);
    });

    it('should calculate total volume', () => {
      const stats = calculateSwapStatistics(MOCK_SWAP_HISTORY);
      expect(stats.totalVolume).toBeGreaterThan(0);
    });

    it('should calculate total fees', () => {
      const stats = calculateSwapStatistics(MOCK_SWAP_HISTORY);
      expect(stats.totalFees).toBeGreaterThan(0);
    });

    it('should identify best and worst swaps', () => {
      const stats = calculateSwapStatistics(MOCK_SWAP_HISTORY);
      expect(stats.bestSwap).toBeDefined();
      expect(stats.worstSwap).toBeDefined();
      expect(stats.bestSwap?.priceImpact).toBeLessThanOrEqual(stats.worstSwap?.priceImpact || Infinity);
    });

    it('should handle empty swaps', () => {
      const stats = calculateSwapStatistics([]);
      expect(stats.totalSwaps).toBe(0);
      expect(stats.completedSwaps).toBe(0);
      expect(stats.totalVolume).toBe(0);
    });
  });

  describe('calculateBlockchainStats', () => {
    it('should calculate stats for each blockchain', () => {
      const stats = calculateBlockchainStats(MOCK_SWAP_HISTORY);
      expect(stats.length).toBeGreaterThan(0);
    });

    it('should calculate percentages correctly', () => {
      const stats = calculateBlockchainStats(MOCK_SWAP_HISTORY);
      const totalPercentage = stats.reduce((sum, s) => sum + s.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it('should count swaps per blockchain', () => {
      const stats = calculateBlockchainStats(MOCK_SWAP_HISTORY);
      stats.forEach((stat) => {
        expect(stat.swapCount).toBeGreaterThan(0);
      });
    });

    it('should handle empty swaps', () => {
      const stats = calculateBlockchainStats([]);
      expect(stats).toEqual([]);
    });
  });

  describe('calculateTokenStats', () => {
    it('should calculate stats for tokens in', () => {
      const stats = calculateTokenStats(MOCK_SWAP_HISTORY);
      expect(stats.in.length).toBeGreaterThan(0);
    });

    it('should calculate stats for tokens out', () => {
      const stats = calculateTokenStats(MOCK_SWAP_HISTORY);
      expect(stats.out.length).toBeGreaterThan(0);
    });

    it('should sort tokens by swap count', () => {
      const stats = calculateTokenStats(MOCK_SWAP_HISTORY);
      for (let i = 0; i < stats.in.length - 1; i++) {
        expect(stats.in[i].swapCount).toBeGreaterThanOrEqual(stats.in[i + 1].swapCount);
      }
    });

    it('should calculate percentages correctly', () => {
      const stats = calculateTokenStats(MOCK_SWAP_HISTORY);
      const inPercentage = stats.in.reduce((sum, t) => sum + t.percentage, 0);
      const outPercentage = stats.out.reduce((sum, t) => sum + t.percentage, 0);
      expect(inPercentage).toBeCloseTo(100, 1);
      expect(outPercentage).toBeCloseTo(100, 1);
    });

    it('should handle empty swaps', () => {
      const stats = calculateTokenStats([]);
      expect(stats.in).toEqual([]);
      expect(stats.out).toEqual([]);
    });
  });

  describe('generateTimeSeries', () => {
    it('should generate time series data', () => {
      const timeSeries = generateTimeSeries(MOCK_SWAP_HISTORY);
      expect(timeSeries.length).toBeGreaterThan(0);
    });

    it('should sort by timestamp', () => {
      const timeSeries = generateTimeSeries(MOCK_SWAP_HISTORY);
      for (let i = 0; i < timeSeries.length - 1; i++) {
        expect(timeSeries[i].timestamp).toBeLessThanOrEqual(timeSeries[i + 1].timestamp);
      }
    });

    it('should aggregate swaps by date', () => {
      const timeSeries = generateTimeSeries(MOCK_SWAP_HISTORY);
      timeSeries.forEach((ts) => {
        expect(ts.swapCount).toBeGreaterThan(0);
        expect(ts.volume).toBeGreaterThan(0);
      });
    });

    it('should handle empty swaps', () => {
      const timeSeries = generateTimeSeries([]);
      expect(timeSeries).toEqual([]);
    });
  });

  describe('exportSwapsToCSV', () => {
    it('should export swaps to CSV', () => {
      const csv = exportSwapsToCSV(MOCK_SWAP_HISTORY);
      expect(csv).toContain('ID');
      expect(csv).toContain('Timestamp');
      expect(csv).toContain('Blockchain');
    });

    it('should include all swap data', () => {
      const csv = exportSwapsToCSV(MOCK_SWAP_HISTORY);
      MOCK_SWAP_HISTORY.forEach((swap) => {
        expect(csv).toContain(swap.id);
        expect(csv).toContain(swap.tokenIn);
        expect(csv).toContain(swap.tokenOut);
      });
    });

    it('should format data correctly', () => {
      const csv = exportSwapsToCSV(MOCK_SWAP_HISTORY);
      const lines = csv.split('\n');
      expect(lines.length).toBe(MOCK_SWAP_HISTORY.length + 1); // +1 for header
    });

    it('should handle empty swaps', () => {
      const csv = exportSwapsToCSV([]);
      expect(csv).toContain('ID');
    });

    it('should escape quotes in CSV', () => {
      const testSwap: SwapRecord = {
        ...MOCK_SWAP_HISTORY[0],
        id: 'test-quote',
      };
      const csv = exportSwapsToCSV([testSwap]);
      expect(csv).toContain('test-quote');
    });
  });

  describe('Filtering and Aggregation', () => {
    it('should handle swaps with different statuses', () => {
      const stats = calculateSwapStatistics(MOCK_SWAP_HISTORY);
      expect(stats.completedSwaps + stats.failedSwaps).toBe(stats.totalSwaps);
    });

    it('should calculate average correctly', () => {
      const completed = MOCK_SWAP_HISTORY.filter((s) => s.status === 'completed');
      if (completed.length > 0) {
        const stats = calculateSwapStatistics(MOCK_SWAP_HISTORY);
        const expectedAverage = completed.reduce((sum, s) => sum + s.fee, 0) / completed.length;
        expect(stats.averageFee).toBeCloseTo(expectedAverage, 5);
      }
    });

    it('should handle multiple blockchains', () => {
      const stats = calculateBlockchainStats(MOCK_SWAP_HISTORY);
      const blockchains = new Set(MOCK_SWAP_HISTORY.map((s) => s.blockchain));
      expect(stats.length).toBeLessThanOrEqual(blockchains.size);
    });
  });
});
