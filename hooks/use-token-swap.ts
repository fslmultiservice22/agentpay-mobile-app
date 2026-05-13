import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}

export interface SwapQuote {
  inputToken: Token;
  outputToken: Token;
  inputAmount: string;
  outputAmount: string;
  priceImpact: string;
  route: string[];
  fee: string;
}

export interface SwapResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

interface TokenSwapState {
  quote: SwapQuote | null;
  isLoading: boolean;
  error: string | null;
  supportedTokens: Token[];
}

// Token di test supportati
const SUPPORTED_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    balance: '0',
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '0',
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    balance: '0',
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    balance: '0',
  },
];

export function useTokenSwap(provider: ethers.Provider | null, signer: ethers.Signer | null) {
  const [state, setState] = useState<TokenSwapState>({
    quote: null,
    isLoading: false,
    error: null,
    supportedTokens: SUPPORTED_TOKENS,
  });

  const getSwapQuote = useCallback(
    async (
      inputToken: Token,
      outputToken: Token,
      inputAmount: string,
    ): Promise<SwapQuote | null> => {
      if (!provider) {
        setState(prev => ({
          ...prev,
          error: 'Provider not available',
        }));
        return null;
      }

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Simula il calcolo del prezzo di swap
        // In produzione, useremmo Uniswap V3 SDK o 1inch API
        const inputAmountNum = parseFloat(inputAmount);
        
        // Simula un tasso di cambio (1 ETH = 2000 USDC)
        let outputAmountNum = inputAmountNum;
        if (inputToken.symbol === 'ETH' && outputToken.symbol === 'USDC') {
          outputAmountNum = inputAmountNum * 2000;
        } else if (inputToken.symbol === 'USDC' && outputToken.symbol === 'ETH') {
          outputAmountNum = inputAmountNum / 2000;
        }

        const quote: SwapQuote = {
          inputToken,
          outputToken,
          inputAmount,
          outputAmount: outputAmountNum.toFixed(6),
          priceImpact: '0.5%',
          route: [inputToken.address, outputToken.address],
          fee: '0.3%',
        };

        setState(prev => ({
          ...prev,
          quote,
          isLoading: false,
        }));

        return quote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get swap quote';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [provider],
  );

  const executeSwap = useCallback(
    async (quote: SwapQuote): Promise<SwapResult> => {
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

        // Simula l'esecuzione dello swap
        // In produzione, useremmo Uniswap Router o altro DEX
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Genera un hash di transazione simulato
        const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        setState(prev => ({
          ...prev,
          isLoading: false,
        }));

        return {
          success: true,
          transactionHash: txHash,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Swap execution failed';
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
    [signer],
  );

  const getTokenBalance = useCallback(
    async (token: Token, address: string): Promise<string | null> => {
      if (!provider) {
        return null;
      }

      try {
        if (token.symbol === 'ETH') {
          // Ottieni il balance di ETH
          const balance = await provider.getBalance(address);
          return ethers.formatEther(balance);
        } else {
          // Simula il balance di token ERC20
          // In produzione, chiameremmo il contratto ERC20
          return '0';
        }
      } catch (err) {
        console.error('Failed to get token balance:', err);
        return null;
      }
    },
    [provider],
  );

  const updateTokenBalances = useCallback(
    async (address: string) => {
      try {
        const updatedTokens = await Promise.all(
          state.supportedTokens.map(async token => {
            const balance = await getTokenBalance(token, address);
            return {
              ...token,
              balance: balance || '0',
            };
          }),
        );

        setState(prev => ({
          ...prev,
          supportedTokens: updatedTokens,
        }));
      } catch (err) {
        console.error('Failed to update token balances:', err);
      }
    },
    [state.supportedTokens, getTokenBalance],
  );

  return {
    quote: state.quote,
    isLoading: state.isLoading,
    error: state.error,
    supportedTokens: state.supportedTokens,
    getSwapQuote,
    executeSwap,
    getTokenBalance,
    updateTokenBalances,
  };
}
