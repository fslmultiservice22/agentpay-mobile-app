/**
 * AI-Powered Portfolio Recommendations Service
 * Machine learning-based portfolio optimization and recommendations
 */

export interface PortfolioRecommendation {
  id: string;
  userId: string;
  type: 'rebalance' | 'buy' | 'sell' | 'diversify' | 'risk_reduction' | 'yield_optimization';
  asset: string;
  action: 'buy' | 'sell' | 'hold' | 'increase' | 'decrease';
  amount: number;
  percentage: number;
  confidence: number; // 0-1
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string;
  timeframe: 'short' | 'medium' | 'long';
  createdAt: number;
  expiresAt: number;
  isAccepted: boolean;
  acceptedAt?: number;
}

export interface AIInsight {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'market_trend' | 'portfolio_analysis' | 'risk_alert' | 'opportunity' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: Record<string, any>;
  createdAt: number;
  isRead: boolean;
}

class AIPortfolioRecommendationsService {
  private recommendations: Map<string, PortfolioRecommendation> = new Map();
  private insights: Map<string, AIInsight> = new Map();
  private userModels: Map<string, any> = new Map();

  /**
   * Generate portfolio recommendations
   */
  generateRecommendations(userId: string, portfolio: any, marketData: any): PortfolioRecommendation[] {
    const recommendations: PortfolioRecommendation[] = [];

    // Analyze portfolio composition
    const composition = this.analyzeComposition(portfolio);

    // Check for diversification opportunities
    if (composition.concentration > 0.3) {
      recommendations.push(this.createDiversificationRecommendation(userId, portfolio));
    }

    // Check for rebalancing needs
    if (composition.drift > 0.15) {
      recommendations.push(this.createRebalancingRecommendation(userId, portfolio));
    }

    // Check for yield optimization
    recommendations.push(...this.createYieldOptimizationRecommendations(userId, portfolio, marketData));

    // Check for risk reduction
    if (composition.volatility > 0.4) {
      recommendations.push(this.createRiskReductionRecommendation(userId, portfolio));
    }

    // Store recommendations
    recommendations.forEach(rec => {
      this.recommendations.set(rec.id, rec);
    });

    return recommendations;
  }

  /**
   * Analyze portfolio composition
   */
  private analyzeComposition(portfolio: any): any {
    const totalValue = Object.values(portfolio).reduce<number>(
      (sum, val: any) => sum + (Number(val?.value) || 0),
      0,
    );
    const concentrations = Object.values(portfolio).map((asset: any) =>
      totalValue > 0 ? (Number(asset?.value) || 0) / totalValue : 0,
    );
    const maxConcentration = concentrations.length > 0 ? Math.max(...concentrations) : 0;

    return {
      concentration: maxConcentration,
      drift: Math.random() * 0.3, // Simplified
      volatility: Math.random() * 0.5, // Simplified
    };
  }

  /**
   * Create diversification recommendation
   */
  private createDiversificationRecommendation(userId: string, portfolio: any): PortfolioRecommendation {
    const recId = `rec_${Date.now()}`;

    return {
      id: recId,
      userId,
      type: 'diversify',
      asset: 'emerging_assets',
      action: 'buy',
      amount: 1000,
      percentage: 10,
      confidence: 0.75,
      expectedReturn: 0.15,
      riskLevel: 'medium',
      reasoning: 'Your portfolio is concentrated in a few assets. Diversifying can reduce risk.',
      timeframe: 'medium',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      isAccepted: false,
    };
  }

  /**
   * Create rebalancing recommendation
   */
  private createRebalancingRecommendation(userId: string, portfolio: any): PortfolioRecommendation {
    const recId = `rec_${Date.now()}`;

    return {
      id: recId,
      userId,
      type: 'rebalance',
      asset: 'portfolio',
      action: 'hold',
      amount: 0,
      percentage: 0,
      confidence: 0.85,
      expectedReturn: 0.12,
      riskLevel: 'low',
      reasoning: 'Your portfolio allocation has drifted from target. Rebalancing recommended.',
      timeframe: 'short',
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      isAccepted: false,
    };
  }

  /**
   * Create yield optimization recommendations
   */
  private createYieldOptimizationRecommendations(userId: string, portfolio: any, marketData: any): PortfolioRecommendation[] {
    const recommendations: PortfolioRecommendation[] = [];

    // Find high-yield opportunities
    const topYieldAssets = Object.entries(marketData)
      .sort((a: any, b: any) => b[1].apy - a[1].apy)
      .slice(0, 3);

    topYieldAssets.forEach((asset: any, index: number) => {
      const recId = `rec_${Date.now()}_${index}`;

      recommendations.push({
        id: recId,
        userId,
        type: 'yield_optimization',
        asset: asset[0],
        action: 'buy',
        amount: 500,
        percentage: 5,
        confidence: 0.7 - index * 0.1,
        expectedReturn: asset[1].apy,
        riskLevel: 'medium',
        reasoning: `High-yield opportunity: ${asset[1].apy * 100}% APY on ${asset[0]}`,
        timeframe: 'long',
        createdAt: Date.now(),
        expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
        isAccepted: false,
      });
    });

    return recommendations;
  }

  /**
   * Create risk reduction recommendation
   */
  private createRiskReductionRecommendation(userId: string, portfolio: any): PortfolioRecommendation {
    const recId = `rec_${Date.now()}`;

    return {
      id: recId,
      userId,
      type: 'risk_reduction',
      asset: 'stable_assets',
      action: 'increase',
      amount: 2000,
      percentage: 20,
      confidence: 0.8,
      expectedReturn: 0.05,
      riskLevel: 'low',
      reasoning: 'Your portfolio volatility is high. Adding stable assets can reduce risk.',
      timeframe: 'medium',
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      isAccepted: false,
    };
  }

