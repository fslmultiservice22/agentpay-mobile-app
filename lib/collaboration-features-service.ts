/**
 * Real-Time Collaboration Features Service
 * Shared portfolio editing, live annotation, and collaborative trading signals
 */

export interface CollaborativePortfolio {
  id: string;
  name: string;
  ownerId: string;
  collaborators: Collaborator[];
  assets: CollaborativeAsset[];
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  permissions: PortfolioPermission[];
}

export interface Collaborator {
  userId: string;
  username: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: number;
  lastActiveAt: number;
  isOnline: boolean;
}

export interface CollaborativeAsset {
  id: string;
  symbol: string;
  allocation: number;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  annotations: Annotation[];
  lastModifiedBy: string;
  lastModifiedAt: number;
}

export interface Annotation {
  id: string;
  userId: string;
  username: string;
  content: string;
  type: 'note' | 'alert' | 'suggestion' | 'analysis';
  x?: number;
  y?: number;
  createdAt: number;
  replies: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: number;
}

export interface PortfolioPermission {
  userId: string;
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
  canInvite: boolean;
}

export interface CollaborativeSignal {
  id: string;
  creatorId: string;
  creatorUsername: string;
  title: string;
  description: string;
  assets: SignalAsset[];
  contributors: SignalContributor[];
  votes: SignalVote[];
  accuracy: number;
  followers: number;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'archived' | 'completed';
}

export interface SignalAsset {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  weight: number;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface SignalContributor {
  userId: string;
  username: string;
  contribution: string;
  weight: number;
  joinedAt: number;
}

export interface SignalVote {
  userId: string;
  vote: 'up' | 'down';
  votedAt: number;
}

export interface CollaborationActivity {
  id: string;
  portfolioId: string;
  userId: string;
  username: string;
  action: 'edit' | 'comment' | 'share' | 'invite' | 'remove' | 'update';
  details: Record<string, any>;
  timestamp: number;
}

class CollaborationFeaturesService {
  private portfolios: Map<string, CollaborativePortfolio> = new Map();
  private signals: Map<string, CollaborativeSignal> = new Map();
  private activities: Map<string, CollaborationActivity> = new Map();
  private activeUsers: Map<string, Set<string>> = new Map(); // portfolioId -> userIds

  /**
   * Create collaborative portfolio
   */
  createCollaborativePortfolio(
    name: string,
    ownerId: string,
    isPublic: boolean = false
  ): CollaborativePortfolio {
    const portfolioId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const portfolio: CollaborativePortfolio = {
      id: portfolioId,
      name,
      ownerId,
      collaborators: [
        {
          userId: ownerId,
          username: `User_${ownerId.slice(0, 8)}`,
          email: `user_${ownerId.slice(0, 8)}@agentpay.io`,
          role: 'owner',
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          isOnline: true,
        },
      ],
      assets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isPublic,
      permissions: [
        {
          userId: ownerId,
          canEdit: true,
          canShare: true,
          canDelete: true,
          canInvite: true,
        },
      ],
    };

    this.portfolios.set(portfolioId, portfolio);
    this.activeUsers.set(portfolioId, new Set([ownerId]));

    return portfolio;
  }

  /**
   * Invite collaborator
   */
  inviteCollaborator(
    portfolioId: string,
    userId: string,
    username: string,
    email: string,
    role: 'editor' | 'viewer' = 'editor'
  ): boolean {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return false;

    // Check if already collaborator
    if (portfolio.collaborators.some(c => c.userId === userId)) return false;

    const collaborator: Collaborator = {
      userId,
      username,
      email,
      role,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      isOnline: false,
    };

    portfolio.collaborators.push(collaborator);

    // Add permissions
    const canEdit = role === 'editor';
    portfolio.permissions.push({
      userId,
      canEdit,
      canShare: canEdit,
      canDelete: false,
      canInvite: false,
    });

    // Log activity
    this.logActivity(portfolioId, portfolio.ownerId, 'invite', { userId, role });

    return true;
  }

