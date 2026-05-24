import React from 'react';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { mainnet, sepolia, polygon, arbitrum, optimism, base } from 'wagmi/chains';
import { metaMask, walletConnect, ledger } from '@wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
export const wagmiConfig = createConfig({
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
});

/**
 * React Query Client for data fetching
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

/**
 * Wallet Provider Props
 */
export interface WalletProviderProps {
  children: React.ReactNode;
}

/**
 * Wallet Provider Component
 * Wraps app with Wagmi and React Query providers
 */
export function WalletProvider({ children }: WalletProviderProps) {
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
