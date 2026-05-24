/**
 * Staking & Yield Farming Module Service
 * DeFi staking with APY tracking and auto-compounding
 */

export interface StakingPool {
  id: string;
  name: string;
  token: string;
  apy: number;
  tvl: number;
  minStake: number;
  maxStake: number;
  lockupPeriod: number; // days
  riskLevel: 'low' | 'medium' | 'high';
  protocol: string;
  active: boolean;
  createdAt: number;
}

export interface StakingPosition {
  id: string;
  userId: string;
  poolId: string;
  amount: number;
  stakedAt: number;
  unstakedAt?: number;
  accumulatedRewards: number;
  lastRewardClaimAt: number;
  autoCompound: boolean;
  status: 'active' | 'unstaking' | 'completed';
}

export interface YieldFarmingPool {
  id: string;
  name: string;
  lpToken: string;
  rewardToken: string;
  apy: number;
  tvl: number;
  minLiquidity: number;
  riskLevel: 'low' | 'medium' | 'high';
  protocol: string;
  active: boolean;
  createdAt: number;
}

export interface FarmingPosition {
  id: string;
  userId: string;
  poolId: string;
  liquidityAmount: number;
  sharesOwned: number;
  depositedAt: number;
  withdrawnAt?: number;
  accumulatedRewards: number;
  lastRewardClaimAt: number;
  autoCompound: boolean;
  status: 'active' | 'withdrawing' | 'completed';
}

export interface RewardHistory {
  id: string;
  positionId: string;
  rewardAmount: number;
  claimedAt: number;
  method: 'manual' | 'auto_compound';
}

class StakingYieldFarmingService {
  private stakingPools: Map<string, StakingPool> = new Map();
  private stakingPositions: Map<string, StakingPosition> = new Map();
  private farmingPools: Map<string, YieldFarmingPool> = new Map();
  private farmingPositions: Map<string, FarmingPosition> = new Map();
  private rewardHistory: Map<string, RewardHistory> = new Map();

  constructor() {
    this.initializeDefaultPools();
  }

  /**
   * Initialize default staking and farming pools
   */
  private initializeDefaultPools(): void {
    // Staking pools
    const stakingPools: StakingPool[] = [
      {
        id: 'pool_stake_1',
        name: 'Ethereum Staking',
        token: 'ETH',
        apy: 4.5,
        tvl: 50000000,
        minStake: 0.1,
        maxStake: 1000,
        lockupPeriod: 0,
        riskLevel: 'low',
        protocol: 'Ethereum 2.0',
        active: true,
        createdAt: Date.now(),
      },
      {
        id: 'pool_stake_2',
        name: 'Solana Staking',
        token: 'SOL',
        apy: 6.2,
        tvl: 30000000,
        minStake: 1,
        maxStake: 10000,
        lockupPeriod: 0,
        riskLevel: 'low',
        protocol: 'Solana',
        active: true,
        createdAt: Date.now(),
      },
    ];

    for (const pool of stakingPools) {
      this.stakingPools.set(pool.id, pool);
    }

    // Farming pools
    const farmingPools: YieldFarmingPool[] = [
      {
        id: 'pool_farm_1',
        name: 'USDC-ETH Farm',
        lpToken: 'UNI-V3-USDC-ETH',
        rewardToken: 'UNI',
        apy: 12.5,
        tvl: 100000000,
        minLiquidity: 100,
        riskLevel: 'medium',
        protocol: 'Uniswap V3',
        active: true,
        createdAt: Date.now(),
      },
      {
        id: 'pool_farm_2',
        name: 'DAI-USDC Farm',
        lpToken: 'CURVE-DAI-USDC',
        rewardToken: 'CRV',
        apy: 8.3,
        tvl: 80000000,
        minLiquidity: 50,
        riskLevel: 'low',
        protocol: 'Curve',
        active: true,
        createdAt: Date.now(),
      },
    ];

    for (const pool of farmingPools) {
      this.farmingPools.set(pool.id, pool);
    }
  }

