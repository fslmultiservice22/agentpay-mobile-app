/**
 * DeFi Yield Optimizer Service
 * Intelligent yield aggregator with auto-switching
 */

export interface YieldOpportunity {
  id: string;
  protocol: string; // 'aave', 'compound', 'curve', 'yearn'
  asset: string;
  apy: number;
  tvl: number;
  riskScore: number; // 0-100
  gasEstimate: number;
  minDeposit: number;
  status: 'active' | 'paused' | 'deprecated';
}

export interface YieldPosition {
  id: string;
  userId: string;
  protocol: string;
  asset: string;
  amount: number;
  apy: number;
  earnedSoFar: number;
  depositedAt: number;
  lastRebalancedAt?: number;
}

export interface YieldOptimization {
  id: string;
  userId: string;
  fromProtocol: string;
  toProtocol: string;
  asset: string;
  amount: number;
  estimatedGasCost: number;
  estimatedAPYGain: number;
  paybackPeriod: number; // days
  status: 'pending' | 'executing' | 'completed' | 'failed';
  createdAt: number;
  executedAt?: number;
}

export interface YieldStrategy {
  id: string;
  userId: string;
  name: string;
  asset: string;
  targetAPY: number;
  maxRiskScore: number;
  autoRebalance: boolean;
  rebalanceFrequency: 'daily' | 'weekly' | 'monthly';
  minGainThreshold: number; // Minimum APY gain to trigger rebalancing
  status: 'active' | 'paused';
  createdAt: number;
}

export interface YieldComparison {
  asset: string;
  opportunities: Array<{
    protocol: string;
    apy: number;
    tvl: number;
    riskScore: number;
    gasEstimate: number;
  }>;
  bestOption: {
    protocol: string;
    apy: number;
    recommendation: string;
  };
}

class DeFiYieldOptimizerService {
  private opportunities: Map<string, YieldOpportunity> = new Map();
  private positions: Map<string, YieldPosition> = new Map();
  private optimizations: Map<string, YieldOptimization> = new Map();
  private strategies: Map<string, YieldStrategy> = new Map();

  constructor() {
    this.initializeOpportunities();
  }

  /**
   * Initialize yield opportunities
   */
  private initializeOpportunities(): void {
    const opportunities: YieldOpportunity[] = [
      {
        id: 'opp_aave_usdc',
        protocol: 'aave',
        asset: 'USDC',
        apy: 4.5,
        tvl: 5000000000,
        riskScore: 25,
        gasEstimate: 150,
        minDeposit: 100,
        status: 'active',
      },
      {
        id: 'opp_compound_usdc',
        protocol: 'compound',
        asset: 'USDC',
        apy: 4.2,
        tvl: 3000000000,
        riskScore: 30,
        gasEstimate: 140,
        minDeposit: 100,
        status: 'active',
      },
      {
        id: 'opp_curve_usdc',
        protocol: 'curve',
        asset: 'USDC',
        apy: 5.8,
        tvl: 2000000000,
        riskScore: 45,
        gasEstimate: 200,
        minDeposit: 100,
        status: 'active',
      },
      {
        id: 'opp_aave_eth',
        protocol: 'aave',
        asset: 'ETH',
        apy: 3.2,
        tvl: 1500000000,
        riskScore: 35,
        gasEstimate: 180,
        minDeposit: 0.1,
        status: 'active',
      },
      {
        id: 'opp_compound_eth',
        protocol: 'compound',
        asset: 'ETH',
        apy: 2.9,
        tvl: 1200000000,
        riskScore: 40,
        gasEstimate: 170,
        minDeposit: 0.1,
        status: 'active',
      },
      {
        id: 'opp_lido_eth',
        protocol: 'lido',
        asset: 'ETH',
        apy: 3.8,
        tvl: 8000000000,
        riskScore: 20,
        gasEstimate: 120,
        minDeposit: 0.01,
        status: 'active',
      },
    ];

    for (const opp of opportunities) {
      this.opportunities.set(opp.id, opp);
    }
  }

