/**
 * Community Features & Social Hub Service
 * User profiles, portfolio sharing, trading signals marketplace
 */

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  joinedAt: number;
  followers: number;
  following: number;
  reputation: number;
  badges: string[];
  isVerified: boolean;
  socialLinks?: Record<string, string>;
}

export interface PortfolioShare {
  id: string;
  userId: string;
  title: string;
  description: string;
  assets: Record<string, number>;
  totalValue: number;
  performance: number;
  isPublic: boolean;
  sharedAt: number;
  views: number;
  likes: number;
  comments: number;
}

export interface TradingSignal {
  id: string;
  userId: string;
  asset: string;
  type: 'buy' | 'sell' | 'hold';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  confidence: number; // 0-100
  reasoning: string;
  createdAt: number;
  expiresAt: number;
  accuracy: number;
  followers: number;
  isPremium: boolean;
  price?: number;
}

export interface CommunityPost {
  id: string;
  userId: string;
  content: string;
  type: 'discussion' | 'analysis' | 'question' | 'news';
  asset?: string;
  images?: string[];
  createdAt: number;
  likes: number;
  comments: number;
  shares: number;
  trending: boolean;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: number;
  likes: number;
  replies: number;
}

export interface Leaderboard {
  userId: string;
  username: string;
  rank: number;
  score: number;
  metric: 'accuracy' | 'followers' | 'reputation' | 'returns';
  period: 'week' | 'month' | 'all-time';
}

class CommunitySocialHubService {
  private userProfiles: Map<string, UserProfile> = new Map();
  private portfolioShares: Map<string, PortfolioShare[]> = new Map();
  private tradingSignals: Map<string, TradingSignal[]> = new Map();
  private communityPosts: Map<string, CommunityPost[]> = new Map();
  private communityComments: Map<string, CommunityComment[]> = new Map();
  private userFollows: Map<string, Set<string>> = new Map();
  private userLikes: Map<string, Set<string>> = new Map();

