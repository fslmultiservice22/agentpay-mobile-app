/**
 * Perpetual Futures Trading Service
 * Leverage trading with margin, liquidation, and position management
 */

export interface PerpetualPosition {
  id: string;
  userId: string;
  pair: string; // e.g., "ETH/USDC"
  side: 'long' | 'short';
  leverage: number; // 1-10x
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  margin: number;
  notionalValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  fundingRate: number;
  liquidationPrice: number;
  status: 'open' | 'closing' | 'closed' | 'liquidated';
  createdAt: number;
  closedAt?: number;
  takeProfitPrice?: number;
  stopLossPrice?: number;
}

export interface FundingRate {
  pair: string;
  rate: number; // percentage per 8 hours
  nextFundingTime: number;
  fundingHistory: Array<{ timestamp: number; rate: number }>;
}

export interface LiquidationEvent {
  id: string;
  positionId: string;
  userId: string;
  pair: string;
  liquidationPrice: number;
  liquidatedAt: number;
  remainingMargin: number;
  insuranceFundPayout: number;
}

export interface TradeHistory {
  id: string;
  userId: string;
  pair: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  fundingPaid: number;
  fees: number;
  openedAt: number;
  closedAt: number;
  duration: number; // in milliseconds
}

export interface MarginAccount {
  userId: string;
  totalMargin: number;
  usedMargin: number;
  availableMargin: number;
  maintenanceMargin: number;
  marginRatio: number;
  status: 'healthy' | 'warning' | 'danger';
}

class PerpetualFuturesService {
  private positions: Map<string, PerpetualPosition> = new Map();
  private fundingRates: Map<string, FundingRate> = new Map();
  private liquidationEvents: Map<string, LiquidationEvent> = new Map();
  private tradeHistory: Map<string, TradeHistory> = new Map();
  private marginAccounts: Map<string, MarginAccount> = new Map();
  private currentPrices: Map<string, number> = new Map();
  private insuranceFund: number = 1000000; // $1M insurance fund

  constructor() {
    this.initializeMarkets();
  }

  /**
   * Initialize perpetual markets
   */
  private initializeMarkets(): void {
    const pairs = ['ETH/USDC', 'BTC/USDC', 'SOL/USDC', 'MATIC/USDC', 'AVAX/USDC'];
    const prices: Record<string, number> = {
      'ETH/USDC': 2500,
      'BTC/USDC': 45000,
      'SOL/USDC': 100,
      'MATIC/USDC': 1.5,
      'AVAX/USDC': 35,
    };

    for (const pair of pairs) {
      this.currentPrices.set(pair, prices[pair] || 0);
      this.fundingRates.set(pair, {
        pair,
        rate: (Math.random() - 0.5) * 0.01, // -0.5% to +0.5%
        nextFundingTime: Date.now() + (8 * 60 * 60 * 1000),
        fundingHistory: [],
      });
    }
  }

