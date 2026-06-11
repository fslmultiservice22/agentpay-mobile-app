/**
 * Real-Time Price Service
 * Manages WebSocket connections for live price updates
 */

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap?: number;
  timestamp: number;
}

export interface PriceSubscription {
  symbol: string;
  callback: (data: PriceData) => void;
}

export interface PriceConfig {
  enabled: boolean;
  updateInterval: number; // in milliseconds
  reconnectAttempts: number;
  reconnectDelay: number; // in milliseconds
  dataSource: 'coingecko' | 'coinmarketcap' | 'binance' | 'mock';
}

class PriceService {
  private config: PriceConfig = {
    enabled: true,
    updateInterval: 1000, // 1 second
    reconnectAttempts: 5,
    reconnectDelay: 3000,
    dataSource: 'mock', // Use mock for testing
  };

  private priceCache: Map<string, PriceData> = new Map();
  private subscriptions: Map<string, PriceSubscription[]> = new Map();
  private updateTimers: Map<string, NodeJS.Timeout> = new Map();
  private isConnected = false;
  private reconnectCount = 0;

  /**
   * Initialize price service
   */
  public async init(): Promise<void> {
    console.log('[Price] Service initialized');
    console.log('[Price] Data source:', this.config.dataSource);
  }

  /**
   * Subscribe to price updates
   */
  public subscribe(symbol: string, callback: (data: PriceData) => void): () => void {
    if (!this.subscriptions.has(symbol)) {
      this.subscriptions.set(symbol, []);
      this.startPriceUpdates(symbol);
    }

    const subscription: PriceSubscription = { symbol, callback };
    this.subscriptions.get(symbol)!.push(subscription);

    console.log('[Price] Subscribed to', symbol);

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(symbol);
      if (subs) {
        const index = subs.indexOf(subscription);
        if (index > -1) {
          subs.splice(index, 1);
        }
        if (subs.length === 0) {
          this.stopPriceUpdates(symbol);
        }
      }
    };
  }

  /**
   * Get current price
   */
  public getPrice(symbol: string): PriceData | null {
    return this.priceCache.get(symbol) || null;
  }

  /**
   * Get multiple prices
   */
  public getPrices(symbols: string[]): Map<string, PriceData> {
    const prices = new Map<string, PriceData>();
    symbols.forEach((symbol) => {
      const price = this.priceCache.get(symbol);
      if (price) {
        prices.set(symbol, price);
      }
    });
    return prices;
  }

  /**
   * Start price updates for a symbol
   */
  private startPriceUpdates(symbol: string): void {
    if (this.updateTimers.has(symbol)) return;

    const timer = setInterval(() => {
      this.fetchPrice(symbol);
    }, this.config.updateInterval);

    this.updateTimers.set(symbol, timer);
    this.fetchPrice(symbol); // Fetch immediately
  }

  /**
   * Stop price updates for a symbol
   */
  private stopPriceUpdates(symbol: string): void {
    const timer = this.updateTimers.get(symbol);
    if (timer) {
      clearInterval(timer);
      this.updateTimers.delete(symbol);
    }
  }

  /**
   * Fetch price from data source
   */
  private async fetchPrice(symbol: string): Promise<void> {
    try {
      let priceData: PriceData | null = null;

      switch (this.config.dataSource) {
        case 'mock':
          priceData = this.generateMockPrice(symbol);
          break;
        case 'coingecko':
          priceData = await this.fetchFromCoinGecko(symbol);
          break;
        case 'coinmarketcap':
          priceData = await this.fetchFromCoinMarketCap(symbol);
          break;
        case 'binance':
          priceData = await this.fetchFromBinance(symbol);
          break;
      }

      if (priceData) {
        this.priceCache.set(symbol, priceData);
        this.notifySubscribers(symbol, priceData);
      }
    } catch (error) {
      console.error('[Price] Error fetching price for', symbol, ':', error);
    }
  }

  /**
   * Generate mock price data
   */
  private generateMockPrice(symbol: string): PriceData {
    const basePrice = this.getMockBasePrice(symbol);
    const change = (Math.random() - 0.5) * 100;
    const changePercent = (change / basePrice) * 100;

    return {
      symbol,
      price: basePrice + change,
      change24h: change,
      changePercent24h: changePercent,
      high24h: basePrice + Math.abs(change) * 1.1,
      low24h: basePrice - Math.abs(change) * 1.1,
      volume24h: Math.random() * 1000000000,
      marketCap: basePrice * 1000000000,
      timestamp: Date.now(),
    };
  }

  /**
   * Get mock base price for symbol
   */
  private getMockBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      BTC: 45000,
      ETH: 2500,
      SOL: 150,
      ADA: 1.2,
      DOGE: 0.35,
      XRP: 2.5,
      MATIC: 1.5,
      AVAX: 80,
      LINK: 25,
      UNI: 15,
    };
    return prices[symbol] || 100;
  }

  /**
   * Fetch from CoinGecko API
   */
  private async fetchFromCoinGecko(symbol: string): Promise<PriceData | null> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
      );
      const data = await response.json();

      if (data[symbol.toLowerCase()]) {
        const price = data[symbol.toLowerCase()];
        return {
          symbol,
          price: price.usd,
          change24h: 0,
          changePercent24h: price.usd_24h_change,
          high24h: price.usd * 1.05,
          low24h: price.usd * 0.95,
          volume24h: price.usd_24h_vol || 0,
          marketCap: price.usd_market_cap,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error('[Price] Error fetching from CoinGecko:', error);
    }
    return null;
  }

  /**
   * Fetch from CoinMarketCap API
   */
  private async fetchFromCoinMarketCap(symbol: string): Promise<PriceData | null> {
    // Note: CoinMarketCap requires API key
    console.log('[Price] CoinMarketCap requires API key');
    return null;
  }

  /**
   * Fetch from Binance API
   */
  private async fetchFromBinance(symbol: string): Promise<PriceData | null> {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`
      );
      const data = await response.json();

      return {
        symbol,
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChange),
        changePercent24h: parseFloat(data.priceChangePercent),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[Price] Error fetching from Binance:', error);
    }
    return null;
  }

  /**
   * Notify subscribers of price update
   */
  private notifySubscribers(symbol: string, priceData: PriceData): void {
    const subs = this.subscriptions.get(symbol);
    if (subs) {
      subs.forEach((sub) => {
        try {
          sub.callback(priceData);
        } catch (error) {
          console.error('[Price] Error in subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): PriceConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<PriceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Price] Config updated:', this.config);
  }

  /**
   * Get connection status
   */
  public isConnected_(): boolean {
    return this.isConnected;
  }

  /**
   * Get all cached prices
   */
  public getAllPrices(): Map<string, PriceData> {
    return new Map(this.priceCache);
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.priceCache.clear();
    console.log('[Price] Cache cleared');
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.updateTimers.forEach((timer) => clearInterval(timer));
    this.updateTimers.clear();
    this.subscriptions.clear();
    this.priceCache.clear();
    console.log('[Price] Service cleaned up');
  }

  /**
   * Get price statistics
   */
  public getPriceStats(symbol: string): {
    price: number;
    isPositive: boolean;
    emoji: string;
    formattedPrice: string;
    formattedChange: string;
  } | null {
    const priceData = this.priceCache.get(symbol);
    if (!priceData) return null;

    const isPositive = priceData.changePercent24h >= 0;
    const emoji = isPositive ? '📈' : '📉';

    return {
      price: priceData.price,
      isPositive,
      emoji,
      formattedPrice: `$${priceData.price.toFixed(2)}`,
      formattedChange: `${isPositive ? '+' : ''}${priceData.changePercent24h.toFixed(2)}%`,
    };
  }
}

// Export singleton instance
export const priceService = new PriceService();

/**
 * Hook to use price service in components
 */
export function usePriceService() {
  return priceService;
}
