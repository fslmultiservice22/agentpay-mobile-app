import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recurringPaymentScheduler, type RecurringPayment, type PaymentExecution } from '@/lib/recurring-payment-scheduler';

const STORAGE_KEY = 'agentpay_recurring_payments';

interface UseRecurringPaymentsState {
  payments: RecurringPayment[];
  loading: boolean;
  error: string | null;
}

export function useRecurringPayments() {
  const [state, setState] = useState<UseRecurringPaymentsState>({
    payments: [],
    loading: true,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Load payments from storage
  const loadPayments = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const payments: RecurringPayment[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          payments,
          loading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payments';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    }
  }, []);

  // Load payments on mount
  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Save payments to storage
  const savePayments = useCallback(async (payments: RecurringPayment[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
    } catch (err) {
      console.error('Failed to save payments:', err);
    }
  }, []);

  // Create a new recurring payment
  const createPayment = useCallback(
    async (payment: Omit<RecurringPayment, 'id' | 'executionCount' | 'failureCount' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newPayment = recurringPaymentScheduler.createRecurringPayment(payment);

        const updatedPayments = [...state.payments, newPayment];
        await savePayments(updatedPayments);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            payments: updatedPayments,
          }));
        }

        return newPayment;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.payments, savePayments]
  );

  // Update a recurring payment
  const updatePayment = useCallback(
    async (id: string, updates: Partial<RecurringPayment>) => {
      try {
        const updated = recurringPaymentScheduler.updateRecurringPayment(id, updates);
        if (!updated) throw new Error('Payment not found');

        const updatedPayments = state.payments.map(p => (p.id === id ? updated : p));
        await savePayments(updatedPayments);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            payments: updatedPayments,
          }));
        }

        return updated;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update payment';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.payments, savePayments]
  );

  // Delete a recurring payment
  const deletePayment = useCallback(
    async (id: string) => {
      try {
        recurringPaymentScheduler.deleteRecurringPayment(id);

        const updatedPayments = state.payments.filter(p => p.id !== id);
        await savePayments(updatedPayments);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            payments: updatedPayments,
          }));
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete payment';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.payments, savePayments]
  );

  // Pause a recurring payment
  const pausePayment = useCallback(
    async (id: string) => {
      try {
        const paused = recurringPaymentScheduler.pauseRecurringPayment(id);
        if (!paused) throw new Error('Payment not found');

        const updatedPayments = state.payments.map(p => (p.id === id ? paused : p));
        await savePayments(updatedPayments);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            payments: updatedPayments,
          }));
        }

        return paused;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to pause payment';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.payments, savePayments]
  );

  // Resume a recurring payment
  const resumePayment = useCallback(
    async (id: string) => {
      try {
        const resumed = recurringPaymentScheduler.resumeRecurringPayment(id);
        if (!resumed) throw new Error('Payment not found');

        const updatedPayments = state.payments.map(p => (p.id === id ? resumed : p));
        await savePayments(updatedPayments);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            payments: updatedPayments,
          }));
        }

        return resumed;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to resume payment';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.payments, savePayments]
  );

  // Execute a payment immediately
  const executePaymentNow = useCallback(async (id: string) => {
    try {
      const execution = await recurringPaymentScheduler.executePayment(id);
      return execution;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute payment';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
      }
      throw err;
    }
  }, []);

  // Get execution history
  const getExecutionHistory = useCallback((paymentId: string): PaymentExecution[] => {
    return recurringPaymentScheduler.getExecutionHistory(paymentId);
  }, []);

  // Get payment statistics
  const getStatistics = useCallback((paymentId: string) => {
    return recurringPaymentScheduler.getPaymentStatistics(paymentId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    payments: state.payments,
    loading: state.loading,
    error: state.error,
    createPayment,
    updatePayment,
    deletePayment,
    pausePayment,
    resumePayment,
    executePaymentNow,
    getExecutionHistory,
    getStatistics,
    loadPayments,
  };
}
