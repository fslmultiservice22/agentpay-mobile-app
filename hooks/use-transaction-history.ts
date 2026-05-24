import { useState, useCallback, useEffect } from 'react';
import {
  saveTransaction,
  getTransactionHistory,
  getTransactionByHash,
  filterTransactions,
  getTransactionsForAddress,
  getTransactionStats,
  deleteTransaction,
  clearTransactionHistory,
  exportTransactionHistory,
  importTransactionHistory,
  addTransactionNote,
  getRecentTransactions,
  type StoredTransaction,
  type TransactionFilter,
} from '@/lib/transaction-history-service';

export interface UseTransactionHistoryReturn {
  // State
  transactions: StoredTransaction[];
  isLoading: boolean;
  error: string | null;
  stats: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    totalVolume: string;
    averageGasPrice: string;
  };
  
  // Methods
  saveTransaction: (transaction: StoredTransaction) => Promise<void>;
  loadTransactions: () => Promise<void>;
  loadRecentTransactions: (limit?: number) => Promise<void>;
  loadTransactionsForAddress: (address: string) => Promise<void>;
  filterTransactions: (filter: TransactionFilter) => Promise<void>;
  getTransaction: (hash: string) => Promise<StoredTransaction | null>;
  deleteTransaction: (hash: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  exportHistory: () => Promise<string>;
  importHistory: (jsonData: string) => Promise<void>;
  addNote: (hash: string, note: string) => Promise<void>;
  refreshStats: () => Promise<void>;
}

/**
 * Hook for managing transaction history with persistence
 */
export function useTransactionHistory(): UseTransactionHistoryReturn {
  const [transactions, setTransactions] = useState<StoredTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    successful: 0,
    failed: 0,
    pending: 0,
    totalVolume: '0',
    averageGasPrice: '0',
  });

  // Load transactions on mount
  useEffect(() => {
    loadTransactions();
  }, []);

  /**
   * Load all transactions
   */
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const history = await getTransactionHistory();
      setTransactions(history);
      await refreshStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      setError(errorMessage);
      console.error('Load transactions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load recent transactions
   */
  const loadRecentTransactions = useCallback(async (limit: number = 10) => {
    setIsLoading(true);
    setError(null);

    try {
      const recent = await getRecentTransactions(limit);
      setTransactions(recent);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recent transactions';
      setError(errorMessage);
      console.error('Load recent transactions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load transactions for address
   */
  const loadTransactionsForAddress = useCallback(async (address: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const addressTransactions = await getTransactionsForAddress(address);
      setTransactions(addressTransactions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load address transactions';
      setError(errorMessage);
      console.error('Load address transactions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Filter transactions
   */
  const handleFilterTransactions = useCallback(async (filter: TransactionFilter) => {
    setIsLoading(true);
    setError(null);

    try {
      const filtered = await filterTransactions(filter);
      setTransactions(filtered);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter transactions';
      setError(errorMessage);
      console.error('Filter transactions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save transaction
   */
  const handleSaveTransaction = useCallback(async (transaction: StoredTransaction) => {
    setError(null);

    try {
      await saveTransaction(transaction);
      await loadTransactions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save transaction';
      setError(errorMessage);
      console.error('Save transaction error:', err);
      throw err;
    }
  }, [loadTransactions]);

  /**
   * Get single transaction
   */
  const getTransaction = useCallback(async (hash: string): Promise<StoredTransaction | null> => {
    try {
      setError(null);
      return await getTransactionByHash(hash);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get transaction';
      setError(errorMessage);
      console.error('Get transaction error:', err);
      return null;
    }
  }, []);

  /**
   * Delete transaction
   */
  const handleDeleteTransaction = useCallback(async (hash: string) => {
    setError(null);

    try {
      await deleteTransaction(hash);
      await loadTransactions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      console.error('Delete transaction error:', err);
      throw err;
    }
  }, [loadTransactions]);

  /**
   * Clear history
   */
  const handleClearHistory = useCallback(async () => {
    setError(null);

    try {
      await clearTransactionHistory();
      setTransactions([]);
      setStats({
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0,
        totalVolume: '0',
        averageGasPrice: '0',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear history';
      setError(errorMessage);
      console.error('Clear history error:', err);
      throw err;
    }
  }, []);

  /**
   * Export history
   */
  const handleExportHistory = useCallback(async (): Promise<string> => {
    try {
      setError(null);
      return await exportTransactionHistory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export history';
      setError(errorMessage);
      console.error('Export history error:', err);
      throw err;
    }
  }, []);

  /**
   * Import history
   */
  const handleImportHistory = useCallback(async (jsonData: string) => {
    setError(null);

    try {
      await importTransactionHistory(jsonData);
      await loadTransactions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import history';
      setError(errorMessage);
      console.error('Import history error:', err);
      throw err;
    }
  }, [loadTransactions]);

  /**
   * Add note to transaction
   */
  const handleAddNote = useCallback(async (hash: string, note: string) => {
    setError(null);

    try {
      await addTransactionNote(hash, note);
      await loadTransactions();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add note';
      setError(errorMessage);
      console.error('Add note error:', err);
      throw err;
    }
  }, [loadTransactions]);

  /**
   * Refresh statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const newStats = await getTransactionStats();
      setStats(newStats);
    } catch (err) {
      console.error('Refresh stats error:', err);
    }
  }, []);

  return {
    transactions,
    isLoading,
    error,
    stats,
    saveTransaction: handleSaveTransaction,
    loadTransactions,
    loadRecentTransactions,
    loadTransactionsForAddress,
    filterTransactions: handleFilterTransactions,
    getTransaction,
    deleteTransaction: handleDeleteTransaction,
    clearHistory: handleClearHistory,
    exportHistory: handleExportHistory,
    importHistory: handleImportHistory,
    addNote: handleAddNote,
    refreshStats,
  };
}
