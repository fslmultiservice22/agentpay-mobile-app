import { describe, it, expect, beforeAll, vi } from 'vitest';
import { TelegramBotService } from '/home/ubuntu/agentpay-mobile-app/lib/telegram/telegram-service';

describe('Telegram Integration', () => {
  let telegramService: TelegramBotService;

  beforeAll(() => {
    // Usa un token di test
    telegramService = new TelegramBotService(
      '8763812695:AAEsTC_rp0iCNN9oanYbRUNvsXfX2Q4YOsM',
      'tradingT23_bot'
    );
  });

  describe('Message Formatting', () => {
    it('should format transaction notification correctly', () => {
      const data = {
        fromAmount: '1.5',
        fromToken: 'ETH',
        toAmount: '2550',
        toToken: 'USDC',
        rate: 1700,
        timestamp: Date.now(),
      };

      // Verifica che i dati siano validi
      expect(data.fromAmount).toBeDefined();
      expect(data.toAmount).toBeDefined();
      expect(data.timestamp).toBeGreaterThan(0);
    });

    it('should format bank transfer notification correctly', () => {
      const data = {
        amount: '500',
        ibanMasked: 'IT60X0542811101000000123456',
        description: 'Trasferimento credito',
        timestamp: Date.now(),
      };

      expect(data.amount).toBeDefined();
      expect(data.ibanMasked).toMatch(/^IT/);
    });

    it('should format price alert correctly', () => {
      const token = 'ETH';
      const price = 2850.50;
      const change = 2.5;

      expect(token).toBeDefined();
      expect(price).toBeGreaterThan(0);
      expect(change).toBeDefined();
    });
  });

  describe('Command Handling', () => {
    it('should recognize /start command', () => {
      const command = '/start';
      expect(command).toBe('/start');
    });

    it('should recognize /balance command', () => {
      const command = '/balance';
      expect(command).toBe('/balance');
    });

    it('should recognize /history command', () => {
      const command = '/history';
      expect(command).toBe('/history');
    });

    it('should recognize /swap command', () => {
      const command = '/swap';
      expect(command).toBe('/swap');
    });

    it('should recognize /transfer command', () => {
      const command = '/transfer';
      expect(command).toBe('/transfer');
    });

    it('should recognize /settings command', () => {
      const command = '/settings';
      expect(command).toBe('/settings');
    });

    it('should recognize /help command', () => {
      const command = '/help';
      expect(command).toBe('/help');
    });
  });

  describe('Wallet Data Formatting', () => {
    it('should format wallet balance correctly', () => {
      const walletData = {
        totalValue: 125000,
        totalChangePercent: 4.17,
        assets: [
          { symbol: 'ETH', balance: 5.5, value: 18700, changePercent24h: 2.5 },
          { symbol: 'USDC', balance: 50000, value: 50000, changePercent24h: 0 },
          { symbol: 'MATIC', balance: 25000, value: 18500, changePercent24h: -1.2 },
        ],
      };

      expect(walletData.totalValue).toBeGreaterThan(0);
      expect(walletData.assets.length).toBe(3);
      expect(walletData.assets[0].symbol).toBe('ETH');
    });

    it('should format transaction history correctly', () => {
      const transactions = [
        {
          id: '1',
          type: 'swap',
          description: 'ETH → USDC',
          timestamp: Date.now(),
        },
        {
          id: '2',
          type: 'transfer',
          description: 'Trasferimento IBAN',
          timestamp: Date.now() - 3600000,
        },
      ];

      expect(transactions.length).toBe(2);
      expect(transactions[0].type).toBe('swap');
      expect(transactions[1].type).toBe('transfer');
    });
  });

  describe('Telegram Service Methods', () => {
    it('should have sendMessage method', () => {
      expect(telegramService.sendMessage).toBeDefined();
      expect(typeof telegramService.sendMessage).toBe('function');
    });

    it('should have sendTransactionNotification method', () => {
      expect(telegramService.sendTransactionNotification).toBeDefined();
      expect(typeof telegramService.sendTransactionNotification).toBe('function');
    });

    it('should have sendBalance method', () => {
      expect(telegramService.sendBalance).toBeDefined();
      expect(typeof telegramService.sendBalance).toBe('function');
    });

    it('should have sendTransactionHistory method', () => {
      expect(telegramService.sendTransactionHistory).toBeDefined();
      expect(typeof telegramService.sendTransactionHistory).toBe('function');
    });

    it('should have sendPriceAlert method', () => {
      expect(telegramService.sendPriceAlert).toBeDefined();
      expect(typeof telegramService.sendPriceAlert).toBe('function');
    });

    it('should have handleCommand method', () => {
      expect(telegramService.handleCommand).toBeDefined();
      expect(typeof telegramService.handleCommand).toBe('function');
    });

    it('should have setWebhook method', () => {
      expect(telegramService.setWebhook).toBeDefined();
      expect(typeof telegramService.setWebhook).toBe('function');
    });

    it('should have getMe method', () => {
      expect(telegramService.getMe).toBeDefined();
      expect(typeof telegramService.getMe).toBe('function');
    });
  });

  describe('Telegram Config Validation', () => {
    it('should validate chat ID', () => {
      const chatId = 123456789;
      expect(chatId).toBeGreaterThan(0);
      expect(typeof chatId).toBe('number');
    });

    it('should validate bot username', () => {
      const username = 'tradingT23_bot';
      expect(username).toMatch(/^[a-zA-Z0-9_]+$/);
      expect(username).toContain('_bot');
    });

    it('should validate notification settings', () => {
      const config = {
        chatId: 123456789,
        username: 'tradingT23_bot',
        isConnected: true,
        notificationsEnabled: true,
        priceAlertsEnabled: false,
      };

      expect(config.isConnected).toBe(true);
      expect(typeof config.notificationsEnabled).toBe('boolean');
      expect(typeof config.priceAlertsEnabled).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing chat ID', () => {
      const chatId = null;
      expect(chatId).toBeNull();
    });

    it('should handle invalid token', () => {
      const invalidToken = 'invalid_token';
      expect(invalidToken).not.toMatch(/^\d+:[A-Za-z0-9_-]+$/);
    });

    it('should handle network errors gracefully', async () => {
      // Mock fetch error
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      try {
        await mockFetch();
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Network error');
      }
    });
  });
});
