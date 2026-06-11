/**
 * Testnet Service
 * Handles Ethereum Sepolia Testnet interactions
 */

export interface TestnetFaucet {
  name: string;
  url: string;
  description: string;
  requiresGithub?: boolean;
  requiresTwitter?: boolean;
}

export interface TestnetToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  faucetUrl?: string;
}

/**
 * Ethereum Sepolia Testnet Configuration
 */
export const SEPOLIA_CONFIG = {
  chainId: 11155111,
  chainName: 'Ethereum Sepolia',
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  blockExplorer: 'https://sepolia.etherscan.io',
  nativeCurrency: {
    name: 'Sepolia ETH',
    symbol: 'ETH',
    decimals: 18,
  },
};

/**
 * Available Faucets for Sepolia Testnet
 */
export const SEPOLIA_FAUCETS: TestnetFaucet[] = [
  {
    name: 'Alchemy Sepolia Faucet',
    url: 'https://www.alchemy.com/faucets/ethereum-sepolia',
    description: 'Free ETH for Sepolia testnet. No account required.',
    requiresGithub: false,
    requiresTwitter: false,
  },
  {
    name: 'Infura Faucet',
    url: 'https://www.infura.io/faucet/sepolia',
    description: 'Get free Sepolia ETH from Infura',
    requiresGithub: true,
    requiresTwitter: false,
  },
  {
    name: 'Paradigm Faucet',
    url: 'https://faucet.paradigm.xyz/',
    description: 'Multi-chain testnet faucet including Sepolia',
    requiresGithub: false,
    requiresTwitter: false,
  },
  {
    name: 'Coinbase Faucet',
    url: 'https://coinbase.com/faucets/ethereum-sepolia',
    description: 'Coinbase Sepolia testnet faucet',
    requiresGithub: false,
    requiresTwitter: false,
  },
];

/**
 * Popular Test Tokens on Sepolia
 */
export const SEPOLIA_TEST_TOKENS: TestnetToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin (Test)',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    decimals: 6,
    faucetUrl: 'https://www.alchemy.com/faucets/ethereum-sepolia',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin (Test)',
    address: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
    decimals: 18,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether (Test)',
    address: '0xfFf9976782d46CC05630D92EE39253E4F6A5d6e7',
    decimals: 18,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD (Test)',
    address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    decimals: 6,
  },
];

/**
 * Testnet Utilities
 */

/**
 * Check if address is on Sepolia testnet
 */
export function isSepoliaAddress(chainId: number): boolean {
  return chainId === SEPOLIA_CONFIG.chainId;
}

/**
 * Get faucet URL for address
 */
export function getFaucetUrl(address: string): string {
  // Default to Alchemy faucet
  return `${SEPOLIA_FAUCETS[0].url}?address=${address}`;
}

/**
 * Get test token by symbol
 */
export function getTestToken(symbol: string): TestnetToken | undefined {
  return SEPOLIA_TEST_TOKENS.find(token => token.symbol.toUpperCase() === symbol.toUpperCase());
}

/**
 * Get all test tokens
 */
export function getAllTestTokens(): TestnetToken[] {
  return SEPOLIA_TEST_TOKENS;
}

/**
 * Get all faucets
 */
export function getAllFaucets(): TestnetFaucet[] {
  return SEPOLIA_FAUCETS;
}

/**
 * Get faucet by name
 */
export function getFaucetByName(name: string): TestnetFaucet | undefined {
  return SEPOLIA_FAUCETS.find(faucet => faucet.name.toLowerCase() === name.toLowerCase());
}

/**
 * Check if testnet is available
 */
export function isTestnetAvailable(): boolean {
  return typeof window !== 'undefined' && window.ethereum !== undefined;
}

/**
 * Get testnet block explorer URL for transaction
 */
export function getExplorerUrl(txHash: string): string {
  return `${SEPOLIA_CONFIG.blockExplorer}/tx/${txHash}`;
}

/**
 * Get testnet block explorer URL for address
 */
export function getExplorerAddressUrl(address: string): string {
  return `${SEPOLIA_CONFIG.blockExplorer}/address/${address}`;
}

/**
 * Get testnet block explorer URL for token
 */
export function getExplorerTokenUrl(tokenAddress: string): string {
  return `${SEPOLIA_CONFIG.blockExplorer}/token/${tokenAddress}`;
}

/**
 * Format testnet info for display
 */
export function formatTestnetInfo(): string {
  return `
Network: ${SEPOLIA_CONFIG.chainName}
Chain ID: ${SEPOLIA_CONFIG.chainId}
Currency: ${SEPOLIA_CONFIG.nativeCurrency.symbol}
Block Explorer: ${SEPOLIA_CONFIG.blockExplorer}
  `.trim();
}

/**
 * Get testnet status
 */
export interface TestnetStatus {
  isAvailable: boolean;
  chainId: number;
  chainName: string;
  blockExplorer: string;
  faucetsCount: number;
  testTokensCount: number;
}

export function getTestnetStatus(): TestnetStatus {
  return {
    isAvailable: isTestnetAvailable(),
    chainId: SEPOLIA_CONFIG.chainId,
    chainName: SEPOLIA_CONFIG.chainName,
    blockExplorer: SEPOLIA_CONFIG.blockExplorer,
    faucetsCount: SEPOLIA_FAUCETS.length,
    testTokensCount: SEPOLIA_TEST_TOKENS.length,
  };
}
