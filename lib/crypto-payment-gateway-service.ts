/**
 * Mobile Crypto Payment Gateway Service
 * Merchant payments with instant fiat conversion and settlement
 */

export interface MerchantAccount {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  webhookUrl: string;
  bankAccount: {
    iban: string;
    accountHolder: string;
    bankName: string;
  };
  settlementCurrency: string;
  settlementFrequency: 'daily' | 'weekly' | 'monthly';
  feePercentage: number;
  active: boolean;
  createdAt: number;
}

export interface CryptoPayment {
  id: string;
  merchantId: string;
  customerId: string;
  orderId: string;
  amount: number;
  currency: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  exchangeRate: number;
  status: 'pending' | 'confirmed' | 'completed' | 'failed' | 'refunded';
  transactionHash?: string;
  paymentAddress: string;
  expiresAt: number;
  completedAt?: number;
  refundedAt?: number;
  metadata: Record<string, any>;
  createdAt: number;
}

export interface Settlement {
  id: string;
  merchantId: string;
  periodStart: number;
  periodEnd: number;
  totalAmount: number;
  totalFees: number;
  netAmount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionId?: string;
  completedAt?: number;
  createdAt: number;
}

export interface PaymentWebhook {
  id: string;
  merchantId: string;
  paymentId: string;
  event: 'payment.pending' | 'payment.confirmed' | 'payment.completed' | 'payment.failed';
  payload: Record<string, any>;
  status: 'pending' | 'delivered' | 'failed';
  deliveredAt?: number;
  retryCount: number;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

class CryptoPaymentGatewayService {
  private merchants: Map<string, MerchantAccount> = new Map();
  private payments: Map<string, CryptoPayment> = new Map();
  private settlements: Map<string, Settlement> = new Map();
  private webhooks: Map<string, PaymentWebhook> = new Map();
  private exchangeRates: Map<string, ExchangeRate> = new Map();

  constructor() {
    this.initializeExchangeRates();
  }

  /**
   * Initialize exchange rates
   */
  private initializeExchangeRates(): void {
    const rates: ExchangeRate[] = [
      { from: 'ETH', to: 'USD', rate: 2500, timestamp: Date.now() },
      { from: 'BTC', to: 'USD', rate: 45000, timestamp: Date.now() },
      { from: 'SOL', to: 'USD', rate: 100, timestamp: Date.now() },
      { from: 'USDC', to: 'USD', rate: 1, timestamp: Date.now() },
    ];

    for (const rate of rates) {
      this.exchangeRates.set(`${rate.from}-${rate.to}`, rate);
    }
  }

