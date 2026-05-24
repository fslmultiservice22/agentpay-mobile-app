/**
 * Fiat On/Off Ramps Service
 * Stripe and Wyre integration for fiat to crypto conversions
 */

export interface FiatRamp {
  id: string;
  provider: 'stripe' | 'wyre';
  type: 'onramp' | 'offramp';
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  cryptoAmount: number;
  cryptoSymbol: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fee: number;
  rate: number;
  timestamp: number;
  expiresAt: number;
  walletAddress?: string;
  bankAccount?: string;
  paymentMethod?: string;
}

export interface RampQuote {
  provider: 'stripe' | 'wyre';
  fiatAmount: number;
  cryptoAmount: number;
  rate: number;
  fee: number;
  total: number;
  estimatedTime: string;
  expiresIn: number;
}

export interface FiatRampLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'apple_pay' | 'google_pay';
  provider: string;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: number;
}

class FiatRampsService {
  private ramps: Map<string, FiatRamp> = new Map();
  private quotes: Map<string, RampQuote> = new Map();
  private paymentMethods: Map<string, PaymentMethod> = new Map();
  private limits: Map<string, FiatRampLimits> = new Map();

  constructor() {
    this.initializeLimits();
  }

  /**
   * Initialize default limits
   */
  private initializeLimits(): void {
    const defaultLimits: FiatRampLimits = {
      minAmount: 10,
      maxAmount: 50000,
      dailyLimit: 10000,
      monthlyLimit: 100000,
      dailyUsed: 0,
      monthlyUsed: 0,
    };

    this.limits.set('default', defaultLimits);
  }

  /**
   * Get fiat ramp quote
   */
  getQuote(
    provider: 'stripe' | 'wyre',
    fiatAmount: number,
    fiatCurrency: string,
    cryptoSymbol: string
  ): RampQuote {
    // Mock rates
    const rates: Record<string, number> = {
      'USD-ETH': 0.00045,
      'USD-BTC': 0.000015,
      'USD-USDC': 1.0,
      'EUR-ETH': 0.00042,
      'GBP-ETH': 0.00038,
    };

    const rateKey = `${fiatCurrency}-${cryptoSymbol}`;
    const rate = rates[rateKey] || 0.0001;
    const cryptoAmount = fiatAmount * rate;

    // Calculate fees (2-3% depending on provider)
    const feePercentage = provider === 'stripe' ? 0.03 : 0.025;
    const fee = fiatAmount * feePercentage;
    const total = fiatAmount + fee;

    const quote: RampQuote = {
      provider,
      fiatAmount,
      cryptoAmount,
      rate,
      fee,
      total,
      estimatedTime: provider === 'stripe' ? '1-3 minutes' : '5-10 minutes',
      expiresIn: 900, // 15 minutes
    };

    const quoteId = `quote_${Date.now()}`;
    this.quotes.set(quoteId, quote);

    return quote;
  }

  /**
   * Create on-ramp transaction
   */
  createOnRamp(
    userId: string,
    provider: 'stripe' | 'wyre',
    fiatAmount: number,
    fiatCurrency: string,
    cryptoSymbol: string,
    walletAddress: string,
    paymentMethodId: string
  ): FiatRamp {
    const quote = this.getQuote(provider, fiatAmount, fiatCurrency, cryptoSymbol);

    const ramp: FiatRamp = {
      id: `ramp_${Date.now()}`,
      provider,
      type: 'onramp',
      amount: fiatAmount,
      currency: fiatCurrency as any,
      cryptoAmount: quote.cryptoAmount,
      cryptoSymbol,
      status: 'pending',
      fee: quote.fee,
      rate: quote.rate,
      timestamp: Date.now(),
      expiresAt: Date.now() + quote.expiresIn * 1000,
      walletAddress,
      paymentMethod: paymentMethodId,
    };

    this.ramps.set(ramp.id, ramp);
    this.updateLimits(userId, fiatAmount, 'add');

    return ramp;
  }

  /**
   * Create off-ramp transaction
   */
  createOffRamp(
    userId: string,
    provider: 'stripe' | 'wyre',
    cryptoAmount: number,
    cryptoSymbol: string,
    fiatCurrency: string,
    bankAccountId: string
  ): FiatRamp {
    // Mock conversion
    const rates: Record<string, number> = {
      'ETH-USD': 2200,
      'BTC-USD': 65000,
      'USDC-USD': 1,
    };

    const rateKey = `${cryptoSymbol}-${fiatCurrency}`;
    const rate = rates[rateKey] || 1;
    const fiatAmount = cryptoAmount * rate;
    const feePercentage = provider === 'stripe' ? 0.03 : 0.025;
    const fee = fiatAmount * feePercentage;

    const ramp: FiatRamp = {
      id: `ramp_${Date.now()}`,
      provider,
      type: 'offramp',
      amount: fiatAmount,
      currency: fiatCurrency as any,
      cryptoAmount,
      cryptoSymbol,
      status: 'pending',
      fee,
      rate,
      timestamp: Date.now(),
      expiresAt: Date.now() + 900000,
      bankAccount: bankAccountId,
    };

    this.ramps.set(ramp.id, ramp);

    return ramp;
  }

