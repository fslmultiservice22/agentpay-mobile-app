import { describe, it, expect, beforeEach } from 'vitest';
import { priceService } from '../lib/price-service';
import { portfolioAnalytics } from '../lib/portfolio-analytics';
import { swapService } from '../lib/swap-service';

/**
 * Price Service, Portfolio Analytics, and Swap Service Tests
 */

describe('Price Service', () => {
  beforeEach(() => {
    priceService.clearCache();
  });

  it('should initialize price service', async () => {
    await priceService.init();
    const config = priceService.getConfig();
    expect(config).toBeDefined();
  });

  it('should get mock price', async () => {
    priceService.subscribe('BTC', () => {});
    // Wait for price to be fetched
    await new Promise((resolve) => setTimeout(resolve, 100));
    const price = priceService.getPrice('BTC');
    expect(price).not.toBeNull();
  });

  it('should subscribe to price updates', () => {
    let callCount = 0;
    const unsubscribe = priceService.subscribe('ETH', () => {
      callCount++;
    });

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should update price config', () => {
    priceService.updateConfig({ updateInterval: 2000 });
    const config = priceService.getConfig();
    expect(config.updateInterval).toBe(2000);
  });

  it('should get price statistics', async () => {
    await priceService.init();
    priceService.subscribe('BTC', () => {});
    // Wait for price to be fetched
    await new Promise((resolve) => setTimeout(resolve, 100));
    const stats = priceService.getPriceStats('BTC');
    expect(stats).toBeDefined();
  });

  it('should get multiple prices', () => {
    // Subscribe first to populate cache
    ['BTC', 'ETH', 'SOL'].forEach((symbol) => {
      priceService.subscribe(symbol, () => {});
    });
    const prices = priceService.getPrices(['BTC', 'ETH', 'SOL']);
    expect(prices).toBeDefined();
  });

  it('should get all cached prices', () => {
    // Subscribe first to populate cache
    priceService.subscribe('BTC', () => {});
    const allPrices = priceService.getAllPrices();
    expect(allPrices instanceof Map).toBe(true);
  });

  it('should cleanup price service', () => {
    priceService.cleanup();
    const allPrices = priceService.getAllPrices();
    expect(allPrices.size).toBe(0);
  });
});

describe('Portfolio Analytics Service', () => {
  beforeEach(() => {
    portfolioAnalytics.clearHistory();
  });

  it('should initialize portfolio analytics', () => {
    portfolioAnalytics.init();
    const config = portfolioAnalytics.getConfig();
    expect(config).toBeDefined();
  });

  it('should get portfolio stats', () => {
    const stats = portfolioAnalytics.getStats();
    expect(stats.totalValue).toBeDefined();
    expect(stats.totalChangePercent).toBeDefined();
  });

  it('should update portfolio', () => {
    const holdings = { BTC: 1, ETH: 10, SOL: 100 };
    const prices = { BTC: 45000, ETH: 2500, SOL: 150 };
    portfolioAnalytics.updatePortfolio(holdings, prices);

    const stats = portfolioAnalytics.getStats();
    expect(stats.totalValue).toBeGreaterThan(0);
  });

  it('should get portfolio trend', () => {
    const holdings = { BTC: 1, ETH: 10 };
    const prices = { BTC: 45000, ETH: 2500 };

    portfolioAnalytics.updatePortfolio(holdings, prices);
    const trend = portfolioAnalytics.getTrend('24h');

    expect(trend.timestamps.length).toBeGreaterThan(0);
    expect(trend.values.length).toBeGreaterThan(0);
  });

  it('should get chart data', () => {
    const holdings = { BTC: 1, ETH: 10 };
    const prices = { BTC: 45000, ETH: 2500 };

    portfolioAnalytics.updatePortfolio(holdings, prices);
    const chartData = portfolioAnalytics.getChartData('24h');

    expect(chartData.labels.length).toBeGreaterThan(0);
    expect(chartData.data.length).toBeGreaterThan(0);
  });

  it('should add listener for analytics updates', () => {
    let callCount = 0;
    const unsubscribe = portfolioAnalytics.addListener(() => {
      callCount++;
    });

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should export data as CSV', () => {
    const holdings = { BTC: 1, ETH: 10 };
    const prices = { BTC: 45000, ETH: 2500 };

    portfolioAnalytics.updatePortfolio(holdings, prices);
    const csv = portfolioAnalytics.exportAsCSV();

    expect(csv).toContain('Timestamp');
    expect(csv).toContain('Total Value');
  });

  it('should get performance metrics', () => {
    const holdings = { BTC: 1, ETH: 10 };
    const prices = { BTC: 45000, ETH: 2500 };

    portfolioAnalytics.updatePortfolio(holdings, prices);
    const metrics = portfolioAnalytics.getPerformanceMetrics();

    expect(metrics.roi).toBeDefined();
    expect(metrics.sharpeRatio).toBeDefined();
    expect(metrics.maxDrawdown).toBeDefined();
    expect(metrics.winRate).toBeDefined();
  });

  it('should cleanup portfolio analytics', () => {
    portfolioAnalytics.cleanup();
    const snapshots = portfolioAnalytics.getSnapshots();
    expect(snapshots.length).toBe(0);
  });
});

