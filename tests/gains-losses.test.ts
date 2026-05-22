import { describe, it, expect } from 'vitest';
import {
  calculateAssetGainLoss,
  calculatePortfolioGainLoss,
  formatGainLoss,
  formatGainLossPercent,
  calculateAverageCostBasis,
  calculateFIFOCostBasis,
  calculateLIFOCostBasis,
  calculateTaxLiability,
  type GainLossEntry,
} from '../lib/portfolio/gains-losses';

describe('Gains and Losses Calculation', () => {
  describe('calculateAssetGainLoss', () => {
    it('should calculate unrealized gain', () => {
      const result = calculateAssetGainLoss(10, 100, 150);
      expect(result.quantity).toBe(10);
      expect(result.totalCost).toBe(1000);
      expect(result.currentValue).toBe(1500);
      expect(result.unrealizedGain).toBe(500);
      expect(result.unrealizedGainPercent).toBe(50);
    });

    it('should calculate unrealized loss', () => {
      const result = calculateAssetGainLoss(10, 100, 50);
      expect(result.unrealizedGain).toBe(-500);
      expect(result.unrealizedGainPercent).toBe(-50);
    });

    it('should handle zero cost', () => {
      const result = calculateAssetGainLoss(10, 0, 100);
      expect(result.totalCost).toBe(0);
      expect(result.currentValue).toBe(1000);
    });
  });

  describe('calculatePortfolioGainLoss', () => {
    it('should calculate total portfolio gains', () => {
      const entries: GainLossEntry[] = [
        {
          symbol: 'ETH',
          blockchain: 'ethereum',
          quantity: 10,
          averageCost: 100,
          currentPrice: 150,
          totalCost: 1000,
          currentValue: 1500,
          unrealizedGain: 500,
          unrealizedGainPercent: 50,
        },
        {
          symbol: 'USDC',
          blockchain: 'ethereum',
          quantity: 100,
          averageCost: 1,
          currentPrice: 1.02,
          totalCost: 100,
          currentValue: 102,
          unrealizedGain: 2,
          unrealizedGainPercent: 2,
        },
      ];

      const result = calculatePortfolioGainLoss(entries);
      expect(result.totalCost).toBe(1100);
      expect(result.totalCurrentValue).toBe(1602);
      expect(result.totalUnrealizedGain).toBe(502);
      expect(result.totalUnrealizedGainPercent).toBeCloseTo(45.64, 1);
    });

    it('should handle empty entries', () => {
      const result = calculatePortfolioGainLoss([]);
      expect(result.totalCost).toBe(0);
      expect(result.totalCurrentValue).toBe(0);
      expect(result.totalUnrealizedGain).toBe(0);
      expect(result.totalUnrealizedGainPercent).toBe(0);
    });
  });

  describe('formatGainLoss', () => {
    it('should format positive gain with sign', () => {
      expect(formatGainLoss(500, true)).toBe('+$500.00');
    });

    it('should format negative loss with sign', () => {
      expect(formatGainLoss(-500, true)).toBe('-$500.00');
    });

    it('should format without sign', () => {
      expect(formatGainLoss(500, false)).toBe('$500.00');
      expect(formatGainLoss(-500, false)).toBe('-$500.00');
    });
  });

  describe('formatGainLossPercent', () => {
    it('should format positive percent', () => {
      expect(formatGainLossPercent(50, true)).toBe('+50.00%');
    });

    it('should format negative percent', () => {
      expect(formatGainLossPercent(-50, true)).toBe('-50.00%');
    });
  });

  describe('Cost Basis Methods', () => {
    const purchases = [
      { quantity: 10, price: 100 },
      { quantity: 5, price: 150 },
      { quantity: 5, price: 200 },
    ];

    describe('calculateAverageCostBasis', () => {
      it('should calculate average cost', () => {
        const result = calculateAverageCostBasis(purchases);
        const expected = (10 * 100 + 5 * 150 + 5 * 200) / 20;
        expect(result).toBe(expected);
      });

      it('should handle empty purchases', () => {
        expect(calculateAverageCostBasis([])).toBe(0);
      });
    });

    describe('calculateFIFOCostBasis', () => {
      it('should calculate FIFO cost basis', () => {
        const result = calculateFIFOCostBasis(purchases, 12);
        const expected = (10 * 100 + 2 * 150) / 12;
        expect(result).toBe(expected);
      });

      it('should handle selling all units', () => {
        const result = calculateFIFOCostBasis(purchases, 20);
        const expected = (10 * 100 + 5 * 150 + 5 * 200) / 20;
        expect(result).toBe(expected);
      });
    });

    describe('calculateLIFOCostBasis', () => {
      it('should calculate LIFO cost basis', () => {
        const result = calculateLIFOCostBasis(purchases, 12);
        const expected = (5 * 200 + 5 * 150 + 2 * 100) / 12;
        expect(result).toBe(expected);
      });

      it('should handle selling all units', () => {
        const result = calculateLIFOCostBasis(purchases, 20);
        const expected = (10 * 100 + 5 * 150 + 5 * 200) / 20;
        expect(result).toBe(expected);
      });
    });
  });

  describe('calculateTaxLiability', () => {
    it('should calculate short-term capital gains tax', () => {
      const tax = calculateTaxLiability(1000, 100, 0.37, 0.2);
      expect(tax).toBe(370); // 37% of 1000
    });

    it('should calculate long-term capital gains tax', () => {
      const tax = calculateTaxLiability(1000, 365, 0.37, 0.2);
      expect(tax).toBe(200); // 20% of 1000
    });

    it('should return 0 for losses', () => {
      const tax = calculateTaxLiability(-1000, 100, 0.37, 0.2);
      expect(tax).toBe(0);
    });
  });
});
