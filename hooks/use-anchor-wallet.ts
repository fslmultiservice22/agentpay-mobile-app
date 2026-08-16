import { useState, useCallback, useEffect } from 'react';
import { anchorWalletService, type AnchorNetwork, type AnchorAccount, type AnchorTransaction } from '@/lib/anchor-wallet-service';

// Re-export the service types so consumers can import them directly from the hook
export type { AnchorNetwork, AnchorAccount, AnchorTransaction };

export interface UseAnchorWalletReturn {
  // State
  networks: AnchorNetwork[];
  currentNetwork: AnchorNetwork | null;
  currentAccount: AnchorAccount | null;
  transactions: AnchorTransaction[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Methods
  getNetworks: () => AnchorNetwork[];
  getMainnetNetworks: () => AnchorNetwork[];
  getTestnetNetworks: () => AnchorNetwork[];
  connectToNetwork: (networkId: string, account: string, authority: string) => Promise<boolean>;
  disconnect: () => void;
  sendTransaction: (to: string, amount: string, memo?: string) => Promise<AnchorTransaction | null>;
  getAccountBalance: (account: string) => Promise<string>;
  getNetworkInfo: (networkId: string) => Promise<any>;
  getSupportedContracts: (networkId: string) => string[];
  getNetworkStats: () => any;
  refresh: () => void;
}

/**
 * Hook for Anchor Wallet integration
 */
export function useAnchorWallet(): UseAnchorWalletReturn {
  const [networks, setNetworks] = useState<AnchorNetwork[]>([]);
  const [currentNetwork, setCurrentNetwork] = useState<AnchorNetwork | null>(null);
  const [currentAccount, setCurrentAccount] = useState<AnchorAccount | null>(null);
  const [transactions, setTransactions] = useState<AnchorTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get all networks
   */
  const handleGetNetworks = useCallback((): AnchorNetwork[] => {
    return anchorWalletService.getNetworks();
  }, []);

  /**
   * Get mainnet networks
   */
  const handleGetMainnetNetworks = useCallback((): AnchorNetwork[] => {
    return anchorWalletService.getMainnetNetworks();
  }, []);

  /**
   * Get testnet networks
   */
  const handleGetTestnetNetworks = useCallback((): AnchorNetwork[] => {
    return anchorWalletService.getTestnetNetworks();
  }, []);

  /**
   * Connect to network
   */
  const handleConnectToNetwork = useCallback(
    async (networkId: string, account: string, authority: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const success = await anchorWalletService.connectToNetwork(networkId, account, authority);

        if (success) {
          setCurrentNetwork(anchorWalletService.getCurrentNetwork());
          setCurrentAccount(anchorWalletService.getCurrentAccount());
          return true;
        }

        return false;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
        setError(errorMessage);
        console.error('Connect error:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Disconnect
   */
  const handleDisconnect = useCallback(() => {
    anchorWalletService.disconnect();
    setCurrentNetwork(null);
    setCurrentAccount(null);
    setError(null);
  }, []);

  /**
   * Send transaction
   */
  const handleSendTransaction = useCallback(
    async (to: string, amount: string, memo?: string): Promise<AnchorTransaction | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const tx = await anchorWalletService.sendTransaction(to, amount, memo);

        if (tx) {
          setTransactions(anchorWalletService.getTransactions());
          return tx;
        }

        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
        setError(errorMessage);
        console.error('Send transaction error:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get account balance
   */
  const handleGetAccountBalance = useCallback(async (account: string): Promise<string> => {
    try {
      return await anchorWalletService.getAccountBalance(account);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get balance';
      setError(errorMessage);
      return '0';
    }
  }, []);

  /**
   * Get network info
   */
  const handleGetNetworkInfo = useCallback(async (networkId: string): Promise<any> => {
    try {
      return await anchorWalletService.getNetworkInfo(networkId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get network info';
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Get supported contracts
   */
  const handleGetSupportedContracts = useCallback((networkId: string): string[] => {
    return anchorWalletService.getSupportedContracts(networkId);
  }, []);

  /**
   * Get network stats
   */
  const handleGetNetworkStats = useCallback(() => {
    return anchorWalletService.getNetworkStats();
  }, []);

  /**
   * Refresh
   */
  const handleRefresh = useCallback(() => {
    setNetworks(anchorWalletService.getNetworks());
    setCurrentNetwork(anchorWalletService.getCurrentNetwork());
    setCurrentAccount(anchorWalletService.getCurrentAccount());
    setTransactions(anchorWalletService.getTransactions());
  }, []);

  // Initialize on mount
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return {
    networks,
    currentNetwork,
    currentAccount,
    transactions,
    isConnected: currentAccount !== null,
    isLoading,
    error,
    getNetworks: handleGetNetworks,
    getMainnetNetworks: handleGetMainnetNetworks,
    getTestnetNetworks: handleGetTestnetNetworks,
    connectToNetwork: handleConnectToNetwork,
    disconnect: handleDisconnect,
    sendTransaction: handleSendTransaction,
    getAccountBalance: handleGetAccountBalance,
    getNetworkInfo: handleGetNetworkInfo,
    getSupportedContracts: handleGetSupportedContracts,
    getNetworkStats: handleGetNetworkStats,
    refresh: handleRefresh,
  };
}
