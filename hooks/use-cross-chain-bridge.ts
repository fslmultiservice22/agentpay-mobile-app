import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export interface Chain {
  id: number;
  name: string;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: string;
  bridgeFee: string;
}

export interface BridgeToken {
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  minBridge: string;
  maxBridge: string;
}

export interface BridgeTransaction {
  id: string;
  sourceChain: number;
  destinationChain: number;
  token: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'completed' | 'failed';
  sourceHash?: string;
  destinationHash?: string;
  createdAt: number;
  completedAt?: number;
  estimatedTime: string;
}

interface CrossChainBridgeState {
  chains: Chain[];
  tokens: BridgeToken[];
  transactions: BridgeTransaction[];
  isLoading: boolean;
  error: string | null;
}

// Blockchains supportate
const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: 'ETH',
    bridgeFee: '0.001',
  },
  {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: 'MATIC',
    bridgeFee: '0.0001',
  },
  {
    id: 43114,
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcUrl: 'https://avalanche-mainnet.infura.io/v3/YOUR-PROJECT-ID',
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: 'AVAX',
    bridgeFee: '0.0005',
  },
  {
    id: 56,
    name: 'Binance Smart Chain',
    symbol: 'BNB',
    rpcUrl: 'https://bsc-dataseed1.binance.org:8545',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: 'BNB',
    bridgeFee: '0.0002',
  },
  {
    id: 250,
    name: 'Fantom',
    symbol: 'FTM',
    rpcUrl: 'https://rpc.ftm.tools',
    explorerUrl: 'https://ftmscan.com',
    nativeCurrency: 'FTM',
    bridgeFee: '0.00005',
  },
];

// Token supportati per il bridging
const BRIDGE_TOKENS: BridgeToken[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '5000',
    minBridge: '100',
    maxBridge: '1000000',
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    balance: '3000',
    minBridge: '100',
    maxBridge: '1000000',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    balance: '2000',
    minBridge: '100',
    maxBridge: '1000000',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    balance: '2.5',
    minBridge: '0.1',
    maxBridge: '1000',
  },
];

export function useCrossChainBridge(signer: ethers.Signer | null) {
  const [state, setState] = useState<CrossChainBridgeState>({
    chains: SUPPORTED_CHAINS,
    tokens: BRIDGE_TOKENS,
    transactions: [],
    isLoading: false,
    error: null,
  });

  const initiateBridge = useCallback(
    async (
      sourceChain: number,
      destinationChain: number,
      token: string,
      amount: string,
    ): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
      if (!signer) {
        return {
          success: false,
          error: 'Signer not available',
        };
      }

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida i parametri
        if (sourceChain === destinationChain) {
          return {
            success: false,
            error: 'Source and destination chains must be different',
          };
        }

        const amountNum = parseFloat(amount);
        if (amountNum <= 0) {
          return {
            success: false,
            error: 'Invalid amount',
          };
        }

        // Trova il token
        const bridgeToken = state.tokens.find(t => t.symbol === token);
        if (!bridgeToken) {
          return {
            success: false,
            error: 'Token not supported for bridging',
          };
        }

        // Valida i limiti
        const minBridge = parseFloat(bridgeToken.minBridge);
        const maxBridge = parseFloat(bridgeToken.maxBridge);
        if (amountNum < minBridge || amountNum > maxBridge) {
          return {
            success: false,
            error: `Amount must be between ${minBridge} and ${maxBridge}`,
          };
        }

        // Simula il bridging
        await new Promise(resolve => setTimeout(resolve, 2000));

        const transactionId = `bridge_${Date.now()}`;
        const sourceChainObj = state.chains.find(c => c.id === sourceChain);
        const destChainObj = state.chains.find(c => c.id === destinationChain);

        const newTransaction: BridgeTransaction = {
          id: transactionId,
          sourceChain,
          destinationChain,
          token,
          amount,
          status: 'pending',
          sourceHash: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          createdAt: Date.now(),
          estimatedTime: '10-15 minutes',
        };

        setState(prev => ({
          ...prev,
          transactions: [newTransaction, ...prev.transactions],
          isLoading: false,
        }));

        return {
          success: true,
          transactionId,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initiate bridge';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [signer, state.tokens, state.chains],
  );

  const getBridgeFee = useCallback(
    (sourceChain: number, destinationChain: number, amount: string): string => {
      const sourceChainObj = state.chains.find(c => c.id === sourceChain);
      if (!sourceChainObj) return '0';

      const baseFee = parseFloat(sourceChainObj.bridgeFee);
      const amountNum = parseFloat(amount);

      // Fee = base fee + 0.1% of amount
      const percentageFee = (amountNum * 0.001) / 100;
      const totalFee = baseFee + percentageFee;

      return totalFee.toFixed(6);
    },
    [state.chains],
  );

  const estimateBridgeTime = useCallback((sourceChain: number, destinationChain: number): string => {
    // Stima semplice basata sulla catena
    const times: Record<number, string> = {
      1: '10-15 minutes', // Ethereum
      137: '5-10 minutes', // Polygon
      43114: '8-12 minutes', // Avalanche
      56: '3-5 minutes', // BSC
      250: '5-8 minutes', // Fantom
    };

    return times[destinationChain] || '10-20 minutes';
  }, []);

  const getTransactionStatus = useCallback((transactionId: string) => {
    return state.transactions.find(t => t.id === transactionId);
  }, [state.transactions]);

  const getPendingTransactions = useCallback((): BridgeTransaction[] => {
    return state.transactions.filter(t => t.status === 'pending' || t.status === 'confirmed');
  }, [state.transactions]);

  const getCompletedTransactions = useCallback((): BridgeTransaction[] => {
    return state.transactions.filter(t => t.status === 'completed');
  }, [state.transactions]);

  const getBridgeStats = useCallback(() => {
    const total = state.transactions.length;
    const completed = state.transactions.filter(t => t.status === 'completed').length;
    const failed = state.transactions.filter(t => t.status === 'failed').length;
    const pending = state.transactions.filter(t => t.status === 'pending' || t.status === 'confirmed').length;

    const totalVolume = state.transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return {
      total,
      completed,
      failed,
      pending,
      totalVolume: totalVolume.toFixed(2),
      successRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
    };
  }, [state.transactions]);

  return {
    chains: state.chains,
    tokens: state.tokens,
    transactions: state.transactions,
    isLoading: state.isLoading,
    error: state.error,
    initiateBridge,
    getBridgeFee,
    estimateBridgeTime,
    getTransactionStatus,
    getPendingTransactions,
    getCompletedTransactions,
    getBridgeStats,
  };
}
