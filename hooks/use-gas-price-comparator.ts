import { useCallback, useState, useEffect } from 'react';
import { MOCK_GAS_PRICES, GAS_PRICE_UPDATE_INTERVAL, type GasPrice, type GasPriceComparison, calculateTransactionCostUsd, ETH_PRICES, getRecommendedBlockchain, STANDARD_GAS_LIMITS } from '@/lib/gas/gas-config';
import { AVAILABLE_BLOCKCHAINS, type BlockchainId } from '@/lib/blockchain/blockchain-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'agentpay_gas_prices';

/**
 * Hook for comparing gas prices across blockchains
 */
export function useGasPriceComparator() {
  const [prices, setPrices] = useState<GasPrice[]>([]);
  const [comparison, setComparison] = useState<GasPriceComparison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // Initialize gas prices
  useEffect(() => {
    fetchGasPrices();
    const interval = setInterval(fetchGasPrices, GAS_PRICE_UPDATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const fetchGasPrices = useCallback(async () => {
    try {
      setIsLoading(true);
      const gasPrices: GasPrice[] = [];

      // Fetch gas prices for all blockchains
      AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
        const mockPrice = MOCK_GAS_PRICES[blockchain];
        if (mockPrice) {
          gasPrices.push({
            ...mockPrice,
            timestamp: Date.now(),
          });
        }
      });

      setPrices(gasPrices);

      // Calculate comparison
      if (gasPrices.length > 0) {
        const standardPrices = gasPrices.map((p) => p.standard);
        const avgPrice = standardPrices.reduce((a, b) => a + b, 0) / standardPrices.length;

        const cheapest = gasPrices.reduce((min, p) => (p.standard < min.standard ? p : min));
        const mostExpensive = gasPrices.reduce((max, p) => (p.standard > max.standard ? p : max));

        setComparison({
          prices: gasPrices,
          cheapest,
          mostExpensive,
          average: avgPrice,
          timestamp: Date.now(),
        });
      }

      setLastUpdate(Date.now());
      setError(null);

      // Cache prices
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(gasPrices));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch gas prices';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getTransactionCost = useCallback(
    (blockchain: BlockchainId, gasLimit: number, speed: 'standard' | 'fast' | 'instant' = 'standard') => {
      const price = prices.find((p) => p.blockchain === blockchain);
      if (!price) return null;

      const gasPriceGwei = speed === 'fast' ? price.fast : speed === 'instant' ? price.instant : price.standard;
      const costUsd = calculateTransactionCostUsd(gasLimit, gasPriceGwei, ETH_PRICES[blockchain]);

      return {
        blockchain,
        gasLimit,
        gasPrice: gasPriceGwei,
        costUsd: costUsd.toFixed(2),
        speed,
      };
    },
    [prices]
  );

  const getRecommendedNetwork = useCallback(
    (gasLimit: number, transactionType: string = 'transfer'): BlockchainId | undefined => {
      if (prices.length === 0) return undefined;
      return getRecommendedBlockchain(prices, gasLimit, transactionType);
    },
    [prices]
  );

  const compareAllNetworks = useCallback(
    (gasLimit: number, speed: 'standard' | 'fast' | 'instant' = 'standard') => {
      return prices.map((price) => {
        const gasPriceGwei = speed === 'fast' ? price.fast : speed === 'instant' ? price.instant : price.standard;
        const costUsd = calculateTransactionCostUsd(gasLimit, gasPriceGwei, ETH_PRICES[price.blockchain]);

        return {
          blockchain: price.blockchain,
          gasPrice: gasPriceGwei,
          costUsd: costUsd.toFixed(2),
          savings: 0, // Will be calculated below
        };
      }).sort((a, b) => parseFloat(b.costUsd) - parseFloat(a.costUsd))
        .map((item, index, arr) => ({
          ...item,
          savings: index === 0 ? 0 : (parseFloat(arr[0].costUsd) - parseFloat(item.costUsd)).toFixed(2),
        }));
    },
    [prices]
  );

  const getSavingsPercentage = useCallback(
    (blockchain1: BlockchainId, blockchain2: BlockchainId, gasLimit: number): number => {
      const cost1 = getTransactionCost(blockchain1, gasLimit);
      const cost2 = getTransactionCost(blockchain2, gasLimit);

      if (!cost1 || !cost2) return 0;

      const savings = parseFloat(cost2.costUsd) - parseFloat(cost1.costUsd);
      return (savings / parseFloat(cost2.costUsd)) * 100;
    },
    [getTransactionCost]
  );

  const getGasPriceHistory = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.error('Failed to get gas price history:', err);
      return [];
    }
  }, []);

  return {
    prices,
    comparison,
    isLoading,
    error,
    lastUpdate,
    getTransactionCost,
    getRecommendedNetwork,
    compareAllNetworks,
    getSavingsPercentage,
    getGasPriceHistory,
    refetch: fetchGasPrices,
  };
}
