/**
 * Limit Order & Advanced Trading Service
 * Limit orders, stop-loss, take-profit with conditional execution
 */

export interface LimitOrder {
  id: string;
  userId: string;
  pair: string; // e.g., "ETH/USDC"
  side: 'buy' | 'sell';
  amount: number;
  limitPrice: number;
  status: 'pending' | 'partially_filled' | 'filled' | 'cancelled' | 'expired';
  filledAmount: number;
  averagePrice: number;
  createdAt: number;
  expiresAt: number;
  filledAt?: number;
  cancelledAt?: number;
}

export interface StopLossOrder {
  id: string;
  userId: string;
  pair: string;
  triggerPrice: number;
  limitPrice: number;
  amount: number;
  status: 'active' | 'triggered' | 'filled' | 'cancelled';
  createdAt: number;
  triggeredAt?: number;
  filledAt?: number;
  cancelledAt?: number;
}

export interface TakeProfitOrder {
  id: string;
  userId: string;
  pair: string;
  triggerPrice: number;
  limitPrice: number;
  amount: number;
  status: 'active' | 'triggered' | 'filled' | 'cancelled';
  createdAt: number;
  triggeredAt?: number;
  filledAt?: number;
  cancelledAt?: number;
}

export interface TrailingStopOrder {
  id: string;
  userId: string;
  pair: string;
  trailingPercent: number;
  limitPrice: number;
  amount: number;
  highestPrice: number;
  status: 'active' | 'triggered' | 'filled' | 'cancelled';
  createdAt: number;
  triggeredAt?: number;
  filledAt?: number;
}

export interface OrderHistory {
  id: string;
  userId: string;
  orderId: string;
  orderType: 'limit' | 'stop_loss' | 'take_profit' | 'trailing_stop';
  action: 'created' | 'triggered' | 'filled' | 'cancelled' | 'expired';
  price: number;
  amount: number;
  timestamp: number;
}

export interface TradeExecution {
  id: string;
  orderId: string;
  executedPrice: number;
  executedAmount: number;
  fee: number;
  executedAt: number;
}

class LimitOrderAdvancedTradingService {
  private limitOrders: Map<string, LimitOrder> = new Map();
  private stopLossOrders: Map<string, StopLossOrder> = new Map();
  private takeProfitOrders: Map<string, TakeProfitOrder> = new Map();
  private trailingStopOrders: Map<string, TrailingStopOrder> = new Map();
  private orderHistory: Map<string, OrderHistory> = new Map();
  private tradeExecutions: Map<string, TradeExecution> = new Map();
  private currentPrices: Map<string, number> = new Map();

  constructor() {
    this.initializeCurrentPrices();
  }

  /**
   * Initialize current prices
   */
  private initializeCurrentPrices(): void {
    const pairs = ['ETH/USDC', 'BTC/USDC', 'SOL/USDC', 'MATIC/USDC', 'USDT/USDC'];
    const prices: Record<string, number> = {
      'ETH/USDC': 2500,
      'BTC/USDC': 45000,
      'SOL/USDC': 100,
      'MATIC/USDC': 1.5,
      'USDT/USDC': 1,
    };

    for (const pair of pairs) {
      this.currentPrices.set(pair, prices[pair] || 0);
    }
  }

  /**
   * Create limit order
   */
  createLimitOrder(
    userId: string,
    pair: string,
    side: 'buy' | 'sell',
    amount: number,
    limitPrice: number,
    expirationDays: number = 30
  ): LimitOrder {
    const order: LimitOrder = {
      id: `limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pair,
      side,
      amount,
      limitPrice,
      status: 'pending',
      filledAmount: 0,
      averagePrice: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + (expirationDays * 24 * 60 * 60 * 1000),
    };

    this.limitOrders.set(order.id, order);

    // Record order creation
    this.recordOrderHistory(order.id, 'limit', 'created', limitPrice, 0);

    // Check if order can be filled immediately
    this.checkAndFillLimitOrder(order.id);

    return order;
  }

  /**
   * Create stop-loss order
   */
  createStopLossOrder(
    userId: string,
    pair: string,
    triggerPrice: number,
    limitPrice: number,
    amount: number
  ): StopLossOrder {
    const order: StopLossOrder = {
      id: `sl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pair,
      triggerPrice,
      limitPrice,
      amount,
      status: 'active',
      createdAt: Date.now(),
    };

    this.stopLossOrders.set(order.id, order);

    // Record order creation
    this.recordOrderHistory(order.id, 'stop_loss', 'created', triggerPrice, 0);

    return order;
  }