  /**
   * Get ramp status
   */
  getRampStatus(rampId: string): FiatRamp | undefined {
    return this.ramps.get(rampId);
  }

  /**
   * Update ramp status
   */
  updateRampStatus(rampId: string, status: FiatRamp['status']): void {
    const ramp = this.ramps.get(rampId);
    if (ramp) {
      ramp.status = status;
    }
  }

  /**
   * Get payment methods
   */
  getPaymentMethods(userId: string): PaymentMethod[] {
    return Array.from(this.paymentMethods.values()).filter(
      pm => pm.id.startsWith(`pm_${userId}`)
    );
  }

  /**
   * Add payment method
   */
  addPaymentMethod(
    userId: string,
    type: PaymentMethod['type'],
    provider: string,
    last4: string,
    expiryMonth?: number,
    expiryYear?: number
  ): PaymentMethod {
    const paymentMethod: PaymentMethod = {
      id: `pm_${userId}_${Date.now()}`,
      type,
      provider,
      last4,
      expiryMonth,
      expiryYear,
      isDefault: this.getPaymentMethods(userId).length === 0,
      createdAt: Date.now(),
    };

    this.paymentMethods.set(paymentMethod.id, paymentMethod);
    return paymentMethod;
  }

  /**
   * Delete payment method
   */
  deletePaymentMethod(paymentMethodId: string): void {
    this.paymentMethods.delete(paymentMethodId);
  }

  /**
   * Set default payment method
   */
  setDefaultPaymentMethod(userId: string, paymentMethodId: string): void {
    const methods = this.getPaymentMethods(userId);
    methods.forEach(pm => {
      pm.isDefault = pm.id === paymentMethodId;
    });
  }

  /**
   * Get ramp limits
   */
  getLimits(userId: string): FiatRampLimits {
    return this.limits.get(userId) || this.limits.get('default')!;
  }

  /**
   * Update limits
   */
  private updateLimits(userId: string, amount: number, operation: 'add' | 'subtract'): void {
    const limits = this.getLimits(userId);
    const multiplier = operation === 'add' ? 1 : -1;

    limits.dailyUsed += amount * multiplier;
    limits.monthlyUsed += amount * multiplier;

    this.limits.set(userId, limits);
  }

  /**
   * Check if amount is within limits
   */
  checkLimits(userId: string, amount: number): { allowed: boolean; reason?: string } {
    const limits = this.getLimits(userId);

    if (amount < limits.minAmount) {
      return { allowed: false, reason: `Minimum amount is $${limits.minAmount}` };
    }

    if (amount > limits.maxAmount) {
      return { allowed: false, reason: `Maximum amount is $${limits.maxAmount}` };
    }

    if (limits.dailyUsed + amount > limits.dailyLimit) {
      const remaining = limits.dailyLimit - limits.dailyUsed;
      return { allowed: false, reason: `Daily limit exceeded. Remaining: $${remaining}` };
    }

    if (limits.monthlyUsed + amount > limits.monthlyLimit) {
      const remaining = limits.monthlyLimit - limits.monthlyUsed;
      return { allowed: false, reason: `Monthly limit exceeded. Remaining: $${remaining}` };
    }

    return { allowed: true };
  }

  /**
   * Get ramp history
   */
  getRampHistory(userId: string, limit: number = 20): FiatRamp[] {
    return Array.from(this.ramps.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get ramp statistics
   */
  getRampStats(userId: string): {
    totalOnRamps: number;
    totalOffRamps: number;
    totalVolume: number;
    totalFees: number;
    averageRate: number;
  } {
    const ramps = Array.from(this.ramps.values());

    const onRamps = ramps.filter(r => r.type === 'onramp' && r.status === 'completed');
    const offRamps = ramps.filter(r => r.type === 'offramp' && r.status === 'completed');

    const totalVolume = [...onRamps, ...offRamps].reduce((sum, r) => sum + r.amount, 0);
    const totalFees = [...onRamps, ...offRamps].reduce((sum, r) => sum + r.fee, 0);
    const averageRate = ramps.length > 0 ? ramps.reduce((sum, r) => sum + r.rate, 0) / ramps.length : 0;

    return {
      totalOnRamps: onRamps.length,
      totalOffRamps: offRamps.length,
      totalVolume,
      totalFees,
      averageRate,
    };
  }

  /**
   * Estimate conversion
   */
  estimateConversion(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): { estimatedAmount: number; rate: number; fee: number } {
    const rates: Record<string, number> = {
      'USD-EUR': 0.92,
      'USD-GBP': 0.79,
      'EUR-USD': 1.09,
      'GBP-USD': 1.27,
    };

    const rateKey = `${fromCurrency}-${toCurrency}`;
    const rate = rates[rateKey] || 1;
    const fee = amount * 0.02; // 2% fee
    const estimatedAmount = amount * rate - fee;

    return {
      estimatedAmount,
      rate,
      fee,
    };
  }
}

export const fiatRampsService = new FiatRampsService();