  /**
   * Remove collaborator
   */
  removeCollaborator(portfolioId: string, userId: string): boolean {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return false;

    const index = portfolio.collaborators.findIndex(c => c.userId === userId);
    if (index === -1) return false;

    portfolio.collaborators.splice(index, 1);

    // Remove permissions
    const permIndex = portfolio.permissions.findIndex(p => p.userId === userId);
    if (permIndex !== -1) {
      portfolio.permissions.splice(permIndex, 1);
    }

    // Remove from active users
    const activeSet = this.activeUsers.get(portfolioId);
    if (activeSet) {
      activeSet.delete(userId);
    }

    // Log activity
    this.logActivity(portfolioId, portfolio.ownerId, 'remove', { userId });

    return true;
  }

  /**
   * Add asset to collaborative portfolio
   */
  addAssetToPortfolio(
    portfolioId: string,
    symbol: string,
    allocation: number,
    quantity: number,
    entryPrice: number,
    currentPrice: number,
    userId: string
  ): boolean {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return false;

    // Check permissions
    const permission = portfolio.permissions.find(p => p.userId === userId);
    if (!permission || !permission.canEdit) return false;

    const asset: CollaborativeAsset = {
      id: `asset_${Date.now()}`,
      symbol,
      allocation,
      quantity,
      entryPrice,
      currentPrice,
      annotations: [],
      lastModifiedBy: userId,
      lastModifiedAt: Date.now(),
    };

    portfolio.assets.push(asset);
    portfolio.updatedAt = Date.now();

    // Log activity
    this.logActivity(portfolioId, userId, 'edit', { action: 'add_asset', symbol });

    return true;
  }

  /**
   * Add annotation to asset
   */
  addAnnotation(
    portfolioId: string,
    assetId: string,
    userId: string,
    username: string,
    content: string,
    type: Annotation['type'] = 'note',
    x?: number,
    y?: number
  ): boolean {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return false;

    const asset = portfolio.assets.find(a => a.id === assetId);
    if (!asset) return false;

    const annotation: Annotation = {
      id: `annot_${Date.now()}`,
      userId,
      username,
      content,
      type,
      x,
      y,
      createdAt: Date.now(),
      replies: [],
    };

    asset.annotations.push(annotation);
    portfolio.updatedAt = Date.now();

    // Log activity
    this.logActivity(portfolioId, userId, 'comment', { assetId, type });

    return true;
  }

  /**
   * Reply to annotation
   */
  replyToAnnotation(
    portfolioId: string,
    assetId: string,
    annotationId: string,
    userId: string,
    username: string,
    content: string
  ): boolean {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return false;

    const asset = portfolio.assets.find(a => a.id === assetId);
    if (!asset) return false;

    const annotation = asset.annotations.find(a => a.id === annotationId);
    if (!annotation) return false;

    const reply: AnnotationReply = {
      id: `reply_${Date.now()}`,
      userId,
      username,
      content,
      createdAt: Date.now(),
    };

    annotation.replies.push(reply);
    portfolio.updatedAt = Date.now();

    return true;
  }

