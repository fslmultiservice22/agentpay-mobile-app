/**
 * World Liberty Financial AgentPay Service
 * Gestisce wallet, policy enforcement, trasferimenti e manual approval
 * Implementa la logica dell'AgentPay SDK in modo mobile-friendly
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { USD1_CONTRACTS, GAS_TOKENS, type SupportedNetwork } from './usd1-token-service';

// Storage keys
const WALLET_KEY = 'wlfi_agentpay_wallet';
const POLICY_KEY = 'wlfi_agentpay_policy';
const TRANSFERS_KEY = 'wlfi_agentpay_transfers';
const APPROVALS_KEY = 'wlfi_agentpay_approvals';

// === TYPES ===

export interface AgentPayWallet {
  address: string;
  network: SupportedNetwork;
  createdAt: number;
  label: string;
  isConnected: boolean;
}

export interface SpendingPolicy {
  id: string;
  tokenSymbol: string;
  network: SupportedNetwork;
  perTxLimit: number;
  dailyLimit: number;
  weeklyLimit: number;
  manualApprovalThreshold: number; // sopra questa soglia serve approvazione manuale
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SpendingWindow {
  dailyUsed: number;
  weeklyUsed: number;
  dailyResetAt: number;
  weeklyResetAt: number;
}

export type TransferStatus = 'pending' | 'approved' | 'signed' | 'broadcast' | 'confirmed' | 'failed' | 'awaiting_approval';

export interface TransferRequest {
  id: string;
  network: SupportedNetwork;
  tokenAddress: string;
  tokenSymbol: string;
  to: string;
  amount: number;
  status: TransferStatus;
  txHash?: string;
  createdAt: number;
  updatedAt: number;
  policyCheckResult?: PolicyCheckResult;
  errorMessage?: string;
}

export interface ManualApprovalRequest {
  id: string;
  transferId: string;
  amount: number;
  tokenSymbol: string;
  to: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  resolvedAt?: number;
}

export interface PolicyCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  deniedReason?: string;
  matchedPolicyId?: string;
}

// === WALLET MANAGEMENT ===

/**
 * Recupera il wallet AgentPay configurato
 */
