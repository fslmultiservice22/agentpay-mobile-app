/**
 * Portfolio Analytics Service
 * Calculates and tracks portfolio statistics and trends
 */

export interface PortfolioSnapshot {
  timestamp: number;
  totalValue: number;
  changePercent: number;
  changeAmount: number;
  holdings: Record<string, number>; // symbol -> amount
}

export interface PortfolioTrend {
  timestamps: number[];
  values: number[];
  changes: number[];
  changePercents: number[];
}

export interface PortfolioStats {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  bestPerformer: { symbol: string; change: number; changePercent: number } | null;
  worstPerformer: { symbol: string; change: number; changePercent: number } | null;
  averageHolding: number;
  diversification: number; // 0-1, higher = more diversified
  volatility: number;
}

export interface AnalyticsConfig {
  snapshotInterval: number; // in milliseconds
  maxSnapshots: number;
  calculateVolatility: boolean;
}

class PortfolioAnalyticsService {
  private config: AnalyticsConfig = {
    snapshotInterval: 60000, // 1 minute
    maxSnapshots: 1440, // 24 hours of 1-minute snapshots
    calculateVolatility: true,
  };

  private snapshots: PortfolioSnapshot[] = [];
  private currentPortfolio: Record<string, number> = {};
  private snapshotTimer: NodeJS.Timeout | null = null;
  private listeners: ((stats: PortfolioStats) => void)[] = [];

  /**
   * Initialize analytics service
   */
  public init(): void {
    console.log('[Analytics] Service initialized');
  }

  /**
   * Update portfolio holdings
   */
  public updatePortfolio(holdings: Record<string, number>, prices: Record<string, number>): void {
    this.currentPortfolio = holdings;
    const snapshot = this.createSnapshot(holdings, prices);
    this.addSnapshot(snapshot);
    this.notifyListeners();
  }

  /**
   * Create a portfolio snapshot
   */
  private createSnapshot(
    holdings: Record<string, number>,
    prices: Record<string, number>
  ): PortfolioSnapshot {
    let totalValue = 0;
    Object.entries(holdings).forEach(([symbol, amount]) => {
      const price = prices[symbol] || 0;
      totalValue += amount * price;
    });

    const previousSnapshot = this.snapshots[this.snapshots.length - 1];
    const previousValue = previousSnapshot?.totalValue || totalValue;
    const changeAmount = totalValue - previousValue;
    const changePercent = previousValue > 0 ? (changeAmount / previousValue) * 100 : 0;

    return {
      timestamp: Date.now(),
      totalValue,
      changePercent,
      changeAmount,
      holdings: { ...holdings },
    };
  }

  /**
   * Add snapshot to history
   */
  private addSnapshot(snapshot: PortfolioSnapshot): void {
    this.snapshots.push(snapshot);

    // Keep only maxSnapshots
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }

