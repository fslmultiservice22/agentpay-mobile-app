import { type BlockchainId } from '@/lib/blockchain/blockchain-config';

export interface SwapRecord {
  id: string;
  timestamp: number;
  blockchain: BlockchainId;
  tokenIn: string;
  tokenOut: string;
  amountIn: number;
  amountOut: number;
  priceImpact: number;
  fee: number;
  feeUsd: number;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
}

export interface SwapStatistics {
  totalSwaps: number;
  completedSwaps: number;
  failedSwaps: number;
  totalVolume: number;
  totalVolumeUsd: number;
  totalFees: number;
  totalFeesUsd: number;
  averageFee: number;
  averagePriceImpact: number;
  bestSwap?: SwapRecord;
  worstSwap?: SwapRecord;
}

export interface BlockchainStats {
  blockchain: BlockchainId;
  swapCount: number;
  volume: number;
  volumeUsd: number;
  fees: number;
  feesUsd: number;
  percentage: number;
}

export interface TokenStats {
  symbol: string;
  swapCount: number;
  volume: number;
  volumeUsd: number;
  percentage: number;
}

export interface TimeSeriesData {
  timestamp: number;
  date: string;
  swapCount: number;
  volume: number;
  volumeUsd: number;
  fees: number;
  feesUsd: number;
}

export interface SwapAnalyticsData {
  statistics: SwapStatistics;
  blockchainStats: BlockchainStats[];
  tokenStats: {
    in: TokenStats[];
    out: TokenStats[];
  };
  timeSeries: TimeSeriesData[];
  recentSwaps: SwapRecord[];
}

/**
 * Mock swap history for demonstration
 */
export const MOCK_SWAP_HISTORY: SwapRecord[] = [
  {
    id: '1',
    timestamp: Date.now() - 86400000,
    blockchain: 'ethereum',
    tokenIn: 'ETH',
    tokenOut: 'USDC',
    amountIn: 1.5,
    amountOut: 3750,
    priceImpact: 0.05,
    fee: 0.0015,
    feeUsd: 3.75,
    status: 'completed',
    txHash: '0x123...',
  },
  {
    id: '2',
    timestamp: Date.now() - 72000000,
    blockchain: 'polygon',
    tokenIn: 'USDC',
    tokenOut: 'MATIC',
    amountIn: 1000,
    amountOut: 2500,
    priceImpact: 0.08,
    fee: 0.5,
    feeUsd: 0.5,
    status: 'completed',
    txHash: '0x456...',
  },
  {
    id: '3',
    timestamp: Date.now() - 60000000,
    blockchain: 'arbitrum',
    tokenIn: 'ETH',
    tokenOut: 'ARB',
    amountIn: 0.5,
    amountOut: 5000,
    priceImpact: 0.12,
    fee: 0.0005,
    feeUsd: 1.25,
    status: 'completed',
    txHash: '0x789...',
  },
  {
    id: '4',
    timestamp: Date.now() - 48000000,
    blockchain: 'bsc',
    tokenIn: 'BNB',
    tokenOut: 'BUSD',
    amountIn: 2,
    amountOut: 600,
    priceImpact: 0.03,
    fee: 0.002,
    feeUsd: 0.6,
    status: 'completed',
    txHash: '0xabc...',
  },
  {
    id: '5',
    timestamp: Date.now() - 36000000,
    blockchain: 'optimism',
    tokenIn: 'USDC',
    tokenOut: 'ETH',
    amountIn: 500,
    amountOut: 0.2,
    priceImpact: 0.06,
    fee: 0.1,
    feeUsd: 0.25,
    status: 'failed',
  },
];

/**
 * Calculate swap statistics from swap history
 */
export function calculateSwapStatistics(swaps: SwapRecord[]): SwapStatistics {
  const completedSwaps = swaps.filter((s) => s.status === 'completed');
  const failedSwaps = swaps.filter((s) => s.status === 'failed');

  const totalVolume = completedSwaps.reduce((sum, s) => sum + s.amountIn, 0);
  const totalVolumeUsd = completedSwaps.reduce((sum, s) => sum + s.feeUsd * 1000, 0); // Approximation
  const totalFees = completedSwaps.reduce((sum, s) => sum + s.fee, 0);
  const totalFeesUsd = completedSwaps.reduce((sum, s) => sum + s.feeUsd, 0);
  const averageFee = completedSwaps.length > 0 ? totalFees / completedSwaps.length : 0;
  const averagePriceImpact = completedSwaps.length > 0 ? completedSwaps.reduce((sum, s) => sum + s.priceImpact, 0) / completedSwaps.length : 0;

  const bestSwap = completedSwaps.length > 0
    ? completedSwaps.reduce((best, current) => (current.priceImpact < best.priceImpact ? current : best), completedSwaps[0])
    : undefined;
  const worstSwap = completedSwaps.length > 0
    ? completedSwaps.reduce((worst, current) => (current.priceImpact > worst.priceImpact ? current : worst), completedSwaps[0])
    : undefined;

  return {
    totalSwaps: swaps.length,
    completedSwaps: completedSwaps.length,
    failedSwaps: failedSwaps.length,
    totalVolume,
    totalVolumeUsd,
    totalFees,
    totalFeesUsd,
    averageFee,
    averagePriceImpact,
    bestSwap,
    worstSwap,
  };
}

