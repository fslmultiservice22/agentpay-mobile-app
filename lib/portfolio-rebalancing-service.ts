/**
 * Portfolio Rebalancing Automation Service
 * Automatic rebalancing with tax-loss harvesting
 */

export interface RebalancingStrategy {
  id: string;
  userId: string;
  name: string;
  targetAllocations: Record<string, number>; // e.g., { "ETH": 40, "BTC": 30, "USDC": 30 }
  rebalancingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  rebalancingThreshold: number; // percentage drift to trigger rebalancing
  taxLossHarvestingEnabled: boolean;
  minTaxLossThreshold: number; // minimum loss to trigger harvesting
  autoExecute: boolean;
  status: 'active' | 'paused' | 'disabled';
  createdAt: number;
  lastRebalancedAt?: number;
  nextRebalancingAt?: number;
}

export interface RebalancingExecution {
  id: string;
  strategyId: string;
  userId: string;
  executedAt: number;
  trades: Array<{
    asset: string;
    action: 'buy' | 'sell';
    amount: number;
    price: number;
    fee: number;
  }>;
  totalFees: number;
  taxLossHarvested: number;
  status: 'pending' | 'completed' | 'failed';
  completedAt?: number;
}

export interface PortfolioAllocation {
  asset: string;
  currentAmount: number;
  currentPrice: number;
  currentValue: number;
  targetPercent: number;
  currentPercent: number;
  drift: number; // percentage drift from target
  action: 'buy' | 'sell' | 'hold';
  actionAmount: number;
}

export interface TaxLossHarvestingRecord {
  id: string;
  userId: string;
  asset: string;
  purchasePrice: number;
  currentPrice: number;
  quantity: number;
  loss: number;
  harvestedAt: number;
  replacementAsset?: string; // Asset to replace with
}

export interface RebalancingMetrics {
  strategyId: string;
  totalRebalancings: number;
  averageRebalancingCost: number;
  totalTaxLossHarvested: number;
  averageDrift: number;
  lastRebalancingDate: number;
  nextRebalancingDate: number;
  performanceVsTarget: number; // percentage
}

class PortfolioRebalancingService {
  private strategies: Map<string, RebalancingStrategy> = new Map();
  private executions: Map<string, RebalancingExecution> = new Map();
  private taxLossRecords: Map<string, TaxLossHarvestingRecord> = new Map();
  private userPortfolios: Map<string, Record<string, number>> = new Map(); // userId -> { asset: amount }
  private assetPrices: Map<string, number> = new Map();

  constructor() {
    this.initializeAssetPrices();
  }

  /**
   * Initialize asset prices
   */
  private initializeAssetPrices(): void {
    const prices: Record<string, number> = {
      'BTC': 45000,
      'ETH': 2500,
      'SOL': 100,
      'MATIC': 1.5,
      'USDC': 1,
      'AVAX': 35,
      'LINK': 15,
      'AAVE': 200,
    };

    for (const [asset, price] of Object.entries(prices)) {
      this.assetPrices.set(asset, price);
    }
  }

  /**
   * Create rebalancing strategy
   */
  createStrategy(
    userId: string,
    name: string,
    targetAllocations: Record<string, number>,
    rebalancingFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly',
    rebalancingThreshold: number = 5,
    taxLossHarvestingEnabled: boolean = true,
    minTaxLossThreshold: number = 100
  ): RebalancingStrategy {
    // Validate allocations sum to 100%
    const totalAllocation = Object.values(targetAllocations).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error('Target allocations must sum to 100%');
    }