  /**
   * Get all staking pools
   */
  getStakingPools(): StakingPool[] {
    return Array.from(this.stakingPools.values()).filter(p => p.active);
  }

  /**
   * Get all farming pools
   */
  getFarmingPools(): YieldFarmingPool[] {
    return Array.from(this.farmingPools.values()).filter(p => p.active);
  }

  /**
   * Stake tokens
   */
  stakeTokens(
    userId: string,
    poolId: string,
    amount: number,
    autoCompound: boolean = false
  ): StakingPosition {
    const pool = this.stakingPools.get(poolId);
    if (!pool) throw new Error('Pool not found');
    if (amount < pool.minStake) throw new Error('Amount below minimum stake');
    if (amount > pool.maxStake) throw new Error('Amount exceeds maximum stake');

    const position: StakingPosition = {
      id: `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      poolId,
      amount,
      stakedAt: Date.now(),
      accumulatedRewards: 0,
      lastRewardClaimAt: Date.now(),
      autoCompound,
      status: 'active',
    };

    this.stakingPositions.set(position.id, position);

    // Update pool TVL
    pool.tvl += amount;

    return position;
  }

  /**
   * Unstake tokens
   */
  unstakeTokens(positionId: string): boolean {
    const position = this.stakingPositions.get(positionId);
    if (!position) return false;
    if (position.status !== 'active') return false;

    const pool = this.stakingPools.get(position.poolId);
    if (!pool) return false;

    // Check lockup period
    const daysSinceStake = (Date.now() - position.stakedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceStake < pool.lockupPeriod) {
      return false; // Lockup period not expired
    }

    position.status = 'unstaking';
    position.unstakedAt = Date.now();

    // Update pool TVL
    pool.tvl -= position.amount;

    return true;
  }

  /**
   * Claim staking rewards
   */
  claimStakingRewards(positionId: string): number {
    const position = this.stakingPositions.get(positionId);
    if (!position) return 0;
    if (position.status !== 'active') return 0;

    const pool = this.stakingPools.get(position.poolId);
    if (!pool) return 0;

    // Calculate rewards
    const daysSinceLastClaim = (Date.now() - position.lastRewardClaimAt) / (1000 * 60 * 60 * 24);
    const dailyRewardRate = pool.apy / 365 / 100;
    const rewards = position.amount * dailyRewardRate * daysSinceLastClaim;

    position.accumulatedRewards += rewards;
    position.lastRewardClaimAt = Date.now();

    // Record reward
    const reward: RewardHistory = {
      id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      positionId,
      rewardAmount: rewards,
      claimedAt: Date.now(),
      method: 'manual',
    };

    this.rewardHistory.set(reward.id, reward);

    return rewards;
  }

  /**
   * Auto-compound rewards
   */
  autoCompoundRewards(positionId: string): boolean {
    const position = this.stakingPositions.get(positionId);
    if (!position) return false;
    if (!position.autoCompound) return false;

    const rewards = this.claimStakingRewards(positionId);
    if (rewards <= 0) return false;

    // Add rewards to staked amount
    position.amount += rewards;

    // Update reward history method
    const lastReward = Array.from(this.rewardHistory.values()).pop();
    if (lastReward) {
      lastReward.method = 'auto_compound';
    }

    return true;
  }

  /**
   * Provide liquidity to farming pool
   */
  provideLiquidity(
    userId: string,
    poolId: string,
    liquidityAmount: number,
    autoCompound: boolean = false
  ): FarmingPosition {
    const pool = this.farmingPools.get(poolId);
    if (!pool) throw new Error('Pool not found');
    if (liquidityAmount < pool.minLiquidity) throw new Error('Amount below minimum liquidity');

    const position: FarmingPosition = {
      id: `farm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      poolId,
      liquidityAmount,
      sharesOwned: liquidityAmount / 100, // Simplified share calculation
      depositedAt: Date.now(),
      accumulatedRewards: 0,
      lastRewardClaimAt: Date.now(),
      autoCompound,
      status: 'active',
    };

    this.farmingPositions.set(position.id, position);

    // Update pool TVL
    pool.tvl += liquidityAmount;

    return position;
  }

