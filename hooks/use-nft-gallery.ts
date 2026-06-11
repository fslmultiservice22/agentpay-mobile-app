import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NFT {
  id: string;
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  floorPrice: string;
  currentPrice: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  chainId: number;
  lastUpdated: number;
}

export interface NFTCollection {
  address: string;
  name: string;
  symbol: string;
  floorPrice: string;
  volume24h: string;
  owners: number;
  items: number;
}

interface NFTGalleryState {
  nfts: NFT[];
  collections: NFTCollection[];
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'agentpay_nft_gallery';

export function useNFTGallery(address: string | null) {
  const [state, setState] = useState<NFTGalleryState>({
    nfts: [],
    collections: [],
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Carica gli NFT dal storage
  const loadNFTs = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
      const nfts: NFT[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          nfts,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load NFTs';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Carica gli NFT al mount
  useEffect(() => {
    loadNFTs();
  }, [address, loadNFTs]);

  // Aggiungi un NFT alla gallery
  const addNFT = useCallback(
    async (nft: NFT): Promise<boolean> => {
      if (!address) return false;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let nfts: NFT[] = stored ? JSON.parse(stored) : [];

        // Controlla se l'NFT esiste già
        const exists = nfts.some(n => n.id === nft.id);
        if (exists) {
          return false;
        }

        // Aggiungi il nuovo NFT
        nfts.unshift(nft);

        // Salva nel storage
        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(nfts));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            nfts,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to add NFT:', err);
        return false;
      }
    },
    [address],
  );

  // Rimuovi un NFT dalla gallery
  const removeNFT = useCallback(
    async (nftId: string): Promise<boolean> => {
      if (!address) return false;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let nfts: NFT[] = stored ? JSON.parse(stored) : [];

        // Rimuovi l'NFT
        nfts = nfts.filter(n => n.id !== nftId);

        // Salva nel storage
        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(nfts));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            nfts,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to remove NFT:', err);
        return false;
      }
    },
    [address],
  );

  // Aggiorna il prezzo di un NFT
  const updateNFTPrice = useCallback(
    async (nftId: string, currentPrice: string): Promise<boolean> => {
      if (!address) return false;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let nfts: NFT[] = stored ? JSON.parse(stored) : [];

        // Trova e aggiorna l'NFT
        const nftIndex = nfts.findIndex(n => n.id === nftId);
        if (nftIndex !== -1) {
          nfts[nftIndex].currentPrice = currentPrice;
          nfts[nftIndex].lastUpdated = Date.now();

          // Salva nel storage
          await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(nfts));

          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              nfts,
            }));
          }

          return true;
        }

        return false;
      } catch (err) {
        console.error('Failed to update NFT price:', err);
        return false;
      }
    },
    [address],
  );

  // Ottieni gli NFT per collezione
  const getNFTsByCollection = useCallback(
    (collection: string): NFT[] => {
      return state.nfts.filter(nft => nft.collection === collection);
    },
    [state.nfts],
  );

  // Ottieni gli NFT per rarità
  const getNFTsByRarity = useCallback(
    (rarity: NFT['rarity']): NFT[] => {
      return state.nfts.filter(nft => nft.rarity === rarity);
    },
    [state.nfts],
  );

  // Calcola il valore totale della gallery
  const calculateTotalValue = useCallback((): string => {
    const total = state.nfts.reduce((sum, nft) => sum + parseFloat(nft.currentPrice || '0'), 0);
    return total.toFixed(2);
  }, [state.nfts]);

  // Ottieni le statistiche della gallery
  const getGalleryStats = useCallback(
    () => {
      const totalValue = calculateTotalValue();
      const totalNFTs = state.nfts.length;
      const collections = new Set(state.nfts.map(nft => nft.collection)).size;

      // Conta per rarità
      const rarityCount = {
        common: state.nfts.filter(n => n.rarity === 'common').length,
        uncommon: state.nfts.filter(n => n.rarity === 'uncommon').length,
        rare: state.nfts.filter(n => n.rarity === 'rare').length,
        epic: state.nfts.filter(n => n.rarity === 'epic').length,
        legendary: state.nfts.filter(n => n.rarity === 'legendary').length,
      };

      return {
        totalValue,
        totalNFTs,
        totalCollections: collections,
        rarityCount,
        averagePrice: totalNFTs > 0 ? (parseFloat(totalValue) / totalNFTs).toFixed(2) : '0',
      };
    },
    [state.nfts, calculateTotalValue],
  );

  // Sincronizza gli NFT dal blockchain (simulato)
  const syncFromBlockchain = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      // Simula il caricamento degli NFT dal blockchain
      // In produzione, useremmo Alchemy API, Moralis, o OpenSea API
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync NFTs from blockchain';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    nfts: state.nfts,
    collections: state.collections,
    isLoading: state.isLoading,
    error: state.error,
    addNFT,
    removeNFT,
    updateNFTPrice,
    getNFTsByCollection,
    getNFTsByRarity,
    calculateTotalValue,
    getGalleryStats,
    syncFromBlockchain,
    loadNFTs,
  };
}