  /**
   * Create take-profit order
   */
  createTakeProfitOrder(
    userId: string,
    pair: string,
    triggerPrice: number,
    limitPrice: number,
    amount: number
  ): TakeProfitOrder {
    const order: TakeProfitOrder = {
      id: `tp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pair,
      triggerPrice,
      limitPrice,
      amount,
      status: 'active',
      createdAt: Date.now(),
    };

    this.takeProfitOrders.set(order.id, order);

    // Record order creation
    this.recordOrderHistory(order.id, 'take_profit', 'created', triggerPrice, 0);

    return order;
  }

  /**
   * Create trailing stop order
   */
  createTrailingStopOrder(
    userId: string,
    pair: string,
    trailingPercent: number,
    amount: number
  ): TrailingStopOrder {
    const currentPrice = this.currentPrices.get(pair) || 0;

    const order: TrailingStopOrder = {
      id: `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      pair,
      trailingPercent,
      limitPrice: currentPrice * (1 - trailingPercent / 100),
      amount,
      highestPrice: currentPrice,
      status: 'active',
      createdAt: Date.now(),
    };

    this.trailingStopOrders.set(order.id, order);

    // Record order creation
    this.recordOrderHistory(order.id, 'trailing_stop', 'created', currentPrice, 0);

    return order;
  }

  /**
   * Check and fill limit order
   */
  private checkAndFillLimitOrder(orderId: string): void {
    const order = this.limitOrders.get(orderId);
    if (!order) return;
    if (order.status !== 'pending') return;

    const currentPrice = this.currentPrices.get(order.pair) || 0;

    // Check if order can be filled
    const canFill = (order.side === 'buy' && currentPrice <= order.limitPrice) ||
                    (order.side === 'sell' && currentPrice >= order.limitPrice);

    if (canFill) {
      order.filledAmount = order.amount;
      order.averagePrice = currentPrice;
      order.status = 'filled';
      order.filledAt = Date.now();

      // Record execution
      this.recordTradeExecution(orderId, currentPrice, order.amount);
      this.recordOrderHistory(orderId, 'limit', 'filled', currentPrice, order.amount);
    }
  }

  /**
   * Cancel limit order
   */
  cancelLimitOrder(orderId: string): boolean {
    const order = this.limitOrders.get(orderId);
    if (!order) return false;
    if (order.status === 'filled' || order.status === 'cancelled') return false;

    order.status = 'cancelled';
    order.cancelledAt = Date.now();

    this.recordOrderHistory(orderId, 'limit', 'cancelled', order.limitPrice, 0);

    return true;
  }

  /**
   * Cancel stop-loss order
   */
  cancelStopLossOrder(orderId: string): boolean {
    const order = this.stopLossOrders.get(orderId);
    if (!order) return false;
    if (order.status !== 'active') return false;

    order.status = 'cancelled';
    order.cancelledAt = Date.now();

    this.recordOrderHistory(orderId, 'stop_loss', 'cancelled', order.triggerPrice, 0);

    return true;
  }

  /**
   * Get limit order
   */
  getLimitOrder(orderId: string): LimitOrder | undefined {
    return this.limitOrders.get(orderId);
  }

  /**
   * Get stop-loss order
   */
  getStopLossOrder(orderId: string): StopLossOrder | undefined {
    return this.stopLossOrders.get(orderId);
  }

  /**
   * Get take-profit order
   */
  getTakeProfitOrder(orderId: string): TakeProfitOrder | undefined {
    return this.takeProfitOrders.get(orderId);
  }

