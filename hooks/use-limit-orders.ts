import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';

export interface LimitOrder {
  id: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  triggerPrice: string;
  currentPrice: string;
  status: 'pending' | 'filled' | 'cancelled' | 'expired';
  createdAt: number;
  expiresAt: number;
  filledAt?: number;
}

interface LimitOrderState {
  orders: LimitOrder[];
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'agentpay_limit_orders';
const MAX_ORDERS = 50;

export function useLimitOrders(address: string | null) {
  const [state, setState] = useState<LimitOrderState>({
    orders: [],
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carica gli ordini dal storage
  const loadOrders = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
      const orders: LimitOrder[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState({
          orders,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load limit orders';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Carica gli ordini al mount
  useEffect(() => {
    loadOrders();
  }, [address, loadOrders]);

  // Crea un nuovo limit order
  const createLimitOrder = useCallback(
    async (
      fromToken: string,
      toToken: string,
      fromAmount: string,
      toAmount: string,
      triggerPrice: string,
    ): Promise<LimitOrder | null> => {
      if (!address) return null;

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida i parametri
        if (parseFloat(fromAmount) <= 0 || parseFloat(toAmount) <= 0 || parseFloat(triggerPrice) <= 0) {
          throw new Error('Invalid order parameters');
        }

        // Crea il nuovo ordine
        const now = Date.now();
        const newOrder: LimitOrder = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          triggerPrice,
          currentPrice: '0',
          status: 'pending',
          createdAt: now,
          expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 giorni
        };

        // Carica gli ordini precedenti
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let orders: LimitOrder[] = stored ? JSON.parse(stored) : [];

        // Aggiungi il nuovo ordine
        orders.unshift(newOrder);

        // Mantieni solo i MAX_ORDERS più recenti
        orders = orders.slice(0, MAX_ORDERS);

        // Salva nel storage
        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(orders));

        if (isMountedRef.current) {
          setState({
            orders,
            isLoading: false,
            error: null,
          });
        }

        return newOrder;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create limit order';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        }
        return null;
      }
    },
    [address],
  );

  // Cancella un limit order
  const cancelOrder = useCallback(
    async (orderId: string): Promise<boolean> => {
      if (!address) return false;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let orders: LimitOrder[] = stored ? JSON.parse(stored) : [];

        // Trova e cancella l'ordine
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
          orders[orderIndex].status = 'cancelled';

          // Salva nel storage
          await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(orders));

          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              orders,
            }));
          }

          return true;
        }

        return false;
      } catch (err) {
        console.error('Failed to cancel order:', err);
        return false;
      }
    },
    [address],
  );

  // Aggiorna il prezzo corrente e controlla se gli ordini devono essere eseguiti
  const updatePriceAndCheck = useCallback(
    async (fromToken: string, toToken: string, currentPrice: string) => {
      if (!address) return;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let orders: LimitOrder[] = stored ? JSON.parse(stored) : [];

        let updated = false;

        orders = orders.map(order => {
          if (
            order.fromToken === fromToken &&
            order.toToken === toToken &&
            order.status === 'pending'
          ) {
            const currentPriceNum = parseFloat(currentPrice);
            const triggerPriceNum = parseFloat(order.triggerPrice);

            // Controlla se il prezzo ha raggiunto il trigger
            if (currentPriceNum <= triggerPriceNum) {
              updated = true;
              return {
                ...order,
                status: 'filled',
                currentPrice,
                filledAt: Date.now(),
              };
            }

            // Aggiorna il prezzo corrente
            return {
              ...order,
              currentPrice,
            };
          }

          return order;
        });

        if (updated) {
          // Salva nel storage
          await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(orders));

          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              orders,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to update price and check orders:', err);
      }
    },
    [address],
  );

  // Ottieni gli ordini attivi
  const getActiveOrders = useCallback((): LimitOrder[] => {
    return state.orders.filter(order => order.status === 'pending');
  }, [state.orders]);

  // Ottieni gli ordini completati
  const getFilledOrders = useCallback((): LimitOrder[] => {
    return state.orders.filter(order => order.status === 'filled');
  }, [state.orders]);

  // Pulisci gli ordini scaduti
  const cleanupExpiredOrders = useCallback(async () => {
    if (!address) return;

    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
      let orders: LimitOrder[] = stored ? JSON.parse(stored) : [];

      const now = Date.now();
      const beforeCount = orders.length;

      orders = orders.map(order => {
        if (order.status === 'pending' && order.expiresAt < now) {
          return {
            ...order,
            status: 'expired',
          };
        }
        return order;
      });

      // Salva nel storage
      await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(orders));

      if (isMountedRef.current && orders.length !== beforeCount) {
        setState(prev => ({
          ...prev,
          orders,
        }));
      }
    } catch (err) {
      console.error('Failed to cleanup expired orders:', err);
    }
  }, [address]);

  // Avvia il controllo periodico degli ordini
  const startPeriodicCheck = useCallback(() => {
    if (checkIntervalRef.current) return;

    checkIntervalRef.current = setInterval(() => {
      cleanupExpiredOrders();
    }, 60000); // Controlla ogni minuto
  }, [cleanupExpiredOrders]);

  // Ferma il controllo periodico
  const stopPeriodicCheck = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPeriodicCheck();
    };
  }, [stopPeriodicCheck]);

  return {
    orders: state.orders,
    isLoading: state.isLoading,
    error: state.error,
    createLimitOrder,
    cancelOrder,
    updatePriceAndCheck,
    getActiveOrders,
    getFilledOrders,
    cleanupExpiredOrders,
    startPeriodicCheck,
    stopPeriodicCheck,
    loadOrders,
  };
}
