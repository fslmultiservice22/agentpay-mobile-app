import { useCallback, useState, useEffect } from 'react';
import {
  generateMockCandles,
  generateMockOrders,
  generateMockOrderBook,
  calculateTradingMetrics,
  type Candle,
  type Order,
  type OrderBook,
  type TradingMetrics,
} from '@/lib/trading/trading-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CANDLES_STORAGE_KEY = 'agentpay_trading_candles';
const ORDERS_STORAGE_KEY = 'agentpay_trading_orders';
const ORDERBOOK_STORAGE_KEY = 'agentpay_trading_orderbook';

/**
 * Hook for managing trading dashboard data
 */
export function useTradingDashboard(symbol: string = 'ETH/USDC') {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [metrics, setMetrics] = useState<TradingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize trading data
  useEffect(() => {
    loadTradingData();
  }, [symbol]);

  const loadTradingData = useCallback(async () => {
    try {
      setIsLoading(true);
      const cachedCandles = await AsyncStorage.getItem(`${CANDLES_STORAGE_KEY}_${symbol}`);
      const cachedOrders = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
      const cachedOrderBook = await AsyncStorage.getItem(`${ORDERBOOK_STORAGE_KEY}_${symbol}`);

      const loadedCandles = cachedCandles ? JSON.parse(cachedCandles) : generateMockCandles(symbol);
      const loadedOrders = cachedOrders ? JSON.parse(cachedOrders) : generateMockOrders();
      const loadedOrderBook = cachedOrderBook ? JSON.parse(cachedOrderBook) : generateMockOrderBook(symbol);

      setCandles(loadedCandles);
      setOrders(loadedOrders);
      setOrderBook(loadedOrderBook);
      setMetrics(calculateTradingMetrics(loadedOrders));
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load trading data';
      setError(errorMessage);
      setCandles(generateMockCandles(symbol));
      setOrders(generateMockOrders());
      setOrderBook(generateMockOrderBook(symbol));
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  const addCandle = useCallback(
    async (candle: Candle) => {
      try {
        const updated = [...candles, candle];
        setCandles(updated);
        await AsyncStorage.setItem(`${CANDLES_STORAGE_KEY}_${symbol}`, JSON.stringify(updated));
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add candle';
        setError(errorMessage);
      }
    },
    [candles, symbol]
  );

  const createOrder = useCallback(
    async (order: Order) => {
      try {
        const updated = [...orders, order];
        setOrders(updated);
        await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
        setMetrics(calculateTradingMetrics(updated));
        setError(null);
        return order;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create order';
        setError(errorMessage);
        return null;
      }
    },
    [orders]
  );

  const updateOrder = useCallback(
    async (orderId: string, updates: Partial<Order>) => {
      try {
        const updated = orders.map((o) => (o.id === orderId ? { ...o, ...updates } : o));
        setOrders(updated);
        await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
        setMetrics(calculateTradingMetrics(updated));
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update order';
        setError(errorMessage);
      }
    },
    [orders]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      try {
        const updated = orders.map((o) =>
          o.id === orderId ? { ...o, status: 'cancelled' as const, updatedAt: Date.now() } : o
        );
        setOrders(updated);
        await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
        setMetrics(calculateTradingMetrics(updated));
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
        setError(errorMessage);
      }
    },
    [orders]
  );

  const updateOrderBook = useCallback(
    async (book: OrderBook) => {
      try {
        setOrderBook(book);
        await AsyncStorage.setItem(`${ORDERBOOK_STORAGE_KEY}_${symbol}`, JSON.stringify(book));
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update order book';
        setError(errorMessage);
      }
    },
    [symbol]
  );

  const getOpenOrders = useCallback(() => {
    return orders.filter((o) => o.status === 'open' || o.status === 'partially_filled');
  }, [orders]);

  const getFilledOrders = useCallback(() => {
    return orders.filter((o) => o.status === 'filled');
  }, [orders]);

  const getOrdersBySymbol = useCallback(
    (sym: string) => {
      return orders.filter((o) => o.symbol === sym);
    },
    [orders]
  );

  const refreshMetrics = useCallback(() => {
    setMetrics(calculateTradingMetrics(orders));
  }, [orders]);

  return {
    candles,
    orders,
    orderBook,
    metrics,
    isLoading,
    error,
    addCandle,
    createOrder,
    updateOrder,
    cancelOrder,
    updateOrderBook,
    getOpenOrders,
    getFilledOrders,
    getOrdersBySymbol,
    refreshMetrics,
    refetch: loadTradingData,
  };
}
