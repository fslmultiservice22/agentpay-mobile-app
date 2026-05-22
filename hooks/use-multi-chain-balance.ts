import { useCallback, useState, useEffect } from 'react';
import { useBlockchain } from '@/lib/blockchain/blockchain-context';
import { useWallet } from '@/lib/web3/wallet-context';
import { BLOCKCHAINS, type BlockchainId, AVAILABLE_BLOCKCHAINS } from '@/lib/blockchain/blockchain-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChainBalance {
  blockchain: BlockchainId;
  balance: string;
  usdValue: string;
  lastUpdated: number;
}

export interface MultiChainBalanceData {
  balances: Record<BlockchainId, ChainBalance>;
  totalBalance: string;
  totalUsdValue: string;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'agentpay_multi_chain_balances';

/**
 * Hook for managing balance across multiple blockchains
 * Fetches and caches balance data for each supported blockchain
 */
export function useMultiChainBalance() {
  const { address } = useWallet();
  const { selectedBlockchain } = useBlockchain();
  const [balances, setBalances] = useState<Record<BlockchainId, ChainBalance>>({} as Record<BlockchainId, ChainBalance>);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached balances on mount
  useEffect(() => {
    loadCachedBalances();
  }, []);

  const loadCachedBalances = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        setBalances(JSON.parse(cached));
      }
    } catch (err) {
      console.error('Failed to load cached balances:', err);
    }
  }, []);

  const fetchBalance = useCallback(
    async (blockchain: BlockchainId): Promise<ChainBalance | null> => {
      if (!address) return null;

      try {
        // Simulate fetching balance from RPC
        // In production, this would call the actual RPC endpoint
        const mockBalance = (Math.random() * 100).toFixed(4);
        const mockUsdValue = (parseFloat(mockBalance) * 1500).toFixed(2); // Assume $1500 per unit

        const chainBalance: ChainBalance = {
          blockchain,
          balance: mockBalance,
          usdValue: mockUsdValue,
          lastUpdated: Date.now(),
        };

        return chainBalance;
      } catch (err) {
        console.error(`Failed to fetch balance for ${blockchain}:`, err);
        return null;
      }
    },
    [address]
  );

  const refreshAllBalances = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      setError(null);

      const newBalances: Partial<Record<BlockchainId, ChainBalance>> = {};

      // Fetch balance for each blockchain
      for (const blockchain of AVAILABLE_BLOCKCHAINS) {
        const chainBalance = await fetchBalance(blockchain);
        if (chainBalance) {
          newBalances[blockchain] = chainBalance;
        }
      }

      setBalances(newBalances as Record<BlockchainId, ChainBalance>);

      // Cache the balances
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newBalances));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh balances';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [address, fetchBalance]);

  const refreshBalance = useCallback(
    async (blockchain: BlockchainId) => {
      if (!address) return;

      try {
        const chainBalance = await fetchBalance(blockchain);
        if (chainBalance) {
          const updated = { ...balances, [blockchain]: chainBalance };
          setBalances(updated);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        console.error(`Failed to refresh balance for ${blockchain}:`, err);
      }
    },
    [address, balances, fetchBalance]
  );

  const calculateTotalBalance = useCallback((): string => {
    let total = 0;
    Object.values(balances).forEach((chainBalance) => {
      total += parseFloat(chainBalance.balance) || 0;
    });
    return total.toFixed(4);
  }, [balances]);

  const calculateTotalUsdValue = useCallback((): string => {
    let total = 0;
    Object.values(balances).forEach((chainBalance) => {
      total += parseFloat(chainBalance.usdValue) || 0;
    });
    return total.toFixed(2);
  }, [balances]);

  const getChainBalance = useCallback(
    (blockchain: BlockchainId): ChainBalance | null => {
      return balances[blockchain] || null;
    },
    [balances]
  );

  const getCurrentBalance = useCallback((): ChainBalance | null => {
    return getChainBalance(selectedBlockchain);
  }, [selectedBlockchain, getChainBalance]);

  return {
    balances,
    totalBalance: calculateTotalBalance(),
    totalUsdValue: calculateTotalUsdValue(),
    isLoading,
    error,
    refreshAllBalances,
    refreshBalance,
    getChainBalance,
    getCurrentBalance,
  };
}
