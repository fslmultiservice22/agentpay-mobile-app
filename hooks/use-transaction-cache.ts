import { useState, useCallback, useEffect } from 'react';
import { transactionCacheService, type CachedTransaction, type TransactionStats, type TransactionFilter } from '@/lib/transaction-cache-service';

export interface UseTransactionCacheReturn {
  // State
  transactions: CachedTransaction[];
  stats: TransactionStats | null;
  isLoading: boolean;
  error: string | null;

  // Methods
  addTransaction: (transaction: CachedTransaction) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<CachedTransaction>) => Promise<void>;
  getTransaction: (id: string) => CachedTransaction | undefined;
  getTransactions: (filter?: TransactionFilter) => CachedTransaction[];
  deleteTransaction: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  getStats: (chainId?: number) => TransactionStats;
  exportTransactions: (format?: 'json' | 'csv') => string;
  importTransactions: (data: string, format?: 'json' | 'csv') => Promise<void>;
  refresh: () => void;
}

/**
 * Hook for transaction cache management
 */
export function useTransactionCache(): UseTransactionCacheReturn {
  const [transactions, setTransactions] = useState<CachedTransaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add transaction
   */
  const handleAddTransaction = useCallback(async (transaction: CachedTransaction) => {
    setError(null);

    try {
      await transactionCacheService.addTransaction(transaction);
      setTransactions(transactionCacheService.getAllTransactions());
      setStats(transactionCacheService.getTransactionStats());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add transaction';
      setError(errorMessage);
      console.error('Add transaction error:', err);
    }
  }, []);

  /**
   * Update transaction
   */
  const handleUpdateTransaction = useCallback(
    async (id: string, updates: Partial<CachedTransaction>) => {
      setError(null);

      try {
        await transactionCacheService.updateTransaction(id, updates);
        setTransactions(transactionCacheService.getAllTransactions());
        setStats(transactionCacheService.getTransactionStats());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction';
        setError(errorMessage);
        console.error('Update transaction error:', err);
      }
    },
    []
  );

  /**
   * Get transaction
   */
  const handleGetTransaction = useCallback((id: string): CachedTransaction | undefined => {
    return transactionCacheService.getTransaction(id);
  }, []);

  /**
   * Get transactions
   */
  const handleGetTransactions = useCallback((filter?: TransactionFilter): CachedTransaction[] => {
    return transactionCacheService.getTransactions(filter || {});
  }, []);

  /**
   * Delete transaction
   */
  const handleDeleteTransaction = useCallback(async (id: string) => {
    setError(null);

    try {
      await transactionCacheService.deleteTransaction(id);
      setTransactions(transactionCacheService.getAllTransactions());
      setStats(transactionCacheService.getTransactionStats());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
      setError(errorMessage);
      console.error('Delete transaction error:', err);
    }
  }, []);

  /**
   * Clear all
   */
  const handleClearAll = useCallback(async () => {
    setError(null);

    try {
      await transactionCacheService.clearAllTransactions();
      setTransactions([]);
      setStats(transactionCacheService.getTransactionStats());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear transactions';
      setError(errorMessage);
      console.error('Clear all error:', err);
    }
  }, []);

  /**
   * Get stats
   */
  const handleGetStats = useCallback((chainId?: number): TransactionStats => {
    return transactionCacheService.getTransactionStats(chainId);
  }, []);

  /**
   * Export transactions
   */
  const handleExportTransactions = useCallback((format: 'json' | 'csv' = 'json'): string => {
    return transactionCacheService.exportTransactions(format);
  }, []);

  /**
   * Import transactions
   */
  const handleImportTransactions = useCallback(
    async (data: string, format: 'json' | 'csv' = 'json') => {
      setError(null);

      try {
        await transactionCacheService.importTransactions(data, format);
        setTransactions(transactionCacheService.getAllTransactions());
        setStats(transactionCacheService.getTransactionStats());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to import transactions';
        setError(errorMessage);
        console.error('Import transactions error:', err);
      }
    },
    []
  );

  /**
   * Refresh
   */
  const handleRefresh = useCallback(() => {
    setTransactions(transactionCacheService.getAllTransactions());
    setStats(transactionCacheService.getTransactionStats());
  }, []);

  // Initialize on mount
  useEffect(() => {
    setIsLoading(true);
    handleRefresh();
    setIsLoading(false);
  }, [handleRefresh]);

  return {
    transactions,
    stats,
    isLoading,
    error,
    addTransaction: handleAddTransaction,
    updateTransaction: handleUpdateTransaction,
    getTransaction: handleGetTransaction,
    getTransactions: handleGetTransactions,
    deleteTransaction: handleDeleteTransaction,
    clearAll: handleClearAll,
    getStats: handleGetStats,
    exportTransactions: handleExportTransactions,
    importTransactions: handleImportTransactions,
    refresh: handleRefresh,
  };
}
