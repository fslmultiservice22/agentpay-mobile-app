import { useEffect, useState, useCallback } from 'react';
import { getBlockchainAPIService, initializeBlockchainAPI, WalletBalance, TokenBalance, Transaction, BlockchainConfig } from '@/lib/blockchain-api';

export function useBlockchainAPI(config?: BlockchainConfig) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      try {
        initializeBlockchainAPI(config);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize blockchain API';
        setError(errorMessage);
      }
    }
  }, [config]);

  return {
    isInitialized,
    error,
  };
}

export function useWalletBalance(address: string | null, chain: string = 'ethereum') {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = getBlockchainAPIService();
      const walletBalance = await service.getWalletBalance(address, chain);
      setBalance(walletBalance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, chain]);

  useEffect(() => {
    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);

    return () => clearInterval(interval);
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}

export function useTokenBalances(address: string | null) {
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = getBlockchainAPIService();
      const tokenBalances = await service.getTokenBalances(address);
      setTokens(tokenBalances);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch token balances';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchTokens();

    // Refresh tokens every 60 seconds
    const interval = setInterval(fetchTokens, 60000);

    return () => clearInterval(interval);
  }, [fetchTokens]);

  return {
    tokens,
    isLoading,
    error,
    refetch: fetchTokens,
  };
}

export function useTransactionHistory(address: string | null, limit: number = 10) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = getBlockchainAPIService();
      const txs = await service.getTransactionHistory(address, limit);
      setTransactions(txs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, limit]);

  useEffect(() => {
    fetchTransactions();

    // Refresh transactions every 15 seconds
    const interval = setInterval(fetchTransactions, 15000);

    return () => clearInterval(interval);
  }, [fetchTransactions]);

  return {
    transactions,
    isLoading,
    error,
    refetch: fetchTransactions,
  };
}

export function useGasPrice() {
  const [gasPrice, setGasPrice] = useState<{ standard: string; fast: string; fastest: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGasPrice = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const service = getBlockchainAPIService();
      const prices = await service.getGasPrice();
      setGasPrice(prices);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch gas price';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGasPrice();

    // Refresh gas price every 10 seconds
    const interval = setInterval(fetchGasPrice, 10000);

    return () => clearInterval(interval);
  }, [fetchGasPrice]);

  return {
    gasPrice,
    isLoading,
    error,
    refetch: fetchGasPrice,
  };
}

export function useNetworkInfo() {
  const [networkInfo, setNetworkInfo] = useState<{ chainId: string; blockNumber: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNetworkInfo = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const service = getBlockchainAPIService();
      const info = await service.getNetworkInfo();
      setNetworkInfo(info);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch network info';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworkInfo();

    // Refresh network info every 30 seconds
    const interval = setInterval(fetchNetworkInfo, 30000);

    return () => clearInterval(interval);
  }, [fetchNetworkInfo]);

  return {
    networkInfo,
    isLoading,
    error,
    refetch: fetchNetworkInfo,
  };
}
