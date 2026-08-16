/**
 * Gas Optimization & Fee Estimation Service
 * Real-time gas tracking, fee estimation, and optimization strategies
 */

export type GasStrategy = 'standard' | 'fast' | 'instant' | 'custom';

export type NetworkCongestion = 'low' | 'medium' | 'high';

export interface GasPrice {
  network: string;
  standard: number;
  fast: number;
  instant: number;
  timestamp: number;
  unit: string; // gwei
  /** Current congestion level of the network, used to raise warnings. */
  networkCongestion: NetworkCongestion;
}

export interface FeeEstimate {
  id: string;
  transactionType: 'transfer' | 'swap' | 'stake' | 'farm' | 'governance' | 'nft';
  network: string;
  gasLimit: number;
  gasPrice: number;
  strategy: GasStrategy;
  estimatedFee: number;
  estimatedFeeUSD: number;
  estimatedTime: number; // seconds
  timestamp: number;
}

export interface GasHistory {
  id: string;
  network: string;
  timestamp: number;
  gasPrice: number;
  transactionCount: number;
  networkCongestion: NetworkCongestion;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  gasSavings: number; // percentage
  complexity: 'simple' | 'medium' | 'advanced';
  applicable: boolean;
  recommendation: string;
}

export interface TransactionSimulation {
  id: string;
  transactionType: string;
  estimatedGas: number;
  estimatedCost: number;
  successProbability: number; // 0-100
  warnings: string[];
  optimizations: OptimizationStrategy[];
}

class GasOptimizationService {
  private gasPrices: Map<string, GasPrice> = new Map();
  private feeEstimates: Map<string, FeeEstimate> = new Map();
  private gasHistory: Map<string, GasHistory> = new Map();
  private transactionSimulations: Map<string, TransactionSimulation> = new Map();

  constructor() {
    this.initializeGasPrices();
  }

  /**
   * Initialize gas prices for different networks
   */
  private initializeGasPrices(): void {
    const networks = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'solana'];

