/**
 * Yield Farming Dashboard Service
 * Manages staking rewards and yield farming strategies
 */

export interface YieldFarm {
  id: string;
  name: string;
  chainId: string;
  protocol: string;
  token: {
    symbol: string;
    address: string;
    decimals: number;
  };
  rewardToken: {
    symbol: string;
    address: string;
    decimals: number;
  };
  apy: number;
  apr: number;
  totalStaked: string;
  userStaked: string;
  pendingRewards: string;
  rewardRate: string; // rewards per day
  lockupPeriod: number; // in days
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: number;
}

export interface StakingPosition {
  id: string;
  farmId: string;
  userAddress: string;
  stakedAmount: string;
  claimedRewards: string;
  unclaimedRewards: string;
  lastClaimTime: number;
  lockupEndTime: number;
  createdAt: number;
  updatedAt: number;
}

export interface YieldTransaction {
  id: string;
  type: 'stake' | 'unstake' | 'claim' | 'compound';
  farmId: string;
  amount: string;
  status: 'pending' | 'success' | 'failed';
  hash?: string;
  timestamp: number;
}

class YieldFarmingService {
  private farms: Map<string, YieldFarm> = new Map();
  private positions: Map<string, StakingPosition> = new Map();
  private transactions: Map<string, YieldTransaction> = new Map();

  constructor() {
    this.initializeMockFarms();
  }

  /**
   * Initialize mock farms
   */
  private initializeMockFarms(): void {
    const mockFarms: YieldFarm[] = [
      {
        id: 'farm_eth_staking',
        name: 'ETH Staking',
        chainId: 'ethereum',
        protocol: 'Lido',
        token: {
          symbol: 'ETH',
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
        },
        rewardToken: {
          symbol: 'stETH',
          address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
          decimals: 18,
        },
        apy: 3.8,
        apr: 3.6,
        totalStaked: '10500000',
        userStaked: '0',
        pendingRewards: '0',
        rewardRate: '0.0104',
        lockupPeriod: 0,
        riskLevel: 'low',
        createdAt: Date.now() - 31536000000,
      },
      {
        id: 'farm_usdc_yield',
        name: 'USDC Yield',
        chainId: 'ethereum',
        protocol: 'Aave',
        token: {
          symbol: 'USDC',
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          decimals: 6,
        },
        rewardToken: {
          symbol: 'aUSDC',
          address: '0xbcca60bb61934080951369a648fb03df4f96263c',
          decimals: 6,
        },
        apy: 5.2,
        apr: 5.0,
        totalStaked: '500000000',
        userStaked: '0',
        pendingRewards: '0',
        rewardRate: '0.0142',
        lockupPeriod: 0,
        riskLevel: 'low',
        createdAt: Date.now() - 63072000000,
      },
      {
        id: 'farm_curve_lp',
        name: 'Curve LP Farming',
        chainId: 'ethereum',
        protocol: 'Curve',
        token: {
          symbol: 'USDC/USDT LP',
          address: '0x3175df0976dfa876431c2e9ee6617af4ce1f7b33',
          decimals: 18,
        },
        rewardToken: {
          symbol: 'CRV',
          address: '0xd533a949740bb3306d119cc777fa900ba034cd52',
          decimals: 18,
        },
        apy: 12.5,
        apr: 11.8,
        totalStaked: '250000000',
        userStaked: '0',
        pendingRewards: '0',
        rewardRate: '0.0342',
        lockupPeriod: 0,
        riskLevel: 'medium',
        createdAt: Date.now() - 15768000000,
      },
    ];

    mockFarms.forEach(farm => {
      this.farms.set(farm.id, farm);
    });
  }

  /**
   * Get all farms
   */
  getFarms(): YieldFarm[] {
    return Array.from(this.farms.values());
  }

  /**
   * Get farms by chain
   */
  getFarmsByChain(chainId: string): YieldFarm[] {
    return Array.from(this.farms.values()).filter(f => f.chainId === chainId);
  }

  /**
   * Get farm by ID
   */
  getFarm(farmId: string): YieldFarm | undefined {
    return this.farms.get(farmId);
  }

