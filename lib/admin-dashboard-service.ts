/**
 * Admin Dashboard Service
 * User activity monitoring, referral payouts, AI recommendation accuracy
 */

export interface UserActivity {
  userId: string;
  username: string;
  lastLogin: number;
  totalTrades: number;
  totalTransactions: number;
  portfolioValue: number;
  referralCount: number;
  status: 'active' | 'inactive' | 'suspended';
}

export interface ReferralPayout {
  id: string;
  affiliateId: string;
  affiliateUsername: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'failed';
  createdAt: number;
  approvedAt?: number;
  paidAt?: number;
  failureReason?: string;
}

export interface RecommendationAccuracy {
  modelId: string;
  totalRecommendations: number;
  successfulRecommendations: number;
  failedRecommendations: number;
  winRate: number;
  averageReturn: number;
  bestReturn: number;
  worstReturn: number;
  lastUpdated: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPortfolioValue: number;
  totalTransactions: number;
  totalReferrals: number;
  pendingPayouts: number;
  totalPayoutsProcessed: number;
  systemHealth: number; // 0-100
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  targetType: 'user' | 'payout' | 'recommendation' | 'system';
  details: Record<string, any>;
  createdAt: number;
}

class AdminDashboardService {
  private userActivities: Map<string, UserActivity> = new Map();
  private referralPayouts: Map<string, ReferralPayout> = new Map();
  private recommendationAccuracies: Map<string, RecommendationAccuracy> = new Map();
  private adminLogs: Map<string, AdminLog> = new Map();

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics(): DashboardMetrics {
    const users = Array.from(this.userActivities.values());
    const activeUsers = users.filter(u => u.status === 'active').length;
    const totalPortfolioValue = users.reduce((sum, u) => sum + u.portfolioValue, 0);
    const totalTransactions = users.reduce((sum, u) => sum + u.totalTransactions, 0);
    const totalReferrals = users.reduce((sum, u) => sum + u.referralCount, 0);

    const payouts = Array.from(this.referralPayouts.values());
    const pendingPayouts = payouts.filter(p => p.status === 'pending').length;
    const totalPayoutsProcessed = payouts.filter(p => p.status === 'paid').length;

    return {
      totalUsers: users.length,
      activeUsers,
      totalPortfolioValue,
      totalTransactions,
      totalReferrals,
      pendingPayouts,
      totalPayoutsProcessed,
      systemHealth: 95, // Simulated
    };
  }

  /**
   * Get user activity
   */
  getUserActivity(userId: string): UserActivity | undefined {
    return this.userActivities.get(userId);
  }

  /**
   * Get all user activities
   */
  getAllUserActivities(status?: string): UserActivity[] {
    let activities = Array.from(this.userActivities.values());

    if (status) {
      activities = activities.filter(a => a.status === status);
    }

    return activities.sort((a, b) => b.lastLogin - a.lastLogin);
  }