    for (const network of networks) {
      const networkCongestion: NetworkCongestion = Math.random() > 0.5 ? 'low' : 'medium';
      const gasPrice: GasPrice = {
        network,
        standard: Math.random() * 50 + 20, // 20-70 gwei
        fast: Math.random() * 80 + 40,     // 40-120 gwei
        instant: Math.random() * 120 + 80, // 80-200 gwei
        timestamp: Date.now(),
        unit: 'gwei',
        networkCongestion,
      };

      this.gasPrices.set(network, gasPrice);

      // Add to history
      const history: GasHistory = {
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        network,
        timestamp: Date.now(),
        gasPrice: gasPrice.standard,
        transactionCount: Math.floor(Math.random() * 10000),
        networkCongestion,
      };

      this.gasHistory.set(history.id, history);
    }
  }

  /**
   * Get current gas prices
   */
  getGasPrices(network: string): GasPrice | undefined {
    return this.gasPrices.get(network);
  }

  /**
   * Get all gas prices
   */
  getAllGasPrices(): GasPrice[] {
    return Array.from(this.gasPrices.values());
  }

  /**
   * Estimate transaction fee
   */
  estimateTransactionFee(
    network: string,
    transactionType: FeeEstimate['transactionType'],
    gasLimit: number,
    strategy: GasStrategy = 'standard',
    customGasPrice?: number
  ): FeeEstimate {
    const gasPrice = this.gasPrices.get(network);
    if (!gasPrice) throw new Error('Network not found');

    let selectedGasPrice = gasPrice.standard;

    if (strategy === 'fast') {
      selectedGasPrice = gasPrice.fast;
    } else if (strategy === 'instant') {
      selectedGasPrice = gasPrice.instant;
    } else if (strategy === 'custom' && customGasPrice) {
      selectedGasPrice = customGasPrice;
    }

    const estimatedFee = (gasLimit * selectedGasPrice) / 1e9; // Convert from wei to ETH
    const estimatedFeeUSD = estimatedFee * 2500; // Assume $2500 per ETH

    // Estimate time based on strategy
    const timeMap = { standard: 60, fast: 15, instant: 5 };
    const estimatedTime = timeMap[strategy as keyof typeof timeMap] || 60;

    const estimate: FeeEstimate = {
      id: `estimate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionType,
      network,
      gasLimit,
      gasPrice: selectedGasPrice,
      strategy,
      estimatedFee,
      estimatedFeeUSD,
      estimatedTime,
      timestamp: Date.now(),
    };

    this.feeEstimates.set(estimate.id, estimate);

    return estimate;
  }

  /**
   * Get fee estimate by ID
   */
  getFeeEstimate(estimateId: string): FeeEstimate | undefined {
    return this.feeEstimates.get(estimateId);
  }

  /**
   * Simulate transaction
   */
  simulateTransaction(
    transactionType: string,
    network: string,
    parameters: Record<string, any>
  ): TransactionSimulation {
    const gasPrice = this.gasPrices.get(network);
    if (!gasPrice) throw new Error('Network not found');

    // Estimate gas based on transaction type
    const gasLimitMap: Record<string, number> = {
      transfer: 21000,
      swap: 150000,
      stake: 200000,
      farm: 250000,
      governance: 100000,
      nft: 180000,
    };

    const estimatedGas = gasLimitMap[transactionType] || 100000;
    const estimatedCost = (estimatedGas * gasPrice.standard) / 1e9;
    const successProbability = 95 + Math.random() * 5; // 95-100%

    // Generate warnings
    const warnings: string[] = [];
    if (gasPrice.networkCongestion === 'high') {
      warnings.push('Network congestion detected. Consider waiting or increasing gas price.');
    }
    if (estimatedCost > 100) {
      warnings.push('High transaction cost. Consider batching with other transactions.');
    }

    // Generate optimization strategies
    const optimizations = this.generateOptimizations(transactionType, estimatedGas, estimatedCost);

    const simulation: TransactionSimulation = {
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionType,
      estimatedGas,
      estimatedCost,
      successProbability,
      warnings,
      optimizations,
    };

    this.transactionSimulations.set(simulation.id, simulation);

    return simulation;
  }

  /**
   * Generate optimization strategies
   */
  private generateOptimizations(
    transactionType: string,
    gasLimit: number,
    cost: number
  ): OptimizationStrategy[] {
    const strategies: OptimizationStrategy[] = [];

    // Strategy 1: Batch transactions
    strategies.push({
      id: `opt_1_${Date.now()}`,
      name: 'Batch Transactions',
      description: 'Combine multiple transactions into one to save gas',
      gasSavings: 30,
      complexity: 'simple',
      applicable: transactionType !== 'transfer',
      recommendation: 'Batch this transaction with others to reduce overall gas costs.',
    });

    // Strategy 2: Use Layer 2
    strategies.push({
      id: `opt_2_${Date.now()}`,
      name: 'Layer 2 Solution',
      description: 'Use Polygon or Arbitrum for lower fees',
      gasSavings: 90,
      complexity: 'medium',
      applicable: true,
      recommendation: 'Consider moving to a Layer 2 network for significantly lower fees.',
    });

    // Strategy 3: Optimize parameters
    strategies.push({
      id: `opt_3_${Date.now()}`,
      name: 'Parameter Optimization',
      description: 'Optimize transaction parameters to reduce gas usage',
      gasSavings: 15,
      complexity: 'advanced',
      applicable: transactionType === 'swap' || transactionType === 'farm',
      recommendation: 'Adjust slippage and other parameters to optimize gas usage.',
    });

    // Strategy 4: Wait for lower gas
    strategies.push({
      id: `opt_4_${Date.now()}`,
      name: 'Wait for Lower Gas',
      description: 'Wait for network congestion to decrease',
      gasSavings: 20,
      complexity: 'simple',
      applicable: true,
      recommendation: 'Network congestion is high. Consider waiting a few minutes for lower gas prices.',
    });

    return strategies.filter(s => s.applicable);
  }

  /**
   * Get transaction simulation
   */
  getTransactionSimulation(simulationId: string): TransactionSimulation | undefined {
    return this.transactionSimulations.get(simulationId);
  }

  /**
   * Get gas history
   */
  getGasHistory(network: string, limit: number = 100): GasHistory[] {
    return Array.from(this.gasHistory.values())
      .filter(h => h.network === network)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Calculate average gas price
   */
  getAverageGasPrice(network: string, timeWindowMinutes: number = 60): number {
    const history = this.getGasHistory(network, 1000);
    const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);

    const relevantHistory = history.filter(h => h.timestamp >= cutoffTime);

    if (relevantHistory.length === 0) return 0;

    const sum = relevantHistory.reduce((acc, h) => acc + h.gasPrice, 0);
    return sum / relevantHistory.length;
  }

  /**
   * Get gas price trend
   */
  getGasPriceTrend(network: string): {
    trend: 'up' | 'down' | 'stable';
    percentageChange: number;
    timeWindow: string;
  } {
    const history = this.getGasHistory(network, 100);

    if (history.length < 2) {
      return { trend: 'stable', percentageChange: 0, timeWindow: 'N/A' };
    }

    const oldPrice = history[history.length - 1].gasPrice;
    const newPrice = history[0].gasPrice;
    const percentageChange = ((newPrice - oldPrice) / oldPrice) * 100;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (percentageChange > 5) trend = 'up';
    if (percentageChange < -5) trend = 'down';

    return {
      trend,
      percentageChange: Math.round(percentageChange * 100) / 100,
      timeWindow: '1 hour',
    };
  }

  /**
   * Recommend optimal strategy
   */
  recommendOptimalStrategy(network: string, urgency: 'low' | 'medium' | 'high'): 'standard' | 'fast' | 'instant' {
    const gasPrice = this.gasPrices.get(network);
    if (!gasPrice) return 'standard';

    if (urgency === 'high') return 'instant';
    if (urgency === 'medium') return 'fast';

    // For low urgency, check if network is congested
    const history = this.getGasHistory(network, 10);
    const recentCongestion = history[0]?.networkCongestion;

    if (recentCongestion === 'high') return 'fast';

    return 'standard';
  }

  /**
   * Update gas prices (simulated real-time update)
   */
  updateGasPrices(network: string): GasPrice {
    const networkCongestion: NetworkCongestion = Math.random() > 0.5 ? 'low' : 'medium';
    const gasPrice: GasPrice = {
      network,
      standard: Math.random() * 50 + 20,
      fast: Math.random() * 80 + 40,
      instant: Math.random() * 120 + 80,
      timestamp: Date.now(),
      unit: 'gwei',
      networkCongestion,
    };

    this.gasPrices.set(network, gasPrice);

    // Add to history
    const history: GasHistory = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      network,
      timestamp: Date.now(),
      gasPrice: gasPrice.standard,
      transactionCount: Math.floor(Math.random() * 10000),
      networkCongestion,
    };

    this.gasHistory.set(history.id, history);

    return gasPrice;
  }

  /**
   * Get fee comparison
   */
  getFeeComparison(
    network: string,
    transactionType: string,
    gasLimit: number
  ): {
    standard: number;
    fast: number;
    instant: number;
    savings: { fast: number; instant: number };
  } {
    const standard = this.estimateTransactionFee(network, transactionType as any, gasLimit, 'standard');
    const fast = this.estimateTransactionFee(network, transactionType as any, gasLimit, 'fast');
    const instant = this.estimateTransactionFee(network, transactionType as any, gasLimit, 'instant');

    return {
      standard: standard.estimatedFeeUSD,
      fast: fast.estimatedFeeUSD,
      instant: instant.estimatedFeeUSD,
      savings: {
        fast: Math.round((1 - fast.estimatedFeeUSD / standard.estimatedFeeUSD) * 100),
        instant: Math.round((1 - instant.estimatedFeeUSD / standard.estimatedFeeUSD) * 100),
      },
    };
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics(network: string): {
    averageGasPrice: number;
    gasLimit: number;
    networkCongestion: string;
    estimatedBlockTime: number;
  } {
    const gasPrice = this.gasPrices.get(network);
    const history = this.getGasHistory(network, 10);

    return {
      averageGasPrice: gasPrice?.standard || 0,
      gasLimit: 30000000, // Example
      networkCongestion: history[0]?.networkCongestion || 'medium',
      estimatedBlockTime: 12, // seconds
    };
  }
}

export const gasOptimizationService = new GasOptimizationService();
