import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PortfolioAsset {
  symbol: string;
  amount: number;
  value: number;
  change24h: number;
  changePercent24h: number;
}

export interface PortfolioData {
  totalValue: number;
  totalChange: number;
  totalChangePercent: number;
  assets: PortfolioAsset[];
  lastUpdated: number;
}

const PORTFOLIO_STORAGE_KEY = 'agentpay_portfolio';
const SWAP_HISTORY_KEY = 'agentpay_swap_history';

export function usePortfolioSync() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carica il portfolio da AsyncStorage
  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(PORTFOLIO_STORAGE_KEY);
      
      if (stored) {
        const data = JSON.parse(stored);
        setPortfolio(data);
      } else {
        // Portfolio iniziale di default
        const defaultPortfolio: PortfolioData = {
          totalValue: 125450.50,
          totalChange: 8250.25,
          totalChangePercent: 7.03,
          assets: [
            {
              symbol: 'ETH',
              amount: 2.5,
              value: 5125.00,
              change24h: 205.00,
              changePercent24h: 4.2,
            },
            {
              symbol: 'USDC',
              amount: 50000,
              value: 50000.00,
              change24h: 0,
              changePercent24h: 0,
            },
            {
              symbol: 'DAI',
              amount: 25000,
              value: 25000.00,
              change24h: 0,
              changePercent24h: 0,
            },
          ],
          lastUpdated: Date.now(),
        };
        
        setPortfolio(defaultPortfolio);
        await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(defaultPortfolio));
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
      console.error('Error loading portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  // Sincronizza il portfolio dopo uno swap
  const syncAfterSwap = async (fromSymbol: string, toSymbol: string, fromAmount: number, toAmount: number, rate: number) => {
    try {
      if (!portfolio) return;

      const updatedAssets = portfolio.assets.map(asset => {
        if (asset.symbol === fromSymbol) {
          return {
            ...asset,
            amount: asset.amount - fromAmount,
            value: (asset.amount - fromAmount) * (asset.value / asset.amount),
          };
        }
        if (asset.symbol === toSymbol) {
          return {
            ...asset,
            amount: asset.amount + toAmount,
            value: (asset.amount + toAmount) * (asset.value / asset.amount),
          };
        }
        return asset;
      });

      // Calcola il nuovo valore totale
      const newTotalValue = updatedAssets.reduce((sum, asset) => sum + asset.value, 0);
      const newTotalChange = newTotalValue - 125450.50; // Valore iniziale di default
      const newTotalChangePercent = (newTotalChange / 125450.50) * 100;

      const updatedPortfolio: PortfolioData = {
        totalValue: newTotalValue,
        totalChange: newTotalChange,
        totalChangePercent: newTotalChangePercent,
        assets: updatedAssets,
        lastUpdated: Date.now(),
      };

      setPortfolio(updatedPortfolio);
      await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updatedPortfolio));
    } catch (err) {
      console.error('Error syncing portfolio after swap:', err);
    }
  };

  // Aggiorna il saldo di un asset specifico
  const updateAssetBalance = async (symbol: string, newAmount: number) => {
    try {
      if (!portfolio) return;

      const updatedAssets = portfolio.assets.map(asset => {
        if (asset.symbol === symbol) {
          const pricePerUnit = asset.value / asset.amount;
          return {
            ...asset,
            amount: newAmount,
            value: newAmount * pricePerUnit,
          };
        }
        return asset;
      });

      const newTotalValue = updatedAssets.reduce((sum, asset) => sum + asset.value, 0);
      const newTotalChange = newTotalValue - 125450.50;
      const newTotalChangePercent = (newTotalChange / 125450.50) * 100;

      const updatedPortfolio: PortfolioData = {
        totalValue: newTotalValue,
        totalChange: newTotalChange,
        totalChangePercent: newTotalChangePercent,
        assets: updatedAssets,
        lastUpdated: Date.now(),
      };

      setPortfolio(updatedPortfolio);
      await AsyncStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updatedPortfolio));
    } catch (err) {
      console.error('Error updating asset balance:', err);
    }
  };

  // Carica il portfolio al montaggio del componente
  useEffect(() => {
    loadPortfolio();
  }, []);

  return {
    portfolio,
    loading,
    error,
    loadPortfolio,
    syncAfterSwap,
    updateAssetBalance,
  };
}