    console.log('[Analytics] Snapshot added:', snapshot);
  }

  /**
   * Get portfolio statistics
   */
  public getStats(): PortfolioStats {
    if (this.snapshots.length === 0) {
      return {
        totalValue: 0,
        totalChange: 0,
        totalChangePercent: 0,
        bestPerformer: null,
        worstPerformer: null,
        averageHolding: 0,
        diversification: 0,
        volatility: 0,
      };
    }

    const latestSnapshot = this.snapshots[this.snapshots.length - 1];
    const firstSnapshot = this.snapshots[0];

    const totalChange = latestSnapshot.totalValue - firstSnapshot.totalValue;
    const totalChangePercent =
      firstSnapshot.totalValue > 0
        ? (totalChange / firstSnapshot.totalValue) * 100
        : 0;

    // Calculate best and worst performers
    let bestPerformer = null;
    let worstPerformer = null;

    const holdingChanges: Record<string, { change: number; changePercent: number }> = {};
    Object.keys(latestSnapshot.holdings).forEach((symbol) => {
      const firstAmount = firstSnapshot.holdings[symbol] || 0;
      const latestAmount = latestSnapshot.holdings[symbol] || 0;
      const change = latestAmount - firstAmount;
      const changePercent = firstAmount > 0 ? (change / firstAmount) * 100 : 0;

      holdingChanges[symbol] = { change, changePercent };
    });

    Object.entries(holdingChanges).forEach(([symbol, { change, changePercent }]) => {
      if (!bestPerformer || changePercent > bestPerformer.changePercent) {
        bestPerformer = { symbol, change, changePercent };
      }
      if (!worstPerformer || changePercent < worstPerformer.changePercent) {
        worstPerformer = { symbol, change, changePercent };
      }
    });

    // Calculate average holding
    const holdings = Object.values(latestSnapshot.holdings);
    const averageHolding = holdings.length > 0 ? holdings.reduce((a, b) => a + b, 0) / holdings.length : 0;

    // Calculate diversification (Herfindahl index)
    const totalHoldings = holdings.reduce((a, b) => a + b, 0);
    let diversification = 0;
    if (totalHoldings > 0) {
      const herfindahl = holdings.reduce((sum, holding) => {
        const share = holding / totalHoldings;
        return sum + share * share;
      }, 0);
      diversification = 1 - herfindahl; // Convert to 0-1 scale
    }

    // Calculate volatility
    let volatility = 0;
    if (this.config.calculateVolatility && this.snapshots.length > 1) {
      const changes = this.snapshots.map((s) => s.changePercent);
      const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
      const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
      volatility = Math.sqrt(variance);
    }

    return {
      totalValue: latestSnapshot.totalValue,
      totalChange,
      totalChangePercent,
      bestPerformer,
      worstPerformer,
      averageHolding,
      diversification,
      volatility,
    };
  }

  /**
   * Get portfolio trend
   */
  public getTrend(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): PortfolioTrend {
    const now = Date.now();
    const timeMs = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
    }[timeframe];

    const filteredSnapshots = this.snapshots.filter((s) => s.timestamp >= now - timeMs);

    return {
      timestamps: filteredSnapshots.map((s) => s.timestamp),
      values: filteredSnapshots.map((s) => s.totalValue),
      changes: filteredSnapshots.map((s) => s.changeAmount),
      changePercents: filteredSnapshots.map((s) => s.changePercent),
    };
  }

  /**
   * Get historical data for chart
   */
  public getChartData(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): {
    labels: string[];
    data: number[];
  } {
    const trend = this.getTrend(timeframe);
    const labels = trend.timestamps.map((ts) => {
      const date = new Date(ts);
      return date.toLocaleTimeString();
    });

    return {
      labels,
      data: trend.values,
    };
  }

  /**
   * Add listener for analytics updates
   */
  public addListener(listener: (stats: PortfolioStats) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach((listener) => {
      try {
        listener(stats);
      } catch (error) {
        console.error('[Analytics] Error in listener:', error);
      }
    });
  }

  /**
   * Get configuration
   */
  public getConfig(): AnalyticsConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Analytics] Config updated:', this.config);
  }

  /**
   * Get all snapshots
   */
  public getSnapshots(): PortfolioSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.snapshots = [];
    console.log('[Analytics] History cleared');
  }

  /**
   * Export data as CSV
   */
  public exportAsCSV(): string {
    const headers = ['Timestamp', 'Total Value', 'Change', 'Change %'];
    const rows = this.snapshots.map((s) => [
      new Date(s.timestamp).toISOString(),
      s.totalValue.toFixed(2),
      s.changeAmount.toFixed(2),
      s.changePercent.toFixed(2),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csv;
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }
    this.snapshots = [];
    this.listeners = [];
    console.log('[Analytics] Service cleaned up');
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): {
    roi: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  } {
    if (this.snapshots.length < 2) {
      return { roi: 0, sharpeRatio: 0, maxDrawdown: 0, winRate: 0 };
    }

    const firstValue = this.snapshots[0].totalValue;
    const lastValue = this.snapshots[this.snapshots.length - 1].totalValue;
    const roi = ((lastValue - firstValue) / firstValue) * 100;

    // Calculate Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < this.snapshots.length; i++) {
      const ret =
        ((this.snapshots[i].totalValue - this.snapshots[i - 1].totalValue) /
          this.snapshots[i - 1].totalValue) *
        100;
      returns.push(ret);
    }

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? meanReturn / stdDev : 0;

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = this.snapshots[0].totalValue;
    for (let i = 1; i < this.snapshots.length; i++) {
      const value = this.snapshots[i].totalValue;
      if (value > peak) {
        peak = value;
      }
      const drawdown = ((peak - value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Calculate win rate
    const winCount = returns.filter((ret) => ret > 0).length;
    const winRate = (winCount / returns.length) * 100;

    return {
      roi,
      sharpeRatio,
      maxDrawdown,
      winRate,
    };
  }
}

// Export singleton instance
export const portfolioAnalytics = new PortfolioAnalyticsService();

/**
 * Hook to use portfolio analytics in components
 */
export function usePortfolioAnalytics() {
  return portfolioAnalytics;
}
