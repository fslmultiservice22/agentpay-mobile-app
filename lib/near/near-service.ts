/**
 * NEAR Protocol Service
 * Gestisce interazioni con NEAR blockchain
 */

import { isValidNearAddress } from '@/lib/multi-chain-validator';

export interface NearAccount {
  accountId: string;
  balance: string;
  state: {
    amount: string;
    locked: string;
    code_hash: string;
    storage_usage: number;
  };
}

export interface NearTransaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  amount: string;
  status: 'success' | 'failed' | 'pending';
}

export interface NearTokenBalance {
  contractId: string;
  symbol: string;
  decimals: number;
  balance: string;
  usdValue?: string;
}

const NEAR_RPC_URL = 'https://rpc.mainnet.near.org';
const NEAR_EXPLORER_URL = 'https://explorer.near.org';

/**
 * Ottiene le informazioni di un account NEAR
 */
export async function getNearAccountInfo(accountId: string): Promise<NearAccount | null> {
  try {
    if (!isValidNearAddress(accountId)) {
      throw new Error('Invalid NEAR account ID');
    }

    const response = await fetch(`${NEAR_RPC_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'dontcare',
        method: 'query',
        params: {
          request_type: 'view_account',
          finality: 'final',
          account_id: accountId,
        },
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('NEAR RPC error:', data.error);
      return null;
    }

    return {
      accountId,
      balance: data.result.amount,
      state: data.result,
    };
  } catch (err) {
    console.error('Error fetching NEAR account info:', err);
    return null;
  }
}

/**
 * Ottiene il balance di un account NEAR in NEAR tokens
 */
export async function getNearBalance(accountId: string): Promise<string | null> {
  try {
    const account = await getNearAccountInfo(accountId);
    if (!account) return null;

    // Converti da yoctoNEAR a NEAR (1 NEAR = 10^24 yoctoNEAR)
    const balanceInNear = (BigInt(account.balance) / BigInt(10 ** 24)).toString();
    return balanceInNear;
  } catch (err) {
    console.error('Error fetching NEAR balance:', err);
    return null;
  }
}

/**
 * Ottiene i token di un account NEAR
 */
export async function getNearTokens(accountId: string): Promise<NearTokenBalance[]> {
  try {
    if (!isValidNearAddress(accountId)) {
      throw new Error('Invalid NEAR account ID');
    }

    // Questo è un placeholder - la vera implementazione richiederebbe
    // query agli smart contract dei token
    const tokens: NearTokenBalance[] = [
      {
        contractId: 'wrap.near',
        symbol: 'wNEAR',
        decimals: 24,
        balance: '0',
      },
      {
        contractId: 'usdt.tether-token.near',
        symbol: 'USDT',
        decimals: 6,
        balance: '0',
      },
      {
        contractId: 'usdc.near',
        symbol: 'USDC',
        decimals: 6,
        balance: '0',
      },
    ];

    return tokens;
  } catch (err) {
    console.error('Error fetching NEAR tokens:', err);
    return [];
  }
}

/**
 * Ottiene le transazioni recenti di un account NEAR
 */
export async function getNearTransactions(accountId: string, limit: number = 10): Promise<NearTransaction[]> {
  try {
    if (!isValidNearAddress(accountId)) {
      throw new Error('Invalid NEAR account ID');
    }

    // Questo è un placeholder - la vera implementazione richiederebbe
    // query all'indexer NEAR o all'explorer API
    const transactions: NearTransaction[] = [];
    return transactions;
  } catch (err) {
    console.error('Error fetching NEAR transactions:', err);
    return [];
  }
}

/**
 * Valida un account NEAR
 */
export async function validateNearAccount(accountId: string): Promise<boolean> {
  try {
    const account = await getNearAccountInfo(accountId);
    return account !== null;
  } catch (err) {
    console.error('Error validating NEAR account:', err);
    return false;
  }
}

/**
 * Ottiene l'URL dell'explorer per un account NEAR
 */
export function getNearExplorerUrl(accountId: string): string {
  return `${NEAR_EXPLORER_URL}/accounts/${accountId}`;
}

/**
 * Ottiene l'URL dell'explorer per una transazione NEAR
 */
export function getNearTransactionExplorerUrl(txHash: string): string {
  return `${NEAR_EXPLORER_URL}/transactions/${txHash}`;
}

/**
 * Formatta un importo NEAR per la visualizzazione
 */
export function formatNearAmount(amount: string, decimals: number = 24): string {
  try {
    const bn = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const integerPart = bn / divisor;
    const fractionalPart = bn % divisor;

    if (fractionalPart === BigInt(0)) {
      return integerPart.toString();
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${integerPart}.${fractionalStr}`;
  } catch (err) {
    console.error('Error formatting NEAR amount:', err);
    return '0';
  }
}

/**
 * Converte NEAR a yoctoNEAR
 */
export function nearToYocto(amount: string): string {
  try {
    const bn = BigInt(Math.floor(parseFloat(amount) * 10 ** 24));
    return bn.toString();
  } catch (err) {
    console.error('Error converting NEAR to yocto:', err);
    return '0';
  }
}

/**
 * Converte yoctoNEAR a NEAR
 */
export function yoctoToNear(amount: string): string {
  return formatNearAmount(amount, 24);
}

/**
 * Esporta tutte le funzioni del servizio NEAR
 */
export const NearService = {
  getNearAccountInfo,
  getNearBalance,
  getNearTokens,
  getNearTransactions,
  validateNearAccount,
  getNearExplorerUrl,
  getNearTransactionExplorerUrl,
  formatNearAmount,
  nearToYocto,
  yoctoToNear,
};
