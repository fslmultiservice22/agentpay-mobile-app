/**
 * Social Sharing Service
 * Community features, social feed, and strategy sharing
 */

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  joinedAt: number;
}

export interface SocialPost {
  id: string;
  userId: string;
  author: SocialUser;
  content: string;
  type: 'strategy' | 'achievement' | 'analysis' | 'question' | 'update';
  image?: string;
  data?: {
    portfolioValue?: number;
    gainLoss?: number;
    symbol?: string;
    price?: number;
  };
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  timestamp: number;
  edited: boolean;
}

export interface SocialComment {
  id: string;
  postId: string;
  userId: string;
  author: SocialUser;
  content: string;
  likes: number;
  liked: boolean;
  timestamp: number;
}

export interface SocialFeed {
  posts: SocialPost[];
  hasMore: boolean;
  cursor?: string;
}

export interface UserProfile {
  user: SocialUser;
  posts: SocialPost[];
  followers: SocialUser[];
  following: SocialUser[];
  stats: {
    totalPosts: number;
    totalLikes: number;
    totalShares: number;
    averageEngagement: number;
  };
}

class SocialSharingService {
  private users: Map<string, SocialUser> = new Map();
  private posts: Map<string, SocialPost> = new Map();
  private comments: Map<string, SocialComment> = new Map();
  private follows: Map<string, Set<string>> = new Map(); // userId -> Set of following userIds
  private likes: Map<string, Set<string>> = new Map(); // postId -> Set of user IDs who liked
  private userPosts: Map<string, string[]> = new Map(); // userId -> postIds

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize mock social data
   */
  private initializeMockData(): void {
    const mockUsers: SocialUser[] = [
      {
        id: 'user_1',
        username: 'crypto_trader',
        displayName: 'Crypto Trader',
        avatar: '👨‍💼',
        bio: 'Professional crypto trader | 10+ years experience',
        followers: 5234,
        following: 342,
        isFollowing: false,
        joinedAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'user_2',
        username: 'defi_guru',
        displayName: 'DeFi Guru',
        avatar: '🧙‍♂️',
        bio: 'DeFi enthusiast | Yield farming expert',
        followers: 3421,
        following: 234,
        isFollowing: false,
        joinedAt: Date.now() - 200 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'user_3',
        username: 'portfolio_pro',
        displayName: 'Portfolio Pro',
        avatar: '📊',
        bio: 'Portfolio management specialist',
        followers: 2156,
        following: 156,
        isFollowing: false,
        joinedAt: Date.now() - 150 * 24 * 60 * 60 * 1000,
      },
    ];

    mockUsers.forEach(user => {
      this.users.set(user.id, user);
      this.follows.set(user.id, new Set());
      this.userPosts.set(user.id, []);
    });

    // Create mock posts
    const mockPosts: SocialPost[] = [
      {
        id: 'post_1',
        userId: 'user_1',
        author: mockUsers[0],
        content: 'Just hit a new portfolio ATH! 🚀 My diversification strategy is paying off.',
        type: 'achievement',
        data: { portfolioValue: 250000, gainLoss: 50000 },
        likes: 234,
        comments: 45,
        shares: 12,
        liked: false,
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        edited: false,
      },
      {
        id: 'post_2',
        userId: 'user_2',
        author: mockUsers[1],
        content: 'ETH staking rewards are incredible this quarter. Here\'s my strategy...',
        type: 'strategy',
        data: { symbol: 'ETH', price: 2500 },
        likes: 567,
        comments: 89,
        shares: 34,
        liked: false,
        timestamp: Date.now() - 4 * 60 * 60 * 1000,
        edited: false,
      },
      {
        id: 'post_3',
        userId: 'user_3',
        author: mockUsers[2],
        content: 'Market analysis: BTC showing bullish signals. Expecting breakout soon.',
        type: 'analysis',
        data: { symbol: 'BTC', price: 63000 },
        likes: 892,
        comments: 156,
        shares: 67,
        liked: false,
        timestamp: Date.now() - 6 * 60 * 60 * 1000,
        edited: false,
      },
    ];

    mockPosts.forEach(post => {
      this.posts.set(post.id, post);
      this.likes.set(post.id, new Set());
      this.userPosts.get(post.userId)?.push(post.id);
    });
  }

