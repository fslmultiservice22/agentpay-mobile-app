export interface TraderProfile {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  totalTrades: number;
  winRate: number;
  totalProfit: number;
  roi: number;
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TraderStats {
  traderId: string;
  totalVolume: number;
  averageProfit: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  trades24h: number;
  trades7d: number;
  trades30d: number;
}

export interface SharedTrade {
  id: string;
  traderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  profit?: number;
  roi?: number;
  timestamp: number;
  description?: string;
  likes: number;
  comments: number;
}

export interface CopyTrade {
  id: string;
  userId: string;
  traderId: string;
  tradeId: string;
  status: 'pending' | 'active' | 'closed' | 'failed';
  copyPercentage: number;
  entryPrice: number;
  exitPrice?: number;
  profit?: number;
  roi?: number;
  createdAt: number;
  closedAt?: number;
}

export interface TraderFollow {
  id: string;
  userId: string;
  traderId: string;
  followedAt: number;
  autoTrade: boolean;
  copyPercentage: number;
}

export interface TradeComment {
  id: string;
  tradeId: string;
  userId: string;
  username: string;
  avatar: string;
  comment: string;
  likes: number;
  createdAt: number;
}

/**
 * Generate mock trader profiles
 */
export function generateMockTraderProfiles(): TraderProfile[] {
  const names = ['CryptoKing', 'DeFiGuru', 'SwapMaster', 'BlockchainPro', 'TokenTrader'];
  return names.map((name, i) => ({
    id: `trader_${i}`,
    username: name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    bio: `Professional trader with ${5 + i * 2} years of experience`,
    followers: Math.floor(Math.random() * 10000) + 1000,
    following: Math.floor(Math.random() * 500) + 50,
    totalTrades: Math.floor(Math.random() * 5000) + 100,
    winRate: Math.random() * 0.4 + 0.55,
    totalProfit: Math.random() * 100000 + 10000,
    roi: Math.random() * 200 + 50,
    verified: i < 3,
    createdAt: Date.now() - Math.random() * 31536000000,
    updatedAt: Date.now(),
  }));
}

/**
 * Generate mock trader stats
 */
export function generateMockTraderStats(traderId: string): TraderStats {
  return {
    traderId,
    totalVolume: Math.random() * 1000000 + 100000,
    averageProfit: Math.random() * 5000 + 500,
    largestWin: Math.random() * 50000 + 5000,
    largestLoss: -(Math.random() * 20000 + 1000),
    profitFactor: Math.random() * 2 + 1.5,
    sharpeRatio: Math.random() * 2 + 1,
    maxDrawdown: Math.random() * 0.3 + 0.1,
    trades24h: Math.floor(Math.random() * 50) + 5,
    trades7d: Math.floor(Math.random() * 200) + 20,
    trades30d: Math.floor(Math.random() * 800) + 100,
  };
}

/**
 * Generate mock shared trades
 */
export function generateMockSharedTrades(traderId: string, count: number = 10): SharedTrade[] {
  const symbols = ['ETH/USDC', 'BTC/USDT', 'MATIC/USDC', 'ARB/USDT', 'OP/USDC'];
  const trades: SharedTrade[] = [];

  for (let i = 0; i < count; i++) {
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const entryPrice = Math.random() * 3000 + 100;
    const exitPrice = entryPrice * (1 + (Math.random() - 0.5) * 0.2);
    const amount = Math.random() * 10 + 0.1;
    const profit = (exitPrice - entryPrice) * amount;
    const roi = ((exitPrice - entryPrice) / entryPrice) * 100;

    trades.push({
      id: `trade_${i}`,
      traderId,
      symbol,
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      entryPrice,
      exitPrice,
      amount,
      profit,
      roi,
      timestamp: Date.now() - Math.random() * 2592000000,
      description: `Great ${symbol} trade! Check my analysis.`,
      likes: Math.floor(Math.random() * 500),
      comments: Math.floor(Math.random() * 50),
    });
  }

  return trades;
}

/**
 * Calculate trader performance metrics
 */
export function calculateTraderMetrics(trades: SharedTrade[]): TraderStats {
  const closedTrades = trades.filter((t) => t.exitPrice && t.profit !== undefined);
  const winningTrades = closedTrades.filter((t) => (t.profit || 0) > 0);
  const losingTrades = closedTrades.filter((t) => (t.profit || 0) <= 0);

  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalVolume = trades.reduce((sum, t) => sum + t.entryPrice * t.amount, 0);
  const winSum = winningTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const lossSum = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profit || 0), 0));

  return {
    traderId: 'unknown',
    totalVolume,
    averageProfit: closedTrades.length > 0 ? totalProfit / closedTrades.length : 0,
    largestWin: Math.max(...winningTrades.map((t) => t.profit || 0), 0),
    largestLoss: Math.min(...losingTrades.map((t) => t.profit || 0), 0),
    profitFactor: lossSum > 0 ? winSum / lossSum : winSum > 0 ? Infinity : 0,
    sharpeRatio: calculateSharpeRatio(closedTrades),
    maxDrawdown: calculateMaxDrawdown(closedTrades),
    trades24h: trades.filter((t) => Date.now() - t.timestamp < 86400000).length,
    trades7d: trades.filter((t) => Date.now() - t.timestamp < 604800000).length,
    trades30d: trades.filter((t) => Date.now() - t.timestamp < 2592000000).length,
  };
}

