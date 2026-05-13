import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

interface Transaction {
  id: string;
  type: 'send' | 'receive';
  amount: string;
  address: string;
  status: 'confirmed' | 'pending' | 'failed';
  timestamp: number;
  hash: string;
}

interface WalletData {
  address: string;
  balance: string;
  gasBalance: string;
  transactions: Transaction[];
}

export function useWalletAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WalletData | null>(null);

  const fetchWalletData = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/wallet/${address}`);
      setData(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof AxiosError ? err.message : 'Failed to fetch wallet data';
      setError(errorMessage);
      console.error('Wallet API error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendTransaction = useCallback(async (to: string, amount: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/transactions/send`, {
        to,
        amount,
      });
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof AxiosError ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      console.error('Send transaction error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransactionHistory = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/transactions/${address}`);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof AxiosError ? err.message : 'Failed to fetch transactions';
      setError(errorMessage);
      console.error('Transaction history error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    data,
    fetchWalletData,
    sendTransaction,
    getTransactionHistory,
  };
}