  /**
   * Open perpetual position
   */
  openPosition(
    userId: string,
    pair: string,
    side: 'long' | 'short',
    leverage: number,
    margin: number,
    takeProfitPrice?: number,
    stopLossPrice?: number
  ): PerpetualPosition {
    if (leverage < 1 || leverage > 10) {
      throw new Error('Leverage must be between 1x and 10x');
    }

    const currentPrice = this.currentPrices.get(pair) || 0;
    const notionalValue = margin * leverage;
    const quantity = notionalValue / currentPrice;

    // Calculate liquidation price
    const liquidationPrice = side === 'long'
      ? currentPrice * (1 - (1 / leverage) * 0.95) // 95% of margin
      : currentPrice * (1 + (1 / leverage) * 0.95);

    const position: PerpetualPosition = {
      id: `perp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pair,
      side,
      leverage,
      entryPrice: currentPrice,
      currentPrice,
      quantity,
      margin,
      notionalValue,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      fundingRate: this.fundingRates.get(pair)?.rate || 0,
      liquidationPrice,
      status: 'open',
      createdAt: Date.now(),
      takeProfitPrice,
      stopLossPrice,
    };

    this.positions.set(position.id, position);

    // Update margin account
    this.updateMarginAccount(userId, margin, 'add');

    return position;
  }

  /**
   * Close perpetual position
   */
  closePosition(positionId: string, exitPrice?: number): TradeHistory {
    const position = this.positions.get(positionId);
    if (!position) throw new Error('Position not found');
    if (position.status !== 'open') throw new Error('Position is not open');

    const currentPrice = exitPrice || this.currentPrices.get(position.pair) || 0;

    // Calculate P&L
    const priceDifference = position.side === 'long'
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice;

    const realizedPnL = priceDifference * position.quantity;
    const realizedPnLPercent = (realizedPnL / position.margin) * 100;

    // Calculate funding paid
    const daysOpen = (Date.now() - position.createdAt) / (1000 * 60 * 60 * 24);
    const fundingPaid = position.notionalValue * position.fundingRate * (daysOpen / 3); // Funding every 8 hours

    // Calculate fees (0.05% entry + 0.05% exit)
    const fees = position.notionalValue * 0.001;

    const history: TradeHistory = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: position.userId,
      pair: position.pair,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice: currentPrice,
      quantity: position.quantity,
      leverage: position.leverage,
      realizedPnL,
      realizedPnLPercent,
      fundingPaid,
      fees,
      openedAt: position.createdAt,
      closedAt: Date.now(),
      duration: Date.now() - position.createdAt,
    };

    this.tradeHistory.set(history.id, history);

    // Update position status
    position.status = 'closed';
    position.closedAt = Date.now();

    // Update margin account
    this.updateMarginAccount(position.userId, position.margin, 'remove');

    return history;
  }

  /**
   * Update position price
   */
  updatePositionPrice(pair: string, newPrice: number): void {
    this.currentPrices.set(pair, newPrice);

    // Update all positions for this pair
    for (const position of this.positions.values()) {
      if (position.pair === pair && position.status === 'open') {
        position.currentPrice = newPrice;

        // Calculate unrealized P&L
        const priceDifference = position.side === 'long'
          ? newPrice - position.entryPrice
          : position.entryPrice - newPrice;

        position.unrealizedPnL = priceDifference * position.quantity;
        position.unrealizedPnLPercent = (position.unrealizedPnL / position.margin) * 100;

        // Check for liquidation
        if (this.shouldLiquidate(position)) {
          this.liquidatePosition(position.id);
        }

        // Check for take-profit/stop-loss
        if (position.takeProfitPrice && newPrice >= position.takeProfitPrice && position.side === 'long') {
          this.closePosition(position.id, position.takeProfitPrice);
        } else if (position.stopLossPrice && newPrice <= position.stopLossPrice && position.side === 'long') {
          this.closePosition(position.id, position.stopLossPrice);
        } else if (position.takeProfitPrice && newPrice <= position.takeProfitPrice && position.side === 'short') {
          this.closePosition(position.id, position.takeProfitPrice);
        } else if (position.stopLossPrice && newPrice >= position.stopLossPrice && position.side === 'short') {
          this.closePosition(position.id, position.stopLossPrice);
        }
      }
    }
  }

  /**
   * Check if position should be liquidated
   */
  private shouldLiquidate(position: PerpetualPosition): boolean {
    const maintenanceMargin = position.notionalValue * 0.05; // 5% maintenance margin
    const marginRatio = position.margin / maintenanceMargin;

    return marginRatio < 1;
  }

  /**
   * Liquidate position
   */
  private liquidatePosition(positionId: string): void {
    const position = this.positions.get(positionId);
    if (!position) return;

    const liquidationPrice = position.liquidationPrice;
    const remainingMargin = position.margin - Math.abs(position.unrealizedPnL);

    const event: LiquidationEvent = {
      id: `liq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      positionId,
      userId: position.userId,
      pair: position.pair,
      liquidationPrice,
      liquidatedAt: Date.now(),
      remainingMargin: Math.max(0, remainingMargin),
      insuranceFundPayout: Math.max(0, -remainingMargin),
    };

    this.liquidationEvents.set(event.id, event);

    // Update insurance fund
    if (event.insuranceFundPayout > 0) {
      this.insuranceFund -= event.insuranceFundPayout;
    }

    position.status = 'liquidated';
    position.closedAt = Date.now();

    // Update margin account
    this.updateMarginAccount(position.userId, position.margin, 'remove');
  }

  /**
   * Add margin to position
   */
  addMargin(positionId: string, additionalMargin: number): boolean {
    const position = this.positions.get(positionId);
    if (!position) return false;
    if (position.status !== 'open') return false;

    position.margin += additionalMargin;
    position.notionalValue = position.margin * position.leverage;

    // Recalculate liquidation price
    position.liquidationPrice = position.side === 'long'
      ? position.entryPrice * (1 - (1 / position.leverage) * 0.95)
      : position.entryPrice * (1 + (1 / position.leverage) * 0.95);

    this.updateMarginAccount(position.userId, additionalMargin, 'add');

    return true;
  }