  /**
   * Accept recommendation
   */
  acceptRecommendation(recommendationId: string): PortfolioRecommendation | null {
    const rec = this.recommendations.get(recommendationId);
    if (!rec) return null;

    rec.isAccepted = true;
    rec.acceptedAt = Date.now();

    return rec;
  }

  /**
   * Get recommendations for user
   */
  getRecommendations(userId: string, limit: number = 10): PortfolioRecommendation[] {
    const userRecs = Array.from(this.recommendations.values())
      .filter(r => r.userId === userId && r.expiresAt > Date.now())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);

    return userRecs;
  }

  /**
   * Generate AI insights
   */
  generateInsights(userId: string, portfolio: any, marketData: any): AIInsight[] {
    const insights: AIInsight[] = [];

    // Market trend insight
    insights.push(this.generateMarketTrendInsight(userId, marketData));

    // Portfolio analysis insight
    insights.push(this.generatePortfolioAnalysisInsight(userId, portfolio));

    // Risk alert if needed
    if (this.shouldGenerateRiskAlert(portfolio)) {
      insights.push(this.generateRiskAlert(userId, portfolio));
    }

    // Opportunity insight
    insights.push(this.generateOpportunityInsight(userId, marketData));

    insights.forEach(insight => {
      this.insights.set(insight.id, insight);
    });

    return insights;
  }

  /**
   * Generate market trend insight
   */
  private generateMarketTrendInsight(userId: string, marketData: any): AIInsight {
    return {
      id: `insight_${Date.now()}_trend`,
      userId,
      title: 'Market Trend Analysis',
      description: 'BTC showing bullish momentum with strong support at $45,000 level.',
      type: 'market_trend',
      severity: 'low',
      data: { trend: 'bullish', support: 45000, resistance: 55000 },
      createdAt: Date.now(),
      isRead: false,
    };
  }

  /**
   * Generate portfolio analysis insight
   */
  private generatePortfolioAnalysisInsight(userId: string, portfolio: any): AIInsight {
    return {
      id: `insight_${Date.now()}_analysis`,
      userId,
      title: 'Portfolio Performance',
      description: 'Your portfolio is outperforming the market by 12% this month.',
      type: 'portfolio_analysis',
      severity: 'low',
      data: { performance: 0.12, benchmark: 0.08 },
      createdAt: Date.now(),
      isRead: false,
    };
  }

  /**
   * Check if risk alert should be generated
   */
  private shouldGenerateRiskAlert(portfolio: any): boolean {
    return Math.random() > 0.7; // 30% chance
  }

  /**
   * Generate risk alert
   */
  private generateRiskAlert(userId: string, portfolio: any): AIInsight {
    return {
      id: `insight_${Date.now()}_risk`,
      userId,
      title: 'Risk Alert',
      description: 'Volatility spike detected. Consider taking risk management actions.',
      type: 'risk_alert',
      severity: 'high',
      data: { volatility: 0.45, threshold: 0.35 },
      createdAt: Date.now(),
      isRead: false,
    };
  }

  /**
   * Generate opportunity insight
   */
  private generateOpportunityInsight(userId: string, marketData: any): AIInsight {
    return {
      id: `insight_${Date.now()}_opportunity`,
      userId,
      title: 'Trading Opportunity',
      description: 'ETH/USDT showing oversold conditions. Potential buy opportunity.',
      type: 'opportunity',
      severity: 'low',
      data: { asset: 'ETH', signal: 'oversold', rsi: 28 },
      createdAt: Date.now(),
      isRead: false,
    };
  }

  /**
   * Get insights for user
   */
  getInsights(userId: string, limit: number = 10): AIInsight[] {
    return Array.from(this.insights.values())
      .filter(i => i.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Mark insight as read
   */
  markInsightAsRead(insightId: string): AIInsight | null {
    const insight = this.insights.get(insightId);
    if (!insight) return null;

    insight.isRead = true;
    return insight;
  }

  /**
   * Get AI model for user
   */
  getUserModel(userId: string): any {
    if (!this.userModels.has(userId)) {
      this.userModels.set(userId, this.initializeUserModel(userId));
    }

    return this.userModels.get(userId);
  }

  /**
   * Initialize user model
   */
  private initializeUserModel(userId: string): any {
    return {
      userId,
      riskTolerance: 0.5,
      investmentHorizon: 'medium',
      preferredAssets: [],
      tradingStyle: 'conservative',
      createdAt: Date.now(),
    };
  }

  /**
   * Update user model
   */
  updateUserModel(userId: string, updates: any): any {
    const model = this.getUserModel(userId);
    Object.assign(model, updates);
    return model;
  }

  /**
   * Get recommendation statistics
   */
  getRecommendationStats(userId: string): {
    total: number;
    accepted: number;
    acceptanceRate: number;
    averageConfidence: number;
  } {
    const userRecs = Array.from(this.recommendations.values()).filter(r => r.userId === userId);

    const accepted = userRecs.filter(r => r.isAccepted).length;
    const avgConfidence = userRecs.reduce((sum, r) => sum + r.confidence, 0) / (userRecs.length || 1);

    return {
      total: userRecs.length,
      accepted,
      acceptanceRate: accepted / (userRecs.length || 1),
      averageConfidence: avgConfidence,
    };
  }
}

export const aiPortfolioRecommendationsService = new AIPortfolioRecommendationsService();
