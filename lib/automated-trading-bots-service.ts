/**
 * Automated Trading Bots Service
 * DCA bots, grid trading, stop-loss automation with backtesting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DCABot {
  id: string;
  name: string;
  assetId: string;
  assetSymbol: string;
  investmentAmount: number;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  nextExecutionTime: number;
  totalInvested: number;
  totalUnits: number;
  averageCost: number;
  isActive: boolean;
  createdAt: number;
  executionHistory: Array<{
    timestamp: number;
    price: number;
    amount: number;
    units: number;
    status: 'success' | 'failed';
  }>;
}

export interface GridTradingBot {
  id: string;
  name: string;
  assetId: string;
  assetSymbol: string;
  lowerPrice: number;
  upperPrice: number;
  gridLevels: number;
  investmentPerGrid: number;
  isActive: boolean;
  createdAt: number;
  gridOrders: Array<{
    level: number;
    price: number;
    amount: number;
    status: 'pending' | 'executed' | 'cancelled';
    executedAt?: number;
  }>;
}

export interface StopLossBot {
  id: string;
  name: string;
  assetId: string;
  assetSymbol: string;
  triggerPrice: number;
  sellPercentage: number;
  isActive: boolean;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  executionHistory: Array<{
    timestamp: number;
    price: number;
    amount: number;
    status: 'success' | 'failed';
  }>;
}

export interface BacktestResult {
  botId: string;
  botType: 'dca' | 'grid' | 'stop_loss';
  startDate: number;
  endDate: number;
  initialInvestment: number;
  finalValue: number;
  totalReturn: number;
  returnPercentage: number;
  trades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

class AutomatedTradingBotsService {
  private dcaBots: Map<string, DCABot> = new Map();
  private gridTradingBots: Map<string, GridTradingBot> = new Map();
  private stopLossBots: Map<string, StopLossBot> = new Map();
  private backtestResults: Map<string, BacktestResult> = new Map();

  private readonly DCA_BOTS_STORAGE_KEY = 'trading_dca_bots';
  private readonly GRID_BOTS_STORAGE_KEY = 'trading_grid_bots';
  private readonly STOP_LOSS_BOTS_STORAGE_KEY = 'trading_stop_loss_bots';
  private readonly BACKTEST_STORAGE_KEY = 'trading_backtest_results';

  constructor() {
    this.loadBots();
  }

  /**
   * Create DCA Bot
   */
  async createDCABot(
    name: string,
    assetId: string,
    assetSymbol: string,
    investmentAmount: number,
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  ): Promise<DCABot> {
    const bot: DCABot = {
      id: `dca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      assetId,
      assetSymbol,
      investmentAmount,
      frequency,
      nextExecutionTime: Date.now(),
      totalInvested: 0,
      totalUnits: 0,
      averageCost: 0,
      isActive: true,
      createdAt: Date.now(),
      executionHistory: [],
    };

    this.dcaBots.set(bot.id, bot);
    await this.persistBots();

    return bot;
  }

  /**
   * Execute DCA Bot
   */
  async executeDCABot(botId: string, currentPrice: number): Promise<boolean> {
    const bot = this.dcaBots.get(botId);
    if (!bot || !bot.isActive) return false;

    const units = bot.investmentAmount / currentPrice;
    const execution = {
      timestamp: Date.now(),
      price: currentPrice,
      amount: bot.investmentAmount,
      units,
      status: 'success' as const,
    };

    bot.executionHistory.push(execution);
    bot.totalInvested += bot.investmentAmount;
    bot.totalUnits += units;
    bot.averageCost = bot.totalInvested / bot.totalUnits;

    // Calculate next execution time
    const frequencyMs = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      biweekly: 14 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    bot.nextExecutionTime = Date.now() + frequencyMs[bot.frequency];

    await this.persistBots();
    return true;
  }

  /**
   * Get DCA Bots
   */
  getDCABots(): DCABot[] {
    return Array.from(this.dcaBots.values());
  }

  /**
   * Create Grid Trading Bot
   */
  async createGridTradingBot(
    name: string,
    assetId: string,
    assetSymbol: string,
    lowerPrice: number,
    upperPrice: number,
    gridLevels: number,
    investmentPerGrid: number
  ): Promise<GridTradingBot> {
    const gridOrders = [];
    const priceStep = (upperPrice - lowerPrice) / (gridLevels - 1);

    for (let i = 0; i < gridLevels; i++) {
      const price = lowerPrice + priceStep * i;
      gridOrders.push({
        level: i + 1,
        price,
        amount: investmentPerGrid,
        status: 'pending' as const,
      });
    }

    const bot: GridTradingBot = {
      id: `grid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      assetId,
      assetSymbol,
      lowerPrice,
      upperPrice,
      gridLevels,
      investmentPerGrid,
      isActive: true,
      createdAt: Date.now(),
      gridOrders,
    };

    this.gridTradingBots.set(bot.id, bot);
    await this.persistBots();

    return bot;
  }

  /**
   * Execute Grid Trading Bot Order
   */
  async executeGridOrder(botId: string, level: number, currentPrice: number): Promise<boolean> {
    const bot = this.gridTradingBots.get(botId);
    if (!bot) return false;

    const order = bot.gridOrders.find(o => o.level === level);
    if (!order) return false;

    order.status = 'executed';
    order.executedAt = Date.now();

    await this.persistBots();
    return true;
  }

  /**
   * Get Grid Trading Bots
   */
  getGridTradingBots(): GridTradingBot[] {
    return Array.from(this.gridTradingBots.values());
  }

  /**
   * Create Stop Loss Bot
   */
  async createStopLossBot(
    name: string,
    assetId: string,
    assetSymbol: string,
    triggerPrice: number,
    sellPercentage: number
  ): Promise<StopLossBot> {
    const bot: StopLossBot = {
      id: `stop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      assetId,
      assetSymbol,
      triggerPrice,
      sellPercentage,
      isActive: true,
      createdAt: Date.now(),
      triggered: false,
      executionHistory: [],
    };

    this.stopLossBots.set(bot.id, bot);
    await this.persistBots();

    return bot;
  }

  /**
   * Check and execute stop loss
   */
  async checkStopLoss(botId: string, currentPrice: number, holdingAmount: number): Promise<boolean> {
    const bot = this.stopLossBots.get(botId);
    if (!bot || !bot.isActive || bot.triggered) return false;

    if (currentPrice <= bot.triggerPrice) {
      const sellAmount = (holdingAmount * bot.sellPercentage) / 100;

      const execution = {
        timestamp: Date.now(),
        price: currentPrice,
        amount: sellAmount,
        status: 'success' as const,
      };

      bot.executionHistory.push(execution);
      bot.triggered = true;
      bot.triggeredAt = Date.now();

      await this.persistBots();
      return true;
    }

    return false;
  }

  /**
   * Get Stop Loss Bots
   */
  getStopLossBots(): StopLossBot[] {
    return Array.from(this.stopLossBots.values());
  }

  /**
   * Backtest DCA Bot
   */
  async backtestDCABot(
    botId: string,
    historicalPrices: Array<{ timestamp: number; price: number }>,
    startDate: number,
    endDate: number
  ): Promise<BacktestResult> {
    const bot = this.dcaBots.get(botId);
    if (!bot) throw new Error('Bot not found');

    let totalInvested = 0;
    let totalUnits = 0;
    let trades = 0;

    const frequencyMs = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      biweekly: 14 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
    };

    let nextExecutionTime = startDate;

    for (const pricePoint of historicalPrices) {
      if (pricePoint.timestamp >= nextExecutionTime && pricePoint.timestamp <= endDate) {
        const units = bot.investmentAmount / pricePoint.price;
        totalInvested += bot.investmentAmount;
        totalUnits += units;
        trades++;
        nextExecutionTime += frequencyMs[bot.frequency];
      }
    }

    const finalPrice = historicalPrices[historicalPrices.length - 1].price;
    const finalValue = totalUnits * finalPrice;
    const totalReturn = finalValue - totalInvested;
    const returnPercentage = (totalReturn / totalInvested) * 100;

    const result: BacktestResult = {
      botId,
      botType: 'dca',
      startDate,
      endDate,
      initialInvestment: totalInvested,
      finalValue,
      totalReturn,
      returnPercentage,
      trades,
      successfulTrades: trades,
      failedTrades: 0,
      winRate: 100,
      maxDrawdown: 0,
      sharpeRatio: 0,
    };

    this.backtestResults.set(`${botId}_${Date.now()}`, result);
    await this.persistBots();

    return result;
  }

  /**
   * Get backtest results
   */
  getBacktestResults(botId?: string): BacktestResult[] {
    const results = Array.from(this.backtestResults.values());
    if (botId) {
      return results.filter(r => r.botId === botId);
    }
    return results;
  }

  /**
   * Persist bots
   */
  private async persistBots(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.DCA_BOTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.dcaBots))),
        AsyncStorage.setItem(this.GRID_BOTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.gridTradingBots))),
        AsyncStorage.setItem(this.STOP_LOSS_BOTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.stopLossBots))),
        AsyncStorage.setItem(this.BACKTEST_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.backtestResults))),
      ]);
    } catch (error) {
      console.error('Failed to persist trading bots:', error);
    }
  }

  /**
   * Load bots
   */
  private async loadBots(): Promise<void> {
    try {
      const [dcaBots, gridBots, stopLossBots, backtestResults] = await Promise.all([
        AsyncStorage.getItem(this.DCA_BOTS_STORAGE_KEY),
        AsyncStorage.getItem(this.GRID_BOTS_STORAGE_KEY),
        AsyncStorage.getItem(this.STOP_LOSS_BOTS_STORAGE_KEY),
        AsyncStorage.getItem(this.BACKTEST_STORAGE_KEY),
      ]);

      if (dcaBots) this.dcaBots = new Map(Object.entries(JSON.parse(dcaBots)));
      if (gridBots) this.gridTradingBots = new Map(Object.entries(JSON.parse(gridBots)));
      if (stopLossBots) this.stopLossBots = new Map(Object.entries(JSON.parse(stopLossBots)));
      if (backtestResults) this.backtestResults = new Map(Object.entries(JSON.parse(backtestResults)));
    } catch (error) {
      console.error('Failed to load trading bots:', error);
    }
  }
}

export const automatedTradingBotsService = new AutomatedTradingBotsService();
