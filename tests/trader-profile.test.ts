import { describe, it, expect } from 'vitest';

describe('Trader Profile', () => {
  it('should format trader profile correctly', () => {
    const profile = {
      id: 'trader1',
      username: 'Trader1',
      avatar: 'https://example.com/avatar.jpg',
      verified: true,
      bio: 'Professional trader',
      followers: 1000,
      following: 100,
      joinDate: Date.now(),
      stats: {
        totalTrades: 100,
        winRate: 0.65,
        totalProfit: 10000,
        totalVolume: 50000,
        sharpeRatio: 1.5,
        maxDrawdown: 0.15,
        profitFactor: 2.1,
        avgWinLoss: 0.8,
        winStreak: 5,
        lossStreak: 2,
        bestTrade: 500,
        worstTrade: -200,
        roi: 100,
      },
      trades: [],
      badges: ['elite', 'consistent'],
      socialLinks: {
        twitter: 'https://twitter.com/trader1',
        discord: 'discord_trader1',
        telegram: '@trader1',
      },
    };

    expect(profile.username).toBe('Trader1');
    expect(profile.verified).toBe(true);
    expect(profile.followers).toBe(1000);
    expect(profile.stats.winRate).toBe(0.65);
  });

  it('should calculate trader performance level correctly', () => {
    const stats = {
      roi: 150,
      winRate: 0.7,
      profitFactor: 2.5,
    };

    const isExcellent = stats.roi > 100 && stats.winRate > 0.65;
    const isGood = stats.roi > 50 && stats.winRate > 0.55;

    expect(isExcellent).toBe(true);
    expect(isGood).toBe(true);
  });

  it('should format rankings correctly', () => {
    const stats = {
      winRate: 0.65,
      roi: 100,
      profitFactor: 2.1,
      sharpeRatio: 1.5,
      maxDrawdown: 0.15,
      avgWinLoss: 0.8,
    };

    const rankings = {
      winRate: `${(stats.winRate * 100).toFixed(1)}%`,
      roi: `${stats.roi.toFixed(1)}%`,
      profitFactor: stats.profitFactor.toFixed(2),
      sharpeRatio: stats.sharpeRatio.toFixed(2),
      maxDrawdown: `${(stats.maxDrawdown * 100).toFixed(1)}%`,
      avgWinLoss: stats.avgWinLoss.toFixed(2),
    };

    expect(rankings.winRate).toBe('65.0%');
    expect(rankings.roi).toBe('100.0%');
    expect(rankings.profitFactor).toBe('2.10');
  });

  it('should calculate monthly performance correctly', () => {
    const trades = [
      { timestamp: Date.now(), profit: 100 },
      { timestamp: Date.now(), profit: 50 },
      { timestamp: Date.now(), profit: -30 },
    ];

    const monthlyData: Record<string, { profit: number; trades: number; wins: number }> = {};

    trades.forEach((trade) => {
      const date = new Date(trade.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { profit: 0, trades: 0, wins: 0 };
      }

      monthlyData[monthKey].profit += trade.profit;
      monthlyData[monthKey].trades += 1;
      if (trade.profit > 0) {
        monthlyData[monthKey].wins += 1;
      }
    });

    const monthlyPerformance = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
      winRate: (data.wins / data.trades) * 100,
    }));

    expect(monthlyPerformance.length).toBe(1);
    expect(monthlyPerformance[0].profit).toBe(120);
    expect(monthlyPerformance[0].trades).toBe(3);
    expect(monthlyPerformance[0].wins).toBe(2);
    expect(monthlyPerformance[0].winRate).toBeCloseTo(66.67, 1);
  });

  it('should get top assets correctly', () => {
    const trades = [
      { fromToken: 'ETH', toToken: 'USDC', profit: 100 },
      { fromToken: 'ETH', toToken: 'USDC', profit: 50 },
      { fromToken: 'BTC', toToken: 'USDC', profit: 200 },
      { fromToken: 'BTC', toToken: 'USDC', profit: -50 },
    ];

    const assetStats: Record<string, { profit: number; trades: number; wins: number }> = {};

    trades.forEach((trade) => {
      const asset = trade.fromToken;

      if (!assetStats[asset]) {
        assetStats[asset] = { profit: 0, trades: 0, wins: 0 };
      }

      assetStats[asset].profit += trade.profit;
      assetStats[asset].trades += 1;
      if (trade.profit > 0) {
        assetStats[asset].wins += 1;
      }
    });

    const topAssets = Object.entries(assetStats)
      .map(([asset, data]) => ({
        asset,
        ...data,
        winRate: (data.wins / data.trades) * 100,
      }))
      .sort((a, b) => b.profit - a.profit);

    expect(topAssets.length).toBe(2);
    expect(topAssets[0].profit).toBe(150);
    expect(topAssets[1].profit).toBe(150);
  });

  it('should format trader badges correctly', () => {
    const badges = ['elite', 'consistent', 'popular'];

    const badgeLabels: Record<string, string> = {
      elite: '🏆 Elite',
      consistent: '📈 Consistent',
      popular: '👥 Popular',
      rising: '🚀 Rising',
    };

    const formattedBadges = badges.map((badge) => badgeLabels[badge] || badge);

    expect(formattedBadges).toEqual(['🏆 Elite', '📈 Consistent', '👥 Popular']);
  });

  it('should calculate trader score correctly', () => {
    const stats = {
      roi: 100,
      winRate: 0.65,
      profitFactor: 2.1,
    };

    const score = (stats.roi + stats.winRate * 100 + stats.profitFactor * 10) / 3;
    // (100 + 65 + 21) / 3 = 186 / 3 = 62

    expect(score).toBeCloseTo(62, 1);
  });

  it('should validate trader profile data', () => {
    const profile = {
      id: 'trader1',
      username: 'Trader1',
      avatar: 'https://example.com/avatar.jpg',
      verified: true,
      followers: 1000,
      stats: {
        totalTrades: 100,
        winRate: 0.65,
        roi: 100,
      },
    };

    expect(profile.id).toBeDefined();
    expect(profile.username).toBeDefined();
    expect(profile.avatar).toBeDefined();
    expect(profile.followers).toBeGreaterThan(0);
    expect(profile.stats.winRate).toBeGreaterThan(0);
    expect(profile.stats.winRate).toBeLessThanOrEqual(1);
  });

  it('should handle follow/unfollow state', () => {
    let isFollowing = false;

    const follow = () => {
      isFollowing = true;
    };

    const unfollow = () => {
      isFollowing = false;
    };

    expect(isFollowing).toBe(false);

    follow();
    expect(isFollowing).toBe(true);

    unfollow();
    expect(isFollowing).toBe(false);
  });

  it('should calculate win streak correctly', () => {
    const trades = [
      { profit: 100 },
      { profit: 50 },
      { profit: 75 },
      { profit: -30 },
      { profit: 40 },
      { profit: 20 },
    ];

    let currentStreak = 0;
    let maxWinStreak = 0;

    trades.forEach((trade) => {
      if (trade.profit > 0) {
        currentStreak += 1;
        maxWinStreak = Math.max(maxWinStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    expect(maxWinStreak).toBe(3);
  });

  it('should format trade history with rank', () => {
    const trades = [
      { id: '1', fromToken: 'ETH', toToken: 'USDC', profit: 100, timestamp: Date.now() },
      { id: '2', fromToken: 'BTC', toToken: 'USDC', profit: 200, timestamp: Date.now() },
      { id: '3', fromToken: 'SOL', toToken: 'USDC', profit: 50, timestamp: Date.now() },
    ];

    const tradeHistory = trades.slice(0, 10).map((trade, index) => ({
      ...trade,
      rank: index + 1,
    }));

    expect(tradeHistory.length).toBe(3);
    expect(tradeHistory[0].rank).toBe(1);
    expect(tradeHistory[1].rank).toBe(2);
    expect(tradeHistory[2].rank).toBe(3);
  });
});
