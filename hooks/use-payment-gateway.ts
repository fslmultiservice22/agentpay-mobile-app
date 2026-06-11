import { useState, useCallback } from 'react';

export type PaymentProvider = 'stripe' | 'paypal' | 'square' | 'coinbase';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'bank_transfer' | 'wallet';

export interface PaymentGatewayConfig {
  provider: PaymentProvider;
  apiKey: string;
  secretKey?: string;
  webhookSecret?: string;
  enabled: boolean;
}

export interface Payment {
  id: string;
  userId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  description: string;
  transactionId?: string;
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
}

export function usePaymentGateway() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [config, setConfig] = useState<PaymentGatewayConfig | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize payment gateway
  const initialize = useCallback(async (provider: PaymentProvider, apiKey: string) => {
    try {
      const newConfig: PaymentGatewayConfig = {
        provider,
        apiKey,
        enabled: true,
      };

      setConfig(newConfig);
      return newConfig;
    } catch (error) {
      console.error('Failed to initialize payment gateway:', error);
      return null;
    }
  }, []);

  // Create payment intent
  const createPaymentIntent = useCallback(
    async (
      userId: string,
      amount: number,
      currency: string = 'USD',
      description: string = ''
    ): Promise<PaymentIntent | null> => {
      try {
        if (!config) return null;

        const intent: PaymentIntent = {
          id: `pi_${Date.now()}`,
          clientSecret: `secret_${Math.random().toString(36).substr(2, 9)}`,
          amount,
          currency,
          status: 'requires_payment_method',
        };

        return intent;
      } catch (error) {
        console.error('Failed to create payment intent:', error);
        return null;
      }
    },
    [config]
  );

  // Process payment
  const processPayment = useCallback(
    async (
      userId: string,
      amount: number,
      method: PaymentMethod,
      description: string = ''
    ): Promise<Payment | null> => {
      try {
        if (!config) return null;

        setIsProcessing(true);

        // Simulate payment processing
        const payment: Payment = {
          id: `pay_${Date.now()}`,
          userId,
          provider: config.provider,
          amount,
          currency: 'USD',
          status: 'processing',
          method,
          description,
          createdAt: Date.now(),
        };

        setPayments((prev) => [...prev, payment]);

        // Simulate processing delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Update payment status
        const updatedPayment: Payment = {
          ...payment,
          status: 'completed',
          transactionId: `txn_${Math.random().toString(36).substr(2, 9)}`,
          completedAt: Date.now(),
        };

        setPayments((prev) =>
          prev.map((p) => (p.id === payment.id ? updatedPayment : p))
        );

        setIsProcessing(false);

        return updatedPayment;
      } catch (error) {
        console.error('Failed to process payment:', error);
        setIsProcessing(false);

        const failedPayment: Payment = {
          id: `pay_${Date.now()}`,
          userId,
          provider: config?.provider || 'stripe',
          amount,
          currency: 'USD',
          status: 'failed',
          method,
          description,
          createdAt: Date.now(),
          errorMessage: error instanceof Error ? error.message : 'Payment failed',
        };

        setPayments((prev) => [...prev, failedPayment]);

        return null;
      }
    },
    [config]
  );

  // Get payment details
  const getPaymentDetails = useCallback(
    (paymentId: string): Payment | null => {
      return payments.find((p) => p.id === paymentId) || null;
    },
    [payments]
  );

  // Get user payments
  const getUserPayments = useCallback(
    (userId: string): Payment[] => {
      return payments.filter((p) => p.userId === userId);
    },
    [payments]
  );

  // Refund payment
  const refundPayment = useCallback(
    async (paymentId: string, amount?: number, reason: string = ''): Promise<RefundRequest | null> => {
      try {
        const payment = payments.find((p) => p.id === paymentId);
        if (!payment) return null;

        const refund: RefundRequest = {
          paymentId,
          amount: amount || payment.amount,
          reason,
          status: 'pending',
        };

        // Simulate refund processing
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update payment status
        setPayments((prev) =>
          prev.map((p) =>
            p.id === paymentId
              ? { ...p, status: 'refunded' as const }
              : p
          )
        );

        return { ...refund, status: 'completed' };
      } catch (error) {
        console.error('Failed to refund payment:', error);
        return null;
      }
    },
    [payments]
  );

  // Validate payment method
  const validatePaymentMethod = useCallback(
    (method: PaymentMethod, details: Record<string, any>): boolean => {
      try {
        switch (method) {
          case 'credit_card':
          case 'debit_card':
            // Validate card number (simple Luhn check)
            const cardNumber = details.cardNumber?.replace(/\s/g, '');
            if (!cardNumber || cardNumber.length < 13) return false;
            return true;

          case 'bank_transfer':
            // Validate bank account
            const accountNumber = details.accountNumber;
            if (!accountNumber || accountNumber.length < 8) return false;
            return true;

          case 'wallet':
            // Validate wallet address
            const walletAddress = details.walletAddress;
            if (!walletAddress || walletAddress.length < 20) return false;
            return true;

          default:
            return false;
        }
      } catch (error) {
        console.error('Failed to validate payment method:', error);
        return false;
      }
    },
    []
  );

  // Get payment statistics
  const getStatistics = useCallback(() => {
    const stats = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      completedPayments: payments.filter((p) => p.status === 'completed').length,
      failedPayments: payments.filter((p) => p.status === 'failed').length,
      refundedPayments: payments.filter((p) => p.status === 'refunded').length,
      averageAmount:
        payments.length > 0
          ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length
          : 0,
      successRate:
        payments.length > 0
          ? (payments.filter((p) => p.status === 'completed').length / payments.length) * 100
          : 0,
    };

    return stats;
  }, [payments]);

  return {
    payments,
    config,
    isProcessing,
    initialize,
    createPaymentIntent,
    processPayment,
    getPaymentDetails,
    getUserPayments,
    refundPayment,
    validatePaymentMethod,
    getStatistics,
  };
}
