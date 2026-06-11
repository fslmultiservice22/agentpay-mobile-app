/**
 * Technical Analysis Service
 * Technical indicators: RSI, MACD, Bollinger Bands, SMA, EMA
 */

export interface OHLC {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RSIValue {
  timestamp: number;
  rsi: number;
  signal: 'overbought' | 'oversold' | 'neutral';
}

export interface MACDValue {
  timestamp: number;
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

export interface BollingerBand {
  timestamp: number;
  upper: number;
  middle: number;
  lower: number;
  position: 'above' | 'middle' | 'below';
}

export interface MovingAverage {
  timestamp: number;
  sma: number;
  ema: number;
}

export interface TechnicalSignal {
  type: 'rsi' | 'macd' | 'bollinger' | 'moving_average';
  signal: 'buy' | 'sell' | 'hold';
  strength: number; // 0-100
  confidence: number; // 0-100
  timestamp: number;
}

class TechnicalAnalysisService {
  /**
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(prices: number[], period: number = 14): RSIValue[] {
    const results: RSIValue[] = [];
    const changes = [];

    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    for (let i = period; i < prices.length; i++) {
      const gains = changes.slice(i - period, i).filter(c => c > 0).reduce((a, b) => a + b, 0);
      const losses = Math.abs(changes.slice(i - period, i).filter(c => c < 0).reduce((a, b) => a + b, 0));

      const avgGain = gains / period;
      const avgLoss = losses / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      let signal: 'overbought' | 'oversold' | 'neutral';
      if (rsi > 70) signal = 'overbought';
      else if (rsi < 30) signal = 'oversold';
      else signal = 'neutral';

      results.push({
        timestamp: i,
        rsi,
        signal,
      });
    }

    return results;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDValue[] {
    const ema12 = this.calculateEMA(prices, fastPeriod);
    const ema26 = this.calculateEMA(prices, slowPeriod);
    const results: MACDValue[] = [];

    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = this.calculateEMA(macdLine, signalPeriod);

    for (let i = 0; i < macdLine.length; i++) {
      const histogram = macdLine[i] - signalLine[i];
      const trend = histogram > 0 ? 'bullish' : histogram < 0 ? 'bearish' : 'neutral';

      results.push({
        timestamp: i,
        macd: macdLine[i],
        signal: signalLine[i],
        histogram,
        trend: trend as 'bullish' | 'bearish' | 'neutral',
      });
    }

    return results;
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): BollingerBand[] {
    const results: BollingerBand[] = [];
    const sma = this.calculateSMA(prices, period);

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b) / slice.length;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
      const std = Math.sqrt(variance);

      const upper = sma[i - period + 1] + stdDev * std;
      const lower = sma[i - period + 1] - stdDev * std;
      const middle = sma[i - period + 1];

      let position: 'above' | 'middle' | 'below';
      if (prices[i] > upper) position = 'above';
      else if (prices[i] < lower) position = 'below';
      else position = 'middle';

      results.push({
        timestamp: i,
        upper,
        middle,
        lower,
        position,
      });
    }

    return results;
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  calculateSMA(prices: number[], period: number): number[] {
    const results: number[] = [];

    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1);
      const sma = slice.reduce((a, b) => a + b) / slice.length;
      results.push(sma);
    }

    return results;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(prices: number[], period: number): number[] {
    const results: number[] = [];
    const multiplier = 2 / (period + 1);

    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
    results.push(ema);

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
      results.push(ema);
    }

    return results;
  }

  /**
   * Generate trading signals
   */
  generateSignals(ohlcData: OHLC[]): TechnicalSignal[] {
    const prices = ohlcData.map(o => o.close);
    const signals: TechnicalSignal[] = [];

    // RSI Signal
    const rsiValues = this.calculateRSI(prices);
    const lastRSI = rsiValues[rsiValues.length - 1];
    if (lastRSI.signal === 'oversold') {
      signals.push({
        type: 'rsi',
        signal: 'buy',
        strength: 100 - lastRSI.rsi,
        confidence: 75,
        timestamp: Date.now(),
      });
    } else if (lastRSI.signal === 'overbought') {
      signals.push({
        type: 'rsi',
        signal: 'sell',
        strength: lastRSI.rsi - 70,
        confidence: 75,
        timestamp: Date.now(),
      });
    }

    // MACD Signal
    const macdValues = this.calculateMACD(prices);
    const lastMACD = macdValues[macdValues.length - 1];
    if (lastMACD.trend === 'bullish') {
      signals.push({
        type: 'macd',
        signal: 'buy',
        strength: Math.min(100, Math.abs(lastMACD.histogram) * 100),
        confidence: 70,
        timestamp: Date.now(),
      });
    } else if (lastMACD.trend === 'bearish') {
      signals.push({
        type: 'macd',
        signal: 'sell',
        strength: Math.min(100, Math.abs(lastMACD.histogram) * 100),
        confidence: 70,
        timestamp: Date.now(),
      });
    }

    // Bollinger Bands Signal
    const bbValues = this.calculateBollingerBands(prices);
    const lastBB = bbValues[bbValues.length - 1];
    if (lastBB.position === 'below') {
      signals.push({
        type: 'bollinger',
        signal: 'buy',
        strength: ((lastBB.middle - prices[prices.length - 1]) / (lastBB.middle - lastBB.lower)) * 100,
        confidence: 65,
        timestamp: Date.now(),
      });
    } else if (lastBB.position === 'above') {
      signals.push({
        type: 'bollinger',
        signal: 'sell',
        strength: ((prices[prices.length - 1] - lastBB.middle) / (lastBB.upper - lastBB.middle)) * 100,
        confidence: 65,
        timestamp: Date.now(),
      });
    }

    return signals;
  }

  /**
   * Calculate support and resistance levels
   */
  calculateSupportResistance(prices: number[]): {
    support: number[];
    resistance: number[];
  } {
    const support: number[] = [];
    const resistance: number[] = [];

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min;

    // Support levels
    support.push(min);
    support.push(min + range * 0.25);
    support.push(min + range * 0.5);

    // Resistance levels
    resistance.push(max - range * 0.5);
    resistance.push(max - range * 0.25);
    resistance.push(max);

    return { support, resistance };
  }

  /**
   * Calculate volatility
   */
  calculateVolatility(prices: number[], period: number = 20): number {
    const returns: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const recentReturns = returns.slice(-period);
    const mean = recentReturns.reduce((a, b) => a + b) / recentReturns.length;
    const variance = recentReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentReturns.length;

    return Math.sqrt(variance) * 100;
  }

  /**
   * Calculate trend strength
   */
  calculateTrendStrength(prices: number[], period: number = 20): {
    direction: 'uptrend' | 'downtrend' | 'sideways';
    strength: number;
  } {
    const recentPrices = prices.slice(-period);
    const firstPrice = recentPrices[0];
    const lastPrice = recentPrices[recentPrices.length - 1];
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    let direction: 'uptrend' | 'downtrend' | 'sideways';
    let strength: number;

    if (Math.abs(change) < 2) {
      direction = 'sideways';
      strength = 0;
    } else if (change > 0) {
      direction = 'uptrend';
      strength = Math.min(100, Math.abs(change) * 5);
    } else {
      direction = 'downtrend';
      strength = Math.min(100, Math.abs(change) * 5);
    }

    return { direction, strength };
  }
}

export const technicalAnalysisService = new TechnicalAnalysisService();
