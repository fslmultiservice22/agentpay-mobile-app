export type OrderType = 'limit' | 'market' | 'stop-loss';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'partially_filled';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Order {
  id: string;
  type: OrderType;
  side: OrderSide;
  symbol: string;
  price: number;
  amount: number;
  status: OrderStatus;
  filledAmount: number;
  createdAt: number;
  updatedAt: number;
  triggerPrice?: number;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
}

export interface TradingMetrics {
  totalOrders: number;
  openOrders: number;
  filledOrders: number;
  totalVolume: number;
  winRate: number;
  averageProfit: number;
  largestWin: number;
  largestLoss: number;
}

/**
 * Generate mock candlestick data
 */
export function generateMockCandles(symbol: string, count: number = 100): Candle[] {
  const candles: Candle[] = [];
  let price = 2500;

  for (let i = count; i > 0; i--) {
    const timestamp = Date.now() - i * 3600000; // 1 hour intervals
    const change = (Math.random() - 0.5) * 100;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;
    const volume = Math.random() * 1000;

    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }

  return candles;
}

/**
 * Generate mock orders
 */
export function generateMockOrders(): Order[] {
  return [
    {
      id: '1',
      type: 'limit',
      side: 'buy',
      symbol: 'ETH/USDC',
      price: 2400,
      amount: 1.5,
      status: 'open',
      filledAmount: 0,
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
    },
    {
      id: '2',
      type: 'limit',
      side: 'sell',
      symbol: 'ETH/USDC',
      price: 2800,
      amount: 1.0,
      status: 'open',
      filledAmount: 0,
      createdAt: Date.now() - 7200000,
      updatedAt: Date.now() - 7200000,
    },
    {
      id: '3',
      type: 'stop-loss',
      side: 'sell',
      symbol: 'ETH/USDC',
      price: 2200,
      amount: 2.0,
      status: 'open',
      filledAmount: 0,
      createdAt: Date.now() - 10800000,
      updatedAt: Date.now() - 10800000,
      triggerPrice: 2100,
    },
    {
      id: '4',
      type: 'market',
      side: 'buy',
      symbol: 'ETH/USDC',
      price: 2500,
      amount: 0.5,
      status: 'filled',
      filledAmount: 0.5,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
    },
  ];
}

/**
 * Generate mock order book
 */
export function generateMockOrderBook(symbol: string): OrderBook {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  let price = 2500;

  // Generate bids (buy orders)
  for (let i = 0; i < 10; i++) {
    price -= Math.random() * 10;
    const amount = Math.random() * 10;
    bids.push({
      price: Math.round(price * 100) / 100,
      amount,
      total: Math.round(price * amount * 100) / 100,
    });
  }

  // Generate asks (sell orders)
  price = 2500;
  for (let i = 0; i < 10; i++) {
    price += Math.random() * 10;
    const amount = Math.random() * 10;
    asks.push({
      price: Math.round(price * 100) / 100,
      amount,
      total: Math.round(price * amount * 100) / 100,
    });
  }

  const spread = asks[0].price - bids[0].price;

  return {
    symbol,
    timestamp: Date.now(),
    bids: bids.sort((a, b) => b.price - a.price),
    asks: asks.sort((a, b) => a.price - b.price),
    spread: Math.round(spread * 100) / 100,
  };
}

/**
 * Calculate trading metrics
 */
export function calculateTradingMetrics(orders: Order[]): TradingMetrics {
  const filledOrders = orders.filter((o) => o.status === 'filled');
  const totalVolume = orders.reduce((sum, o) => sum + o.amount * o.price, 0);

  let totalProfit = 0;
  let winCount = 0;
  let largestWin = 0;
  let largestLoss = 0;

  filledOrders.forEach((order) => {
    const profit = order.side === 'sell' ? order.amount * order.price : -order.amount * order.price;
    totalProfit += profit;

    if (profit > 0) {
      winCount++;
      largestWin = Math.max(largestWin, profit);
    } else {
      largestLoss = Math.min(largestLoss, profit);
    }
  });

  return {
    totalOrders: orders.length,
    openOrders: orders.filter((o) => o.status === 'open').length,
    filledOrders: filledOrders.length,
    totalVolume: Math.round(totalVolume * 100) / 100,
    winRate: filledOrders.length > 0 ? (winCount / filledOrders.length) * 100 : 0,
    averageProfit: filledOrders.length > 0 ? totalProfit / filledOrders.length : 0,
    largestWin,
    largestLoss,
  };
}

/**
 * Format order for display
 */
export function formatOrder(order: Order): string {
  const side = order.side.toUpperCase();
  const type = order.type.toUpperCase();
  const status = order.status.toUpperCase();
  return `${side} ${order.amount} ${order.symbol} @ $${order.price.toFixed(2)} (${type}) - ${status}`;
}

/**
 * Calculate price change percentage
 */
export function calculatePriceChange(candles: Candle[]): number {
  if (candles.length < 2) return 0;
  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  return ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100;
}

/**
 * Get highest and lowest prices
 */
export function getHighLow(candles: Candle[]): { high: number; low: number } {
  let high = 0;
  let low = Infinity;

  candles.forEach((candle) => {
    high = Math.max(high, candle.high);
    low = Math.min(low, candle.low);
  });

  return { high, low: low === Infinity ? 0 : low };
}

/**
 * Calculate support and resistance levels
 */
export function calculateSupportResistance(
  candles: Candle[]
): { support: number; resistance: number } {
  const { high, low } = getHighLow(candles);
  const midpoint = (high + low) / 2;

  return {
    support: low + (midpoint - low) * 0.382,
    resistance: high - (high - midpoint) * 0.382,
  };
}

/**
 * Validate order parameters
 */
export function validateOrder(
  type: OrderType,
  side: OrderSide,
  price: number,
  amount: number,
  triggerPrice?: number
): { valid: boolean; error?: string } {
  if (price <= 0) {
    return { valid: false, error: 'Price must be greater than 0' };
  }

  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (type === 'stop-loss' && (!triggerPrice || triggerPrice <= 0)) {
    return { valid: false, error: 'Trigger price is required for stop-loss orders' };
  }

  return { valid: true };
}

/**
 * Calculate order fill price
 */
export function calculateFillPrice(orderBook: OrderBook, side: OrderSide, amount: number): number {
  const levels = side === 'buy' ? orderBook.asks : orderBook.bids;
  let remaining = amount;
  let totalCost = 0;

  for (const level of levels) {
    if (remaining <= 0) break;

    const fillAmount = Math.min(remaining, level.amount);
    totalCost += fillAmount * level.price;
    remaining -= fillAmount;
  }

  return remaining === 0 ? totalCost / amount : 0;
}
