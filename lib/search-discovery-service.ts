/**
 * Advanced Search & Discovery Engine Service
 * Full-text search, filtering, and personalized recommendations
 */

export interface SearchResult {
  id: string;
  type: 'portfolio' | 'trader' | 'signal' | 'post' | 'stream' | 'asset';
  title: string;
  description: string;
  metadata: Record<string, any>;
  relevanceScore: number;
  timestamp: number;
}

export interface SearchFilter {
  type?: string;
  asset?: string;
  minReputation?: number;
  minAccuracy?: number;
  dateRange?: { from: number; to: number };
  isPremium?: boolean;
  sortBy?: 'relevance' | 'recent' | 'popular' | 'accuracy';
}

export interface SearchQuery {
  id: string;
  userId: string;
  query: string;
  filters: SearchFilter;
  results: SearchResult[];
  executedAt: number;
  resultCount: number;
}

export interface Recommendation {
  id: string;
  userId: string;
  type: 'trader' | 'signal' | 'portfolio' | 'asset' | 'stream';
  targetId: string;
  title: string;
  reason: string;
  score: number;
  createdAt: number;
}

export interface TrendingItem {
  id: string;
  type: 'asset' | 'trader' | 'signal' | 'hashtag';
  title: string;
  volume: number;
  trend: 'up' | 'down' | 'stable';
  trendStrength: number;
  timestamp: number;
}

export interface SearchHistory {
  userId: string;
  queries: SearchQuery[];
  maxItems: number;
}

class AdvancedSearchDiscoveryService {
  private searchIndex: Map<string, SearchResult[]> = new Map();
  private searchHistory: Map<string, SearchHistory> = new Map();
  private recommendations: Map<string, Recommendation[]> = new Map();
  private trendingItems: Map<string, TrendingItem[]> = new Map();
  private userPreferences: Map<string, Record<string, any>> = new Map();

  constructor() {
    this.initializeSearchIndex();
    this.initializeTrendingItems();
  }

  /**
   * Initialize search index
   */
  private initializeSearchIndex(): void {
    const mockResults: SearchResult[] = [
      {
        id: 'trader_1',
        type: 'trader',
        title: 'Pro Trader - Bitcoin Expert',
        description: 'Experienced trader with 5+ years in crypto',
        metadata: { reputation: 95, followers: 5000, accuracy: 87 },
        relevanceScore: 0.95,
        timestamp: Date.now(),
      },
      {
        id: 'signal_1',
        type: 'signal',
        title: 'BTC Buy Signal - Strong Support',
        description: 'Bitcoin showing strong support at $42k',
        metadata: { asset: 'BTC', type: 'buy', confidence: 85 },
        relevanceScore: 0.88,
        timestamp: Date.now(),
      },
      {
        id: 'portfolio_1',
        type: 'portfolio',
        title: 'Diversified DeFi Portfolio',
        description: 'Balanced portfolio with 10+ assets',
        metadata: { assets: 10, value: 100000, performance: 25 },
        relevanceScore: 0.82,
        timestamp: Date.now(),
      },
    ];

    this.searchIndex.set('default', mockResults);
  }

  /**
   * Initialize trending items
   */
  private initializeTrendingItems(): void {
    const trending: TrendingItem[] = [
      {
        id: 'BTC',
        type: 'asset',
        title: 'Bitcoin',
        volume: 50000000000,
        trend: 'up',
        trendStrength: 75,
        timestamp: Date.now(),
      },
      {
        id: 'ETH',
        type: 'asset',
        title: 'Ethereum',
        volume: 30000000000,
        trend: 'up',
        trendStrength: 65,
        timestamp: Date.now(),
      },
      {
        id: 'defi',
        type: 'hashtag',
        title: '#DeFi',
        volume: 10000,
        trend: 'stable',
        trendStrength: 50,
        timestamp: Date.now(),
      },
    ];

    this.trendingItems.set('global', trending);
  }

  /**
   * Search
   */
  search(userId: string, query: string, filters: SearchFilter = {}, limit: number = 20): SearchResult[] {
    const searchQuery: SearchQuery = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      query,
      filters,
      results: [],
      executedAt: Date.now(),
      resultCount: 0,
    };

    // Get indexed results
    let results = this.searchIndex.get('default') || [];

