/**
 * Risk Management Dashboard Service
 * VaR, Sharpe ratio, diversification, rebalancing recommendations
 */

export interface PortfolioRisk {
  portfolioValue: number;
  valueAtRisk: number; // VaR at 95% confidence
  expectedShortfall: number; // CVaR
  volatility: number;
  sharpeRatio: number;
  sortino Ratio: number;
  maxDrawdown: number;
  beta: number;
}

export interface DiversificationAnalysis {
  assetCount: number;
  herfindahlIndex: number; // 0-1, lower is better
  diversificationScore: number; // 0-100
  concentration: {
    top1: number;
    top3: number;
    top5: number;
  };
  recommendation: 'well_diversified' | 'moderately_diversified' | 'concentrated';
}

export interface RebalancingRecommendation {
  assetId: string;
  assetSymbol: string;
  currentAllocation: number;
  targetAllocation: number;
  action: 'buy' | 'sell' | 'hold';
  amount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RiskMetrics {
  timestamp: number;
  portfolioValue: number;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  riskScore: number; // 0-100
  alerts: Array<{
    type: 'concentration' | 'volatility' | 'drawdown' | 'correlation';
    severity: 'warning' | 'critical';
    message: string;
  }>;
}

class RiskManagementService {
  /**
   * Calculate Value at Risk (VaR)
   */
  calculateVaR(returns: number[], confidence: number = 0.95): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (1 - confidence));
    return Math.abs(sorted[index]);
  }

  /**
   * Calculate Conditional Value at Risk (CVaR)
   */
  calculateCVaR(returns: number[], confidence: number = 0.95): number {
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (1 - confidence));
    const tail = sorted.slice(0, index + 1);
    return Math.abs(tail.reduce((a, b) => a + b) / tail.length);
  }

  /**
   * Calculate portfolio volatility
   */
  calculateVolatility(returns: number[]): number {
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  /**
   * Calculate Sharpe Ratio
   */
  calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const volatility = this.calculateVolatility(returns);

    if (volatility === 0) return 0;

    return (mean * 252 - riskFreeRate) / volatility;
  }

  /**
   * Calculate Sortino Ratio
   */
  calculateSortinoRatio(returns: number[], riskFreeRate: number = 0.02): number {
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const downside = returns
      .filter(r => r < 0)
      .reduce((a, b) => a + Math.pow(b, 2), 0) / returns.length;

    const downsideDeviation = Math.sqrt(downside) * Math.sqrt(252);

    if (downsideDeviation === 0) return 0;

    return (mean * 252 - riskFreeRate) / downsideDeviation;
  }

  /**
   * Calculate maximum drawdown
   */
  calculateMaxDrawdown(prices: number[]): number {
    let maxPrice = prices[0];
    let maxDrawdown = 0;

    for (const price of prices) {
      if (price > maxPrice) {
        maxPrice = price;
      }

      const drawdown = (maxPrice - price) / maxPrice;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  /**
   * Analyze diversification
   */
  analyzeDiversification(holdings: Array<{ value: number }>): DiversificationAnalysis {
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const weights = holdings.map(h => h.value / totalValue);

    // Herfindahl Index
    const herfindahlIndex = weights.reduce((sum, w) => sum + Math.pow(w, 2), 0);

    // Diversification Score (0-100)
    const diversificationScore = Math.max(0, Math.min(100, (1 - herfindahlIndex) * 100));

    // Concentration
    const sorted = [...weights].sort((a, b) => b - a);
    const concentration = {
      top1: sorted[0] * 100,
      top3: (sorted[0] + (sorted[1] || 0) + (sorted[2] || 0)) * 100,
      top5: sorted.slice(0, 5).reduce((a, b) => a + b, 0) * 100,
    };

    // Recommendation
    let recommendation: 'well_diversified' | 'moderately_diversified' | 'concentrated';
    if (diversificationScore > 75) {
      recommendation = 'well_diversified';
    } else if (diversificationScore > 50) {
      recommendation = 'moderately_diversified';
    } else {
      recommendation = 'concentrated';
    }

    return {
      assetCount: holdings.length,
      herfindahlIndex,
      diversificationScore,
      concentration,
      recommendation,
    };
  }

  /**
   * Generate rebalancing recommendations
   */
  generateRebalancingRecommendations(
    holdings: Array<{ assetId: string; assetSymbol: string; value: number }>,
    targetAllocations: Record<string, number>
  ): RebalancingRecommendation[] {
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const recommendations: RebalancingRecommendation[] = [];

    for (const holding of holdings) {
      const currentAllocation = (holding.value / totalValue) * 100;
      const targetAllocation = targetAllocations[holding.assetId] || 0;
      const difference = targetAllocation - currentAllocation;

      if (Math.abs(difference) > 2) {
        // Threshold of 2%
        const amount = (Math.abs(difference) / 100) * totalValue;
        const action = difference > 0 ? 'buy' : 'sell';
        const priority = Math.abs(difference) > 10 ? 'high' : Math.abs(difference) > 5 ? 'medium' : 'low';

        recommendations.push({
          assetId: holding.assetId,
          assetSymbol: holding.assetSymbol,
          currentAllocation,
          targetAllocation,
          action,
          amount,
          reason: `Current allocation ${currentAllocation.toFixed(1)}% vs target ${targetAllocation.toFixed(1)}%`,
          priority,
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Calculate portfolio risk metrics
   */
  calculatePortfolioRisk(
    holdings: Array<{ value: number }>,
    returns: number[],
    benchmarkReturns: number[]
  ): PortfolioRisk {
    const portfolioValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const volatility = this.calculateVolatility(returns);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns.map((r, i) => portfolioValue * (1 + r)));

    // Calculate beta
    const covariance = this.calculateCovariance(returns, benchmarkReturns);
    const benchmarkVariance = this.calculateVariance(benchmarkReturns);
    const beta = covariance / benchmarkVariance;

    const var95 = this.calculateVaR(returns, 0.95) * portfolioValue;
    const cvar95 = this.calculateCVaR(returns, 0.95) * portfolioValue;

    return {
      portfolioValue,
      valueAtRisk: var95,
      expectedShortfall: cvar95,
      volatility,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      beta,
    };
  }

  /**
   * Generate risk alerts
   */
  generateRiskAlerts(
    portfolioRisk: PortfolioRisk,
    diversification: DiversificationAnalysis
  ): RiskMetrics['alerts'] {
    const alerts: RiskMetrics['alerts'] = [];

    // Concentration alert
    if (diversification.recommendation === 'concentrated') {
      alerts.push({
        type: 'concentration',
        severity: 'warning',
        message: `Portfolio is concentrated. Top asset: ${diversification.concentration.top1.toFixed(1)}%`,
      });
    }

    // Volatility alert
    if (portfolioRisk.volatility > 0.3) {
      alerts.push({
        type: 'volatility',
        severity: 'critical',
        message: `High volatility: ${(portfolioRisk.volatility * 100).toFixed(1)}%`,
      });
    }

    // Drawdown alert
    if (portfolioRisk.maxDrawdown > 0.2) {
      alerts.push({
        type: 'drawdown',
        severity: 'warning',
        message: `Max drawdown: ${(portfolioRisk.maxDrawdown * 100).toFixed(1)}%`,
      });
    }

    // Sharpe ratio alert
    if (portfolioRisk.sharpeRatio < 0) {
      alerts.push({
        type: 'correlation',
        severity: 'critical',
        message: 'Negative Sharpe ratio - risk-adjusted returns are poor',
      });
    }

    return alerts;
  }

  /**
   * Calculate covariance
   */
  private calculateCovariance(x: number[], y: number[]): number {
    const meanX = x.reduce((a, b) => a + b) / x.length;
    const meanY = y.reduce((a, b) => a + b) / y.length;

    let covariance = 0;
    for (let i = 0; i < x.length; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }

    return covariance / x.length;
  }

  /**
   * Calculate variance
   */
  private calculateVariance(data: number[]): number {
    const mean = data.reduce((a, b) => a + b) / data.length;
    return data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
  }
}

export const riskManagementService = new RiskManagementService();
