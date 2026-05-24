/**
 * Social Trading Service
 * Follow traders, copy trades, community portfolios, leaderboards
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Trader {
  id: string;
  username: string;
  avatar?: string;
  bio?: string;
  followers: number;
  following: number;
  totalReturn: number;
  winRate: number;
  averageROI: number;
  createdAt: number;
  verified: boolean;
}

export interface CopyTrade {
  id: string;
  traderId: string;
  traderUsername: string;
  assetId: string;
  assetSymbol: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  executedAt: number;
  copiedBy: number;
  status: 'pending' | 'executed' | 'failed';
}

export interface CommunityPortfolio {
  id: string;
  traderId: string;
  traderUsername: string;
  totalValue: number;
  totalReturn: number;
  holdings: Array<{
    assetId: string;
    assetSymbol: string;
    amount: number;
    value: number;
    percentage: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  traderId: string;
  traderUsername: string;
  avatar?: string;
  totalReturn: number;
  winRate: number;
  followers: number;
  verified: boolean;
}

export interface UserFollowing {
  followingId: string;
  followedAt: number;
  autoCopy: boolean;
}

class SocialTradingService {
  private traders: Map<string, Trader> = new Map();
  private copyTrades: Map<string, CopyTrade> = new Map();
  private communityPortfolios: Map<string, CommunityPortfolio> = new Map();
  private userFollowing: Map<string, UserFollowing> = new Map();
  private leaderboard: LeaderboardEntry[] = [];

  private readonly TRADERS_STORAGE_KEY = 'social_traders';
  private readonly COPY_TRADES_STORAGE_KEY = 'social_copy_trades';
  private readonly PORTFOLIOS_STORAGE_KEY = 'social_portfolios';
  private readonly FOLLOWING_STORAGE_KEY = 'social_following';
  private readonly LEADERBOARD_STORAGE_KEY = 'social_leaderboard';

  constructor() {
    this.loadData();
  }

  /**
   * Get trader profile
   */
  getTrader(traderId: string): Trader | undefined {
    return this.traders.get(traderId);
  }

  /**
   * Search traders
   */
  searchTraders(query: string, limit: number = 20): Trader[] {
    return Array.from(this.traders.values())
      .filter(t => t.username.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.followers - a.followers)
      .slice(0, limit);
  }

  /**
   * Follow trader
   */
  async followTrader(traderId: string, autoCopy: boolean = false): Promise<boolean> {
    const trader = this.traders.get(traderId);
    if (!trader) return false;

    this.userFollowing.set(traderId, {
      followingId: traderId,
      followedAt: Date.now(),
      autoCopy,
    });

    trader.followers++;
    await this.persistData();

    return true;
  }

  /**
   * Unfollow trader
   */
  async unfollowTrader(traderId: string): Promise<boolean> {
    const trader = this.traders.get(traderId);
    if (!trader) return false;

    this.userFollowing.delete(traderId);
    trader.followers = Math.max(0, trader.followers - 1);
    await this.persistData();

    return true;
  }

  /**
   * Get following list
   */
  getFollowing(): Trader[] {
    return Array.from(this.userFollowing.keys())
      .map(id => this.traders.get(id))
      .filter((t): t is Trader => t !== undefined);
  }

  /**
   * Copy trade
   */
  async copyTrade(traderId: string, tradeId: string): Promise<CopyTrade | null> {
    const trade = this.copyTrades.get(tradeId);
    if (!trade || trade.traderId !== traderId) return null;

    const copiedTrade: CopyTrade = {
      ...trade,
      id: `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      copiedBy: (trade.copiedBy || 0) + 1,
      status: 'pending',
      executedAt: Date.now(),
    };

    this.copyTrades.set(copiedTrade.id, copiedTrade);
    await this.persistData();

    return copiedTrade;
  }

  /**
   * Get copy trades
   */
  getCopyTrades(traderId?: string): CopyTrade[] {
    const trades = Array.from(this.copyTrades.values());
    if (traderId) {
      return trades.filter(t => t.traderId === traderId);
    }
    return trades;
  }

  /**
   * Create community portfolio
   */
  async createCommunityPortfolio(
    traderId: string,
    traderUsername: string,
    holdings: CommunityPortfolio['holdings']
  ): Promise<CommunityPortfolio> {
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const totalReturn = holdings.reduce((sum, h) => sum + (h.value * h.percentage / 100), 0);

    const portfolio: CommunityPortfolio = {
      id: `portfolio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      traderId,
      traderUsername,
      totalValue,
      totalReturn,
      holdings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.communityPortfolios.set(portfolio.id, portfolio);
    await this.persistData();

    return portfolio;
  }

  /**
   * Get community portfolio
   */
  getCommunityPortfolio(traderId: string): CommunityPortfolio | undefined {
    return Array.from(this.communityPortfolios.values()).find(p => p.traderId === traderId);
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit: number = 100): LeaderboardEntry[] {
    return this.leaderboard.slice(0, limit);
  }

  /**
   * Update leaderboard
   */
  async updateLeaderboard(): Promise<void> {
    this.leaderboard = Array.from(this.traders.values())
      .sort((a, b) => {
        const aScore = (b.totalReturn * 0.5) + (b.winRate * 0.3) + (b.followers * 0.2);
        const bScore = (a.totalReturn * 0.5) + (a.winRate * 0.3) + (a.followers * 0.2);
        return bScore - aScore;
      })
      .map((trader, index) => ({
        rank: index + 1,
        traderId: trader.id,
        traderUsername: trader.username,
        avatar: trader.avatar,
        totalReturn: trader.totalReturn,
        winRate: trader.winRate,
        followers: trader.followers,
        verified: trader.verified,
      }));

    await this.persistData();
  }

  /**
   * Get trader statistics
   */
  getTraderStats(traderId: string): {
    totalTrades: number;
    successfulTrades: number;
    failedTrades: number;
    averageROI: number;
    bestTrade: number;
    worstTrade: number;
  } | null {
    const trades = this.getCopyTrades(traderId);
    if (trades.length === 0) return null;

    const successful = trades.filter(t => t.status === 'executed').length;
    const failed = trades.filter(t => t.status === 'failed').length;

    return {
      totalTrades: trades.length,
      successfulTrades: successful,
      failedTrades: failed,
      averageROI: (successful / trades.length) * 100,
      bestTrade: Math.max(...trades.map(t => t.amount)),
      worstTrade: Math.min(...trades.map(t => t.amount)),
    };
  }

  /**
   * Get trending traders
   */
  getTrendingTraders(limit: number = 10): Trader[] {
    return Array.from(this.traders.values())
      .sort((a, b) => b.followers - a.followers)
      .slice(0, limit);
  }

  /**
   * Get top performers
   */
  getTopPerformers(limit: number = 10): Trader[] {
    return Array.from(this.traders.values())
      .sort((a, b) => b.totalReturn - a.totalReturn)
      .slice(0, limit);
  }

  /**
   * Get highest win rate
   */
  getHighestWinRate(limit: number = 10): Trader[] {
    return Array.from(this.traders.values())
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit);
  }

  /**
   * Is following trader
   */
  isFollowing(traderId: string): boolean {
    return this.userFollowing.has(traderId);
  }

  /**
   * Get auto-copy status
   */
  getAutoCopyStatus(traderId: string): boolean {
    return this.userFollowing.get(traderId)?.autoCP || false;
  }

  /**
   * Set auto-copy
   */
  async setAutoCopy(traderId: string, enabled: boolean): Promise<boolean> {
    const following = this.userFollowing.get(traderId);
    if (!following) return false;

    following.autoCP = enabled;
    await this.persistData();

    return true;
  }

  /**
   * Persist data
   */
  private async persistData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(this.TRADERS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.traders))),
        AsyncStorage.setItem(this.COPY_TRADES_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.copyTrades))),
        AsyncStorage.setItem(this.PORTFOLIOS_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.communityPortfolios))),
        AsyncStorage.setItem(this.FOLLOWING_STORAGE_KEY, JSON.stringify(Object.fromEntries(this.userFollowing))),
        AsyncStorage.setItem(this.LEADERBOARD_STORAGE_KEY, JSON.stringify(this.leaderboard)),
      ]);
    } catch (error) {
      console.error('Failed to persist social trading data:', error);
    }
  }

  /**
   * Load data
   */
  private async loadData(): Promise<void> {
    try {
      const [traders, copyTrades, portfolios, following, leaderboard] = await Promise.all([
        AsyncStorage.getItem(this.TRADERS_STORAGE_KEY),
        AsyncStorage.getItem(this.COPY_TRADES_STORAGE_KEY),
        AsyncStorage.getItem(this.PORTFOLIOS_STORAGE_KEY),
        AsyncStorage.getItem(this.FOLLOWING_STORAGE_KEY),
        AsyncStorage.getItem(this.LEADERBOARD_STORAGE_KEY),
      ]);

      if (traders) this.traders = new Map(Object.entries(JSON.parse(traders)));
      if (copyTrades) this.copyTrades = new Map(Object.entries(JSON.parse(copyTrades)));
      if (portfolios) this.communityPortfolios = new Map(Object.entries(JSON.parse(portfolios)));
      if (following) this.userFollowing = new Map(Object.entries(JSON.parse(following)));
      if (leaderboard) this.leaderboard = JSON.parse(leaderboard);
    } catch (error) {
      console.error('Failed to load social trading data:', error);
    }
  }
}

export const socialTradingService = new SocialTradingService();