    const strategy: RebalancingStrategy = {
      id: `strat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      targetAllocations,
      rebalancingFrequency,
      rebalancingThreshold,
      taxLossHarvestingEnabled,
      minTaxLossThreshold,
      autoExecute: false,
      status: 'active',
      createdAt: Date.now(),
      nextRebalancingAt: this.calculateNextRebalancingDate(Date.now(), rebalancingFrequency),
    };

    this.strategies.set(strategy.id, strategy);

    return strategy;
  }

  /**
   * Calculate next rebalancing date
   */
  private calculateNextRebalancingDate(currentDate: number, frequency: string): number {
    const date = new Date(currentDate);

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
    }

    return date.getTime();
  }

  /**
   * Get strategy
   */
  getStrategy(strategyId: string): RebalancingStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Get user strategies
   */
  getUserStrategies(userId: string): RebalancingStrategy[] {
    return Array.from(this.strategies.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Analyze portfolio allocation
   */
  analyzePortfolioAllocation(strategyId: string, portfolio: Record<string, number>): PortfolioAllocation[] {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    const allocations: PortfolioAllocation[] = [];
    let totalValue = 0;

    // Calculate total portfolio value
    for (const [asset, amount] of Object.entries(portfolio)) {
      const price = this.assetPrices.get(asset) || 0;
      totalValue += amount * price;
    }

    // Analyze each asset
    for (const [asset, targetPercent] of Object.entries(strategy.targetAllocations)) {
      const currentAmount = portfolio[asset] || 0;
      const currentPrice = this.assetPrices.get(asset) || 0;
      const currentValue = currentAmount * currentPrice;
      const currentPercent = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
      const drift = currentPercent - targetPercent;

      let action: 'buy' | 'sell' | 'hold' = 'hold';
      let actionAmount = 0;

      if (Math.abs(drift) > strategy.rebalancingThreshold) {
        if (drift > 0) {
          // Sell excess
          action = 'sell';
          const excessValue = (currentValue - (targetPercent / 100) * totalValue);
          actionAmount = excessValue / currentPrice;
        } else {
          // Buy deficit
          action = 'buy';
          const deficitValue = ((targetPercent / 100) * totalValue - currentValue);
          actionAmount = deficitValue / currentPrice;
        }
      }

      allocations.push({
        asset,
        currentAmount,
        currentPrice,
        currentValue,
        targetPercent,
        currentPercent,
        drift,
        action,
        actionAmount,
      });
    }

    return allocations;
  }

  /**
   * Execute rebalancing
   */
  executeRebalancing(strategyId: string, portfolio: Record<string, number>): RebalancingExecution {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    const allocations = this.analyzePortfolioAllocation(strategyId, portfolio);

    const trades: RebalancingExecution['trades'] = [];
    let totalFees = 0;
    let taxLossHarvested = 0;

    for (const allocation of allocations) {
      if (allocation.action !== 'hold' && allocation.actionAmount > 0) {
        const fee = (allocation.actionAmount * allocation.currentPrice) * 0.001; // 0.1% fee
        totalFees += fee;

        trades.push({
          asset: allocation.asset,
          action: allocation.action,
          amount: allocation.actionAmount,
          price: allocation.currentPrice,
          fee,
        });

        // Check for tax-loss harvesting
        if (strategy.taxLossHarvestingEnabled && allocation.action === 'sell') {
          const loss = this.calculateTaxLoss(strategy.userId, allocation.asset, allocation.actionAmount);
          if (loss > strategy.minTaxLossThreshold) {
            taxLossHarvested += loss;

            const record: TaxLossHarvestingRecord = {
              id: `tlh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userId: strategy.userId,
              asset: allocation.asset,
              purchasePrice: allocation.currentPrice * 1.1, // Assumed 10% higher purchase price
              currentPrice: allocation.currentPrice,
              quantity: allocation.actionAmount,
              loss,
              harvestedAt: Date.now(),
            };

