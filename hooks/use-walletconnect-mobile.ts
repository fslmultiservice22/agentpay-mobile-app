import { useState, useCallback, useEffect } from 'react';
import { walletConnectMobileService, type WalletConnectSession } from '@/lib/walletconnect-mobile-service';

export interface UseWalletConnectMobileReturn {
  // State
  sessions: WalletConnectSession[];
  activeSessions: WalletConnectSession[];
  isConnecting: boolean;
  error: string | null;
  pairingUri: string | null;

  // Methods
  generatePairingUri: () => Promise<void>;
  connectViaQR: (uri: string) => Promise<WalletConnectSession | null>;
  approveSession: (sessionId: string, walletAddress: string, chainId: number) => Promise<void>;
  rejectSession: (sessionId: string) => Promise<void>;
  disconnectSession: (sessionId: string) => Promise<void>;
  sendTransaction: (sessionId: string, to: string, value: string, data?: string) => Promise<void>;
  signMessage: (sessionId: string, message: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Hook for WalletConnect Mobile integration
 */
export function useWalletConnectMobile(): UseWalletConnectMobileReturn {
  const [sessions, setSessions] = useState<WalletConnectSession[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairingUri, setPairingUri] = useState<string | null>(null);

  /**
   * Generate pairing URI
   */
  const handleGeneratePairingUri = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const uri = await walletConnectMobileService.getPairingUri();
      setPairingUri(uri);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate pairing URI';
      setError(errorMessage);
      console.error('Generate pairing URI error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Connect via QR code
   */
  const handleConnectViaQR = useCallback(
    async (uri: string): Promise<WalletConnectSession | null> => {
      setIsConnecting(true);
      setError(null);

      try {
        const session = await walletConnectMobileService.connectWalletViaQR(uri);
        setSessions(prev => [...prev, session]);
        return session;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect via QR';
        setError(errorMessage);
        console.error('Connect via QR error:', err);
        return null;
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  /**
   * Approve session
   */
  const handleApproveSession = useCallback(
    async (sessionId: string, walletAddress: string, chainId: number) => {
      setError(null);

      try {
        const session = await walletConnectMobileService.approveSession(
          sessionId,
          walletAddress,
          chainId
        );
        setSessions(prev => prev.map(s => (s.id === sessionId ? session : s)));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to approve session';
        setError(errorMessage);
        console.error('Approve session error:', err);
      }
    },
    []
  );

  /**
   * Reject session
   */
  const handleRejectSession = useCallback(async (sessionId: string) => {
    setError(null);

    try {
      await walletConnectMobileService.rejectSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject session';
      setError(errorMessage);
      console.error('Reject session error:', err);
    }
  }, []);

  /**
   * Disconnect session
   */
  const handleDisconnectSession = useCallback(async (sessionId: string) => {
    setError(null);

    try {
      await walletConnectMobileService.disconnectSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect session';
      setError(errorMessage);
      console.error('Disconnect session error:', err);
    }
  }, []);

  /**
   * Send transaction
   */
  const handleSendTransaction = useCallback(
    async (sessionId: string, to: string, value: string, data?: string) => {
      setError(null);

      try {
        await walletConnectMobileService.sendTransactionRequest(sessionId, to, value, data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
        setError(errorMessage);
        console.error('Send transaction error:', err);
      }
    },
    []
  );

  /**
   * Sign message
   */
  const handleSignMessage = useCallback(async (sessionId: string, message: string) => {
    setError(null);

    try {
      await walletConnectMobileService.sendSignMessageRequest(sessionId, message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign message';
      setError(errorMessage);
      console.error('Sign message error:', err);
    }
  }, []);

  /**
   * Refresh sessions
   */
  const handleRefresh = useCallback(() => {
    setSessions(walletConnectMobileService.getActiveSessions());
  }, []);

  // Initialize on mount
  useEffect(() => {
    walletConnectMobileService.initialize();
    handleRefresh();

    // Listen to events
    walletConnectMobileService.on('session_connected', () => {
      handleRefresh();
    });

    walletConnectMobileService.on('session_disconnected', () => {
      handleRefresh();
    });

    return () => {
      // Cleanup listeners
    };
  }, [handleRefresh]);

  return {
    sessions,
    activeSessions: walletConnectMobileService.getActiveSessions(),
    isConnecting,
    error,
    pairingUri,
    generatePairingUri: handleGeneratePairingUri,
    connectViaQR: handleConnectViaQR,
    approveSession: handleApproveSession,
    rejectSession: handleRejectSession,
    disconnectSession: handleDisconnectSession,
    sendTransaction: handleSendTransaction,
    signMessage: handleSignMessage,
    refresh: handleRefresh,
  };
}
