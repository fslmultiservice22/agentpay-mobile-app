import { useState, useCallback, useRef, useEffect } from 'react';

export interface PriceData {
  symbol: string;
  name: string;
  currentPrice: string;
  change24h: string;
  change7d: string;
  marketCap: string;
  volume24h: string;
  high24h: string;
  low24h: string;
  lastUpdated: number;
}

interface PriceFeedsState {
  prices: Record<string, PriceData>;
  isLoading: boolean;
  error: string | null;
}

// Mock price data per testing
const MOCK_PRICES: Record<string, PriceData> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    currentPrice: '2850.50',
    change24h: '+5.2',
    change7d: '+12.8',
    marketCap: '342500000000',
    volume24h: '15200000000',
    high24h: '2950.00',
    low24h: '2750.00',
    lastUpdated: Date.now(),
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    currentPrice: '1.00',
    change24h: '+0.01',
    change7d: '+0.02',
    marketCap: '32500000000',
    volume24h: '5200000000',
    high24h: '1.01',
    low24h: '0.99',
    lastUpdated: Date.now(),
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    currentPrice: '1.00',
    change24h: '+0.00',
    change7d: '+0.01',
    marketCap: '95000000000',
    volume24h: '42000000000',
    high24h: '1.01',
    low24h: '0.99',
    lastUpdated: Date.now(),
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    currentPrice: '1.00',
    change24h: '+0.00',
    change7d: '+0.01',
    marketCap: '5200000000',
    volume24h: '420000000',
    high24h: '1.01',
    low24h: '0.99',
    lastUpdated: Date.now(),
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    currentPrice: '68500.00',
    change24h: '+3.8',
    change7d: '+8.5',
    marketCap: '1350000000000',
    volume24h: '28500000000',
    high24h: '69500.00',
    low24h: '66000.00',
    lastUpdated: Date.now(),
  },
};

export function usePriceFeeds() {
  const [state, setState] = useState<PriceFeedsState>({
    prices: MOCK_PRICES,
    isLoading: false,
    error: null,
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fetch prices da CoinGecko API
  const fetchPrices = useCallback(async (symbols: string[]) => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      // Simula il fetch da CoinGecko
      // In produzione: https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin...
      await new Promise(resolve => setTimeout(resolve, 500));

      // Aggiorna i prezzi con variazioni casuali per simulare il movimento del mercato
      const updatedPrices: Record<string, PriceData> = { ...state.prices };

      symbols.forEach(symbol => {
        if (updatedPrices[symbol]) {
          const priceChange = (Math.random() - 0.5) * 2; // -1 a +1
          const currentPrice = parseFloat(updatedPrices[symbol].currentPrice);
          const newPrice = Math.max(0.01, currentPrice + priceChange);

          updatedPrices[symbol] = {
            ...updatedPrices[symbol],
            currentPrice: newPrice.toFixed(2),
            change24h: (parseFloat(updatedPrices[symbol].change24h) + (Math.random() - 0.5) * 0.5).toFixed(2),
            lastUpdated: Date.now(),
          };
        }
      });

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          prices: updatedPrices,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [state.prices]);

  // Ottieni il prezzo di un token
  const getPrice = useCallback(
    (symbol: string): PriceData | null => {
      return state.prices[symbol] || null;
    },
    [state.prices],
  );

  // Ottieni i prezzi di più token
  const getPrices = useCallback(
    (symbols: string[]): PriceData[] => {
      return symbols.map(symbol => state.prices[symbol]).filter(Boolean) as PriceData[];
    },
    [state.prices],
  );

  // Avvia il polling dei prezzi
  const startPricePolling = useCallback(
    (symbols: string[], intervalMs: number = 30000) => {
      // Fetch iniziale
      fetchPrices(symbols);

      // Polling periodico
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(() => {
        fetchPrices(symbols);
      }, intervalMs) as unknown as NodeJS.Timeout;
    },
    [fetchPrices],
  );

  // Ferma il polling
  const stopPricePolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Calcola il valore di un importo in un token
  const calculateValue = useCallback(
    (symbol: string, amount: string, targetCurrency: string = 'USD'): string => {
      const priceData = state.prices[symbol];
      if (!priceData) return '0';

      const amountNum = parseFloat(amount);
      const priceNum = parseFloat(priceData.currentPrice);
      const value = amountNum * priceNum;

      return value.toFixed(2);
    },
    [state.prices],
  );

  // Converte tra due token
  const convertBetweenTokens = useCallback(
    (fromSymbol: string, toSymbol: string, fromAmount: string): string => {
      const fromPrice = state.prices[fromSymbol];
      const toPrice = state.prices[toSymbol];

      if (!fromPrice || !toPrice) return '0';

      const fromAmountNum = parseFloat(fromAmount);
      const fromPriceNum = parseFloat(fromPrice.currentPrice);
      const toPriceNum = parseFloat(toPrice.currentPrice);

      const usdValue = fromAmountNum * fromPriceNum;
      const toAmount = usdValue / toPriceNum;

      return toAmount.toFixed(6);
    },
    [state.prices],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPricePolling();
    };
  }, [stopPricePolling]);

  return {
    prices: state.prices,
    isLoading: state.isLoading,
    error: state.error,
    fetchPrices,
    getPrice,
    getPrices,
    startPricePolling,
    stopPricePolling,
    calculateValue,
    convertBetweenTokens,
  };
}
