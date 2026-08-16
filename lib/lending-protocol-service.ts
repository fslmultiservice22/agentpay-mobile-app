/**
 * Lending Protocol Integration Service
 * Aave, Compound, Curve integration for lending and earning yield
 */

/** Lending protocols supported by the service. */
export type LendingProtocol = 'aave' | 'compound' | 'curve';

export interface LendingPool {
  id: string;
  protocol: LendingProtocol;
  asset: string; // e.g., "USDC", "ETH", "DAI"
  totalLiquidity: number;
  totalBorrowed: number;
  availableLiquidity: number;
  supplyAPY: number;
  borrowAPY: number;
  utilizationRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  active: boolean;
  createdAt: number;
}

export interface LendingPosition {
  id: string;
  userId: string;
  poolId: string;
  protocol: LendingProtocol;
  asset: string;
  amount: number;
  aToken: string; // aUSDC, cUSDC, etc.
  aTokenAmount: number;
  accumulatedInterest: number;
  supplyAPY: number;
  depositedAt: number;
  withdrawnAt?: number;
  status: 'active' | 'withdrawing' | 'completed';
}

export interface BorrowingPosition {
  id: string;
  userId: string;
  poolId: string;
  protocol: LendingProtocol;
  asset: string;
  borrowAmount: number;
  collateralAsset: string;
  collateralAmount: number;
  borrowAPY: number;
  accumulatedInterest: number;
  healthFactor: number;
  status: 'active' | 'repaying' | 'liquidated';
  borrowedAt: number;
  repaidAt?: number;
}

export interface RewardClaim {
  id: string;
  userId: string;
  protocol: LendingProtocol;
  rewardToken: string;
  amount: number;
  claimedAt: number;
}

export interface LendingAnalytics {
  protocol: LendingProtocol;
  totalSupplied: number;
  totalBorrowed: number;
  totalInterestEarned: number;
  totalInterestPaid: number;
  netYield: number;
  averageSupplyAPY: number;
  averageBorrowAPY: number;
}

class LendingProtocolService {
  private pools: Map<string, LendingPool> = new Map();
  private lendingPositions: Map<string, LendingPosition> = new Map();
  private borrowingPositions: Map<string, BorrowingPosition> = new Map();
  private rewardClaims: Map<string, RewardClaim> = new Map();

  constructor() {
    this.initializePools();
  }

  /**
   * Initialize lending pools
   */
  private initializePools(): void {
    const pools: LendingPool[] = [
      // Aave pools
      {
        id: 'pool_aave_usdc',
        protocol: 'aave',
        asset: 'USDC',
        totalLiquidity: 500000000,
        totalBorrowed: 300000000,
        availableLiquidity: 200000000,
        supplyAPY: 5.2,
        borrowAPY: 7.8,
        utilizationRate: 60,
        riskLevel: 'low',
        active: true,
        createdAt: Date.now(),
      },
      {
        id: 'pool_aave_eth',
        protocol: 'aave',
        asset: 'ETH',
        totalLiquidity: 100000,
        totalBorrowed: 60000,
        availableLiquidity: 40000,
        supplyAPY: 3.5,
        borrowAPY: 5.2,
        utilizationRate: 60,
        riskLevel: 'low',
        active: true,
        createdAt: Date.now(),
      },
      // Compound pools
      {
        id: 'pool_compound_usdc',
        protocol: 'compound',
        asset: 'USDC',
        totalLiquidity: 300000000,
        totalBorrowed: 180000000,
        availableLiquidity: 120000000,
        supplyAPY: 4.8,
        borrowAPY: 7.2,
        utilizationRate: 60,
        riskLevel: 'low',
        active: true,
        createdAt: Date.now(),
      },
      {
        id: 'pool_compound_dai',
        protocol: 'compound',
        asset: 'DAI',
        totalLiquidity: 200000000,
        totalBorrowed: 120000000,
        availableLiquidity: 80000000,
        supplyAPY: 4.5,
        borrowAPY: 6.8,
        utilizationRate: 60,
        riskLevel: 'low',
        active: true,
        createdAt: Date.now(),
      },
      // Curve pools (stablecoin focused)
      {
        id: 'pool_curve_3pool',
        protocol: 'curve',
        asset: 'USDC',
        totalLiquidity: 1000000000,
        totalBorrowed: 0,
        availableLiquidity: 1000000000,
        supplyAPY: 6.2,
        borrowAPY: 0,
        utilizationRate: 0,
        riskLevel: 'low',
        active: true,
        createdAt: Date.now(),
      },
    ];

    for (const pool of pools) {
      this.pools.set(pool.id, pool);
    }
  }

