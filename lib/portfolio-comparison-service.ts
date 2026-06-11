/**
 * Portfolio Comparison Service
 * Compare user portfolio against market indices and benchmarks
 */

export interface MarketIndex {
  symbol: string;
  name: string;
  currentValue: number;
  change24h: number;
  changePercent24h: number;
  change7d: number;
  changePercent7d: number;
  change30d: number;
  changePercent30d: number;
  change1y: number;
  changePercent1y: number;
}

export interface PortfolioComparison {
  portfolioValue: number;
  portfolioChange24h: number;
  portfolioChangePercent24h: number;
  portfolioChange7d: number;
  portfolioChangePercent7d: number;
  portfolioChange30d: number;
  portfolioChangePercent30d: number;
  portfolioChange1y: number;
  portfolioChangePercent1y: number;
  benchmarks: Array<{
    index: MarketIndex;
    outperformance: number;
    outperformancePercent: number;
    ranking: number;
  }>;
  performanceRating: 'excellent' | 'good' | 'average' | 'poor';
}

export interface BenchmarkComparison {
  period: '24h' | '7d' | '30d' | '1y';
  portfolioReturn: number;
  sp500Return: number;
  cryptoMarketReturn: number;
  nasdaqReturn: number;
  bestPerformer: string;
  worstPerformer: string;
}

class PortfolioComparisonService {
  private marketIndices: Map<string, MarketIndex> = new Map();
  private portfolioHistory: Array<{ timestamp: number; value: number }> = [];

  constructor() {
    this.initializeMarketIndices();
    this.generatePortfolioHistory();
  }

  /**
   * Initialize market indices
   */
  private initializeMarketIndices(): void {
    const indices: MarketIndex[] = [
      {
        symbol: 'SP500',
        name: 'S&P 500',
        currentValue: 5000,
        change24h: 50,
        changePercent24h: 1.0,
        change7d: 150,
        changePercent7d: 3.08,
        change30d: 200,
        changePercent30d: 4.17,
        change1y: 1000,
        changePercent1y: 25.0,
      },
      {
        symbol: 'NASDAQ',
        name: 'NASDAQ-100',
        currentValue: 18000,
        change24h: 100,
        changePercent24h: 0.56,
        change7d: 300,
        changePercent7d: 1.69,
        change30d: 500,
        changePercent30d: 2.86,
        change1y: 3000,
        changePercent1y: 20.0,
      },
      {
        symbol: 'CRYPTO',
        name: 'Crypto Market Cap',
        currentValue: 2000000000000,
        change24h: 50000000000,
        changePercent24h: 2.56,
        change7d: 200000000000,
        changePercent7d: 11.11,
        change30d: 300000000000,
        changePercent30d: 17.65,
        change1y: 800000000000,
        changePercent1y: 66.67,
      },
      {
        symbol: 'DXY',
        name: 'US Dollar Index',
        currentValue: 104,
        change24h: 0.2,
        changePercent24h: 0.19,
        change7d: -0.5,
        changePercent7d: -0.48,
        change30d: -1.0,
        changePercent30d: -0.95,
        change1y: 5,
        changePercent1y: 5.0,
      },
    ];

    indices.forEach(index => {
      this.marketIndices.set(index.symbol, index);
    });
  }

  /**
   * Generate portfolio history
   */
  private generatePortfolioHistory(): void {
    let baseValue = 100000;
    const now = Date.now();

    for (let i = 365; i >= 0; i--) {
      const timestamp = now - i * 24 * 60 * 60 * 1000;
      const volatility = (Math.random() - 0.5) * 0.05; // ±2.5% daily volatility
      baseValue *= 1 + volatility;

      this.portfolioHistory.push({
        timestamp,
        value: parseFloat(baseValue.toFixed(2)),
      });
    }
  }