            this.taxLossRecords.set(record.id, record);
          }
        }
      }
    }

    const execution: RebalancingExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      strategyId,
      userId: strategy.userId,
      executedAt: Date.now(),
      trades,
      totalFees,
      taxLossHarvested,
      status: 'completed',
      completedAt: Date.now(),
    };

    this.executions.set(execution.id, execution);

    // Update strategy
    strategy.lastRebalancedAt = Date.now();
    strategy.nextRebalancingAt = this.calculateNextRebalancingDate(Date.now(), strategy.rebalancingFrequency);

    return execution;
  }

  /**
   * Calculate tax loss
   */
  private calculateTaxLoss(userId: string, asset: string, quantity: number): number {
    // Simplified: assume 10% loss
    const currentPrice = this.assetPrices.get(asset) || 0;
    const purchasePrice = currentPrice * 1.1;
    const loss = (purchasePrice - currentPrice) * quantity;

    return Math.max(0, loss);
  }

  /**
   * Enable auto-execution
   */
  enableAutoExecution(strategyId: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    strategy.autoExecute = true;

    return true;
  }

  /**
   * Disable auto-execution
   */
  disableAutoExecution(strategyId: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    strategy.autoExecute = false;

    return true;
  }

  /**
   * Pause strategy
   */
  pauseStrategy(strategyId: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    strategy.status = 'paused';

    return true;
  }

  /**
   * Resume strategy
   */
  resumeStrategy(strategyId: string): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;

    strategy.status = 'active';
    strategy.nextRebalancingAt = this.calculateNextRebalancingDate(Date.now(), strategy.rebalancingFrequency);

    return true;
  }

  /**
   * Get rebalancing history
   */
  getRebalancingHistory(strategyId: string): RebalancingExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.strategyId === strategyId)
      .sort((a, b) => b.executedAt - a.executedAt);
  }

  /**
   * Get tax-loss harvesting records
   */
  getTaxLossHarvestingRecords(userId: string): TaxLossHarvestingRecord[] {
    return Array.from(this.taxLossRecords.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.harvestedAt - a.harvestedAt);
  }

  /**
   * Get rebalancing metrics
   */
  getRebalancingMetrics(strategyId: string): RebalancingMetrics {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) throw new Error('Strategy not found');

    const executions = this.getRebalancingHistory(strategyId);
    const totalRebalancings = executions.length;
    const averageRebalancingCost = totalRebalancings > 0
      ? executions.reduce((sum, e) => sum + e.totalFees, 0) / totalRebalancings
      : 0;

    const totalTaxLossHarvested = executions.reduce((sum, e) => sum + e.taxLossHarvested, 0);

    // Calculate average drift (simplified)
    const averageDrift = totalRebalancings > 0
      ? executions.reduce((sum, e) => sum + (e.trades.length * 2.5), 0) / (totalRebalancings * 10)
      : 0;

    return {
      strategyId,
      totalRebalancings,
      averageRebalancingCost,
      totalTaxLossHarvested,
      averageDrift,
      lastRebalancingDate: strategy.lastRebalancedAt || 0,
      nextRebalancingDate: strategy.nextRebalancingAt || 0,
      performanceVsTarget: Math.random() * 20 - 10, // Simplified: random -10% to +10%
    };
  }

  /**
   * Update asset price
   */
  updateAssetPrice(asset: string, price: number): void {
    this.assetPrices.set(asset, price);
  }

  /**
   * Get asset price
   */
  getAssetPrice(asset: string): number {
    return this.assetPrices.get(asset) || 0;
  }

  /**
   * Get suggested rebalancing
   */
  getSuggestedRebalancing(strategyId: string, portfolio: Record<string, number>): {
    needsRebalancing: boolean;
    maxDrift: number;
    estimatedFees: number;
    estimatedTaxLoss: number;
  } {
    const allocations = this.analyzePortfolioAllocation(strategyId, portfolio);

    const maxDrift = Math.max(...allocations.map(a => Math.abs(a.drift)));
    const strategy = this.strategies.get(strategyId);

    const needsRebalancing = maxDrift > (strategy?.rebalancingThreshold || 5);

    const estimatedFees = allocations
      .filter(a => a.action !== 'hold')
      .reduce((sum, a) => sum + (a.actionAmount * a.currentPrice * 0.001), 0);

    const estimatedTaxLoss = allocations
      .filter(a => a.action === 'sell')
      .reduce((sum, a) => sum + this.calculateTaxLoss(strategy?.userId || '', a.asset, a.actionAmount), 0);

    return {
      needsRebalancing,
      maxDrift,
      estimatedFees,
      estimatedTaxLoss,
    };
  }
}

export const portfolioRebalancingService = new PortfolioRebalancingService();
