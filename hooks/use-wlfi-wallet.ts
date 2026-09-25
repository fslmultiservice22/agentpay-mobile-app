/**
 * Hook per gestione wallet World Liberty Financial AgentPay
 * Fornisce stato wallet, saldi USD1, policy e operazioni
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getWallet,
  connectWallet,
  disconnectWallet,
  getPolicies,
  getTransfers,
  getApprovalRequests,
  getPendingApprovalCount,
  getUsageStats,
  type AgentPayWallet,
  type SpendingPolicy,
  type TransferRequest,
  type ManualApprovalRequest,
} from '@/lib/wlfi-agentpay-service';
import {
  getWalletBalances,
  type WalletBalances,
} from '@/lib/usd1-token-service';

export interface WLFIWalletState {
  wallet: AgentPayWallet | null;
  balances: WalletBalances | null;
  policies: SpendingPolicy[];
  transfers: TransferRequest[];
  approvals: ManualApprovalRequest[];
  pendingApprovals: number;
  stats: {
    totalTransfers: number;
    totalApproved: number;
    totalRejected: number;
    totalVolume: number;
    pendingApprovals: number;
  };
  isLoading: boolean;
  error: string | null;
}

export function useWLFIWallet() {
  const [state, setState] = useState<WLFIWalletState>({
    wallet: null,
    balances: null,
    policies: [],
    transfers: [],
    approvals: [],
    pendingApprovals: 0,
    stats: { totalTransfers: 0, totalApproved: 0, totalRejected: 0, totalVolume: 0, pendingApprovals: 0 },
    isLoading: true,
    error: null,
  });

  const loadData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const wallet = await getWallet();
      const policies = await getPolicies();
      const transfers = await getTransfers();
      const approvals = await getApprovalRequests();
      const pendingApprovals = await getPendingApprovalCount();
      const stats = await getUsageStats();

      let balances: WalletBalances | null = null;
      if (wallet?.address && wallet.isConnected) {
        try {
          balances = await getWalletBalances(wallet.address);
        } catch {
          // Saldi non disponibili (offline o errore RPC)
        }
      }

      setState({
        wallet,
        balances,
        policies,
        transfers: transfers.slice(0, 20),
        approvals: approvals.slice(0, 10),
        pendingApprovals,
        stats,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Errore caricamento dati',
      }));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const connect = useCallback(async (address: string, network: 'ethereum' | 'bsc' = 'bsc') => {
    const wallet = await connectWallet(address, network, 'AgentPay Wallet');
    await loadData();
    return wallet;
  }, [loadData]);

  const disconnect = useCallback(async () => {
    await disconnectWallet();
    await loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    ...state,
    connect,
    disconnect,
    refresh,
  };
}
