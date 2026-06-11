/**
 * Copy Trading Service
 * Mirror trades from top performers with configurable risk management
 */

export interface Trader {
  id: string;
  username: string;
  avatar?: string;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  avgReturn: number;
  followers: number;
  isVerified: boolean;
  createdAt: number;
}

export interface CopyTradingConfig {
  id: string;
  userId: string;
  traderId: string;
  isActive: boolean;
  positionSizing: 'fixed' | 'percentage' | 'dynamic';
  fixedAmount?: number;
  percentageAmount?: number;
  maxPositionSize: number;
  maxDailyLoss: number;
  maxTotalLoss: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
  minTradeSize: number;
  maxTradeSize: number;
  autoClose: boolean;
  createdAt: number;
  totalCopied: number;
  totalProfit: number;
  winRate: number;
}

export interface CopiedTrade {
  id: string;
  copyConfigId: string;
  originalTradeId: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  positionSize: number;
  status: 'open' | 'closed' | 'cancelled';
  profit?: number;
  profitPercentage?: number;
  createdAt: number;
  closedAt?: number;
}

export interface TraderStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalProfit: number;
}

export interface TraderPerformance {
  traderId: string;
  period: '1d' | '7d' | '30d' | '90d' | 'all';
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalReturn: number;
  avgReturn: number;
  maxDrawdown: number;
}

class CopyTradingService {
  private traders: Map<string, Trader> = new Map();
  private configs: Map<string, CopyTradingConfig> = new Map();
  private copiedTrades: Map<string, CopiedTrade> = new Map();
  private traderStats: Map<string, TraderStats> = new Map();

  constructor() {
    this.initializeTopTraders();
  }

  /**
   * Initialize top traders
   */
  private initializeTopTraders(): void {
    const topTraders: Trader[] = [
      {
        id: 'trader_1',
        username: 'CryptoMaster',
        winRate: 0.72,
        totalTrades: 245,
        profitFactor: 2.8,
        avgReturn: 0.045,
        followers: 15420,
        isVerified: true,
        createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'trader_2',
        username: 'TrendFollower',
        winRate: 0.68,
        totalTrades: 189,
        profitFactor: 2.3,
        avgReturn: 0.038,
        followers: 12890,
        isVerified: true,
        createdAt: Date.now() - 180 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'trader_3',
        username: 'SwingPro',
        winRate: 0.65,
        totalTrades: 156,
        profitFactor: 2.1,
        avgReturn: 0.032,
        followers: 8760,
        isVerified: true,
        createdAt: Date.now() - 120 * 24 * 60 * 60 * 1000,
      },
    ];

    topTraders.forEach(trader => {
      this.traders.set(trader.id, trader);
      this.initializeTraderStats(trader.id);
    });
  }

  /**
   * Initialize trader statistics
   */
  private initializeTraderStats(traderId: string): void {
    const trader = this.traders.get(traderId);
    if (!trader) return;

    const stats: TraderStats = {
      totalTrades: trader.totalTrades,
      winningTrades: Math.floor(trader.totalTrades * trader.winRate),
      losingTrades: Math.floor(trader.totalTrades * (1 - trader.winRate)),
      winRate: trader.winRate,
      profitFactor: trader.profitFactor,
      avgWin: trader.avgReturn * 1.5,
      avgLoss: -trader.avgReturn * 0.5,
      maxDrawdown: -0.15,
      sharpeRatio: 1.8,
      totalProfit: trader.totalTrades * trader.avgReturn * 1000,
    };

    this.traderStats.set(traderId, stats);
  }

  /**
   * Get top traders
   */
  getTopTraders(limit: number = 10, sortBy: 'winRate' | 'followers' | 'profitFactor' = 'winRate'): Trader[] {
    return Array.from(this.traders.values())
      .sort((a, b) => {
        if (sortBy === 'winRate') return b.winRate - a.winRate;
        if (sortBy === 'followers') return b.followers - a.followers;
        return b.profitFactor - a.profitFactor;
      })
      .slice(0, limit);
  }

  /**
   * Get trader details
   */
  getTraderDetails(traderId: string): Trader | undefined {
    return this.traders.get(traderId);
  }

  /**
   * Get trader statistics
   */
  getTraderStats(traderId: string): TraderStats | undefined {
    return this.traderStats.get(traderId);
  }

  /**
   * Create copy trading configuration
   */
  createCopyConfig(
    userId: string,
    traderId: string,
    positionSizing: 'fixed' | 'percentage' | 'dynamic' = 'percentage',
    amount: number = 100,
    maxDailyLoss: number = 500,
    stopLossPercentage: number = 0.05,
    takeProfitPercentage: number = 0.1
  ): CopyTradingConfig {
    const config: CopyTradingConfig = {
      id: `config_${Date.now()}`,
      userId,
      traderId,
      isActive: true,
      positionSizing,
      fixedAmount: positionSizing === 'fixed' ? amount : undefined,
      percentageAmount: positionSizing === 'percentage' ? amount : undefined,
      maxPositionSize: 5000,
      maxDailyLoss,
      maxTotalLoss: maxDailyLoss * 10,
      stopLossPercentage,
      takeProfitPercentage,
      minTradeSize: 10,
      maxTradeSize: 5000,
      autoClose: true,
      createdAt: Date.now(),
      totalCopied: 0,
      totalProfit: 0,
      winRate: 0,
    };

    this.configs.set(config.id, config);
    return config;
  }

