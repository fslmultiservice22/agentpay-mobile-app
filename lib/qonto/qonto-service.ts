/**
 * Qonto Bank Integration Service
 * Manages Qonto business bank account connections and operations
 */

export interface QontoAccount {
  id: string;
  accountNumber: string;
  accountHolder: string;
  maskedIBAN: string;
  fullIBAN: string;
  currency: string;
  balance: number;
  status: 'active' | 'inactive' | 'pending';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QontoTransaction {
  id: string;
  accountId: string;
  type: 'debit' | 'credit';
  amount: number;
  currency: string;
  description: string;
  counterparty: string;
  counterpartyIBAN: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  reference: string;
}

export interface QontoTransfer {
  id: string;
  accountId: string;
  recipientIBAN: string;
  recipientName: string;
  amount: number;
  currency: string;
  description: string;
  scheduledDate?: string;
  status: 'draft' | 'pending' | 'completed' | 'failed';
  createdAt: string;
  executedAt?: string;
}

export class QontoService {
  private accountNumber: string;
  private apiKey: string;
  private baseUrl = 'https://api.qonto.com/v2';

  constructor(accountNumber: string, apiKey?: string) {
    this.accountNumber = accountNumber;
    this.apiKey = apiKey || '';
  }

  /**
   * Validate Qonto account number format
   */
  static isValidAccountNumber(accountNumber: string): boolean {
    // Qonto account numbers are typically 18-24 digits
    return /^\d{18,24}$/.test(accountNumber);
  }

  /**
   * Mask Qonto account number for display
   */
  static maskAccountNumber(accountNumber: string): string {
    if (!this.isValidAccountNumber(accountNumber)) return '';
    return `${accountNumber.slice(0, 4)}*${accountNumber.slice(-4)}`;
  }

  /**
   * Get account details
   */
  async getAccountDetails(): Promise<QontoAccount> {
    try {
      // Mock response for development
      return {
        id: `qonto_${this.accountNumber}`,
        accountNumber: this.accountNumber,
        accountHolder: 'Fernando Simon Luis',
        maskedIBAN: 'IT95*...4536',
        fullIBAN: 'IT95F1234567890123456789',
        currency: 'EUR',
        balance: 15250.50,
        status: 'active',
        isDefault: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching Qonto account details:', error);
      throw new Error('Failed to fetch account details');
    }
  }

  /**
   * Get account transactions
   */
  async getTransactions(limit = 50, offset = 0): Promise<QontoTransaction[]> {
    try {
      // Mock transactions for development
      const mockTransactions: QontoTransaction[] = [
        {
          id: 'txn_001',
          accountId: `qonto_${this.accountNumber}`,
          type: 'credit',
          amount: 5000,
          currency: 'EUR',
          description: 'Client Payment',
          counterparty: 'Acme Corp',
          counterpartyIBAN: 'DE89370400440532013000',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          reference: 'INV-2024-001',
        },
        {
          id: 'txn_002',
          accountId: `qonto_${this.accountNumber}`,
          type: 'debit',
          amount: 1250.75,
          currency: 'EUR',
          description: 'Office Supplies',
          counterparty: 'Office Depot',
          counterpartyIBAN: 'FR1420041010050500013M02606',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'completed',
          reference: 'ORD-2024-456',
        },
      ];
      return mockTransactions.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Create a transfer
   */
  async createTransfer(transfer: Omit<QontoTransfer, 'id' | 'createdAt'>): Promise<QontoTransfer> {
    try {
      if (!this.validateIBAN(transfer.recipientIBAN)) {
        throw new Error('Invalid recipient IBAN');
      }

      // Mock transfer creation
      return {
        id: `trf_${Date.now()}`,
        ...transfer,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error creating transfer:', error);
      throw new Error('Failed to create transfer');
    }
  }

  /**
   * Execute a transfer
   */
  async executeTransfer(transferId: string): Promise<QontoTransfer> {
    try {
      // Mock transfer execution
      return {
        id: transferId,
        accountId: `qonto_${this.accountNumber}`,
        recipientIBAN: 'DE89370400440532013000',
        recipientName: 'John Doe',
        amount: 1000,
        currency: 'EUR',
        description: 'Payment',
        status: 'completed',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        executedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error executing transfer:', error);
      throw new Error('Failed to execute transfer');
    }
  }

  /**
   * Validate IBAN format
   */
  private validateIBAN(iban: string): boolean {
    // Basic IBAN validation (length and format)
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(iban.replace(/\s/g, ''));
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<number> {
    try {
      const account = await this.getAccountDetails();
      return account.balance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw new Error('Failed to fetch balance');
    }
  }

  /**
   * Format amount for display
   */
  static formatAmount(amount: number, currency = 'EUR'): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Get transaction status badge
   */
  static getStatusBadge(status: string): { label: string; color: string } {
    const statusMap: Record<string, { label: string; color: string }> = {
      completed: { label: 'Completato', color: 'success' },
      pending: { label: 'In Sospeso', color: 'warning' },
      failed: { label: 'Fallito', color: 'error' },
      draft: { label: 'Bozza', color: 'muted' },
    };
    return statusMap[status] || { label: status, color: 'muted' };
  }
}
