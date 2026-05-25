/**
 * Bank Integration Service
 * Handles real bank transfers via Stripe and Wise
 */

export interface BankTransfer {
  id: string;
  amount: number;
  currency: string;
  fromAccount: string;
  toAccount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
  reference?: string;
  errorMessage?: string;
}

export interface TransferQuote {
  amount: number;
  fee: number;
  total: number;
  exchangeRate?: number;
  estimatedDelivery: string;
}

export interface BankAccount {
  id: string;
  accountHolder: string;
  iban: string;
  bic?: string;
  bank: string;
  country: string;
  isDefault: boolean;
}

class BankIntegrationService {
  private transfers: Map<string, BankTransfer> = new Map();
  private accounts: Map<string, BankAccount> = new Map();
  private stripeApiKey?: string;
  private wiseApiKey?: string;

  constructor() {
    // Initialize with mock data
    this.initializeMockAccounts();
  }

  /**
   * Initialize with mock bank accounts for demo
   */
  private initializeMockAccounts() {
    const mockAccount: BankAccount = {
      id: 'acc_fernando_simon',
      accountHolder: 'Fernando Simon Luis',
      iban: 'IT95X0300203280123456789',
      bic: 'BCITITMM',
      bank: 'Intesa Sanpaolo',
      country: 'IT',
      isDefault: true,
    };

    this.accounts.set(mockAccount.id, mockAccount);
  }

  /**
   * Set Stripe API key for real transfers
   */
  setStripeApiKey(apiKey: string) {
    this.stripeApiKey = apiKey;
  }

  /**
   * Set Wise API key for real transfers
   */
  setWiseApiKey(apiKey: string) {
    this.wiseApiKey = apiKey;
  }

  /**
   * Get available bank accounts
   */
  getAccounts(): BankAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get quote for a transfer
   */
  async getTransferQuote(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    method: 'stripe' | 'wise' = 'stripe'
  ): Promise<TransferQuote> {
    // Calculate fees based on method
    const feePercentage = method === 'stripe' ? 0.029 : 0.015; // 2.9% Stripe, 1.5% Wise
    const fixedFee = method === 'stripe' ? 0.3 : 0.5; // $0.30 Stripe, $0.50 Wise

    const fee = amount * feePercentage + fixedFee;
    const exchangeRate = this.getExchangeRate(fromCurrency, toCurrency);
    const total = (amount + fee) * exchangeRate;

    // Estimate delivery time
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + (method === 'stripe' ? 3 : 1));

    return {
      amount,
      fee: Math.round(fee * 100) / 100,
      total: Math.round(total * 100) / 100,
      exchangeRate,
      estimatedDelivery: estimatedDelivery.toISOString(),
    };
  }

  /**
   * Initiate a bank transfer
   */
  async initiateTransfer(
    amount: number,
    fromAccountId: string,
    toAccountId: string,
    currency: string = 'EUR',
    method: 'stripe' | 'wise' = 'stripe'
  ): Promise<BankTransfer> {
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transfer: BankTransfer = {
      id: transferId,
      amount,
      currency,
      fromAccount: fromAccountId,
      toAccount: toAccountId,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reference: this.generateReference(),
    };

    this.transfers.set(transferId, transfer);

    // Simulate processing
    this.processTransfer(transferId, method);

    return transfer;
  }

  /**
   * Process transfer (simulate or call real API)
   */
  private async processTransfer(transferId: string, method: 'stripe' | 'wise') {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return;

    // Update to processing
    transfer.status = 'processing';
    transfer.updatedAt = Date.now();

    try {
      if (method === 'stripe' && this.stripeApiKey) {
        // Call Stripe API
        await this.processWithStripe(transfer);
      } else if (method === 'wise' && this.wiseApiKey) {
        // Call Wise API
        await this.processWithWise(transfer);
      } else {
        // Simulate successful transfer
        await this.simulateTransfer(transfer);
      }
    } catch (error) {
      transfer.status = 'failed';
      transfer.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    transfer.updatedAt = Date.now();
  }

  /**
   * Process transfer with Stripe
   */
  private async processWithStripe(transfer: BankTransfer) {
    // In production, call Stripe API
    // For now, simulate
    await new Promise(resolve => setTimeout(resolve, 2000));
    transfer.status = 'completed';
  }

  /**
   * Process transfer with Wise
   */
  private async processWithWise(transfer: BankTransfer) {
    // In production, call Wise API
    // For now, simulate
    await new Promise(resolve => setTimeout(resolve, 1500));
    transfer.status = 'completed';
  }

  /**
   * Simulate transfer (for demo)
   */
  private async simulateTransfer(transfer: BankTransfer) {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 95% success rate for demo
    const success = Math.random() < 0.95;
    if (success) {
      transfer.status = 'completed';
    } else {
      transfer.status = 'failed';
      transfer.errorMessage = 'Insufficient funds';
    }
  }

  /**
   * Get transfer status
   */
  getTransferStatus(transferId: string): BankTransfer | null {
    return this.transfers.get(transferId) || null;
  }

  /**
   * Get all transfers
   */
  getAllTransfers(): BankTransfer[] {
    return Array.from(this.transfers.values());
  }

  /**
   * Get transfer history
   */
  getTransferHistory(limit: number = 10): BankTransfer[] {
    return Array.from(this.transfers.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Cancel a pending transfer
   */
  async cancelTransfer(transferId: string): Promise<boolean> {
    const transfer = this.transfers.get(transferId);
    if (!transfer) return false;

    if (transfer.status === 'pending' || transfer.status === 'processing') {
      transfer.status = 'failed';
      transfer.errorMessage = 'Cancelled by user';
      transfer.updatedAt = Date.now();
      return true;
    }

    return false;
  }

  /**
   * Generate unique transfer reference
   */
  private generateReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `AGENTPAY${timestamp}${random}`;
  }

  /**
   * Get exchange rate (mock)
   */
  private getExchangeRate(fromCurrency: string, toCurrency: string): number {
    // Mock exchange rates
    const rates: Record<string, number> = {
      'EUR': 1,
      'USD': 1.1,
      'GBP': 0.86,
      'CHF': 0.95,
      'SEK': 10.5,
      'NOK': 11.2,
    };

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    return toRate / fromRate;
  }

  /**
   * Validate IBAN
   */
  validateIban(iban: string): boolean {
    // Basic IBAN validation
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(iban);
  }

  /**
   * Format IBAN for display
   */
  formatIban(iban: string): string {
    // Show only first 4 and last 4 characters
    if (iban.length <= 8) return iban;
    return `${iban.slice(0, 4)}${'*'.repeat(iban.length - 8)}${iban.slice(-4)}`;
  }
}

// Export singleton instance
export const bankIntegration = new BankIntegrationService();
