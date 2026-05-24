/**
 * User Profile & Social Features Service
 * User profiles, follower system, social discovery
 */

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio: string;
  location?: string;
  website?: string;
  joinedAt: number;
  updatedAt: number;
  isVerified: boolean;
  isBanned: boolean;
}

export interface UserStats {
  userId: string;
  followers: number;
  following: number;
  totalTrades: number;
  portfolioValue: number;
  totalReturn: number;
  winRate: number;
  averageReturn: number;
  bestTrade: number;
  worstTrade: number;
  tradingDaysStreak: number;
  signalsCreated: number;
  signalsAccuracy: number;
  lastUpdated: number;
}

export interface UserFollowing {
  userId: string;
  followingIds: Set<string>;
  followedByIds: Set<string>;
}

export interface UserSocialConnection {
  id: string;
  followerId: string;
  followerUsername: string;
  followingId: string;
  followingUsername: string;
  followedAt: number;
  isMuted: boolean;
  isBlocked: boolean;
}

export interface SocialDiscoveryItem {
  userId: string;
  username: string;
  profilePicture?: string;
  bio: string;
  followers: number;
  totalReturn: number;
  winRate: number;
  signalsAccuracy: number;
  isFollowing: boolean;
  mutualFollowers: number;
  reason: 'trending' | 'mutual_followers' | 'similar_interests' | 'recommended';
  score: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  type: 'trade' | 'signal' | 'follow' | 'comment' | 'achievement';
  description: string;
  data?: Record<string, any>;
  timestamp: number;
  isPublic: boolean;
}

class UserProfileSocialService {
  private profiles: Map<string, UserProfile> = new Map();
  private stats: Map<string, UserStats> = new Map();
  private following: Map<string, UserFollowing> = new Map();
  private activities: Map<string, UserActivity> = new Map();
  private connections: Map<string, UserSocialConnection> = new Map();