  /**
   * Get lending pool
   */
  getPool(poolId: string): LendingPool | undefined {
    return this.pools.get(poolId);
  }

  /**
   * Get all pools
   */
  getAllPools(): LendingPool[] {
    return Array.from(this.pools.values()).filter(p => p.active);
  }

  /**
   * Get pools by protocol
   */
  getPoolsByProtocol(protocol: string): LendingPool[] {
    return Array.from(this.pools.values()).filter(p => p.protocol === protocol && p.active);
  }

  /**
   * Get pools by asset
   */
  getPoolsByAsset(asset: string): LendingPool[] {
    return Array.from(this.pools.values()).filter(p => p.asset === asset && p.active);
  }

  /**
   * Supply liquidity
   */
  supplyLiquidity(userId: string, poolId: string, amount: number): LendingPosition {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error('Pool not found');
    if (amount > pool.availableLiquidity) throw new Error('Insufficient liquidity');

    const aTokenAmount = amount / (1 + pool.supplyAPY / 100); // Simplified aToken calculation

    const position: LendingPosition = {
      id: `lend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      poolId,
      protocol: pool.protocol,
      asset: pool.asset,
      amount,
      aToken: `a${pool.asset}`,
      aTokenAmount,
      accumulatedInterest: 0,
      supplyAPY: pool.supplyAPY,
      depositedAt: Date.now(),
      status: 'active',
    };

    this.lendingPositions.set(position.id, position);

    // Update pool
    pool.totalLiquidity += amount;
    pool.availableLiquidity -= amount;
    pool.utilizationRate = (pool.totalBorrowed / pool.totalLiquidity) * 100;

    return position;
  }

  /**
   * Withdraw liquidity
   */
  withdrawLiquidity(positionId: string): boolean {
    const position = this.lendingPositions.get(positionId);
    if (!position) return false;
    if (position.status !== 'active') return false;

    const pool = this.pools.get(position.poolId);
    if (!pool) return false;

    // Calculate accumulated interest
    const daysActive = (Date.now() - position.depositedAt) / (1000 * 60 * 60 * 24);
    const dailyInterestRate = position.supplyAPY / 365 / 100;
    position.accumulatedInterest = position.amount * dailyInterestRate * daysActive;

    position.status = 'withdrawing';
    position.withdrawnAt = Date.now();

    // Update pool
    pool.totalLiquidity -= position.amount;
    pool.availableLiquidity += position.amount;
    pool.utilizationRate = pool.totalLiquidity > 0 ? (pool.totalBorrowed / pool.totalLiquidity) * 100 : 0;

    return true;
  }

  /**
   * Borrow from pool
   */
  borrowFromPool(
    userId: string,
    poolId: string,
    borrowAmount: number,
    collateralAsset: string,
    collateralAmount: number
  ): BorrowingPosition {
    const pool = this.pools.get(poolId);
    if (!pool) throw new Error('Pool not found');
    if (borrowAmount > pool.availableLiquidity) throw new Error('Insufficient liquidity');

    // Calculate health factor (simplified: collateral / borrowed)
    const healthFactor = (collateralAmount * 0.8) / borrowAmount; // 80% LTV

    if (healthFactor < 1.5) {
      throw new Error('Insufficient collateral');
    }

    const position: BorrowingPosition = {
      id: `borrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      poolId,
      protocol: pool.protocol,
      asset: pool.asset,
      borrowAmount,
      collateralAsset,
      collateralAmount,
      borrowAPY: pool.borrowAPY,
      accumulatedInterest: 0,
      healthFactor,
      status: 'active',
      borrowedAt: Date.now(),
    };

    this.borrowingPositions.set(position.id, position);

    // Update pool
    pool.totalBorrowed += borrowAmount;
    pool.availableLiquidity -= borrowAmount;
    pool.utilizationRate = (pool.totalBorrowed / pool.totalLiquidity) * 100;

    return position;
  }

  /**
   * Repay borrow
   */
  repayBorrow(positionId: string, repayAmount: number): boolean {
    const position = this.borrowingPositions.get(positionId);
    if (!position) return false;
    if (position.status !== 'active') return false;

    const pool = this.pools.get(position.poolId);
    if (!pool) return false;

    // Calculate accumulated interest
    const daysActive = (Date.now() - position.borrowedAt) / (1000 * 60 * 60 * 24);
    const dailyInterestRate = position.borrowAPY / 365 / 100;
    position.accumulatedInterest = position.borrowAmount * dailyInterestRate * daysActive;

    const totalRepayment = Math.min(repayAmount, position.borrowAmount + position.accumulatedInterest);

    position.borrowAmount -= totalRepayment;
    position.status = position.borrowAmount <= 0 ? 'repaying' : 'active';
    position.repaidAt = Date.now();

    // Update pool
    pool.totalBorrowed -= totalRepayment;
    pool.availableLiquidity += totalRepayment;
    pool.utilizationRate = pool.totalLiquidity > 0 ? (pool.totalBorrowed / pool.totalLiquidity) * 100 : 0;

    return true;
  }

