import { useState, useCallback, useEffect } from 'react';
import { QontoService, type QontoAccount, type QontoTransaction, type QontoTransfer } from '@/lib/qonto/qonto-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QONTO_STORAGE_KEY = 'agentpay_qonto_account';

export function useQonto(accountNumber?: string) {
  const [account, setAccount] = useState<QontoAccount | null>(null);
  const [transactions, setTransactions] = useState<QontoTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qontoService, setQontoService] = useState<QontoService | null>(null);

  // Initialize Qonto service
  useEffect(() => {
    const initService = async () => {
      try {
        let account = accountNumber;
        
        if (!account) {
          // Try to load from storage
          const stored = await AsyncStorage.getItem(QONTO_STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            account = parsed.accountNumber;
          }
        }

        if (account && QontoService.isValidAccountNumber(account)) {
          setQontoService(new QontoService(account));
        }
      } catch (err) {
        console.error('Error initializing Qonto service:', err);
      }
    };

    initService();
  }, [accountNumber]);

  // Connect Qonto account
  const connectAccount = useCallback(async (newAccountNumber: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!QontoService.isValidAccountNumber(newAccountNumber)) {
        throw new Error('Invalid Qonto account number format');
      }

      const service = new QontoService(newAccountNumber);
      const accountDetails = await service.getAccountDetails();

      // Save to storage
      await AsyncStorage.setItem(
        QONTO_STORAGE_KEY,
        JSON.stringify({
          accountNumber: newAccountNumber,
          connectedAt: new Date().toISOString(),
        })
      );

      setQontoService(service);
      setAccount(accountDetails);
      return accountDetails;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect account';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch account details
  const fetchAccount = useCallback(async () => {
    if (!qontoService) return;

    try {
      setLoading(true);
      setError(null);
      const details = await qontoService.getAccountDetails();
      setAccount(details);
      return details;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch account';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [qontoService]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (limit = 50, offset = 0) => {
    if (!qontoService) return;

    try {
      setLoading(true);
      setError(null);
      const txns = await qontoService.getTransactions(limit, offset);
      setTransactions(txns);
      return txns;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [qontoService]);

  // Create transfer
  const createTransfer = useCallback(async (transfer: Omit<QontoTransfer, 'id' | 'createdAt'>) => {
    if (!qontoService) throw new Error('Qonto service not initialized');

    try {
      setLoading(true);
      setError(null);
      const newTransfer = await qontoService.createTransfer(transfer);
      return newTransfer;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create transfer';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [qontoService]);

  // Execute transfer
  const executeTransfer = useCallback(async (transferId: string) => {
    if (!qontoService) throw new Error('Qonto service not initialized');

    try {
      setLoading(true);
      setError(null);
      const executed = await qontoService.executeTransfer(transferId);
      return executed;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute transfer';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [qontoService]);

  // Disconnect account
  const disconnectAccount = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(QONTO_STORAGE_KEY);
      setAccount(null);
      setTransactions([]);
      setQontoService(null);
    } catch (err) {
      console.error('Error disconnecting account:', err);
    }
  }, []);

  // Load account on mount
  useEffect(() => {
    if (qontoService && !account) {
      fetchAccount();
    }
  }, [qontoService, account, fetchAccount]);

  return {
    account,
    transactions,
    loading,
    error,
    connectAccount,
    fetchAccount,
    fetchTransactions,
    createTransfer,
    executeTransfer,
    disconnectAccount,
    isConnected: !!account,
  };
}