  /**
   * Withdraw liquidity
   */
  withdrawLiquidity(positionId: string): boolean {
    const position = this.farmingPositions.get(positionId);
    if (!position) return false;
    if (position.status !== 'active') return false;

    const pool = this.farmingPools.get(position.poolId);
    if (!pool) return false;

    position.status = 'withdrawing';
    position.withdrawnAt = Date.now();

    // Update pool TVL
    pool.tvl -= position.liquidityAmount;

    return true;
  }

  /**
   * Claim farming rewards
   */
  claimFarmingRewards(positionId: string): number {
    const position = this.farmingPositions.get(positionId);
    if (!position) return 0;
    if (position.status !== 'active') return 0;

    const pool = this.farmingPools.get(position.poolId);
    if (!pool) return 0;

    // Calculate rewards
    const daysSinceLastClaim = (Date.now() - position.lastRewardClaimAt) / (1000 * 60 * 60 * 24);
    const dailyRewardRate = pool.apy / 365 / 100;
    const rewards = position.liquidityAmount * dailyRewardRate * daysSinceLastClaim;

    position.accumulatedRewards += rewards;
    position.lastRewardClaimAt = Date.now();

    // Record reward
    const reward: RewardHistory = {
      id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      positionId,
      rewardAmount: rewards,
      claimedAt: Date.now(),
      method: 'manual',
    };

    this.rewardHistory.set(reward.id, reward);

    return rewards;
  }

  /**
   * Get user staking positions
   */
  getUserStakingPositions(userId: string): StakingPosition[] {
    return Array.from(this.stakingPositions.values()).filter(p => p.userId === userId);
  }

  /**
   * Get user farming positions
   */
  getUserFarmingPositions(userId: string): FarmingPosition[] {
    return Array.from(this.farmingPositions.values()).filter(p => p.userId === userId);
  }

  /**
   * Get reward history
   */
  getRewardHistory(positionId: string): RewardHistory[] {
    return Array.from(this.rewardHistory.values())
      .filter(r => r.positionId === positionId)
      .sort((a, b) => b.claimedAt - a.claimedAt);
  }

  /**
   * Calculate projected rewards
   */
  calculateProjectedRewards(positionId: string, days: number): number {
    const position = this.stakingPositions.get(positionId) || this.farmingPositions.get(positionId);
    if (!position) return 0;

    const pool = this.stakingPools.get((position as any).poolId) || this.farmingPools.get((position as any).poolId);
    if (!pool) return 0;

    const dailyRewardRate = (pool as any).apy / 365 / 100;
    const amount = (position as any).amount || (position as any).liquidityAmount;

    return amount * dailyRewardRate * days;
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary(userId: string): {
    totalStaked: number;
    totalFarming: number;
    totalRewards: number;
    activePositions: number;
  } {
    const stakingPositions = this.getUserStakingPositions(userId);
    const farmingPositions = this.getUserFarmingPositions(userId);

    const totalStaked = stakingPositions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalFarming = farmingPositions
      .filter(p => p.status === 'active')
      .reduce((sum, p) => sum + p.liquidityAmount, 0);

    const totalRewards = [
      ...stakingPositions,
      ...farmingPositions,
    ].reduce((sum, p) => sum + (p as any).accumulatedRewards, 0);

    const activePositions = stakingPositions.filter(p => p.status === 'active').length +
      farmingPositions.filter(p => p.status === 'active').length;

    return {
      totalStaked,
      totalFarming,
      totalRewards,
      activePositions,
    };
  }
}

export const stakingYieldFarmingService = new StakingYieldFarmingService();
