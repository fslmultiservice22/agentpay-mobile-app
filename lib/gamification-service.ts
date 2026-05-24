/**
 * Gamification & Achievements System Service
 * Badges, leaderboards, and reward points
 */

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trader' | 'community' | 'achievement' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export interface UserAchievement {
  id: string;
  userId: string;
  badgeId: string;
  unlockedAt: number;
  points: number;
  description: string;
}

export interface UserLevel {
  userId: string;
  level: number;
  totalPoints: number;
  pointsToNextLevel: number;
  currentLevelPoints: number;
  title: string;
  percentToNextLevel: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  rank: number;
  score: number;
  badge?: string;
  trend: 'up' | 'down' | 'stable';
}

export interface RewardPoints {
  userId: string;
  totalPoints: number;
  tradingPoints: number;
  communityPoints: number;
  referralPoints: number;
  achievementPoints: number;
  lastUpdated: number;
}

export interface Leaderboard {
  type: 'returns' | 'followers' | 'signals_accuracy' | 'points' | 'community_contribution';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  entries: LeaderboardEntry[];
  generatedAt: number;
}

class GamificationService {
  private userBadges: Map<string, UserAchievement[]> = new Map();
  private userLevels: Map<string, UserLevel> = new Map();
  private rewardPoints: Map<string, RewardPoints> = new Map();
  private leaderboards: Map<string, Leaderboard> = new Map();

  private readonly BADGES = {
    // Trader badges
    FIRST_TRADE: {
      id: 'first_trade',
      name: 'First Trade',
      description: 'Complete your first trade',
      icon: '🎯',
      category: 'trader' as const,
      rarity: 'common' as const,
      points: 10,
    },
    PORTFOLIO_BUILDER: {
      id: 'portfolio_builder',
      name: 'Portfolio Builder',
      description: 'Create a portfolio with 5+ assets',
      icon: '📊',
      category: 'trader' as const,
      rarity: 'rare' as const,
      points: 50,
    },
    PROFITABLE_TRADER: {
      id: 'profitable_trader',
      name: 'Profitable Trader',
      description: 'Achieve 10% portfolio return',
      icon: '📈',
      category: 'trader' as const,
      rarity: 'epic' as const,
      points: 100,
    },
    MASTER_TRADER: {
      id: 'master_trader',
      name: 'Master Trader',
      description: 'Achieve 50% portfolio return',
      icon: '👑',
      category: 'trader' as const,
      rarity: 'legendary' as const,
      points: 500,
    },

    // Community badges
    COMMUNITY_CONTRIBUTOR: {
      id: 'community_contributor',
      name: 'Community Contributor',
      description: 'Share 5 trading signals',
      icon: '🤝',
      category: 'community' as const,
      rarity: 'common' as const,
      points: 25,
    },
    SIGNAL_MASTER: {
      id: 'signal_master',
      name: 'Signal Master',
      description: 'Create a signal with 80%+ accuracy',
      icon: '⭐',
      category: 'community' as const,
      rarity: 'epic' as const,
      points: 150,
    },
    INFLUENCER: {
      id: 'influencer',
      name: 'Influencer',
      description: 'Gain 1000+ followers',
      icon: '📢',
      category: 'community' as const,
      rarity: 'legendary' as const,
      points: 300,
    },

    // Achievement badges
    WEEK_STREAK: {
      id: 'week_streak',
      name: 'Week Streak',
      description: 'Trade 7 days in a row',
      icon: '🔥',
      category: 'achievement' as const,
      rarity: 'rare' as const,
      points: 75,
    },
    MONTH_STREAK: {
      id: 'month_streak',
      name: 'Month Streak',
      description: 'Trade 30 days in a row',
      icon: '🌟',
      category: 'achievement' as const,
      rarity: 'epic' as const,
      points: 200,
    },

    // Milestone badges
    LEVEL_10: {
      id: 'level_10',
      name: 'Level 10',
      description: 'Reach level 10',
      icon: '🏆',
      category: 'milestone' as const,
      rarity: 'rare' as const,
      points: 100,
    },
    LEVEL_50: {
      id: 'level_50',
      name: 'Level 50',
      description: 'Reach level 50',
      icon: '👑',
      category: 'milestone' as const,
      rarity: 'legendary' as const,
      points: 500,
    },
  };