    // Apply text filter
    results = results.filter(r =>
      r.title.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase())
    );

    // Apply type filter
    if (filters.type) {
      results = results.filter(r => r.type === filters.type);
    }

    // Apply asset filter
    if (filters.asset) {
      results = results.filter(r => r.metadata.asset === filters.asset);
    }

    // Apply reputation filter
    if (filters.minReputation) {
      results = results.filter(r => (r.metadata.reputation || 0) >= filters.minReputation!);
    }

    // Apply accuracy filter
    if (filters.minAccuracy) {
      results = results.filter(r => (r.metadata.accuracy || 0) >= filters.minAccuracy!);
    }

    // Sort results
    const sortBy = filters.sortBy || 'relevance';
    if (sortBy === 'relevance') {
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else if (sortBy === 'recent') {
      results.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortBy === 'popular') {
      results.sort((a, b) => (b.metadata.followers || 0) - (a.metadata.followers || 0));
    } else if (sortBy === 'accuracy') {
      results.sort((a, b) => (b.metadata.accuracy || 0) - (a.metadata.accuracy || 0));
    }

    searchQuery.results = results.slice(0, limit);
    searchQuery.resultCount = results.length;

    // Save search history
    if (!this.searchHistory.has(userId)) {
      this.searchHistory.set(userId, { userId, queries: [], maxItems: 50 });
    }

    const history = this.searchHistory.get(userId)!;
    history.queries.push(searchQuery);

    if (history.queries.length > history.maxItems) {
      history.queries.shift();
    }

    return searchQuery.results;
  }

  /**
   * Get search suggestions
   */
  getSearchSuggestions(query: string, limit: number = 10): string[] {
    const suggestions = [
      'Bitcoin trading strategies',
      'Ethereum DeFi protocols',
      'Top traders 2024',
      'Yield farming opportunities',
      'NFT market analysis',
      'Portfolio rebalancing',
      'Tax optimization',
      'Risk management',
      'Trading signals',
      'Market analysis',
    ];

    return suggestions
      .filter(s => s.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);
  }

  /**
   * Get personalized recommendations
   */
  getPersonalizedRecommendations(userId: string, limit: number = 10): Recommendation[] {
    if (!this.recommendations.has(userId)) {
      this.recommendations.set(userId, []);
    }

    const recommendations = this.recommendations.get(userId)!;

    // Generate recommendations based on user preferences
    const preferences = this.userPreferences.get(userId) || {};

    if (recommendations.length === 0) {
      // Generate default recommendations
      const defaultRecommendations: Recommendation[] = [
        {
          id: 'rec_1',
          userId,
          type: 'trader',
          targetId: 'trader_1',
          title: 'Pro Trader - Bitcoin Expert',
          reason: 'Based on your interest in Bitcoin trading',
          score: 0.92,
          createdAt: Date.now(),
        },
        {
          id: 'rec_2',
          userId,
          type: 'signal',
          targetId: 'signal_1',
          title: 'BTC Buy Signal',
          reason: 'High accuracy signal matching your preferences',
          score: 0.88,
          createdAt: Date.now(),
        },
        {
          id: 'rec_3',
          userId,
          type: 'portfolio',
          targetId: 'portfolio_1',
          title: 'Diversified DeFi Portfolio',
          reason: 'Similar to your investment style',
          score: 0.85,
          createdAt: Date.now(),
        },
      ];

      this.recommendations.set(userId, defaultRecommendations);
      return defaultRecommendations.slice(0, limit);
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get trending items
   */
  getTrendingItems(category: 'asset' | 'trader' | 'signal' | 'hashtag' = 'asset', limit: number = 10): TrendingItem[] {
    const trending = this.trendingItems.get('global') || [];

    return trending
      .filter(t => t.type === category)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);
  }

  /**
   * Get search history
   */
  getSearchHistory(userId: string, limit: number = 20): SearchQuery[] {
    const history = this.searchHistory.get(userId);
    if (!history) return [];

    return history.queries.slice(-limit).reverse();
  }

  /**
   * Clear search history
   */
  clearSearchHistory(userId: string): boolean {
    const history = this.searchHistory.get(userId);
    if (!history) return false;

    history.queries = [];
    return true;
  }

  /**
   * Set user preferences
   */
  setUserPreferences(userId: string, preferences: Record<string, any>): void {
    this.userPreferences.set(userId, preferences);
  }

  /**
   * Get user preferences
   */
  getUserPreferences(userId: string): Record<string, any> {
    return this.userPreferences.get(userId) || {};
  }

  /**
   * Get discovery feed
   */
  getDiscoveryFeed(userId: string, limit: number = 20): SearchResult[] {
    const preferences = this.getUserPreferences(userId);
    const recommendations = this.getPersonalizedRecommendations(userId, limit);

    // Combine recommendations with trending items
    const feed: SearchResult[] = recommendations.map(rec => ({
      id: rec.id,
      type: rec.type,
      title: rec.title,
      description: rec.reason,
      metadata: { score: rec.score },
      relevanceScore: rec.score,
      timestamp: rec.createdAt,
    }));

    return feed.slice(0, limit);
  }

  /**
   * Get related items
   */
  getRelatedItems(itemId: string, type: string, limit: number = 5): SearchResult[] {
    const results = this.searchIndex.get('default') || [];

    return results
      .filter(r => r.type === type && r.id !== itemId)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(userId: string): {
    totalSearches: number;
    topQueries: string[];
    averageResultsPerSearch: number;
    lastSearchTime: number;
  } {
    const history = this.searchHistory.get(userId);
    if (!history || history.queries.length === 0) {
      return {
        totalSearches: 0,
        topQueries: [],
        averageResultsPerSearch: 0,
        lastSearchTime: 0,
      };
    }

    const queries = history.queries;
    const queryMap = new Map<string, number>();

    for (const query of queries) {
      queryMap.set(query.query, (queryMap.get(query.query) || 0) + 1);
    }

    const topQueries = Array.from(queryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query]) => query);

    const totalResults = queries.reduce((sum, q) => sum + q.resultCount, 0);

    return {
      totalSearches: queries.length,
      topQueries,
      averageResultsPerSearch: totalResults / queries.length,
      lastSearchTime: queries[queries.length - 1].executedAt,
    };
  }
}

export const advancedSearchDiscoveryService = new AdvancedSearchDiscoveryService();
