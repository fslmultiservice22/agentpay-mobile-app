import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PortfolioAsset {
  symbol: string;
  name: string;
  amount: string;
  value: string;
  percentage: number;
  priceChange24h: number;
}

export interface PortfolioSnapshot {
  timestamp: number;
  totalValue: string;
  assets: PortfolioAsset[];
}

export interface PortfolioMetrics {
  totalValue: string;
  totalChange24h: string;
  totalChangePercent24h: number;
  bestPerformer: PortfolioAsset | null;
  worstPerformer: PortfolioAsset | null;
  diversificationScore: number;
}

interface PortfolioDashboardState {
  currentPortfolio: PortfolioAsset[];
  portfolioHistory: PortfolioSnapshot[];
  metrics: PortfolioMetrics | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'agentpay_portfolio_history';
const MAX_HISTORY = 365; // 1 year of daily snapshots

export function usePortfolioDashboard(address: string | null) {
  const [state, setState] = useState<PortfolioDashboardState>({
    currentPortfolio: [],
    portfolioHistory: [],
    metrics: null,
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Carica la storia del portfolio dal storage
  const loadPortfolioHistory = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
      const history: PortfolioSnapshot[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          portfolioHistory: history,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load portfolio history';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Carica la storia al mount
  useEffect(() => {
    loadPortfolioHistory();
  }, [address, loadPortfolioHistory]);

  // Calcola le metriche del portfolio
  const calculateMetrics = useCallback((assets: PortfolioAsset[]): PortfolioMetrics => {
    const totalValue = assets.reduce((sum, asset) => sum + parseFloat(asset.value), 0);
    const totalChange24h = assets.reduce(
      (sum, asset) => sum + parseFloat(asset.value) * (asset.priceChange24h / 100),
      0,
    );
    const totalChangePercent24h = totalValue > 0 ? (totalChange24h / totalValue) * 100 : 0;

    const bestPerformer = assets.reduce((best, asset) =>
      asset.priceChange24h > (best?.priceChange24h ?? -Infinity) ? asset : best,
    );

    const worstPerformer = assets.reduce((worst, asset) =>
      asset.priceChange24h < (worst?.priceChange24h ?? Infinity) ? asset : worst,
    );

    // Calcola il Herfindahl index per la diversificazione (0-100)
    const herfindahl = assets.reduce((sum, asset) => sum + Math.pow(asset.percentage, 2), 0);
    const diversificationScore = Math.max(0, 100 - herfindahl / 10);

    return {
      totalValue: totalValue.toFixed(2),
      totalChange24h: totalChange24h.toFixed(2),
      totalChangePercent24h: parseFloat(totalChangePercent24h.toFixed(2)),
      bestPerformer: bestPerformer || null,
      worstPerformer: worstPerformer || null,
      diversificationScore: parseFloat(diversificationScore.toFixed(1)),
    };
  }, []);

  // Aggiorna il portfolio corrente
  const updatePortfolio = useCallback(
    async (assets: PortfolioAsset[]) => {
      if (!address) return;

      try {
        // Calcola le metriche
        const metrics = calculateMetrics(assets);

        // Crea uno snapshot
        const snapshot: PortfolioSnapshot = {
          timestamp: Date.now(),
          totalValue: metrics.totalValue,
          assets,
        };

        // Carica la storia precedente
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let history: PortfolioSnapshot[] = stored ? JSON.parse(stored) : [];

        // Aggiungi il nuovo snapshot
        history.unshift(snapshot);

        // Mantieni solo gli ultimi MAX_HISTORY snapshot
        history = history.slice(0, MAX_HISTORY);

        // Salva nel storage
        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(history));

        if (isMountedRef.current) {
          setState({
            currentPortfolio: assets,
            portfolioHistory: history,
            metrics,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        console.error('Failed to update portfolio:', err);
      }
    },
    [address, calculateMetrics],
  );

  // Ottieni il valore del portfolio in un periodo specifico
  const getPortfolioValueHistory = useCallback(
    (days: number = 30): Array<{ timestamp: number; value: number }> => {
      const now = Date.now();
      const cutoff = now - days * 24 * 60 * 60 * 1000;

      return state.portfolioHistory
        .filter(snapshot => snapshot.timestamp >= cutoff)
        .map(snapshot => ({
          timestamp: snapshot.timestamp,
          value: parseFloat(snapshot.totalValue),
        }))
        .reverse();
    },
    [state.portfolioHistory],
  );

  // Calcola il ritorno totale
  const calculateTotalReturn = useCallback((): number => {
    if (state.portfolioHistory.length < 2) return 0;

    const oldest = state.portfolioHistory[state.portfolioHistory.length - 1];
    const newest = state.portfolioHistory[0];

    const oldValue = parseFloat(oldest.totalValue);
    const newValue = parseFloat(newest.totalValue);

    return oldValue > 0 ? ((newValue - oldValue) / oldValue) * 100 : 0;
  }, [state.portfolioHistory]);

  // Pulisci la storia del portfolio
  const clearHistory = useCallback(async () => {
    if (!address) return;

    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY}_${address}`);

      if (isMountedRef.current) {
        setState({
          currentPortfolio: [],
          portfolioHistory: [],
          metrics: null,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      console.error('Failed to clear portfolio history:', err);
    }
  }, [address]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    currentPortfolio: state.currentPortfolio,
    portfolioHistory: state.portfolioHistory,
    metrics: state.metrics,
    isLoading: state.isLoading,
    error: state.error,
    updatePortfolio,
    getPortfolioValueHistory,
    calculateTotalReturn,
    clearHistory,
    loadPortfolioHistory,
  };
}