  /**
   * Update user status
   */
  updateUserStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): boolean {
    const activity = this.userActivities.get(userId);
    if (!activity) return false;

    activity.status = status;
    this.logAdminAction('update_user_status', userId, 'user', { status });

    return true;
  }

  /**
   * Get referral payouts
   */
  getReferralPayouts(status?: string): ReferralPayout[] {
    let payouts = Array.from(this.referralPayouts.values());

    if (status) {
      payouts = payouts.filter(p => p.status === status);
    }

    return payouts.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Approve referral payout
   */
  approveReferralPayout(payoutId: string, adminId: string): boolean {
    const payout = this.referralPayouts.get(payoutId);
    if (!payout || payout.status !== 'pending') return false;

    payout.status = 'approved';
    payout.approvedAt = Date.now();

    this.logAdminAction('approve_payout', payoutId, 'payout', { amount: payout.amount }, adminId);

    return true;
  }

  /**
   * Process referral payout
   */
  processReferralPayout(payoutId: string, adminId: string): boolean {
    const payout = this.referralPayouts.get(payoutId);
    if (!payout || payout.status !== 'approved') return false;

    payout.status = 'paid';
    payout.paidAt = Date.now();

    this.logAdminAction('process_payout', payoutId, 'payout', { amount: payout.amount }, adminId);

    return true;
  }

  /**
   * Reject referral payout
   */
  rejectReferralPayout(payoutId: string, reason: string, adminId: string): boolean {
    const payout = this.referralPayouts.get(payoutId);
    if (!payout || payout.status !== 'pending') return false;

    payout.status = 'failed';
    payout.failureReason = reason;

    this.logAdminAction('reject_payout', payoutId, 'payout', { reason }, adminId);

    return true;
  }

  /**
   * Get recommendation accuracy
   */
  getRecommendationAccuracy(modelId: string): RecommendationAccuracy | undefined {
    return this.recommendationAccuracies.get(modelId);
  }

  /**
   * Get all recommendation accuracies
   */
  getAllRecommendationAccuracies(): RecommendationAccuracy[] {
    return Array.from(this.recommendationAccuracies.values()).sort(
      (a, b) => b.winRate - a.winRate
    );
  }

  /**
   * Update recommendation accuracy
   */
  updateRecommendationAccuracy(
    modelId: string,
    metrics: Partial<RecommendationAccuracy>
  ): RecommendationAccuracy {
    const existing = this.recommendationAccuracies.get(modelId) || {
      modelId,
      totalRecommendations: 0,
      successfulRecommendations: 0,
      failedRecommendations: 0,
      winRate: 0,
      averageReturn: 0,
      bestReturn: 0,
      worstReturn: 0,
      lastUpdated: Date.now(),
    };

    const updated = { ...existing, ...metrics, lastUpdated: Date.now() };
    this.recommendationAccuracies.set(modelId, updated);

    return updated;
  }

  /**
   * Get admin logs
   */
  getAdminLogs(adminId?: string, action?: string): AdminLog[] {
    let logs = Array.from(this.adminLogs.values());

    if (adminId) {
      logs = logs.filter(l => l.adminId === adminId);
    }

    if (action) {
      logs = logs.filter(l => l.action === action);
    }

    return logs.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Log admin action
   */
  private logAdminAction(
    action: string,
    targetId: string,
    targetType: 'user' | 'payout' | 'recommendation' | 'system',
    details: Record<string, any>,
    adminId: string = 'system'
  ): void {
    const log: AdminLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminId,
      action,
      targetId,
      targetType,
      details,
      createdAt: Date.now(),
    };

    this.adminLogs.set(log.id, log);
  }

  /**
   * Get system health report
   */
  getSystemHealthReport(): {
    uptime: number;
    errorRate: number;
    responseTime: number;
    databaseHealth: number;
    apiHealth: number;
    overallHealth: number;
  } {
    return {
      uptime: 99.9,
      errorRate: 0.1,
      responseTime: 150, // ms
      databaseHealth: 98,
      apiHealth: 99,
      overallHealth: 98,
    };
  }

  /**
   * Get top users by portfolio value
   */
  getTopUsersByPortfolioValue(limit: number = 10): UserActivity[] {
    return Array.from(this.userActivities.values())
      .sort((a, b) => b.portfolioValue - a.portfolioValue)
      .slice(0, limit);
  }

  /**
   * Get top affiliates by referral count
   */
  getTopAffiliatesByReferralCount(limit: number = 10): UserActivity[] {
    return Array.from(this.userActivities.values())
      .sort((a, b) => b.referralCount - a.referralCount)
      .slice(0, limit);
  }

  /**
   * Get user growth metrics
   */
  getUserGrowthMetrics(): {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    suspendedUsers: number;
    growthRate: number;
  } {
    const users = Array.from(this.userActivities.values());
    const active = users.filter(u => u.status === 'active').length;
    const inactive = users.filter(u => u.status === 'inactive').length;
    const suspended = users.filter(u => u.status === 'suspended').length;

    return {
      totalUsers: users.length,
      activeUsers: active,
      inactiveUsers: inactive,
      suspendedUsers: suspended,
      growthRate: 15.5, // Simulated
    };
  }

  /**
   * Export report
   */
  exportReport(reportType: 'users' | 'payouts' | 'recommendations'): string {
    let csv = '';

    if (reportType === 'users') {
      csv = 'UserId,Username,LastLogin,TotalTrades,PortfolioValue,Status\n';
      for (const activity of this.getAllUserActivities()) {
        csv += `${activity.userId},${activity.username},${activity.lastLogin},${activity.totalTrades},${activity.portfolioValue},${activity.status}\n`;
      }
    } else if (reportType === 'payouts') {
      csv = 'PayoutId,AffiliateId,Amount,Status,CreatedAt\n';
      for (const payout of this.getReferralPayouts()) {
        csv += `${payout.id},${payout.affiliateId},${payout.amount},${payout.status},${payout.createdAt}\n`;
      }
    } else if (reportType === 'recommendations') {
      csv = 'ModelId,TotalRecommendations,SuccessfulRecommendations,WinRate,AverageReturn\n';
      for (const accuracy of this.getAllRecommendationAccuracies()) {
        csv += `${accuracy.modelId},${accuracy.totalRecommendations},${accuracy.successfulRecommendations},${accuracy.winRate},${accuracy.averageReturn}\n`;
      }
    }

    return csv;
  }
}

export const adminDashboardService = new AdminDashboardService();
