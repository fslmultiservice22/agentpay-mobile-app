/**
 * USD1 Token Service
 * Servizio per interagire con il token USD1 di World Liberty Financial
 * Supporta lettura saldi on-chain su Ethereum e BSC
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Contract addresses ufficiali USD1
export const USD1_CONTRACTS = {
  ethereum: {
    address: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
    chainId: 1,
    decimals: 18,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io/token/0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d',
    symbol: 'USD1',
    name: 'USD1',
    network: 'Ethereum',
  },
  bsc: {
    address: '0x8d0D000Ee44948FC98c9B98A4FA4921476f08B0d',
    chainId: 56,
    decimals: 18,
    rpcUrl: 'https://bsc.drpc.org',
    explorerUrl: 'https://bscscan.com/token/0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d',
    symbol: 'USD1',
    name: 'USD1',
    network: 'BSC',
  },
  solana: {
    address: 'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',
    network: 'Solana',
    symbol: 'USD1',
    name: 'USD1',
  },
} as const;

// Native gas tokens
export const GAS_TOKENS = {
  ethereum: { symbol: 'ETH', decimals: 18, rpcUrl: 'https://eth.llamarpc.com' },
  bsc: { symbol: 'BNB', decimals: 18, rpcUrl: 'https://bsc.drpc.org' },
} as const;

export type SupportedNetwork = 'ethereum' | 'bsc';

export interface USD1Balance {
  network: SupportedNetwork;
  balance: string; // in token units (not wei)
  balanceWei: string;
  usdValue: number;
  lastUpdated: number;
}

export interface GasBalance {
  network: SupportedNetwork;
  symbol: string;
  balance: string;
  balanceWei: string;
  lastUpdated: number;
}

export interface WalletBalances {
  address: string;
  usd1: USD1Balance[];
  gas: GasBalance[];
  totalUSD1: number;
  lastUpdated: number;
}

const STORAGE_KEY = 'wlfi_usd1_balances';
const CACHE_DURATION = 60_000; // 1 minuto

// ERC-20 balanceOf function selector
const BALANCE_OF_SELECTOR = '0x70a08231';

/**
 * Encode una chiamata balanceOf(address)
 */
function encodeBalanceOf(address: string): string {
  const paddedAddress = address.toLowerCase().replace('0x', '').padStart(64, '0');
  return BALANCE_OF_SELECTOR + paddedAddress;
}

/**
 * Converte un valore hex wei in token units (con decimali)
 */
function weiToTokenUnits(hexValue: string, decimals: number): string {
  const value = BigInt(hexValue);
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = value % divisor;
  const fracStr = fracPart.toString().padStart(decimals, '0').slice(0, 6);
  return `${intPart}.${fracStr}`;
}

/**
 * Chiama eth_call per leggere il saldo ERC-20
 */
async function fetchERC20Balance(
  rpcUrl: string,
  tokenAddress: string,
  walletAddress: string,
  decimals: number
): Promise<{ balance: string; balanceWei: string }> {
  const data = encodeBalanceOf(walletAddress);

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [{ to: tokenAddress, data }, 'latest'],
      id: 1,
    }),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`RPC error: ${result.error.message}`);
  }

  const balanceWei = result.result || '0x0';
  const balance = weiToTokenUnits(balanceWei, decimals);

  return { balance, balanceWei };
}

/**
 * Chiama eth_getBalance per leggere il saldo nativo (ETH/BNB)
 */
async function fetchNativeBalance(
  rpcUrl: string,
  walletAddress: string,
  decimals: number
): Promise<{ balance: string; balanceWei: string }> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [walletAddress, 'latest'],
      id: 1,
    }),
  });

  const result = await response.json();

  if (result.error) {
    throw new Error(`RPC error: ${result.error.message}`);
  }

  const balanceWei = result.result || '0x0';
  const balance = weiToTokenUnits(balanceWei, decimals);

  return { balance, balanceWei };
}

/**
 * Recupera tutti i saldi USD1 e gas per un indirizzo wallet
 */
export async function fetchWalletBalances(walletAddress: string): Promise<WalletBalances> {
  const networks: SupportedNetwork[] = ['ethereum', 'bsc'];
  const usd1Balances: USD1Balance[] = [];
  const gasBalances: GasBalance[] = [];

  for (const network of networks) {
    const contract = USD1_CONTRACTS[network];
    const gasToken = GAS_TOKENS[network];

    try {
      // Fetch USD1 balance
      const { balance, balanceWei } = await fetchERC20Balance(
        contract.rpcUrl,
        contract.address,
        walletAddress,
        contract.decimals
      );

      usd1Balances.push({
        network,
        balance,
        balanceWei,
        usdValue: parseFloat(balance), // USD1 è 1:1 con USD
        lastUpdated: Date.now(),
      });

      // Fetch gas token balance
      const gasResult = await fetchNativeBalance(gasToken.rpcUrl, walletAddress, gasToken.decimals);

      gasBalances.push({
        network,
        symbol: gasToken.symbol,
        balance: gasResult.balance,
        balanceWei: gasResult.balanceWei,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      // Se una rete fallisce, aggiungi saldo zero
      usd1Balances.push({
        network,
        balance: '0.000000',
        balanceWei: '0x0',
        usdValue: 0,
        lastUpdated: Date.now(),
      });

      gasBalances.push({
        network,
        symbol: gasToken.symbol,
        balance: '0.000000',
        balanceWei: '0x0',
        lastUpdated: Date.now(),
      });
    }
  }

  const totalUSD1 = usd1Balances.reduce((sum, b) => sum + b.usdValue, 0);

  const result: WalletBalances = {
    address: walletAddress,
    usd1: usd1Balances,
    gas: gasBalances,
    totalUSD1,
    lastUpdated: Date.now(),
  };

  // Cache in AsyncStorage
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result));

  return result;
}

/**
 * Recupera saldi dalla cache (se non scaduti)
 */
export async function getCachedBalances(): Promise<WalletBalances | null> {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (!cached) return null;

    const data: WalletBalances = JSON.parse(cached);
    if (Date.now() - data.lastUpdated > CACHE_DURATION) return null;

    return data;
  } catch {
    return null;
  }
}

/**
 * Recupera saldi (cache-first, poi on-chain)
 */
export async function getWalletBalances(walletAddress: string): Promise<WalletBalances> {
  const cached = await getCachedBalances();
  if (cached && cached.address === walletAddress) return cached;

  return fetchWalletBalances(walletAddress);
}

/**
 * Formatta un saldo per la visualizzazione
 */
export function formatUSD1(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `$${num.toFixed(2)} USD1`;
}

/**
 * Verifica se un wallet ha abbastanza gas per una transazione
 */
export function hasEnoughGas(gasBalance: GasBalance, estimatedGas: number = 0.001): boolean {
  return parseFloat(gasBalance.balance) >= estimatedGas;
}

/**
 * Verifica se un wallet ha abbastanza USD1 per un trasferimento
 */
export function hasEnoughUSD1(usd1Balance: USD1Balance, amount: number): boolean {
  return usd1Balance.usdValue >= amount;
}
