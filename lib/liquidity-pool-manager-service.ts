/**
 * Liquidity Pool Manager Service
 * DEX pool management with APY tracking and yield farming
 */

export interface LiquidityPool {
  id: string;
  dex: 'uniswap' | 'curve' | 'balancer' | 'sushiswap';
  token0: string;
  token1: string;
  fee: number; // percentage
  tvl: number;
  volume24h: number;
  apy: number;
  apr: number;
  impermanentLossRisk: number; // percentage
  active: boolean;
  createdAt: number;
}

export interface LiquidityPosition {
  id: string;
  userId: string;
  poolId: string;
  lpTokenAmount: number;
  token0Amount: number;
  token1Amount: number;
  depositedAt: number;
  withdrawnAt?: number;
  accumulatedFees: number;
  impermanentLoss: number;
  status: 'active' | 'withdrawing' | 'completed';
}

export interface YieldFarmingPosition {
  id: string;
  userId: string;
  poolId: string;
  lpTokenAmount: number;
  rewardToken: string;
  accumulatedRewards: number;
  lastRewardClaimAt: number;
  apy: number;
  depositedAt: number;
  withdrawnAt?: number;
  status: 'active' | 'unstaking' | 'completed';
}

export interface PoolAnalytics {
  poolId: string;
  totalLiquidity: number;
  totalVolume24h: number;
  priceRange: { min: number; max: number };
  concentration: number; // percentage
  volatility: number;
  impermanentLossHistory: Array<{ timestamp: number; loss: number }>;
}

class LiquidityPoolManagerService {
  private pools: Map<string, LiquidityPool> = new Map();
  private positions: Map<string, LiquidityPosition> = new Map();
  private farmingPositions: Map<string, YieldFarmingPosition> = new Map();
  private analytics: Map<string, PoolAnalytics> = new Map();

  constructor() {
    this.initializeDefaultPools();
  }

  /**
   * Initialize default liquidity pools
   */
  private initializeDefaultPools(): void {
    const pools: LiquidityPool[] = [
      {
        id: 'pool_uni_eth_usdc',
        dex: 'uniswap',
        token0: 'ETH',
        token1: 'USDC',
        fee: 0.05,
        tvl: 500000000,
        volume24h: 50000000,
        apy: 12.5,
        apr: 11.8,
        impermanentLossRisk: 15,
        active: true,
        createdAt: Date.now(),
      },
      {
        id: 'pool_curve_dai_usdc',
        dex: 'curve',
        token0: 'DAI',
        token1: 'USDC',
        fee: 0.01,
        tvl: 300000000,
        volume24h: 30000000,
        apy: 8.3,
        apr: 8.1,
        impermanentLossRisk: 2,
        active: true,
        createdAt: Date.now(),
      },
      {
        id: 'pool_bal_weth_usdc',
        dex: 'balancer',
        token0: 'WETH',
        token1: 'USDC',
        fee: 0.3,
        tvl: 200000000,
        volume24h: 20000000,
        apy: 15.2,
        apr: 14.5,
        impermanentLossRisk: 18,
        active: true,
        createdAt: Date.now(),
      },
      {
        id: 'pool_sushi_eth_dai',
        dex: 'sushiswap',
        token0: 'ETH',
        token1: 'DAI',
        fee: 0.3,
        tvl: 150000000,
        volume24h: 15000000,
        apy: 18.5,
        apr: 17.2,
        impermanentLossRisk: 20,
        active: true,
        createdAt: Date.now(),
      },
    ];

    for (const pool of pools) {
      this.pools.set(pool.id, pool);
      this.initializePoolAnalytics(pool.id);
    }
  }

  /**
   * Initialize pool analytics
   */
  private initializePoolAnalytics(poolId: string): void {
    const analytics: PoolAnalytics = {
      poolId,
      totalLiquidity: Math.random() * 500000000 + 100000000,
      totalVolume24h: Math.random() * 50000000 + 5000000,
      priceRange: {
        min: Math.random() * 1000 + 500,
        max: Math.random() * 3000 + 2000,
      },
      concentration: Math.random() * 80 + 20,
      volatility: Math.random() * 30 + 10,
      impermanentLossHistory: [],
    };

    this.analytics.set(poolId, analytics);
  }

  /**
   * Get liquidity pool
   */
  getPool(poolId: string): LiquidityPool | undefined {
    return this.pools.get(poolId);
  }

  /**
   * Get all pools
   */
  getAllPools(): LiquidityPool[] {
    return Array.from(this.pools.values()).filter(p => p.active);
  }

  /**
   * Get pools by DEX
   */
  getPoolsByDEX(dex: string): LiquidityPool[] {
    return Array.from(this.pools.values()).filter(p => p.dex === dex && p.active);
  }

