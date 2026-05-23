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

const STORAGE_KEY = 'ethereum_wallets';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for managing multiple Ethereum wallets
 */
export function useEthereumWallet() {
  const [wallets, setWallets] = useState<ConnectedWallet[]>([]);
  const [activeWallet, setActiveWallet] = useState<ConnectedWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load wallets from storage on mount
  useEffect(() => {
    loadWalletsFromStorage();
  }, []);

  /**
   * Load wallets data from AsyncStorage
   */
  const loadWalletsFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const walletsData = JSON.parse(stored);
        setWallets(walletsData);
        if (walletsData.length > 0) {
          setActiveWallet(walletsData[0]);
        }
      }
    } catch (err) {
      console.error('Error loading wallets from storage:', err);
    }
  }, []);

  /**
   * Save wallets data to AsyncStorage
   */
  const saveWalletsToStorage = useCallback(async (walletsData: ConnectedWallet[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(walletsData));
    } catch (err) {
      console.error('Error saving wallets to storage:', err);
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
      },
    ];

    return {
      address: normalizeEthereumAddress(address),
      totalValue: 27200,
      totalChange: 850,
      totalChangePercent: 3.2,
      assets: mockAssets,
      lastUpdated: Date.now(),
    };
  }, []);

  /**
   * Connect a new wallet
   */
  const connectWallet = useCallback(async (address: string) => {
    if (!isValidEthereumAddress(address)) {
      setError('Invalid Ethereum address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walletData = await fetchWalletData(address);
      
      // Check if wallet already connected
      const existingIndex = wallets.findIndex(w => w.address.toLowerCase() === walletData.address.toLowerCase());
      
      let updatedWallets: ConnectedWallet[];
      if (existingIndex >= 0) {
        // Update existing wallet
        updatedWallets = [...wallets];
        updatedWallets[existingIndex] = walletData;
      } else {
        // Add new wallet
        updatedWallets = [...wallets, walletData];
      }
      
      setWallets(updatedWallets);
      setActiveWallet(walletData);
      await saveWalletsToStorage(updatedWallets);
    } catch (err) {
      setError('Failed to connect wallet');
      console.error('Error connecting wallet:', err);
    } finally {
      setLoading(false);
    }
  }, [wallets, fetchWalletData, saveWalletsToStorage]);

  /**
   * Disconnect a wallet
   */
  const disconnectWallet = useCallback(async (address: string) => {
    try {
      const updatedWallets = wallets.filter(w => w.address.toLowerCase() !== address.toLowerCase());
      setWallets(updatedWallets);
      
      // If disconnected wallet was active, switch to first available
      if (activeWallet?.address.toLowerCase() === address.toLowerCase()) {
        setActiveWallet(updatedWallets.length > 0 ? updatedWallets[0] : null);
      }
      
      await saveWalletsToStorage(updatedWallets);
    } catch (err) {
      setError('Failed to disconnect wallet');
      console.error('Error disconnecting wallet:', err);
    }
  }, [wallets, activeWallet, saveWalletsToStorage]);

  /**
   * Switch active wallet
   */
  const switchActiveWallet = useCallback((address: string) => {
    const wallet = wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (wallet) {
      setActiveWallet(wallet);
    }
  }, [wallets]);

  /**
   * Refresh wallet data
   */
  const refreshWallet = useCallback(async (address?: string) => {
    const walletToRefresh = address ? wallets.find(w => w.address.toLowerCase() === address.toLowerCase()) : activeWallet;
    
    if (!walletToRefresh) return;

    const now = Date.now();
    if (now - walletToRefresh.lastUpdated < CACHE_DURATION) {
      return; // Skip refresh if cache is still valid
    }

    setLoading(true);
    try {
      const updatedData = await fetchWalletData(walletToRefresh.address);
      
      const updatedWallets = wallets.map(w =>
        w.address.toLowerCase() === updatedData.address.toLowerCase() ? updatedData : w
      );
      
      setWallets(updatedWallets);
      if (activeWallet?.address.toLowerCase() === updatedData.address.toLowerCase()) {
        setActiveWallet(updatedData);
      }
      
      await saveWalletsToStorage(updatedWallets);
    } catch (err) {
      setError('Failed to refresh wallet');
      console.error('Error refreshing wallet:', err);
    } finally {
      setLoading(false);
    }
  }, [wallets, activeWallet, fetchWalletData, saveWalletsToStorage]);

  return {
    wallets,
    activeWallet,
    wallet: activeWallet, // For backward compatibility
    loading,
    error,
    connectWallet,
    disconnectWallet,
    switchActiveWallet,
    refreshWallet,
    fetchWalletData,
  };
}