describe('Swap Service', () => {
  beforeEach(() => {
    swapService.clearHistory();
  });

  it('should initialize swap service', async () => {
    await swapService.init();
    const config = swapService.getConfig();
    expect(config).toBeDefined();
  });

  it('should validate swap parameters', () => {
    const result = swapService.validateSwap('ETH', 'USDC', 1);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid swap parameters', () => {
    const result = swapService.validateSwap('ETH', 'ETH', 1);
    expect(result.valid).toBe(false);
  });

  it('should get swap quote', async () => {
    const quote = await swapService.getQuote('ETH', 'USDC', 1);
    expect(quote).not.toBeNull();
    expect(quote?.toAmount).toBeGreaterThan(0);
  });

  it('should execute swap', async () => {
    const quote = await swapService.getQuote('ETH', 'USDC', 1);
    if (quote) {
      const tx = await swapService.executeSwap(quote);
      expect(tx).not.toBeNull();
      expect(tx?.status).toBe('pending');
    }
  });

  it('should get swap history', async () => {
    const quote = await swapService.getQuote('ETH', 'USDC', 1);
    if (quote) {
      await swapService.executeSwap(quote);
      const history = swapService.getSwapHistory();
      expect(history.length).toBeGreaterThan(0);
    }
  });

  it('should get swap history for token', async () => {
    const quote = await swapService.getQuote('ETH', 'USDC', 1);
    if (quote) {
      await swapService.executeSwap(quote);
      const history = swapService.getSwapHistoryForToken('ETH');
      expect(history.length).toBeGreaterThan(0);
    }
  });

  it('should get swap configuration', () => {
    const config = swapService.getConfig();
    expect(config.slippage).toBeDefined();
    expect(config.maxPriceImpact).toBeDefined();
  });

  it('should update swap configuration', () => {
    swapService.updateConfig({ slippage: 1 });
    const config = swapService.getConfig();
    expect(config.slippage).toBe(1);
  });

  it('should get supported DEX', () => {
    const dex = swapService.getSupportedDEX();
    expect(dex.length).toBeGreaterThan(0);
    expect(dex).toContain('uniswap');
  });

  it('should get supported chains', () => {
    const chains = swapService.getSupportedChains();
    expect(chains[1]).toBe('Ethereum');
    expect(chains[56]).toBe('BSC');
  });

  it('should estimate gas', async () => {
    const quote = await swapService.getQuote('ETH', 'USDC', 1);
    if (quote) {
      const gas = await swapService.estimateGas(quote);
      expect(gas).toBeGreaterThan(0);
    }
  });

  it('should get swap statistics', async () => {
    const quote = await swapService.getQuote('ETH', 'USDC', 1);
    if (quote) {
      await swapService.executeSwap(quote);
      const stats = swapService.getStatistics();
      expect(stats.totalSwaps).toBeGreaterThan(0);
    }
  });

  it('should add listener for swap events', () => {
    let callCount = 0;
    const unsubscribe = swapService.addListener(() => {
      callCount++;
    });

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('should cleanup swap service', () => {
    swapService.cleanup();
    const history = swapService.getSwapHistory();
    expect(history.length).toBe(0);
  });
});

describe('Integration Tests', () => {
  it('should integrate price service with portfolio analytics', async () => {
    await priceService.init();
    portfolioAnalytics.init();

    const holdings = { BTC: 1, ETH: 10 };
    const prices = { BTC: 45000, ETH: 2500 };

    portfolioAnalytics.updatePortfolio(holdings, prices);
    const stats = portfolioAnalytics.getStats();

    expect(stats.totalValue).toBeGreaterThan(0);
  });

  it('should integrate swap service with portfolio analytics', async () => {
    await swapService.init();
    portfolioAnalytics.init();

    const quote = await swapService.getQuote('ETH', 'USDC', 1);
    expect(quote).not.toBeNull();

    const holdings = { ETH: 10, USDC: 25000 };
    const prices = { ETH: 2500, USDC: 1 };

    portfolioAnalytics.updatePortfolio(holdings, prices);
    const stats = portfolioAnalytics.getStats();

    expect(stats.totalValue).toBeGreaterThan(0);
  });

  it('should handle multiple price updates', async () => {
    await priceService.init();

    const symbols = ['BTC', 'ETH', 'SOL', 'ADA'];
    // Subscribe to get prices updated
    symbols.forEach((symbol) => {
      priceService.subscribe(symbol, () => {});
    });

    // Wait a bit for prices to be fetched
    await new Promise((resolve) => setTimeout(resolve, 100));

    const prices = priceService.getPrices(symbols);
    expect(prices).toBeDefined();
  });

  it('should track swap history and portfolio changes', async () => {
    await swapService.init();
    portfolioAnalytics.init();

    const quote = await swapService.getQuote('ETH', 'USDC', 1);
    if (quote) {
      const tx = await swapService.executeSwap(quote);
      expect(tx).not.toBeNull();

      const history = swapService.getSwapHistory();
      expect(history.length).toBeGreaterThan(0);
    }
  });
});
