import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FiatProvider {
  id: string;
  name: string;
  logo: string;
  fee: number; // percentage
  minAmount: number;
  maxAmount: number;
  supportedCurrencies: string[];
  supportedPaymentMethods: string[];
}

export interface FiatTransaction {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  cryptoAmount: string;
  cryptoToken: string;
  paymentMethod: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}

export interface FiatOnrampState {
  providers: FiatProvider[];
  transactions: FiatTransaction[];
  selectedProvider: FiatProvider | null;
  isLoading: boolean;
  error: string | null;
}

const FIAT_TRANSACTIONS_KEY = 'agentpay_fiat_transactions';

const DEFAULT_PROVIDERS: FiatProvider[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    logo: '💳',
    fee: 2.5,
    minAmount: 10,
    maxAmount: 50000,
    supportedCurrencies: ['USD', 'EUR', 'GBP'],
    supportedPaymentMethods: ['credit_card', 'debit_card', 'bank_transfer'],
  },
  {
    id: 'coinbase',
    name: 'Coinbase Pay',
    logo: '🪙',
    fee: 2.0,
    minAmount: 20,
    maxAmount: 100000,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
    supportedPaymentMethods: ['credit_card', 'debit_card', 'paypal'],
  },
  {
    id: 'ramp',
    name: 'Ramp Network',
    logo: '🚀',
    fee: 1.5,
    minAmount: 5,
    maxAmount: 75000,
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD'],
    supportedPaymentMethods: ['credit_card', 'bank_transfer', 'apple_pay'],
  },
];

export function useFiatOnramp() {
  const [state, setState] = useState<FiatOnrampState>({
    providers: DEFAULT_PROVIDERS,
    transactions: [],
    selectedProvider: null,
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Carica le transazioni
  const loadTransactions = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(FIAT_TRANSACTIONS_KEY);
      const transactions = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          transactions,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, []);

  // Seleziona un provider
  const selectProvider = useCallback((provider: FiatProvider) => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        selectedProvider: provider,
        error: null,
      }));
    }
  }, []);

  // Crea una transazione
  const createTransaction = useCallback(
    async (amount: number, currency: string, cryptoToken: string, paymentMethod: string): Promise<FiatTransaction | null> => {
      if (!state.selectedProvider) return null;

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Calcola l'importo in crypto (simulato)
        const cryptoAmount = (amount / 2500).toFixed(6); // Simulazione: 1 ETH = $2500

        // Crea la transazione
        const transaction: FiatTransaction = {
          id: `fiat_${Date.now()}`,
          provider: state.selectedProvider.id,
          amount,
          currency,
          cryptoAmount,
          cryptoToken,
          paymentMethod,
          status: 'pending',
          createdAt: Date.now(),
        };

        // Salva la transazione
        const transactions = state.transactions.concat(transaction);
        await AsyncStorage.setItem(FIAT_TRANSACTIONS_KEY, JSON.stringify(transactions));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            transactions,
            isLoading: false,
          }));
        }

        return transaction;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create transaction';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        }
        return null;
      }
    },
    [state.selectedProvider, state.transactions],
  );

  // Aggiorna lo stato della transazione
  const updateTransactionStatus = useCallback(
    async (transactionId: string, status: FiatTransaction['status']): Promise<boolean> => {
      try {
        const updated = state.transactions.map(tx =>
          tx.id === transactionId
            ? { ...tx, status, completedAt: status === 'completed' ? Date.now() : undefined }
            : tx,
        );

        await AsyncStorage.setItem(FIAT_TRANSACTIONS_KEY, JSON.stringify(updated));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            transactions: updated,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to update transaction:', err);
        return false;
      }
    },
    [state.transactions],
  );

  // Calcola la fee
  const calculateFee = useCallback((amount: number): number => {
    if (!state.selectedProvider) return 0;
    return (amount * state.selectedProvider.fee) / 100;
  }, [state.selectedProvider]);

  // Ottieni il totale da pagare
  const getTotalAmount = useCallback((amount: number): number => {
    return amount + calculateFee(amount);
  }, [calculateFee]);

  return {
    ...state,
    loadTransactions,
    selectProvider,
    createTransaction,
    updateTransactionStatus,
    calculateFee,
    getTotalAmount,
  };
}
