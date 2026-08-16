/**
 * Portfolio Tracking Service
 * Tracks portfolio value and performance over time
 */

export interface PortfolioSnapshot {
  id: string;
  address: string;
  timestamp: number;
  totalValue: string;
  totalValueUsd: string;
  holdings: Array<{
    token: string;
    symbol: string;
    amount: string;
    value: string;
    valueUsd: string;
    percentage: number;
  }>;
  gainLoss: string;
  gainLossPercentage: number;
  dayChange: string;
  dayChangePercentage: number;
}

export interface PortfolioPerformance {
  address: string;
  startDate: number;
  endDate: number;
  startValue: string;
  endValue: string;
  totalGain: string;
  totalGainPercentage: number;
  highestValue: string;
  lowestValue: string;
  averageValue: string;
  volatility: number;
  sharpeRatio: number;
}

export interface AllocationTarget {
  token: string;
  symbol: string;
  targetPercentage: number;
  currentPercentage: number;
  difference: number;
  action: 'buy' | 'sell' | 'hold';
}

class PortfolioTrackingService {
  private snapshots: Map<string, PortfolioSnapshot[]> = new Map();
  private targets: Map<string, AllocationTarget[]> = new Map();

  /**
   * Record portfolio snapshot
   */
  recordSnapshot(
    address: string,
    totalValue: string,
    holdings: any[]
  ): PortfolioSnapshot {
    const snapshot: PortfolioSnapshot = {
      id: `snap_${Date.now()}`,
      address,
      timestamp: Date.now(),
      totalValue,
      totalValueUsd: (parseFloat(totalValue) * 2500).toString(),
      holdings: holdings.map(h => ({
        token: h.token,
        symbol: h.symbol,
        amount: h.amount,
        value: h.value,
        valueUsd: (parseFloat(h.value) * 2500).toString(),
        percentage:
          parseFloat(totalValue) > 0
            ? (parseFloat(h.value) / parseFloat(totalValue)) * 100
            : 0,
      })),
      gainLoss: '0',
      gainLossPercentage: 0,
      dayChange: '0',
      dayChangePercentage: 0,
    };

    if (!this.snapshots.has(address)) {
      this.snapshots.set(address, []);
    }

    this.snapshots.get(address)?.push(snapshot);
    return snapshot;
  }

  /**
   * Get portfolio history
   */
  getPortfolioHistory(address: string): PortfolioSnapshot[] {
    return this.snapshots.get(address) || [];
  }

  /**
   * Get current portfolio
   */
  getCurrentPortfolio(address: string): PortfolioSnapshot | undefined {
    const history = this.getPortfolioHistory(address);
    return history.length > 0 ? history[history.length - 1] : undefined;
  }

