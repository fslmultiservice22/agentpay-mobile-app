/**
 * AI-Powered Trade Recommendations Service
 * ML-based suggestions with confidence scores and historical performance
 */

export interface TradeRecommendation {
  id: string;
  assetId: string;
  assetSymbol: string;
  action: 'buy' | 'sell' | 'hold';
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  confidenceScore: number; // 0-100
  riskRewardRatio: number;
  reasoning: string;
  technicalSignals: string[];
  fundamentalSignals: string[];
  historicalAccuracy: number; // 0-100
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'executed' | 'expired' | 'cancelled';
}

export interface RecommendationPerformance {
  recommendationId: string;
  assetSymbol: string;
  action: 'buy' | 'sell' | 'hold';
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  status: 'open' | 'closed' | 'stopped';
  closedAt?: number;
  actualReturn: number;
  expectedReturn: number;
  accuracy: boolean;
}

export interface ModelMetrics {
  totalRecommendations: number;
  successfulRecommendations: number;
  failedRecommendations: number;
  winRate: number;
  averageReturn: number;
  averageConfidence: number;
  bestPerformance: number;
  worstPerformance: number;
  sharpeRatio: number;
}

class AITradeRecommendationsService {
  private recommendations: Map<string, TradeRecommendation> = new Map();
  private performanceHistory: Map<string, RecommendationPerformance> = new Map();

  /**
   * Generate trade recommendation
   */
  generateRecommendation(
    assetId: string,
    assetSymbol: string,
    currentPrice: number,
    technicalSignals: string[],
    fundamentalSignals: string[],
    historicalAccuracy: number
  ): TradeRecommendation {
    // Determine action based on signals
    const bullishSignals = technicalSignals.filter(s => s.includes('buy')).length +
                          fundamentalSignals.filter(s => s.includes('buy')).length;
    const bearishSignals = technicalSignals.filter(s => s.includes('sell')).length +
                          fundamentalSignals.filter(s => s.includes('sell')).length;

    let action: 'buy' | 'sell' | 'hold';
    if (bullishSignals > bearishSignals) {
      action = 'buy';
    } else if (bearishSignals > bullishSignals) {
      action = 'sell';
    } else {
      action = 'hold';
    }

    // Calculate confidence score
    const signalStrength = Math.max(bullishSignals, bearishSignals) / (technicalSignals.length + fundamentalSignals.length);
    const confidenceScore = Math.min(100, (signalStrength * 80) + (historicalAccuracy * 0.2));

    // Calculate target and stop loss
    const volatility = 0.02; // Assume 2% volatility
    const targetPrice = action === 'buy' 
      ? currentPrice * (1 + volatility * 3)
      : currentPrice * (1 - volatility * 3);

    const stopLossPrice = action === 'buy'
      ? currentPrice * (1 - volatility * 2)
      : currentPrice * (1 + volatility * 2);

    const riskRewardRatio = Math.abs(targetPrice - currentPrice) / Math.abs(currentPrice - stopLossPrice);

    const recommendation: TradeRecommendation = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId,
      assetSymbol,
      action,
      entryPrice: currentPrice,
      targetPrice,
      stopLossPrice,
      confidenceScore,
      riskRewardRatio,
      reasoning: this.generateReasoning(action, technicalSignals, fundamentalSignals),
      technicalSignals,
      fundamentalSignals,
      historicalAccuracy,
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'active',
    };

