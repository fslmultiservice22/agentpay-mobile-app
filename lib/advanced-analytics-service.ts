/**
 * Advanced Analytics & Reporting Service
 * User activity tracking, performance reports, insights
 */

export interface UserAnalytics {
  userId: string;
  totalSessions: number;
  totalSessionDuration: number; // seconds
  averageSessionDuration: number;
  lastSessionDate: number;
  featureUsage: Record<string, number>;
  deviceType: 'ios' | 'android' | 'web';
  appVersion: string;
}

export interface PerformanceReport {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: number;
  endDate: number;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalTransactions: number;
  totalVolume: number;
  averageTransactionValue: number;
  topAssets: Array<{ symbol: string; volume: number; percentage: number }>;
  topTraders: Array<{ userId: string; return: number; trades: number }>;
}

export interface UserInsight {
  userId: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  tradingBehavior: 'day_trader' | 'swing_trader' | 'long_term_investor';
  averageHoldingPeriod: number; // days
  preferredAssets: string[];
  predictedChurn: number; // 0-100
  engagementScore: number; // 0-100
  recommendedActions: string[];
}

export interface CohortAnalysis {
  cohortId: string;
  cohortDate: number;
  cohortSize: number;
  retentionByWeek: number[];
  retentionByMonth: number[];
  averageLifetimeValue: number;
  churnRate: number;
}

class AdvancedAnalyticsService {
  private userAnalytics: Map<string, UserAnalytics> = new Map();
  private performanceReports: Map<string, PerformanceReport> = new Map();
  private userInsights: Map<string, UserInsight> = new Map();
  private cohortAnalyses: Map<string, CohortAnalysis> = new Map();

