import { useEffect, useState, useCallback } from 'react';
import { getQRWalletConnectService, initializeQRWalletConnect, WalletConnectConfig, WalletConnectSession, QRCodeData } from '@/lib/qr-walletconnect';

export function useQRWalletConnect(config?: WalletConnectConfig) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (config) {
      try {
        initializeQRWalletConnect(config);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize WalletConnect';
        setError(errorMessage);
      }
    }
  }, [config]);

  return {
    isInitialized,
    error,
  };
}

export function useQRCodeScanner() {
  const [scannedData, setScannedData] = useState<QRCodeData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseQRCode = useCallback((qrData: string) => {
    try {
      const service = getQRWalletConnectService();
      const parsed = service.parseQRCode(qrData);
      setScannedData(parsed);
      setError(null);
      return parsed;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse QR code';
      setError(errorMessage);
      return null;
    }
  }, []);

  return {
    scannedData,
    isScanning,
    error,
    parseQRCode,
    setScanning: setIsScanning,
  };
}

export function useWalletConnect() {
  const [session, setSession] = useState<WalletConnectSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = useCallback(async (qrData: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const service = getQRWalletConnectService();
      const newSession = await service.connectWallet(qrData);
      setSession(newSession);
      return newSession;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      const service = getQRWalletConnectService();
      await service.disconnectWallet();
      setSession(null);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect wallet';
      setError(errorMessage);
    }
  }, []);

  const isConnected = useCallback(() => {
    const service = getQRWalletConnectService();
    return service.isConnected();
  }, []);

  useEffect(() => {
    const service = getQRWalletConnectService();

    const handleSessionConnected = (data: WalletConnectSession) => {
      setSession(data);
    };

    const handleSessionDisconnected = () => {
      setSession(null);
    };

    const handleSessionError = (data: { error: string }) => {
      setError(data.error);
    };

    service.on('session_connected', handleSessionConnected);
    service.on('session_disconnected', handleSessionDisconnected);
    service.on('session_error', handleSessionError);

    return () => {
      service.off('session_connected');
      service.off('session_disconnected');
      service.off('session_error');
    };
  }, []);

  return {
    session,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    isConnected,
  };
}

export function useWalletTransaction() {
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTransaction = useCallback(
    async (tx: {
      from: string;
      to: string;
      value: string;
      data?: string;
      gas?: string;
      gasPrice?: string;
    }) => {
      setIsSending(true);
      setError(null);

      try {
        const service = getQRWalletConnectService();
        const hash = await service.sendTransaction(tx);
        setTxHash(hash);
        return hash;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
        setError(errorMessage);
        return null;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  return {
    txHash,
    isSending,
    error,
    sendTransaction,
  };
}

export function useWalletSignMessage() {
  const [signature, setSignature] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signMessage = useCallback(async (message: string, address: string) => {
    setIsSigning(true);
    setError(null);

    try {
      const service = getQRWalletConnectService();
      const sig = await service.signMessage(message, address);
      setSignature(sig);
      return sig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
      setError(errorMessage);
      return null;
    } finally {
      setIsSigning(false);
    }
  }, []);

  return {
    signature,
    isSigning,
    error,
    signMessage,
  };
}
