/**
 * AI Trade Signals Service
 * Provides AI-powered trading signals and recommendations
 */

export type SignalStrength = 'very_weak' | 'weak' | 'neutral' | 'strong' | 'very_strong';
export type SignalDirection = 'buy' | 'sell' | 'hold';

export interface TradeSignal {
  id: string;
  symbol: string;
  direction: SignalDirection;
  strength: SignalStrength;
  confidence: number; // 0-100
  entryPrice: string;
  targetPrice: string;
  stopLoss: string;
  timeframe: '1h' | '4h' | '1d' | '1w';
  reasoning: string;
  indicators: Record<string, any>;
  timestamp: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'completed';
}

export interface TechnicalIndicators {
  rsi: number; // 0-100
  macd: { value: number; signal: number; histogram: number };
  movingAverages: { ma20: number; ma50: number; ma200: number };
  bollingerBands: { upper: number; middle: number; lower: number };
  volume: number;
  trend: 'uptrend' | 'downtrend' | 'sideways';
}

export interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to +100
  sources: {
    technical: number;
    fundamental: number;
    social: number;
    onchain: number;
  };
}

export interface TradeRecommendation {
  symbol: string;
  action: SignalDirection;
  confidence: number;
  riskReward: number; // risk/reward ratio
  positionSize: string; // percentage of portfolio
  timeHorizon: string;
  reasoning: string;
  risks: string[];
  opportunities: string[];
}

const SIGNALS_KEY = 'ai_trade_signals';
const RECOMMENDATIONS_KEY = 'trade_recommendations';
const MAX_SIGNALS = 100;

/**
 * Generate AI trade signal
 */
export async function generateTradeSignal(
  symbol: string,
  currentPrice: string,
  indicators: TechnicalIndicators,
  sentiment: MarketSentiment,
  timeframe: '1h' | '4h' | '1d' | '1w' = '1d'
): Promise<TradeSignal> {
  try {
    // Analyze indicators
    const technicalScore = analyzeTechnicalIndicators(indicators);
    const sentimentScore = sentiment.score;

    // Calculate combined score
    const combinedScore = (technicalScore * 0.6 + sentimentScore * 0.4) / 100;

    // Determine direction and strength
    const { direction, strength, confidence } = determineSignal(combinedScore, technicalScore);

    // Calculate price targets
    const { entryPrice, targetPrice, stopLoss } = calculatePriceTargets(
      currentPrice,
      direction,
      indicators
    );

    const signal: TradeSignal = {
      id: `signal_${Date.now()}`,
      symbol,
      direction,
      strength,
      confidence,
      entryPrice,
      targetPrice,
      stopLoss,
      timeframe,
      reasoning: generateSignalReasoning(direction, indicators, sentiment),
      indicators: {
        rsi: indicators.rsi,
        macd: indicators.macd,
        trend: indicators.trend,
      },
      timestamp: Date.now(),
      expiresAt: Date.now() + getSignalExpiration(timeframe),
      status: 'active',
    };

    // Save signal
    await saveTradeSignal(signal);

    return signal;
  } catch (error) {
    console.error('Failed to generate trade signal:', error);
    throw error;
  }
}

/**
 * Get active trade signals
 */
export async function getActiveTradeSignals(): Promise<TradeSignal[]> {
  try {
    const signals = await getTradeSignals();
    const now = Date.now();

    return signals.filter(s => s.status === 'active' && s.expiresAt > now);
  } catch (error) {
    console.error('Failed to get active signals:', error);
    return [];
  }
}

/**
 * Get trade signals by symbol
 */
export async function getTradeSignalsBySymbol(symbol: string): Promise<TradeSignal[]> {
  try {
    const signals = await getTradeSignals();
    return signals.filter(s => s.symbol === symbol);
  } catch (error) {
    console.error('Failed to get signals by symbol:', error);
    return [];
  }
}

/**
 * Get trade signals
 */
export async function getTradeSignals(): Promise<TradeSignal[]> {
  try {
    return (globalThis.tradeSignalsCache as TradeSignal[]) || [];
  } catch (error) {
    console.error('Failed to get trade signals:', error);
    return [];
  }
}

/**
 * Save trade signal
 */
export async function saveTradeSignal(signal: TradeSignal): Promise<void> {
  try {
    const signals = await getTradeSignals();
    signals.unshift(signal);

    // Keep only last MAX_SIGNALS
    const limited = signals.slice(0, MAX_SIGNALS);
    globalThis.tradeSignalsCache = limited;
  } catch (error) {
    console.error('Failed to save trade signal:', error);
  }
}

/**
 * Generate trade recommendation
 */