/**
 * Calculate blockchain statistics
 */
export function calculateBlockchainStats(swaps: SwapRecord[]): BlockchainStats[] {
  const completedSwaps = swaps.filter((s) => s.status === 'completed');
  const totalVolume = completedSwaps.reduce((sum, s) => sum + s.amountIn, 0);

  const blockchainMap = new Map<BlockchainId, BlockchainStats>();

  completedSwaps.forEach((swap) => {
    const existing = blockchainMap.get(swap.blockchain) || {
      blockchain: swap.blockchain,
      swapCount: 0,
      volume: 0,
      volumeUsd: 0,
      fees: 0,
      feesUsd: 0,
      percentage: 0,
    };

    existing.swapCount += 1;
    existing.volume += swap.amountIn;
    existing.volumeUsd += swap.feeUsd * 1000;
    existing.fees += swap.fee;
    existing.feesUsd += swap.feeUsd;

    blockchainMap.set(swap.blockchain, existing);
  });

  return Array.from(blockchainMap.values()).map((stat) => ({
    ...stat,
    percentage: totalVolume > 0 ? (stat.volume / totalVolume) * 100 : 0,
  }));
}

/**
 * Calculate token statistics
 */
export function calculateTokenStats(swaps: SwapRecord[]): { in: TokenStats[]; out: TokenStats[] } {
  const completedSwaps = swaps.filter((s) => s.status === 'completed');

  const inTokenMap = new Map<string, TokenStats>();
  const outTokenMap = new Map<string, TokenStats>();

  completedSwaps.forEach((swap) => {
    // Token In
    const existingIn = inTokenMap.get(swap.tokenIn) || {
      symbol: swap.tokenIn,
      swapCount: 0,
      volume: 0,
      volumeUsd: 0,
      percentage: 0,
    };
    existingIn.swapCount += 1;
    existingIn.volume += swap.amountIn;
    existingIn.volumeUsd += swap.feeUsd * 1000;
    inTokenMap.set(swap.tokenIn, existingIn);

    // Token Out
    const existingOut = outTokenMap.get(swap.tokenOut) || {
      symbol: swap.tokenOut,
      swapCount: 0,
      volume: 0,
      volumeUsd: 0,
      percentage: 0,
    };
    existingOut.swapCount += 1;
    existingOut.volume += swap.amountOut;
    existingOut.volumeUsd += swap.feeUsd * 1000;
    outTokenMap.set(swap.tokenOut, existingOut);
  });

  const totalInVolume = Array.from(inTokenMap.values()).reduce((sum, t) => sum + t.volume, 0);
  const totalOutVolume = Array.from(outTokenMap.values()).reduce((sum, t) => sum + t.volume, 0);

  return {
    in: Array.from(inTokenMap.values())
      .map((t) => ({ ...t, percentage: totalInVolume > 0 ? (t.volume / totalInVolume) * 100 : 0 }))
      .sort((a, b) => b.swapCount - a.swapCount),
    out: Array.from(outTokenMap.values())
      .map((t) => ({ ...t, percentage: totalOutVolume > 0 ? (t.volume / totalOutVolume) * 100 : 0 }))
      .sort((a, b) => b.swapCount - a.swapCount),
  };
}

/**
 * Generate time series data
 */
export function generateTimeSeries(swaps: SwapRecord[], days: number = 7): TimeSeriesData[] {
  const completedSwaps = swaps.filter((s) => s.status === 'completed');
  const timeSeriesMap = new Map<string, TimeSeriesData>();

  completedSwaps.forEach((swap) => {
    const date = new Date(swap.timestamp);
    const dateStr = date.toISOString().split('T')[0];

    const existing = timeSeriesMap.get(dateStr) || {
      timestamp: new Date(dateStr).getTime(),
      date: dateStr,
      swapCount: 0,
      volume: 0,
      volumeUsd: 0,
      fees: 0,
      feesUsd: 0,
    };

    existing.swapCount += 1;
    existing.volume += swap.amountIn;
    existing.volumeUsd += swap.feeUsd * 1000;
    existing.fees += swap.fee;
    existing.feesUsd += swap.feeUsd;

    timeSeriesMap.set(dateStr, existing);
  });

  return Array.from(timeSeriesMap.values()).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Export swap history to CSV
 */
export function exportSwapsToCSV(swaps: SwapRecord[]): string {
  const headers = ['ID', 'Timestamp', 'Blockchain', 'Token In', 'Amount In', 'Token Out', 'Amount Out', 'Fee USD', 'Price Impact', 'Status'];
  const rows = swaps.map((s) => [
    s.id,
    new Date(s.timestamp).toISOString(),
    s.blockchain,
    s.tokenIn,
    s.amountIn.toFixed(6),
    s.tokenOut,
    s.amountOut.toFixed(6),
    s.feeUsd.toFixed(2),
    (s.priceImpact * 100).toFixed(2) + '%',
    s.status,
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  return csv;
}

/**
 * Format swap record for display
 */
export function formatSwapRecord(swap: SwapRecord): string {
  return `${swap.tokenIn} → ${swap.tokenOut} on ${swap.blockchain} (${swap.status})`;
}