  /**
   * Create user profile
   */
  createUserProfile(userId: string, username: string, displayName: string): UserProfile {
    const profile: UserProfile = {
      id: userId,
      username,
      displayName,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      bio: '',
      joinedAt: Date.now(),
      followers: 0,
      following: 0,
      reputation: 0,
      badges: [],
      isVerified: false,
    };

    this.userProfiles.set(userId, profile);
    this.userFollows.set(userId, new Set());
    this.userLikes.set(userId, new Set());

    return profile;
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserProfile | undefined {
    return this.userProfiles.get(userId);
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, updates: Partial<UserProfile>): boolean {
    const profile = this.userProfiles.get(userId);
    if (!profile) return false;

    Object.assign(profile, updates);
    return true;
  }

  /**
   * Share portfolio
   */
  sharePortfolio(userId: string, portfolio: Record<string, number>, title: string, description: string): PortfolioShare {
    const totalValue = Object.values(portfolio).reduce((a, b) => a + b, 0);

    const share: PortfolioShare = {
      id: `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title,
      description,
      assets: portfolio,
      totalValue,
      performance: (Math.random() - 0.5) * 50,
      isPublic: true,
      sharedAt: Date.now(),
      views: 0,
      likes: 0,
      comments: 0,
    };

    if (!this.portfolioShares.has(userId)) {
      this.portfolioShares.set(userId, []);
    }

    this.portfolioShares.get(userId)!.push(share);

    return share;
  }

  /**
   * Get portfolio shares
   */
  getPortfolioShares(userId?: string, limit: number = 10): PortfolioShare[] {
    let shares: PortfolioShare[] = [];

    if (userId) {
      shares = this.portfolioShares.get(userId) || [];
    } else {
      for (const userShares of this.portfolioShares.values()) {
        shares.push(...userShares.filter(s => s.isPublic));
      }
    }

    return shares
      .sort((a, b) => b.sharedAt - a.sharedAt)
      .slice(0, limit);
  }

  /**
   * Create trading signal
   */
  createTradingSignal(
    userId: string,
    asset: string,
    type: 'buy' | 'sell' | 'hold',
    entryPrice: number,
    targetPrice: number,
    stopLoss: number,
    reasoning: string,
    isPremium: boolean = false,
    price?: number
  ): TradingSignal {
    const signal: TradingSignal = {
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      asset,
      type,
      entryPrice,
      targetPrice,
      stopLoss,
      confidence: Math.random() * 100,
      reasoning,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      accuracy: Math.random() * 100,
      followers: 0,
      isPremium,
      price,
    };

    if (!this.tradingSignals.has(userId)) {
      this.tradingSignals.set(userId, []);
    }

    this.tradingSignals.get(userId)!.push(signal);

    return signal;
  }

  /**
   * Get trading signals
   */
  getTradingSignals(asset?: string, limit: number = 20): TradingSignal[] {
    let signals: TradingSignal[] = [];

    if (asset) {
      for (const userSignals of this.tradingSignals.values()) {
        signals.push(...userSignals.filter(s => s.asset === asset));
      }
    } else {
      for (const userSignals of this.tradingSignals.values()) {
        signals.push(...userSignals);
      }
    }

    return signals
      .filter(s => s.expiresAt > Date.now())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, limit);
  }

  /**
   * Create community post
   */
  createCommunityPost(
    userId: string,
    content: string,
    type: 'discussion' | 'analysis' | 'question' | 'news',
    asset?: string
  ): CommunityPost {
    const post: CommunityPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      content,
      type,
      asset,
      createdAt: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      trending: false,
    };

    if (!this.communityPosts.has(userId)) {
      this.communityPosts.set(userId, []);
    }

    this.communityPosts.get(userId)!.push(post);

    return post;
  }

  /**
   * Get community posts
   */
  getCommunityPosts(type?: string, asset?: string, limit: number = 20): CommunityPost[] {
    let posts: CommunityPost[] = [];

    for (const userPosts of this.communityPosts.values()) {
      posts.push(...userPosts);
    }

    if (type) {
      posts = posts.filter(p => p.type === type);
    }

    if (asset) {
      posts = posts.filter(p => p.asset === asset);
    }

    return posts
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Add comment to post
   */
  addCommentToPost(postId: string, userId: string, content: string): CommunityComment {
    const comment: CommunityComment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId,
      userId,
      content,
      createdAt: Date.now(),
      likes: 0,
      replies: 0,
    };

    if (!this.communityComments.has(postId)) {
      this.communityComments.set(postId, []);
    }

    this.communityComments.get(postId)!.push(comment);

    // Update post comment count
    for (const userPosts of this.communityPosts.values()) {
      const post = userPosts.find(p => p.id === postId);
      if (post) {
        post.comments += 1;
        break;
      }
    }

    return comment;
  }

  /**
   * Follow user
   */
  followUser(followerId: string, followeeId: string): boolean {
    if (!this.userFollows.has(followerId)) {
      this.userFollows.set(followerId, new Set());
    }

    this.userFollows.get(followerId)!.add(followeeId);

    const followerProfile = this.userProfiles.get(followerId);
    const followeeProfile = this.userProfiles.get(followeeId);

    if (followerProfile) followerProfile.following += 1;
    if (followeeProfile) followeeProfile.followers += 1;

    return true;
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(metric: 'accuracy' | 'followers' | 'reputation' | 'returns', period: 'week' | 'month' | 'all-time' = 'month', limit: number = 10): Leaderboard[] {
    const leaderboard: Leaderboard[] = [];

    for (const [userId, profile] of this.userProfiles.entries()) {
      let score = 0;

      if (metric === 'followers') {
        score = profile.followers;
      } else if (metric === 'reputation') {
        score = profile.reputation;
      } else if (metric === 'accuracy') {
        const signals = this.tradingSignals.get(userId) || [];
        score = signals.length > 0 ? signals.reduce((sum, s) => sum + s.accuracy, 0) / signals.length : 0;
      }

      leaderboard.push({
        userId,
        username: profile.username,
        rank: 0,
        score,
        metric,
        period,
      });
    }

    leaderboard.sort((a, b) => b.score - a.score);

    return leaderboard
      .map((item, index) => ({ ...item, rank: index + 1 }))
      .slice(0, limit);
  }

  /**
   * Like post
   */
  likePost(userId: string, postId: string): boolean {
    if (!this.userLikes.has(userId)) {
      this.userLikes.set(userId, new Set());
    }

    const alreadyLiked = this.userLikes.get(userId)!.has(postId);

    if (!alreadyLiked) {
      this.userLikes.get(userId)!.add(postId);

      for (const userPosts of this.communityPosts.values()) {
        const post = userPosts.find(p => p.id === postId);
        if (post) {
          post.likes += 1;
          break;
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Get trending posts
   */
  getTrendingPosts(limit: number = 10): CommunityPost[] {
    let posts: CommunityPost[] = [];

    for (const userPosts of this.communityPosts.values()) {
      posts.push(...userPosts);
    }

    return posts
      .sort((a, b) => (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares))
      .slice(0, limit);
  }

  /**
   * Get user statistics
   */
  getUserStatistics(userId: string): {
    postsCount: number;
    signalsCount: number;
    portfolioSharesCount: number;
    followersCount: number;
    followingCount: number;
  } {
    const posts = this.communityPosts.get(userId) || [];
    const signals = this.tradingSignals.get(userId) || [];
    const shares = this.portfolioShares.get(userId) || [];
    const profile = this.userProfiles.get(userId);

    return {
      postsCount: posts.length,
      signalsCount: signals.length,
      portfolioSharesCount: shares.length,
      followersCount: profile?.followers || 0,
      followingCount: profile?.following || 0,
    };
  }
}

export const communitySocialHubService = new CommunitySocialHubService();
