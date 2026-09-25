/**
 * Limit Orders Service
 * Manages limit orders with price monitoring and notifications
 */

export interface LimitOrder {
  id: string;
  fromToken: string;
  toToken: string;
  triggerPrice: number;
  amount: number;
  status: 'active' | 'executed' | 'cancelled' | 'expired';
  createdAt: number;
  executedAt?: number;
  expiresAt: number;
  orderType: 'buy' | 'sell';
  currentPrice?: number;
  executionPrice?: number;
}

export interface LimitOrderConfig {
  enabled: boolean;
  maxOrders: number;
  checkInterval: number; // milliseconds
  notificationEnabled: boolean;
  expirationDays: number;
}

class LimitOrdersService {
  private orders: Map<string, LimitOrder> = new Map();
  private config: LimitOrderConfig = {
    enabled: true,
    maxOrders: 50,
    checkInterval: 30000, // 30 seconds
    notificationEnabled: true,
    expirationDays: 30,
  };

  private listeners: ((order: LimitOrder) => void)[] = [];
  private priceListeners: Map<string, (price: number) => void> = new Map();
  private checkInterval: ReturnType<typeof setTimeout> | null = null;

  /**
   * Initialize limit orders service
   */
  public async init(): Promise<void> {
    this.startPriceMonitoring();
  }

  /**
   * Create a new limit order
   */
  public async createLimitOrder(
    fromToken: string,
    toToken: string,
    triggerPrice: number,
    amount: number,
    orderType: 'buy' | 'sell'
  ): Promise<LimitOrder | null> {
    try {
      // Validate
      if (this.orders.size >= this.config.maxOrders) {
        throw new Error(`Maximum orders (${this.config.maxOrders}) reached`);
      }

      if (triggerPrice <= 0 || amount <= 0) {
        throw new Error('Invalid price or amount');
      }

      // Create order
      const order: LimitOrder = {
        id: this.generateOrderId(),
        fromToken,
        toToken,
        triggerPrice,
        amount,
        status: 'active',
        createdAt: Date.now(),
        expiresAt: Date.now() + this.config.expirationDays * 24 * 60 * 60 * 1000,
        orderType,
        currentPrice: triggerPrice,
      };

      this.orders.set(order.id, order);
      this.notifyListeners(order);

      return order;
    } catch (error) {
      console.error('[LimitOrders] Error creating order:', error);
      return null;
    }
  }

  /**
   * Cancel a limit order
   */
  public cancelLimitOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (order.status === 'active') {
      order.status = 'cancelled';
      this.notifyListeners(order);
      return true;
    }

    return false;
  }

  /**
   * Get all limit orders
   */
  public getAllOrders(): LimitOrder[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get active limit orders
   */
  public getActiveOrders(): LimitOrder[] {
    return Array.from(this.orders.values()).filter((order) => order.status === 'active');
  }

  /**
   * Get orders for token pair
   */
  public getOrdersForPair(fromToken: string, toToken: string): LimitOrder[] {
    return Array.from(this.orders.values()).filter(
      (order) => order.fromToken === fromToken && order.toToken === toToken && order.status === 'active'
    );
  }

  /**
   * Update current price for monitoring
   */
  public updatePrice(token: string, price: number): void {
    // Check all orders for this token
    for (const order of this.orders.values()) {
      if (order.status !== 'active') continue;

      // Check if price triggers the order
      const isTriggered =
        (order.orderType === 'buy' && price <= order.triggerPrice) ||
        (order.orderType === 'sell' && price >= order.triggerPrice);

      if (isTriggered) {
        this.executeOrder(order, price);
      } else {
        // Update current price
        if (order.toToken === token) {
          order.currentPrice = price;
        }
      }
    }
  }

  /**
   * Execute a limit order
   */
  private executeOrder(order: LimitOrder, executionPrice: number): void {
    order.status = 'executed';
    order.executedAt = Date.now();
    order.executionPrice = executionPrice;

    this.notifyListeners(order);

    if (this.config.notificationEnabled) {
      this.sendNotification(order);
    }

  }

  /**
   * Send notification for executed order
   */
  private sendNotification(order: LimitOrder): void {
    const message = `Limit order executed: ${order.amount} ${order.fromToken} → ${order.toToken} at ${order.executionPrice}`;
    // In a real app, this would send a push notification
  }

  /**
   * Get configuration
   */
  public getConfig(): LimitOrderConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LimitOrderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add listener for order events
   */
  public addListener(listener: (order: LimitOrder) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(order: LimitOrder): void {
    this.listeners.forEach((listener) => {
      try {
        listener(order);
      } catch (error) {
        console.error('[LimitOrders] Error in listener:', error);
      }
    });
  }

  /**
   * Start price monitoring
   */
  private startPriceMonitoring(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkExpiredOrders();
    }, this.config.checkInterval);

  }

  /**
   * Check for expired orders
   */
  private checkExpiredOrders(): void {
    const now = Date.now();

    for (const order of this.orders.values()) {
      if (order.status === 'active' && order.expiresAt < now) {
        order.status = 'expired';
        this.notifyListeners(order);
      }
    }
  }

  /**
   * Generate order ID
   */
  private generateOrderId(): string {
    return `limit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get order statistics
   */
  public getStatistics(): {
    totalOrders: number;
    activeOrders: number;
    executedOrders: number;
    cancelledOrders: number;
    expiredOrders: number;
  } {
    const orders = Array.from(this.orders.values());
    return {
      totalOrders: orders.length,
      activeOrders: orders.filter((o) => o.status === 'active').length,
      executedOrders: orders.filter((o) => o.status === 'executed').length,
      cancelledOrders: orders.filter((o) => o.status === 'cancelled').length,
      expiredOrders: orders.filter((o) => o.status === 'expired').length,
    };
  }

  /**
   * Get average execution price
   */
  public getAverageExecutionPrice(fromToken: string, toToken: string): number {
    const executedOrders = Array.from(this.orders.values()).filter(
      (o) =>
        o.fromToken === fromToken &&
        o.toToken === toToken &&
        o.status === 'executed' &&
        o.executionPrice
    );

    if (executedOrders.length === 0) return 0;

    const sum = executedOrders.reduce((acc, o) => acc + (o.executionPrice || 0), 0);
    return sum / executedOrders.length;
  }

  /**
   * Clear all orders
   */
  public clearAllOrders(): void {
    this.orders.clear();
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listeners = [];
    this.priceListeners.clear();
  }

  /**
   * Get order by ID
   */
  public getOrderById(orderId: string): LimitOrder | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get executed orders
   */
  public getExecutedOrders(): LimitOrder[] {
    return Array.from(this.orders.values()).filter((order) => order.status === 'executed');
  }

  /**
   * Validate order parameters
   */
  public validateOrder(
    fromToken: string,
    toToken: string,
    triggerPrice: number,
    amount: number
  ): { valid: boolean; error?: string } {
    if (!fromToken || !toToken) {
      return { valid: false, error: 'Invalid tokens' };
    }

    if (triggerPrice <= 0) {
      return { valid: false, error: 'Invalid trigger price' };
    }

    if (amount <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }

    if (fromToken === toToken) {
      return { valid: false, error: 'Cannot order same token' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const limitOrdersService = new LimitOrdersService();

/**
 * Hook to use limit orders service in components
 */
export function useLimitOrders() {
  return limitOrdersService;
}
