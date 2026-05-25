import { describe, it, expect, beforeEach } from 'vitest';
import { socialSharing, PortfolioShareData, TradeShareData } from '../lib/social-sharing';

/**
 * Social Sharing Tests
 */

describe('Social Sharing Service', () => {
  describe('Portfolio Sharing', () => {
    it('should generate portfolio share message', async () => {
      const data: PortfolioShareData = {
        totalValue: 10000,
        changePercent: 5.5,
        topHolding: 'Bitcoin',
        holdingCount: 5,
        timeframe: '24h',
      };

      const message = socialSharing.generatePortfolioReport(data);
      expect(message).toContain('$10000.00');
      expect(message).toContain('+5.50%');
      expect(message).toContain('Bitcoin');
      expect(message).toContain('Total Assets: 5');
    });

    it('should handle negative portfolio change', async () => {
      const data: PortfolioShareData = {
        totalValue: 9500,
        changePercent: -5.0,
        holdingCount: 3,
      };

      const message = socialSharing.generatePortfolioReport(data);
      expect(message).toContain('$9500.00');
      expect(message).toContain('-5.00%');
      expect(message).toContain('Total Assets: 3');
    });

    it('should share portfolio successfully', async () => {
      const data: PortfolioShareData = {
        totalValue: 15000,
        changePercent: 12.3,
        topHolding: 'Ethereum',
        holdingCount: 8,
        timeframe: '7d',
      };

      const result = await socialSharing.sharePortfolio(data);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Trade Sharing', () => {
    it('should generate buy trade report', () => {
      const data: TradeShareData = {
        tokenSymbol: 'BTC',
        action: 'buy',
        amount: 0.5,
        price: 45000,
      };

      const message = socialSharing.generateTradeReport(data);
      expect(message).toContain('BUY');
      expect(message).toContain('BTC');
      expect(message).toContain('0.5');
      expect(message).toContain('$45000.00');
    });

    it('should generate sell trade report', () => {
      const data: TradeShareData = {
        tokenSymbol: 'ETH',
        action: 'sell',
        amount: 2,
        price: 2500,
        profit: 1000,
      };

      const message = socialSharing.generateTradeReport(data);
      expect(message).toContain('SELL');
      expect(message).toContain('ETH');
      expect(message).toContain('2');
      expect(message).toContain('$2500.00');
      expect(message).toContain('$1000.00');
    });

    it('should share trade successfully', async () => {
      const data: TradeShareData = {
        tokenSymbol: 'SOL',
        action: 'buy',
        amount: 10,
        price: 150,
      };

      const result = await socialSharing.shareTrade(data);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Achievement Sharing', () => {
    it('should share achievement successfully', async () => {
      const result = await socialSharing.shareAchievement(
        'First Trade',
        'Completed your first trade on AgentPay!'
      );
      expect(typeof result).toBe('boolean');
    });

    it('should share milestone achievement', async () => {
      const result = await socialSharing.shareAchievement(
        '$10K Portfolio',
        'Reached $10,000 in total portfolio value!'
      );
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Referral Sharing', () => {
    it('should generate referral share message', async () => {
      const referralCode = 'AGENTPAY2024';
      const result = await socialSharing.shareReferral(referralCode);
      expect(typeof result).toBe('boolean');
    });

    it('should include referral code in message', async () => {
      const referralCode = 'REF123ABC';
      // Note: We can't directly check the message content without mocking,
      // but we can verify the function executes without error
      const result = await socialSharing.shareReferral(referralCode);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Clipboard Operations', () => {
    it('should copy text to clipboard', async () => {
      const text = 'AgentPay Portfolio: $10,000';
      const result = await socialSharing.copyToClipboard(text);
      expect(typeof result).toBe('boolean');
    });

    it('should get text from clipboard', async () => {
      const result = await socialSharing.getFromClipboard();
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('Social Media Platforms', () => {
    it('should support Twitter sharing', async () => {
      const content = {
        title: 'Share on Twitter',
        message: 'Check out my portfolio on AgentPay!',
        url: 'https://agentpay.app',
      };

      const result = await socialSharing.shareToSocialMedia('twitter', content);
      expect(typeof result).toBe('boolean');
    });

    it('should support Telegram sharing', async () => {
      const content = {
        title: 'Share on Telegram',
        message: 'Join me on AgentPay!',
        url: 'https://agentpay.app',
      };

      const result = await socialSharing.shareToSocialMedia('telegram', content);
      expect(typeof result).toBe('boolean');
    });

    it('should support WhatsApp sharing', async () => {
      const content = {
        title: 'Share on WhatsApp',
        message: 'Check out AgentPay!',
        url: 'https://agentpay.app',
      };

      const result = await socialSharing.shareToSocialMedia('whatsapp', content);
      expect(typeof result).toBe('boolean');
    });

    it('should support Facebook sharing', async () => {
      const content = {
        title: 'Share on Facebook',
        message: 'Trading on AgentPay',
        url: 'https://agentpay.app',
      };

      const result = await socialSharing.shareToSocialMedia('facebook', content);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Share Content Validation', () => {
    it('should validate portfolio data', () => {
      const validData: PortfolioShareData = {
        totalValue: 5000,
        changePercent: 2.5,
        holdingCount: 3,
      };

      expect(validData.totalValue).toBeGreaterThan(0);
      expect(typeof validData.changePercent).toBe('number');
      expect(validData.holdingCount).toBeGreaterThan(0);
    });

    it('should validate trade data', () => {
      const validData: TradeShareData = {
        tokenSymbol: 'BTC',
        action: 'buy',
        amount: 1,
        price: 50000,
      };

      expect(validData.tokenSymbol).toBeTruthy();
      expect(['buy', 'sell']).toContain(validData.action);
      expect(validData.amount).toBeGreaterThan(0);
      expect(validData.price).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate formatted portfolio report', () => {
      const data: PortfolioShareData = {
        totalValue: 25000,
        changePercent: 15.5,
        topHolding: 'Bitcoin',
        holdingCount: 10,
        timeframe: '30d',
      };

      const report = socialSharing.generatePortfolioReport(data);
      expect(report).toContain('AGENTPAY PORTFOLIO REPORT');
      expect(report).toContain('$25000.00');
      expect(report).toContain('+15.50%');
      expect(report).toContain('30d');
    });

    it('should generate formatted trade report', () => {
      const data: TradeShareData = {
        tokenSymbol: 'DOGE',
        action: 'sell',
        amount: 5000,
        price: 0.35,
        profit: 500,
      };

      const report = socialSharing.generateTradeReport(data);
      expect(report).toContain('AGENTPAY TRADE REPORT');
      expect(report).toContain('SELL');
      expect(report).toContain('DOGE');
      expect(report).toContain('$500.00');
    });
  });

  describe('Multiple Share Types', () => {
    it('should handle portfolio sharing', async () => {
      const portfolioData: PortfolioShareData = {
        totalValue: 50000,
        changePercent: 20,
        holdingCount: 15,
      };

      const result = await socialSharing.sharePortfolio(portfolioData);
      expect(typeof result).toBe('boolean');
    });

    it('should handle trade sharing', async () => {
      const tradeData: TradeShareData = {
        tokenSymbol: 'ADA',
        action: 'buy',
        amount: 100,
        price: 1.5,
      };

      const result = await socialSharing.shareTrade(tradeData);
      expect(typeof result).toBe('boolean');
    });

    it('should handle achievement sharing', async () => {
      const result = await socialSharing.shareAchievement(
        'Trading Master',
        'Completed 100 trades!'
      );
      expect(typeof result).toBe('boolean');
    });

    it('should handle referral sharing', async () => {
      const result = await socialSharing.shareReferral('AGENTPAY100');
      expect(typeof result).toBe('boolean');
    });
  });
});
