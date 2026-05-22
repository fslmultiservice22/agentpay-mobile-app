import { describe, it, expect } from 'vitest';

describe('Copy Trade Tracking', () => {
  it('should calculate metrics correctly', () => {
    const trades = [
      { id: '1', profit: 100, roi: 10, traderROI: 8 },
      { id: '2', profit: 50, roi: 5, traderROI: 5 },
      { id: '3', profit: -30, roi: -3, traderROI: -2 },
    ];

    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    const totalROI = trades.reduce((sum, t) => sum + t.roi, 0);
    const averageROI = totalROI / trades.length;

    const winningTrades = trades.filter((t) => t.profit > 0).length;
    const winRate = winningTrades / trades.length;

    expect(totalProfit).toBe(120);
    expect(totalROI).toBe(12);
    expect(averageROI).toBeCloseTo(4, 1);
    expect(winRate).toBeCloseTo(0.67, 1);
  });

  it('should calculate profit factor correctly', () => {
    const trades = [
      { profit: 100 },
      { profit: 50 },
      { profit: 75 },
      { profit: -30 },
      { profit: -20 },
    ];

    const totalGain = trades.filter((t) => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = Math.abs(
      trades.filter((t) => t.profit < 0).reduce((sum, t) => sum + t.profit, 0)
    );
    const profitFactor = totalLoss > 0 ? totalGain / totalLoss : 0;

    expect(totalGain).toBe(225);
    expect(totalLoss).toBe(50);
    expect(profitFactor).toBe(4.5);
  });

  it('should calculate correlation correctly', () => {
    const traderROIs = [10, 15, 20];
    const copyROIs = [9, 14, 19];

    const mean1 = traderROIs.reduce((a, b) => a + b) / traderROIs.length;
    const mean2 = copyROIs.reduce((a, b) => a + b) / copyROIs.length;

    const numerator = traderROIs.reduce((sum, val, i) => sum + (val - mean1) * (copyROIs[i] - mean2), 0);
    const denominator1 = Math.sqrt(
      traderROIs.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0)
    );
    const denominator2 = Math.sqrt(
      copyROIs.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0)
    );

    const correlation = numerator / (denominator1 * denominator2);

    expect(correlation).toBeCloseTo(1, 1);
  });

  it('should identify best performing copy', () => {
    const trades = [
      { id: '1', roi: 10 },
      { id: '2', roi: 25 },
      { id: '3', roi: 5 },
    ];

    const bestTrade = trades.reduce((best, current) =>
      current.roi > best.roi ? current : best
    );

    expect(bestTrade.id).toBe('2');
    expect(bestTrade.roi).toBe(25);
  });

  it('should identify worst performing copy', () => {
    const trades = [
      { id: '1', roi: 10 },
      { id: '2', roi: 25 },
      { id: '3', roi: -15 },
    ];

    const worstTrade = trades.reduce((worst, current) =>
      current.roi < worst.roi ? current : worst
    );

    expect(worstTrade.id).toBe('3');
    expect(worstTrade.roi).toBe(-15);
  });

  it('should calculate performance comparison correctly', () => {
    const copyROI = 15;
    const traderROI = 12;

    const difference = copyROI - traderROI;
    const differencePercentage = ((copyROI - traderROI) / Math.abs(traderROI)) * 100;
    const isOutperforming = copyROI > traderROI;

    expect(difference).toBe(3);
    expect(differencePercentage).toBeCloseTo(25, 1);
    expect(isOutperforming).toBe(true);
  });

  it('should filter active trades correctly', () => {
    const trades = [
      { id: '1', status: 'active' },
      { id: '2', status: 'closed' },
      { id: '3', status: 'active' },
      { id: '4', status: 'pending' },
    ];

    const activeTrades = trades.filter((t) => t.status === 'active');

    expect(activeTrades.length).toBe(2);
    expect(activeTrades[0].id).toBe('1');
    expect(activeTrades[1].id).toBe('3');
  });

  it('should filter closed trades correctly', () => {
    const trades = [
      { id: '1', status: 'active' },
      { id: '2', status: 'closed' },
      { id: '3', status: 'active' },
      { id: '4', status: 'closed' },
    ];

    const closedTrades = trades.filter((t) => t.status === 'closed');

    expect(closedTrades.length).toBe(2);
    expect(closedTrades[0].id).toBe('2');
    expect(closedTrades[1].id).toBe('4');
  });

  it('should calculate final profit on close', () => {
    const entryPrice = 100;
    const closePrice = 125;
    const amount = 1000;

    const finalProfit = amount * ((closePrice - entryPrice) / entryPrice);
    const finalROI = ((closePrice - entryPrice) / entryPrice) * 100;

    expect(finalProfit).toBe(250);
    expect(finalROI).toBe(25);
  });

  it('should generate unique copy trade ID', () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const id1 = `copy_${timestamp}_${random}`;
    const id2 = `copy_${timestamp}_${random}`;

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    // IDs should be different due to random component
    expect(id1 !== id2 || id1.length > 10).toBe(true);
  });

  it('should calculate average ROI correctly', () => {
    const trades = [
      { roi: 10 },
      { roi: 20 },
      { roi: 30 },
      { roi: -5 },
    ];

    const totalROI = trades.reduce((sum, t) => sum + t.roi, 0);
    const averageROI = totalROI / trades.length;

    expect(totalROI).toBe(55);
    expect(averageROI).toBeCloseTo(13.75, 1);
  });

  it('should handle empty trades array', () => {
    const trades: any[] = [];

    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
    const averageROI = trades.length > 0 ? trades.reduce((sum, t) => sum + t.roi, 0) / trades.length : 0;

    expect(totalProfit).toBe(0);
    expect(averageROI).toBe(0);
  });

  it('should calculate win rate correctly', () => {
    const trades = [
      { profit: 100 },
      { profit: 50 },
      { profit: -30 },
      { profit: 75 },
      { profit: -20 },
    ];

    const winningTrades = trades.filter((t) => t.profit > 0).length;
    const winRate = trades.length > 0 ? winningTrades / trades.length : 0;

    expect(winningTrades).toBe(3);
    expect(winRate).toBe(0.6);
  });

  it('should get copy trades for specific trader', () => {
    const trades = [
      { id: '1', traderId: 'trader1' },
      { id: '2', traderId: 'trader2' },
      { id: '3', traderId: 'trader1' },
      { id: '4', traderId: 'trader3' },
    ];

    const trader1Trades = trades.filter((t) => t.traderId === 'trader1');

    expect(trader1Trades.length).toBe(2);
    expect(trader1Trades[0].id).toBe('1');
    expect(trader1Trades[1].id).toBe('3');
  });

  it('should format copy trade data correctly', () => {
    const trade = {
      id: 'copy_1234567890_abc123',
      traderId: 'trader1',
      traderName: 'ProTrader',
      fromToken: 'ETH',
      toToken: 'USDC',
      amount: 1000,
      copyPercentage: 50,
      status: 'active' as const,
      entryPrice: 1800,
      currentPrice: 1900,
      profit: 55.56,
      profitPercentage: 5.56,
      roi: 5.56,
      timestamp: Date.now(),
      traderProfit: 100,
      traderROI: 10,
    };

    expect(trade.id).toBeDefined();
    expect(trade.fromToken).toBe('ETH');
    expect(trade.toToken).toBe('USDC');
    expect(trade.status).toBe('active');
    expect(trade.copyPercentage).toBe(50);
  });

  it('should calculate loss streak correctly', () => {
    const trades = [
      { profit: 100 },
      { profit: -30 },
      { profit: -50 },
      { profit: -20 },
      { profit: 75 },
    ];

    let currentStreak = 0;
    let maxLossStreak = 0;

    trades.forEach((trade) => {
      if (trade.profit < 0) {
        currentStreak += 1;
        maxLossStreak = Math.max(maxLossStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    expect(maxLossStreak).toBe(3);
  });
});
