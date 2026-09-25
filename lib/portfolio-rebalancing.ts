/**
 * Portfolio Rebalancing Service
 * Manages auto-rebalancing based on target allocation and risk tolerance
 */

export interface AssetAllocation {
  symbol: string;
  targetPercent: number;
  currentPercent: number;
  currentValue: number;
  targetValue: number;
  difference: number;
}

export interface RebalancingStrategy {
  id: string;
  name: string;
  description: string;
  allocations: AssetAllocation[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  rebalanceThreshold: number; // % deviation to trigger rebalance
  autoRebalance: boolean;
  lastRebalanceAt?: number;
  nextRebalanceAt?: number;
}

export interface RebalancingAction {
  id: string;
  symbol: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  totalValue: number;
  reason: string;
  executedAt?: number;
  status: 'pending' | 'executed' | 'cancelled';
}

class PortfolioRebalancingService {
  private strategies: Map<string, RebalancingStrategy> = new Map();
  private actions: Map<string, RebalancingAction> = new Map();
  private listeners: ((actions: RebalancingAction[]) => void)[] = [];

  /**
   * Initialize portfolio rebalancing service
   */
  public async init(): Promise<void> {
  }

  /**
   * Create rebalancing strategy
   */
  public createStrategy(
    name: string,
    allocations: AssetAllocation[],
    riskLevel: 'conservative' | 'moderate' | 'aggressive' = 'moderate',
    rebalanceThreshold: number = 5,
    autoRebalance: boolean = true
  ): RebalancingStrategy {
    const strategy: RebalancingStrategy = {
      id: `strategy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `${riskLevel} portfolio with ${allocations.length} assets`,
      allocations,
      riskLevel,
      rebalanceThreshold,
      autoRebalance,
    };

    this.strategies.set(strategy.id, strategy);
    return strategy;
  }

  /**
   * Get strategy by ID
   */
  public getStrategy(strategyId: string): RebalancingStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Get all strategies
   */
  public getAllStrategies(): RebalancingStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Calculate rebalancing needs
   */
  public calculateRebalancingNeeds(strategyId: string, portfolioValue: number): AssetAllocation[] {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return [];

    const allocations = strategy.allocations.map((allocation) => {
      const targetValue = (allocation.targetPercent / 100) * portfolioValue;
      const difference = targetValue - allocation.currentValue;

      return {
        ...allocation,
        currentPercent: (allocation.currentValue / portfolioValue) * 100,
        targetValue,
        difference,
      };
    });

    return allocations;
  }

  /**
   * Check if rebalancing is needed
   */
  public isRebalancingNeeded(strategyId: string, portfolioValue: number): boolean {
    const allocations = this.calculateRebalancingNeeds(strategyId, portfolioValue);
    const strategy = this.strategies.get(strategyId);

    if (!strategy) return false;

    return allocations.some((a) => Math.abs(a.difference) / a.targetValue > strategy.rebalanceThreshold / 100);
  }

  /**
   * Generate rebalancing actions
   */
  public generateRebalancingActions(strategyId: string, portfolioValue: number, prices: Map<string, number>): RebalancingAction[] {
    const allocations = this.calculateRebalancingNeeds(strategyId, portfolioValue);
    const actions: RebalancingAction[] = [];

    allocations.forEach((allocation) => {
      if (Math.abs(allocation.difference) > 0) {
        const price = prices.get(allocation.symbol) || 1;
        const amount = Math.abs(allocation.difference) / price;

        const action: RebalancingAction = {
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          symbol: allocation.symbol,
          action: allocation.difference > 0 ? 'buy' : 'sell',
          amount,
          price,
          totalValue: Math.abs(allocation.difference),
          reason: `Rebalance ${allocation.symbol} from ${allocation.currentPercent.toFixed(2)}% to ${allocation.targetPercent}%`,
          status: 'pending',
        };

        actions.push(action);
        this.actions.set(action.id, action);
      }
    });

    return actions;
  }

  /**
   * Execute rebalancing action
   */
  public executeAction(actionId: string): RebalancingAction | null {
    const action = this.actions.get(actionId);
    if (!action) return null;

    action.status = 'executed';
    action.executedAt = Date.now();

    this.notifyListeners(Array.from(this.actions.values()));

    return action;
  }

  /**
   * Cancel rebalancing action
   */
  public cancelAction(actionId: string): RebalancingAction | null {
    const action = this.actions.get(actionId);
    if (!action) return null;

    action.status = 'cancelled';

    this.notifyListeners(Array.from(this.actions.values()));

    return action;
  }

  /**
   * Get pending actions
   */
  public getPendingActions(): RebalancingAction[] {
    return Array.from(this.actions.values()).filter((a) => a.status === 'pending');
  }

  /**
   * Get executed actions
   */
  public getExecutedActions(): RebalancingAction[] {
    return Array.from(this.actions.values()).filter((a) => a.status === 'executed');
  }

  /**
   * Get all actions
   */
  public getAllActions(): RebalancingAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Update strategy allocation
   */
  public updateAllocation(strategyId: string, symbol: string, targetPercent: number, currentValue: number): void {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;

    const allocation = strategy.allocations.find((a) => a.symbol === symbol);
    if (allocation) {
      allocation.targetPercent = targetPercent;
      allocation.currentValue = currentValue;
    }

  }

  /**
   * Get recommended strategies
   */
  public getRecommendedStrategies(): RebalancingStrategy[] {
    const conservative: AssetAllocation[] = [
      { symbol: 'BTC', targetPercent: 40, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'ETH', targetPercent: 30, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'USDC', targetPercent: 30, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
    ];

    const moderate: AssetAllocation[] = [
      { symbol: 'BTC', targetPercent: 30, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'ETH', targetPercent: 30, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'SOL', targetPercent: 20, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'USDC', targetPercent: 20, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
    ];

    const aggressive: AssetAllocation[] = [
      { symbol: 'BTC', targetPercent: 20, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'ETH', targetPercent: 20, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'SOL', targetPercent: 20, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'DOGE', targetPercent: 20, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
      { symbol: 'USDC', targetPercent: 20, currentPercent: 0, currentValue: 0, targetValue: 0, difference: 0 },
    ];

    return [
      this.createStrategy('Conservative Portfolio', conservative, 'conservative', 3, true),
      this.createStrategy('Moderate Portfolio', moderate, 'moderate', 5, true),
      this.createStrategy('Aggressive Portfolio', aggressive, 'aggressive', 7, true),
    ];
  }

  /**
   * Add listener for rebalancing updates
   */
  public addListener(listener: (actions: RebalancingAction[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(actions: RebalancingAction[]): void {
    this.listeners.forEach((listener) => {
      try {
        listener(actions);
      } catch (error) {
        console.error('[PortfolioRebalancing] Error in listener:', error);
      }
    });
  }

  /**
   * Clear all data
   */
  public clearAll(): void {
    this.strategies.clear();
    this.actions.clear();
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.listeners = [];
  }
}

// Export singleton instance
export const portfolioRebalancingService = new PortfolioRebalancingService();

/**
 * Hook to use portfolio rebalancing service in components
 */
export function usePortfolioRebalancing() {
  return portfolioRebalancingService;
}