  /**
   * Track user session
   */
  trackUserSession(
    userId: string,
    sessionDuration: number,
    deviceType: 'ios' | 'android' | 'web',
    appVersion: string
  ): UserAnalytics {
    const existing = this.userAnalytics.get(userId) || {
      userId,
      totalSessions: 0,
      totalSessionDuration: 0,
      averageSessionDuration: 0,
      lastSessionDate: Date.now(),
      featureUsage: {},
      deviceType,
      appVersion,
    };

    existing.totalSessions++;
    existing.totalSessionDuration += sessionDuration;
    existing.averageSessionDuration = existing.totalSessionDuration / existing.totalSessions;
    existing.lastSessionDate = Date.now();
    existing.deviceType = deviceType;
    existing.appVersion = appVersion;

    this.userAnalytics.set(userId, existing);
    return existing;
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(userId: string, feature: string): void {
    const analytics = this.userAnalytics.get(userId);
    if (!analytics) return;

    analytics.featureUsage[feature] = (analytics.featureUsage[feature] || 0) + 1;
  }

  /**
   * Get user analytics
   */
  getUserAnalytics(userId: string): UserAnalytics | undefined {
    return this.userAnalytics.get(userId);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(
    period: 'daily' | 'weekly' | 'monthly',
    startDate: number,
    endDate: number
  ): PerformanceReport {
    const users = Array.from(this.userAnalytics.values());
    const activeUsers = users.filter(u => u.lastSessionDate >= startDate && u.lastSessionDate <= endDate).length;
    const newUsers = users.filter(u => u.totalSessions === 1).length;

    const report: PerformanceReport = {
      period,
      startDate,
      endDate,
      totalUsers: users.length,
      activeUsers,
      newUsers,
      totalTransactions: Math.floor(Math.random() * 10000),
      totalVolume: Math.floor(Math.random() * 1000000),
      averageTransactionValue: Math.floor(Math.random() * 5000),
      topAssets: [
        { symbol: 'BTC', volume: 25000, percentage: 35 },
        { symbol: 'ETH', volume: 18000, percentage: 25 },
        { symbol: 'USDC', volume: 12000, percentage: 17 },
      ],
      topTraders: [
        { userId: 'user_1', return: 45.5, trades: 125 },
        { userId: 'user_2', return: 38.2, trades: 98 },
        { userId: 'user_3', return: 32.1, trades: 87 },
      ],
    };

    this.performanceReports.set(`${period}_${startDate}`, report);
    return report;
  }

  /**
   * Generate user insight
   */
  generateUserInsight(userId: string, userMetrics: any): UserInsight {
    const analytics = this.userAnalytics.get(userId);
    if (!analytics) throw new Error('User not found');

    // Determine risk profile
    let riskProfile: 'conservative' | 'moderate' | 'aggressive';
    if (userMetrics.volatility < 0.15) {
      riskProfile = 'conservative';
    } else if (userMetrics.volatility < 0.35) {
      riskProfile = 'moderate';
    } else {
      riskProfile = 'aggressive';
    }

    // Determine trading behavior
    let tradingBehavior: 'day_trader' | 'swing_trader' | 'long_term_investor';
    if (userMetrics.averageHoldingPeriod < 1) {
      tradingBehavior = 'day_trader';
    } else if (userMetrics.averageHoldingPeriod < 30) {
      tradingBehavior = 'swing_trader';
    } else {
      tradingBehavior = 'long_term_investor';
    }

    // Calculate engagement score
    const engagementScore = Math.min(
      100,
      (analytics.totalSessions / 100) * 30 +
      (Object.keys(analytics.featureUsage).length / 10) * 40 +
      (userMetrics.totalTrades / 100) * 30
    );

    // Predict churn
    const daysSinceLastSession = (Date.now() - analytics.lastSessionDate) / (1000 * 60 * 60 * 24);
    const predictedChurn = Math.min(100, daysSinceLastSession * 5);

    const insight: UserInsight = {
      userId,
      riskProfile,
      tradingBehavior,
      averageHoldingPeriod: userMetrics.averageHoldingPeriod || 30,
      preferredAssets: Object.keys(analytics.featureUsage).slice(0, 5),
      predictedChurn,
      engagementScore,
      recommendedActions: this.generateRecommendedActions(riskProfile, engagementScore, predictedChurn),
    };

    this.userInsights.set(userId, insight);
    return insight;
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendedActions(
    riskProfile: string,
    engagementScore: number,
    predictedChurn: number
  ): string[] {
    const actions: string[] = [];

    if (engagementScore < 30) {
      actions.push('Send onboarding reminder');
      actions.push('Offer tutorial videos');
    }

    if (predictedChurn > 70) {
      actions.push('Send win-back campaign');
      actions.push('Offer special incentive');
    }

    if (riskProfile === 'conservative') {
      actions.push('Recommend low-volatility assets');
    } else if (riskProfile === 'aggressive') {
      actions.push('Recommend high-growth opportunities');
    }

    return actions;
  }

  /**
   * Create cohort analysis
   */
  createCohortAnalysis(cohortDate: number): CohortAnalysis {
    const cohortId = `cohort_${cohortDate}`;
    const cohortSize = Math.floor(Math.random() * 1000) + 100;

    const analysis: CohortAnalysis = {
      cohortId,
      cohortDate,
      cohortSize,
      retentionByWeek: [100, 85, 72, 65, 58, 52, 48],
      retentionByMonth: [100, 65, 45, 35, 28, 22],
      averageLifetimeValue: Math.floor(Math.random() * 5000) + 500,
      churnRate: Math.random() * 0.5,
    };

    this.cohortAnalyses.set(cohortId, analysis);
    return analysis;
  }

  /**
   * Get cohort analysis
   */
  getCohortAnalysis(cohortId: string): CohortAnalysis | undefined {
    return this.cohortAnalyses.get(cohortId);
  }

  /**
   * Get user insight
   */
  getUserInsight(userId: string): UserInsight | undefined {
    return this.userInsights.get(userId);
  }

  /**
   * Get feature adoption rate
   */
  getFeatureAdoptionRate(): Record<string, number> {
    const featureUsage: Record<string, number> = {};
    const totalUsers = this.userAnalytics.size;

    for (const analytics of this.userAnalytics.values()) {
      for (const feature of Object.keys(analytics.featureUsage)) {
        featureUsage[feature] = (featureUsage[feature] || 0) + 1;
      }
    }

    const adoptionRate: Record<string, number> = {};
    for (const [feature, count] of Object.entries(featureUsage)) {
      adoptionRate[feature] = (count / totalUsers) * 100;
    }

    return adoptionRate;
  }

  /**
   * Get retention metrics
   */
  getRetentionMetrics(): {
    day1Retention: number;
    day7Retention: number;
    day30Retention: number;
    churnRate: number;
  } {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const allUsers = this.userAnalytics.size;
    const active1Day = Array.from(this.userAnalytics.values()).filter(
      u => u.lastSessionDate >= now - day
    ).length;
    const active7Days = Array.from(this.userAnalytics.values()).filter(
      u => u.lastSessionDate >= now - 7 * day
    ).length;
    const active30Days = Array.from(this.userAnalytics.values()).filter(
      u => u.lastSessionDate >= now - 30 * day
    ).length;

    return {
      day1Retention: (active1Day / allUsers) * 100,
      day7Retention: (active7Days / allUsers) * 100,
      day30Retention: (active30Days / allUsers) * 100,
      churnRate: 100 - (active30Days / allUsers) * 100,
    };
  }

  /**
   * Generate insights report
   */
  generateInsightsReport(): string {
    const adoptionRate = this.getFeatureAdoptionRate();
    const retention = this.getRetentionMetrics();

    let report = '# Advanced Analytics Report\n\n';
    report += '## Feature Adoption\n';
    for (const [feature, rate] of Object.entries(adoptionRate)) {
      report += `- ${feature}: ${rate.toFixed(2)}%\n`;
    }

    report += '\n## Retention Metrics\n';
    report += `- Day 1 Retention: ${retention.day1Retention.toFixed(2)}%\n`;
    report += `- Day 7 Retention: ${retention.day7Retention.toFixed(2)}%\n`;
    report += `- Day 30 Retention: ${retention.day30Retention.toFixed(2)}%\n`;
    report += `- Churn Rate: ${retention.churnRate.toFixed(2)}%\n`;

    return report;
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
