/**
 * EVM Transaction History Service
 * Usa le API pubbliche di Etherscan/Ftmscan/Snowtrace per ottenere lo storico transazioni
 */

export interface EvmTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenDecimal?: string;
  timeStamp: string;
  blockNumber: string;
  gasUsed: string;
  gasPrice: string;
  isError: string;
  type: 'native' | 'token';
}

// Explorer API endpoints (free tier, no API key required for basic queries)
const EXPLORER_APIS: Record<number, { url: string; name: string }> = {
  250: { url: 'https://api.ftmscan.com/api', name: 'FTMScan' },
  324: { url: 'https://block-explorer-api.mainnet.zksync.io/api', name: 'zkSync Explorer' },
  43114: { url: 'https://api.snowtrace.io/api', name: 'Snowtrace' },
  1101: { url: 'https://api-zkevm.polygonscan.com/api', name: 'PolygonScan zkEVM' },
};

/**
 * Ottieni le ultime transazioni native (ETH/FTM/AVAX) per un wallet
 */
export async function getNativeTransactions(
  chainId: number,
  address: string,
  page: number = 1,
  offset: number = 20
): Promise<EvmTransaction[]> {
  const explorer = EXPLORER_APIS[chainId];
  if (!explorer) return [];

  try {
    const url = `${explorer.url}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    return data.result.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      timeStamp: tx.timeStamp,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed || '0',
      gasPrice: tx.gasPrice || '0',
      isError: tx.isError || '0',
      type: 'native' as const,
    }));
  } catch (err) {
    console.warn(`Error fetching native TX for chain ${chainId}:`, err);
    return [];
  }
}

/**
 * Ottieni le ultime transazioni token ERC-20 per un wallet
 */
export async function getTokenTransactions(
  chainId: number,
  address: string,
  page: number = 1,
  offset: number = 20
): Promise<EvmTransaction[]> {
  const explorer = EXPLORER_APIS[chainId];
  if (!explorer) return [];

  try {
    const url = `${explorer.url}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=${offset}&sort=desc`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    return data.result.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      tokenSymbol: tx.tokenSymbol,
      tokenName: tx.tokenName,
      tokenDecimal: tx.tokenDecimal,
      timeStamp: tx.timeStamp,
      blockNumber: tx.blockNumber,
      gasUsed: tx.gasUsed || '0',
      gasPrice: tx.gasPrice || '0',
      isError: '0',
      type: 'token' as const,
    }));
  } catch (err) {
    console.warn(`Error fetching token TX for chain ${chainId}:`, err);
    return [];
  }
}

/**
 * Ottieni tutte le transazioni (native + token) combinate e ordinate
 */
export async function getAllTransactions(
  chainId: number,
  address: string,
  limit: number = 20
): Promise<EvmTransaction[]> {
  const [nativeTxs, tokenTxs] = await Promise.all([
    getNativeTransactions(chainId, address, 1, limit),
    getTokenTransactions(chainId, address, 1, limit),
  ]);

  const combined = [...nativeTxs, ...tokenTxs];
  combined.sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp));
  return combined.slice(0, limit);
}

/**
 * Formatta il valore di una transazione in formato leggibile
 */
export function formatTxValue(tx: EvmTransaction): string {
  if (tx.type === 'token' && tx.tokenDecimal) {
    const decimals = parseInt(tx.tokenDecimal);
    const value = parseInt(tx.value) / Math.pow(10, decimals);
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M ${tx.tokenSymbol}`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K ${tx.tokenSymbol}`;
    return `${value.toFixed(value < 1 ? 6 : 2)} ${tx.tokenSymbol}`;
  }
  // Native token (18 decimals)
  const value = parseInt(tx.value) / 1e18;
  if (value === 0) return '0';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(value < 1 ? 6 : 4);
}

/**
 * Formatta il timestamp in data leggibile
 */
export function formatTxDate(timestamp: string): string {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Abbrevia un indirizzo wallet
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.slice(-4)}`;
}

/**
 * Ottieni il nome dell'explorer per una chain
 */
export function getExplorerName(chainId: number): string {
  return EXPLORER_APIS[chainId]?.name ?? 'Explorer';
}

/**
 * Ottieni l'URL dell'explorer per una transazione
 */
export function getExplorerTxUrl(chainId: number, hash: string): string {
  const explorerUrls: Record<number, string> = {
    250: `https://ftmscan.com/tx/${hash}`,
    324: `https://explorer.zksync.io/tx/${hash}`,
    43114: `https://snowtrace.io/tx/${hash}`,
    1101: `https://zkevm.polygonscan.com/tx/${hash}`,
  };
  return explorerUrls[chainId] ?? '#';
}
