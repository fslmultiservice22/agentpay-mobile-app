import { useState, useCallback, useMemo } from 'react';

export interface PortfolioMetric {
  timestamp: number;
  value: number;
  change: number;
}

export interface AnalyticsData {
  portfolioValue: string;
  dailyChange: string;
  weeklyChange: string;
  monthlyChange: string;
  yearlyChange: string;
  totalReturn: string;
  volatility: string;
  sharpeRatio: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
  }>;
}

interface AnalyticsDashboardState {
  metrics: AnalyticsData | null;
  historicalData: PortfolioMetric[];
  chartData: ChartData | null;
  isLoading: boolean;
  error: string | null;
}

// Genera dati storici simulati
const generateHistoricalData = (days: number): PortfolioMetric[] => {
  const data: PortfolioMetric[] = [];
  const now = Date.now();
  let value = 50000;

  for (let i = days; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 2000; // Trend leggermente positivo
    value += change;
    data.push({
      timestamp: now - i * 24 * 60 * 60 * 1000,
      value: Math.max(value, 10000),
      change,
    });
  }

  return data;
};

export function useAnalyticsDashboard(address: string | null) {
  const [state, setState] = useState<AnalyticsDashboardState>({
    metrics: null,
    historicalData: generateHistoricalData(365),
    chartData: null,
    isLoading: false,
    error: null,
  });

  // Calcola le metriche
  const calculateMetrics = useCallback(
    (data: PortfolioMetric[]): AnalyticsData => {
      if (data.length === 0) {
        return {
          portfolioValue: '0',
          dailyChange: '0',
          weeklyChange: '0',
          monthlyChange: '0',
          yearlyChange: '0',
          totalReturn: '0',
          volatility: '0',
          sharpeRatio: '0',
        };
      }

      const currentValue = data[data.length - 1].value;
      const startValue = data[0].value;
      const totalReturn = ((currentValue - startValue) / startValue) * 100;

      // Calcola i cambiamenti per periodo
      const dailyData = data.slice(-1);
      const weeklyData = data.slice(-7);
      const monthlyData = data.slice(-30);
      const yearlyData = data.slice(-365);

      const calculateChange = (subset: PortfolioMetric[]): string => {
        if (subset.length < 2) return '0';
        const start = subset[0].value;
        const end = subset[subset.length - 1].value;
        return (((end - start) / start) * 100).toFixed(2);
      };

      // Calcola la volatilità (deviazione standard dei rendimenti)
      const returns = data.slice(1).map((d, i) => (d.value - data[i].value) / data[i].value);
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * 100;

      // Calcola lo Sharpe Ratio (semplificato)
      const riskFreeRate = 0.02 / 365; // 2% annuale
      const sharpeRatio = returns.length > 0 ? (meanReturn - riskFreeRate) / Math.sqrt(variance) : 0;

      return {
        portfolioValue: currentValue.toFixed(2),
        dailyChange: calculateChange(dailyData),
        weeklyChange: calculateChange(weeklyData),
        monthlyChange: calculateChange(monthlyData),
        yearlyChange: calculateChange(yearlyData),
        totalReturn: totalReturn.toFixed(2),
        volatility: volatility.toFixed(2),
        sharpeRatio: sharpeRatio.toFixed(2),
      };
    },
    [],
  );

  // Genera i dati del grafico
  const generateChartData = useCallback(
    (data: PortfolioMetric[], days: number = 30): ChartData => {
      const subset = data.slice(-days);
      const labels = subset.map(d => {
        const date = new Date(d.timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      });

      const values = subset.map(d => d.value);

      return {
        labels,
        datasets: [
          {
            label: 'Portfolio Value',
            data: values,
            borderColor: '#0a7ea4',
            backgroundColor: 'rgba(10, 126, 164, 0.1)',
            fill: true,
          },
        ],
      };
    },
    [],
  );

  // Carica i dati analitici
  const loadAnalytics = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      // Simula il caricamento dei dati
      await new Promise(resolve => setTimeout(resolve, 1500));

      const metrics = calculateMetrics(state.historicalData);
      const chartData = generateChartData(state.historicalData, 30);

      setState(prev => ({
        ...prev,
        metrics,
        chartData,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [address, state.historicalData, calculateMetrics, generateChartData]);

  // Ottieni i dati del grafico per un periodo specifico
  const getChartDataForPeriod = useCallback(
    (days: number): ChartData => {
      return generateChartData(state.historicalData, days);
    },
    [state.historicalData, generateChartData],
  );

  // Calcola le statistiche di performance
  const getPerformanceStats = useCallback(() => {
    if (!state.metrics) return null;

    const metrics = state.metrics;
    const volatility = parseFloat(metrics.volatility);
    const sharpeRatio = parseFloat(metrics.sharpeRatio);
    const totalReturn = parseFloat(metrics.totalReturn);

    // Classifica la performance
    let performanceRating = 'Good';
    if (totalReturn > 50) performanceRating = 'Excellent';
    else if (totalReturn < -10) performanceRating = 'Poor';

    // Classifica il rischio
    let riskLevel = 'Medium';
    if (volatility > 30) riskLevel = 'High';
    else if (volatility < 10) riskLevel = 'Low';

    return {
      performanceRating,
      riskLevel,
      riskAdjustedReturn: sharpeRatio,
      bestDay: state.historicalData.reduce((max, d) => (d.change > max.change ? d : max)).change.toFixed(2),
      worstDay: state.historicalData.reduce((min, d) => (d.change < min.change ? d : min)).change.toFixed(2),
      averageDailyReturn: (
        state.historicalData.reduce((sum, d) => sum + d.change, 0) / state.historicalData.length
      ).toFixed(2),
    };
  }, [state.metrics, state.historicalData]);

  // Memoizza le metriche iniziali
  useMemo(() => {
    if (!state.metrics && state.historicalData.length > 0) {
      const metrics = calculateMetrics(state.historicalData);
      const chartData = generateChartData(state.historicalData, 30);
      setState(prev => ({
        ...prev,
        metrics,
        chartData,
      }));
    }
  }, []);

  return {
    metrics: state.metrics,
    historicalData: state.historicalData,
    chartData: state.chartData,
    isLoading: state.isLoading,
    error: state.error,
    loadAnalytics,
    getChartDataForPeriod,
    getPerformanceStats,
  };
}
