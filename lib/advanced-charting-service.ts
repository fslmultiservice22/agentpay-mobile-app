/**
 * Advanced Charting Service
 * Provides charting data and technical indicators
 */

export interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  name: string;
  values: Array<{ timestamp: number; value: number }>;
  type: 'line' | 'histogram' | 'area';
}

export interface ChartData {
  symbol: string;
  period: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1mo';
  data: ChartDataPoint[];
  indicators: TechnicalIndicator[];
  lastUpdated: number;
}

class AdvancedChartingService {
  private chartCache: Map<string, ChartData> = new Map();

  /**
   * Generate OHLCV data
   */
  generateOHLCVData(
    symbol: string,
    period: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1mo',
    points: number = 100
  ): ChartDataPoint[] {
    const periodMs = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
      '1w': 604800000,
      '1mo': 2592000000,
    }[period];

    const data: ChartDataPoint[] = [];
    let basePrice = 2500; // Mock base price

    for (let i = 0; i < points; i++) {
      const timestamp = Date.now() - (periodMs * (points - i));
      
      // Generate realistic OHLCV data
      const open = basePrice + (Math.random() - 0.5) * 50;
      const close = open + (Math.random() - 0.5) * 100;
      const high = Math.max(open, close) + Math.random() * 50;
      const low = Math.min(open, close) - Math.random() * 50;
      const volume = Math.random() * 1000000;

      data.push({
        timestamp,
        open: parseFloat(open.toFixed(2)),
        high: parseFloat(high.toFixed(2)),
        low: parseFloat(low.toFixed(2)),
        close: parseFloat(close.toFixed(2)),
        volume: parseFloat(volume.toFixed(0)),
      });

      basePrice = close;
    }

