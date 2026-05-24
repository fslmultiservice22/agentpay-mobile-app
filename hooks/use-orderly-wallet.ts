import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOrderlyAccount,
  getOrderlyTokens,
  getOrderlyPairs,
  getOrderlyOrders,
  getOrderlyPositions,
  validateOrderlyAccount,
  type OrderlyAccount,
  type OrderlyToken,
  type OrderlyOrder,
  type OrderlyPosition,
  type BlockchainType,
} from '@/lib/orderly/orderly-service';

export interface UseOrderlyWalletReturn {
  accountId: string | null;
  blockchain: BlockchainType | null;
  account: OrderlyAccount | null;
  tokens: OrderlyToken[];
  pairs: string[];
  orders: OrderlyOrder[];
  positions: OrderlyPosition[];
  loading: boolean;
  error: string | null;
  testnet: boolean;
  connectAccount: (accountId: string, blockchain: BlockchainType) => Promise<boolean>;
  disconnectAccount: () => Promise<void>;
  refreshAccount: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setTestnet: (enabled: boolean) => void;
}

const STORAGE_KEY = 'orderly_wallet';

/**
 * Hook per gestire wallet su Orderly Network
 */
export function useOrderlyWallet(): UseOrderlyWalletReturn {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [blockchain, setBlockchain] = useState<BlockchainType | null>(null);
  const [account, setAccount] = useState<OrderlyAccount | null>(null);
  const [tokens, setTokens] = useState<OrderlyToken[]>([]);
  const [pairs, setPairs] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderlyOrder[]>([]);
  const [positions, setPositions] = useState<OrderlyPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testnet, setTestnetMode] = useState(false);

  // Carica l'account da storage al mount
  useEffect(() => {
    loadAccountFromStorage();
  }, []);

  /**
   * Carica l'account da AsyncStorage
   */
  const loadAccountFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setAccountId(data.accountId);
        setBlockchain(data.blockchain);
        setTestnetMode(data.testnet || false);
        await refreshAll();
      }
    } catch (err) {
      console.error('Error loading Orderly account from storage:', err);
    }
  }, []);

  /**
   * Salva l'account in AsyncStorage
   */
  const saveAccountToStorage = useCallback(async (id: string, chain: BlockchainType) => {
    try {
      const data = {
        accountId: id,
        blockchain: chain,
        testnet,
        lastUpdated: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving Orderly account to storage:', err);
    }
  }, [testnet]);

  /**
   * Connette un account Orderly
   */
  const connectAccount = useCallback(
    async (id: string, chain: BlockchainType): Promise<boolean> => {
      try {
        setError(null);
        setLoading(true);

        const isValid = await validateOrderlyAccount(id, chain, testnet);
        if (!isValid) {
          setError('Invalid Orderly account');
          return false;
        }

        setAccountId(id);
        setBlockchain(chain);
        await saveAccountToStorage(id, chain);
        await refreshAll();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect account';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [testnet, saveAccountToStorage]
  );

  /**
   * Disconnette l'account Orderly
   */
  const disconnectAccount = useCallback(async () => {
    try {
      setAccountId(null);
      setBlockchain(null);
      setAccount(null);
      setTokens([]);
      setPairs([]);
      setOrders([]);
      setPositions([]);
      setError(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Error disconnecting Orderly account:', err);
    }
  }, []);

  /**
   * Aggiorna l'account
   */
  const refreshAccount = useCallback(async () => {
    if (!accountId || !blockchain) return;

    try {
      setError(null);
      const acc = await getOrderlyAccount(accountId, blockchain, testnet);
      if (acc) {
        setAccount(acc);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh account';
      setError(errorMessage);
    }
  }, [accountId, blockchain, testnet]);

  /**
   * Aggiorna i token
   */
  const refreshTokens = useCallback(async () => {
    try {
      setError(null);
      const toks = await getOrderlyTokens(testnet);
      setTokens(toks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh tokens';
      setError(errorMessage);
    }
  }, [testnet]);

  /**
   * Aggiorna gli ordini
   */
  const refreshOrders = useCallback(async () => {
    if (!accountId || !blockchain) return;

    try {
      setError(null);
      const ords = await getOrderlyOrders(accountId, blockchain, testnet);
      setOrders(ords);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh orders';
      setError(errorMessage);
    }
  }, [accountId, blockchain, testnet]);

  /**
   * Aggiorna le posizioni
   */
  const refreshPositions = useCallback(async () => {
    if (!accountId || !blockchain) return;

    try {
      setError(null);
      const pos = await getOrderlyPositions(accountId, blockchain, testnet);
      setPositions(pos);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh positions';
      setError(errorMessage);
    }
  }, [accountId, blockchain, testnet]);

  /**
   * Aggiorna tutto
   */
  const refreshAll = useCallback(async () => {
    if (!accountId || !blockchain) return;

    try {
      setLoading(true);
      setError(null);

      const [acc, toks, prs, ords, pos] = await Promise.all([
        getOrderlyAccount(accountId, blockchain, testnet),
        getOrderlyTokens(testnet),
        getOrderlyPairs(testnet),
        getOrderlyOrders(accountId, blockchain, testnet),
        getOrderlyPositions(accountId, blockchain, testnet),
      ]);

      if (acc) setAccount(acc);
      setTokens(toks);
      setPairs(prs);
      setOrders(ords);
      setPositions(pos);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallet';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accountId, blockchain, testnet]);

  const setTestnet = useCallback((enabled: boolean) => {
    setTestnetMode(enabled);
  }, []);

  return {
    accountId,
    blockchain,
    account,
    tokens,
    pairs,
    orders,
    positions,
    loading,
    error,
    testnet,
    connectAccount,
    disconnectAccount,
    refreshAccount,
    refreshTokens,
    refreshOrders,
    refreshPositions,
    refreshAll,
    setTestnet,
  };
}