  /**
   * Create or update user profile
   */
  createOrUpdateProfile(
    userId: string,
    username: string,
    email: string,
    bio: string,
    profilePicture?: string,
    location?: string,
    website?: string
  ): UserProfile {
    const profile: UserProfile = {
      userId,
      username,
      email,
      bio,
      profilePicture,
      location,
      website,
      joinedAt: this.profiles.has(userId) ? this.profiles.get(userId)!.joinedAt : Date.now(),
      updatedAt: Date.now(),
      isVerified: false,
      isBanned: false,
    };

    this.profiles.set(userId, profile);

    // Initialize stats if not exists
    if (!this.stats.has(userId)) {
      this.stats.set(userId, {
        userId,
        followers: 0,
        following: 0,
        totalTrades: 0,
        portfolioValue: 0,
        totalReturn: 0,
        winRate: 0,
        averageReturn: 0,
        bestTrade: 0,
        worstTrade: 0,
        tradingDaysStreak: 0,
        signalsCreated: 0,
        signalsAccuracy: 0,
        lastUpdated: Date.now(),
      });
    }

    // Initialize following if not exists
    if (!this.following.has(userId)) {
      this.following.set(userId, {
        userId,
        followingIds: new Set(),
        followedByIds: new Set(),
      });
    }

    return profile;
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  /**
   * Follow user
   */
  followUser(followerId: string, followingId: string): boolean {
    if (followerId === followingId) return false;

    const followerFollowing = this.following.get(followerId);
    const followingFollowing = this.following.get(followingId);

    if (!followerFollowing || !followingFollowing) return false;

    // Check if already following
    if (followerFollowing.followingIds.has(followingId)) return false;

    followerFollowing.followingIds.add(followingId);
    followingFollowing.followedByIds.add(followerId);

    // Create connection
    const connectionId = `conn_${Date.now()}`;
    const connection: UserSocialConnection = {
      id: connectionId,
      followerId,
      followerUsername: this.profiles.get(followerId)?.username || 'Unknown',
      followingId,
      followingUsername: this.profiles.get(followingId)?.username || 'Unknown',
      followedAt: Date.now(),
      isMuted: false,
      isBlocked: false,
    };

    this.connections.set(connectionId, connection);

    // Update stats
    const followerStats = this.stats.get(followerId);
    const followingStats = this.stats.get(followingId);

    if (followerStats) followerStats.following++;
    if (followingStats) followingStats.followers++;

    // Log activity
    this.logActivity(followerId, 'follow', `Followed ${this.profiles.get(followingId)?.username}`, { followingId }, true);

    return true;
  }

  /**
   * Unfollow user
   */
  unfollowUser(followerId: string, followingId: string): boolean {
    const followerFollowing = this.following.get(followerId);
    const followingFollowing = this.following.get(followingId);

    if (!followerFollowing || !followingFollowing) return false;

    if (!followerFollowing.followingIds.has(followingId)) return false;

    followerFollowing.followingIds.delete(followingId);
    followingFollowing.followedByIds.delete(followerId);

    // Remove connection
    const connectionToRemove = Array.from(this.connections.values()).find(
      c => c.followerId === followerId && c.followingId === followingId
    );

    if (connectionToRemove) {
      this.connections.delete(connectionToRemove.id);
    }

    // Update stats
    const followerStats = this.stats.get(followerId);
    const followingStats = this.stats.get(followingId);

    if (followerStats && followerStats.following > 0) followerStats.following--;
    if (followingStats && followingStats.followers > 0) followingStats.followers--;

    return true;
  }

  /**
   * Get user followers
   */
  getUserFollowers(userId: string, limit: number = 50): UserProfile[] {
    const userFollowing = this.following.get(userId);
    if (!userFollowing) return [];

    const followers: UserProfile[] = [];

    userFollowing.followedByIds.forEach(followerId => {
      const profile = this.profiles.get(followerId);
      if (profile) followers.push(profile);
    });

    return followers.slice(0, limit);
  }

  /**
   * Get user following
   */
  getUserFollowing(userId: string, limit: number = 50): UserProfile[] {
    const userFollowing = this.following.get(userId);
    if (!userFollowing) return [];

    const following: UserProfile[] = [];

    userFollowing.followingIds.forEach(followingId => {
      const profile = this.profiles.get(followingId);
      if (profile) following.push(profile);
    });

    return following.slice(0, limit);
  }

  /**
   * Get user stats
   */
  getUserStats(userId: string): UserStats | undefined {
    return this.stats.get(userId);
  }

  /**
   * Update user stats
   */
  updateUserStats(userId: string, updates: Partial<UserStats>): UserStats | undefined {
    const stats = this.stats.get(userId);
    if (!stats) return undefined;

    Object.assign(stats, updates);
    stats.lastUpdated = Date.now();

    return stats;
  }

  /**
   * Get social discovery recommendations
   */
  getSocialDiscoveryRecommendations(userId: string, limit: number = 20): SocialDiscoveryItem[] {
    const userFollowing = this.following.get(userId);
    if (!userFollowing) return [];

    const recommendations: SocialDiscoveryItem[] = [];
    const userStats = this.stats.get(userId);

    this.profiles.forEach(profile => {
      if (profile.userId === userId || userFollowing.followingIds.has(profile.userId)) return;

      const profileStats = this.stats.get(profile.userId);
      if (!profileStats) return;

      // Calculate recommendation score
      let score = 0;
      let reason: SocialDiscoveryItem['reason'] = 'recommended';

      // Trending score
      if (profileStats.followers > 100) {
        score += 30;
        reason = 'trending';
      }

      // Mutual followers
      const mutualFollowers = Array.from(userFollowing.followedByIds).filter(id =>
        this.following.get(id)?.followingIds.has(profile.userId)
      ).length;

      if (mutualFollowers > 0) {
        score += mutualFollowers * 10;
        reason = 'mutual_followers';
      }

      // Similar interests (based on stats similarity)
      if (userStats) {
        const returnDiff = Math.abs(userStats.totalReturn - profileStats.totalReturn);
        const winRateDiff = Math.abs(userStats.winRate - profileStats.winRate);

        if (returnDiff < 20 && winRateDiff < 15) {
          score += 25;
          reason = 'similar_interests';
        }
      }

      if (score > 0) {
        recommendations.push({
          userId: profile.userId,
          username: profile.username,
          profilePicture: profile.profilePicture,
          bio: profile.bio,
          followers: profileStats.followers,
          totalReturn: profileStats.totalReturn,
          winRate: profileStats.winRate,
          signalsAccuracy: profileStats.signalsAccuracy,
          isFollowing: false,
          mutualFollowers,
          reason,
          score,
        });
      }
    });

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, limit);
  }

