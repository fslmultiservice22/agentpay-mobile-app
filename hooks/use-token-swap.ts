import { useState, useCallback } from 'react';
import {
  getSwapQuote,
  getSwapTransaction,
  getTokens,
  validateSwapParams,
  type SwapQuote,
  type SwapTransaction,
  type Token,
} from '@/lib/1inch-swap-service';

export interface UseTokenSwapReturn {
  // State
  quote: SwapQuote | null;
  transaction: SwapTransaction | null;
  tokens: Token[];
  isLoading: boolean;
  isQuoting: boolean;
  error: string | null;
  
  // Methods
  loadTokens: (chainId: number) => Promise<void>;
  getQuote: (
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string,
    slippage?: number
  ) => Promise<void>;
  getTransaction: (
    chainId: number,
    fromToken: string,
    toToken: string,
    amount: string,
    fromAddress: string,
    slippage?: number
  ) => Promise<void>;
  clearQuote: () => void;
  clearError: () => void;
}

/**
 * Hook for token swapping with 1inch API integration
 */
export function useTokenSwap(): UseTokenSwapReturn {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [transaction, setTransaction] = useState<SwapTransaction | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load tokens for chain
   */
  const loadTokens = useCallback(async (chainId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const chainTokens = await getTokens(chainId);
      setTokens(chainTokens);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tokens';
      setError(errorMessage);
      console.error('Load tokens error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get swap quote
   */
  const handleGetQuote = useCallback(
    async (
      chainId: number,
      fromToken: string,
      toToken: string,
      amount: string,
      slippage: number = 1
    ) => {
      setIsQuoting(true);
      setError(null);

      try {
        // Validate parameters
        const validation = validateSwapParams(fromToken, toToken, amount);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const swapQuote = await getSwapQuote(
          chainId,
          fromToken,
          toToken,
          amount,
          slippage
        );

        setQuote(swapQuote);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get quote';
        setError(errorMessage);
        console.error('Get quote error:', err);
        setQuote(null);
      } finally {
        setIsQuoting(false);
      }
    },
    []
  );

  /**
   * Get swap transaction
   */
  const handleGetTransaction = useCallback(
    async (
      chainId: number,
      fromToken: string,
      toToken: string,
      amount: string,
      fromAddress: string,
      slippage: number = 1
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // Validate parameters
        const validation = validateSwapParams(fromToken, toToken, amount);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const swapTx = await getSwapTransaction(
          chainId,
          fromToken,
          toToken,
          amount,
          fromAddress,
          slippage
        );

        setTransaction(swapTx);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get transaction';
        setError(errorMessage);
        console.error('Get transaction error:', err);
        setTransaction(null);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Clear quote
   */
  const clearQuote = useCallback(() => {
    setQuote(null);
    setTransaction(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    quote,
    transaction,
    tokens,
    isLoading,
    isQuoting,
    error,
    loadTokens,
    getQuote: handleGetQuote,
    getTransaction: handleGetTransaction,
    clearQuote,
    clearError,
  };
}