  /**
   * Create post
   */
  createPost(
    userId: string,
    content: string,
    type: 'strategy' | 'achievement' | 'analysis' | 'question' | 'update',
    data?: any
  ): SocialPost {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const post: SocialPost = {
      id: `post_${Date.now()}`,
      userId,
      author: user,
      content,
      type,
      data,
      likes: 0,
      comments: 0,
      shares: 0,
      liked: false,
      timestamp: Date.now(),
      edited: false,
    };

    this.posts.set(post.id, post);
    this.likes.set(post.id, new Set());
    this.userPosts.get(userId)?.push(post.id);

    return post;
  }

  /**
   * Get social feed
   */
  getSocialFeed(limit: number = 20): SocialFeed {
    const posts = Array.from(this.posts.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);

    return {
      posts,
      hasMore: this.posts.size > limit,
    };
  }

  /**
   * Get user profile
   */
  getUserProfile(userId: string): UserProfile | null {
    const user = this.users.get(userId);
    if (!user) return null;

    const userPostIds = this.userPosts.get(userId) || [];
    const userPosts = userPostIds.map(id => this.posts.get(id)!).filter(Boolean);

    const followers = Array.from(this.follows.entries())
      .filter(([_, following]) => following.has(userId))
      .map(([id]) => this.users.get(id)!)
      .filter(Boolean);

    const following = Array.from(this.follows.get(userId) || [])
      .map(id => this.users.get(id)!)
      .filter(Boolean);

    const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);
    const totalShares = userPosts.reduce((sum, post) => sum + post.shares, 0);
    const averageEngagement =
      userPosts.length > 0
        ? (totalLikes + totalShares) / userPosts.length
        : 0;

    return {
      user,
      posts: userPosts,
      followers,
      following,
      stats: {
        totalPosts: userPosts.length,
        totalLikes,
        totalShares,
        averageEngagement: parseFloat(averageEngagement.toFixed(2)),
      },
    };
  }

  /**
   * Like post
   */
  likePost(postId: string, userId: string): void {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');

    const likeSet = this.likes.get(postId)!;
    if (!likeSet.has(userId)) {
      likeSet.add(userId);
      post.likes++;
      post.liked = true;
    }
  }

  /**
   * Unlike post
   */
  unlikePost(postId: string, userId: string): void {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');

    const likeSet = this.likes.get(postId)!;
    if (likeSet.has(userId)) {
      likeSet.delete(userId);
      post.likes--;
      post.liked = false;
    }
  }

  /**
   * Share post
   */
  sharePost(postId: string): void {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');

    post.shares++;
  }

  /**
   * Add comment
   */
  addComment(postId: string, userId: string, content: string): SocialComment {
    const post = this.posts.get(postId);
    if (!post) throw new Error('Post not found');

    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');

    const comment: SocialComment = {
      id: `comment_${Date.now()}`,
      postId,
      userId,
      author: user,
      content,
      likes: 0,
      liked: false,
      timestamp: Date.now(),
    };

    this.comments.set(comment.id, comment);
    post.comments++;

    return comment;
  }

  /**
   * Follow user
   */
  followUser(currentUserId: string, targetUserId: string): void {
    const following = this.follows.get(currentUserId);
    if (!following) throw new Error('User not found');

    following.add(targetUserId);

    const targetUser = this.users.get(targetUserId);
    if (targetUser) {
      targetUser.followers++;
    }

    const currentUser = this.users.get(currentUserId);
    if (currentUser) {
      currentUser.following++;
    }
  }

  /**
   * Unfollow user
   */
  unfollowUser(currentUserId: string, targetUserId: string): void {
    const following = this.follows.get(currentUserId);
    if (!following) throw new Error('User not found');

    if (following.has(targetUserId)) {
      following.delete(targetUserId);

      const targetUser = this.users.get(targetUserId);
      if (targetUser) {
        targetUser.followers--;
      }

      const currentUser = this.users.get(currentUserId);
      if (currentUser) {
        currentUser.following--;
      }
    }
  }

  /**
   * Get trending posts
   */
  getTrendingPosts(limit: number = 10): SocialPost[] {
    return Array.from(this.posts.values())
      .sort((a, b) => (b.likes + b.shares) - (a.likes + a.shares))
      .slice(0, limit);
  }

  /**
   * Search posts
   */
  searchPosts(query: string): SocialPost[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.posts.values())
      .filter(post => 
        post.content.toLowerCase().includes(lowerQuery) ||
        post.author.displayName.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get users
   */
  getUsers(): SocialUser[] {
    return Array.from(this.users.values());
  }

  /**
   * Get user
   */
  getUser(userId: string): SocialUser | undefined {
    return this.users.get(userId);
  }
}

export const socialSharingService = new SocialSharingService();
