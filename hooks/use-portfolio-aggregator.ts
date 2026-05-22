import { useCallback, useState, useEffect } from 'react';
import { useMultiChainBalance } from '@/hooks/use-multi-chain-balance';
import { AVAILABLE_BLOCKCHAINS, type BlockchainId } from '@/lib/blockchain/blockchain-config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PortfolioAsset {
  symbol: string;
  name: string;
  blockchain: BlockchainId;
  balance: string;
  usdValue: string;
  percentage: number;
  priceUsd: string;
  change24h: number;
  change7d: number;
}

export interface PortfolioAllocation {
  blockchain: BlockchainId;
  value: string;
  percentage: number;
  assetCount: number;
}

export interface PortfolioMetrics {
  totalValue: string;
  totalChange24h: string;
  totalChange24hPercent: number;
  totalChange7d: string;
  totalChange7dPercent: number;
  bestPerformer: PortfolioAsset | null;
  worstPerformer: PortfolioAsset | null;
}

export interface PortfolioHistory {
  timestamp: number;
  value: string;
  change: string;
}

const STORAGE_KEY = 'agentpay_portfolio_data';
const HISTORY_KEY = 'agentpay_portfolio_history';

/**
 * Hook for aggregating portfolio data across multiple blockchains
 * Provides consolidated view of assets, allocations, and metrics
 */
