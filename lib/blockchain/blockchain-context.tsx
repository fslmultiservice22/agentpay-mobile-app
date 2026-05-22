import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlockchainId, BLOCKCHAINS, AVAILABLE_BLOCKCHAINS, BlockchainConfig } from './blockchain-config';

interface BlockchainContextType {
  selectedBlockchain: BlockchainId;
  setSelectedBlockchain: (blockchain: BlockchainId) => Promise<void>;
  currentConfig: BlockchainConfig;
  availableBlockchains: BlockchainId[];
  switchNetwork: (blockchain: BlockchainId) => Promise<void>;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(undefined);

export function BlockchainProvider({ children }: { children: React.ReactNode }) {
  const [selectedBlockchain, setSelectedBlockchainState] = useState<BlockchainId>('ethereum');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved blockchain from AsyncStorage on mount
  useEffect(() => {
    const loadBlockchain = async () => {
      try {
        const saved = await AsyncStorage.getItem('agentpay_blockchain');
        if (saved && AVAILABLE_BLOCKCHAINS.includes(saved as BlockchainId)) {
          setSelectedBlockchainState(saved as BlockchainId);
        }
      } catch (error) {
        console.error('Error loading blockchain preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBlockchain();
  }, []);

  const setSelectedBlockchain = async (blockchain: BlockchainId) => {
    if (!AVAILABLE_BLOCKCHAINS.includes(blockchain)) {
      console.error(`Blockchain ${blockchain} is not available`);
      return;
    }

    try {
      await AsyncStorage.setItem('agentpay_blockchain', blockchain);
      setSelectedBlockchainState(blockchain);
    } catch (error) {
      console.error('Error saving blockchain preference:', error);
    }
  };

  const switchNetwork = async (blockchain: BlockchainId) => {
    await setSelectedBlockchain(blockchain);
  };

  const currentConfig = BLOCKCHAINS[selectedBlockchain];

  const value: BlockchainContextType = {
    selectedBlockchain,
    setSelectedBlockchain,
    currentConfig,
    availableBlockchains: AVAILABLE_BLOCKCHAINS,
    switchNetwork,
  };

  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
}

export function useBlockchain(): BlockchainContextType {
  const context = useContext(BlockchainContext);
  if (!context) {
    throw new Error('useBlockchain must be used within BlockchainProvider');
  }
  return context;
}