  /**
   * Create collaborative signal
   */
  createCollaborativeSignal(
    creatorId: string,
    creatorUsername: string,
    title: string,
    description: string,
    assets: SignalAsset[]
  ): CollaborativeSignal {
    const signalId = `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const signal: CollaborativeSignal = {
      id: signalId,
      creatorId,
      creatorUsername,
      title,
      description,
      assets,
      contributors: [
        {
          userId: creatorId,
          username: creatorUsername,
          contribution: 'Creator',
          weight: 1,
          joinedAt: Date.now(),
        },
      ],
      votes: [],
      accuracy: 0,
      followers: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
    };

    this.signals.set(signalId, signal);

    return signal;
  }

  /**
   * Add contributor to signal
   */
  addContributorToSignal(
    signalId: string,
    userId: string,
    username: string,
    contribution: string,
    weight: number = 0.5
  ): boolean {
    const signal = this.signals.get(signalId);
    if (!signal) return false;

    // Check if already contributor
    if (signal.contributors.some(c => c.userId === userId)) return false;

    const contributor: SignalContributor = {
      userId,
      username,
      contribution,
      weight,
      joinedAt: Date.now(),
    };

    signal.contributors.push(contributor);
    signal.updatedAt = Date.now();

    return true;
  }

  /**
   * Vote on signal
   */
  voteOnSignal(signalId: string, userId: string, vote: 'up' | 'down'): boolean {
    const signal = this.signals.get(signalId);
    if (!signal) return false;

    // Check if already voted
    const existingVote = signal.votes.find(v => v.userId === userId);
    if (existingVote) {
      existingVote.vote = vote;
      existingVote.votedAt = Date.now();
    } else {
      signal.votes.push({
        userId,
        vote,
        votedAt: Date.now(),
      });
    }

    signal.updatedAt = Date.now();

    return true;
  }

  /**
   * Get signal accuracy
   */
  getSignalAccuracy(signalId: string): number {
    const signal = this.signals.get(signalId);
    if (!signal || signal.votes.length === 0) return 0;

    const upVotes = signal.votes.filter(v => v.vote === 'up').length;
    return (upVotes / signal.votes.length) * 100;
  }

  /**
   * Get collaborative portfolio
   */
  getCollaborativePortfolio(portfolioId: string): CollaborativePortfolio | undefined {
    return this.portfolios.get(portfolioId);
  }

  /**
   * Get user's collaborative portfolios
   */
  getUserCollaborativePortfolios(userId: string): CollaborativePortfolio[] {
    return Array.from(this.portfolios.values()).filter(p =>
      p.collaborators.some(c => c.userId === userId)
    );
  }

  /**
   * Get active collaborators
   */
  getActiveCollaborators(portfolioId: string): Collaborator[] {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return [];

    return portfolio.collaborators.filter(c => c.isOnline);
  }

  /**
   * Update user online status
   */
  updateUserOnlineStatus(portfolioId: string, userId: string, isOnline: boolean): boolean {
    const portfolio = this.portfolios.get(portfolioId);
    if (!portfolio) return false;

    const collaborator = portfolio.collaborators.find(c => c.userId === userId);
    if (!collaborator) return false;

    collaborator.isOnline = isOnline;
    collaborator.lastActiveAt = Date.now();

    if (isOnline) {
      const activeSet = this.activeUsers.get(portfolioId);
      if (activeSet) {
        activeSet.add(userId);
      }
    } else {
      const activeSet = this.activeUsers.get(portfolioId);
      if (activeSet) {
        activeSet.delete(userId);
      }
    }

    return true;
  }

  /**
   * Get collaborative signal
   */
  getCollaborativeSignal(signalId: string): CollaborativeSignal | undefined {
    return this.signals.get(signalId);
  }

  /**
   * Get trending signals
   */
  getTrendingSignals(limit: number = 10): CollaborativeSignal[] {
    return Array.from(this.signals.values())
      .filter(s => s.status === 'active')
      .sort((a, b) => {
        const accuracyDiff = this.getSignalAccuracy(b.id) - this.getSignalAccuracy(a.id);
        if (accuracyDiff !== 0) return accuracyDiff;
        return b.followers - a.followers;
      })
      .slice(0, limit);
  }

  /**
   * Get collaboration activity
   */
  getCollaborationActivity(portfolioId: string, limit: number = 50): CollaborationActivity[] {
    return Array.from(this.activities.values())
      .filter(a => a.portfolioId === portfolioId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Log activity
   */
  private logActivity(
    portfolioId: string,
    userId: string,
    action: CollaborationActivity['action'],
    details: Record<string, any>
  ): void {
    const activityId = `activity_${Date.now()}`;
    const portfolio = this.portfolios.get(portfolioId);

    const activity: CollaborationActivity = {
      id: activityId,
      portfolioId,
      userId,
      username: portfolio?.collaborators.find(c => c.userId === userId)?.username || 'Unknown',
      action,
      details,
      timestamp: Date.now(),
    };

    this.activities.set(activityId, activity);
  }
}

export const collaborationFeaturesService = new CollaborationFeaturesService();