/**
 * Calculate Sharpe Ratio
 */
function calculateSharpeRatio(trades: SharedTrade[]): number {
  if (trades.length < 2) return 0;

  const returns = trades.map((t) => (t.roi || 0) / 100);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev > 0 ? (mean * 252) / stdDev : 0; // 252 trading days
}

/**
 * Calculate Maximum Drawdown
 */
function calculateMaxDrawdown(trades: SharedTrade[]): number {
  if (trades.length === 0) return 0;

  let peak = 0;
  let maxDrawdown = 0;
  let cumProfit = 0;

  trades.forEach((trade) => {
    cumProfit += trade.profit || 0;
    if (cumProfit > peak) {
      peak = cumProfit;
    }
    const drawdown = (peak - cumProfit) / (peak || 1);
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  });

  return maxDrawdown;
}

/**
 * Validate copy trade parameters
 */
export function validateCopyTrade(
  copyPercentage: number,
  balance: number,
  minAmount: number
): { valid: boolean; error?: string } {
  if (copyPercentage <= 0 || copyPercentage > 100) {
    return { valid: false, error: 'Copy percentage must be between 1 and 100' };
  }

  const copyAmount = balance * (copyPercentage / 100);
  if (copyAmount < minAmount) {
    return { valid: false, error: `Minimum copy amount is ${minAmount}` };
  }

  return { valid: true };
}

/**
 * Format trader profile for display
 */
export function formatTraderProfile(profile: TraderProfile): string {
  return `${profile.username} - ${profile.winRate.toFixed(1)}% WR | ${profile.roi.toFixed(1)}% ROI`;
}

/**
 * Calculate copy trade amount
 */
export function calculateCopyTradeAmount(
  tradeAmount: number,
  copyPercentage: number,
  userBalance: number
): number {
  const maxAmount = userBalance * (copyPercentage / 100);
  return Math.min(tradeAmount, maxAmount);
}

/**
 * Get trader rank based on metrics
 */
export function getTraderRank(stats: TraderStats): string {
  const winRate = stats.averageProfit > 0 ? 0.6 : 0.4; // Simplified win rate calculation
  if (stats.profitFactor > 3 && winRate > 0.65) return 'Elite';
  if (stats.profitFactor > 2 && winRate > 0.6) return 'Expert';
  if (stats.profitFactor > 1.5 && winRate > 0.55) return 'Advanced';
  if (stats.profitFactor > 1 && winRate > 0.5) return 'Intermediate';
  return 'Beginner';
}

/**
 * Calculate trader score (0-100)
 */
export function calculateTraderScore(stats: TraderStats): number {
  const profitFactorScore = Math.min(stats.profitFactor * 10, 30);
  const winRateScore = stats.averageProfit > 0 ? Math.min(stats.averageProfit / 100, 30) : 0;
  const sharpeScore = Math.min(stats.sharpeRatio * 10, 20);
  const drawdownScore = Math.max(20 - stats.maxDrawdown * 100, 0);

  return Math.min(profitFactorScore + winRateScore + sharpeScore + drawdownScore, 100);
}