  /**
   * Claim rewards
   */
  claimRewards(userId: string, protocol: LendingProtocol): number {
    const positions = Array.from(this.lendingPositions.values()).filter(
      p => p.userId === userId && p.protocol === protocol && p.status === 'active'
    );

    let totalRewards = 0;

    for (const position of positions) {
      const daysActive = (Date.now() - position.depositedAt) / (1000 * 60 * 60 * 24);
      const rewardRate = 0.02; // 2% additional reward
      const rewards = position.amount * rewardRate * (daysActive / 365);

      totalRewards += rewards;

      const claim: RewardClaim = {
        id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        protocol,
        rewardToken: `${protocol.toUpperCase()}_TOKEN`,
        amount: rewards,
        claimedAt: Date.now(),
      };

      this.rewardClaims.set(claim.id, claim);
    }

    return totalRewards;
  }

  /**
   * Get user lending positions
   */
  getUserLendingPositions(userId: string): LendingPosition[] {
    return Array.from(this.lendingPositions.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.depositedAt - a.depositedAt);
  }

  /**
   * Get user borrowing positions
   */
  getUserBorrowingPositions(userId: string): BorrowingPosition[] {
    return Array.from(this.borrowingPositions.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.borrowedAt - a.borrowedAt);
  }

  /**
   * Get lending analytics
   */
  getLendingAnalytics(userId: string): LendingAnalytics[] {
    const protocols = ['aave', 'compound', 'curve'];
    const analytics: LendingAnalytics[] = [];

    for (const protocol of protocols) {
      const lendingPositions = this.getUserLendingPositions(userId).filter(p => p.protocol === protocol);
      const borrowingPositions = this.getUserBorrowingPositions(userId).filter(p => p.protocol === protocol);

      const totalSupplied = lendingPositions.reduce((sum, p) => sum + p.amount, 0);
      const totalBorrowed = borrowingPositions.reduce((sum, p) => sum + p.borrowAmount, 0);
      const totalInterestEarned = lendingPositions.reduce((sum, p) => sum + p.accumulatedInterest, 0);
      const totalInterestPaid = borrowingPositions.reduce((sum, p) => sum + p.accumulatedInterest, 0);

      const averageSupplyAPY = lendingPositions.length > 0
        ? lendingPositions.reduce((sum, p) => sum + p.supplyAPY, 0) / lendingPositions.length
        : 0;

      const averageBorrowAPY = borrowingPositions.length > 0
        ? borrowingPositions.reduce((sum, p) => sum + p.borrowAPY, 0) / borrowingPositions.length
        : 0;

      analytics.push({
        protocol: protocol as LendingProtocol,
        totalSupplied,
        totalBorrowed,
        totalInterestEarned,
        totalInterestPaid,
        netYield: totalInterestEarned - totalInterestPaid,
        averageSupplyAPY,
        averageBorrowAPY,
      });
    }

    return analytics;
  }

  /**
   * Get best lending opportunity
   */
  getBestLendingOpportunity(asset: string): LendingPool | undefined {
    const pools = this.getPoolsByAsset(asset);

    if (pools.length === 0) return undefined;

    // Sort by supply APY (higher is better)
    pools.sort((a, b) => b.supplyAPY - a.supplyAPY);

    return pools[0];
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary(userId: string): {
    totalSupplied: number;
    totalBorrowed: number;
    totalInterestEarned: number;
    totalInterestPaid: number;
    netYield: number;
    activePositions: number;
  } {
    const lendingPositions = this.getUserLendingPositions(userId);
    const borrowingPositions = this.getUserBorrowingPositions(userId);

    const totalSupplied = lendingPositions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalBorrowed = borrowingPositions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.borrowAmount, 0);

    const totalInterestEarned = lendingPositions.reduce((sum, p) => sum + p.accumulatedInterest, 0);
    const totalInterestPaid = borrowingPositions.reduce((sum, p) => sum + p.accumulatedInterest, 0);

    const activePositions = lendingPositions.filter(p => p.status === 'active').length +
      borrowingPositions.filter(p => p.status === 'active').length;

    return {
      totalSupplied,
      totalBorrowed,
      totalInterestEarned,
      totalInterestPaid,
      netYield: totalInterestEarned - totalInterestPaid,
      activePositions,
    };
  }
}

export const lendingProtocolService = new LendingProtocolService();