  /**
   * Get user positions
   */
  getUserPositions(userAddress: string): StakingPosition[] {
    return Array.from(this.positions.values()).filter(p => p.userAddress === userAddress);
  }

  /**
   * Stake tokens
   */
  async stake(
    farmId: string,
    userAddress: string,
    amount: string
  ): Promise<YieldTransaction | null> {
    try {
      const farm = this.farms.get(farmId);
      if (!farm) {
        throw new Error(`Farm ${farmId} not found`);
      }

      const transaction: YieldTransaction = {
        id: `tx_${Date.now()}`,
        type: 'stake',
        farmId,
        amount,
        status: 'pending',
        timestamp: Date.now(),
      };

      this.transactions.set(transaction.id, transaction);

      // Create staking position
      const position: StakingPosition = {
        id: `pos_${Date.now()}`,
        farmId,
        userAddress,
        stakedAmount: amount,
        claimedRewards: '0',
        unclaimedRewards: '0',
        lastClaimTime: Date.now(),
        lockupEndTime: Date.now() + farm.lockupPeriod * 86400000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.positions.set(position.id, position);

      // Simulate success
      setTimeout(() => {
        const tx = this.transactions.get(transaction.id);
        if (tx) {
          tx.status = 'success';
          tx.hash = `0x${Math.random().toString(16).slice(2)}`;
        }
      }, 2000);

      return transaction;
    } catch (error) {
      console.error('Failed to stake:', error);
      return null;
    }
  }

  /**
   * Unstake tokens
   */
  async unstake(
    positionId: string,
    amount: string
  ): Promise<YieldTransaction | null> {
    try {
      const position = this.positions.get(positionId);
      if (!position) {
        throw new Error(`Position ${positionId} not found`);
      }

      const transaction: YieldTransaction = {
        id: `tx_${Date.now()}`,
        type: 'unstake',
        farmId: position.farmId,
        amount,
        status: 'pending',
        timestamp: Date.now(),
      };

      this.transactions.set(transaction.id, transaction);

      // Simulate success
      setTimeout(() => {
        const tx = this.transactions.get(transaction.id);
        if (tx) {
          tx.status = 'success';
          tx.hash = `0x${Math.random().toString(16).slice(2)}`;
        }
      }, 2000);

      return transaction;
    } catch (error) {
      console.error('Failed to unstake:', error);
      return null;
    }
  }

  /**
   * Claim rewards
   */
  async claimRewards(positionId: string): Promise<YieldTransaction | null> {
    try {
      const position = this.positions.get(positionId);
      if (!position) {
        throw new Error(`Position ${positionId} not found`);
      }

      const transaction: YieldTransaction = {
        id: `tx_${Date.now()}`,
        type: 'claim',
        farmId: position.farmId,
        amount: position.unclaimedRewards,
        status: 'pending',
        timestamp: Date.now(),
      };

      this.transactions.set(transaction.id, transaction);

      // Update position
      position.claimedRewards = (parseFloat(position.claimedRewards) + parseFloat(position.unclaimedRewards)).toString();
      position.unclaimedRewards = '0';
      position.lastClaimTime = Date.now();
      position.updatedAt = Date.now();

      // Simulate success
      setTimeout(() => {
        const tx = this.transactions.get(transaction.id);
        if (tx) {
          tx.status = 'success';
          tx.hash = `0x${Math.random().toString(16).slice(2)}`;
        }
      }, 2000);

      return transaction;
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      return null;
    }
  }

  /**
   * Get farm statistics
   */
  getFarmStats(): {
    totalFarms: number;
    averageAPY: number;
    totalValueLocked: string;
    bestAPY: number;
  } {
    const farms = Array.from(this.farms.values());
    const averageAPY = farms.reduce((sum, f) => sum + f.apy, 0) / farms.length;
    const bestAPY = Math.max(...farms.map(f => f.apy));
    const totalValueLocked = farms.reduce((sum, f) => sum + parseFloat(f.totalStaked), 0);

    return {
      totalFarms: farms.length,
      averageAPY: parseFloat(averageAPY.toFixed(2)),
      totalValueLocked: `$${totalValueLocked.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      bestAPY,
    };
  }

  /**
   * Get transactions
   */
  getTransactions(): YieldTransaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const yieldFarmingService = new YieldFarmingService();
