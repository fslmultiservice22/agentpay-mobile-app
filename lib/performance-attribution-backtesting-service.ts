/**
 * Performance Attribution & Backtesting Engine Service
 * Detailed performance analysis and strategy backtesting
 */

export interface PerformanceAttribution {
  id: string;
  portfolioId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  startDate: number;
  endDate: number;
  totalReturn: number;
  totalReturnPercent: number;
  attributionByAsset: AssetAttribution[];
  attributionByTrade: TradeAttribution[];
  topContributors: AssetAttribution[];
  topDetractors: AssetAttribution[];
  createdAt: number;
}

export interface AssetAttribution {
  assetId: string;
  symbol: string;
  allocation: number;
  return: number;
  returnPercent: number;
  contribution: number;
  contributionPercent: number;
  trades: number;
}

export interface TradeAttribution {
  tradeId: string;
  assetId: string;
  symbol: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  return: number;
  returnPercent: number;
  contribution: number;
  contributionPercent: number;
  duration: number;
  date: number;
}

export interface BacktestStrategy {
  id: string;
  name: string;
  description: string;
  type: 'dca' | 'momentum' | 'mean-reversion' | 'grid-trading' | 'custom';
  parameters: Record<string, any>;
  startDate: number;
  endDate: number;
  initialCapital: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
}

export interface BacktestResult {
  id: string;
  strategyId: string;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  trades: BacktestTrade[];
  monthlyReturns: MonthlyReturn[];
  drawdownPeriods: DrawdownPeriod[];
  createdAt: number;
}

export interface BacktestTrade {
  id: string;
  symbol: string;
  entryDate: number;
  exitDate: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  return: number;
  returnPercent: number;
  isWin: boolean;
}

export interface MonthlyReturn {
  month: number;
  year: number;
  return: number;
  returnPercent: number;
}

export interface DrawdownPeriod {
  startDate: number;
  endDate: number;
  duration: number;
  drawdown: number;
  drawdownPercent: number;
}

class PerformanceAttributionBacktestingService {
  private attributions: Map<string, PerformanceAttribution> = new Map();
  private backtestStrategies: Map<string, BacktestStrategy> = new Map();
  private backtestResults: Map<string, BacktestResult> = new Map();