  private readonly POINTS_PER_LEVEL = 1000;

  /**
   * Award points to user
   */
  awardPoints(
    userId: string,
    amount: number,
    category: 'trading' | 'community' | 'referral' | 'achievement'
  ): RewardPoints {
    let points = this.rewardPoints.get(userId);

    if (!points) {
      points = {
        userId,
        totalPoints: 0,
        tradingPoints: 0,
        communityPoints: 0,
        referralPoints: 0,
        achievementPoints: 0,
        lastUpdated: Date.now(),
      };
    }

    points.totalPoints += amount;

    switch (category) {
      case 'trading':
        points.tradingPoints += amount;
        break;
      case 'community':
        points.communityPoints += amount;
        break;
      case 'referral':
        points.referralPoints += amount;
        break;
      case 'achievement':
        points.achievementPoints += amount;
        break;
    }

    points.lastUpdated = Date.now();

    this.rewardPoints.set(userId, points);

    // Update level
    this.updateUserLevel(userId);

    return points;
  }

  /**
   * Unlock badge
   */
  unlockBadge(userId: string, badgeId: string): UserAchievement | null {
    const badge = Object.values(this.BADGES).find(b => b.id === badgeId);
    if (!badge) return null;

    // Check if already unlocked
    const userAchievements = this.userBadges.get(userId) || [];
    if (userAchievements.some(a => a.badgeId === badgeId)) {
      return null;
    }

    const achievement: UserAchievement = {
      id: `achievement_${Date.now()}`,
      userId,
      badgeId,
      unlockedAt: Date.now(),
      points: badge.points,
      description: badge.description,
    };

    userAchievements.push(achievement);
    this.userBadges.set(userId, userAchievements);

    // Award points
    this.awardPoints(userId, badge.points, 'achievement');

    return achievement;
  }

  /**
   * Get user badges
   */
  getUserBadges(userId: string): UserAchievement[] {
    return this.userBadges.get(userId) || [];
  }

  /**
   * Get user level
   */
  getUserLevel(userId: string): UserLevel {
    return (
      this.userLevels.get(userId) || {
        userId,
        level: 1,
        totalPoints: 0,
        pointsToNextLevel: this.POINTS_PER_LEVEL,
        currentLevelPoints: 0,
        title: 'Novice Trader',
        percentToNextLevel: 0,
      }
    );
  }

  /**
   * Update user level
   */
  private updateUserLevel(userId: string): void {
    const points = this.rewardPoints.get(userId);
    if (!points) return;

    const level = Math.floor(points.totalPoints / this.POINTS_PER_LEVEL) + 1;
    const currentLevelPoints = points.totalPoints % this.POINTS_PER_LEVEL;
    const pointsToNextLevel = this.POINTS_PER_LEVEL - currentLevelPoints;
    const percentToNextLevel = (currentLevelPoints / this.POINTS_PER_LEVEL) * 100;

    const titles = [
      'Novice Trader',
      'Beginner Trader',
      'Intermediate Trader',
      'Advanced Trader',
      'Expert Trader',
      'Master Trader',
      'Legendary Trader',
    ];

    const title = titles[Math.min(level - 1, titles.length - 1)];

    const userLevel: UserLevel = {
      userId,
      level,
      totalPoints: points.totalPoints,
      pointsToNextLevel,
      currentLevelPoints,
      title,
      percentToNextLevel,
    };

    this.userLevels.set(userId, userLevel);
  }

