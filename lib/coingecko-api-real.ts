/**
 * Coingecko API Real Integration
 * Fetches real cryptocurrency data from Coingecko API v3
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const CACHE_KEY = 'coingecko_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  ath: number;
  atl: number;
  ath_change_percentage: number;
  atl_change_percentage: number;
  ath_date: string;
  atl_date: string;
  roi: any;
  last_updated: string;
}

export interface HistoricalPrice {
  timestamp: number;
  price: number;
  market_cap: number;
  volume: number;
}

export interface CryptoMarketData {
  prices: HistoricalPrice[];
  market_caps: HistoricalPrice[];
  volumes: HistoricalPrice[];
}

class CoingeckoAPIReal {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  /**
   * Get current price for a cryptocurrency
   */
  async getPrice(coinId: string, vsCurrency: string = 'usd'): Promise<CryptoPrice | null> {
    try {
      const cacheKey = `price_${coinId}_${vsCurrency}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const url = `${COINGECKO_API_BASE}/coins/${coinId}?vs_currency=${vsCurrency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const price: CryptoPrice = {
        id: data.id,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        current_price: data.market_data.current_price[vsCurrency],
        market_cap: data.market_data.market_cap[vsCurrency],
        market_cap_rank: data.market_cap_rank,
        fully_diluted_valuation: data.market_data.fully_diluted_valuation[vsCurrency],
        total_volume: data.market_data.total_volume[vsCurrency],
        high_24h: data.market_data.high_24h[vsCurrency],
        low_24h: data.market_data.low_24h[vsCurrency],
        price_change_24h: data.market_data.price_change_24h[vsCurrency],
        price_change_percentage_24h: data.market_data.price_change_percentage_24h,
        market_cap_change_24h: data.market_data.market_cap_change_24h[vsCurrency],
        market_cap_change_percentage_24h: data.market_data.market_cap_change_percentage_24h,
        circulating_supply: data.market_data.circulating_supply,
        total_supply: data.market_data.total_supply,
        max_supply: data.market_data.max_supply,
        ath: data.market_data.ath[vsCurrency],
        atl: data.market_data.atl[vsCurrency],
        ath_change_percentage: data.market_data.ath_change_percentage[vsCurrency],
        atl_change_percentage: data.market_data.atl_change_percentage[vsCurrency],
        ath_date: data.market_data.ath_date[vsCurrency],
        atl_date: data.market_data.atl_date[vsCurrency],
        roi: data.roi,
        last_updated: data.last_updated,
      };

      this.setCache(cacheKey, price);
      return price;
    } catch (error) {
      console.error('Failed to fetch price from Coingecko:', error);
      return null;
    }
  }

  /**
   * Get multiple prices at once
   */
  async getPrices(coinIds: string[], vsCurrency: string = 'usd'): Promise<CryptoPrice[]> {
    try {
      const prices = await Promise.all(coinIds.map(id => this.getPrice(id, vsCurrency)));
      return prices.filter((p): p is CryptoPrice => p !== null);
    } catch (error) {
      console.error('Failed to fetch multiple prices:', error);
      return [];
    }
  }

  /**
   * Get historical price data for a cryptocurrency
   */
  async getHistoricalData(
    coinId: string,
    days: number = 7,
    vsCurrency: string = 'usd'
  ): Promise<HistoricalPrice[]> {
    try {
      const cacheKey = `historical_${coinId}_${days}_${vsCurrency}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const url = `${COINGECKO_API_BASE}/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=daily`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const historicalData: HistoricalPrice[] = data.prices.map((price: [number, number]) => ({
        timestamp: price[0],
        price: price[1],
        market_cap: 0,
        volume: 0,
      }));

      this.setCache(cacheKey, historicalData);
      return historicalData;
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      return [];
    }
  }

  /**
   * Get trending cryptocurrencies
   */
  async getTrending(): Promise<CryptoPrice[]> {
    try {
      const cacheKey = 'trending';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const url = `${COINGECKO_API_BASE}/search/trending`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const trending: CryptoPrice[] = data.coins.map((coin: any) => ({
        id: coin.item.id,
        symbol: coin.item.symbol.toUpperCase(),
        name: coin.item.name,
        current_price: coin.item.data.price,
        market_cap: coin.item.data.market_cap,
        market_cap_rank: coin.item.market_cap_rank,
        fully_diluted_valuation: 0,
        total_volume: 0,
        high_24h: 0,
        low_24h: 0,
        price_change_24h: 0,
        price_change_percentage_24h: coin.item.data.price_change_percentage_24h.usd,
        market_cap_change_24h: 0,
        market_cap_change_percentage_24h: 0,
        circulating_supply: 0,
        total_supply: 0,
        max_supply: 0,
        ath: 0,
        atl: 0,
        ath_change_percentage: 0,
        atl_change_percentage: 0,
        ath_date: '',
        atl_date: '',
        roi: null,
        last_updated: new Date().toISOString(),
      }));

      this.setCache(cacheKey, trending);
      return trending;
    } catch (error) {
      console.error('Failed to fetch trending:', error);
      return [];
    }
  }

  /**
   * Get market data
   */
  async getMarketData(): Promise<any> {
    try {
      const cacheKey = 'market_data';
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const url = `${COINGECKO_API_BASE}/global`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const marketData = {
        total_market_cap: data.data.total_market_cap.usd,
        total_volume: data.data.total_volume.usd,
        btc_dominance: data.data.btc_dominance,
        eth_dominance: data.data.eth_dominance,
        market_cap_change_percentage_24h: data.data.market_cap_change_percentage_24h_usd,
      };

      this.setCache(cacheKey, marketData);
      return marketData;
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      return null;
    }
  }

  /**
   * Get cache
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Save cache to persistent storage
   */
  async persistCache(): Promise<void> {
    try {
      const cacheData = Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        data: value.data,
        timestamp: value.timestamp,
      }));
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  /**
   * Load cache from persistent storage
   */
  async loadCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const cacheData = JSON.parse(cached);
        cacheData.forEach((item: any) => {
          if (Date.now() - item.timestamp < CACHE_DURATION) {
            this.cache.set(item.key, { data: item.data, timestamp: item.timestamp });
          }
        });
      }
    } catch (error) {
      console.error('Failed to load cache:', error);
    }
  }
}

export const coingeckoAPIReal = new CoingeckoAPIReal();