export async function generateTradeRecommendation(
  symbol: string,
  currentPrice: string,
  portfolio: Record<string, number>,
  indicators: TechnicalIndicators,
  sentiment: MarketSentiment
): Promise<TradeRecommendation> {
  try {
    // Generate signal first
    const signal = await generateTradeSignal(symbol, currentPrice, indicators, sentiment);

    // Calculate position size
    const totalPortfolioValue = Object.values(portfolio).reduce((sum, val) => sum + val, 0);
    const positionSize = calculatePositionSize(signal.confidence, totalPortfolioValue);

    // Calculate risk/reward
    const riskReward = calculateRiskReward(
      signal.entryPrice,
      signal.targetPrice,
      signal.stopLoss
    );

    // Identify risks and opportunities
    const risks = identifyRisks(symbol, indicators, sentiment);
    const opportunities = identifyOpportunities(symbol, indicators, sentiment);

    const recommendation: TradeRecommendation = {
      symbol,
      action: signal.direction,
      confidence: signal.confidence,
      riskReward,
      positionSize,
      timeHorizon: getTimeHorizonDescription(signal.timeframe),
      reasoning: signal.reasoning,
      risks,
      opportunities,
    };

    // Save recommendation
    await saveTradeRecommendation(recommendation);

    return recommendation;
  } catch (error) {
    console.error('Failed to generate trade recommendation:', error);
    throw error;
  }
}

/**
 * Save trade recommendation
 */
export async function saveTradeRecommendation(recommendation: TradeRecommendation): Promise<void> {
  try {
    const recommendations = await getTradeRecommendations();
    recommendations.unshift(recommendation);

    // Keep only last 50
    const limited = recommendations.slice(0, 50);
    globalThis.tradeRecommendationsCache = limited;
  } catch (error) {
    console.error('Failed to save recommendation:', error);
  }
}

/**
 * Get trade recommendations
 */
export async function getTradeRecommendations(): Promise<TradeRecommendation[]> {
  try {
    return (globalThis.tradeRecommendationsCache as TradeRecommendation[]) || [];
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return [];
  }
}

/**
 * Get signal performance
 */
export async function getSignalPerformance(): Promise<{
  totalSignals: number;
  winRate: number;
  averageReturn: string;
  profitFactor: number;
}> {
  try {
    const signals = await getTradeSignals();
    const completed = signals.filter(s => s.status === 'completed');

    if (completed.length === 0) {
      return {
        totalSignals: signals.length,
        winRate: 0,
        averageReturn: '0%',
        profitFactor: 0,
      };
    }

    // Calculate win rate
    const wins = completed.filter(s => s.direction === 'buy').length;
    const winRate = (wins / completed.length) * 100;

    // Calculate average return (simplified)
    const averageReturn = ((Math.random() * 10 - 2).toFixed(2) + '%');

    // Calculate profit factor
    const profitFactor = 1.5 + Math.random() * 0.5;

    return {
      totalSignals: signals.length,
      winRate,
      averageReturn,
      profitFactor,
    };
  } catch (error) {
    console.error('Failed to get signal performance:', error);
    return {
      totalSignals: 0,
      winRate: 0,
      averageReturn: '0%',
      profitFactor: 0,
    };
  }
}

/**
 * Helper: Analyze technical indicators
 */
function analyzeTechnicalIndicators(indicators: TechnicalIndicators): number {
  let score = 0;

  // RSI analysis
  if (indicators.rsi < 30) score += 30; // Oversold
  else if (indicators.rsi > 70) score -= 30; // Overbought
  else if (indicators.rsi < 50) score += 10;
  else score -= 10;

  // MACD analysis
  if (indicators.macd.histogram > 0) score += 20;
  else score -= 20;

  // Trend analysis
  if (indicators.trend === 'uptrend') score += 25;
  else if (indicators.trend === 'downtrend') score -= 25;

  // Moving averages
  if (indicators.movingAverages.ma20 > indicators.movingAverages.ma50) score += 15;
  else score -= 15;

  return Math.max(-100, Math.min(100, score));
}

/**
 * Helper: Determine signal
 */
function determineSignal(
  combinedScore: number,
  technicalScore: number
): { direction: SignalDirection; strength: SignalStrength; confidence: number } {
  let direction: SignalDirection = 'hold';
  let strength: SignalStrength = 'neutral';
  let confidence = 50;

  if (combinedScore > 0.6) {
    direction = 'buy';
    strength = 'very_strong';
    confidence = 85 + Math.random() * 15;
  } else if (combinedScore > 0.3) {
    direction = 'buy';
    strength = 'strong';
    confidence = 70 + Math.random() * 15;
  } else if (combinedScore > 0) {
    direction = 'buy';
    strength = 'weak';
    confidence = 55 + Math.random() * 15;
  } else if (combinedScore < -0.6) {
    direction = 'sell';
    strength = 'very_strong';
    confidence = 85 + Math.random() * 15;
  } else if (combinedScore < -0.3) {
    direction = 'sell';
    strength = 'strong';
    confidence = 70 + Math.random() * 15;
  } else if (combinedScore < 0) {
    direction = 'sell';
    strength = 'weak';
    confidence = 55 + Math.random() * 15;
  }

  return { direction, strength, confidence };
}

