/**
 * Yield Farming Service
 * Manages yield farming positions and rewards
 */

export interface YieldPool {
  id: string;
  name: string;
  protocol: 'aave' | 'compound' | 'yearn' | 'lido' | 'curve';
  token: string;
  apy: number; // Annual Percentage Yield
  tvl: number; // Total Value Locked
  riskLevel: 'low' | 'medium' | 'high';
  minDeposit: number;
  description: string;
}

export interface YieldPosition {
  id: string;
  poolId: string;
  amount: number;
  depositedAt: number;
  rewardsEarned: number;
  rewardsToken: string;
  status: 'active' | 'withdrawn' | 'liquidated';
}

export interface YieldConfig {
  enabled: boolean;
  autoCompound: boolean;
  compoundInterval: number; // milliseconds
  maxPositions: number;
}

class YieldFarmingService {
  private pools: Map<string, YieldPool> = new Map();
  private positions: Map<string, YieldPosition> = new Map();
  private config: YieldConfig = {
    enabled: true,
    autoCompound: false,
    compoundInterval: 86400000, // 24 hours
    maxPositions: 10,
  };

  private listeners: ((position: YieldPosition) => void)[] = [];
  private compoundInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize yield farming service
   */
  public async init(): Promise<void> {
    this.initializePools();
    this.startAutoCompound();
    console.log('[YieldFarming] Service initialized');
  }

  /**
   * Initialize available pools
   */
  private initializePools(): void {
    const pools: YieldPool[] = [
      {
        id: 'aave-eth',
        name: 'Aave ETH',
        protocol: 'aave',
        token: 'ETH',
        apy: 4.2,
        tvl: 2500000000,
        riskLevel: 'low',
        minDeposit: 0.1,
        description: 'Earn interest by lending ETH on Aave',
      },
      {
        id: 'aave-usdc',
        name: 'Aave USDC',
        protocol: 'aave',
        token: 'USDC',
        apy: 5.1,
        tvl: 1800000000,
        riskLevel: 'low',
        minDeposit: 100,
        description: 'Earn interest by lending USDC on Aave',
      },
      {
        id: 'compound-eth',
        name: 'Compound ETH',
        protocol: 'compound',
        token: 'ETH',
        apy: 3.8,
        tvl: 1200000000,
        riskLevel: 'low',
        minDeposit: 0.1,
        description: 'Earn interest by lending ETH on Compound',
      },
      {
        id: 'compound-usdc',
        name: 'Compound USDC',
        protocol: 'compound',
        token: 'USDC',
        apy: 4.9,
        tvl: 950000000,
        riskLevel: 'low',
        minDeposit: 100,
        description: 'Earn interest by lending USDC on Compound',
      },
      {
        id: 'yearn-eth',
        name: 'Yearn ETH Vault',
        protocol: 'yearn',
        token: 'ETH',
        apy: 8.5,
        tvl: 800000000,
        riskLevel: 'medium',
        minDeposit: 0.1,
        description: 'Optimized ETH yield strategy',
      },
      {
        id: 'yearn-usdc',
        name: 'Yearn USDC Vault',
        protocol: 'yearn',
        token: 'USDC',
        apy: 9.2,
        tvl: 650000000,
        riskLevel: 'medium',
        minDeposit: 100,
        description: 'Optimized USDC yield strategy',
      },
      {
        id: 'lido-eth',
        name: 'Lido Staking',
        protocol: 'lido',
        token: 'ETH',
        apy: 3.5,
        tvl: 15000000000,
        riskLevel: 'low',
        minDeposit: 0.01,
        description: 'Stake ETH and earn rewards',
      },
      {
        id: 'curve-3pool',
        name: 'Curve 3Pool',
        protocol: 'curve',
        token: 'USDC',
        apy: 6.8,
        tvl: 2100000000,
        riskLevel: 'medium',
        minDeposit: 100,
        description: 'Provide liquidity to Curve 3Pool',
      },
    ];

    pools.forEach((pool) => {
      this.pools.set(pool.id, pool);
    });

    console.log('[YieldFarming] Pools initialized:', pools.length);
  }

  /**
   * Get all available pools
   */
  public getAllPools(): YieldPool[] {
    return Array.from(this.pools.values());
  }

  /**
   * Get pools by protocol
   */
  public getPoolsByProtocol(protocol: string): YieldPool[] {
    return Array.from(this.pools.values()).filter((pool) => pool.protocol === protocol);
  }

  /**
   * Get pools by risk level
   */
  public getPoolsByRiskLevel(riskLevel: string): YieldPool[] {
    return Array.from(this.pools.values()).filter((pool) => pool.riskLevel === riskLevel);
  }

  /**
   * Deposit to a pool
   */
  public async depositToPool(poolId: string, amount: number): Promise<YieldPosition | null> {
    try {
      const pool = this.pools.get(poolId);
      if (!pool) throw new Error('Pool not found');

      if (amount < pool.minDeposit) {
        throw new Error(`Minimum deposit is ${pool.minDeposit} ${pool.token}`);
      }

      if (this.positions.size >= this.config.maxPositions) {
        throw new Error(`Maximum positions (${this.config.maxPositions}) reached`);
      }

      // Create position
      const position: YieldPosition = {
        id: this.generatePositionId(),
        poolId,
        amount,
        depositedAt: Date.now(),
        rewardsEarned: 0,
        rewardsToken: pool.token,
        status: 'active',
      };

      this.positions.set(position.id, position);
      this.notifyListeners(position);

      console.log('[YieldFarming] Position created:', position);
      return position;
    } catch (error) {
      console.error('[YieldFarming] Error depositing:', error);
      return null;
    }
  }

