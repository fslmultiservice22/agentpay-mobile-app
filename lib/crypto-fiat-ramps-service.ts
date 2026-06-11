/**
 * Crypto-to-Fiat On/Off Ramps Service
 * Stripe, Wyre, Ramp integration for fiat conversions
 */

export interface RampProvider {
  id: string;
  name: string;
  type: 'on-ramp' | 'off-ramp' | 'both';
  supportedFiats: string[];
  supportedCryptos: string[];
  minAmount: number;
  maxAmount: number;
  fee: number; // percentage
  processingTime: string;
  kycRequired: boolean;
  status: 'active' | 'maintenance' | 'unavailable';
}

export interface OnRampTransaction {
  id: string;
  userId: string;
  provider: string;
  fiatAmount: number;
  fiatCurrency: string;
  cryptoAmount: number;
  cryptoAsset: string;
  exchangeRate: number;
  fee: number;
  totalCost: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  walletAddress?: string;
}

export interface OffRampTransaction {
  id: string;
  userId: string;
  provider: string;
  cryptoAmount: number;
  cryptoAsset: string;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;
  fee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  bankAccount?: string;
}

export interface KYCVerification {
  id: string;
  userId: string;
  provider: string;
  status: 'pending' | 'verified' | 'rejected';
  verificationLevel: 'basic' | 'intermediate' | 'advanced';
  dailyLimit: number;
  monthlyLimit: number;
  verifiedAt?: number;
  expiresAt?: number;
}

export interface ExchangeRate {
  pair: string; // e.g., 'BTC/USD'
  rate: number;
  timestamp: number;
  provider: string;
  bid: number;
  ask: number;
}

export interface RampQuote {
  id: string;
  provider: string;
  type: 'on-ramp' | 'off-ramp';
  inputAmount: number;
  inputCurrency: string;
  outputAmount: number;
  outputCurrency: string;
  exchangeRate: number;
  fee: number;
  totalCost: number;
  processingTime: string;
  expiresAt: number;
}

