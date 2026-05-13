import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { ethers } from 'ethers';

interface WalletConnectSession {
  address: string;
  chainId: number;
  sessionId: string;
}

interface WalletConnectResult {
  success: boolean;
  address?: string;
  chainId?: number;
  error?: string;
}

const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/demo';

export function useWalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [session, setSession] = useState<WalletConnectSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.Provider | null>(null);

  // Inizializza provider
  useEffect(() => {
    const initProvider = async () => {
      try {
        const ethProvider = new ethers.JsonRpcProvider(RPC_URL);
        setProvider(ethProvider);
      } catch (err) {
        console.error('Provider initialization error:', err);
      }
    };
    initProvider();
  }, []);

  const connect = useCallback(async (): Promise<WalletConnectResult> => {
    try {
      setError(null);
      setIsConnecting(true);

      // Genera un session ID univoco
      const sessionId = `wc_${Date.now()}`;

      // Simula la connessione WalletConnect
      // In produzione, questo userebbe il vero protocollo WalletConnect v2
      const mockAddress = '0x' + 'c'.repeat(40);
      const chainId = 11155111; // Sepolia testnet

      // Simula il delay di connessione
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newSession: WalletConnectSession = {
        address: mockAddress,
        chainId,
        sessionId,
      };

      setSession(newSession);

      return {
        success: true,
        address: mockAddress,
        chainId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'WalletConnect connection failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  const sendTransaction = useCallback(async (to: string, value: string): Promise<string> => {
    if (!session || !provider) {
      throw new Error('WalletConnect not connected');
    }

    try {
      // In produzione, questo invierebbe la transazione tramite WalletConnect
      // Per ora, simuliamo una transazione
      const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      return txHash;
    } catch (err) {
      throw err;
    }
  }, [session, provider]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!session) {
      throw new Error('WalletConnect not connected');
    }

    try {
      // In produzione, questo chiederebbe la firma tramite WalletConnect
      // Per ora, simuliamo una firma
      const signature = '0x' + Array(130).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      return signature;
    } catch (err) {
      throw err;
    }
  }, [session]);

  return {
    connect,
    disconnect,
    isConnecting,
    session,
    error,
    provider,
    sendTransaction,
    signMessage,
    isConnected: session !== null,
  };
}
