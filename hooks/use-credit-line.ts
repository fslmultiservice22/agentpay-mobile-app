import { useState, useEffect, useCallback } from 'react';
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
  collateralSource: 'wlfi_usd1' | 'crypto' | 'demo';
  usd1CollateralAmount: number;
  ltvRatio: number;
  healthFactor: number;
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
const USD1_BALANCES_KEY = 'wlfi_usd1_balances';

const LTV_CONFIG = { maxLTV: 70, warningLTV: 75, criticalLTV: 85, liquidationLTV: 90, interestRateBase: 5.5, interestRateHighLTV: 8.5 };

export function useCreditLine() {
  const [creditLine, setCreditLine] = useState<CreditLineData | null>(null);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [repayments, setRepayments] = useState<CreditRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Sanitize: JSON.stringify(Infinity) -> null, restore to Infinity
          if (parsed.healthFactor === null || parsed.healthFactor === undefined) parsed.healthFactor = Infinity;
          const refreshed = await refreshFromUSD1(parsed);
          setCreditLine(refreshed);
        } else {
          const fresh = await buildFromUSD1();
          setCreditLine(fresh);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        }
        const sr = await AsyncStorage.getItem(REQUESTS_KEY);
        if (sr) setRequests(JSON.parse(sr));
        const sp = await AsyncStorage.getItem(REPAYMENTS_KEY);
        if (sp) setRepayments(JSON.parse(sp));
      } catch (err) { setError(err instanceof Error ? err.message : 'Error'); } finally { setLoading(false); }
    })();
  }, []);

  const requestCredit = useCallback(async (amount: number, bankAccount: string) => {
    if (!creditLine) return null;
    if (amount > creditLine.availableCredit) throw new Error('Importo supera credito disponibile (collaterale USD1)');
    const monthlyRate = creditLine.interestRate / 12 / 100;
    const interestAmount = amount * monthlyRate;
    const request: CreditRequest = { id: 'req_' + Date.now(), amount, status: 'approved', requestDate: new Date().toISOString(), approvalDate: new Date().toISOString(), bankAccount, interestAmount, totalAmount: amount + interestAmount };
    const updReq = [...requests, request];
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(updReq));
    setRequests(updReq);
    const newUsed = creditLine.usedCredit + amount;
    const newLTV = creditLine.usd1CollateralAmount > 0 ? (newUsed / creditLine.usd1CollateralAmount) * 100 : 0;
    const newHF = newUsed > 0 ? creditLine.usd1CollateralAmount / newUsed : Infinity;
    const upd: CreditLineData = { ...creditLine, availableCredit: creditLine.availableCredit - amount, usedCredit: newUsed, monthlyPayment: creditLine.monthlyPayment + ((amount + interestAmount) / 12), ltvRatio: newLTV, healthFactor: newHF, interestRate: newLTV > LTV_CONFIG.warningLTV ? LTV_CONFIG.interestRateHighLTV : LTV_CONFIG.interestRateBase, status: newLTV >= LTV_CONFIG.criticalLTV ? 'suspended' : 'active' };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(upd));
    setCreditLine(upd);
    return request;
  }, [creditLine, requests]);

  const makeRepayment = useCallback(async (amount: number) => {
    if (!creditLine) return null;
    if (amount > creditLine.usedCredit) throw new Error('Importo rimborso supera debito');
    const monthlyRate = creditLine.interestRate / 12 / 100;
    const interestPaid = creditLine.usedCredit * monthlyRate;
    const principalPaid = amount - interestPaid;
    const repayment: CreditRepayment = { id: 'rep_' + Date.now(), amount, date: new Date().toISOString(), status: 'completed', dueDate: creditLine.nextPaymentDate, interestPaid, principalPaid };
    const updRep = [...repayments, repayment];
    await AsyncStorage.setItem(REPAYMENTS_KEY, JSON.stringify(updRep));
    setRepayments(updRep);
    const newUsed = Math.max(0, creditLine.usedCredit - principalPaid);
    const newLTV = creditLine.usd1CollateralAmount > 0 ? (newUsed / creditLine.usd1CollateralAmount) * 100 : 0;
    const newHF = newUsed > 0 ? creditLine.usd1CollateralAmount / newUsed : Infinity;
    const upd: CreditLineData = { ...creditLine, availableCredit: creditLine.availableCredit + principalPaid, usedCredit: newUsed, monthlyPayment: Math.max(0, creditLine.monthlyPayment - (principalPaid / 12)), nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), ltvRatio: newLTV, healthFactor: newHF, interestRate: newLTV > LTV_CONFIG.warningLTV ? LTV_CONFIG.interestRateHighLTV : LTV_CONFIG.interestRateBase, status: newLTV < LTV_CONFIG.criticalLTV ? 'active' : 'suspended' };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(upd));
    setCreditLine(upd);
    return repayment;
  }, [creditLine, repayments]);

  const getCreditUtilization = useCallback(() => {
    if (!creditLine || creditLine.totalLimit === 0) return 0;
    return (creditLine.usedCredit / creditLine.totalLimit) * 100;
  }, [creditLine]);

  const getPendingRequests = useCallback(() => requests.filter(r => r.status === 'pending'), [requests]);
  const getUpcomingPayments = useCallback(() => repayments.filter(r => r.status === 'pending'), [repayments]);

  const refreshCollateral = useCallback(async () => {
    if (!creditLine) return;
    const refreshed = await refreshFromUSD1(creditLine);
    setCreditLine(refreshed);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
  }, [creditLine]);

  return { creditLine, requests, repayments, loading, error, requestCredit, makeRepayment, getCreditUtilization, getPendingRequests, getUpcomingPayments, refreshCollateral };
}

async function buildFromUSD1(): Promise<CreditLineData> {
  const usd1 = await getUSD1Amount();
  const totalLimit = usd1 * (LTV_CONFIG.maxLTV / 100);
  return { id: 'cl_wlfi_' + Date.now(), totalLimit, availableCredit: totalLimit, usedCredit: 0, interestRate: LTV_CONFIG.interestRateBase, monthlyPayment: 0, nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), status: usd1 > 0 ? 'active' : 'inactive', approvalDate: new Date().toISOString(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), collateralSource: 'wlfi_usd1', usd1CollateralAmount: usd1, ltvRatio: 0, healthFactor: Infinity };
}

async function refreshFromUSD1(current: CreditLineData): Promise<CreditLineData> {
  const usd1 = await getUSD1Amount();
  const totalLimit = usd1 * (LTV_CONFIG.maxLTV / 100);
  const available = Math.max(0, totalLimit - current.usedCredit);
  const ltv = usd1 > 0 && current.usedCredit > 0 ? (current.usedCredit / usd1) * 100 : 0;
  const hf = current.usedCredit > 0 ? usd1 / current.usedCredit : Infinity;
  return { ...current, totalLimit, availableCredit: available, usd1CollateralAmount: usd1, ltvRatio: ltv, healthFactor: hf, collateralSource: 'wlfi_usd1', interestRate: ltv > LTV_CONFIG.warningLTV ? LTV_CONFIG.interestRateHighLTV : LTV_CONFIG.interestRateBase, status: usd1 === 0 ? 'inactive' : ltv >= LTV_CONFIG.criticalLTV ? 'suspended' : 'active' };
}

async function getUSD1Amount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(USD1_BALANCES_KEY);
    if (!raw) return 0;
    return JSON.parse(raw).totalUSD1 || 0;
  } catch { return 0; }
}
