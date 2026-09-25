import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { coinGeckoService } from '../lib/coingecko-service';

// Disable network requests for tests
vi.stubGlobal('fetch', vi.fn());

describe('CoinGecko Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe('getTokenPrice', () => {
    it('should fetch token price successfully', async () => {
      const mockResponse = {
        ethereum: { usd: 2500 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await coinGeckoService.getTokenPrice('ETH');
      expect(price).toBe(2500);
    });

    it('should return 0 on API error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const price = await coinGeckoService.getTokenPrice('ETH');
      expect(price).toBe(0);
    });

    it('should handle network error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const price = await coinGeckoService.getTokenPrice('ETH');
      expect(price).toBe(0);
    });
  });

  describe('getTokenPrices', () => {
    it('should fetch multiple token prices', async () => {
      const mockResponse = {
        ethereum: { usd: 2500 },
        'usd-coin': { usd: 1 },
        'matic-network': { usd: 0.8 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const prices = await coinGeckoService.getTokenPrices(['ETH', 'USDC', 'MATIC']);
      expect(prices.ETH).toBe(2500);
      expect(prices.USDC).toBe(1);
      expect(prices.MATIC).toBe(0.8);
    });

    it('should handle empty symbols array', async () => {
      const prices = await coinGeckoService.getTokenPrices([]);
      expect(prices).toEqual({});
    });
  });

  describe('getCoinData', () => {
    it('should fetch detailed coin data', async () => {
      const mockResponse = {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        image: { large: 'https://example.com/eth.png' },
        market_data: {
          current_price: { usd: 2500 },
          market_cap: { usd: 300000000000 },
          high_24h: { usd: 2600 },
          low_24h: { usd: 2400 },
          price_change_24h: 100,
          price_change_percentage_24h: 4.2,
          price_change_percentage_7d: 8.5,
          price_change_percentage_30d: 15.3,
          price_change_percentage_1y: 50.0,
          market_cap_change_24h: 12000000000,
          market_cap_change_percentage_24h: 4.2,
          circulating_supply: 120000000,
          total_supply: 120000000,
          max_supply: null,
          ath: { usd: 4800 },
          atl: { usd: 0.5 },
          ath_change_percentage: { usd: -47.9 },
          atl_change_percentage: { usd: 499900 },
          ath_date: { usd: '2021-11-16' },
          atl_date: { usd: '2015-01-14' },
        },
        market_cap_rank: 2,
        last_updated: '2024-01-15T10:00:00Z',
        roi: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const coinData = await coinGeckoService.getCoinData('ETH');
      expect(coinData).not.toBeNull();
      expect(coinData?.symbol).toBe('ETH');
      expect(coinData?.current_price).toBe(2500);
      expect(coinData?.price_change_percentage_24h).toBe(4.2);
    });

    it('should return null on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API error'));

      const coinData = await coinGeckoService.getCoinData('ETH');
      expect(coinData).toBeNull();
    });
  });

  describe('getPriceHistory', () => {
    it('should fetch price history', async () => {
      const mockResponse = {
        prices: [
          [1705276800000, 2400],
          [1705363200000, 2450],
          [1705449600000, 2500],
        ],
        market_caps: [
          [1705276800000, 288000000000],
          [1705363200000, 294000000000],
          [1705449600000, 300000000000],
        ],
        volumes: [
          [1705276800000, 15000000000],
          [1705363200000, 16000000000],
          [1705449600000, 17000000000],
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const history = await coinGeckoService.getPriceHistory('ETH', 7);
      expect(history).toHaveLength(3);
      expect(history[0].price).toBe(2400);
      expect(history[2].price).toBe(2500);
    });

    it('should return empty array on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API error'));

      const history = await coinGeckoService.getPriceHistory('ETH', 7);
      expect(history).toEqual([]);
    });
  });

  describe('getTrendingCoins', () => {
    it('should fetch trending coins', async () => {
      const mockResponse = {
        coins: [
          {
            item: {
              id: 'bitcoin',
              symbol: 'btc',
              name: 'Bitcoin',
              large: 'https://example.com/btc.png',
              market_cap_rank: 1,
              data: {
                price: 42000,
                price_change_percentage_24h: { usd: 2.5 },
              },
            },
          },
          {
            item: {
              id: 'ethereum',
              symbol: 'eth',
              name: 'Ethereum',
              large: 'https://example.com/eth.png',
              market_cap_rank: 2,
              data: {
                price: 2500,
                price_change_percentage_24h: { usd: 1.8 },
              },
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const trending = await coinGeckoService.getTrendingCoins();
      expect(trending).toHaveLength(2);
      expect(trending[0].symbol).toBe('BTC');
      expect(trending[1].symbol).toBe('ETH');
    });
  });

  describe('calculatePortfolioValue', () => {
    it('should calculate total portfolio value', async () => {
      const mockPrices = {
        ETH: 2500,
        USDC: 1,
        MATIC: 0.8,
      };

      vi.spyOn(coinGeckoService, 'getTokenPrices').mockResolvedValueOnce(mockPrices);

      const holdings = {
        ETH: 2,
        USDC: 5000,
        MATIC: 1000,
      };

      const value = await coinGeckoService.calculatePortfolioValue(holdings);
      const expectedValue = 2 * 2500 + 5000 * 1 + 1000 * 0.8;
      expect(value).toBeCloseTo(expectedValue, 0);
    });

    it('should return 0 for empty holdings', async () => {
      const value = await coinGeckoService.calculatePortfolioValue({});
      expect(value).toBe(0);
    });
  });

  describe('formatPrice', () => {
    it('should format price correctly', () => {
      const formatted = coinGeckoService.formatPrice(2500);
      expect(formatted).toBe('$2,500.00');
    });

    it('should handle small numbers', () => {
      const formatted = coinGeckoService.formatPrice(0.5);
      expect(formatted).toBe('$0.50');
    });
  });

  describe('formatPercentage', () => {
    it('should format positive percentage', () => {
      const formatted = coinGeckoService.formatPercentage(5.25);
      expect(formatted).toBe('+5.25%');
    });

    it('should format negative percentage', () => {
      const formatted = coinGeckoService.formatPercentage(-3.75);
      expect(formatted).toBe('-3.75%');
    });

    it('should format zero percentage', () => {
      const formatted = coinGeckoService.formatPercentage(0);
      expect(formatted).toBe('+0.00%');
    });
  });
});