  /**
   * Create merchant account
   */
  createMerchantAccount(
    name: string,
    email: string,
    bankAccount: MerchantAccount['bankAccount'],
    webhookUrl: string,
    settlementCurrency: string = 'USD'
  ): MerchantAccount {
    const merchant: MerchantAccount = {
      id: `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      apiKey: this.generateAPIKey(),
      webhookUrl,
      bankAccount,
      settlementCurrency,
      settlementFrequency: 'daily',
      feePercentage: 1.5,
      active: true,
      createdAt: Date.now(),
    };

    this.merchants.set(merchant.id, merchant);
    return merchant;
  }

  /**
   * Generate payment request
   */
  generatePaymentRequest(
    merchantId: string,
    customerId: string,
    orderId: string,
    amount: number,
    currency: string,
    cryptoCurrency: string,
    metadata: Record<string, any> = {}
  ): CryptoPayment {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) throw new Error('Merchant not found');

    const exchangeRateKey = `${cryptoCurrency}-${currency}`;
    const exchangeRate = this.exchangeRates.get(exchangeRateKey);
    if (!exchangeRate) throw new Error('Exchange rate not available');

    const cryptoAmount = amount / exchangeRate.rate;

    const payment: CryptoPayment = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchantId,
      customerId,
      orderId,
      amount,
      currency,
      cryptoAmount,
      cryptoCurrency,
      exchangeRate: exchangeRate.rate,
      status: 'pending',
      paymentAddress: this.generatePaymentAddress(),
      expiresAt: Date.now() + (15 * 60 * 1000), // 15 minutes
      metadata,
      createdAt: Date.now(),
    };

    this.payments.set(payment.id, payment);

    // Send webhook
    this.sendWebhook(merchantId, payment.id, 'payment.pending', payment);

    return payment;
  }

  /**
   * Confirm payment
   */
  confirmPayment(paymentId: string, transactionHash: string): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) return false;
    if (payment.status !== 'pending') return false;

    payment.status = 'confirmed';
    payment.transactionHash = transactionHash;

    // Send webhook
    this.sendWebhook(payment.merchantId, paymentId, 'payment.confirmed', payment);

    return true;
  }

  /**
   * Complete payment
   */
  completePayment(paymentId: string): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) return false;
    if (payment.status !== 'confirmed') return false;

    payment.status = 'completed';
    payment.completedAt = Date.now();

    // Send webhook
    this.sendWebhook(payment.merchantId, paymentId, 'payment.completed', payment);

    return true;
  }

  /**
   * Refund payment
   */
  refundPayment(paymentId: string, reason: string): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) return false;
    if (payment.status !== 'completed') return false;

    payment.status = 'refunded';
    payment.refundedAt = Date.now();

    // Send webhook
    this.sendWebhook(payment.merchantId, paymentId, 'payment.failed', {
      ...payment,
      refundReason: reason,
    });

    return true;
  }

  /**
   * Get payment details
   */
  getPayment(paymentId: string): CryptoPayment | undefined {
    return this.payments.get(paymentId);
  }

  /**
   * Get merchant payments
   */
  getMerchantPayments(merchantId: string, status?: string): CryptoPayment[] {
    let payments = Array.from(this.payments.values()).filter(p => p.merchantId === merchantId);

    if (status) {
      payments = payments.filter(p => p.status === status);
    }

    return payments.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Create settlement
   */
  createSettlement(merchantId: string, periodStart: number, periodEnd: number): Settlement {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) throw new Error('Merchant not found');

    const payments = this.getMerchantPayments(merchantId, 'completed')
      .filter(p => p.completedAt && p.completedAt >= periodStart && p.completedAt <= periodEnd);

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalFees = totalAmount * (merchant.feePercentage / 100);
    const netAmount = totalAmount - totalFees;

    const settlement: Settlement = {
      id: `settlement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchantId,
      periodStart,
      periodEnd,
      totalAmount,
      totalFees,
      netAmount,
      currency: merchant.settlementCurrency,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.settlements.set(settlement.id, settlement);

    return settlement;
  }

  /**
   * Process settlement
   */
  processSettlement(settlementId: string, transactionId: string): boolean {
    const settlement = this.settlements.get(settlementId);
    if (!settlement) return false;
    if (settlement.status !== 'pending') return false;

    settlement.status = 'processing';
    settlement.transactionId = transactionId;

    // Simulate processing
    setTimeout(() => {
      settlement.status = 'completed';
      settlement.completedAt = Date.now();
    }, 5000);

    return true;
  }

  /**
   * Get merchant settlements
   */
  getMerchantSettlements(merchantId: string): Settlement[] {
    return Array.from(this.settlements.values())
      .filter(s => s.merchantId === merchantId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Update exchange rate
   */
  updateExchangeRate(from: string, to: string, rate: number): void {
    const key = `${from}-${to}`;
    this.exchangeRates.set(key, {
      from,
      to,
      rate,
      timestamp: Date.now(),
    });
  }

  /**
   * Get exchange rate
   */
  getExchangeRate(from: string, to: string): number | undefined {
    return this.exchangeRates.get(`${from}-${to}`)?.rate;
  }

  /**
   * Send webhook
   */
  private sendWebhook(
    merchantId: string,
    paymentId: string,
    event: PaymentWebhook['event'],
    payload: Record<string, any>
  ): void {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return;

    const webhook: PaymentWebhook = {
      id: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchantId,
      paymentId,
      event,
      payload,
      status: 'pending',
      retryCount: 0,
    };

    this.webhooks.set(webhook.id, webhook);

    // Simulate webhook delivery
    setTimeout(() => {
      webhook.status = 'delivered';
      webhook.deliveredAt = Date.now();
    }, 1000);
  }

  /**
   * Get webhook history
   */
  getWebhookHistory(merchantId: string): PaymentWebhook[] {
    return Array.from(this.webhooks.values())
      .filter(w => w.merchantId === merchantId)
      .sort((a, b) => b.id.localeCompare(a.id));
  }

  /**
   * Generate payment address
   */
  private generatePaymentAddress(): string {
    return `0x${Math.random().toString(16).substr(2, 40)}`;
  }

  /**
   * Generate API key
   */
  private generateAPIKey(): string {
    return `pk_live_${Math.random().toString(36).substr(2, 32)}`;
  }

  /**
   * Get merchant dashboard stats
   */
  getMerchantStats(merchantId: string): {
    totalPayments: number;
    completedPayments: number;
    totalVolume: number;
    totalFees: number;
    averageTransactionSize: number;
  } {
    const payments = this.getMerchantPayments(merchantId);
    const completedPayments = payments.filter(p => p.status === 'completed');

    const totalVolume = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalFees = completedPayments.reduce((sum, p) => sum + (p.amount * 0.015), 0);
    const averageTransactionSize = completedPayments.length > 0 ? totalVolume / completedPayments.length : 0;

    return {
      totalPayments: payments.length,
      completedPayments: completedPayments.length,
      totalVolume,
      totalFees,
      averageTransactionSize,
    };
  }

  /**
   * Validate payment address
   */
  validatePaymentAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get all merchants
   */
  getAllMerchants(): MerchantAccount[] {
    return Array.from(this.merchants.values());
  }

  /**
   * Update merchant settings
   */
  updateMerchantSettings(merchantId: string, updates: Partial<MerchantAccount>): boolean {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return false;

    Object.assign(merchant, updates);
    return true;
  }
}

export const cryptoPaymentGatewayService = new CryptoPaymentGatewayService();
