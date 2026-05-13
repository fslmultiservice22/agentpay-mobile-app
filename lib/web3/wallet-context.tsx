import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { Platform, Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useMetaMaskConnection } from '@/hooks/use-metamask-connection';
import { useWalletConnect } from '@/hooks/use-walletconnect';
import { useTransactionSigning } from '@/hooks/use-transaction-signing';
import { useBalanceSync } from '@/hooks/use-balance-sync';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  balance: string | null;
  network: string | null;
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  connect: (type: 'metamask' | 'walletconnect' | 'local') => Promise<void>;
  disconnect: () => void;
  getBalance: () => Promise<string>;
  sendTransaction: (to: string, amount: string) => Promise<string>;
  signTransaction: (to: string, amount: string) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  error: string | null;
  checkMetaMaskInstalled?: () => Promise<boolean>;
  balanceSyncEnabled?: boolean;
  setBalanceSyncEnabled?: (enabled: boolean) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const METAMASK_DEEPLINK = 'https://metamask.app.link/dapp/';
const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/demo';

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balanceSyncEnabled, setBalanceSyncEnabled] = useState(true);
  const { checkMetaMaskInstalled } = useMetaMaskConnection();
  const { connect: connectWC, disconnect: disconnectWC, isConnected: wcConnected, session: wcSession } = useWalletConnect();
  const { signTransaction: signTx, signMessage: signMsg } = useTransactionSigning();
  const balanceSyncConfig = useMemo(
    () => ({
      address: address || '',
      provider,
      interval: 10000,
      enabled: balanceSyncEnabled && isConnected,
    }),
    [address, provider, balanceSyncEnabled, isConnected],
  );

  const { balance: syncedBalance, refresh: refreshBalance } = useBalanceSync(balanceSyncConfig);

  // Inizializza provider Sepolia
  useEffect(() => {
    const initProvider = async () => {
      try {
        const ethProvider = new ethers.JsonRpcProvider(RPC_URL);
        setProvider(ethProvider);
        setNetwork('sepolia');
      } catch (err) {
        console.error('Provider initialization error:', err);
        setError('Failed to initialize provider');
      }
    };
    initProvider();
  }, []);

  // Connessione MetaMask
  const connectMetaMask = useCallback(async () => {
    try {
      setError(null);

      // Verifica se MetaMask è installato
      const metamaskUrl = Platform.OS === 'android' ? 'metamask://' : 'metamask://';
      const isInstalled = await Linking.canOpenURL(metamaskUrl);

      if (!isInstalled) {
        // Prova ad aprire il link di download
        const storeUrl = Platform.OS === 'android'
          ? 'https://play.google.com/store/apps/details?id=io.metamask'
          : 'https://apps.apple.com/app/metamask/id1438144202';
        
        await Linking.openURL(storeUrl);
        setError('MetaMask not installed. Opening app store...');
        return;
      }

      // Genera un ID univoco per la sessione
      const sessionId = `agentpay_${Date.now()}`;
      await SecureStore.setItemAsync('metamask_session_id', sessionId);

      // Costruisci l'URL di deep linking
      const deepLinkUrl = `metamask://dapp?url=agentpay://wallet-connect&sessionId=${sessionId}`;

      // Apri MetaMask
      await Linking.openURL(deepLinkUrl);

      // Simula la connessione con delay
      setTimeout(async () => {
        try {
          const testProvider = new ethers.JsonRpcProvider(RPC_URL);
          const testAddress = '0x' + 'a'.repeat(40);
          
          setAddress(testAddress);
          setIsConnected(true);
          setProvider(testProvider);
          
          try {
            const bal = await testProvider.getBalance(testAddress);
            setBalance(ethers.formatEther(bal));
          } catch (balErr) {
            setBalance('0');
          }
        } catch (err) {
          console.error('MetaMask connection error:', err);
          setError('Failed to connect to MetaMask');
        }
      }, 2000);
    } catch (err) {
      console.error('MetaMask connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, []);

  // Connessione WalletConnect
  const connectWalletConnect = useCallback(async () => {
    try {
      setError(null);
      const result = await connectWC();
      
      if (result.success && result.address) {
        setAddress(result.address);
        setIsConnected(true);
        setNetwork('sepolia');
        setBalance('0');
      } else {
        setError(result.error || 'WalletConnect connection failed');
      }
    } catch (err) {
      console.error('WalletConnect connection error:', err);
      setError('WalletConnect connection failed');
    }
  }, [connectWC]);

  // Connessione locale (test)
  const connectLocal = useCallback(async () => {
    try {
      setError(null);
      
      // Crea un wallet locale per il test
      const wallet = ethers.Wallet.createRandom();
      const testProvider = new ethers.JsonRpcProvider(RPC_URL);
      const connectedWallet = wallet.connect(testProvider);

      setAddress(wallet.address);
      setIsConnected(true);
      setSigner(connectedWallet);
      setProvider(testProvider);
      setBalance('0.5'); // Balance di test
      
      // Salva il wallet privato in SecureStore (solo per test)
      await SecureStore.setItemAsync('test_wallet_pk', wallet.privateKey);
    } catch (err) {
      console.error('Local connection error:', err);
      setError('Failed to create local wallet');
    }
  }, []);

  const connect = useCallback(async (type: 'metamask' | 'walletconnect' | 'local') => {
    try {
      switch (type) {
        case 'metamask':
          await connectMetaMask();
          break;
        case 'walletconnect':
          await connectWalletConnect();
          break;
        case 'local':
          await connectLocal();
          break;
        default:
          setError('Unknown wallet type');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [connectMetaMask, connectWalletConnect, connectLocal, checkMetaMaskInstalled, connectWC]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setBalance(null);
    setSigner(null);
    setError(null);
    disconnectWC();
  }, [disconnectWC]);

  const getBalance = useCallback(async (): Promise<string> => {
    if (!provider || !address) {
      return '0';
    }
    try {
      const bal = await provider.getBalance(address);
      return ethers.formatEther(bal);
    } catch (err) {
      console.error('Error fetching balance:', err);
      return balance || '0';
    }
  }, [provider, address, balance]);

  const sendTransaction = useCallback(async (to: string, amount: string): Promise<string> => {
    if (!provider || !signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      });

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction failed');
      }

      // Aggiorna il balance dopo la transazione
      await refreshBalance();

      return receipt.hash;
    } catch (err) {
      console.error('Transaction error:', err);
      throw err;
    }
  }, [provider, signer, refreshBalance]);

  const signTransaction = useCallback(async (to: string, amount: string): Promise<string> => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await signTx(
        {
          to,
          value: amount,
        },
        signer,
      );

      if (!result.success || !result.signedTx) {
        throw new Error(result.error || 'Transaction signing failed');
      }

      return result.signedTx.rawTransaction;
    } catch (err) {
      console.error('Transaction signing error:', err);
      throw err;
    }
  }, [signer, signTx]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await signMsg(message, signer);

      if (!result.success || !result.signedTx) {
        throw new Error(result.error || 'Message signing failed');
      }

      return result.signedTx.signature;
    } catch (err) {
      console.error('Message signing error:', err);
      throw err;
    }
  }, [signer, signMsg]);

  // Usa il balance sincronizzato se disponibile
  const displayBalance = balanceSyncEnabled && syncedBalance ? syncedBalance : balance;

  const value: WalletContextType = {
    address,
    isConnected,
    balance: displayBalance,
    network,
    provider,
    signer,
    connect,
    disconnect,
    getBalance,
    sendTransaction,
    signTransaction: signTransaction,
    signMessage: signMessage,
    error,
    checkMetaMaskInstalled,
    balanceSyncEnabled,
    setBalanceSyncEnabled,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

export { WalletContext };
