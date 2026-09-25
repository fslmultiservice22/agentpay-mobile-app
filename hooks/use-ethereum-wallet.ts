import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isValidEthereumAddress, normalizeEthereumAddress, BLOCKCHAIN_NETWORKS, BlockchainNetwork } from '@/lib/ethereum-validator';
import { fetchRealWalletBalance } from '@/lib/blockchain-api-service';

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
   * Fetch real wallet balance using public APIs (Etherscan + CoinGecko + Infura)
   */
  const fetchWalletData = useCallback(async (address: string): Promise<ConnectedWallet> => {
    const result = await fetchRealWalletBalance(address);

    // Build ETH asset
    const assets: WalletAsset[] = [
      {
        symbol: 'ETH',
        name: 'Ethereum',
        balance: result.ethBalance,
        value: result.ethValueUsd,
        changePercent24h: result.totalChangePercent24h,
        network: 'ethereum' as BlockchainNetwork,
      },
      ...result.tokens.map(t => ({
        symbol: t.symbol,
        name: t.name,
        balance: t.balance,
        value: t.valueUsd,
        changePercent24h: t.changePercent24h,
        network: t.network as BlockchainNetwork,
        contractAddress: t.contractAddress,
      })),
    ];

    return {
      address: normalizeEthereumAddress(address),
      totalValue: result.totalValueUsd,
      totalChange: result.totalChange24h,
      totalChangePercent: result.totalChangePercent24h,
      assets,
      lastUpdated: result.lastUpdated,
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
