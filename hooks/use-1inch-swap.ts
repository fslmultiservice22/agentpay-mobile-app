import { useState, useCallback } from 'react';
import axios from 'axios';

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  priceImpact: number;
  slippage: number;
}

export interface SwapTransaction {
  from: string;
  to: string;
  data: string;
  value: string;
  gasPrice: string;
  gas: string;
}

const INCH_API_BASE = 'https://api.1inch.io/v5.0';
const ETHEREUM_CHAIN_ID = 1; // Mainnet

export function use1inchSwap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(
    async (
      fromTokenAddress: string,
      toTokenAddress: string,
      amount: string,
      slippage: number = 0.5
    ): Promise<SwapQuote | null> => {
      setLoading(true);
      setError(null);

      try {
        // Chiama 1inch API per ottenere il quote
        const response = await axios.get(
          `${INCH_API_BASE}/${ETHEREUM_CHAIN_ID}/quote`,
          {
            params: {
              fromTokenAddress,
              toTokenAddress,
              amount,
              slippage,
            },
          }
        );

        const { toTokenAmount, estimatedGas, protocols } = response.data;

        // Calcola il price impact
        const priceImpact = response.data.priceImpact || 0;

        const quote: SwapQuote = {
          fromToken: fromTokenAddress,
          toToken: toTokenAddress,
          fromAmount: amount,
          toAmount: toTokenAmount,
          estimatedGas: estimatedGas?.toString() || '0',
          priceImpact,
          slippage,
        };

        return quote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get quote';
        setError(errorMessage);
        console.error('1inch API error:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getSwapTransaction = useCallback(
    async (
      fromTokenAddress: string,
      toTokenAddress: string,
      amount: string,
      userAddress: string,
      slippage: number = 0.5
    ): Promise<SwapTransaction | null> => {
      setLoading(true);
      setError(null);

      try {
        // Chiama 1inch API per ottenere la transazione di swap
        const response = await axios.get(
          `${INCH_API_BASE}/${ETHEREUM_CHAIN_ID}/swap`,
          {
            params: {
              fromTokenAddress,
              toTokenAddress,
              amount,
              fromAddress: userAddress,
              slippage,
              disableEstimate: true,
            },
          }
        );

        const { tx } = response.data;

        const swapTx: SwapTransaction = {
          from: tx.from,
          to: tx.to,
          data: tx.data,
          value: tx.value,
          gasPrice: tx.gasPrice,
          gas: tx.gas,
        };

        return swapTx;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get swap transaction';
        setError(errorMessage);
        console.error('1inch swap error:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    getQuote,
    getSwapTransaction,
    loading,
    error,
  };
}