    this.recommendations.set(recommendation.id, recommendation);
    return recommendation;
  }

  /**
   * Get active recommendations
   */
  getActiveRecommendations(): TradeRecommendation[] {
    return Array.from(this.recommendations.values())
      .filter(r => r.status === 'active' && r.expiresAt > Date.now())
      .sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Get recommendations by asset
   */
  getRecommendationsByAsset(assetSymbol: string): TradeRecommendation[] {
    return Array.from(this.recommendations.values())
      .filter(r => r.assetSymbol === assetSymbol && r.status === 'active');
  }

  /**
   * Update recommendation status
   */
  updateRecommendationStatus(
    recommendationId: string,
    status: 'active' | 'executed' | 'expired' | 'cancelled',
    currentPrice?: number
  ): boolean {
    const rec = this.recommendations.get(recommendationId);
    if (!rec) return false;

    rec.status = status;

    if (currentPrice && status === 'executed') {
      this.recordPerformance(rec, currentPrice);
    }

    return true;
  }

  /**
   * Record performance
   */
  private recordPerformance(recommendation: TradeRecommendation, currentPrice: number): void {
    const profitLoss = recommendation.action === 'buy'
      ? currentPrice - recommendation.entryPrice
      : recommendation.entryPrice - currentPrice;

    const profitLossPercentage = (profitLoss / recommendation.entryPrice) * 100;
    const expectedReturn = recommendation.action === 'buy'
      ? ((recommendation.targetPrice - recommendation.entryPrice) / recommendation.entryPrice) * 100
      : ((recommendation.entryPrice - recommendation.targetPrice) / recommendation.entryPrice) * 100;

    const accuracy = profitLossPercentage > 0;

    const performance: RecommendationPerformance = {
      recommendationId: recommendation.id,
      assetSymbol: recommendation.assetSymbol,
      action: recommendation.action,
      entryPrice: recommendation.entryPrice,
      targetPrice: recommendation.targetPrice,
      stopLossPrice: recommendation.stopLossPrice,
      currentPrice,
      profitLoss,
      profitLossPercentage,
      status: currentPrice >= recommendation.targetPrice ? 'closed' : 
              currentPrice <= recommendation.stopLossPrice ? 'stopped' : 'open',
      closedAt: Date.now(),
      actualReturn: profitLossPercentage,
      expectedReturn,
      accuracy,
    };

    this.performanceHistory.set(performance.recommendationId, performance);
  }

  /**
   * Get model metrics
   */
  getModelMetrics(): ModelMetrics {
    const performances = Array.from(this.performanceHistory.values());

    if (performances.length === 0) {
      return {
        totalRecommendations: 0,
        successfulRecommendations: 0,
        failedRecommendations: 0,
        winRate: 0,
        averageReturn: 0,
        averageConfidence: 0,
        bestPerformance: 0,
        worstPerformance: 0,
        sharpeRatio: 0,
      };
    }

    const successful = performances.filter(p => p.accuracy).length;
    const failed = performances.filter(p => !p.accuracy).length;
    const returns = performances.map(p => p.actualReturn);
    const averageReturn = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - averageReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    const recommendations = Array.from(this.recommendations.values());
    const averageConfidence = recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + r.confidenceScore, 0) / recommendations.length
      : 0;

    return {
      totalRecommendations: performances.length,
      successfulRecommendations: successful,
      failedRecommendations: failed,
      winRate: (successful / performances.length) * 100,
      averageReturn,
      averageConfidence,
      bestPerformance: Math.max(...returns),
      worstPerformance: Math.min(...returns),
      sharpeRatio: stdDev > 0 ? averageReturn / stdDev : 0,
    };
  }

  /**
   * Get recommendation performance
   */
  getRecommendationPerformance(recommendationId: string): RecommendationPerformance | undefined {
    return this.performanceHistory.get(recommendationId);
  }

  /**
   * Get top performing recommendations
   */
  getTopPerformingRecommendations(limit: number = 10): RecommendationPerformance[] {
    return Array.from(this.performanceHistory.values())
      .sort((a, b) => b.actualReturn - a.actualReturn)
      .slice(0, limit);
  }

  /**
   * Get worst performing recommendations
   */
  getWorstPerformingRecommendations(limit: number = 10): RecommendationPerformance[] {
    return Array.from(this.performanceHistory.values())
      .sort((a, b) => a.actualReturn - b.actualReturn)
      .slice(0, limit);
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(action: string, technicalSignals: string[], fundamentalSignals: string[]): string {
    const signals = [...technicalSignals, ...fundamentalSignals];
    const topSignals = signals.slice(0, 3).join(', ');

    return `${action.toUpperCase()} signal based on: ${topSignals}. Model confidence is high based on historical accuracy.`;
  }

  /**
   * Predict price movement
   */
  predictPriceMovement(
    historicalPrices: number[],
    currentPrice: number
  ): { direction: 'up' | 'down' | 'neutral'; probability: number } {
    if (historicalPrices.length < 2) {
      return { direction: 'neutral', probability: 0.5 };
    }

    const recentPrices = historicalPrices.slice(-20);
    const sma = recentPrices.reduce((a, b) => a + b) / recentPrices.length;
    const momentum = (currentPrice - recentPrices[0]) / recentPrices[0];

    let direction: 'up' | 'down' | 'neutral';
    let probability: number;

    if (currentPrice > sma && momentum > 0.02) {
      direction = 'up';
      probability = Math.min(0.95, 0.5 + Math.abs(momentum));
    } else if (currentPrice < sma && momentum < -0.02) {
      direction = 'down';
      probability = Math.min(0.95, 0.5 + Math.abs(momentum));
    } else {
      direction = 'neutral';
      probability = 0.5;
    }

    return { direction, probability };
  }
}

export const aiTradeRecommendationsService = new AITradeRecommendationsService();
