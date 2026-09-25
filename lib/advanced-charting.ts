/**
 * Advanced Charting Service
 * Manages interactive charts for portfolio and price analysis
 */

export interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ChartIndicator {
  type: 'sma' | 'ema' | 'rsi' | 'macd' | 'bollinger';
  period?: number;
  values: number[];
}

class AdvancedChartingService {
  private chartData: Map<string, ChartSeries[]> = new Map();
  private indicators: Map<string, ChartIndicator[]> = new Map();

  /**
   * Initialize advanced charting service
   */
  public async init(): Promise<void> {
  }

  /**
   * Add chart series
   */
  public addChartSeries(chartId: string, series: ChartSeries): void {
    const existing = this.chartData.get(chartId) || [];
    existing.push(series);
    this.chartData.set(chartId, existing);

  }

  /**
   * Get chart series
   */
  public getChartSeries(chartId: string): ChartSeries[] {
    return this.chartData.get(chartId) || [];
  }

  /**
   * Add chart data point
   */
  public addDataPoint(chartId: string, seriesName: string, point: ChartDataPoint): void {
    const series = this.chartData.get(chartId) || [];
    const targetSeries = series.find((s) => s.name === seriesName);

    if (targetSeries) {
      targetSeries.data.push(point);
    }
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  public calculateSMA(data: ChartDataPoint[], period: number): number[] {
    const sma: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(0);
      } else {
        let sum = 0;
        for (let j = i - period + 1; j <= i; j++) {
          sum += data[j].close;
        }
        sma.push(sum / period);
      }
    }

    return sma;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  public calculateEMA(data: ChartDataPoint[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // Calculate SMA for first point
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
    }
    ema[period - 1] = sum / period;

    // Calculate EMA for remaining points
    for (let i = period; i < data.length; i++) {
      const currentEMA = (data[i].close - ema[i - 1]) * multiplier + ema[i - 1];
      ema[i] = currentEMA;
    }

    // Fill initial values with 0
    for (let i = 0; i < period - 1; i++) {
      ema[i] = 0;
    }

    return ema;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  public calculateRSI(data: ChartDataPoint[], period: number = 14): number[] {
    const rsi: number[] = [];
    let gains = 0;
    let losses = 0;

    // Calculate initial gains and losses
    for (let i = 1; i < period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    for (let i = 0; i < period; i++) {
      rsi.push(0);
    }

    // Calculate RSI for remaining points
    for (let i = period; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;

      const smoothedGain = (avgGain * (period - 1) + currentGain) / period;
      const smoothedLoss = (avgLoss * (period - 1) + currentLoss) / period;

      const rs = smoothedGain / smoothedLoss;
      const currentRSI = 100 - 100 / (1 + rs);

      rsi.push(currentRSI);
    }

    return rsi;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  public calculateMACD(data: ChartDataPoint[]): { macd: number[]; signal: number[]; histogram: number[] } {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);

    const macd: number[] = [];
    for (let i = 0; i < data.length; i++) {
      macd.push(ema12[i] - ema26[i]);
    }

    const signal = this.calculateEMA(
      macd.map((m, i) => ({
        timestamp: data[i].timestamp,
        open: m,
        high: m,
        low: m,
        close: m,
        volume: 0,
      })),
      9
    );

    const histogram: number[] = [];
    for (let i = 0; i < macd.length; i++) {
      histogram.push(macd[i] - signal[i]);
    }

    return { macd, signal, histogram };
  }

  /**
   * Calculate Bollinger Bands
   */
  public calculateBollingerBands(data: ChartDataPoint[], period: number = 20, stdDev: number = 2): {
    upper: number[];
    middle: number[];
    lower: number[];
  } {
    const sma = this.calculateSMA(data, period);
    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        upper.push(0);
        middle.push(0);
        lower.push(0);
      } else {
        let variance = 0;
        for (let j = i - period + 1; j <= i; j++) {
          variance += Math.pow(data[j].close - sma[i], 2);
        }
        variance /= period;

        const standardDeviation = Math.sqrt(variance);
        middle.push(sma[i]);
        upper.push(sma[i] + stdDev * standardDeviation);
        lower.push(sma[i] - stdDev * standardDeviation);
      }
    }

    return { upper, middle, lower };
  }

  /**
   * Add indicator to chart
   */
  public addIndicator(chartId: string, indicator: ChartIndicator): void {
    const existing = this.indicators.get(chartId) || [];
    existing.push(indicator);
    this.indicators.set(chartId, existing);

  }

  /**
   * Get indicators
   */
  public getIndicators(chartId: string): ChartIndicator[] {
    return this.indicators.get(chartId) || [];
  }

  /**
   * Generate chart config for rendering
   */
  public generateChartConfig(chartId: string): {
    series: ChartSeries[];
    indicators: ChartIndicator[];
  } {
    return {
      series: this.getChartSeries(chartId),
      indicators: this.getIndicators(chartId),
    };
  }

  /**
   * Clear chart data
   */
  public clearChart(chartId: string): void {
    this.chartData.delete(chartId);
    this.indicators.delete(chartId);

  }

  /**
   * Clear all data
   */
  public clearAll(): void {
    this.chartData.clear();
    this.indicators.clear();

  }

  /**
   * Cleanup
   */
  public cleanup(): void {
  }
}

// Export singleton instance
export const advancedChartingService = new AdvancedChartingService();

/**
 * Hook to use advanced charting service in components
 */
export function useAdvancedCharting() {
  return advancedChartingService;
}