export function usePortfolioAggregator() {
  const { balances, totalBalance, totalUsdValue, isLoading } = useMultiChainBalance();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [history, setHistory] = useState<PortfolioHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load portfolio history on mount
  useEffect(() => {
    loadPortfolioHistory();
  }, []);

  // Update portfolio data when balances change
  useEffect(() => {
    if (Object.keys(balances).length > 0) {
      aggregatePortfolioData();
      recordPortfolioSnapshot();
    }
  }, [balances]);

  const loadPortfolioHistory = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(HISTORY_KEY);
      if (cached) {
        setHistory(JSON.parse(cached));
      }
    } catch (err) {
      console.error('Failed to load portfolio history:', err);
    }
  }, []);

  const recordPortfolioSnapshot = useCallback(async () => {
    try {
      const snapshot: PortfolioHistory = {
        timestamp: Date.now(),
        value: totalUsdValue,
        change: '0', // Will be calculated from previous value
      };

      const updated = [...history, snapshot].slice(-30); // Keep last 30 snapshots
      setHistory(updated);
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to record portfolio snapshot:', err);
    }
  }, [totalUsdValue, history]);

  const aggregatePortfolioData = useCallback(() => {
    try {
      const aggregatedAssets: PortfolioAsset[] = [];
      const allocationMap: Record<BlockchainId, { value: number; count: number }> = {} as Record<BlockchainId, { value: number; count: number }>;

      // Initialize allocation map
      AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
        (allocationMap as any)[blockchain] = { value: 0, count: 0 };
      });

      // Aggregate assets from all blockchains
      Object.entries(balances).forEach(([blockchain, chainBalance]) => {
        const mockAssets = generateMockAssets(blockchain as BlockchainId, chainBalance);
        aggregatedAssets.push(...mockAssets);

        // Update allocation
        allocationMap[blockchain as BlockchainId].value += parseFloat(chainBalance.usdValue);
        allocationMap[blockchain as BlockchainId].count += mockAssets.length;
      });

      // Calculate percentages
      const totalValue = parseFloat(totalUsdValue);
      const assetsWithPercentage = aggregatedAssets.map((asset) => ({
        ...asset,
        percentage: totalValue > 0 ? (parseFloat(asset.usdValue) / totalValue) * 100 : 0,
      }));

      // Create allocations
      const blockchainAllocations: PortfolioAllocation[] = AVAILABLE_BLOCKCHAINS.map((blockchain) => ({
        blockchain,
        value: allocationMap[blockchain].value.toFixed(2),
        percentage: totalValue > 0 ? (allocationMap[blockchain].value / totalValue) * 100 : 0,
        assetCount: allocationMap[blockchain].count,
      })).filter((a) => a.assetCount > 0);

      // Calculate metrics
      const portfolioMetrics = calculateMetrics(assetsWithPercentage, totalValue);

      setAssets(assetsWithPercentage);
      setAllocations(blockchainAllocations);
      setMetrics(portfolioMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to aggregate portfolio';
      setError(errorMessage);
    }
  }, [balances, totalUsdValue]);

  const generateMockAssets = (blockchain: BlockchainId, chainBalance: any): PortfolioAsset[] => {
    // Generate mock assets for demonstration
    const mockAssets: PortfolioAsset[] = [
      {
        symbol: 'USDC',
        name: 'USD Coin',
        blockchain,
        balance: (parseFloat(chainBalance.balance) * 0.6).toFixed(6),
        usdValue: (parseFloat(chainBalance.usdValue) * 0.6).toFixed(2),
        percentage: 0,
        priceUsd: '1.00',
        change24h: 0.01,
        change7d: 0.02,
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        blockchain,
        balance: (parseFloat(chainBalance.balance) * 0.3).toFixed(6),
        usdValue: (parseFloat(chainBalance.usdValue) * 0.3).toFixed(2),
        percentage: 0,
        priceUsd: '2500.00',
        change24h: 2.5,
        change7d: 5.2,
      },
      {
        symbol: 'USDT',
        name: 'Tether USD',
        blockchain,
        balance: (parseFloat(chainBalance.balance) * 0.1).toFixed(6),
        usdValue: (parseFloat(chainBalance.usdValue) * 0.1).toFixed(2),
        percentage: 0,
        priceUsd: '1.00',
        change24h: 0.05,
        change7d: 0.1,
      },
    ];

    return mockAssets;
  };

  const calculateMetrics = (assets: PortfolioAsset[], totalValue: number): PortfolioMetrics => {
    const totalChange24h = assets.reduce((sum, asset) => sum + parseFloat(asset.usdValue) * (asset.change24h / 100), 0);
    const totalChange7d = assets.reduce((sum, asset) => sum + parseFloat(asset.usdValue) * (asset.change7d / 100), 0);

    const bestPerformer = assets.reduce((best, current) => (current.change24h > best.change24h ? current : best), assets[0] || null);
    const worstPerformer = assets.reduce((worst, current) => (current.change24h < worst.change24h ? current : worst), assets[0] || null);

    return {
      totalValue: totalValue.toFixed(2),
      totalChange24h: totalChange24h.toFixed(2),
      totalChange24hPercent: totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0,
      totalChange7d: totalChange7d.toFixed(2),
      totalChange7dPercent: totalValue > 0 ? (totalChange7d / totalValue) * 100 : 0,
      bestPerformer,
      worstPerformer,
    };
  };

  const getAssetsByBlockchain = useCallback(
    (blockchain: BlockchainId): PortfolioAsset[] => {
      return assets.filter((asset) => asset.blockchain === blockchain);
    },
    [assets]
  );

  const getTopAssets = useCallback(
    (limit: number = 5): PortfolioAsset[] => {
      return assets.sort((a, b) => parseFloat(b.usdValue) - parseFloat(a.usdValue)).slice(0, limit);
    },
    [assets]
  );

  const getPortfolioValueHistory = useCallback(
    (days: number = 7): PortfolioHistory[] => {
      const now = Date.now();
      const timeWindow = days * 24 * 60 * 60 * 1000;
      return history.filter((h) => now - h.timestamp <= timeWindow);
    },
    [history]
  );

  const calculateDiversification = useCallback((): number => {
    if (assets.length === 0) return 0;
    const herfindahlIndex = assets.reduce((sum, asset) => {
      const percentage = asset.percentage / 100;
      return sum + percentage * percentage;
    }, 0);
    return (1 - herfindahlIndex) * 100; // Convert to 0-100 scale
  }, [assets]);

  return {
    assets,
    allocations,
    metrics,
    history,
    isLoading,
    error,
    getAssetsByBlockchain,
    getTopAssets,
    getPortfolioValueHistory,
    calculateDiversification,
  };
}
