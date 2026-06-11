export type LeaderboardMetric = 'roi' | 'winRate' | 'profit' | 'followers' | 'trades';
export type LeaderboardTimeframe = '24h' | '7d' | '30d' | 'all';

export interface LeaderboardEntry {
  rank: number;
  traderId: string;
  username: string;
  avatar: string;
  verified: boolean;
  metric: number;
  metricLabel: string;
  followers: number;
  badge?: 'gold' | 'silver' | 'bronze';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

export interface LeaderboardStats {
  metric: LeaderboardMetric;
  timeframe: LeaderboardTimeframe;
  totalTraders: number;
  topTrader: LeaderboardEntry;
  averageMetric: number;
  medianMetric: number;
}

export interface RankingBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: (stats: any) => boolean;
}

/**
 * Get ranking badges
 */
export const RANKING_BADGES: RankingBadge[] = [
  {
    id: 'elite',
    name: 'Elite Trader',
    description: 'ROI > 200% and Win Rate > 70%',
    icon: '👑',
    color: '#FFD700',
    requirement: (stats) => stats.roi > 200 && stats.winRate > 0.7,
  },
  {
    id: 'expert',
    name: 'Expert Trader',
    description: 'ROI > 100% and Win Rate > 60%',
    icon: '⭐',
    color: '#C0C0C0',
    requirement: (stats) => stats.roi > 100 && stats.winRate > 0.6,
  },
  {
    id: 'consistent',
    name: 'Consistent Performer',
    description: '50+ trades with Win Rate > 55%',
    icon: '📈',
    color: '#CD7F32',
    requirement: (stats) => stats.totalTrades > 50 && stats.winRate > 0.55,
  },
  {
    id: 'rising',
    name: 'Rising Star',
    description: 'Rank improved by 10+ positions in 7 days',
    icon: '🚀',
    color: '#FF6B6B',
    requirement: (stats) => stats.rankImprovement > 10,
  },
  {
    id: 'popular',
    name: 'Popular Trader',
    description: '1000+ followers',
    icon: '👥',
    color: '#4ECDC4',
    requirement: (stats) => stats.followers > 1000,
  },
  {
    id: 'profitable',
    name: 'Profitable',
    description: 'Total profit > $10,000',
    icon: '💰',
    color: '#95E1D3',
    requirement: (stats) => stats.totalProfit > 10000,
  },
];

/**
 * Calculate leaderboard rank
 */
export function calculateLeaderboardRank(
  traders: any[],
  metric: LeaderboardMetric,
  timeframe: LeaderboardTimeframe
): LeaderboardEntry[] {
  const entries = traders.map((trader, index) => {
    let metricValue = 0;
    let metricLabel = '';

    switch (metric) {
      case 'roi':
        metricValue = trader.roi || 0;
        metricLabel = `${metricValue.toFixed(1)}%`;
        break;
      case 'winRate':
        metricValue = (trader.winRate || 0) * 100;
        metricLabel = `${metricValue.toFixed(1)}%`;
        break;
      case 'profit':
        metricValue = trader.totalProfit || 0;
        metricLabel = `$${(metricValue / 1000).toFixed(1)}K`;
        break;
      case 'followers':
        metricValue = trader.followers || 0;
        metricLabel = metricValue.toLocaleString();
        break;
      case 'trades':
        metricValue = trader.totalTrades || 0;
        metricLabel = metricValue.toLocaleString();
        break;
    }

    const trendRandom = Math.random();
    const trend: 'up' | 'down' | 'stable' = trendRandom > 0.66 ? 'up' : trendRandom > 0.33 ? 'down' : 'stable';
    
    return {
      rank: index + 1,
      traderId: trader.id,
      username: trader.username,
      avatar: trader.avatar,
      verified: trader.verified || false,
      metric: metricValue,
      metricLabel,
      followers: trader.followers || 0,
      badge: getBadgeForRank(index + 1),
      trend,
      trendValue: Math.random() * 10,
    };
  });

  // Sort by metric
  return entries.sort((a, b) => b.metric - a.metric).map((entry, index) => {
    const trendRandom = Math.random();
    const trend: 'up' | 'down' | 'stable' = trendRandom > 0.66 ? 'up' : trendRandom > 0.33 ? 'down' : 'stable';
    return {
      ...entry,
      rank: index + 1,
      trend,
    };
  });
}

/**
 * Get badge for rank
 */
function getBadgeForRank(rank: number): 'gold' | 'silver' | 'bronze' | undefined {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return undefined;
}

/**
 * Calculate leaderboard statistics
 */
export function calculateLeaderboardStats(
  entries: LeaderboardEntry[],
  metric: LeaderboardMetric,
  timeframe: LeaderboardTimeframe
): LeaderboardStats {
  const metrics = entries.map((e) => e.metric);
  const sum = metrics.reduce((a, b) => a + b, 0);
  const average = metrics.length > 0 ? sum / metrics.length : 0;
  const sorted = [...metrics].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0 ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : sorted[Math.floor(sorted.length / 2)];

  return {
    metric,
    timeframe,
    totalTraders: entries.length,
    topTrader: entries[0] || ({} as LeaderboardEntry),
    averageMetric: average,
    medianMetric: median,
  };
}

/**
 * Filter leaderboard by timeframe
 */
export function filterLeaderboardByTimeframe(entries: LeaderboardEntry[], timeframe: LeaderboardTimeframe): LeaderboardEntry[] {
  // In a real app, this would filter based on actual timeframe data
  // For now, we'll just return all entries
  return entries;
}

/**
 * Get trader badges
 */
export function getTraderBadges(stats: Record<string, any>): RankingBadge[] {
  return RANKING_BADGES.filter((badge) => badge.requirement(stats));
}

/**
 * Format leaderboard entry for display
 */
export function formatLeaderboardEntry(entry: LeaderboardEntry): string {
  const badge = entry.badge ? (entry.badge === 'gold' ? '🥇' : entry.badge === 'silver' ? '🥈' : '🥉') : '';
  return `${badge} #${entry.rank} ${entry.username} - ${entry.metricLabel}`;
}

/**
 * Get leaderboard color by rank
 */
export function getLeaderboardColor(rank: number): string {
  if (rank === 1) return '#FFD700'; // Gold
  if (rank === 2) return '#C0C0C0'; // Silver
  if (rank === 3) return '#CD7F32'; // Bronze
  return '#9BA1A6'; // Default
}

/**
 * Calculate rank change
 */
export function calculateRankChange(previousRank: number, currentRank: number): { direction: 'up' | 'down' | 'stable'; change: number } {
  const change = previousRank - currentRank;
  if (change > 0) return { direction: 'up', change };
  if (change < 0) return { direction: 'down', change: Math.abs(change) };
  return { direction: 'stable', change: 0 };
}

/**
 * Get top traders
 */
export function getTopTraders(entries: LeaderboardEntry[], count: number = 10): LeaderboardEntry[] {
  return entries.slice(0, count);
}

/**
 * Get trader percentile
 */
export function getTraderPercentile(rank: number, totalTraders: number): number {
  return Math.round(((totalTraders - rank) / totalTraders) * 100);
}

/**
 * Validate leaderboard metric
 */
export function validateLeaderboardMetric(metric: string): metric is LeaderboardMetric {
  return ['roi', 'winRate', 'profit', 'followers', 'trades'].includes(metric);
}

/**
 * Validate leaderboard timeframe
 */
export function validateLeaderboardTimeframe(timeframe: string): timeframe is LeaderboardTimeframe {
  return ['24h', '7d', '30d', 'all'].includes(timeframe);
}