  /**
   * Calculate portfolio performance
   */
  calculatePerformance(address: string): PortfolioPerformance | null {
    const history = this.getPortfolioHistory(address);
    
    if (history.length < 2) {
      return null;
    }

    const values = history.map(s => parseFloat(s.totalValue));
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const totalGain = endValue - startValue;
    const totalGainPercentage = (totalGain / startValue) * 100;

    const highestValue = Math.max(...values);
    const lowestValue = Math.min(...values);
    const averageValue = values.reduce((a, b) => a + b, 0) / values.length;

    // Calculate volatility (standard deviation)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - averageValue, 2), 0) / values.length;
    const volatility = Math.sqrt(variance);

    // Calculate Sharpe Ratio (simplified)
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i - 1]) / values[i - 1]);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const returnVariance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const sharpeRatio = avgReturn / Math.sqrt(returnVariance);

    return {
      address,
      startDate: history[0].timestamp,
      endDate: history[history.length - 1].timestamp,
      startValue: startValue.toString(),
      endValue: endValue.toString(),
      totalGain: totalGain.toString(),
      totalGainPercentage: parseFloat(totalGainPercentage.toFixed(2)),
      highestValue: highestValue.toString(),
      lowestValue: lowestValue.toString(),
      averageValue: averageValue.toString(),
      volatility: parseFloat(volatility.toFixed(4)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
    };
  }

  /**
   * Set allocation targets
   */
  setAllocationTargets(address: string, targets: any[]): void {
    const current = this.getCurrentPortfolio(address);
    
    if (!current) {
      return;
    }

    const allocationTargets: AllocationTarget[] = targets.map(target => {
      const currentHolding = current.holdings.find(h => h.symbol === target.symbol);
      const currentPercentage = currentHolding?.percentage || 0;
      const difference = target.targetPercentage - currentPercentage;

      return {
        token: target.token,
        symbol: target.symbol,
        targetPercentage: target.targetPercentage,
        currentPercentage,
        difference,
        action: difference > 1 ? 'buy' : difference < -1 ? 'sell' : 'hold',
      };
    });

    this.targets.set(address, allocationTargets);
  }

  /**
   * Get allocation targets
   */
  getAllocationTargets(address: string): AllocationTarget[] {
    return this.targets.get(address) || [];
  }

  /**
   * Get rebalancing suggestions
   */
  getRebalancingSuggestions(address: string): Array<{
    symbol: string;
    action: string;
    currentAmount: string;
    targetAmount: string;
    difference: string;
  }> {
    const targets = this.getAllocationTargets(address);
    const current = this.getCurrentPortfolio(address);

    if (!current) {
      return [];
    }

    return targets
      .filter(t => t.action !== 'hold')
      .map(t => {
        const totalValue = parseFloat(current.totalValue);
        const targetValue = (t.targetPercentage / 100) * totalValue;
        const currentHolding = current.holdings.find(h => h.symbol === t.symbol);
        const currentValue = currentHolding ? parseFloat(currentHolding.value) : 0;
        const difference = targetValue - currentValue;

        return {
          symbol: t.symbol,
          action: t.action === 'buy' ? 'BUY' : 'SELL',
          currentAmount: currentValue.toString(),
          targetAmount: targetValue.toString(),
          difference: difference.toString(),
        };
      });
  }

  /**
   * Calculate portfolio statistics
   */
  getPortfolioStats(address: string): {
    totalValue: string;
    dayChange: string;
    dayChangePercentage: number;
    weekChange: string;
    monthChange: string;
    topHolding: string;
    diversification: number;
  } {
    const current = this.getCurrentPortfolio(address);
    
    if (!current) {
      return {
        totalValue: '0',
        dayChange: '0',
        dayChangePercentage: 0,
        weekChange: '0',
        monthChange: '0',
        topHolding: '',
        diversification: 0,
      };
    }

    const history = this.getPortfolioHistory(address);
    const dayAgoSnapshot = history.find(s => s.timestamp >= Date.now() - 86400000);
    const dayChange = dayAgoSnapshot 
      ? (parseFloat(current.totalValue) - parseFloat(dayAgoSnapshot.totalValue)).toString()
      : '0';
    const dayChangePercentage = dayAgoSnapshot
      ? ((parseFloat(dayChange) / parseFloat(dayAgoSnapshot.totalValue)) * 100)
      : 0;

    const topHolding = current.holdings.length > 0
      ? current.holdings.reduce((max, h) => (h.percentage > max.percentage ? h : max)).symbol
      : '';

    // Calculate Herfindahl index for diversification (0-1, lower is more diversified)
    const herfindahl = current.holdings.reduce((sum, h) => {
      const pct = h.percentage / 100;
      return sum + (pct * pct);
    }, 0);
    const diversification = 1 - herfindahl;

    return {
      totalValue: current.totalValue,
      dayChange,
      dayChangePercentage: parseFloat(dayChangePercentage.toFixed(2)),
      weekChange: '0',
      monthChange: '0',
      topHolding,
      diversification: parseFloat(diversification.toFixed(2)),
    };
  }

  /**
   * Export portfolio snapshot to CSV
   */
  exportToCSV(address: string): string {
    const current = this.getCurrentPortfolio(address);
    
    if (!current) {
      return '';
    }

    const headers = ['Token', 'Symbol', 'Amount', 'Value (ETH)', 'Value (USD)', 'Percentage'];
    const rows = current.holdings.map(h => [
      h.token,
      h.symbol,
      h.amount,
      h.value,
      h.valueUsd,
      h.percentage.toFixed(2) + '%',
    ]);

    const summary = [
      ['', '', '', '', '', ''],
      ['Total Value (ETH)', '', '', current.totalValue, '', ''],
      ['Total Value (USD)', '', '', '', current.totalValueUsd, ''],
      ['Day Change', '', '', current.dayChange, '', current.dayChangePercentage.toFixed(2) + '%'],
    ];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      ...summary.map(row => row.join(',')),
    ].join('\n');

    return csv;
  }
}

export const portfolioTrackingService = new PortfolioTrackingService();
