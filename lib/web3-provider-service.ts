import React from 'react';
import { Platform } from 'react-native';

// Only import wagmi on web platform
let createConfig: any = null;
let http: any = null;
let WagmiProvider: any = null;
let mainnet: any = null;
let sepolia: any = null;
let polygon: any = null;
let arbitrum: any = null;
let optimism: any = null;
let base: any = null;
let metaMask: any = null;
let walletConnect: any = null;
let ledger: any = null;
let QueryClient: any = null;
let QueryClientProvider: any = null;

if (Platform.OS === 'web') {
  const wagmi = require('wagmi');
  createConfig = wagmi.createConfig;
  http = wagmi.http;
  WagmiProvider = wagmi.WagmiProvider;
  
  const chains = require('wagmi/chains');
  mainnet = chains.mainnet;
  sepolia = chains.sepolia;
  polygon = chains.polygon;
  arbitrum = chains.arbitrum;
  optimism = chains.optimism;
  base = chains.base;
  
  const connectors = require('@wagmi/connectors');
  metaMask = connectors.metaMask;
  walletConnect = connectors.walletConnect;
  ledger = connectors.ledger;
  
  const reactQuery = require('@tanstack/react-query');
  QueryClient = reactQuery.QueryClient;
  QueryClientProvider = reactQuery.QueryClientProvider;
}

/**
 * Web3 Provider Service
 * Manages wallet connections and blockchain interactions
 */

export const SUPPORTED_CHAINS = {
  mainnet: mainnet,
  sepolia: sepolia,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
  base: base,
};

export type SupportedChain = keyof typeof SUPPORTED_CHAINS;

/**
 * Wagmi Configuration for Web3 connections
 */
export const wagmiConfig = Platform.OS === 'web' && createConfig
  ? createConfig({
      chains: [mainnet, sepolia, polygon, arbitrum, optimism, base],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'AgentPay Wallet',
        url: 'https://agentpay.app',
        iconUrl: 'https://agentpay.app/icon.png',
      },
    }),
    walletConnect({
      projectId: process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
      metadata: {
        name: 'AgentPay Wallet',
        description: 'Multi-chain crypto wallet and trading platform',
        url: 'https://agentpay.app',
        icons: ['https://agentpay.app/icon.png'],
      },
    }),
    ledger({
      projectId: process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    },
    })
  : null;

/**
 * React Query Client for data fetching
 * Only created on web platform
 */
export const queryClient = Platform.OS === 'web' && QueryClient
  ? new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
    },
  })
  : null;

/**
 * Wallet Provider Props
 */
export interface WalletProviderProps {
  children: React.ReactNode;
}

/**
 * Wallet Provider Component
 * Wraps app with Wagmi and React Query providers
 * Only on web platform
 */
export function WalletProvider({ children }: WalletProviderProps) {
  if (Platform.OS !== 'web' || !WagmiProvider || !QueryClientProvider) {
    // On mobile, just return children without providers
    return children as any;
  }

  return React.createElement(
    WagmiProvider,
    { config: wagmiConfig },
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  );
}

/**
 * Chain Configuration
 */
export const CHAIN_CONFIG = {
  mainnet: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: 'ETH',
    chainId: 1,
  },
  sepolia: {
    name: 'Ethereum Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: 'ETH',
    chainId: 11155111,
    faucet: 'https://www.alchemy.com/faucets/ethereum-sepolia',
  },
  polygon: {
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: 'MATIC',
    chainId: 137,
  },
  arbitrum: {
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    nativeCurrency: 'ETH',
    chainId: 42161,
  },
  optimism: {
    name: 'Optimism',
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    nativeCurrency: 'ETH',
    chainId: 10,
  },
  base: {
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: 'ETH',
    chainId: 8453,
  },
};

/**
 * Get chain configuration by ID
 */
export function getChainConfig(chainId: number) {
  const chainEntry = Object.entries(CHAIN_CONFIG).find(([_, config]) => config.chainId === chainId);
  return chainEntry ? chainEntry[1] : null;
}

/**
 * Get chain name by ID
 */
export function getChainName(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.name || `Chain ${chainId}`;
}