  /**
   * Provide liquidity
   */
  provideLiquidity(
    userId: string,
    poolId: string,
    token0Amount: number,
    token1Amount: number
  ): LiquidityPosition {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error('Pool not found');

    const position: LiquidityPosition = {
      id: `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      poolId,
      lpTokenAmount: Math.sqrt(token0Amount * token1Amount), // Simplified LP token calculation
      token0Amount,
      token1Amount,
      depositedAt: Date.now(),
      accumulatedFees: 0,
      impermanentLoss: 0,
      status: 'active',
    };

    this.positions.set(position.id, position);

    // Update pool TVL
    pool.tvl += token0Amount + token1Amount;

    return position;
  }

  /**
   * Withdraw liquidity
   */
  withdrawLiquidity(positionId: string): boolean {
    const position = this.positions.get(positionId);
    if (!position) return false;
    if (position.status !== 'active') return false;

    const pool = this.pools.get(position.poolId);
    if (!pool) return false;

    // Calculate fees earned
    const daysActive = (Date.now() - position.depositedAt) / (1000 * 60 * 60 * 24);
    const dailyFeeRate = pool.fee / 365 / 100;
    position.accumulatedFees = (position.token0Amount + position.token1Amount) * dailyFeeRate * daysActive;

    // Calculate impermanent loss
    position.impermanentLoss = (position.token0Amount + position.token1Amount) * (Math.random() * 10);

    position.status = 'withdrawing';
    position.withdrawnAt = Date.now();

    // Update pool TVL
    pool.tvl -= position.token0Amount + position.token1Amount;

    return true;
  }

  /**
   * Stake LP tokens for farming
   */
  stakeLPTokens(
    userId: string,
    poolId: string,
    lpTokenAmount: number,
    rewardToken: string
  ): YieldFarmingPosition {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error('Pool not found');

    const position: YieldFarmingPosition = {
      id: `farm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      poolId,
      lpTokenAmount,
      rewardToken,
      accumulatedRewards: 0,
      lastRewardClaimAt: Date.now(),
      apy: pool.apy,
      depositedAt: Date.now(),
      status: 'active',
    };

    this.farmingPositions.set(position.id, position);

    return position;
  }

  /**
   * Claim farming rewards
   */
  claimFarmingRewards(positionId: string): number {
    const position = this.farmingPositions.get(positionId);
    if (!position) return 0;
    if (position.status !== 'active') return 0;

    const daysSinceLastClaim = (Date.now() - position.lastRewardClaimAt) / (1000 * 60 * 60 * 24);
    const dailyRewardRate = position.apy / 365 / 100;
    const rewards = position.lpTokenAmount * dailyRewardRate * daysSinceLastClaim;

    position.accumulatedRewards += rewards;
    position.lastRewardClaimAt = Date.now();

    return rewards;
  }

  /**
   * Unstake LP tokens
   */
  unstakeLPTokens(positionId: string): boolean {
    const position = this.farmingPositions.get(positionId);
    if (!position) return false;
    if (position.status !== 'active') return false;

    position.status = 'unstaking';
    position.withdrawnAt = Date.now();

    return true;
  }

  /**
   * Get user liquidity positions
   */
  getUserLiquidityPositions(userId: string): LiquidityPosition[] {
    return Array.from(this.positions.values()).filter(p => p.userId === userId);
  }

  /**
   * Get user farming positions
   */
  getUserFarmingPositions(userId: string): YieldFarmingPosition[] {
    return Array.from(this.farmingPositions.values()).filter(p => p.userId === userId);
  }

  /**
   * Get pool analytics
   */
  getPoolAnalytics(poolId: string): PoolAnalytics | undefined {
    return this.analytics.get(poolId);
  }

  /**
   * Calculate impermanent loss
   */
  calculateImpermanentLoss(
    token0Price: number,
    token1Price: number,
    initialToken0Price: number,
    initialToken1Price: number
  ): number {
    const priceRatio = (token0Price / token1Price) / (initialToken0Price / initialToken1Price);
    const impermanentLoss = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;

    return impermanentLoss * 100; // Convert to percentage
  }

  /**
   * Get best pool for liquidity
   */
  getBestPoolForLiquidity(token0: string, token1: string): LiquidityPool | undefined {
    const pools = Array.from(this.pools.values()).filter(
      p => (p.token0 === token0 && p.token1 === token1) || (p.token0 === token1 && p.token1 === token0)
    );

    if (pools.length === 0) return undefined;

    // Sort by APY (higher is better)
    pools.sort((a, b) => b.apy - a.apy);

    return pools[0];
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary(userId: string): {
    totalLiquidity: number;
    totalFarmingRewards: number;
    totalAccumulatedFees: number;
    totalImpermanentLoss: number;
    activePositions: number;
  } {
    const liquidityPositions = this.getUserLiquidityPositions(userId);
    const farmingPositions = this.getUserFarmingPositions(userId);

    const totalLiquidity = liquidityPositions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.token0Amount + p.token1Amount, 0);

    const totalFarmingRewards = farmingPositions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.accumulatedRewards, 0);

    const totalAccumulatedFees = liquidityPositions.reduce((sum, p) => sum + p.accumulatedFees, 0);

    const totalImpermanentLoss = liquidityPositions.reduce((sum, p) => sum + p.impermanentLoss, 0);

    const activePositions = liquidityPositions.filter(p => p.status === 'active').length +
      farmingPositions.filter(p => p.status === 'active').length;

    return {
      totalLiquidity,
      totalFarmingRewards,
      totalAccumulatedFees,
      totalImpermanentLoss,
      activePositions,
    };
  }

  /**
   * Get trending pools
   */
  getTrendingPools(limit: number = 10): LiquidityPool[] {
    return Array.from(this.pools.values())
      .filter(p => p.active)
      .sort((a, b) => b.apy - a.apy)
      .slice(0, limit);
  }

  /**
   * Estimate LP token value
   */
  estimateLPTokenValue(positionId: string): number {
    const position = this.positions.get(positionId);
    if (!position) return 0;

    return position.token0Amount + position.token1Amount + position.accumulatedFees;
  }

  /**
   * Get fee tier options
   */
  getFeeTierOptions(): Array<{ fee: number; description: string; riskLevel: string }> {
    return [
      { fee: 0.01, description: 'Stable pairs (DAI/USDC)', riskLevel: 'Very Low' },
      { fee: 0.05, description: 'Standard pairs (ETH/USDC)', riskLevel: 'Low' },
      { fee: 0.3, description: 'Volatile pairs (ETH/DAI)', riskLevel: 'Medium' },
      { fee: 1, description: 'Highly volatile pairs', riskLevel: 'High' },
    ];
  }
}

export const liquidityPoolManagerService = new LiquidityPoolManagerService();
