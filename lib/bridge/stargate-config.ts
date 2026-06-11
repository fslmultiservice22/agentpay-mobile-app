import { type BlockchainId } from '@/lib/blockchain/blockchain-config';

export interface StargateChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  stargateRouter: string;
  stargateFactory: string;
  nativeToken: string;
}

export interface StargateLPToken {
  symbol: string;
  address: string;
  poolId: number;
  decimals: number;
}

/**
 * Stargate Bridge Protocol Configuration
 * Mainnet addresses for cross-chain swaps
 */
export const STARGATE_CHAINS: Record<BlockchainId, StargateChainConfig> = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    stargateRouter: '0x8731d54E9D02c286e8E619ECf6eab60407e26b8d',
    stargateFactory: '0x55bDb4164D28FBaFDc72f2FB57E6ee6D42C54e1B',
    nativeToken: 'ETH',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    stargateRouter: '0x45A01E4e04F14f7A2a3F8DcB275e326b0c95ad50',
    stargateFactory: '0x55bDb4164D28FBaFDc72f2FB57E6ee6D42C54e1B',
    nativeToken: 'MATIC',
  },
  bsc: {
    chainId: 56,
    name: 'Binance Smart Chain',
    rpcUrl: 'https://bsc-mainnet.g.alchemy.com/v2/demo',
    stargateRouter: '0x4a364f8c717cAAD9A440CAda34FF0CF57De5EC5e',
    stargateFactory: '0x55bDb4164D28FBaFDc72f2FB57E6ee6D42C54e1B',
    nativeToken: 'BNB',
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/demo',
    stargateRouter: '0x53Bf833A5d6c4ddA888F69c22C88C9f356a0ee0e',
    stargateFactory: '0x55bDb4164D28FBaFDc72f2FB57E6ee6D42C54e1B',
    nativeToken: 'ETH',
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/demo',
    stargateRouter: '0xB0D502E938ed5f4df2E681fA6bfD8d5d5c1EB5C6',
    stargateFactory: '0x55bDb4164D28FBaFDc72f2FB57E6ee6D42C54e1B',
    nativeToken: 'ETH',
  },
};

/**
 * Stargate LP Tokens
 * Supported tokens for cross-chain liquidity pools
 */
export const STARGATE_LP_TOKENS: Record<string, StargateLPToken> = {
  USDC: {
    symbol: 'USDC',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    poolId: 1,
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    poolId: 2,
    decimals: 6,
  },
  DAI: {
    symbol: 'DAI',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    poolId: 3,
    decimals: 18,
  },
  SGETH: {
    symbol: 'SGETH',
    address: '0x72E2F4830b9E3bF5bda011C645CaFb0aD4F6ae6d',
    poolId: 13,
    decimals: 18,
  },
};

/**
 * Stargate Fee Tier Configuration
 * Fee percentages for different swap amounts
 */
export const STARGATE_FEE_TIERS = {
  small: { threshold: 1000, fee: 0.05 }, // 0.05% for amounts < $1000
  medium: { threshold: 10000, fee: 0.03 }, // 0.03% for amounts < $10000
  large: { threshold: 100000, fee: 0.01 }, // 0.01% for amounts < $100000
  xlarge: { threshold: Infinity, fee: 0.005 }, // 0.005% for amounts >= $100000
};

/**
 * Get fee for a given amount
 */
export function getStargateFee(amountUsd: number): number {
  for (const tier of Object.values(STARGATE_FEE_TIERS)) {
    if (amountUsd < tier.threshold) {
      return tier.fee;
    }
  }
  return STARGATE_FEE_TIERS.xlarge.fee;
}

/**
 * Get estimated bridge time between chains
 */
export function getEstimatedBridgeTime(sourceChain: BlockchainId, destinationChain: BlockchainId): string {
  // Bridge time varies by chain pair
  const timings: Record<string, string> = {
    'ethereum-polygon': '5-10 minutes',
    'ethereum-bsc': '5-15 minutes',
    'ethereum-arbitrum': '3-8 minutes',
    'ethereum-optimism': '3-8 minutes',
    'polygon-ethereum': '10-20 minutes',
    'polygon-bsc': '5-15 minutes',
    'polygon-arbitrum': '5-10 minutes',
    'polygon-optimism': '5-10 minutes',
    'bsc-ethereum': '10-20 minutes',
    'bsc-polygon': '5-15 minutes',
    'bsc-arbitrum': '5-10 minutes',
    'bsc-optimism': '5-10 minutes',
    'arbitrum-ethereum': '10-20 minutes',
    'arbitrum-polygon': '5-15 minutes',
    'arbitrum-bsc': '5-15 minutes',
    'arbitrum-optimism': '5-10 minutes',
    'optimism-ethereum': '10-20 minutes',
    'optimism-polygon': '5-15 minutes',
    'optimism-bsc': '5-15 minutes',
    'optimism-arbitrum': '5-10 minutes',
  };

  const key = `${sourceChain}-${destinationChain}`;
  return timings[key] || '5-15 minutes';
}

/**
 * Get supported token pairs for cross-chain swap
 */
export function getSupportedTokenPairs(sourceChain: BlockchainId, destinationChain: BlockchainId): string[] {
  // All Stargate LP tokens are supported between all chains
  return Object.keys(STARGATE_LP_TOKENS);
}

/**
 * Calculate price impact for cross-chain swap
 */
export function calculatePriceImpact(inputAmount: number, outputAmount: number): string {
  const impact = ((inputAmount - outputAmount) / inputAmount) * 100;
  return impact.toFixed(2);
}