  /**
   * Search users
   */
  searchUsers(query: string, limit: number = 20): UserProfile[] {
    const lowerQuery = query.toLowerCase();

    const results = Array.from(this.profiles.values()).filter(
      profile =>
        profile.username.toLowerCase().includes(lowerQuery) ||
        profile.bio.toLowerCase().includes(lowerQuery) ||
        (profile.location && profile.location.toLowerCase().includes(lowerQuery))
    );

    return results.slice(0, limit);
  }

  /**
   * Get trending users
   */
  getTrendingUsers(limit: number = 20): SocialDiscoveryItem[] {
    const trendingItems: SocialDiscoveryItem[] = [];

    this.stats.forEach(stat => {
      const profile = this.profiles.get(stat.userId);
      if (!profile) return;

      trendingItems.push({
        userId: profile.userId,
        username: profile.username,
        profilePicture: profile.profilePicture,
        bio: profile.bio,
        followers: stat.followers,
        totalReturn: stat.totalReturn,
        winRate: stat.winRate,
        signalsAccuracy: stat.signalsAccuracy,
        isFollowing: false,
        mutualFollowers: 0,
        reason: 'trending',
        score: stat.followers + stat.signalsAccuracy,
      });
    });

    // Sort by followers
    trendingItems.sort((a, b) => b.followers - a.followers);

    return trendingItems.slice(0, limit);
  }

  /**
   * Log user activity
   */
  logActivity(
    userId: string,
    type: UserActivity['type'],
    description: string,
    data?: Record<string, any>,
    isPublic: boolean = false
  ): UserActivity {
    const activityId = `activity_${Date.now()}`;

    const activity: UserActivity = {
      id: activityId,
      userId,
      type,
      description,
      data,
      timestamp: Date.now(),
      isPublic,
    };

    this.activities.set(activityId, activity);

    return activity;
  }

  /**
   * Get user activity feed
   */
  getUserActivityFeed(userId: string, limit: number = 50): UserActivity[] {
    const userFollowing = this.following.get(userId);
    if (!userFollowing) return [];

    const feed: UserActivity[] = [];

    // Get activities from followed users
    userFollowing.followingIds.forEach(followingId => {
      Array.from(this.activities.values()).forEach(activity => {
        if (activity.userId === followingId && activity.isPublic) {
          feed.push(activity);
        }
      });
    });

    // Sort by timestamp
    feed.sort((a, b) => b.timestamp - a.timestamp);

    return feed.slice(0, limit);
  }

  /**
   * Mute user
   */
  muteUser(userId: string, muteId: string): boolean {
    const connection = Array.from(this.connections.values()).find(
      c => c.followerId === userId && c.followingId === muteId
    );

    if (!connection) return false;

    connection.isMuted = true;

    return true;
  }

  /**
   * Block user
   */
  blockUser(userId: string, blockId: string): boolean {
    const connection = Array.from(this.connections.values()).find(
      c => c.followerId === userId && c.followingId === blockId
    );

    if (!connection) return false;

    connection.isBlocked = true;

    // Unfollow automatically
    this.unfollowUser(userId, blockId);

    return true;
  }

  /**
   * Verify user
   */
  verifyUser(userId: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    profile.isVerified = true;

    return true;
  }

  /**
   * Ban user
   */
  banUser(userId: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) return false;

    profile.isBanned = true;

    return true;
  }
}

export const userProfileSocialService = new UserProfileSocialService();