export async function getWallet(): Promise<AgentPayWallet | null> {
  try {
    const data = await AsyncStorage.getItem(WALLET_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Configura/connetti un wallet AgentPay
 */
export async function connectWallet(
  address: string,
  network: SupportedNetwork = 'bsc',
  label: string = 'AgentPay Wallet'
): Promise<AgentPayWallet> {
  const wallet: AgentPayWallet = {
    address,
    network,
    createdAt: Date.now(),
    label,
    isConnected: true,
  };

  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  return wallet;
}

/**
 * Disconnetti il wallet
 */
export async function disconnectWallet(): Promise<void> {
  const wallet = await getWallet();
  if (wallet) {
    wallet.isConnected = false;
    await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
  }
}

// === POLICY MANAGEMENT ===

/**
 * Recupera tutte le policy configurate
 */
export async function getPolicies(): Promise<SpendingPolicy[]> {
  try {
    const data = await AsyncStorage.getItem(POLICY_KEY);
    return data ? JSON.parse(data) : getDefaultPolicies();
  } catch {
    return getDefaultPolicies();
  }
}

/**
 * Policy di default (come da documentazione AgentPay SDK)
 */
function getDefaultPolicies(): SpendingPolicy[] {
  return [
    {
      id: 'usd1-bsc-default',
      tokenSymbol: 'USD1',
      network: 'bsc',
      perTxLimit: 10,
      dailyLimit: 100,
      weeklyLimit: 700,
      manualApprovalThreshold: 50,
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'bnb-bsc-default',
      tokenSymbol: 'BNB',
      network: 'bsc',
      perTxLimit: 0.01,
      dailyLimit: 0.2,
      weeklyLimit: 1.4,
      manualApprovalThreshold: 0.1,
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'usd1-eth-default',
      tokenSymbol: 'USD1',
      network: 'ethereum',
      perTxLimit: 50,
      dailyLimit: 500,
      weeklyLimit: 3500,
      manualApprovalThreshold: 200,
      isEnabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

/**
 * Salva le policy
 */
export async function savePolicies(policies: SpendingPolicy[]): Promise<void> {
  await AsyncStorage.setItem(POLICY_KEY, JSON.stringify(policies));
}

/**
 * Aggiorna una singola policy
 */
export async function updatePolicy(policyId: string, updates: Partial<SpendingPolicy>): Promise<SpendingPolicy | null> {
  const policies = await getPolicies();
  const index = policies.findIndex(p => p.id === policyId);
  if (index === -1) return null;

  policies[index] = { ...policies[index], ...updates, updatedAt: Date.now() };
  await savePolicies(policies);
  return policies[index];
}

/**
 * Crea una nuova policy
 */
export async function createPolicy(policy: Omit<SpendingPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<SpendingPolicy> {
  const newPolicy: SpendingPolicy = {
    ...policy,
    id: `policy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const policies = await getPolicies();
  policies.push(newPolicy);
  await savePolicies(policies);
  return newPolicy;
}

// === SPENDING WINDOWS ===

/**
 * Recupera la finestra di spesa corrente
 */
async function getSpendingWindow(policyId: string): Promise<SpendingWindow> {
  try {
    const key = `wlfi_spending_window_${policyId}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) return createFreshWindow();

    const window: SpendingWindow = JSON.parse(data);

    // Reset se scaduta
    const now = Date.now();
    if (now >= window.dailyResetAt) {
      window.dailyUsed = 0;
      window.dailyResetAt = now + 24 * 60 * 60 * 1000;
    }
    if (now >= window.weeklyResetAt) {
      window.weeklyUsed = 0;
      window.weeklyResetAt = now + 7 * 24 * 60 * 60 * 1000;
    }

    return window;
  } catch {
    return createFreshWindow();
  }
}

function createFreshWindow(): SpendingWindow {
  const now = Date.now();
  return {
    dailyUsed: 0,
    weeklyUsed: 0,
    dailyResetAt: now + 24 * 60 * 60 * 1000,
    weeklyResetAt: now + 7 * 24 * 60 * 60 * 1000,
  };
}

/**
 * Aggiorna la finestra di spesa dopo un trasferimento
 */
async function updateSpendingWindow(policyId: string, amount: number): Promise<void> {
  const window = await getSpendingWindow(policyId);
  window.dailyUsed += amount;
  window.weeklyUsed += amount;
  const key = `wlfi_spending_window_${policyId}`;
  await AsyncStorage.setItem(key, JSON.stringify(window));
}

// === POLICY CHECK ===

/**
 * Verifica se un trasferimento è permesso dalla policy
 */
export async function checkPolicy(
  tokenSymbol: string,
  network: SupportedNetwork,
  amount: number
): Promise<PolicyCheckResult> {
  const policies = await getPolicies();

  // Trova la policy applicabile
  const policy = policies.find(
    p => p.tokenSymbol === tokenSymbol && p.network === network && p.isEnabled
  );

  if (!policy) {
    return {
      allowed: false,
      requiresApproval: false,
      deniedReason: 'Nessuna policy configurata per questo token/rete',
    };
  }

  // Check per-transaction limit
  if (amount > policy.perTxLimit) {
    return {
      allowed: false,
      requiresApproval: false,
      deniedReason: `Importo ${amount} supera il limite per transazione (${policy.perTxLimit} ${tokenSymbol})`,
      matchedPolicyId: policy.id,
    };
  }

  // Check spending windows
  const window = await getSpendingWindow(policy.id);

  if (window.dailyUsed + amount > policy.dailyLimit) {
    return {
      allowed: false,
      requiresApproval: false,
      deniedReason: `Limite giornaliero raggiunto (${window.dailyUsed.toFixed(2)}/${policy.dailyLimit} ${tokenSymbol})`,
      matchedPolicyId: policy.id,
    };
  }

  if (window.weeklyUsed + amount > policy.weeklyLimit) {
    return {
      allowed: false,
      requiresApproval: false,
      deniedReason: `Limite settimanale raggiunto (${window.weeklyUsed.toFixed(2)}/${policy.weeklyLimit} ${tokenSymbol})`,
      matchedPolicyId: policy.id,
    };
  }

  // Check manual approval threshold
  if (amount > policy.manualApprovalThreshold) {
    return {
      allowed: true,
      requiresApproval: true,
      matchedPolicyId: policy.id,
    };
  }

  return {
    allowed: true,
    requiresApproval: false,
    matchedPolicyId: policy.id,
  };
}

// === TRANSFERS ===

/**
 * Recupera lo storico trasferimenti
 */
export async function getTransfers(): Promise<TransferRequest[]> {
  try {
    const data = await AsyncStorage.getItem(TRANSFERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Crea una richiesta di trasferimento
 */
export async function createTransfer(
  network: SupportedNetwork,
  tokenSymbol: string,
  to: string,
  amount: number
): Promise<TransferRequest> {
  const tokenAddress = tokenSymbol === 'USD1'
    ? USD1_CONTRACTS[network].address
    : '0x0000000000000000000000000000000000000000'; // native

  // Check policy
  const policyResult = await checkPolicy(tokenSymbol, network, amount);

  let status: TransferStatus = 'pending';
  if (!policyResult.allowed) {
    status = 'failed';
  } else if (policyResult.requiresApproval) {
    status = 'awaiting_approval';
  }

  const transfer: TransferRequest = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    network,
    tokenAddress,
    tokenSymbol,
    to,
    amount,
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    policyCheckResult: policyResult,
    errorMessage: policyResult.deniedReason,
  };

  // Salva
  const transfers = await getTransfers();
  transfers.unshift(transfer);
  await AsyncStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers.slice(0, 100)));

  // Se richiede approvazione, crea la richiesta
  if (policyResult.requiresApproval) {
    await createApprovalRequest(transfer);
  }

  // Se approvato automaticamente, aggiorna spending window
  if (policyResult.allowed && !policyResult.requiresApproval && policyResult.matchedPolicyId) {
    await updateSpendingWindow(policyResult.matchedPolicyId, amount);
    // Simula broadcast (in produzione qui si chiamerebbe il daemon locale)
    transfer.status = 'broadcast';
    transfer.txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    transfer.updatedAt = Date.now();

    const updatedTransfers = await getTransfers();
    const idx = updatedTransfers.findIndex(t => t.id === transfer.id);
    if (idx >= 0) {
      updatedTransfers[idx] = transfer;
      await AsyncStorage.setItem(TRANSFERS_KEY, JSON.stringify(updatedTransfers));
    }
  }

  return transfer;
}

// === MANUAL APPROVAL ===

/**
 * Recupera le richieste di approvazione
 */
export async function getApprovalRequests(): Promise<ManualApprovalRequest[]> {
  try {
    const data = await AsyncStorage.getItem(APPROVALS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Crea una richiesta di approvazione manuale
 */
async function createApprovalRequest(transfer: TransferRequest): Promise<ManualApprovalRequest> {
  const request: ManualApprovalRequest = {
    id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    transferId: transfer.id,
    amount: transfer.amount,
    tokenSymbol: transfer.tokenSymbol,
    to: transfer.to,
    reason: `Importo ${transfer.amount} ${transfer.tokenSymbol} supera la soglia di approvazione manuale`,
    status: 'pending',
    createdAt: Date.now(),
  };

  const approvals = await getApprovalRequests();
  approvals.unshift(request);
  await AsyncStorage.setItem(APPROVALS_KEY, JSON.stringify(approvals.slice(0, 50)));

  return request;
}

/**
 * Approva una richiesta manuale
 */
export async function approveRequest(approvalId: string): Promise<boolean> {
  const approvals = await getApprovalRequests();
  const index = approvals.findIndex(a => a.id === approvalId);
  if (index === -1) return false;

  approvals[index].status = 'approved';
  approvals[index].resolvedAt = Date.now();
  await AsyncStorage.setItem(APPROVALS_KEY, JSON.stringify(approvals));

  // Aggiorna il trasferimento collegato
  const transfers = await getTransfers();
  const txIndex = transfers.findIndex(t => t.id === approvals[index].transferId);
  if (txIndex >= 0) {
    transfers[txIndex].status = 'broadcast';
    transfers[txIndex].txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    transfers[txIndex].updatedAt = Date.now();
    await AsyncStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers));

    // Aggiorna spending window
    const policy = (await getPolicies()).find(
      p => p.tokenSymbol === transfers[txIndex].tokenSymbol && p.network === transfers[txIndex].network
    );
    if (policy) {
      await updateSpendingWindow(policy.id, transfers[txIndex].amount);
    }
  }

  return true;
}

/**
 * Rifiuta una richiesta manuale
 */
export async function rejectRequest(approvalId: string): Promise<boolean> {
  const approvals = await getApprovalRequests();
  const index = approvals.findIndex(a => a.id === approvalId);
  if (index === -1) return false;

  approvals[index].status = 'rejected';
  approvals[index].resolvedAt = Date.now();
  await AsyncStorage.setItem(APPROVALS_KEY, JSON.stringify(approvals));

  // Aggiorna il trasferimento collegato
  const transfers = await getTransfers();
  const txIndex = transfers.findIndex(t => t.id === approvals[index].transferId);
  if (txIndex >= 0) {
    transfers[txIndex].status = 'failed';
    transfers[txIndex].errorMessage = 'Trasferimento rifiutato dall\'operatore';
    transfers[txIndex].updatedAt = Date.now();
    await AsyncStorage.setItem(TRANSFERS_KEY, JSON.stringify(transfers));
  }

  return true;
}

/**
 * Conta le approvazioni in attesa
 */
export async function getPendingApprovalCount(): Promise<number> {
  const approvals = await getApprovalRequests();
  return approvals.filter(a => a.status === 'pending').length;
}

// === UTILITY ===

/**
 * Resetta tutti i dati AgentPay (per debug/testing)
 */
export async function resetAgentPayData(): Promise<void> {
  await AsyncStorage.multiRemove([WALLET_KEY, POLICY_KEY, TRANSFERS_KEY, APPROVALS_KEY]);
}

/**
 * Ottieni statistiche di utilizzo
 */
export async function getUsageStats(): Promise<{
  totalTransfers: number;
  totalApproved: number;
  totalRejected: number;
  totalVolume: number;
  pendingApprovals: number;
}> {
  const transfers = await getTransfers();
  const approvals = await getApprovalRequests();

  return {
    totalTransfers: transfers.length,
    totalApproved: transfers.filter(t => t.status === 'broadcast' || t.status === 'confirmed').length,
    totalRejected: transfers.filter(t => t.status === 'failed').length,
    totalVolume: transfers
      .filter(t => t.status === 'broadcast' || t.status === 'confirmed')
      .reduce((sum, t) => sum + t.amount, 0),
    pendingApprovals: approvals.filter(a => a.status === 'pending').length,
  };
}
