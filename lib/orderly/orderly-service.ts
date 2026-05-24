/**
 * Orderly Network Service
 * Gestisce interazioni con Orderly Network (DEX decentralizzato)
 * Supporta sia Ethereum che NEAR come blockchain sottostante
 */

import { validateAddress, type BlockchainType } from '@/lib/multi-chain-validator';

export interface OrderlyToken {
  symbol: string;
  address: string;
  decimals: number;
  chainId?: number;
}

export interface OrderlyOrder {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: string;
  price: string;
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED';
  createdAt: number;
  updatedAt: number;
}

export interface OrderlyPosition {
  symbol: string;
  quantity: string;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
  pnlPercent: string;
  leverage: number;
}

export interface OrderlyBalance {
  token: string;
  available: string;
  reserved: string;
  total: string;
}

export interface OrderlyAccount {
  accountId: string;
  blockchain: BlockchainType;
  balances: OrderlyBalance[];
  orders: OrderlyOrder[];
  positions: OrderlyPosition[];
  totalValue: string;
}

const ORDERLY_API_URL = 'https://api.orderly.network';
const ORDERLY_TESTNET_API_URL = 'https://testnet-api.orderly.network';

/**
 * Ottiene le informazioni dell'account Orderly
 */
export async function getOrderlyAccount(
  accountId: string,
  blockchain: BlockchainType,
  testnet: boolean = false
): Promise<OrderlyAccount | null> {
  try {
    const validated = validateAddress(accountId, blockchain);
    if (!validated.isValid) {
      throw new Error('Invalid account address');
    }

    const apiUrl = testnet ? ORDERLY_TESTNET_API_URL : ORDERLY_API_URL;
    const endpoint = blockchain === 'near' ? 'near' : 'evm';

    const response = await fetch(`${apiUrl}/v1/account/${endpoint}/${accountId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Orderly API error:', response.status);
      return null;
    }

    const data = await response.json();

    return {
      accountId,
      blockchain,
      balances: data.balances || [],
      orders: data.orders || [],
      positions: data.positions || [],
      totalValue: data.totalValue || '0',
    };
  } catch (err) {
    console.error('Error fetching Orderly account:', err);
    return null;
  }
}

/**
 * Ottiene i token supportati su Orderly
 */
export async function getOrderlyTokens(testnet: boolean = false): Promise<OrderlyToken[]> {
  try {
    const apiUrl = testnet ? ORDERLY_TESTNET_API_URL : ORDERLY_API_URL;

    const response = await fetch(`${apiUrl}/v1/public/tokens`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Orderly API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.tokens || [];
  } catch (err) {
    console.error('Error fetching Orderly tokens:', err);
    return [];
  }
}

/**
 * Ottiene i pair di trading supportati
 */
export async function getOrderlyPairs(testnet: boolean = false): Promise<string[]> {
  try {
    const apiUrl = testnet ? ORDERLY_TESTNET_API_URL : ORDERLY_API_URL;

    const response = await fetch(`${apiUrl}/v1/public/pairs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Orderly API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.pairs || [];
  } catch (err) {
    console.error('Error fetching Orderly pairs:', err);
    return [];
  }
}

/**
 * Ottiene il prezzo di un token
 */
export async function getOrderlyPrice(symbol: string, testnet: boolean = false): Promise<string | null> {
  try {
    const apiUrl = testnet ? ORDERLY_TESTNET_API_URL : ORDERLY_API_URL;

    const response = await fetch(`${apiUrl}/v1/public/price/${symbol}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Orderly API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.price || null;
  } catch (err) {
    console.error('Error fetching Orderly price:', err);
    return null;
  }
}

/**
 * Ottiene gli ordini di un account
 */
export async function getOrderlyOrders(
  accountId: string,
  blockchain: BlockchainType,
  testnet: boolean = false
): Promise<OrderlyOrder[]> {
  try {
    const validated = validateAddress(accountId, blockchain);
    if (!validated.isValid) {
      throw new Error('Invalid account address');
    }

    const apiUrl = testnet ? ORDERLY_TESTNET_API_URL : ORDERLY_API_URL;
    const endpoint = blockchain === 'near' ? 'near' : 'evm';

    const response = await fetch(`${apiUrl}/v1/account/${endpoint}/${accountId}/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Orderly API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.orders || [];
  } catch (err) {
    console.error('Error fetching Orderly orders:', err);
    return [];
  }
}

/**
 * Ottiene le posizioni aperte di un account
 */
export async function getOrderlyPositions(
  accountId: string,
  blockchain: BlockchainType,
  testnet: boolean = false
): Promise<OrderlyPosition[]> {
  try {
    const validated = validateAddress(accountId, blockchain);
    if (!validated.isValid) {
      throw new Error('Invalid account address');
    }

    const apiUrl = testnet ? ORDERLY_TESTNET_API_URL : ORDERLY_API_URL;
    const endpoint = blockchain === 'near' ? 'near' : 'evm';

    const response = await fetch(`${apiUrl}/v1/account/${endpoint}/${accountId}/positions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Orderly API error:', response.status);
      return [];
    }

    const data = await response.json();
    return data.positions || [];
  } catch (err) {
    console.error('Error fetching Orderly positions:', err);
    return [];
  }
}

/**
 * Ottiene il balance di un token su Orderly
 */
export async function getOrderlyTokenBalance(
  accountId: string,
  blockchain: BlockchainType,
  token: string,
  testnet: boolean = false
): Promise<OrderlyBalance | null> {
  try {
    const account = await getOrderlyAccount(accountId, blockchain, testnet);
    if (!account) return null;

    const balance = account.balances.find(b => b.token.toUpperCase() === token.toUpperCase());
    return balance || null;
  } catch (err) {
    console.error('Error fetching Orderly token balance:', err);
    return null;
  }
}

/**
 * Calcola il valore totale del portfolio su Orderly
 */
export async function getOrderlyPortfolioValue(
  accountId: string,
  blockchain: BlockchainType,
  testnet: boolean = false
): Promise<string | null> {
  try {
    const account = await getOrderlyAccount(accountId, blockchain, testnet);
    if (!account) return null;

    return account.totalValue;
  } catch (err) {
    console.error('Error calculating Orderly portfolio value:', err);
    return null;
  }
}

/**
 * Valida un account Orderly
 */
export async function validateOrderlyAccount(
  accountId: string,
  blockchain: BlockchainType,
  testnet: boolean = false
): Promise<boolean> {
  try {
    const account = await getOrderlyAccount(accountId, blockchain, testnet);
    return account !== null;
  } catch (err) {
    console.error('Error validating Orderly account:', err);
    return false;
  }
}

/**
 * Esporta tutte le funzioni del servizio Orderly
 */
export const OrderlyService = {
  getOrderlyAccount,
  getOrderlyTokens,
  getOrderlyPairs,
  getOrderlyPrice,
  getOrderlyOrders,
  getOrderlyPositions,
  getOrderlyTokenBalance,
  getOrderlyPortfolioValue,
  validateOrderlyAccount,
};
