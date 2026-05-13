import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  balance: string | null;
  network: string | null;
  connect: (type: 'metamask' | 'walletconnect' | 'local') => Promise<void>;
  disconnect: () => void;
  getBalance: () => Promise<string>;
  sendTransaction: (to: string, amount: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);

  const connect = useCallback(async (type: 'metamask' | 'walletconnect' | 'local') => {
    try {
      if (type === 'local') {
        // Simulazione connessione locale
        const mockAddress = '0x' + '1234567890abcdef'.repeat(2).slice(0, 40);
        setAddress(mockAddress);
        setIsConnected(true);
        setNetwork('ethereum');
        setBalance('1.5');
      } else {
        // Placeholder per MetaMask/WalletConnect
        console.log('Connecting with', type);
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setBalance(null);
    setNetwork(null);
  }, []);

  const getBalance = useCallback(async (): Promise<string> => {
    // Placeholder - implementare con vero provider
    return balance || '0';
  }, [balance]);

  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string> => {
    // Placeholder - implementare con vero provider
    return 'mock-tx-hash-' + Date.now();
  }, []);

  const value: WalletContextType = {
    address,
    isConnected,
    balance,
    network,
    connect,
    disconnect,
    getBalance,
    sendTransaction,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};
