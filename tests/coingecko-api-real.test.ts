import { describe, it, expect, beforeEach, vi } from 'vitest';
import { coingeckoAPIReal } from '../lib/coingecko-api-real';

// Mock fetch
global.fetch = vi.fn();

describe('Coingecko API Real', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coingeckoAPIReal.clearCache();
  });

  describe('getPrice', () => {
    it('should fetch price for a cryptocurrency', async () => {
      const mockResponse = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_data: {
          current_price: { usd: 45000 },
          market_cap: { usd: 900000000000 },
          high_24h: { usd: 46000 },
          low_24h: { usd: 44000 },
          price_change_24h: { usd: 1000 },
          price_change_percentage_24h: 2.27,
          market_cap_change_24h: { usd: 20000000000 },
          market_cap_change_percentage_24h: 2.27,
          circulating_supply: 21000000,
          total_supply: 21000000,
          max_supply: 21000000,
          ath: { usd: 69000 },
          atl: { usd: 100 },
          ath_change_percentage: { usd: -34.78 },
          atl_change_percentage: { usd: 44900 },
          ath_date: { usd: '2021-11-10T14:24:11.849Z' },
          atl_date: { usd: '2013-07-06T00:00:00.000Z' },
          fully_diluted_valuation: { usd: 900000000000 },
          total_volume: { usd: 20000000000 },
        },
        market_cap_rank: 1,
        roi: null,
        last_updated: '2024-01-15T10:30:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price = await coingeckoAPIReal.getPrice('bitcoin');

      expect(price).not.toBeNull();
      expect(price?.id).toBe('bitcoin');
      expect(price?.current_price).toBe(45000);
      expect(price?.symbol).toBe('BTC');
    });

    it('should cache price data', async () => {
      const mockResponse = {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        market_data: {
          current_price: { usd: 2500 },
          market_cap: { usd: 300000000000 },
          high_24h: { usd: 2600 },
          low_24h: { usd: 2400 },
          price_change_24h: { usd: 100 },
          price_change_percentage_24h: 4.17,
          market_cap_change_24h: { usd: 12000000000 },
          market_cap_change_percentage_24h: 4.17,
          circulating_supply: 120000000,
          total_supply: 120000000,
          max_supply: null,
          ath: { usd: 4891 },
          atl: { usd: 0.5 },
          ath_change_percentage: { usd: -48.94 },
          atl_change_percentage: { usd: 499900 },
          ath_date: { usd: '2021-11-16T07:24:11.849Z' },
          atl_date: { usd: '2015-01-14T00:00:00.000Z' },
          fully_diluted_valuation: { usd: 300000000000 },
          total_volume: { usd: 15000000000 },
        },
        market_cap_rank: 2,
        roi: null,
        last_updated: '2024-01-15T10:30:00.000Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const price1 = await coingeckoAPIReal.getPrice('ethereum');
      const price2 = await coingeckoAPIReal.getPrice('ethereum');

      expect(price1).toEqual(price2);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Should use cache on second call
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      const price = await coingeckoAPIReal.getPrice('bitcoin');

      expect(price).toBeNull();
    });
  });

  describe('getPrices', () => {
    it('should fetch multiple prices', async () => {
      const mockBTC = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_data: {
          current_price: { usd: 45000 },
          market_cap: { usd: 900000000000 },
          high_24h: { usd: 46000 },
          low_24h: { usd: 44000 },
          price_change_24h: { usd: 1000 },
          price_change_percentage_24h: 2.27,
          market_cap_change_24h: { usd: 20000000000 },
          market_cap_change_percentage_24h: 2.27,
          circulating_supply: 21000000,
          total_supply: 21000000,
          max_supply: 21000000,
          ath: { usd: 69000 },
          atl: { usd: 100 },
          ath_change_percentage: { usd: -34.78 },
          atl_change_percentage: { usd: 44900 },
          ath_date: { usd: '2021-11-10T14:24:11.849Z' },
          atl_date: { usd: '2013-07-06T00:00:00.000Z' },
          fully_diluted_valuation: { usd: 900000000000 },
          total_volume: { usd: 20000000000 },
        },
        market_cap_rank: 1,
        roi: null,
        last_updated: '2024-01-15T10:30:00.000Z',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockBTC,
      });

      const prices = await coingeckoAPIReal.getPrices(['bitcoin', 'ethereum']);

      expect(prices).toHaveLength(2);
      expect(prices[0].id).toBe('bitcoin');
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch historical price data', async () => {
      const mockResponse = {
        prices: [
          [1705276800000, 45000],
          [1705363200000, 45500],
          [1705449600000, 46000],
        ],
        market_caps: [
          [1705276800000, 900000000000],
          [1705363200000, 910000000000],
          [1705449600000, 920000000000],
        ],
        volumes: [
          [1705276800000, 20000000000],
          [1705363200000, 21000000000],
          [1705449600000, 22000000000],
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const historical = await coingeckoAPIReal.getHistoricalData('bitcoin', 7);

      expect(historical).toHaveLength(3);
      expect(historical[0].price).toBe(45000);
      expect(historical[1].price).toBe(45500);
    });
  });

  describe('getTrending', () => {
    it('should fetch trending cryptocurrencies', async () => {
      const mockResponse = {
        coins: [
          {
            item: {
              id: 'bitcoin',
              symbol: 'btc',
              name: 'Bitcoin',
              data: {
                price: 45000,
                market_cap: 900000000000,
                price_change_percentage_24h: { usd: 2.27 },
              },
              market_cap_rank: 1,
            },
          },
          {
            item: {
              id: 'ethereum',
              symbol: 'eth',
              name: 'Ethereum',
              data: {
                price: 2500,
                market_cap: 300000000000,
                price_change_percentage_24h: { usd: 4.17 },
              },
              market_cap_rank: 2,
            },
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const trending = await coingeckoAPIReal.getTrending();

      expect(trending).toHaveLength(2);
      expect(trending[0].id).toBe('bitcoin');
      expect(trending[1].id).toBe('ethereum');
    });
  });

  describe('getMarketData', () => {
    it('should fetch global market data', async () => {
      const mockResponse = {
        data: {
          total_market_cap: { usd: 1200000000000 },
          total_volume: { usd: 50000000000 },
          btc_dominance: 45.5,
          eth_dominance: 20.3,
          market_cap_change_percentage_24h_usd: 2.5,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const marketData = await coingeckoAPIReal.getMarketData();

      expect(marketData).not.toBeNull();
      expect(marketData.total_market_cap).toBe(1200000000000);
      expect(marketData.btc_dominance).toBe(45.5);
    });
  });

  describe('clearCache', () => {
    it('should clear cache', async () => {
      const mockResponse = {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        market_data: {
          current_price: { usd: 45000 },
          market_cap: { usd: 900000000000 },
          high_24h: { usd: 46000 },
          low_24h: { usd: 44000 },
          price_change_24h: { usd: 1000 },
          price_change_percentage_24h: 2.27,
          market_cap_change_24h: { usd: 20000000000 },
          market_cap_change_percentage_24h: 2.27,
          circulating_supply: 21000000,
          total_supply: 21000000,
          max_supply: 21000000,
          ath: { usd: 69000 },
          atl: { usd: 100 },
          ath_change_percentage: { usd: -34.78 },
          atl_change_percentage: { usd: 44900 },
          ath_date: { usd: '2021-11-10T14:24:11.849Z' },
          atl_date: { usd: '2013-07-06T00:00:00.000Z' },
          fully_diluted_valuation: { usd: 900000000000 },
          total_volume: { usd: 20000000000 },
        },
        market_cap_rank: 1,
        roi: null,
        last_updated: '2024-01-15T10:30:00.000Z',
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await coingeckoAPIReal.getPrice('bitcoin');
      coingeckoAPIReal.clearCache();

      const price = await coingeckoAPIReal.getPrice('bitcoin');

      expect(global.fetch).toHaveBeenCalledTimes(2); // Cache was cleared, so API called again
    });
  });
});
