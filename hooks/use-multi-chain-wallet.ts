import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BlockchainType,
  ValidatedAddress,
  MultiChainWallet,
  validateAddress,
  validateAddressAuto,
  createMultiChainWallet,
  getBlockchainInfo,
  maskAddress,
} from '@/lib/multi-chain-validator';

export interface UseMultiChainWalletReturn {
  wallets: Map<BlockchainType, string>;
  primaryBlockchain: BlockchainType;
  isMultiChain: boolean;
  loading: boolean;
  error: string | null;
  addWallet: (address: string, blockchain: BlockchainType) => Promise<boolean>;
  removeWallet: (blockchain: BlockchainType) => Promise<void>;
  switchPrimary: (blockchain: BlockchainType) => Promise<void>;
  getWallet: (blockchain: BlockchainType) => string | undefined;
  getAllWallets: () => Map<BlockchainType, string>;
  validateAndAdd: (address: string) => Promise<ValidatedAddress | null>;
  getMaskedAddress: (blockchain: BlockchainType) => string;
}

const STORAGE_KEY = 'multi_chain_wallets';

/**
 * Hook per gestire wallet su multiple blockchain
 */
export function useMultiChainWallet(): UseMultiChainWalletReturn {
  const [wallets, setWallets] = useState<Map<BlockchainType, string>>(new Map());
  const [primaryBlockchain, setPrimaryBlockchain] = useState<BlockchainType>('ethereum');
  const [isMultiChain, setIsMultiChain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica i wallet da storage al mount
  useEffect(() => {
    loadWalletsFromStorage();
  }, []);

  /**
   * Carica i wallet da AsyncStorage
   */
  const loadWalletsFromStorage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const walletsMap = new Map<BlockchainType, string>(Object.entries(data.wallets || {}));
        setWallets(walletsMap);
        setPrimaryBlockchain(data.primaryBlockchain || 'ethereum');
        setIsMultiChain(walletsMap.size > 1);
      }
    } catch (err) {
      console.error('Error loading wallets from storage:', err);
      setError('Failed to load wallets');
    }
  }, []);

  /**
   * Salva i wallet in AsyncStorage
   */
  const saveWalletsToStorage = useCallback(async (updatedWallets: Map<BlockchainType, string>, primary: BlockchainType) => {
    try {
      const data = {
        wallets: Object.fromEntries(updatedWallets),
        primaryBlockchain: primary,
        lastUpdated: Date.now(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving wallets to storage:', err);
      setError('Failed to save wallets');
    }
  }, []);

  /**
   * Aggiunge un wallet
   */
  const addWallet = useCallback(
    async (address: string, blockchain: BlockchainType): Promise<boolean> => {
      try {
        setError(null);
        setLoading(true);

        const validated = validateAddress(address, blockchain);
        if (!validated.isValid) {
          setError(`Invalid ${blockchain} address`);
          return false;
        }

        const updatedWallets = new Map(wallets);
        updatedWallets.set(blockchain, validated.normalized);

        setWallets(updatedWallets);
        setIsMultiChain(updatedWallets.size > 1);

        // Se è il primo wallet, lo rende primario
        const newPrimary = wallets.size === 0 ? blockchain : primaryBlockchain;
        setPrimaryBlockchain(newPrimary);

        await saveWalletsToStorage(updatedWallets, newPrimary);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add wallet';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [wallets, primaryBlockchain, saveWalletsToStorage]
  );

  /**
   * Rimuove un wallet
   */
  const removeWallet = useCallback(
    async (blockchain: BlockchainType) => {
      try {
        setError(null);
        const updatedWallets = new Map(wallets);
        updatedWallets.delete(blockchain);

        setWallets(updatedWallets);
        setIsMultiChain(updatedWallets.size > 1);

        // Se il wallet rimosso era primario, cambia il primario
        let newPrimary = primaryBlockchain;
        if (blockchain === primaryBlockchain && updatedWallets.size > 0) {
          newPrimary = Array.from(updatedWallets.keys())[0];
          setPrimaryBlockchain(newPrimary);
        }

        await saveWalletsToStorage(updatedWallets, newPrimary);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove wallet';
        setError(errorMessage);
      }
    },
    [wallets, primaryBlockchain, saveWalletsToStorage]
  );

  /**
   * Cambia il wallet primario
   */
  const switchPrimary = useCallback(
    async (blockchain: BlockchainType) => {
      try {
        setError(null);

        if (!wallets.has(blockchain)) {
          setError('Wallet not found');
          return;
        }

        setPrimaryBlockchain(blockchain);
        await saveWalletsToStorage(wallets, blockchain);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to switch primary wallet';
        setError(errorMessage);
      }
    },
    [wallets, saveWalletsToStorage]
  );

  /**
   * Ottiene un wallet specifico
   */
  const getWallet = useCallback((blockchain: BlockchainType): string | undefined => {
    return wallets.get(blockchain);
  }, [wallets]);

  /**
   * Ottiene tutti i wallet
   */
  const getAllWallets = useCallback((): Map<BlockchainType, string> => {
    return new Map(wallets);
  }, [wallets]);

  /**
   * Valida e aggiunge un indirizzo automaticamente
   */
  const validateAndAdd = useCallback(
    async (address: string): Promise<ValidatedAddress | null> => {
      try {
        setError(null);
        setLoading(true);

        const validated = validateAddressAuto(address);
        if (!validated) {
          setError('Invalid address format');
          return null;
        }

        const success = await addWallet(address, validated.blockchain);
        return success ? validated : null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to validate and add wallet';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [addWallet]
  );

  /**
   * Ottiene un indirizzo mascherato per la visualizzazione
   */
  const getMaskedAddress = useCallback(
    (blockchain: BlockchainType): string => {
      const address = wallets.get(blockchain);
      if (!address) return '';
      return maskAddress(address, blockchain);
    },
    [wallets]
  );

  return {
    wallets,
    primaryBlockchain,
    isMultiChain,
    loading,
    error,
    addWallet,
    removeWallet,
    switchPrimary,
    getWallet,
    getAllWallets,
    validateAndAdd,
    getMaskedAddress,
  };
}