  /**
   * Get user limit orders
   */
  getUserLimitOrders(userId: string, status?: string): LimitOrder[] {
    let orders = Array.from(this.limitOrders.values()).filter(o => o.userId === userId);

    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    return orders.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get user stop-loss orders
   */
  getUserStopLossOrders(userId: string): StopLossOrder[] {
    return Array.from(this.stopLossOrders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get user take-profit orders
   */
  getUserTakeProfitOrders(userId: string): TakeProfitOrder[] {
    return Array.from(this.takeProfitOrders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Record order history
   */
  private recordOrderHistory(
    orderId: string,
    orderType: 'limit' | 'stop_loss' | 'take_profit' | 'trailing_stop',
    action: 'created' | 'triggered' | 'filled' | 'cancelled' | 'expired',
    price: number,
    amount: number
  ): void {
    const history: OrderHistory = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: '', // Will be set from order
      orderId,
      orderType,
      action,
      price,
      amount,
      timestamp: Date.now(),
    };

    this.orderHistory.set(history.id, history);
  }

  /**
   * Record trade execution
   */
  private recordTradeExecution(orderId: string, price: number, amount: number): void {
    const execution: TradeExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      executedPrice: price,
      executedAmount: amount,
      fee: (price * amount * 0.001), // 0.1% fee
      executedAt: Date.now(),
    };

    this.tradeExecutions.set(execution.id, execution);
  }

  /**
   * Update current price
   */
  updateCurrentPrice(pair: string, price: number): void {
    this.currentPrices.set(pair, price);

    // Check for triggered orders
    this.checkTriggeredOrders(pair, price);
  }

  /**
   * Check for triggered orders
   */
  private checkTriggeredOrders(pair: string, currentPrice: number): void {
    // Check stop-loss orders
    for (const order of this.stopLossOrders.values()) {
      if (order.pair === pair && order.status === 'active' && currentPrice <= order.triggerPrice) {
        order.status = 'triggered';
        order.triggeredAt = Date.now();
        this.recordOrderHistory(order.id, 'stop_loss', 'triggered', currentPrice, 0);
      }
    }

    // Check take-profit orders
    for (const order of this.takeProfitOrders.values()) {
      if (order.pair === pair && order.status === 'active' && currentPrice >= order.triggerPrice) {
        order.status = 'triggered';
        order.triggeredAt = Date.now();
        this.recordOrderHistory(order.id, 'take_profit', 'triggered', currentPrice, 0);
      }
    }

    // Check trailing stop orders
    for (const order of this.trailingStopOrders.values()) {
      if (order.pair === pair && order.status === 'active') {
        if (currentPrice > order.highestPrice) {
          order.highestPrice = currentPrice;
          order.limitPrice = currentPrice * (1 - order.trailingPercent / 100);
        }

        if (currentPrice <= order.limitPrice) {
          order.status = 'triggered';
          order.triggeredAt = Date.now();
          this.recordOrderHistory(order.id, 'trailing_stop', 'triggered', currentPrice, 0);
        }
      }
    }
  }

  /**
   * Get order history
   */
  getOrderHistory(orderId: string): OrderHistory[] {
    return Array.from(this.orderHistory.values())
      .filter(h => h.orderId === orderId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get trade executions
   */
  getTradeExecutions(orderId: string): TradeExecution[] {
    return Array.from(this.tradeExecutions.values())
      .filter(e => e.orderId === orderId)
      .sort((a, b) => b.executedAt - a.executedAt);
  }

  /**
   * Get order statistics
   */
  getOrderStatistics(userId: string): {
    totalOrders: number;
    filledOrders: number;
    cancelledOrders: number;
    averageFillPrice: number;
    totalFees: number;
  } {
    const orders = this.getUserLimitOrders(userId);
    const filledOrders = orders.filter(o => o.status === 'filled');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    const averageFillPrice = filledOrders.length > 0
      ? filledOrders.reduce((sum, o) => sum + o.averagePrice, 0) / filledOrders.length
      : 0;

    const totalFees = Array.from(this.tradeExecutions.values())
      .filter(e => {
        const order = this.limitOrders.get(e.orderId);
        return order?.userId === userId;
      })
      .reduce((sum, e) => sum + e.fee, 0);

    return {
      totalOrders: orders.length,
      filledOrders: filledOrders.length,
      cancelledOrders: cancelledOrders.length,
      averageFillPrice,
      totalFees,
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
}

export const limitOrderAdvancedTradingService = new LimitOrderAdvancedTradingService();
