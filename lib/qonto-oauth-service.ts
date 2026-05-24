/**
 * Qonto OAuth & Real Payments Service
 * Handles OAuth authentication and real bank transfers via Qonto API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const QONTO_API_BASE = 'https://api.qonto.com/v2';
const QONTO_AUTH_URL = 'https://auth.qonto.com/oauth/authorize';
const QONTO_TOKEN_URL = 'https://auth.qonto.com/oauth/token';

export interface QontoOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface QontoToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  created_at: number;
}

export interface QontoBankAccount {
  id: string;
  iban: string;
  name: string;
  currency: string;
  balance: number;
  status: 'active' | 'inactive';
}

export interface QontoTransaction {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  counterparty_name: string;
  counterparty_iban: string;
  created_at: string;
  updated_at: string;
}

export interface QontoTransferRequest {
  amount: number;
  currency: string;
  description: string;
  counterparty_name: string;
  counterparty_iban: string;
  reference?: string;
}

class QontoOAuthService {
  private config: QontoOAuthConfig | null = null;
  private token: QontoToken | null = null;
  private readonly TOKEN_STORAGE_KEY = 'qonto_token';
  private readonly CONFIG_STORAGE_KEY = 'qonto_config';

  /**
   * Initialize Qonto OAuth service
   */
  async initialize(config: QontoOAuthConfig): Promise<void> {
    this.config = config;
    await AsyncStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(config));

    // Try to load stored token
    const storedToken = await this.loadToken();
    if (storedToken && this.isTokenValid(storedToken)) {
      this.token = storedToken;
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(state: string): string {
    if (!this.config) {
      throw new Error('Qonto OAuth not initialized');
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'accounts transactions',
      state,
    });

    return `${QONTO_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<QontoToken> {
    if (!this.config) {
      throw new Error('Qonto OAuth not initialized');
    }

    try {
      const response = await fetch(QONTO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status}`);
      }

      const data = await response.json();
      const token: QontoToken = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token,
        scope: data.scope,
        created_at: Date.now(),
      };

      this.token = token;
      await this.saveToken(token);

      return token;
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<QontoToken> {
    if (!this.config || !this.token || !this.token.refresh_token) {
      throw new Error('Cannot refresh token: missing config or refresh token');
    }

    try {
      const response = await fetch(QONTO_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.token.refresh_token,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      const newToken: QontoToken = {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        refresh_token: data.refresh_token || this.token.refresh_token,
        scope: data.scope,
        created_at: Date.now(),
      };

      this.token = newToken;
      await this.saveToken(newToken);

      return newToken;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get bank accounts
   */
  async getBankAccounts(): Promise<QontoBankAccount[]> {
    try {
      await this.ensureValidToken();

      const response = await fetch(`${QONTO_API_BASE}/accounts`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status}`);
      }

      const data = await response.json();
      return data.accounts.map((account: any) => ({
        id: account.id,
        iban: account.iban,
        name: account.name,
        currency: account.currency,
        balance: account.balance,
        status: account.status,
      }));
    } catch (error) {
      throw new Error(`Failed to get bank accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transactions for an account
   */
  async getTransactions(accountId: string, limit: number = 50): Promise<QontoTransaction[]> {
    try {
      await this.ensureValidToken();

      const response = await fetch(`${QONTO_API_BASE}/accounts/${accountId}/transactions?limit=${limit}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`);
      }

      const data = await response.json();
      return data.transactions.map((tx: any) => ({
        id: tx.id,
        amount: tx.amount,
        currency: tx.currency,
        description: tx.description,
        status: tx.status,
        counterparty_name: tx.counterparty_name,
        counterparty_iban: tx.counterparty_iban,
        created_at: tx.created_at,
        updated_at: tx.updated_at,
      }));
    } catch (error) {
      throw new Error(`Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a bank transfer
   */
  async createTransfer(accountId: string, transfer: QontoTransferRequest): Promise<QontoTransaction> {
    try {
      await this.ensureValidToken();

      // Validate IBAN
      if (!this.validateIBAN(transfer.counterparty_iban)) {
        throw new Error('Invalid IBAN format');
      }

      const response = await fetch(`${QONTO_API_BASE}/accounts/${accountId}/transfers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: transfer.amount,
          currency: transfer.currency,
          description: transfer.description,
          counterparty_name: transfer.counterparty_name,
          counterparty_iban: transfer.counterparty_iban,
          reference: transfer.reference,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Transfer failed: ${error.message}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        status: data.status,
        counterparty_name: data.counterparty_name,
        counterparty_iban: data.counterparty_iban,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      throw new Error(`Failed to create transfer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate IBAN format
   */
  private validateIBAN(iban: string): boolean {
    // Basic IBAN validation
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(iban.replace(/\s/g, ''));
  }

  /**
   * Check if token is valid
   */
  private isTokenValid(token: QontoToken): boolean {
    const expiresAt = token.created_at + token.expires_in * 1000;
    return Date.now() < expiresAt - 60000; // 1 minute buffer
  }

  /**
   * Ensure token is valid, refresh if needed
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }

    if (!this.isTokenValid(this.token)) {
      await this.refreshToken();
    }
  }

  /**
   * Save token to storage
   */
  private async saveToken(token: QontoToken): Promise<void> {
    try {
      await AsyncStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(token));
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  /**
   * Load token from storage
   */
  private async loadToken(): Promise<QontoToken | null> {
    try {
      const stored = await AsyncStorage.getItem(this.TOKEN_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load token:', error);
      return null;
    }
  }

  /**
   * Logout and clear token
   */
  async logout(): Promise<void> {
    this.token = null;
    try {
      await AsyncStorage.removeItem(this.TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }

  /**
   * Get current token
   */
  getToken(): QontoToken | null {
    return this.token;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null && this.isTokenValid(this.token);
  }
}

export const qontoOAuthService = new QontoOAuthService();