  /**
   * Get user reward points
   */
  getUserRewardPoints(userId: string): RewardPoints {
    return (
      this.rewardPoints.get(userId) || {
        userId,
        totalPoints: 0,
        tradingPoints: 0,
        communityPoints: 0,
        referralPoints: 0,
        achievementPoints: 0,
        lastUpdated: Date.now(),
      }
    );
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(
    type: Leaderboard['type'],
    period: Leaderboard['period'],
    limit: number = 100
  ): LeaderboardEntry[] {
    const leaderboardKey = `${type}_${period}`;
    const leaderboard = this.leaderboards.get(leaderboardKey);

    if (leaderboard) {
      return leaderboard.entries.slice(0, limit);
    }

    // Generate leaderboard
    const entries: LeaderboardEntry[] = [];

    this.rewardPoints.forEach(points => {
      entries.push({
        userId: points.userId,
        username: `User_${points.userId.slice(0, 8)}`,
        rank: 0,
        score: points.totalPoints,
        trend: 'stable',
      });
    });

    // Sort by score
    entries.sort((a, b) => b.score - a.score);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Store leaderboard
    const newLeaderboard: Leaderboard = {
      type,
      period,
      entries,
      generatedAt: Date.now(),
    };

    this.leaderboards.set(leaderboardKey, newLeaderboard);

    return entries.slice(0, limit);
  }

  /**
   * Get user rank
   */
  getUserRank(userId: string, type: Leaderboard['type'], period: Leaderboard['period']): number {
    const leaderboard = this.getLeaderboard(type, period);
    const entry = leaderboard.find(e => e.userId === userId);

    return entry?.rank || 0;
  }

  /**
   * Check badge unlock conditions
   */
  checkBadgeConditions(userId: string, condition: Record<string, any>): string[] {
    const unlockedBadges: string[] = [];

    // Check First Trade
    if (condition.totalTrades >= 1 && !this.hasBadge(userId, 'first_trade')) {
      unlockedBadges.push('first_trade');
    }

    // Check Portfolio Builder
    if (condition.totalAssets >= 5 && !this.hasBadge(userId, 'portfolio_builder')) {
      unlockedBadges.push('portfolio_builder');
    }

    // Check Profitable Trader
    if (condition.portfolioReturn >= 10 && !this.hasBadge(userId, 'profitable_trader')) {
      unlockedBadges.push('profitable_trader');
    }

    // Check Master Trader
    if (condition.portfolioReturn >= 50 && !this.hasBadge(userId, 'master_trader')) {
      unlockedBadges.push('master_trader');
    }

    // Check Community Contributor
    if (condition.signalsShared >= 5 && !this.hasBadge(userId, 'community_contributor')) {
      unlockedBadges.push('community_contributor');
    }

    // Check Signal Master
    if (condition.signalAccuracy >= 80 && !this.hasBadge(userId, 'signal_master')) {
      unlockedBadges.push('signal_master');
    }

    // Check Influencer
    if (condition.followers >= 1000 && !this.hasBadge(userId, 'influencer')) {
      unlockedBadges.push('influencer');
    }

    // Check Week Streak
    if (condition.tradingStreak >= 7 && !this.hasBadge(userId, 'week_streak')) {
      unlockedBadges.push('week_streak');
    }

    // Check Month Streak
    if (condition.tradingStreak >= 30 && !this.hasBadge(userId, 'month_streak')) {
      unlockedBadges.push('month_streak');
    }

    // Check Level 10
    const level = this.getUserLevel(userId);
    if (level.level >= 10 && !this.hasBadge(userId, 'level_10')) {
      unlockedBadges.push('level_10');
    }

    // Check Level 50
    if (level.level >= 50 && !this.hasBadge(userId, 'level_50')) {
      unlockedBadges.push('level_50');
    }

    return unlockedBadges;
  }

  /**
   * Check if user has badge
   */
  private hasBadge(userId: string, badgeId: string): boolean {
    const achievements = this.userBadges.get(userId) || [];
    return achievements.some(a => a.badgeId === badgeId);
  }

  /**
   * Get badge details
   */
  getBadgeDetails(badgeId: string): (typeof this.BADGES)[keyof typeof this.BADGES] | undefined {
    return Object.values(this.BADGES).find(b => b.id === badgeId);
  }

  /**
   * Get all badges
   */
  getAllBadges(): (typeof this.BADGES)[keyof typeof this.BADGES][] {
    return Object.values(this.BADGES);
  }
}

export const gamificationService = new GamificationService();
