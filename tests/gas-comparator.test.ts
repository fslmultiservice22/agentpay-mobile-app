import { describe, it, expect } from 'vitest';
import {
  calculateTransactionCostUsd,
  gweiToWei,
  weiToEth,
  getRecommendedBlockchain,
  formatGasPrice,
  getGasPriceColor,
  MOCK_GAS_PRICES,
  STANDARD_GAS_LIMITS,
  ETH_PRICES,
} from '../lib/gas/gas-config';

describe('Gas Price Comparator', () => {
  describe('Unit Conversions', () => {
    it('should convert gwei to wei', () => {
      const wei = gweiToWei(1);
      expect(wei).toBe('1000000000');
    });

    it('should convert wei to eth', () => {
      const eth = weiToEth('1000000000000000000');
      expect(eth).toBe(1);
    });

    it('should handle large numbers', () => {
      const wei = gweiToWei(100);
      expect(wei).toBe('100000000000');
    });
  });

  describe('Transaction Cost Calculation', () => {
    it('should calculate transaction cost in USD', () => {
      const cost = calculateTransactionCostUsd(21000, 50, 2500);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(10); // Reasonable upper bound
    });

    it('should handle different gas limits', () => {
      const cost1 = calculateTransactionCostUsd(21000, 50, 2500);
      const cost2 = calculateTransactionCostUsd(65000, 50, 2500);
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('should handle different gas prices', () => {
      const cost1 = calculateTransactionCostUsd(21000, 30, 2500);
      const cost2 = calculateTransactionCostUsd(21000, 60, 2500);
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('should handle zero gas limit', () => {
      const cost = calculateTransactionCostUsd(0, 50, 2500);
      expect(cost).toBe(0);
    });
  });

  describe('Gas Price Formatting', () => {
    it('should format gwei values', () => {
      expect(formatGasPrice(50)).toContain('50.00');
      expect(formatGasPrice(50)).toContain('Gwei');
    });

    it('should format small gwei values in mGwei', () => {
      const formatted = formatGasPrice(0.5);
      expect(formatted).toContain('mGwei');
    });

    it('should handle edge cases', () => {
      expect(formatGasPrice(0)).toContain('0');
      expect(formatGasPrice(1000)).toContain('1000');
    });
  });

  describe('Gas Price Color', () => {
    it('should return success color for standard speed', () => {
      const color = getGasPriceColor('standard', '#22C55E', '#F59E0B', '#EF4444');
      expect(color).toBe('#22C55E');
    });

    it('should return warning color for fast speed', () => {
      const color = getGasPriceColor('fast', '#22C55E', '#F59E0B', '#EF4444');
      expect(color).toBe('#F59E0B');
    });

    it('should return error color for instant speed', () => {
      const color = getGasPriceColor('instant', '#22C55E', '#F59E0B', '#EF4444');
      expect(color).toBe('#EF4444');
    });
  });

  describe('Recommended Blockchain', () => {
    it('should recommend cheapest blockchain', () => {
      const prices = Object.values(MOCK_GAS_PRICES).map((p) => ({
        ...p,
        timestamp: Date.now(),
      }));

      const recommended = getRecommendedBlockchain(prices, 21000, 'transfer');
      expect(recommended).toBeDefined();
      expect(['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism']).toContain(recommended);
    });

    it('should handle empty prices array', () => {
      const recommended = getRecommendedBlockchain([], 21000, 'transfer');
      expect(recommended).toBeUndefined();
    });

    it('should use standard gas limits', () => {
      expect(STANDARD_GAS_LIMITS['transfer']).toBe(21000);
      expect(STANDARD_GAS_LIMITS['tokenTransfer']).toBe(65000);
      expect(STANDARD_GAS_LIMITS['swap']).toBe(150000);
    });
  });

  describe('Mock Gas Prices', () => {
    it('should have prices for all blockchains', () => {
      expect(MOCK_GAS_PRICES['ethereum']).toBeDefined();
      expect(MOCK_GAS_PRICES['polygon']).toBeDefined();
      expect(MOCK_GAS_PRICES['bsc']).toBeDefined();
      expect(MOCK_GAS_PRICES['arbitrum']).toBeDefined();
      expect(MOCK_GAS_PRICES['optimism']).toBeDefined();
    });

    it('should have valid price ranges', () => {
      Object.values(MOCK_GAS_PRICES).forEach((price) => {
        expect(price.standard).toBeGreaterThan(0);
        expect(price.fast).toBeGreaterThanOrEqual(price.standard);
        expect(price.instant).toBeGreaterThanOrEqual(price.fast);
      });
    });

    it('should have ETH prices for all blockchains', () => {
      expect(ETH_PRICES['ethereum']).toBeGreaterThan(0);
      expect(ETH_PRICES['polygon']).toBeGreaterThan(0);
      expect(ETH_PRICES['bsc']).toBeGreaterThan(0);
      expect(ETH_PRICES['arbitrum']).toBeGreaterThan(0);
      expect(ETH_PRICES['optimism']).toBeGreaterThan(0);
    });
  });

  describe('Comparison Scenarios', () => {
    it('should show Arbitrum as cheapest for swaps', () => {
      const swapCost = STANDARD_GAS_LIMITS['swap'];
      const costs = Object.entries(MOCK_GAS_PRICES).map(([blockchain, price]) => ({
        blockchain,
        cost: calculateTransactionCostUsd(swapCost, price.standard, ETH_PRICES[blockchain as keyof typeof ETH_PRICES]),
      }));

      const cheapest = costs.reduce((min, item) => (item.cost < min.cost ? item : min));
      expect(['arbitrum', 'optimism']).toContain(cheapest.blockchain);
    });

    it('should calculate savings correctly', () => {
      const ethereumCost = calculateTransactionCostUsd(21000, MOCK_GAS_PRICES['ethereum'].standard, ETH_PRICES['ethereum']);
      const arbitrumCost = calculateTransactionCostUsd(21000, MOCK_GAS_PRICES['arbitrum'].standard, ETH_PRICES['arbitrum']);

      const savings = ethereumCost - arbitrumCost;
      expect(savings).toBeGreaterThan(0);
    });
  });
});
