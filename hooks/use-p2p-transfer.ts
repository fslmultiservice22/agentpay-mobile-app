import { useState, useCallback } from 'react';
import { useEthereumWallet as useWallet } from '@/hooks/use-ethereum-wallet';

export interface P2PTransfer {
  id: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string;
  error?: string;
}

export interface UseP2PTransferReturn {
  transfers: P2PTransfer[];
  loading: boolean;
  error: string | null;
  sendTransfer: (toAddress: string, amount: string, token: string) => Promise<void>;
  getTransferHistory: () => P2PTransfer[];
  cancelTransfer: (transferId: string) => Promise<void>;
}

/**
 * Hook per gestire trasferimenti P2P (peer-to-peer) di token
 * Supporta invio di token ad altri indirizzi wallet
 */
export function useP2PTransfer(): UseP2PTransferReturn {
  const { address, isConnected } = useWallet();
  const [transfers, setTransfers] = useState<P2PTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTransfer = useCallback(
    async (toAddress: string, amount: string, token: string) => {
      if (!address || !isConnected) {
        setError('Wallet not connected');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Validazione indirizzo
        if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          throw new Error('Invalid recipient address');
        }

        // Validazione importo
        if (parseFloat(amount) <= 0) {
          throw new Error('Amount must be greater than 0');
        }

        // Simulazione trasferimento
        const transferId = `transfer_${Date.now()}`;
        const newTransfer: P2PTransfer = {
          id: transferId,
          fromAddress: address,
          toAddress,
          amount,
          token,
          status: 'pending',
          timestamp: Date.now(),
        };

        setTransfers((prev) => [newTransfer, ...prev]);

        // Simulazione delay di transazione
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Aggiornamento stato a completato
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === transferId
              ? {
                  ...t,
                  status: 'completed',
                  txHash: `0x${Math.random().toString(16).slice(2)}`,
                }
              : t
          )
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
        setError(errorMessage);

        // Aggiornamento stato a fallito
        setTransfers((prev) =>
          prev.map((t) =>
            t.status === 'pending'
              ? {
                  ...t,
                  status: 'failed',
                  error: errorMessage,
                }
              : t
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [address, isConnected]
  );

  const getTransferHistory = useCallback(() => {
    return transfers.sort((a, b) => b.timestamp - a.timestamp);
  }, [transfers]);

  const cancelTransfer = useCallback(
    async (transferId: string) => {
      const transfer = transfers.find((t) => t.id === transferId);

      if (!transfer || transfer.status !== 'pending') {
        setError('Cannot cancel this transfer');
        return;
      }

      try {
        setTransfers((prev) =>
          prev.map((t) =>
            t.id === transferId
              ? {
                  ...t,
                  status: 'failed',
                  error: 'Cancelled by user',
                }
              : t
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cancel failed');
      }
    },
    [transfers]
  );

  return {
    transfers,
    loading,
    error,
    sendTransfer,
    getTransferHistory,
    cancelTransfer,
  };
}
