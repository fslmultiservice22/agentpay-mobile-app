import { useCallback, useState } from 'react';
import { useBlockchain } from '@/lib/blockchain/blockchain-context';
import { useEthereumWallet as useWallet } from '@/hooks/use-ethereum-wallet';
import { BLOCKCHAINS, type BlockchainId, AVAILABLE_BLOCKCHAINS } from '@/lib/blockchain/blockchain-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CrossChainToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
  logoUrl?: string;
}

export interface CrossChainSwapQuote {
  sourceChain: BlockchainId;
  destinationChain: BlockchainId;
  inputToken: CrossChainToken;
  outputToken: CrossChainToken;
  inputAmount: string;
  outputAmount: string;
  fee: string;
  estimatedTime: string;
  priceImpact: string;
}

export interface CrossChainSwapTransaction {
  id: string;
  sourceChain: BlockchainId;
  destinationChain: BlockchainId;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  timestamp: number;
}

const STORAGE_KEY = 'agentpay_cross_chain_swaps';
const STARGATE_API = 'https://api.stargate.finance';

/**
 * Hook for managing cross-chain token swaps using Stargate protocol
 * Handles quote generation, swap execution, and transaction tracking
 */
export function useCrossChainSwap() {
  const _w = useWallet(); const address = _w.activeWallet?.address;
  const { selectedBlockchain } = useBlockchain();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapTransactions, setSwapTransactions] = useState<CrossChainSwapTransaction[]>([]);

  // Load swap history on mount
  const loadSwapHistory = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        setSwapTransactions(JSON.parse(cached));
      }
    } catch (err) {
      console.error('Failed to load swap history:', err);
    }
  }, []);

  const getAvailableTokens = useCallback(
    (blockchain: BlockchainId): CrossChainToken[] => {
      // Mock tokens for each blockchain
      const tokensByChain: Record<BlockchainId, CrossChainToken[]> = {
        ethereum: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            chainId: 1,
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            decimals: 6,
            chainId: 1,
          },
          {
            symbol: 'USDT',
            name: 'Tether USD',
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            decimals: 6,
            chainId: 1,
          },
        ],
        polygon: [
          {
            symbol: 'MATIC',
            name: 'Polygon',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            chainId: 137,
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            decimals: 6,
            chainId: 137,
          },
          {
            symbol: 'USDT',
            name: 'Tether USD',
            address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            decimals: 6,
            chainId: 137,
          },
        ],
        bsc: [
          {
            symbol: 'BNB',
            name: 'Binance Coin',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            chainId: 56,
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0x8AC76a51cc950d9822D68b83FE1Ad97B32Cd580d',
            decimals: 6,
            chainId: 56,
          },
          {
            symbol: 'USDT',
            name: 'Tether USD',
            address: '0x55d398326f99059fF775485246999027B3197955',
            decimals: 6,
            chainId: 56,
          },
        ],
        arbitrum: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            chainId: 42161,
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5F86',
            decimals: 6,
            chainId: 42161,
          },
          {
            symbol: 'USDT',
            name: 'Tether USD',
            address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            decimals: 6,
            chainId: 42161,
          },
        ],
        optimism: [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            address: '0x0000000000000000000000000000000000000000',
            decimals: 18,
            chainId: 10,
          },
          {
            symbol: 'USDC',
            name: 'USD Coin',
            address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
            decimals: 6,
            chainId: 10,
          },
          {
            symbol: 'USDT',
            name: 'Tether USD',
            address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
            decimals: 6,
            chainId: 10,
          },
        ],
      };

      return tokensByChain[blockchain] || [];
    },
    []
  );

  const getSwapQuote = useCallback(
    async (
      sourceChain: BlockchainId,
      destinationChain: BlockchainId,
      inputToken: CrossChainToken,
      outputToken: CrossChainToken,
      inputAmount: string
    ): Promise<CrossChainSwapQuote | null> => {
      try {
        setIsLoading(true);
        setError(null);

        // Simulate fetching quote from Stargate API
        // In production, this would call the actual Stargate API
        const mockOutputAmount = (parseFloat(inputAmount) * 0.99).toFixed(outputToken.decimals);
        const mockFee = (parseFloat(inputAmount) * 0.001).toFixed(inputToken.decimals);

        const quote: CrossChainSwapQuote = {
          sourceChain,
          destinationChain,
          inputToken,
          outputToken,
          inputAmount,
          outputAmount: mockOutputAmount,
          fee: mockFee,
          estimatedTime: '5-10 minutes',
          priceImpact: '0.1%',
        };

        setIsLoading(false);
        return quote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get quote';
        setError(errorMessage);
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  const executeSwap = useCallback(
    async (quote: CrossChainSwapQuote): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
      if (!address) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        setIsLoading(true);
        setError(null);

        // Simulate executing swap on Stargate
        // In production, this would call the actual Stargate contract
        const mockTxHash = `0x${Math.random().toString(16).slice(2)}`;

        const swapTx: CrossChainSwapTransaction = {
          id: `swap_${Date.now()}`,
          sourceChain: quote.sourceChain,
          destinationChain: quote.destinationChain,
          inputToken: quote.inputToken.symbol,
          outputToken: quote.outputToken.symbol,
          inputAmount: quote.inputAmount,
          outputAmount: quote.outputAmount,
          status: 'pending',
          transactionHash: mockTxHash,
          timestamp: Date.now(),
        };

        const updated = [...swapTransactions, swapTx];
        setSwapTransactions(updated);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

        setIsLoading(false);
        return { success: true, transactionHash: mockTxHash };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Swap execution failed';
        setError(errorMessage);
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }
    },
    [address, swapTransactions]
  );

  const getSwapStatus = useCallback(
    (transactionHash: string): CrossChainSwapTransaction | null => {
      return swapTransactions.find((tx) => tx.transactionHash === transactionHash) || null;
    },
    [swapTransactions]
  );

  const getSwapHistory = useCallback((): CrossChainSwapTransaction[] => {
    return swapTransactions.sort((a, b) => b.timestamp - a.timestamp);
  }, [swapTransactions]);

  const getAvailableDestinations = useCallback(
    (sourceChain: BlockchainId): BlockchainId[] => {
      return AVAILABLE_BLOCKCHAINS.filter((chain) => chain !== sourceChain);
    },
    []
  );

  return {
    isLoading,
    error,
    swapTransactions,
    getAvailableTokens,
    getSwapQuote,
    executeSwap,
    getSwapStatus,
    getSwapHistory,
    getAvailableDestinations,
    loadSwapHistory,
  };
}
