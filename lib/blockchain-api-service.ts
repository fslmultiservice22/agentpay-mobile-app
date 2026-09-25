/**
 * Blockchain API Service
 * Uses free public APIs (no API key required):
 * - Etherscan: ETH balance and ERC-20 tokens
 * - CoinGecko: Real-time token prices
 * - Infura public RPC: On-chain data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  rawBalance: string;
  decimals: number;
  contractAddress?: string;
  network: string;
  priceUsd: number;
  valueUsd: number;
  changePercent24h: number;
  logoUrl?: string;
}

export interface WalletBalanceResult {
  address: string;
  ethBalance: number;
  ethValueUsd: number;
  tokens: TokenBalance[];
  totalValueUsd: number;
  totalChange24h: number;
  totalChangePercent24h: number;
  lastUpdated: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ETHERSCAN_BASE = 'https://api.etherscan.io/api';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const INFURA_RPC = 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'; // Public Infura key

// Popular ERC-20 tokens to track
const TRACKED_TOKENS: { symbol: string; name: string; address: string; decimals: number; coingeckoId: string }[] = [
  { symbol: 'USDC', name: 'USD Coin', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6, coingeckoId: 'usd-coin' },
  { symbol: 'USDT', name: 'Tether USD', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6, coingeckoId: 'tether' },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18, coingeckoId: 'dai' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
  { symbol: 'LINK', name: 'Chainlink', address: '0x514910771af9ca656af840dff83e8264ecf986ca', decimals: 18, coingeckoId: 'chainlink' },
  { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', decimals: 18, coingeckoId: 'uniswap' },
  { symbol: 'AAVE', name: 'Aave', address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', decimals: 18, coingeckoId: 'aave' },
  { symbol: 'MATIC', name: 'Polygon', address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', decimals: 18, coingeckoId: 'matic-network' },
];

const CACHE_KEY_PREFIX = 'blockchain_cache_';
const CACHE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_DURATION_MS) return null;
    return data as T;
  } catch {
    return null;
  }
}

async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Ignore cache errors
  }
}

// ─── CoinGecko price fetcher ──────────────────────────────────────────────────

interface CoinGeckoPrice {
  [id: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

async function fetchTokenPrices(ids: string[]): Promise<CoinGeckoPrice> {
  const cacheKey = `prices_${ids.join(',')}`;
  const cached = await getCached<CoinGeckoPrice>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) throw new Error(`CoinGecko error: ${response.status}`);
    const data: CoinGeckoPrice = await response.json();
    await setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.warn('CoinGecko price fetch failed:', err);
    return {};
  }
}

// ─── Etherscan ETH balance ────────────────────────────────────────────────────

async function fetchEthBalance(address: string): Promise<string> {
  const cacheKey = `eth_balance_${address.toLowerCase()}`;
  const cached = await getCached<string>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${ETHERSCAN_BASE}?module=account&action=balance&address=${address}&tag=latest`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Etherscan error: ${response.status}`);
    const data = await response.json();
    if (data.status === '1') {
      await setCache(cacheKey, data.result);
      return data.result; // in wei
    }
    return '0';
  } catch (err) {
    console.warn('Etherscan ETH balance fetch failed:', err);
    // Fallback: use Infura JSON-RPC
    return fetchEthBalanceViaRpc(address);
  }
}

async function fetchEthBalanceViaRpc(address: string): Promise<string> {
  try {
    const response = await fetch(INFURA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1,
      }),
    });
    const data = await response.json();
    if (data.result) {
      // Convert hex to decimal string (in wei)
      return BigInt(data.result).toString();
    }
    return '0';
  } catch (err) {
    console.warn('Infura RPC balance fetch failed:', err);
    return '0';
  }
}

// ─── Etherscan ERC-20 token balances ─────────────────────────────────────────

interface EtherscanTokenTx {
  tokenSymbol: string;
  tokenName: string;
  contractAddress: string;
  tokenDecimal: string;
  value: string;
}

async function fetchTokenBalances(address: string): Promise<Map<string, bigint>> {
  const cacheKey = `token_balances_${address.toLowerCase()}`;
  const cached = await getCached<[string, string][]>(cacheKey);
  if (cached) {
    return new Map(cached.map(([k, v]) => [k, BigInt(v)]));
  }

  const balanceMap = new Map<string, bigint>();

  try {
    // Use Etherscan tokentx to find which tokens this address has interacted with
    const url = `${ETHERSCAN_BASE}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&offset=100`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Etherscan tokentx error: ${response.status}`);
    const data = await response.json();

    if (data.status === '1' && Array.isArray(data.result)) {
      // Get unique contract addresses from recent transactions
      const contracts = new Set<string>();
      (data.result as EtherscanTokenTx[]).forEach(tx => {
        contracts.add(tx.contractAddress.toLowerCase());
      });

      // For each tracked token, check if we have a balance
      for (const token of TRACKED_TOKENS) {
        if (contracts.has(token.address.toLowerCase())) {
          // Fetch actual balance via Etherscan
          const balUrl = `${ETHERSCAN_BASE}?module=account&action=tokenbalance&contractaddress=${token.address}&address=${address}&tag=latest`;
          try {
            const balRes = await fetch(balUrl);
            const balData = await balRes.json();
            if (balData.status === '1' && balData.result !== '0') {
              balanceMap.set(token.address.toLowerCase(), BigInt(balData.result));
            }
          } catch {
            // Skip this token
          }
          // Small delay to avoid rate limiting
          await new Promise(r => setTimeout(r, 200));
        }
      }
    }
  } catch (err) {
    console.warn('Etherscan token balance fetch failed:', err);
  }

  // Cache as serializable format
  const serializable: [string, string][] = Array.from(balanceMap.entries()).map(([k, v]) => [k, v.toString()]);
  await setCache(cacheKey, serializable);
  return balanceMap;
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function fetchRealWalletBalance(address: string): Promise<WalletBalanceResult> {
  const normalizedAddress = address.toLowerCase();

  // Fetch ETH balance and prices in parallel
  const [ethBalanceWei, prices] = await Promise.all([
    fetchEthBalance(normalizedAddress),
    fetchTokenPrices(['ethereum', ...TRACKED_TOKENS.map(t => t.coingeckoId)]),
  ]);

  // Convert ETH from wei to ETH
  const ethBalance = Number(BigInt(ethBalanceWei || '0')) / 1e18;
  const ethPrice = prices['ethereum']?.usd ?? 0;
  const ethChange = prices['ethereum']?.usd_24h_change ?? 0;
  const ethValueUsd = ethBalance * ethPrice;

  // Fetch token balances
  const tokenBalanceMap = await fetchTokenBalances(normalizedAddress);

  // Build token list with values
  const tokens: TokenBalance[] = [];

  for (const token of TRACKED_TOKENS) {
    const rawBalance = tokenBalanceMap.get(token.address.toLowerCase());
    if (!rawBalance || rawBalance === BigInt(0)) continue;

    const balance = Number(rawBalance) / Math.pow(10, token.decimals);
    const priceUsd = prices[token.coingeckoId]?.usd ?? 0;
    const changePercent24h = prices[token.coingeckoId]?.usd_24h_change ?? 0;
    const valueUsd = balance * priceUsd;

    if (balance > 0) {
      tokens.push({
        symbol: token.symbol,
        name: token.name,
        balance,
        rawBalance: rawBalance.toString(),
        decimals: token.decimals,
        contractAddress: token.address,
        network: 'ethereum',
        priceUsd,
        valueUsd,
        changePercent24h,
      });
    }
  }

  // Calculate totals
  const totalTokenValue = tokens.reduce((sum, t) => sum + t.valueUsd, 0);
  const totalValueUsd = ethValueUsd + totalTokenValue;

  // Weighted average 24h change
  let totalChange24h = 0;
  if (totalValueUsd > 0) {
    const ethWeight = ethValueUsd / totalValueUsd;
    totalChange24h = ethChange * ethWeight;
    tokens.forEach(t => {
      totalChange24h += t.changePercent24h * (t.valueUsd / totalValueUsd);
    });
  }

  const previousTotal = totalValueUsd / (1 + totalChange24h / 100);
  const totalChange24hUsd = totalValueUsd - previousTotal;

  return {
    address: normalizedAddress,
    ethBalance,
    ethValueUsd,
    tokens,
    totalValueUsd,
    totalChange24h: totalChange24hUsd,
    totalChangePercent24h: totalChange24h,
    lastUpdated: Date.now(),
  };
}

/**
 * Quick ETH price fetch (for display purposes)
 */
export async function fetchEthPrice(): Promise<{ usd: number; change24h: number }> {
  try {
    const prices = await fetchTokenPrices(['ethereum']);
    return {
      usd: prices['ethereum']?.usd ?? 0,
      change24h: prices['ethereum']?.usd_24h_change ?? 0,
    };
  } catch {
    return { usd: 0, change24h: 0 };
  }
}