  /**
   * Get yield opportunities for asset
   */
  getYieldOpportunities(asset: string): YieldOpportunity[] {
    return Array.from(this.opportunities.values())
      .filter(o => o.asset === asset && o.status === 'active')
      .sort((a, b) => b.apy - a.apy);
  }

  /**
   * Compare yields
   */
  compareYields(asset: string): YieldComparison {
    const opportunities = this.getYieldOpportunities(asset);

    if (opportunities.length === 0) {
      throw new Error(`No yield opportunities found for ${asset}`);
    }

    const bestOption = opportunities[0];

    return {
      asset,
      opportunities: opportunities.map(o => ({
        protocol: o.protocol,
        apy: o.apy,
        tvl: o.tvl,
        riskScore: o.riskScore,
        gasEstimate: o.gasEstimate,
      })),
      bestOption: {
        protocol: bestOption.protocol,
        apy: bestOption.apy,
        recommendation: `${bestOption.protocol} offers the highest APY of ${bestOption.apy}% for ${asset}`,
      },
    };
  }

  /**
   * Create yield position
   */
  createPosition(userId: string, protocol: string, asset: string, amount: number): YieldPosition {
    const opportunity = Array.from(this.opportunities.values()).find(
      o => o.protocol === protocol && o.asset === asset
    );

    if (!opportunity) {
      throw new Error(`Opportunity not found for ${protocol} ${asset}`);
    }

    const position: YieldPosition = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      protocol,
      asset,
      amount,
      apy: opportunity.apy,
      earnedSoFar: 0,
      depositedAt: Date.now(),
    };

    this.positions.set(position.id, position);