  /**
   * Remove margin from position
   */
  removeMargin(positionId: string, marginToRemove: number): boolean {
    const position = this.positions.get(positionId);
    if (!position) return false;
    if (position.status !== 'open') return false;
    if (marginToRemove > position.margin) return false;

    position.margin -= marginToRemove;
    position.notionalValue = position.margin * position.leverage;

    this.updateMarginAccount(position.userId, marginToRemove, 'remove');

    return true;
  }

  /**
   * Get user positions
   */
  getUserPositions(userId: string, status?: string): PerpetualPosition[] {
    let positions = Array.from(this.positions.values()).filter(p => p.userId === userId);

    if (status) {
      positions = positions.filter(p => p.status === status);
    }

    return positions.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get margin account
   */
  getMarginAccount(userId: string): MarginAccount {
    let account = this.marginAccounts.get(userId);

    if (!account) {
      account = {
        userId,
        totalMargin: 0,
        usedMargin: 0,
        availableMargin: 0,
        maintenanceMargin: 0,
        marginRatio: 0,
        status: 'healthy',
      };
    }

    // Calculate used margin
    const userPositions = this.getUserPositions(userId, 'open');
    account.usedMargin = userPositions.reduce((sum, p) => sum + p.margin, 0);
    account.maintenanceMargin = userPositions.reduce((sum, p) => sum + (p.notionalValue * 0.05), 0);
    account.availableMargin = account.totalMargin - account.usedMargin;
    account.marginRatio = account.maintenanceMargin > 0 ? account.usedMargin / account.maintenanceMargin : 0;

    // Determine status
    if (account.marginRatio > 1.5) {
      account.status = 'healthy';
    } else if (account.marginRatio > 1) {
      account.status = 'warning';
    } else {
      account.status = 'danger';
    }

    return account;
  }

  /**
   * Update margin account
   */
  private updateMarginAccount(userId: string, amount: number, action: 'add' | 'remove'): void {
    let account = this.marginAccounts.get(userId);

    if (!account) {
      account = {
        userId,
        totalMargin: 0,
        usedMargin: 0,
        availableMargin: 0,
        maintenanceMargin: 0,
        marginRatio: 0,
        status: 'healthy',
      };
      this.marginAccounts.set(userId, account);
    }

    if (action === 'add') {
      account.totalMargin += amount;
    } else {
      account.totalMargin = Math.max(0, account.totalMargin - amount);
    }
  }

  /**
   * Get funding rate
   */
  getFundingRate(pair: string): FundingRate | undefined {
    return this.fundingRates.get(pair);
  }

  /**
   * Get trade history
   */
  getUserTradeHistory(userId: string): TradeHistory[] {
    return Array.from(this.tradeHistory.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.closedAt - a.closedAt);
  }

  /**
   * Get liquidation events
   */
  getUserLiquidationEvents(userId: string): LiquidationEvent[] {
    return Array.from(this.liquidationEvents.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => b.liquidatedAt - a.liquidatedAt);
  }

  /**
   * Get trading statistics
   */
  getTradingStatistics(userId: string): {
    totalTrades: number;
    winRate: number;
    totalPnL: number;
    averageRoi: number;
    maxDrawdown: number;
    liquidations: number;
  } {
    const trades = this.getUserTradeHistory(userId);
    const liquidations = this.getUserLiquidationEvents(userId).length;

    const winningTrades = trades.filter(t => t.realizedPnL > 0).length;
    const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

    const totalPnL = trades.reduce((sum, t) => sum + t.realizedPnL, 0);
    const totalMarginUsed = trades.reduce((sum, t) => sum + t.leverage, 0);
    const averageRoi = trades.length > 0 ? totalPnL / totalMarginUsed : 0;

    // Calculate max drawdown (simplified)
    let maxDrawdown = 0;
    let peak = 0;
    for (const trade of trades) {
      peak = Math.max(peak, trade.realizedPnL);
      maxDrawdown = Math.min(maxDrawdown, trade.realizedPnL - peak);
    }

    return {
      totalTrades: trades.length,
      winRate,
      totalPnL,
      averageRoi,
      maxDrawdown: Math.abs(maxDrawdown),
      liquidations,
    };
  }

  /**
   * Get supported pairs
   */
  getSupportedPairs(): string[] {
    return Array.from(this.currentPrices.keys());
  }

  /**
   * Get current price
   */
  getCurrentPrice(pair: string): number {
    return this.currentPrices.get(pair) || 0;
  }

  /**
   * Get insurance fund balance
   */
  getInsuranceFundBalance(): number {
    return this.insuranceFund;
  }
}

export const perpetualFuturesService = new PerpetualFuturesService();
