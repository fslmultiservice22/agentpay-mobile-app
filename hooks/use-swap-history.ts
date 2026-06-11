import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SwapHistoryItem {
  id: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
  txHash?: string;
  priceImpact?: number;
  slippage?: number;
}

const SWAP_HISTORY_KEY = 'agentpay_swap_history';

export function useSwapHistory() {
  const [history, setHistory] = useState<SwapHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Carica lo storico all'avvio
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(SWAP_HISTORY_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setHistory(parsed);
      }
    } catch (err) {
      console.error('Failed to load swap history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addSwap = useCallback(
    async (swap: Omit<SwapHistoryItem, 'id'>) => {
      try {
        const newSwap: SwapHistoryItem = {
          ...swap,
          id: `swap_${Date.now()}`,
        };

        const updated = [newSwap, ...history];
        setHistory(updated);

        // Salva in AsyncStorage
        await AsyncStorage.setItem(SWAP_HISTORY_KEY, JSON.stringify(updated));

        return newSwap;
      } catch (err) {
        console.error('Failed to add swap to history:', err);
        return null;
      }
    },
    [history]
  );

  const updateSwap = useCallback(
    async (id: string, updates: Partial<SwapHistoryItem>) => {
      try {
        const updated = history.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        );

        setHistory(updated);

        // Salva in AsyncStorage
        await AsyncStorage.setItem(SWAP_HISTORY_KEY, JSON.stringify(updated));

        return updated.find((item) => item.id === id) || null;
      } catch (err) {
        console.error('Failed to update swap:', err);
        return null;
      }
    },
    [history]
  );

  const deleteSwap = useCallback(
    async (id: string) => {
      try {
        const updated = history.filter((item) => item.id !== id);
        setHistory(updated);

        // Salva in AsyncStorage
        await AsyncStorage.setItem(SWAP_HISTORY_KEY, JSON.stringify(updated));

        return true;
      } catch (err) {
        console.error('Failed to delete swap:', err);
        return false;
      }
    },
    [history]
  );

  const clearHistory = useCallback(async () => {
    try {
      setHistory([]);
      await AsyncStorage.removeItem(SWAP_HISTORY_KEY);
      return true;
    } catch (err) {
      console.error('Failed to clear history:', err);
      return false;
    }
  }, []);

  const getRecentSwaps = useCallback((limit: number = 10) => {
    return history.slice(0, limit);
  }, [history]);

  const getCompletedSwaps = useCallback(() => {
    return history.filter((item) => item.status === 'completed');
  }, [history]);

  const getTotalVolume = useCallback(() => {
    return history
      .filter((item) => item.status === 'completed')
      .reduce((sum, item) => sum + parseFloat(item.fromAmount || '0'), 0);
  }, [history]);

  return {
    history,
    loading,
    addSwap,
    updateSwap,
    deleteSwap,
    clearHistory,
    getRecentSwaps,
    getCompletedSwaps,
    getTotalVolume,
    reload: loadHistory,
  };
}
