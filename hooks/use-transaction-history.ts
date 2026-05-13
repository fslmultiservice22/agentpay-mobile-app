import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';

export interface Transaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
  type: 'sent' | 'received';
}

interface TransactionHistoryState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'agentpay_transaction_history';
const MAX_TRANSACTIONS = 100;

export function useTransactionHistory(address: string | null, provider: ethers.Provider | null) {
  const [state, setState] = useState<TransactionHistoryState>({
    transactions: [],
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Carica la storia delle transazioni dal storage
  const loadTransactionHistory = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
      const transactions: Transaction[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState({
          transactions,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transaction history';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Carica la storia al mount o quando cambia l'indirizzo
  useEffect(() => {
    loadTransactionHistory();
  }, [address, loadTransactionHistory]);

  // Salva una transazione nella storia
  const addTransaction = useCallback(
    async (tx: Transaction) => {
      if (!address) return;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let transactions: Transaction[] = stored ? JSON.parse(stored) : [];

        // Aggiungi la nuova transazione
        transactions.unshift(tx);

        // Mantieni solo le ultime MAX_TRANSACTIONS
        transactions = transactions.slice(0, MAX_TRANSACTIONS);

        // Salva nel storage
        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(transactions));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            transactions,
          }));
        }
      } catch (err) {
        console.error('Failed to add transaction:', err);
      }
    },
    [address],
  );

  // Aggiorna lo stato di una transazione
  const updateTransactionStatus = useCallback(
    async (txHash: string, status: 'pending' | 'confirmed' | 'failed', blockNumber?: number) => {
      if (!address) return;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let transactions: Transaction[] = stored ? JSON.parse(stored) : [];

        // Trova e aggiorna la transazione
        const txIndex = transactions.findIndex(tx => tx.hash === txHash);
        if (txIndex !== -1) {
          transactions[txIndex].status = status;
          if (blockNumber) {
            transactions[txIndex].blockNumber = blockNumber;
          }

          // Salva nel storage
          await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(transactions));

          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              transactions,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to update transaction status:', err);
      }
    },
    [address],
  );

  // Sincronizza le transazioni dal blockchain
  const syncFromBlockchain = useCallback(async () => {
    if (!address || !provider) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
      }));

      // Ottieni le transazioni dal blockchain (simulato)
      // In produzione, useremmo un servizio come Etherscan API o The Graph
      const blockNumber = await provider.getBlockNumber();

      // Simula il caricamento di transazioni dal blockchain
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync from blockchain';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address, provider]);

  // Cancella la storia delle transazioni
  const clearHistory = useCallback(async () => {
    if (!address) return;

    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY}_${address}`);

      if (isMountedRef.current) {
        setState({
          transactions: [],
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      console.error('Failed to clear transaction history:', err);
    }
  }, [address]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    transactions: state.transactions,
    isLoading: state.isLoading,
    error: state.error,
    addTransaction,
    updateTransactionStatus,
    syncFromBlockchain,
    clearHistory,
    loadTransactionHistory,
  };
}
