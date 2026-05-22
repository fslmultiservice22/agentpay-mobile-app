import { describe, it, expect } from 'vitest';
import {
  generateMockCandles,
  generateMockOrders,
  generateMockOrderBook,
  calculateTradingMetrics,
  calculatePriceChange,
  getHighLow,
  calculateSupportResistance,
  validateOrder,
  calculateFillPrice,
  formatOrder,
  type Candle,
} from '../lib/trading/trading-config';

describe('Trading Dashboard', () => {
  describe('generateMockCandles', () => {
    it('should generate candles with correct count', () => {
      const candles = generateMockCandles('ETH/USDC', 50);
      expect(candles).toHaveLength(50);
    });

    it('should generate candles with valid OHLCV data', () => {
      const candles = generateMockCandles('ETH/USDC', 10);
      candles.forEach((candle) => {
        expect(candle.open).toBeGreaterThan(0);
        expect(candle.high).toBeGreaterThanOrEqual(candle.open);
        expect(candle.high).toBeGreaterThanOrEqual(candle.close);
        expect(candle.low).toBeLessThanOrEqual(candle.open);
        expect(candle.low).toBeLessThanOrEqual(candle.close);
        expect(candle.volume).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have increasing timestamps', () => {
      const candles = generateMockCandles('ETH/USDC', 10);
      for (let i = 1; i < candles.length; i++) {
        expect(candles[i].timestamp).toBeGreaterThan(candles[i - 1].timestamp);
      }
    });
  });

  describe('generateMockOrders', () => {
    it('should generate orders with valid data', () => {
      const orders = generateMockOrders();
      expect(orders.length).toBeGreaterThan(0);

      orders.forEach((order) => {
        expect(order.id).toBeDefined();
        expect(order.type).toMatch(/limit|market|stop-loss/);
        expect(order.side).toMatch(/buy|sell/);
        expect(order.price).toBeGreaterThan(0);
        expect(order.amount).toBeGreaterThan(0);
      });
    });

    it('should include different order types', () => {
      const orders = generateMockOrders();
      const types = new Set(orders.map((o) => o.type));
      expect(types.size).toBeGreaterThan(1);
    });
  });

  describe('generateMockOrderBook', () => {
    it('should generate order book with bids and asks', () => {
      const book = generateMockOrderBook('ETH/USDC');
      expect(book.bids.length).toBeGreaterThan(0);
      expect(book.asks.length).toBeGreaterThan(0);
    });

    it('should have valid bid-ask spread', () => {
      const book = generateMockOrderBook('ETH/USDC');
      expect(book.spread).toBeGreaterThan(0);
      expect(book.asks[0].price).toBeGreaterThan(book.bids[0].price);
    });

    it('should have bids sorted in descending order', () => {
      const book = generateMockOrderBook('ETH/USDC');
      for (let i = 1; i < book.bids.length; i++) {
        expect(book.bids[i].price).toBeLessThanOrEqual(book.bids[i - 1].price);
      }
    });

    it('should have asks sorted in ascending order', () => {
      const book = generateMockOrderBook('ETH/USDC');
      for (let i = 1; i < book.asks.length; i++) {
        expect(book.asks[i].price).toBeGreaterThanOrEqual(book.asks[i - 1].price);
      }
    });
  });

  describe('calculateTradingMetrics', () => {
    it('should calculate correct metrics', () => {
      const orders = generateMockOrders();
      const metrics = calculateTradingMetrics(orders);

      expect(metrics.totalOrders).toBe(orders.length);
      expect(metrics.openOrders).toBeGreaterThanOrEqual(0);
      expect(metrics.filledOrders).toBeGreaterThanOrEqual(0);
      expect(metrics.winRate).toBeGreaterThanOrEqual(0);
      expect(metrics.winRate).toBeLessThanOrEqual(100);
    });

    it('should handle empty orders', () => {
      const metrics = calculateTradingMetrics([]);
      expect(metrics.totalOrders).toBe(0);
      expect(metrics.winRate).toBe(0);
    });
  });

  describe('calculatePriceChange', () => {
    it('should calculate positive price change', () => {
      const candles: Candle[] = [
        { timestamp: 0, open: 100, high: 110, low: 90, close: 105, volume: 100 },
        { timestamp: 1, open: 105, high: 115, low: 100, close: 110, volume: 100 },
      ];
      const change = calculatePriceChange(candles);
      expect(change).toBeGreaterThan(0);
    });

    it('should calculate negative price change', () => {
      const candles: Candle[] = [
        { timestamp: 0, open: 100, high: 110, low: 90, close: 95, volume: 100 },
        { timestamp: 1, open: 95, high: 100, low: 85, close: 90, volume: 100 },
      ];
      const change = calculatePriceChange(candles);
      expect(change).toBeLessThan(0);
    });

    it('should return 0 for single candle', () => {
      const candles: Candle[] = [
        { timestamp: 0, open: 100, high: 110, low: 90, close: 105, volume: 100 },
      ];
      const change = calculatePriceChange(candles);
      expect(change).toBe(0);
    });
  });

  describe('getHighLow', () => {
    it('should find correct high and low', () => {
      const candles: Candle[] = [
        { timestamp: 0, open: 100, high: 150, low: 90, close: 105, volume: 100 },
        { timestamp: 1, open: 105, high: 120, low: 80, close: 110, volume: 100 },
      ];
      const { high, low } = getHighLow(candles);
      expect(high).toBe(150);
      expect(low).toBe(80);
    });
  });

  describe('calculateSupportResistance', () => {
    it('should calculate support and resistance', () => {
      const candles = generateMockCandles('ETH/USDC', 20);
      const { support, resistance } = calculateSupportResistance(candles);

      expect(support).toBeGreaterThan(0);
      expect(resistance).toBeGreaterThan(support);
    });
  });

  describe('validateOrder', () => {
    it('should validate limit order', () => {
      const result = validateOrder('limit', 'buy', 100, 1);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid price', () => {
      const result = validateOrder('limit', 'buy', -100, 1);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid amount', () => {
      const result = validateOrder('limit', 'buy', 100, 0);
      expect(result.valid).toBe(false);
    });

    it('should require trigger price for stop-loss', () => {
      const result = validateOrder('stop-loss', 'sell', 100, 1);
      expect(result.valid).toBe(false);
    });

    it('should validate stop-loss with trigger price', () => {
      const result = validateOrder('stop-loss', 'sell', 100, 1, 90);
      expect(result.valid).toBe(true);
    });
  });

  describe('calculateFillPrice', () => {
    it('should calculate fill price for buy order', () => {
      const book = generateMockOrderBook('ETH/USDC');
      const fillPrice = calculateFillPrice(book, 'buy', 1);
      expect(fillPrice).toBeGreaterThan(0);
    });

    it('should calculate fill price for sell order', () => {
      const book = generateMockOrderBook('ETH/USDC');
      const fillPrice = calculateFillPrice(book, 'sell', 1);
      expect(fillPrice).toBeGreaterThan(0);
    });

    it('should return 0 for unfillable order', () => {
      const book = generateMockOrderBook('ETH/USDC');
      const fillPrice = calculateFillPrice(book, 'buy', 10000);
      expect(fillPrice).toBe(0);
    });
  });

  describe('formatOrder', () => {
    it('should format order correctly', () => {
      const orders = generateMockOrders();
      const formatted = formatOrder(orders[0]);
      expect(formatted).toContain(orders[0].side.toUpperCase());
      expect(formatted).toContain(orders[0].symbol);
    });
  });

  describe('Trading Scenarios', () => {
    it('should handle multiple candles correctly', () => {
      const candles = generateMockCandles('ETH/USDC', 100);
      expect(candles.length).toBe(100);

      const change = calculatePriceChange(candles);
      const { high, low } = getHighLow(candles);

      expect(high).toBeGreaterThan(low);
      expect(change).toBeDefined();
    });

    it('should calculate metrics for mixed orders', () => {
      const orders = generateMockOrders();
      const metrics = calculateTradingMetrics(orders);

      expect(metrics.totalOrders).toBeGreaterThan(0);
      expect(metrics.openOrders + metrics.filledOrders).toBeLessThanOrEqual(metrics.totalOrders);
    });
  });
});