class CryptoFiatRampsService {
  private providers: Map<string, RampProvider> = new Map();
  private onRampTransactions: Map<string, OnRampTransaction> = new Map();
  private offRampTransactions: Map<string, OffRampTransaction> = new Map();
  private kycVerifications: Map<string, KYCVerification> = new Map();
  private exchangeRates: Map<string, ExchangeRate> = new Map();
  private quotes: Map<string, RampQuote> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeExchangeRates();
  }

  /**
   * Initialize ramp providers
   */
  private initializeProviders(): void {
    const providers: RampProvider[] = [
      {
        id: 'stripe',
        name: 'Stripe',
        type: 'both',
        supportedFiats: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        supportedCryptos: ['BTC', 'ETH', 'USDC', 'DAI'],
        minAmount: 10,
        maxAmount: 100000,
        fee: 1.5,
        processingTime: '1-3 minutes',
        kycRequired: true,
        status: 'active',
      },
      {
        id: 'wyre',
        name: 'Wyre',
        type: 'both',
        supportedFiats: ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD'],
        supportedCryptos: ['BTC', 'ETH', 'USDC', 'USDT', 'DAI', 'MATIC'],
        minAmount: 5,
        maxAmount: 250000,
        fee: 1.75,
        processingTime: '2-5 minutes',
        kycRequired: true,
        status: 'active',
      },
      {
        id: 'ramp',
        name: 'Ramp',
        type: 'both',
        supportedFiats: ['USD', 'EUR', 'GBP', 'CHF', 'SEK', 'NOK'],
        supportedCryptos: ['BTC', 'ETH', 'USDC', 'DAI', 'USDT'],
        minAmount: 20,
        maxAmount: 50000,
        fee: 1.49,
        processingTime: '1-2 minutes',
        kycRequired: true,
        status: 'active',
      },
    ];

    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }
  }

  /**
   * Initialize exchange rates
   */
  private initializeExchangeRates(): void {
    const rates: ExchangeRate[] = [
      { pair: 'BTC/USD', rate: 45000, timestamp: Date.now(), provider: 'stripe', bid: 44900, ask: 45100 },
      { pair: 'ETH/USD', rate: 2500, timestamp: Date.now(), provider: 'stripe', bid: 2490, ask: 2510 },
      { pair: 'USDC/USD', rate: 1, timestamp: Date.now(), provider: 'stripe', bid: 0.999, ask: 1.001 },
      { pair: 'BTC/EUR', rate: 41500, timestamp: Date.now(), provider: 'wyre', bid: 41400, ask: 41600 },
      { pair: 'ETH/EUR', rate: 2300, timestamp: Date.now(), provider: 'wyre', bid: 2290, ask: 2310 },
    ];

    for (const rate of rates) {
      this.exchangeRates.set(rate.pair, rate);
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(type: 'on-ramp' | 'off-ramp' | 'both' = 'both'): RampProvider[] {
    return Array.from(this.providers.values())
      .filter(p => (type === 'both' || p.type === type || p.type === 'both') && p.status === 'active')
      .sort((a, b) => a.fee - b.fee);
  }

  /**
   * Get quote
   */
  getQuote(
    provider: string,
    type: 'on-ramp' | 'off-ramp',
    inputAmount: number,
    inputCurrency: string,
    outputCurrency: string
  ): RampQuote {
    const prov = this.providers.get(provider);
    if (!prov) throw new Error('Provider not found');

    // Validate currencies
    if (type === 'on-ramp' && !prov.supportedFiats.includes(inputCurrency)) {
      throw new Error(`${provider} does not support ${inputCurrency}`);
    }
    if (type === 'on-ramp' && !prov.supportedCryptos.includes(outputCurrency)) {
      throw new Error(`${provider} does not support ${outputCurrency}`);
    }

    // Get exchange rate
    const pair = type === 'on-ramp' ? `${outputCurrency}/${inputCurrency}` : `${inputCurrency}/${outputCurrency}`;
    const rateData = this.exchangeRates.get(pair) || { rate: 1, bid: 0.99, ask: 1.01 };

    const exchangeRate = type === 'on-ramp' ? rateData.bid : rateData.ask;
    const outputAmount = inputAmount / exchangeRate;
    const fee = (inputAmount * prov.fee) / 100;
    const totalCost = inputAmount + fee;

    const quote: RampQuote = {
      id: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider,
      type,
      inputAmount,
      inputCurrency,
      outputAmount,
      outputCurrency,
      exchangeRate,
      fee,
      totalCost,
      processingTime: prov.processingTime,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    this.quotes.set(quote.id, quote);

    return quote;
  }

  /**
   * Verify KYC
   */
  verifyKYC(userId: string, provider: string, verificationLevel: 'basic' | 'intermediate' | 'advanced' = 'intermediate'): KYCVerification {
    const verification: KYCVerification = {
      id: `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      provider,
      status: 'pending',
      verificationLevel,
      dailyLimit: verificationLevel === 'basic' ? 1000 : verificationLevel === 'intermediate' ? 10000 : 100000,
      monthlyLimit: verificationLevel === 'basic' ? 5000 : verificationLevel === 'intermediate' ? 50000 : 500000,
    };

    this.kycVerifications.set(verification.id, verification);

    // Simulate verification
    setTimeout(() => {
      verification.status = 'verified';
      verification.verifiedAt = Date.now();
      verification.expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
    }, 3000);

    return verification;
  }

  /**
   * Get KYC status
   */
  getKYCStatus(userId: string, provider: string): KYCVerification | undefined {
    return Array.from(this.kycVerifications.values()).find(k => k.userId === userId && k.provider === provider);
  }

  /**
   * Create on-ramp transaction
   */
  createOnRampTransaction(userId: string, quoteId: string, walletAddress: string): OnRampTransaction {
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new Error('Quote not found');

    // Check KYC
    const kyc = this.getKYCStatus(userId, quote.provider);
    if (!kyc || kyc.status !== 'verified') {
      throw new Error('KYC verification required');
    }

    // Check limits
    if (quote.inputAmount > kyc.dailyLimit) {
      throw new Error(`Daily limit exceeded. Max: ${kyc.dailyLimit}`);
    }

    const transaction: OnRampTransaction = {
      id: `onramp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      provider: quote.provider,
      fiatAmount: quote.inputAmount,
      fiatCurrency: quote.inputCurrency,
      cryptoAmount: quote.outputAmount,
      cryptoAsset: quote.outputCurrency,
      exchangeRate: quote.exchangeRate,
      fee: quote.fee,
      totalCost: quote.totalCost,
      status: 'pending',
      createdAt: Date.now(),
      walletAddress,
    };

    this.onRampTransactions.set(transaction.id, transaction);

    // Simulate processing
    setTimeout(() => {
      transaction.status = 'processing';
    }, 1000);

    setTimeout(() => {
      transaction.status = 'completed';
      transaction.completedAt = Date.now();
    }, 5000);

    return transaction;
  }

  /**
   * Create off-ramp transaction
   */
  createOffRampTransaction(userId: string, quoteId: string, bankAccount: string): OffRampTransaction {
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new Error('Quote not found');

    // Check KYC
    const kyc = this.getKYCStatus(userId, quote.provider);
    if (!kyc || kyc.status !== 'verified') {
      throw new Error('KYC verification required');
    }

    const transaction: OffRampTransaction = {
      id: `offramp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      provider: quote.provider,
      cryptoAmount: quote.inputAmount,
      cryptoAsset: quote.inputCurrency,
      fiatAmount: quote.outputAmount,
      fiatCurrency: quote.outputCurrency,
      exchangeRate: quote.exchangeRate,
      fee: quote.fee,
      netAmount: quote.outputAmount - quote.fee,
      status: 'pending',
      createdAt: Date.now(),
      bankAccount,
    };

    this.offRampTransactions.set(transaction.id, transaction);

    // Simulate processing
    setTimeout(() => {
      transaction.status = 'processing';
    }, 2000);

    setTimeout(() => {
      transaction.status = 'completed';
      transaction.completedAt = Date.now();
    }, 10000);

    return transaction;
  }

  /**
   * Get user on-ramp transactions
   */
  getUserOnRampTransactions(userId: string): OnRampTransaction[] {
    return Array.from(this.onRampTransactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get user off-ramp transactions
   */
  getUserOffRampTransactions(userId: string): OffRampTransaction[] {
    return Array.from(this.offRampTransactions.values())
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get exchange rate
   */
  getExchangeRate(pair: string): ExchangeRate | undefined {
    return this.exchangeRates.get(pair);
  }

  /**
   * Get all exchange rates
   */
  getAllExchangeRates(): ExchangeRate[] {
    return Array.from(this.exchangeRates.values());
  }

  /**
   * Get ramp statistics
   */
  getRampStatistics(userId: string): {
    totalOnRamped: number;
    totalOffRamped: number;
    totalFeesPaid: number;
    averageOnRampAmount: number;
    averageOffRampAmount: number;
    transactionCount: number;
  } {
    const onRamps = this.getUserOnRampTransactions(userId).filter(t => t.status === 'completed');
    const offRamps = this.getUserOffRampTransactions(userId).filter(t => t.status === 'completed');

    const totalOnRamped = onRamps.reduce((sum, t) => sum + t.fiatAmount, 0);
    const totalOffRamped = offRamps.reduce((sum, t) => sum + t.fiatAmount, 0);
    const totalFeesPaid = [...onRamps, ...offRamps].reduce((sum, t) => sum + t.fee, 0);

    return {
      totalOnRamped,
      totalOffRamped,
      totalFeesPaid,
      averageOnRampAmount: onRamps.length > 0 ? totalOnRamped / onRamps.length : 0,
      averageOffRampAmount: offRamps.length > 0 ? totalOffRamped / offRamps.length : 0,
      transactionCount: onRamps.length + offRamps.length,
    };
  }

  /**
   * Compare providers
   */
  compareProviders(type: 'on-ramp' | 'off-ramp', inputAmount: number, inputCurrency: string, outputCurrency: string) {
    const providers = this.getAvailableProviders(type);
    const comparisons = [];

    for (const provider of providers) {
      try {
        const quote = this.getQuote(provider.id, type, inputAmount, inputCurrency, outputCurrency);
        comparisons.push({
          provider: provider.name,
          fee: quote.fee,
          outputAmount: quote.outputAmount,
          totalCost: quote.totalCost,
          processingTime: quote.processingTime,
        });
      } catch (e) {
        // Skip if not supported
      }
    }

    return comparisons.sort((a, b) => b.outputAmount - a.outputAmount);
  }
}

export const cryptoFiatRampsService = new CryptoFiatRampsService();