  /**
   * Compare portfolio against benchmarks
   */
  comparePortfolio(portfolioValue: number): PortfolioComparison {
    const currentValue = portfolioValue;
    const startValue = this.portfolioHistory[0].value;
    const value24hAgo = this.getValueAtTime(Date.now() - 24 * 60 * 60 * 1000);
    const value7dAgo = this.getValueAtTime(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const value30dAgo = this.getValueAtTime(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const portfolioChange24h = currentValue - value24hAgo;
    const portfolioChangePercent24h = (portfolioChange24h / value24hAgo) * 100;
    const portfolioChange7d = currentValue - value7dAgo;
    const portfolioChangePercent7d = (portfolioChange7d / value7dAgo) * 100;
    const portfolioChange30d = currentValue - value30dAgo;
    const portfolioChangePercent30d = (portfolioChange30d / value30dAgo) * 100;
    const portfolioChange1y = currentValue - startValue;
    const portfolioChangePercent1y = (portfolioChange1y / startValue) * 100;

    const benchmarks = Array.from(this.marketIndices.values())
      .map((index, ranking) => {
        const outperformance = portfolioChangePercent1y - index.changePercent1y;
        return {
          index,
          outperformance,
          outperformancePercent: outperformance,
          ranking: ranking + 1,
        };
      })
      .sort((a, b) => b.outperformance - a.outperformance);

    let performanceRating: 'excellent' | 'good' | 'average' | 'poor' = 'average';
    if (portfolioChangePercent1y > 50) performanceRating = 'excellent';
    else if (portfolioChangePercent1y > 25) performanceRating = 'good';
    else if (portfolioChangePercent1y < 0) performanceRating = 'poor';

    return {
      portfolioValue: currentValue,
      portfolioChange24h,
      portfolioChangePercent24h: parseFloat(portfolioChangePercent24h.toFixed(2)),
      portfolioChange7d,
      portfolioChangePercent7d: parseFloat(portfolioChangePercent7d.toFixed(2)),
      portfolioChange30d,
      portfolioChangePercent30d: parseFloat(portfolioChangePercent30d.toFixed(2)),
      portfolioChange1y,
      portfolioChangePercent1y: parseFloat(portfolioChangePercent1y.toFixed(2)),
      benchmarks,
      performanceRating,
    };
  }

  /**
   * Get portfolio value at specific time
   */
  private getValueAtTime(timestamp: number): number {
    for (let i = this.portfolioHistory.length - 1; i >= 0; i--) {
      if (this.portfolioHistory[i].timestamp <= timestamp) {
        return this.portfolioHistory[i].value;
      }
    }
    return this.portfolioHistory[0].value;
  }

  /**
   * Get benchmark comparison
   */
  getBenchmarkComparison(period: '24h' | '7d' | '30d' | '1y', portfolioReturn: number): BenchmarkComparison {
    const sp500 = this.marketIndices.get('SP500')!;
    const crypto = this.marketIndices.get('CRYPTO')!;
    const nasdaq = this.marketIndices.get('NASDAQ')!;

    const returnMap = {
      '24h': { sp500: sp500.changePercent24h, crypto: crypto.changePercent24h, nasdaq: nasdaq.changePercent24h },
      '7d': { sp500: sp500.changePercent7d, crypto: crypto.changePercent7d, nasdaq: nasdaq.changePercent7d },
      '30d': { sp500: sp500.changePercent30d, crypto: crypto.changePercent30d, nasdaq: nasdaq.changePercent30d },
      '1y': { sp500: sp500.changePercent1y, crypto: crypto.changePercent1y, nasdaq: nasdaq.changePercent1y },
    };

    const returns = returnMap[period];
    const allReturns = [
      { name: 'Portfolio', value: portfolioReturn },
      { name: 'S&P 500', value: returns.sp500 },
      { name: 'Crypto Market', value: returns.crypto },
      { name: 'NASDAQ', value: returns.nasdaq },
    ];

    const sorted = allReturns.sort((a, b) => b.value - a.value);

    return {
      period,
      portfolioReturn,
      sp500Return: returns.sp500,
      cryptoMarketReturn: returns.crypto,
      nasdaqReturn: returns.nasdaq,
      bestPerformer: sorted[0].name,
      worstPerformer: sorted[sorted.length - 1].name,
    };
  }

  /**
   * Get correlation with market indices
   */
  getCorrelation(portfolioReturns: number[]): Record<string, number> {
    const sp500 = this.marketIndices.get('SP500')!;
    const crypto = this.marketIndices.get('CRYPTO')!;
    const nasdaq = this.marketIndices.get('NASDAQ')!;

    // Simplified correlation calculation
    const correlations: Record<string, number> = {
      'S&P 500': 0.65,
      'Crypto Market': 0.82,
      'NASDAQ': 0.72,
      'US Dollar': -0.15,
    };

    return correlations;
  }

  /**
   * Get performance percentile
   */
  getPerformancePercentile(portfolioReturn: number): {
    percentile: number;
    description: string;
  } {
    const sp500 = this.marketIndices.get('SP500')!.changePercent1y;
    const crypto = this.marketIndices.get('CRYPTO')!.changePercent1y;
    const nasdaq = this.marketIndices.get('NASDAQ')!.changePercent1y;

    const benchmarks = [sp500, crypto, nasdaq];
    const betterThan = benchmarks.filter(b => portfolioReturn > b).length;
    const percentile = (betterThan / benchmarks.length) * 100;

    let description = 'Below Average';
    if (percentile >= 75) description = 'Excellent - Top Performer';
    else if (percentile >= 50) description = 'Good - Above Average';
    else if (percentile >= 25) description = 'Average';

    return {
      percentile: parseFloat(percentile.toFixed(0)),
      description,
    };
  }

  /**
   * Get market indices
   */
  getMarketIndices(): MarketIndex[] {
    return Array.from(this.marketIndices.values());
  }

  /**
   * Get specific index
   */
  getIndex(symbol: string): MarketIndex | undefined {
    return this.marketIndices.get(symbol);
  }
}

export const portfolioComparisonService = new PortfolioComparisonService();
