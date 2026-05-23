/**
 * Ethereum Address Validator
 * Validates Ethereum addresses and provides utilities for blockchain interaction
 */

/**
 * Validates if a string is a valid Ethereum address
 * @param address - The address to validate
 * @returns true if valid Ethereum address (0x followed by 40 hex characters)
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address) return false;
  // Ethereum addresses are 42 characters long (0x + 40 hex chars)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalizes an Ethereum address to lowercase
 * @param address - The address to normalize
 * @returns Normalized address or empty string if invalid
 */
export function normalizeEthereumAddress(address: string): string {
  if (!isValidEthereumAddress(address)) return '';
  return address.toLowerCase();
}

/**
 * Masks an Ethereum address for display
 * @param address - The address to mask
 * @returns Masked address (0x1234...5678)
 */
export function maskEthereumAddress(address: string): string {
  if (!isValidEthereumAddress(address)) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Supported blockchain networks
 */
export const BLOCKCHAIN_NETWORKS = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    symbol: 'ETH',
    decimals: 18,
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    symbol: 'MATIC',
    decimals: 18,
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    symbol: 'ETH',
    decimals: 18,
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    symbol: 'ETH',
    decimals: 18,
  },
} as const;

export type BlockchainNetwork = keyof typeof BLOCKCHAIN_NETWORKS;

/**
 * Gets the explorer URL for an address on a specific network
 * @param address - The Ethereum address
 * @param network - The blockchain network
 * @returns URL to view the address on the explorer
 */
export function getExplorerUrl(address: string, network: BlockchainNetwork = 'ethereum'): string {
  const normalizedAddress = normalizeEthereumAddress(address);
  if (!normalizedAddress) return '';
  const net = BLOCKCHAIN_NETWORKS[network];
  return `${net.explorer}/address/${normalizedAddress}`;
}

/**
 * Converts wei to ETH (or other token with 18 decimals)
 * @param wei - Amount in wei
 * @returns Amount in ETH
 */
export function weiToEth(wei: string | number): number {
  const weiNum = typeof wei === 'string' ? BigInt(wei) : BigInt(wei);
  return Number(weiNum) / 1e18;
}

/**
 * Converts ETH to wei
 * @param eth - Amount in ETH
 * @returns Amount in wei as string
 */
export function ethToWei(eth: number): string {
  return (BigInt(Math.floor(eth * 1e18))).toString();
}

/**
 * Formats a number as currency
 * @param value - The value to format
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