    return data;
  }

  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(data: ChartDataPoint[], period: number): TechnicalIndicator {
    const values: Array<{ timestamp: number; value: number }> = [];

    for (let i = period - 1; i < data.length; i++) {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, point) => acc + point.close, 0);
      const sma = sum / period;

      values.push({
        timestamp: data[i].timestamp,
        value: parseFloat(sma.toFixed(2)),
      });
    }

    return {
      name: `SMA(${period})`,
      values,
      type: 'line',
    };
  }

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(data: ChartDataPoint[], period: number): TechnicalIndicator {
    const values: Array<{ timestamp: number; value: number }> = [];
    const multiplier = 2 / (period + 1);

    let ema = data.slice(0, period).reduce((acc, point) => acc + point.close, 0) / period;

    for (let i = period; i < data.length; i++) {
      ema = data[i].close * multiplier + ema * (1 - multiplier);
      values.push({
        timestamp: data[i].timestamp,
        value: parseFloat(ema.toFixed(2)),
      });
    }

    return {
      name: `EMA(${period})`,
      values,
      type: 'line',
    };
  }

  /**
   * Calculate MACD
   */
  calculateMACD(data: ChartDataPoint[]): TechnicalIndicator[] {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);

    const macdLine: Array<{ timestamp: number; value: number }> = [];
    const signalLine: Array<{ timestamp: number; value: number }> = [];
    const histogram: Array<{ timestamp: number; value: number }> = [];

    const minLength = Math.min(ema12.values.length, ema26.values.length);

    for (let i = 0; i < minLength; i++) {
      const macd = ema12.values[i].value - ema26.values[i].value;
      macdLine.push({
        timestamp: ema12.values[i].timestamp,
        value: parseFloat(macd.toFixed(2)),
      });
    }

    // Calculate signal line (9-period EMA of MACD)
    for (let i = 8; i < macdLine.length; i++) {
      const sum = macdLine
        .slice(i - 8, i + 1)
        .reduce((acc, point) => acc + point.value, 0);
      const signal = sum / 9;
      signalLine.push({
        timestamp: macdLine[i].timestamp,
        value: parseFloat(signal.toFixed(2)),
      });
    }

    // Calculate histogram
    for (let i = 0; i < signalLine.length; i++) {
      const hist = macdLine[i + 8].value - signalLine[i].value;
      histogram.push({
        timestamp: signalLine[i].timestamp,
        value: parseFloat(hist.toFixed(2)),
      });
    }

    return [
      { name: 'MACD', values: macdLine, type: 'line' },
      { name: 'Signal Line', values: signalLine, type: 'line' },
      { name: 'Histogram', values: histogram, type: 'histogram' },
    ];
  }

  /**
   * Calculate RSI
   */
  calculateRSI(data: ChartDataPoint[], period: number = 14): TechnicalIndicator {
    const values: Array<{ timestamp: number; value: number }> = [];
    const changes = [];

    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }

    let gains = 0;
    let losses = 0;

    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) gains += changes[i];
      else losses -= changes[i];
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period; i < changes.length; i++) {
      const change = changes[i];
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) - change) / period;
      }

      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      values.push({
        timestamp: data[i + 1].timestamp,
        value: parseFloat(rsi.toFixed(2)),
      });
    }

    return {
      name: `RSI(${period})`,
      values,
      type: 'line',
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(data: ChartDataPoint[], period: number = 20): TechnicalIndicator[] {
    const sma = this.calculateSMA(data, period);
    const upperBand: Array<{ timestamp: number; value: number }> = [];
    const lowerBand: Array<{ timestamp: number; value: number }> = [];

    for (let i = period - 1; i < data.length; i++) {
      const prices = data.slice(i - period + 1, i + 1).map(p => p.close);
      const mean = prices.reduce((a, b) => a + b) / period;
      const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      upperBand.push({
        timestamp: data[i].timestamp,
        value: parseFloat((mean + 2 * stdDev).toFixed(2)),
      });

      lowerBand.push({
        timestamp: data[i].timestamp,
        value: parseFloat((mean - 2 * stdDev).toFixed(2)),
      });
    }

    return [
      { name: 'Upper Band', values: upperBand, type: 'line' },
      { name: 'Middle Band', values: sma.values, type: 'line' },
      { name: 'Lower Band', values: lowerBand, type: 'line' },
    ];
  }

  /**
   * Generate complete chart data with indicators
   */
  generateChartData(
    symbol: string,
    period: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1mo'
  ): ChartData {
    const ohlcvData = this.generateOHLCVData(symbol, period, 100);

    const indicators: TechnicalIndicator[] = [
      this.calculateSMA(ohlcvData, 20),
      this.calculateSMA(ohlcvData, 50),
      this.calculateEMA(ohlcvData, 12),
      this.calculateRSI(ohlcvData),
      ...this.calculateMACD(ohlcvData),
      ...this.calculateBollingerBands(ohlcvData),
    ];

    const chartData: ChartData = {
      symbol,
      period,
      data: ohlcvData,
      indicators,
      lastUpdated: Date.now(),
    };

    this.chartCache.set(`${symbol}_${period}`, chartData);
    return chartData;
  }

  /**
   * Get cached chart data
   */
  getChartData(symbol: string, period: string): ChartData | undefined {
    return this.chartCache.get(`${symbol}_${period}`);
  }

  /**
   * Calculate support and resistance levels
   */
  calculateSupportResistance(data: ChartDataPoint[]): {
    support: number[];
    resistance: number[];
  } {
    const closes = data.map(d => d.close);
    const sorted = [...closes].sort((a, b) => a - b);

    // Find local minima and maxima
    const support: number[] = [];
    const resistance: number[] = [];

    for (let i = 1; i < closes.length - 1; i++) {
      if (closes[i] < closes[i - 1] && closes[i] < closes[i + 1]) {
        support.push(closes[i]);
      }
      if (closes[i] > closes[i - 1] && closes[i] > closes[i + 1]) {
        resistance.push(closes[i]);
      }
    }

    return {
      support: support.slice(-3),
      resistance: resistance.slice(-3),
    };
  }
}

export const advancedChartingService = new AdvancedChartingService();
