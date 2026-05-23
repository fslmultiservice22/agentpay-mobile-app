import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidEthereumAddress, normalizeEthereumAddress, BLOCKCHAIN_NETWORKS, BlockchainNetwork } from '@/lib/ethereum-validator';

export interface WalletAsset {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  changePercent24h: number;
  network: BlockchainNetwork;
  contractAddress?: string;
}

export interface ConnectedWallet {
  address: string;
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  assets: WalletAsset[];
  lastUpdated: number;
}

const STORAGE_KEY = 'ethereum_wallet';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for managing Ethereum wallet connection and data
 */
export function useEthereumWallet() {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load wallet from storage on mount
  useEffect(() => {
    loadWalletFromStorage();
  }, []);

  /**
   * Load wallet data from AsyncStorage
   */
  const loadWalletFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const walletData = JSON.parse(stored);
        setWallet(walletData);
      }
    } catch (err) {
      console.error('Error loading wallet from storage:', err);
    }
  }, []);

  /**
   * Save wallet data to AsyncStorage
   */
  const saveWalletToStorage = useCallback(async (walletData: ConnectedWallet) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(walletData));
    } catch (err) {
      console.error('Error saving wallet to storage:', err);
    }
  }, []);

  /**
   * Mock function to fetch wallet balance and assets
   * In production, this would call Alchemy, Infura, or similar API
   */
  const fetchWalletData = useCallback(async (address: string): Promise<ConnectedWallet> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock data for demonstration
    const mockAssets: WalletAsset[] = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: 2.5,
        value: 8500,
        changePercent24h: 2.5,
        network: 'ethereum',
      },
      {
        symbol: 'USDC',
        name: 'USD Coin',
        balance: 15000,
        value: 15000,
        changePercent24h: 0,
        network: 'ethereum',
        contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      },
      {
        symbol: 'MATIC',
        name: 'Polygon',
        balance: 5000,
        value: 3700,
        changePercent24h: -1.2,
        network: 'polygon',
        contractAddress: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
      },
      {
        symbol: 'ARB',
        name: 'Arbitrum',
        balance: 1000,
        value: 1600,
        changePercent24h: 3.8,
        network: 'arbitrum',
        contractAddress: '0xb50721bcf8d731f670fb3793e2cbd60aa640d8de',
      },
      {
        symbol: 'OP',
        name: 'Optimism',
        balance: 500,
        value: 2500,
        changePercent24h: 5.2,
        network: 'optimism',
        contractAddress: '0x4200000000000000000000000000000000000042',
      },
    ];

    const totalValue = mockAssets.reduce((sum, asset) => sum + asset.value, 0);
    const totalChange = totalValue * 0.04; // Mock 4% change

    const walletData: ConnectedWallet = {
      address: normalizeEthereumAddress(address),
      totalValue,
      totalChange,
      totalChangePercent: 4.17,
      assets: mockAssets,
      lastUpdated: Date.now(),
    };

    return walletData;
  }, []);

  /**
   * Connect a new wallet by address
   */
  const connectWallet = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!isValidEthereumAddress(address)) {
        throw new Error('Invalid Ethereum address format');
      }

      const walletData = await fetchWalletData(address);
      setWallet(walletData);
      await saveWalletToStorage(walletData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, [fetchWalletData, saveWalletToStorage]);

  /**
   * Refresh wallet data if cache is expired
   */
  const refreshWallet = useCallback(async () => {
    if (!wallet) return;

    const now = Date.now();
    const isCacheExpired = now - wallet.lastUpdated > CACHE_DURATION;

    if (isCacheExpired) {
      setLoading(true);
      try {
        const updatedWallet = await fetchWalletData(wallet.address);
        setWallet(updatedWallet);
        await saveWalletToStorage(updatedWallet);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallet';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  }, [wallet, fetchWalletData, saveWalletToStorage]);

  /**
   * Disconnect the current wallet
   */
  const disconnectWallet = useCallback(async () => {
    try {
      setWallet(null);
      setError(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
    }
  }, []);

  /**
   * Get assets for a specific network
   */
  const getNetworkAssets = useCallback((network: BlockchainNetwork) => {
    if (!wallet) return [];
    return wallet.assets.filter(asset => asset.network === network);
  }, [wallet]);

  return {
    wallet,
    loading,
    error,
    connectWallet,
    disconnectWallet,
    refreshWallet,
    getNetworkAssets,
  };
}