  /**
   * Calculate performance attribution
   */
  calculatePerformanceAttribution(
    portfolioId: string,
    assets: Array<{ id: string; symbol: string; allocation: number; return: number }>,
    trades: Array<{ id: string; assetId: string; symbol: string; return: number; contribution: number }>,
    period: PerformanceAttribution['period'] = 'monthly',
    startDate: number = Date.now() - 30 * 24 * 60 * 60 * 1000,
    endDate: number = Date.now()
  ): PerformanceAttribution {
    const attributionId = `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const assetAttributions: AssetAttribution[] = assets.map(asset => ({
      assetId: asset.id,
      symbol: asset.symbol,
      allocation: asset.allocation,
      return: asset.return,
      returnPercent: (asset.return / asset.allocation) * 100,
      contribution: asset.allocation * (asset.return / 100),
      contributionPercent: 0, // Will be calculated
      trades: trades.filter(t => t.assetId === asset.id).length,
    }));

    const tradeAttributions: TradeAttribution[] = trades.map(trade => ({
      tradeId: trade.id,
      assetId: trade.assetId,
      symbol: trade.symbol,
      entryPrice: 100, // Mock value
      exitPrice: 100 * (1 + trade.return / 100),
      quantity: 1,
      return: trade.return,
      returnPercent: trade.return,
      contribution: trade.contribution,
      contributionPercent: 0, // Will be calculated
      duration: 0,
      date: Date.now(),
    }));

    const totalReturn = assetAttributions.reduce((sum, a) => sum + a.contribution, 0);
    const totalReturnPercent = (totalReturn / 100) * 100; // Assuming 100 base capital

    // Calculate contribution percentages
    assetAttributions.forEach(a => {
      a.contributionPercent = totalReturn !== 0 ? (a.contribution / totalReturn) * 100 : 0;
    });

    tradeAttributions.forEach(t => {
      t.contributionPercent = totalReturn !== 0 ? (t.contribution / totalReturn) * 100 : 0;
    });

    const topContributors = [...assetAttributions].sort((a, b) => b.contribution - a.contribution).slice(0, 5);
    const topDetractors = [...assetAttributions].sort((a, b) => a.contribution - b.contribution).slice(0, 5);

    const attribution: PerformanceAttribution = {
      id: attributionId,
      portfolioId,
      period,
      startDate,
      endDate,
      totalReturn,
      totalReturnPercent,
      attributionByAsset: assetAttributions,
      attributionByTrade: tradeAttributions,
      topContributors,
      topDetractors,
      createdAt: Date.now(),
    };

    this.attributions.set(attributionId, attribution);

    return attribution;
  }

  /**
   * Get performance attribution
   */
  getPerformanceAttribution(attributionId: string): PerformanceAttribution | undefined {
    return this.attributions.get(attributionId);
  }

  /**
   * Create backtest strategy
   */
  createBacktestStrategy(
    name: string,
    type: BacktestStrategy['type'],
    parameters: Record<string, any>,
    startDate: number,
    endDate: number,
    initialCapital: number = 10000
  ): BacktestStrategy {
    const strategyId = `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const strategy: BacktestStrategy = {
      id: strategyId,
      name,
      description: `${type} strategy with parameters: ${JSON.stringify(parameters)}`,
      type,
      parameters,
      startDate,
      endDate,
      initialCapital,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.backtestStrategies.set(strategyId, strategy);

    return strategy;
  }

  /**
   * Run backtest
   */
  runBacktest(strategyId: string): BacktestResult | null {
    const strategy = this.backtestStrategies.get(strategyId);
    if (!strategy) return null;

    strategy.status = 'running';

    // Simulate backtest execution
    const trades: BacktestTrade[] = this.generateMockTrades(strategy);
    const monthlyReturns: MonthlyReturn[] = this.calculateMonthlyReturns(trades, strategy);
    const drawdownPeriods: DrawdownPeriod[] = this.calculateDrawdownPeriods(monthlyReturns);

    const totalReturn = trades.reduce((sum, t) => sum + t.return, 0);
    const totalReturnPercent = (totalReturn / strategy.initialCapital) * 100;
    const annualizedReturn = this.calculateAnnualizedReturn(totalReturnPercent, strategy.startDate, strategy.endDate);
    const sharpeRatio = this.calculateSharpeRatio(monthlyReturns);
    const sortinoRatio = this.calculateSortinoRatio(monthlyReturns);
    const maxDrawdown = Math.min(...drawdownPeriods.map(d => d.drawdownPercent));
    const winRate = (trades.filter(t => t.isWin).length / trades.length) * 100;
    const profitFactor = this.calculateProfitFactor(trades);

    const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result: BacktestResult = {
      id: resultId,
      strategyId,
      totalReturn,
      totalReturnPercent,
      annualizedReturn,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      trades,
      monthlyReturns,
      drawdownPeriods,
      createdAt: Date.now(),
    };

    this.backtestResults.set(resultId, result);

    strategy.status = 'completed';

    return result;
  }

  /**
   * Generate mock trades
   */
  private generateMockTrades(strategy: BacktestStrategy): BacktestTrade[] {
    const trades: BacktestTrade[] = [];
    const tradeCount = Math.floor(Math.random() * 50) + 10;

    for (let i = 0; i < tradeCount; i++) {
      const entryDate = strategy.startDate + Math.random() * (strategy.endDate - strategy.startDate);
      const exitDate = entryDate + Math.random() * (strategy.endDate - entryDate);
      const returnPercent = (Math.random() - 0.4) * 10; // Biased towards positive returns

      trades.push({
        id: `trade_${i}`,
        symbol: ['BTC', 'ETH', 'USDC'][Math.floor(Math.random() * 3)],
        entryDate: Math.floor(entryDate),
        exitDate: Math.floor(exitDate),
        entryPrice: 100,
        exitPrice: 100 * (1 + returnPercent / 100),
        quantity: Math.floor(Math.random() * 10) + 1,
        return: (strategy.initialCapital / tradeCount) * (returnPercent / 100),
        returnPercent,
        isWin: returnPercent > 0,
      });
    }

    return trades;
  }

  /**
   * Calculate monthly returns
   */
  private calculateMonthlyReturns(trades: BacktestTrade[], strategy: BacktestStrategy): MonthlyReturn[] {
    const monthlyReturns: MonthlyReturn[] = [];
    const monthMap: Record<string, number> = {};

    trades.forEach(trade => {
      const date = new Date(trade.exitDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      monthMap[key] = (monthMap[key] || 0) + trade.return;
    });

    for (const [key, return_] of Object.entries(monthMap)) {
      const [year, month] = key.split('-').map(Number);
      monthlyReturns.push({
        month,
        year,
        return: return_,
        returnPercent: (return_ / strategy.initialCapital) * 100,
      });
    }

    return monthlyReturns.sort((a, b) => a.year - b.year || a.month - b.month);
  }

  /**
   * Calculate drawdown periods
   */
  private calculateDrawdownPeriods(monthlyReturns: MonthlyReturn[]): DrawdownPeriod[] {
    const drawdownPeriods: DrawdownPeriod[] = [];
    let peak = 0;
    let peakDate = 0;

    monthlyReturns.forEach((mr, index) => {
      const cumulative = monthlyReturns.slice(0, index + 1).reduce((sum, m) => sum + m.returnPercent, 0);

      if (cumulative > peak) {
        peak = cumulative;
        peakDate = index;
      }

      const drawdown = peak - cumulative;
      if (drawdown > 0) {
        drawdownPeriods.push({
          startDate: peakDate,
          endDate: index,
          duration: index - peakDate,
          drawdown,
          drawdownPercent: (drawdown / peak) * 100,
        });
      }
    });

    return drawdownPeriods;
  }

  /**
   * Calculate annualized return
   */
  private calculateAnnualizedReturn(totalReturnPercent: number, startDate: number, endDate: number): number {
    const years = (endDate - startDate) / (365 * 24 * 60 * 60 * 1000);
    return Math.pow(1 + totalReturnPercent / 100, 1 / years) - 1;
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(monthlyReturns: MonthlyReturn[], riskFreeRate: number = 0.02): number {
    if (monthlyReturns.length === 0) return 0;

    const avgReturn = monthlyReturns.reduce((sum, m) => sum + m.returnPercent, 0) / monthlyReturns.length;
    const variance = monthlyReturns.reduce((sum, m) => sum + Math.pow(m.returnPercent - avgReturn, 2), 0) / monthlyReturns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev === 0 ? 0 : (avgReturn - riskFreeRate) / stdDev;
  }

  /**
   * Calculate Sortino ratio
   */
  private calculateSortinoRatio(monthlyReturns: MonthlyReturn[], riskFreeRate: number = 0.02): number {
    if (monthlyReturns.length === 0) return 0;

    const avgReturn = monthlyReturns.reduce((sum, m) => sum + m.returnPercent, 0) / monthlyReturns.length;
    const downside = monthlyReturns.filter(m => m.returnPercent < 0).map(m => Math.pow(m.returnPercent, 2));
    const downvariance = downside.length > 0 ? downside.reduce((sum, d) => sum + d, 0) / downside.length : 0;
    const downstdDev = Math.sqrt(downvariance);

    return downstdDev === 0 ? 0 : (avgReturn - riskFreeRate) / downstdDev;
  }

  /**
   * Calculate profit factor
   */
  private calculateProfitFactor(trades: BacktestTrade[]): number {
    const wins = trades.filter(t => t.isWin).reduce((sum, t) => sum + t.return, 0);
    const losses = Math.abs(trades.filter(t => !t.isWin).reduce((sum, t) => sum + t.return, 0));

    return losses === 0 ? (wins > 0 ? Infinity : 0) : wins / losses;
  }

  /**
   * Get backtest result
   */
  getBacktestResult(resultId: string): BacktestResult | undefined {
    return this.backtestResults.get(resultId);
  }

  /**
   * Get backtest results for strategy
   */
  getBacktestResultsForStrategy(strategyId: string): BacktestResult[] {
    return Array.from(this.backtestResults.values()).filter(r => r.strategyId === strategyId);
  }

  /**
   * Compare strategies
   */
  compareStrategies(resultIds: string[]): Record<string, any> {
    const results = resultIds.map(id => this.backtestResults.get(id)).filter(Boolean) as BacktestResult[];

    if (results.length === 0) return {};

    return {
      strategies: results.map(r => ({
        id: r.id,
        totalReturn: r.totalReturn,
        totalReturnPercent: r.totalReturnPercent,
        sharpeRatio: r.sharpeRatio,
        sortinoRatio: r.sortinoRatio,
        maxDrawdown: r.maxDrawdown,
        winRate: r.winRate,
        profitFactor: r.profitFactor,
      })),
      bestByReturn: results.reduce((best, r) => (r.totalReturnPercent > best.totalReturnPercent ? r : best)),
      bestBySharpeRatio: results.reduce((best, r) => (r.sharpeRatio > best.sharpeRatio ? r : best)),
      bestByWinRate: results.reduce((best, r) => (r.winRate > best.winRate ? r : best)),
    };
  }
}

export const performanceAttributionBacktestingService = new PerformanceAttributionBacktestingService();