  /**
   * Get user copy configs
   */
  getUserConfigs(userId: string, activeOnly: boolean = false): CopyTradingConfig[] {
    return Array.from(this.configs.values()).filter(
      config => config.userId === userId && (!activeOnly || config.isActive)
    );
  }

  /**
   * Update copy config
   */
  updateCopyConfig(configId: string, updates: Partial<CopyTradingConfig>): CopyTradingConfig | undefined {
    const config = this.configs.get(configId);
    if (config) {
      Object.assign(config, updates);
    }
    return config;
  }

  /**
   * Toggle copy config
   */
  toggleCopyConfig(configId: string): void {
    const config = this.configs.get(configId);
    if (config) {
      config.isActive = !config.isActive;
    }
  }

  /**
   * Copy a trade
   */
  copyTrade(
    configId: string,
    originalTradeId: string,
    symbol: string,
    side: 'buy' | 'sell',
    entryPrice: number,
    quantity: number
  ): CopiedTrade {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error('Config not found');
    }

    let positionSize = quantity * entryPrice;

    if (config.positionSizing === 'percentage') {
      positionSize = (config.percentageAmount || 100) * (entryPrice / 100);
    } else if (config.positionSizing === 'fixed') {
      positionSize = config.fixedAmount || 100;
      quantity = positionSize / entryPrice;
    }

    const copiedTrade: CopiedTrade = {
      id: `trade_${Date.now()}`,
      copyConfigId: configId,
      originalTradeId,
      symbol,
      side,
      entryPrice,
      quantity,
      positionSize,
      status: 'open',
      createdAt: Date.now(),
    };

    this.copiedTrades.set(copiedTrade.id, copiedTrade);
    config.totalCopied++;

    return copiedTrade;
  }

  /**
   * Close copied trade
   */
  closeCopiedTrade(tradeId: string, exitPrice: number): CopiedTrade | undefined {
    const trade = this.copiedTrades.get(tradeId);
    if (!trade) return undefined;

    trade.exitPrice = exitPrice;
    trade.status = 'closed';
    trade.closedAt = Date.now();

    const profit = (exitPrice - trade.entryPrice) * trade.quantity;
    const profitPercentage = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;

    trade.profit = profit;
    trade.profitPercentage = profitPercentage;

    // Update config stats
    const config = this.configs.get(trade.copyConfigId);
    if (config) {
      config.totalProfit += profit;
    }

    return trade;
  }

  /**
   * Get copied trades
   */
  getCopiedTrades(configId: string, status?: 'open' | 'closed' | 'cancelled'): CopiedTrade[] {
    return Array.from(this.copiedTrades.values()).filter(
      trade => trade.copyConfigId === configId && (!status || trade.status === status)
    );
  }

  /**
   * Get trader performance
   */
  getTraderPerformance(
    traderId: string,
    period: '1d' | '7d' | '30d' | '90d' | 'all' = '30d'
  ): TraderPerformance {
    const trader = this.traders.get(traderId);
    const stats = this.traderStats.get(traderId);

    if (!trader || !stats) {
      throw new Error('Trader not found');
    }

    // Mock performance data based on period
    const periodMultipliers: Record<string, number> = {
      '1d': 0.05,
      '7d': 0.15,
      '30d': 0.4,
      '90d': 0.8,
      'all': 1,
    };

    const multiplier = periodMultipliers[period];
    const trades = Math.floor(stats.totalTrades * multiplier);
    const wins = Math.floor(stats.winningTrades * multiplier);
    const losses = Math.floor(stats.losingTrades * multiplier);

    return {
      traderId,
      period,
      trades,
      wins,
      losses,
      winRate: wins / trades,
      totalReturn: stats.totalProfit * multiplier,
      avgReturn: stats.avgWin * multiplier,
      maxDrawdown: stats.maxDrawdown,
    };
  }

  /**
   * Get copy trading statistics
   */
  getCopyTradingStats(configId: string): {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    winRate: number;
    totalProfit: number;
    avgProfit: number;
    maxProfit: number;
    maxLoss: number;
  } {
    const trades = this.getCopiedTrades(configId);
    const closedTrades = trades.filter(t => t.status === 'closed');

    const profits = closedTrades.filter(t => t.profit! > 0).map(t => t.profit!);
    const losses = closedTrades.filter(t => t.profit! < 0).map(t => t.profit!);

    const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const avgProfit = closedTrades.length > 0 ? totalProfit / closedTrades.length : 0;
    const maxProfit = profits.length > 0 ? Math.max(...profits) : 0;
    const maxLoss = losses.length > 0 ? Math.min(...losses) : 0;

    return {
      totalTrades: trades.length,
      openTrades: trades.filter(t => t.status === 'open').length,
      closedTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? profits.length / closedTrades.length : 0,
      totalProfit,
      avgProfit,
      maxProfit,
      maxLoss,
    };
  }

  /**
   * Batch copy trades
   */
  batchCopyTrades(
    configId: string,
    trades: Array<{
      originalTradeId: string;
      symbol: string;
      side: 'buy' | 'sell';
      entryPrice: number;
      quantity: number;
    }>
  ): CopiedTrade[] {
    return trades.map(trade =>
      this.copyTrade(
        configId,
        trade.originalTradeId,
        trade.symbol,
        trade.side,
        trade.entryPrice,
        trade.quantity
      )
    );
  }
}

export const copyTradingService = new CopyTradingService();
