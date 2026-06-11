import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CreditLineData {
  id: string;
  totalLimit: number;
  availableCredit: number;
  usedCredit: number;
  interestRate: number;
  monthlyPayment: number;
  nextPaymentDate: string;
  status: 'active' | 'inactive' | 'suspended';
  approvalDate: string;
  expiryDate: string;
}

export interface CreditRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'transferred';
  requestDate: string;
  approvalDate?: string;
  transferDate?: string;
  bankAccount?: string;
  interestAmount: number;
  totalAmount: number;
}

export interface CreditRepayment {
  id: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  dueDate: string;
  interestPaid: number;
  principalPaid: number;
}

const STORAGE_KEY = 'credit_line_data';
const REQUESTS_KEY = 'credit_requests';
const REPAYMENTS_KEY = 'credit_repayments';

export function useCreditLine() {
  const [creditLine, setCreditLine] = useState<CreditLineData | null>(null);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [repayments, setRepayments] = useState<CreditRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize credit line data
  useEffect(() => {
    const initializeCreditLine = async () => {
      try {
        setLoading(true);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (stored) {
          setCreditLine(JSON.parse(stored));
        } else {
          // Initialize with default credit line
          const defaultCreditLine: CreditLineData = {
            id: 'cl_' + Date.now(),
            totalLimit: 10000,
            availableCredit: 10000,
            usedCredit: 0,
            interestRate: 8.5, // 8.5% annual
            monthlyPayment: 0,
            nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active',
            approvalDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          };
          setCreditLine(defaultCreditLine);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCreditLine));
        }

        // Load requests
        const storedRequests = await AsyncStorage.getItem(REQUESTS_KEY);
        if (storedRequests) {
          setRequests(JSON.parse(storedRequests));
        }

        // Load repayments
        const storedRepayments = await AsyncStorage.getItem(REPAYMENTS_KEY);
        if (storedRepayments) {
          setRepayments(JSON.parse(storedRepayments));
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load credit line');
      } finally {
        setLoading(false);
      }
    };

    initializeCreditLine();
  }, []);

  // Request credit
  const requestCredit = useCallback(
    async (amount: number, bankAccount: string) => {
      if (!creditLine) return null;

      try {
        if (amount > creditLine.availableCredit) {
          throw new Error('Requested amount exceeds available credit');
        }

        // Calculate interest (monthly interest = annual rate / 12)
        const monthlyRate = creditLine.interestRate / 12 / 100;
        const interestAmount = amount * monthlyRate;
        const totalAmount = amount + interestAmount;

        const request: CreditRequest = {
          id: 'req_' + Date.now(),
          amount,
          status: 'approved', // Auto-approve for demo
          requestDate: new Date().toISOString(),
          approvalDate: new Date().toISOString(),
          transferDate: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes later
          bankAccount,
          interestAmount,
          totalAmount,
        };

        const updatedRequests = [...requests, request];
        await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(updatedRequests));
        setRequests(updatedRequests);

        // Update credit line
        const updatedCreditLine = {
          ...creditLine,
          availableCredit: creditLine.availableCredit - amount,
          usedCredit: creditLine.usedCredit + amount,
          monthlyPayment: creditLine.monthlyPayment + (totalAmount / 12), // 12-month repayment
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCreditLine));
        setCreditLine(updatedCreditLine);

        return request;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to request credit';
        setError(errorMsg);
        throw err;
      }
    },
    [creditLine, requests]
  );

  // Make repayment
  const makeRepayment = useCallback(
    async (amount: number) => {
      if (!creditLine) return null;

      try {
        if (amount > creditLine.usedCredit) {
          throw new Error('Repayment amount exceeds used credit');
        }

        const monthlyRate = creditLine.interestRate / 12 / 100;
        const interestPaid = creditLine.usedCredit * monthlyRate;
        const principalPaid = amount - interestPaid;

        const repayment: CreditRepayment = {
          id: 'rep_' + Date.now(),
          amount,
          date: new Date().toISOString(),
          status: 'completed',
          dueDate: creditLine.nextPaymentDate,
          interestPaid,
          principalPaid,
        };

        const updatedRepayments = [...repayments, repayment];
        await AsyncStorage.setItem(REPAYMENTS_KEY, JSON.stringify(updatedRepayments));
        setRepayments(updatedRepayments);

        // Update credit line
        const updatedCreditLine = {
          ...creditLine,
          availableCredit: creditLine.availableCredit + principalPaid,
          usedCredit: creditLine.usedCredit - principalPaid,
          monthlyPayment: Math.max(0, creditLine.monthlyPayment - (principalPaid / 12)),
          nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCreditLine));
        setCreditLine(updatedCreditLine);

        return repayment;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to make repayment';
        setError(errorMsg);
        throw err;
      }
    },
    [creditLine, repayments]
  );

  // Get credit utilization percentage
  const getCreditUtilization = useCallback(() => {
    if (!creditLine) return 0;
    return (creditLine.usedCredit / creditLine.totalLimit) * 100;
  }, [creditLine]);

  // Get pending requests
  const getPendingRequests = useCallback(() => {
    return requests.filter(r => r.status === 'pending');
  }, [requests]);

  // Get upcoming payments
  const getUpcomingPayments = useCallback(() => {
    return repayments.filter(r => r.status === 'pending');
  }, [repayments]);

  return {
    creditLine,
    requests,
    repayments,
    loading,
    error,
    requestCredit,
    makeRepayment,
    getCreditUtilization,
    getPendingRequests,
    getUpcomingPayments,
  };
}
