import { describe, it, expect, beforeEach, vi } from 'vitest';
import { qontoOAuthService } from '../lib/qonto-oauth-service';

// Mock fetch and AsyncStorage
global.fetch = vi.fn();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn(),
    getItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('Qonto OAuth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with config', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'agentpay://oauth/callback',
      };

      await qontoOAuthService.initialize(config);
      expect(qontoOAuthService).toBeDefined();
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'agentpay://oauth/callback',
      };

      await qontoOAuthService.initialize(config);
      const url = qontoOAuthService.getAuthorizationUrl('state-123');

      expect(url).toContain('https://auth.qonto.com/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=state-123');
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for token', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'agentpay://oauth/callback',
      };

      await qontoOAuthService.initialize(config);

      const mockResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'accounts transactions',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const token = await qontoOAuthService.exchangeCodeForToken('auth-code-123');

      expect(token.access_token).toBe('test-access-token');
      expect(token.token_type).toBe('Bearer');
      expect(token.refresh_token).toBe('test-refresh-token');
    });
  });

  describe('getBankAccounts', () => {
    it('should fetch bank accounts', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'agentpay://oauth/callback',
      };

      await qontoOAuthService.initialize(config);

      // Mock token
      const tokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'accounts transactions',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => tokenResponse,
      });

      await qontoOAuthService.exchangeCodeForToken('auth-code-123');

      const mockAccountsResponse = {
        accounts: [
          {
            id: 'account-1',
            iban: 'IT60X0542811101000000123456',
            name: 'Main Account',
            currency: 'EUR',
            balance: 5000,
            status: 'active',
          },
          {
            id: 'account-2',
            iban: 'IT60X0542811101000000654321',
            name: 'Savings Account',
            currency: 'EUR',
            balance: 10000,
            status: 'active',
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAccountsResponse,
      });

      const accounts = await qontoOAuthService.getBankAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts[0].iban).toBe('IT60X0542811101000000123456');
      expect(accounts[0].balance).toBe(5000);
    });
  });

  describe('getTransactions', () => {
    it('should fetch transactions for account', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'agentpay://oauth/callback',
      };

      await qontoOAuthService.initialize(config);

      const tokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'accounts transactions',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => tokenResponse,
      });

      await qontoOAuthService.exchangeCodeForToken('auth-code-123');

      const mockTransactionsResponse = {
        transactions: [
          {
            id: 'tx-1',
            amount: 100,
            currency: 'EUR',
            description: 'Payment to John',
            status: 'completed',
            counterparty_name: 'John Doe',
            counterparty_iban: 'IT60X0542811101000000999999',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z',
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactionsResponse,
      });

      const transactions = await qontoOAuthService.getTransactions('account-1');

      expect(transactions).toHaveLength(1);
      expect(transactions[0].amount).toBe(100);
      expect(transactions[0].status).toBe('completed');
    });
  });

  describe('createTransfer', () => {
    it('should create a bank transfer', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'agentpay://oauth/callback',
      };

      await qontoOAuthService.initialize(config);

      const tokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'accounts transactions',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => tokenResponse,
      });

      await qontoOAuthService.exchangeCodeForToken('auth-code-123');

      const mockTransferResponse = {
        id: 'tx-new-1',
        amount: 250,
        currency: 'EUR',
        description: 'Payment to Jane',
        status: 'pending',
        counterparty_name: 'Jane Smith',
        counterparty_iban: 'IT60X0542811101000000888888',
        created_at: '2024-01-15T11:00:00Z',
        updated_at: '2024-01-15T11:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransferResponse,
      });

      const transfer = await qontoOAuthService.createTransfer('account-1', {
        amount: 250,
        currency: 'EUR',
        description: 'Payment to Jane',
        counterparty_name: 'Jane Smith',
        counterparty_iban: 'IT60X0542811101000000888888',
      });

      expect(transfer.id).toBe('tx-new-1');
      expect(transfer.amount).toBe(250);
      expect(transfer.status).toBe('pending');
    });

    it('should validate IBAN format', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'agentpay://oauth/callback',
      };

      await qontoOAuthService.initialize(config);

      const tokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'accounts transactions',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => tokenResponse,
      });

      await qontoOAuthService.exchangeCodeForToken('auth-code-123');

      await expect(
        qontoOAuthService.createTransfer('account-1', {
          amount: 250,
          currency: 'EUR',
          description: 'Payment',
          counterparty_name: 'Jane Smith',
          counterparty_iban: 'INVALID-IBAN',
        })
      ).rejects.toThrow('Invalid IBAN format');
    });
  });

  describe('logout', () => {
    it('should logout and clear token', async () => {
      const config = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        redirectUri: 'agentpay://oauth/callback',
      };

      await qontoOAuthService.initialize(config);

      const tokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        scope: 'accounts transactions',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => tokenResponse,
      });

      await qontoOAuthService.exchangeCodeForToken('auth-code-123');
      expect(qontoOAuthService.isAuthenticated()).toBe(true);

      await qontoOAuthService.logout();
      expect(qontoOAuthService.isAuthenticated()).toBe(false);
    });
  });
});
