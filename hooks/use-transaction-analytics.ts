import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { transactionAnalyticsService, type Transaction, type TransactionAnalytics, type SpendingCategory } from '@/lib/transaction-analytics-service';

const STORAGE_KEY = 'agentpay_transactions';

interface UseTransactionAnalyticsState {
  transactions: Transaction[];
  analytics: TransactionAnalytics | null;
  categories: SpendingCategory[];
  loading: boolean;
  error: string | null;
}

export function useTransactionAnalytics() {
  const [state, setState] = useState<UseTransactionAnalyticsState>({
    transactions: [],
    analytics: null,
    categories: [],
    loading: true,
    error: null,
  });

  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | '7d' | '30d' | '90d' | 'all'>('30d');
  const isMountedRef = useRef(true);

  // Load transactions from storage
  const loadTransactions = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const transactions: Transaction[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        const analytics = transactionAnalyticsService.analyzeTransactions(transactions);
        const categories = transactionAnalyticsService.getSpendingCategories(transactions);

        setState(prev => ({
          ...prev,
          transactions,
          analytics,
          categories,
          loading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    }
  }, []);

  // Load transactions on mount
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Save transactions to storage
  const saveTransactions = useCallback(async (transactions: Transaction[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (err) {
      console.error('Failed to save transactions:', err);
    }
  }, []);

  // Add a transaction
  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, 'id'>) => {
      try {
        const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newTransaction: Transaction = {
          ...transaction,
          id,
        };

        const updatedTransactions = [...state.transactions, newTransaction];
        await saveTransactions(updatedTransactions);

        const analytics = transactionAnalyticsService.analyzeTransactions(updatedTransactions);
        const categories = transactionAnalyticsService.getSpendingCategories(updatedTransactions);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            transactions: updatedTransactions,
            analytics,
            categories,
          }));
        }

        return newTransaction;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add transaction';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.transactions, saveTransactions]
  );

  // Get filtered transactions by time range
  const getFilteredTransactions = useCallback(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    let startDate = 0;
    switch (selectedTimeRange) {
      case 'today':
        startDate = new Date(now).setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate = now - 7 * oneDay;
        break;
      case '30d':
        startDate = now - 30 * oneDay;
        break;
      case '90d':
        startDate = now - 90 * oneDay;
        break;
      case 'all':
        startDate = 0;
        break;
    }

    return transactionAnalyticsService.filterByDateRange(state.transactions, startDate, now);
  }, [state.transactions, selectedTimeRange]);

  // Export to CSV
  const exportToCSV = useCallback(async () => {
    try {
      const csv = transactionAnalyticsService.exportToCSV(state.transactions);
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      return { csv, filename };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export CSV';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
      }
      throw err;
    }
  }, [state.transactions]);

  // Export to JSON
  const exportToJSON = useCallback(async () => {
    try {
      const json = transactionAnalyticsService.exportToJSON(state.transactions);
      const filename = `transactions_${new Date().toISOString().split('T')[0]}.json`;
      return { json, filename };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export JSON';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
      }
      throw err;
    }
  }, [state.transactions]);

  // Generate PDF report data
  const generatePDFReport = useCallback(async () => {
    try {
      if (!state.analytics) {
        throw new Error('No analytics data available');
      }

      return transactionAnalyticsService.generatePDFReport(state.transactions, state.analytics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDF report';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
      }
      throw err;
    }
  }, [state.transactions, state.analytics]);

  // Get tax report
  const getTaxReport = useCallback(() => {
    return transactionAnalyticsService.calculateTaxReport(state.transactions);
  }, [state.transactions]);

  // Get time range presets
  const getTimeRangePresets = useCallback(() => {
    return transactionAnalyticsService.getTimeRangePresets();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    transactions: state.transactions,
    analytics: state.analytics,
    categories: state.categories,
    loading: state.loading,
    error: state.error,
    selectedTimeRange,
    setSelectedTimeRange,
    addTransaction,
    getFilteredTransactions,
    exportToCSV,
    exportToJSON,
    generatePDFReport,
    getTaxReport,
    getTimeRangePresets,
    loadTransactions,
  };
}
