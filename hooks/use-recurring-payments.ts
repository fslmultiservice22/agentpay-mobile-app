import { useState, useCallback, useEffect } from 'react';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringPayment {
  id: string;
  toAddress: string;
  amount: string;
  token: string;
  frequency: RecurrenceType;
  nextPaymentDate: number;
  lastPaymentDate?: number;
  endDate?: number;
  status: 'active' | 'paused' | 'completed';
  totalPayments: number;
  completedPayments: number;
  memo?: string;
  createdAt: number;
}

export interface UseRecurringPaymentsReturn {
  payments: RecurringPayment[];
  loading: boolean;
  error: string | null;
  createRecurringPayment: (
    toAddress: string,
    amount: string,
    token: string,
    frequency: RecurrenceType,
    endDate?: number,
    memo?: string
  ) => Promise<RecurringPayment>;
  pausePayment: (paymentId: string) => Promise<void>;
  resumePayment: (paymentId: string) => Promise<void>;
  cancelPayment: (paymentId: string) => Promise<void>;
  executePayment: (paymentId: string) => Promise<void>;
  getUpcomingPayments: () => RecurringPayment[];
  getActivePayments: () => RecurringPayment[];
}

/**
 * Hook per gestire pagamenti ricorrenti
 * Supporta pagamenti automatici periodici
 */
export function useRecurringPayments(): UseRecurringPaymentsReturn {
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getNextPaymentDate = (frequency: RecurrenceType, baseDate: number = Date.now()): number => {
    const date = new Date(baseDate);

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }

    return date.getTime();
  };

  const createRecurringPayment = useCallback(
    async (
      toAddress: string,
      amount: string,
      token: string,
      frequency: RecurrenceType,
      endDate?: number,
      memo?: string
    ): Promise<RecurringPayment> => {
      setLoading(true);
      setError(null);

      try {
        // Validazione
        if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          throw new Error('Invalid address');
        }

        if (parseFloat(amount) <= 0) {
          throw new Error('Amount must be greater than 0');
        }

        const paymentId = `recurring_${Date.now()}`;
        const newPayment: RecurringPayment = {
          id: paymentId,
          toAddress,
          amount,
          token,
          frequency,
          nextPaymentDate: getNextPaymentDate(frequency),
          endDate,
          status: 'active',
          totalPayments: endDate ? Math.ceil((endDate - Date.now()) / (24 * 60 * 60 * 1000)) : 0,
          completedPayments: 0,
          memo,
          createdAt: Date.now(),
        };

        setPayments((prev) => [newPayment, ...prev]);
        return newPayment;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create recurring payment';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const pausePayment = useCallback(async (paymentId: string) => {
    try {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                status: 'paused',
              }
            : p
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause payment';
      setError(errorMessage);
    }
  }, []);

  const resumePayment = useCallback(async (paymentId: string) => {
    try {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                status: 'active',
              }
            : p
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume payment';
      setError(errorMessage);
    }
  }, []);

  const cancelPayment = useCallback(async (paymentId: string) => {
    try {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                status: 'completed',
                endDate: Date.now(),
              }
            : p
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel payment';
      setError(errorMessage);
    }
  }, []);

  const executePayment = useCallback(async (paymentId: string) => {
    try {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? {
                ...p,
                lastPaymentDate: Date.now(),
                nextPaymentDate: getNextPaymentDate(p.frequency),
                completedPayments: p.completedPayments + 1,
              }
            : p
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute payment';
      setError(errorMessage);
    }
  }, []);

  const getUpcomingPayments = useCallback(() => {
    const now = Date.now();
    return payments
      .filter((p) => p.status === 'active' && p.nextPaymentDate <= now + 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => a.nextPaymentDate - b.nextPaymentDate);
  }, [payments]);

  const getActivePayments = useCallback(() => {
    return payments.filter((p) => p.status === 'active');
  }, [payments]);

  // Simulazione esecuzione pagamenti automatici
  useEffect(() => {
    const interval = setInterval(() => {
      setPayments((prev) =>
        prev.map((p) => {
          if (p.status === 'active' && p.nextPaymentDate <= Date.now()) {
            return {
              ...p,
              lastPaymentDate: Date.now(),
              nextPaymentDate: getNextPaymentDate(p.frequency),
              completedPayments: p.completedPayments + 1,
            };
          }
          return p;
        })
      );
    }, 60000); // Controlla ogni minuto

    return () => clearInterval(interval);
  }, []);

  return {
    payments,
    loading,
    error,
    createRecurringPayment,
    pausePayment,
    resumePayment,
    cancelPayment,
    executePayment,
    getUpcomingPayments,
    getActivePayments,
  };
}