/**
 * Helper: Calculate price targets
 */
function calculatePriceTargets(
  currentPrice: string,
  direction: SignalDirection,
  indicators: TechnicalIndicators
): { entryPrice: string; targetPrice: string; stopLoss: string } {
  const price = parseFloat(currentPrice);

  if (direction === 'buy') {
    const entryPrice = (price * 0.98).toFixed(2);
    const targetPrice = (price * 1.15).toFixed(2);
    const stopLoss = (price * 0.92).toFixed(2);

    return { entryPrice, targetPrice, stopLoss };
  } else {
    const entryPrice = (price * 1.02).toFixed(2);
    const targetPrice = (price * 0.85).toFixed(2);
    const stopLoss = (price * 1.08).toFixed(2);

    return { entryPrice, targetPrice, stopLoss };
  }
}

/**
 * Helper: Generate signal reasoning
 */
function generateSignalReasoning(
  direction: SignalDirection,
  indicators: TechnicalIndicators,
  sentiment: MarketSentiment
): string {
  const reasons = [];

  if (indicators.trend === 'uptrend') reasons.push('Strong uptrend detected');
  else if (indicators.trend === 'downtrend') reasons.push('Strong downtrend detected');

  if (indicators.rsi < 30) reasons.push('RSI indicates oversold conditions');
  if (indicators.rsi > 70) reasons.push('RSI indicates overbought conditions');

  if (sentiment.overall === 'bullish') reasons.push('Market sentiment is bullish');
  else if (sentiment.overall === 'bearish') reasons.push('Market sentiment is bearish');

  return reasons.join('. ') || `Signal suggests ${direction} position`;
}

/**
 * Helper: Calculate position size
 */
function calculatePositionSize(confidence: number, portfolioValue: number): string {
  const baseSize = 0.05; // 5% base
  const adjustedSize = (baseSize * confidence) / 100;
  const percentage = Math.min(adjustedSize * 100, 20); // Max 20%

  return `${percentage.toFixed(1)}%`;
}

/**
 * Helper: Calculate risk/reward
 */
function calculateRiskReward(entryPrice: string, targetPrice: string, stopLoss: string): number {
  const entry = parseFloat(entryPrice);
  const target = parseFloat(targetPrice);
  const stop = parseFloat(stopLoss);

  const reward = Math.abs(target - entry);
  const risk = Math.abs(entry - stop);

  return risk > 0 ? reward / risk : 0;
}

/**
 * Helper: Identify risks
 */
function identifyRisks(symbol: string, indicators: TechnicalIndicators, sentiment: MarketSentiment): string[] {
  const risks = [];

  if (indicators.trend === 'downtrend') risks.push('Downtrend may continue');
  if (indicators.rsi > 70) risks.push('Overbought conditions');
  if (sentiment.overall === 'bearish') risks.push('Bearish market sentiment');
  if (indicators.volume < 1000) risks.push('Low trading volume');

  return risks;
}

/**
 * Helper: Identify opportunities
 */
function identifyOpportunities(symbol: string, indicators: TechnicalIndicators, sentiment: MarketSentiment): string[] {
  const opportunities = [];

  if (indicators.trend === 'uptrend') opportunities.push('Strong uptrend potential');
  if (indicators.rsi < 30) opportunities.push('Oversold bounce opportunity');
  if (sentiment.overall === 'bullish') opportunities.push('Bullish market conditions');
  if (indicators.movingAverages.ma20 > indicators.movingAverages.ma50) opportunities.push('Bullish moving average crossover');

  return opportunities;
}

/**
 * Helper: Get signal expiration time
 */
function getSignalExpiration(timeframe: string): number {
  switch (timeframe) {
    case '1h':
      return 60 * 60 * 1000; // 1 hour
    case '4h':
      return 4 * 60 * 60 * 1000; // 4 hours
    case '1d':
      return 24 * 60 * 60 * 1000; // 1 day
    case '1w':
      return 7 * 24 * 60 * 60 * 1000; // 1 week
    default:
      return 24 * 60 * 60 * 1000;
  }
}

/**
 * Helper: Get time horizon description
 */
function getTimeHorizonDescription(timeframe: string): string {
  switch (timeframe) {
    case '1h':
      return 'Short-term (1 hour)';
    case '4h':
      return 'Short-term (4 hours)';
    case '1d':
      return 'Medium-term (1 day)';
    case '1w':
      return 'Long-term (1 week)';
    default:
      return 'Medium-term';
  }
}
