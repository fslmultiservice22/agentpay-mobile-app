import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import {
  sendEthTransfer,
  sendTokenTransfer,
  estimateGas,
  getWalletBalance,
  getTransactionStatus,
  getTransactionHistory,
  type TransactionResponse,
  type GasEstimate,
} from '@/lib/real-transaction-service';

export interface UseRealTransactionsReturn {
  // State
  isLoading: boolean;
  error: string | null;
  balance: string;
  transactions: TransactionResponse[];
  
  // Methods
  sendEth: (to: string, amount: string) => Promise<TransactionResponse>;
  sendToken: (tokenAddress: string, to: string, amount: string, decimals?: number) => Promise<TransactionResponse>;
  estimateGasCost: (to: string, amount: string) => Promise<GasEstimate>;
  checkTransactionStatus: (txHash: string) => Promise<TransactionResponse | null>;
  loadTransactionHistory: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  
  // Info
  isConnected: boolean;
  address: string | undefined;
  chainId: number;
}

/**
 * Hook for managing real blockchain transactions
 */
export function useRealTransactions(): UseRealTransactionsReturn {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState('0');
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

  // Refresh balance on mount and when address changes
  useEffect(() => {
    if (address && isConnected) {
      refreshBalance();
    }
  }, [address, isConnected]);

  /**
   * Refresh wallet balance
   */
  const refreshBalance = useCallback(async () => {
    if (!address) return;

    try {
      setError(null);
      const newBalance = await getWalletBalance(address, chainId);
      setBalance(newBalance);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Balance fetch error:', err);
    }
  }, [address, chainId]);

  /**
   * Send ETH transfer
   */
  const sendEth = useCallback(
    async (to: string, amount: string): Promise<TransactionResponse> => {
      if (!address) throw new Error('Wallet not connected');
      if (!isConnected) throw new Error('Not connected to wallet');

      setIsLoading(true);
      setError(null);

      try {
        const result = await sendEthTransfer(to, amount, chainId);
        
        // Refresh balance after successful transaction
        await refreshBalance();
        
        // Add to transaction history
        setTransactions(prev => [result, ...prev]);
        
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, isConnected, chainId, refreshBalance]
  );

  /**
   * Send token transfer
   */
  const sendToken = useCallback(
    async (
      tokenAddress: string,
      to: string,
      amount: string,
      decimals: number = 18
    ): Promise<TransactionResponse> => {
      if (!address) throw new Error('Wallet not connected');
      if (!isConnected) throw new Error('Not connected to wallet');

      setIsLoading(true);
      setError(null);

      try {
        const result = await sendTokenTransfer(tokenAddress, to, amount, decimals, chainId);
        
        // Add to transaction history
        setTransactions(prev => [result, ...prev]);
        
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Token transfer failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, isConnected, chainId]
  );

  /**
   * Estimate gas cost
   */
  const estimateGasCost = useCallback(
    async (to: string, amount: string): Promise<GasEstimate> => {
      try {
        setError(null);
        return await estimateGas(to, amount, chainId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gas estimation failed';
        setError(errorMessage);
        throw err;
      }
    },
    [chainId]
  );

  /**
   * Check transaction status
   */
  const checkTransactionStatus = useCallback(
    async (txHash: string): Promise<TransactionResponse | null> => {
      try {
        setError(null);
        return await getTransactionStatus(txHash, chainId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to check transaction status';
        setError(errorMessage);
        throw err;
      }
    },
    [chainId]
  );

  /**
   * Load transaction history
   */
  const loadTransactionHistory = useCallback(async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const history = await getTransactionHistory(address, chainId, 20);
      setTransactions(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transaction history';
      setError(errorMessage);
      console.error('Transaction history error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address, chainId]);

  return {
    isLoading,
    error,
    balance,
    transactions,
    sendEth,
    sendToken,
    estimateGasCost,
    checkTransactionStatus,
    loadTransactionHistory,
    refreshBalance,
    isConnected,
    address,
    chainId,
  };
}
