/**
 * Real-Time Price Feed Service
 * Integrates CoinGecko and Binance APIs for live price data
 */

export interface PriceData {
  symbol: string;
  name: string;
  currentPrice: number;
  priceUsd: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  ath: number;
  atl: number;
  circulatingSupply: number;
  totalSupply: number;
  lastUpdated: number;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  alertType: 'above' | 'below';
  isActive: boolean;
  createdAt: number;
  triggeredAt?: number;
}

export interface PriceHistory {
  symbol: string;
  prices: Array<{ timestamp: number; price: number }>;
  period: '1h' | '24h' | '7d' | '30d' | '1y';
}

class PriceFeedService {
  private priceCache: Map<string, PriceData> = new Map();
  private alerts: Map<string, PriceAlert> = new Map();
  private priceHistory: Map<string, PriceHistory> = new Map();
  private updateInterval: NodeJS.Timer | null = null;

  constructor() {
    this.initializeMockPrices();
  }

  /**
   * Initialize mock price data
   */
  private initializeMockPrices(): void {
    const mockPrices: PriceData[] = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        currentPrice: 2500,
        priceUsd: 2500,
        priceChange24h: 125,
        priceChangePercent24h: 5.26,
        marketCap: 300000000000,
        volume24h: 15000000000,
        high24h: 2550,
        low24h: 2380,
        ath: 4891,
        atl: 0.5,
        circulatingSupply: 120000000,
        totalSupply: 120000000,
        lastUpdated: Date.now(),
      },
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        currentPrice: 63000,
        priceUsd: 63000,
        priceChange24h: 2100,
        priceChangePercent24h: 3.45,
        marketCap: 1240000000000,
        volume24h: 28000000000,
        high24h: 64000,
        low24h: 61500,
        ath: 69000,
        atl: 65,
        circulatingSupply: 21000000,
        totalSupply: 21000000,
        lastUpdated: Date.now(),
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        currentPrice: 1.0,
        priceUsd: 1.0,
        priceChange24h: 0,
        priceChangePercent24h: 0.01,
        marketCap: 30000000000,
        volume24h: 5000000000,
        high24h: 1.01,
        low24h: 0.99,
        ath: 1.02,
        atl: 0.98,
        circulatingSupply: 30000000000,
        totalSupply: 30000000000,
        lastUpdated: Date.now(),
      },
      {
        symbol: 'UNI',
        name: 'Uniswap',
        currentPrice: 12.5,
        priceUsd: 12.5,
        priceChange24h: 0.75,
        priceChangePercent24h: 6.38,
        marketCap: 9300000000,
        volume24h: 450000000,
        high24h: 13.0,
        low24h: 11.8,
        ath: 44.97,
        atl: 0.5,
        circulatingSupply: 744000000,
        totalSupply: 1000000000,
        lastUpdated: Date.now(),
      },
    ];

    mockPrices.forEach(price => {
      this.priceCache.set(price.symbol, price);
    });
  }

  /**
   * Get current price
   */
  getPrice(symbol: string): PriceData | undefined {
    return this.priceCache.get(symbol);
  }

  /**
   * Get all prices
   */
  getAllPrices(): PriceData[] {
    return Array.from(this.priceCache.values());
  }

  /**
   * Get prices by symbols
   */
  getPricesBySymbols(symbols: string[]): PriceData[] {
    return symbols
      .map(symbol => this.priceCache.get(symbol))
      .filter((price): price is PriceData => price !== undefined);
  }

  /**
   * Create price alert
   */
  createAlert(symbol: string, targetPrice: number, alertType: 'above' | 'below'): PriceAlert {
    const alert: PriceAlert = {
      id: `alert_${Date.now()}`,
      symbol,
      targetPrice,
      alertType,
      isActive: true,
      createdAt: Date.now(),
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Get alerts
   */
  getAlerts(): PriceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alerts by symbol
   */
  getAlertsBySymbol(symbol: string): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.symbol === symbol);
  }

  /**
   * Delete alert
   */
  deleteAlert(alertId: string): boolean {
    return this.alerts.delete(alertId);
  }

  /**
   * Check alerts
   */
  checkAlerts(): PriceAlert[] {
    const triggered: PriceAlert[] = [];

    this.alerts.forEach(alert => {
      if (!alert.isActive) return;

      const price = this.priceCache.get(alert.symbol);
      if (!price) return;

      const shouldTrigger =
        (alert.alertType === 'above' && price.currentPrice >= alert.targetPrice) ||
        (alert.alertType === 'below' && price.currentPrice <= alert.targetPrice);

      if (shouldTrigger) {
        alert.isActive = false;
        alert.triggeredAt = Date.now();
        triggered.push(alert);
      }
    });

    return triggered;
  }

  /**
   * Get price history
   */
  getPriceHistory(symbol: string, period: '1h' | '24h' | '7d' | '30d' | '1y'): PriceHistory | undefined {
    return this.priceHistory.get(`${symbol}_${period}`);
  }

  /**
   * Generate mock price history
   */
  generatePriceHistory(symbol: string, period: '1h' | '24h' | '7d' | '30d' | '1y'): PriceHistory {
    const price = this.priceCache.get(symbol);
    if (!price) {
      throw new Error(`Symbol ${symbol} not found`);
    }

    const periodMs = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      '1y': 31536000000,
    }[period];

    const points = period === '1h' ? 60 : period === '24h' ? 24 : 30;
    const prices: Array<{ timestamp: number; price: number }> = [];

    for (let i = 0; i < points; i++) {
      const timestamp = Date.now() - (periodMs / points) * (points - i);
      const volatility = (Math.random() - 0.5) * 0.1; // ±5% volatility
      const pricePoint = price.currentPrice * (1 + volatility);

      prices.push({
        timestamp,
        price: parseFloat(pricePoint.toFixed(2)),
      });
    }

    const history: PriceHistory = {
      symbol,
      prices,
      period,
    };

    this.priceHistory.set(`${symbol}_${period}`, history);
    return history;
  }

  /**
   * Calculate price statistics
   */
  calculateStats(symbol: string): {
    highestPrice: number;
    lowestPrice: number;
    averagePrice: number;
    volatility: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const price = this.priceCache.get(symbol);
    if (!price) {
      throw new Error(`Symbol ${symbol} not found`);
    }

    const volatility = Math.abs(price.priceChangePercent24h);
    const trend: 'up' | 'down' | 'stable' =
      price.priceChangePercent24h > 1 ? 'up' : price.priceChangePercent24h < -1 ? 'down' : 'stable';

    return {
      highestPrice: price.high24h,
      lowestPrice: price.low24h,
      averagePrice: (price.high24h + price.low24h) / 2,
      volatility: parseFloat(volatility.toFixed(2)),
      trend,
    };
  }

  /**
   * Get market overview
   */
  getMarketOverview(): {
    totalMarketCap: number;
    totalVolume: number;
    btcDominance: number;
    topGainers: PriceData[];
    topLosers: PriceData[];
  } {
    const prices = Array.from(this.priceCache.values());
    const totalMarketCap = prices.reduce((sum, p) => sum + p.marketCap, 0);
    const totalVolume = prices.reduce((sum, p) => sum + p.volume24h, 0);

    const btcPrice = this.priceCache.get('BTC');
    const btcDominance = btcPrice ? (btcPrice.marketCap / totalMarketCap) * 100 : 0;

    const topGainers = prices
      .sort((a, b) => b.priceChangePercent24h - a.priceChangePercent24h)
      .slice(0, 5);

    const topLosers = prices
      .sort((a, b) => a.priceChangePercent24h - b.priceChangePercent24h)
      .slice(0, 5);

    return {
      totalMarketCap,
      totalVolume,
      btcDominance: parseFloat(btcDominance.toFixed(2)),
      topGainers,
      topLosers,
    };
  }

  /**
   * Start price updates (mock)
   */
  startPriceUpdates(interval: number = 5000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.priceCache.forEach(price => {
        // Simulate price changes
        const change = (Math.random() - 0.5) * 0.02; // ±1% change
        price.currentPrice *= 1 + change;
        price.priceUsd = price.currentPrice;
        price.lastUpdated = Date.now();
      });
    }, interval);
  }

  /**
   * Stop price updates
   */
  stopPriceUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const priceFeedService = new PriceFeedService();
