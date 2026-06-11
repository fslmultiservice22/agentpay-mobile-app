export type BlockchainId = 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism';

export interface BlockchainConfig {
  id: BlockchainId;
  name: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  color: string;
  icon: string;
}

export const BLOCKCHAINS: Record<BlockchainId, BlockchainConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    color: '#627EEA',
    icon: '⟠',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18,
    },
    color: '#8247E5',
    icon: '◆',
  },
  bsc: {
    id: 'bsc',
    name: 'Binance Smart Chain',
    symbol: 'BNB',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.bnbchain.org',
    blockExplorer: 'https://bscscan.com',
    nativeCurrency: {
      name: 'Binance Coin',
      symbol: 'BNB',
      decimals: 18,
    },
    color: '#F3BA2F',
    icon: '◆',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum',
    symbol: 'ARB',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    color: '#28A0F0',
    icon: '▲',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    symbol: 'OP',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    color: '#FF0420',
    icon: '◯',
  },
};

export const AVAILABLE_BLOCKCHAINS: BlockchainId[] = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism'];

export function getBlockchainConfig(id: BlockchainId): BlockchainConfig {
  return BLOCKCHAINS[id];
}

export function getBlockchainById(id: BlockchainId): BlockchainConfig | undefined {
  return BLOCKCHAINS[id];
}