    return position;
  }

  /**
   * Get user positions
   */
  getUserPositions(userId: string): YieldPosition[] {
    return Array.from(this.positions.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.depositedAt - a.depositedAt);
  }

  /**
   * Calculate earnings
   */
  calculateEarnings(positionId: string): number {
    const position = this.positions.get(positionId);
    if (!position) return 0;

    const daysHeld = (Date.now() - position.depositedAt) / (1000 * 60 * 60 * 24);
    const yearlyEarnings = (position.amount * position.apy) / 100;
    const earnings = (yearlyEarnings * daysHeld) / 365;

    return earnings;
  }

  /**
   * Analyze optimization opportunity
   */
  analyzeOptimization(userId: string, positionId: string): YieldOptimization | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const opportunities = this.getYieldOpportunities(position.asset);
    const bestOpportunity = opportunities.find(o => o.protocol !== position.protocol);

    if (!bestOpportunity) return null;

    const apyGain = bestOpportunity.apy - position.apy;
    const estimatedGasCost = bestOpportunity.gasEstimate;
    const yearlyGain = (position.amount * apyGain) / 100;
    const paybackPeriod = estimatedGasCost > 0 ? (estimatedGasCost / yearlyGain) * 365 : 0;

    // Only recommend if payback period is less than 30 days
    if (paybackPeriod > 30 || apyGain < 0.5) {
      return null;
    }

    const optimization: YieldOptimization = {
      id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      fromProtocol: position.protocol,
      toProtocol: bestOpportunity.protocol,
      asset: position.asset,
      amount: position.amount,
      estimatedGasCost,
      estimatedAPYGain: apyGain,
      paybackPeriod,
      status: 'pending',
      createdAt: Date.now(),
    };

    return optimization;
  }

  /**
   * Execute optimization
   */
  executeOptimization(optimizationId: string): YieldOptimization {
    const optimization = this.optimizations.get(optimizationId);
    if (!optimization) throw new Error('Optimization not found');

    optimization.status = 'executing';

    // Simulate execution
    setTimeout(() => {
      optimization.status = 'completed';
      optimization.executedAt = Date.now();

      // Update position
      const position = Array.from(this.positions.values()).find(
        p => p.userId === optimization.userId && p.asset === optimization.asset
      );

      if (position) {
        position.protocol = optimization.toProtocol;
        position.apy = optimization.estimatedAPYGain + position.apy;
        position.lastRebalancedAt = Date.now();
      }
    }, 2000);

    this.optimizations.set(optimizationId, optimization);

    return optimization;
  }

  /**
   * Create yield strategy
   */
  createStrategy(
    userId: string,
    name: string,
    asset: string,
    targetAPY: number,
    maxRiskScore: number = 50,
    autoRebalance: boolean = true,
    minGainThreshold: number = 0.5
  ): YieldStrategy {
    const strategy: YieldStrategy = {
      id: `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      asset,
      targetAPY,
      maxRiskScore,
      autoRebalance,
      rebalanceFrequency: 'weekly',
      minGainThreshold,
      status: 'active',
      createdAt: Date.now(),
    };

    this.strategies.set(strategy.id, strategy);

    return strategy;
  }

  /**
   * Get user strategies
   */
  getUserStrategies(userId: string): YieldStrategy[] {
    return Array.from(this.strategies.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get portfolio yield summary
   */
  getPortfolioYieldSummary(userId: string): {
    totalDeposited: number;
    totalEarned: number;
    averageAPY: number;
    positions: number;
    bestPerformer: YieldPosition | null;
  } {
    const positions = this.getUserPositions(userId);

    const totalDeposited = positions.reduce((sum, p) => sum + p.amount, 0);
    const totalEarned = positions.reduce((sum, p) => sum + this.calculateEarnings(p.id), 0);
    const averageAPY = positions.length > 0 ? positions.reduce((sum, p) => sum + p.apy, 0) / positions.length : 0;

    const bestPerformer = positions.length > 0
      ? positions.reduce((best, p) => (this.calculateEarnings(p.id) > this.calculateEarnings(best.id) ? p : best))
      : null;

    return {
      totalDeposited,
      totalEarned,
      averageAPY,
      positions: positions.length,
      bestPerformer,
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(userId: string): YieldOptimization[] {
    const positions = this.getUserPositions(userId);
    const recommendations: YieldOptimization[] = [];

    for (const position of positions) {
      const optimization = this.analyzeOptimization(userId, position.id);
      if (optimization) {
        recommendations.push(optimization);
      }
    }

    return recommendations.sort((a, b) => b.estimatedAPYGain - a.estimatedAPYGain);
  }

  /**
   * Get yield statistics
   */
  getYieldStatistics(userId: string): {
    totalYieldGenerated: number;
    averageYieldPerDay: number;
    bestYieldingAsset: string;
    worstYieldingAsset: string;
    riskAdjustedReturn: number;
  } {
    const positions = this.getUserPositions(userId);

    if (positions.length === 0) {
      return {
        totalYieldGenerated: 0,
        averageYieldPerDay: 0,
        bestYieldingAsset: '',
        worstYieldingAsset: '',
        riskAdjustedReturn: 0,
      };
    }

    const totalYield = positions.reduce((sum, p) => sum + this.calculateEarnings(p.id), 0);
    const daysActive = Math.max(...positions.map(p => (Date.now() - p.depositedAt) / (1000 * 60 * 60 * 24)));
    const averageYieldPerDay = daysActive > 0 ? totalYield / daysActive : 0;

    const assetYields = new Map<string, number>();
    for (const position of positions) {
      const earnings = this.calculateEarnings(position.id);
      assetYields.set(position.asset, (assetYields.get(position.asset) || 0) + earnings);
    }

    const bestAsset = Array.from(assetYields.entries()).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
    const worstAsset = Array.from(assetYields.entries()).reduce((a, b) => (a[1] < b[1] ? a : b))[0];

    // Get opportunities for risk calculation
    const opportunities = Array.from(this.opportunities.values()).filter(o => o.status === 'active');
    const avgRiskScore = opportunities.length > 0 ? opportunities.reduce((sum, o) => sum + o.riskScore, 0) / opportunities.length : 0;
    const riskAdjustedReturn = totalYield > 0 ? totalYield / (avgRiskScore / 100) : 0;

    return {
      totalYieldGenerated: totalYield,
      averageYieldPerDay,
      bestYieldingAsset: bestAsset,
      worstYieldingAsset: worstAsset,
      riskAdjustedReturn,
    };
  }
}

export const defiYieldOptimizerService = new DeFiYieldOptimizerService();
