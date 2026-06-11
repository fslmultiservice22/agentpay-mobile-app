import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNearAccountInfo,
  getNearBalance,
  getNearTokens,
  getNearTransactions,
  validateNearAccount,
  formatNearAmount,
  type NearAccount,
  type NearTokenBalance,
  type NearTransaction,
} from '@/lib/near/near-service';

export interface UseNearWalletReturn {
  accountId: string | null;
  balance: string | null;
  tokens: NearTokenBalance[];
  transactions: NearTransaction[];
  account: NearAccount | null;
  loading: boolean;
  error: string | null;
  connectAccount: (accountId: string) => Promise<boolean>;
  disconnectAccount: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const STORAGE_KEY = 'near_wallet';

/**
 * Hook per gestire wallet NEAR Protocol
 */
export function useNearWallet(): UseNearWalletReturn {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [tokens, setTokens] = useState<NearTokenBalance[]>([]);
  const [transactions, setTransactions] = useState<NearTransaction[]>([]);
  const [account, setAccount] = useState<NearAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        await refreshAll();
      }
    } catch (err) {
      console.error('Error loading NEAR account from storage:', err);
    }
  }, []);

  /**
   * Salva l'account in AsyncStorage
   */
  const saveAccountToStorage = useCallback(async (id: string) => {
    try {
      const data = {
        accountId: id,
        lastUpdated: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving NEAR account to storage:', err);
    }
  }, []);

  /**
   * Connette un account NEAR
   */
  const connectAccount = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);
        setLoading(true);

        const isValid = await validateNearAccount(id);
        if (!isValid) {
          setError('Invalid NEAR account');
          return false;
        }

        setAccountId(id);
        await saveAccountToStorage(id);
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
    [saveAccountToStorage]
  );

  /**
   * Disconnette l'account NEAR
   */
  const disconnectAccount = useCallback(async () => {
    try {
      setAccountId(null);
      setBalance(null);
      setTokens([]);
      setTransactions([]);
      setAccount(null);
      setError(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Error disconnecting NEAR account:', err);
    }
  }, []);

  /**
   * Aggiorna il balance
   */
  const refreshBalance = useCallback(async () => {
    if (!accountId) return;

    try {
      setError(null);
      const bal = await getNearBalance(accountId);
      if (bal) {
        setBalance(bal);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh balance';
      setError(errorMessage);
    }
  }, [accountId]);

  /**
   * Aggiorna i token
   */
  const refreshTokens = useCallback(async () => {
    if (!accountId) return;

    try {
      setError(null);
      const toks = await getNearTokens(accountId);
      setTokens(toks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh tokens';
      setError(errorMessage);
    }
  }, [accountId]);

  /**
   * Aggiorna le transazioni
   */
  const refreshTransactions = useCallback(async () => {
    if (!accountId) return;

    try {
      setError(null);
      const txs = await getNearTransactions(accountId);
      setTransactions(txs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh transactions';
      setError(errorMessage);
    }
  }, [accountId]);

  /**
   * Aggiorna tutto
   */
  const refreshAll = useCallback(async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      setError(null);

      const [acc, bal, toks, txs] = await Promise.all([
        getNearAccountInfo(accountId),
        getNearBalance(accountId),
        getNearTokens(accountId),
        getNearTransactions(accountId),
      ]);

      if (acc) setAccount(acc);
      if (bal) setBalance(bal);
      setTokens(toks);
      setTransactions(txs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallet';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  return {
    accountId,
    balance,
    tokens,
    transactions,
    account,
    loading,
    error,
    connectAccount,
    disconnectAccount,
    refreshBalance,
    refreshTokens,
    refreshTransactions,
    refreshAll,
  };
}
