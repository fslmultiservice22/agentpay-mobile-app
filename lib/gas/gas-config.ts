import { type BlockchainId } from '@/lib/blockchain/blockchain-config';

export interface GasPrice {
  blockchain: BlockchainId;
  standard: number;
  fast: number;
  instant: number;
  baseFee: number;
  priorityFee: number;
  timestamp: number;
  unit: 'gwei' | 'wei';
}

export interface TransactionCost {
  blockchain: BlockchainId;
  gasLimit: number;
  gasPrice: number;
  totalGasWei: string;
  totalGasEth: number;
  totalGasUsd: number;
  speed: 'standard' | 'fast' | 'instant';
}

export interface GasPriceComparison {
  prices: GasPrice[];
  cheapest: GasPrice;
  mostExpensive: GasPrice;
  average: number;
  timestamp: number;
}

/**
 * Mock gas prices for demonstration
 * In production, these would come from RPC endpoints or gas price APIs
 */
export const MOCK_GAS_PRICES: Record<BlockchainId, Omit<GasPrice, 'timestamp'>> = {
  ethereum: {
    blockchain: 'ethereum',
    standard: 45.2,
    fast: 52.1,
    instant: 65.8,
    baseFee: 40.5,
    priorityFee: 4.7,
    unit: 'gwei',
  },
  polygon: {
    blockchain: 'polygon',
    standard: 45.2,
    fast: 52.1,
    instant: 65.8,
    baseFee: 40.5,
    priorityFee: 4.7,
    unit: 'gwei',
  },
  bsc: {
    blockchain: 'bsc',
    standard: 3.5,
    fast: 4.2,
    instant: 5.1,
    baseFee: 3.0,
    priorityFee: 0.5,
    unit: 'gwei',
  },
  arbitrum: {
    blockchain: 'arbitrum',
    standard: 0.15,
    fast: 0.25,
    instant: 0.35,
    baseFee: 0.1,
    priorityFee: 0.05,
    unit: 'gwei',
  },
  optimism: {
    blockchain: 'optimism',
    standard: 0.08,
    fast: 0.12,
    instant: 0.18,
    baseFee: 0.05,
    priorityFee: 0.03,
    unit: 'gwei',
  },
};

/**
 * Standard gas limits for different transaction types
 */
export const STANDARD_GAS_LIMITS: Record<string, number> = {
  transfer: 21000,
  tokenTransfer: 65000,
  swap: 150000,
  addLiquidity: 300000,
  removeLiquidity: 250000,
  approve: 45000,
  bridge: 200000,
};

/**
 * ETH prices for USD conversion (mock data)
 */
export const ETH_PRICES: Record<BlockchainId, number> = {
  ethereum: 2500,
  polygon: 2500, // MATIC price in USD
  bsc: 2500, // BNB price in USD
  arbitrum: 2500, // ETH price on Arbitrum
  optimism: 2500, // ETH price on Optimism
};

/**
 * Gas price update intervals (in milliseconds)
 */
export const GAS_PRICE_UPDATE_INTERVAL = 15000; // 15 seconds

/**
 * Get gas price for a blockchain
 */
export function getGasPrice(blockchain: BlockchainId, speed: 'standard' | 'fast' | 'instant' = 'standard'): number {
  const prices = MOCK_GAS_PRICES[blockchain];
  if (!prices) return 0;

  switch (speed) {
    case 'fast':
      return prices.fast;
    case 'instant':
      return prices.instant;
    default:
      return prices.standard;
  }
}

/**
 * Convert gwei to wei
 */
export function gweiToWei(gwei: number): string {
  return (gwei * 1e9).toFixed(0);
}

/**
 * Convert wei to eth
 */
export function weiToEth(wei: string): number {
  return parseFloat(wei) / 1e18;
}

/**
 * Calculate transaction cost in USD
 */
export function calculateTransactionCostUsd(
  gasLimit: number,
  gasPriceGwei: number,
  ethPriceUsd: number
): number {
  const gasLimitWei = gasLimit;
  const gasPriceWei = parseFloat(gweiToWei(gasPriceGwei));
  const totalGasWei = gasLimitWei * gasPriceWei;
  const totalGasEth = weiToEth(totalGasWei.toString());
  return totalGasEth * ethPriceUsd;
}

/**
 * Get recommended blockchain for lowest gas cost
 */
export function getRecommendedBlockchain(
  prices: GasPrice[],
  gasLimit: number,
  transactionType: string = 'transfer'
): BlockchainId | undefined {
  if (prices.length === 0) return undefined;
  
  const standardLimit = STANDARD_GAS_LIMITS[transactionType] || gasLimit;

  let lowestCost = Infinity;
  let recommendedBlockchain: BlockchainId = prices[0].blockchain;

  prices.forEach((price) => {
    const cost = calculateTransactionCostUsd(standardLimit, price.standard, ETH_PRICES[price.blockchain]);
    if (cost < lowestCost) {
      lowestCost = cost;
      recommendedBlockchain = price.blockchain;
    }
  });

  return recommendedBlockchain;
}

/**
 * Get gas price trend (increasing or decreasing)
 */
export function getGasPriceTrend(
  currentPrice: number,
  previousPrice: number
): 'increasing' | 'decreasing' | 'stable' {
  const change = currentPrice - previousPrice;
  const percentChange = (change / previousPrice) * 100;

  if (percentChange > 5) return 'increasing';
  if (percentChange < -5) return 'decreasing';
  return 'stable';
}

/**
 * Format gas price for display
 */
export function formatGasPrice(gwei: number): string {
  if (gwei < 1) {
    return `${(gwei * 1000).toFixed(2)} mGwei`;
  }
  return `${gwei.toFixed(2)} Gwei`;
}

/**
 * Get gas price color based on speed
 */
export function getGasPriceColor(
  speed: 'standard' | 'fast' | 'instant',
  successColor: string,
  warningColor: string,
  errorColor: string
): string {
  switch (speed) {
    case 'standard':
      return successColor;
    case 'fast':
      return warningColor;
    case 'instant':
      return errorColor;
    default:
      return successColor;
  }
}
