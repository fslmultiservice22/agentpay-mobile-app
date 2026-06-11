import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TransactionDetails {
  id: string;
  type: 'send' | 'swap' | 'stake' | 'unstake' | 'claim' | 'bridge';
  from: string;
  to?: string;
  fromToken?: string;
  toToken?: string;
  fromAmount: string;
  toAmount?: string;
  gasPrice: string;
  gasLimit: string;
  totalFee: string;
  estimatedTime: string;
  data?: Record<string, any>;
}

export interface ConfirmationState {
  isVisible: boolean;
  transaction: TransactionDetails | null;
  isLoading: boolean;
  error: string | null;
  isConfirmed: boolean;
}

const CONFIRMATION_HISTORY_KEY = 'agentpay_confirmation_history';

export function useTransactionConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    isVisible: false,
    transaction: null,
    isLoading: false,
    error: null,
    isConfirmed: false,
  });

  const isMountedRef = useRef(true);

  // Apri il modal di conferma
  const openConfirmation = useCallback((transaction: TransactionDetails) => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isVisible: true,
        transaction,
        error: null,
        isConfirmed: false,
      }));
    }
  }, []);

  // Chiudi il modal
  const closeConfirmation = useCallback(() => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isVisible: false,
        transaction: null,
      }));
    }
  }, []);

  // Conferma la transazione
  const confirmTransaction = useCallback(async (): Promise<boolean> => {
    if (!state.transaction) return false;

    try {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));
      }

      // Simula l'invio della transazione
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Salva nella cronologia
      const history = await AsyncStorage.getItem(CONFIRMATION_HISTORY_KEY);
      const confirmations = history ? JSON.parse(history) : [];
      confirmations.push({
        ...state.transaction,
        confirmedAt: Date.now(),
      });

      // Mantieni solo gli ultimi 100
      if (confirmations.length > 100) {
        confirmations.shift();
      }

      await AsyncStorage.setItem(CONFIRMATION_HISTORY_KEY, JSON.stringify(confirmations));

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isConfirmed: true,
        }));
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm transaction';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
      return false;
    }
  }, [state.transaction]);

  // Annulla la transazione
  const cancelTransaction = useCallback(() => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isVisible: false,
        transaction: null,
        error: null,
      }));
    }
  }, []);

  // Ottieni la cronologia delle conferme
  const getConfirmationHistory = useCallback(async (): Promise<TransactionDetails[]> => {
    try {
      const history = await AsyncStorage.getItem(CONFIRMATION_HISTORY_KEY);
      return history ? JSON.parse(history) : [];
    } catch (err) {
      console.error('Failed to get confirmation history:', err);
      return [];
    }
  }, []);

  // Calcola il costo totale della transazione
  const calculateTotalCost = useCallback((transaction: TransactionDetails): string => {
    try {
      const gasCost = parseFloat(transaction.totalFee);
      const amount = parseFloat(transaction.fromAmount);
      const total = gasCost + amount;
      return total.toFixed(6);
    } catch {
      return '0';
    }
  }, []);

  // Formatta l'importo per la visualizzazione
  const formatAmount = useCallback((amount: string, decimals: number = 4): string => {
    try {
      const num = parseFloat(amount);
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      });
    } catch {
      return amount;
    }
  }, []);

  return {
    ...state,
    openConfirmation,
    closeConfirmation,
    confirmTransaction,
    cancelTransaction,
    getConfirmationHistory,
    calculateTotalCost,
    formatAmount,
  };
}