  /**
   * Withdraw from a pool
   */
  public async withdrawFromPool(positionId: string): Promise<YieldPosition | null> {
    try {
      const position = this.positions.get(positionId);
      if (!position) throw new Error('Position not found');

      if (position.status !== 'active') {
        throw new Error('Position is not active');
      }

      position.status = 'withdrawn';
      this.notifyListeners(position);

      console.log('[YieldFarming] Position withdrawn:', positionId);
      return position;
    } catch (error) {
      console.error('[YieldFarming] Error withdrawing:', error);
      return null;
    }
  }

  /**
   * Get all positions
   */
  public getAllPositions(): YieldPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get active positions
   */
  public getActivePositions(): YieldPosition[] {
    return Array.from(this.positions.values()).filter((pos) => pos.status === 'active');
  }

  /**
   * Get position by ID
   */
  public getPositionById(positionId: string): YieldPosition | undefined {
    return this.positions.get(positionId);
  }

  /**
   * Calculate rewards for a position
   */
  public calculateRewards(positionId: string): number {
    const position = this.positions.get(positionId);
    if (!position) return 0;

    const pool = this.pools.get(position.poolId);
    if (!pool) return 0;

    const timeInSeconds = (Date.now() - position.depositedAt) / 1000;
    const timeInYears = timeInSeconds / (365 * 24 * 60 * 60);
    const rewards = position.amount * (pool.apy / 100) * timeInYears;

    return rewards;
  }

  /**
   * Compound rewards (reinvest)
   */
  public async compoundRewards(positionId: string): Promise<YieldPosition | null> {
    try {
      const position = this.positions.get(positionId);
      if (!position) throw new Error('Position not found');

      const rewards = this.calculateRewards(positionId);
      position.amount += rewards;
      position.rewardsEarned += rewards;
      position.depositedAt = Date.now();

      this.notifyListeners(position);

      console.log('[YieldFarming] Rewards compounded:', positionId, 'Rewards:', rewards);
      return position;
    } catch (error) {
      console.error('[YieldFarming] Error compounding:', error);
      return null;
    }
  }

  /**
   * Get total value locked in all positions
   */
  public getTotalValueLocked(): number {
    return Array.from(this.positions.values())
      .filter((pos) => pos.status === 'active')
      .reduce((sum, pos) => sum + pos.amount, 0);
  }

  /**
   * Get total rewards earned
   */
  public getTotalRewardsEarned(): number {
    return Array.from(this.positions.values()).reduce((sum, pos) => sum + pos.rewardsEarned, 0);
  }

  /**
   * Get average APY
   */
  public getAverageAPY(): number {
    const activePositions = this.getActivePositions();
    if (activePositions.length === 0) return 0;

    const totalAPY = activePositions.reduce((sum, pos) => {
      const pool = this.pools.get(pos.poolId);
      return sum + (pool?.apy || 0);
    }, 0);

    return totalAPY / activePositions.length;
  }

  /**
   * Get configuration
   */
  public getConfig(): YieldConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<YieldConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[YieldFarming] Config updated:', this.config);
  }

  /**
   * Add listener for position events
   */
  public addListener(listener: (position: YieldPosition) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(position: YieldPosition): void {
    this.listeners.forEach((listener) => {
      try {
        listener(position);
      } catch (error) {
        console.error('[YieldFarming] Error in listener:', error);
      }
    });
  }

  /**
   * Start auto compound
   */
  private startAutoCompound(): void {
    if (!this.config.autoCompound || this.compoundInterval) return;

    this.compoundInterval = setInterval(() => {
      this.getActivePositions().forEach((position) => {
        this.compoundRewards(position.id);
      });
    }, this.config.compoundInterval);

    console.log('[YieldFarming] Auto compound started');
  }

  /**
   * Generate position ID
   */
  private generatePositionId(): string {
    return `yield_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics
   */
  public getStatistics(): {
    totalPositions: number;
    activePositions: number;
    totalValueLocked: number;
    totalRewardsEarned: number;
    averageAPY: number;
  } {
    return {
      totalPositions: this.positions.size,
      activePositions: this.getActivePositions().length,
      totalValueLocked: this.getTotalValueLocked(),
      totalRewardsEarned: this.getTotalRewardsEarned(),
      averageAPY: this.getAverageAPY(),
    };
  }

  /**
   * Clear all positions
   */
  public clearAllPositions(): void {
    this.positions.clear();
    console.log('[YieldFarming] All positions cleared');
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.compoundInterval) {
      clearInterval(this.compoundInterval);
      this.compoundInterval = null;
    }
    this.listeners = [];
    console.log('[YieldFarming] Service cleaned up');
  }

  /**
   * Validate deposit parameters
   */
  public validateDeposit(poolId: string, amount: number): { valid: boolean; error?: string } {
    const pool = this.pools.get(poolId);
    if (!pool) {
      return { valid: false, error: 'Pool not found' };
    }

    if (amount < pool.minDeposit) {
      return { valid: false, error: `Minimum deposit is ${pool.minDeposit} ${pool.token}` };
    }

    if (amount <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const yieldFarmingService = new YieldFarmingService();

/**
 * Hook to use yield farming service in components
 */
export function useYieldFarming() {
  return yieldFarmingService;
}
