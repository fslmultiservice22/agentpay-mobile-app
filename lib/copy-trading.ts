/**
 * Copy Trading Service
 * Allows users to automatically copy trades from experienced traders
 */

export interface Trader {
  id: string;
  name: string;
  address: string;
  winRate: number; // 0-100
  totalTrades: number;
  profitFactor: number; // Total profit / Total loss
  avgReturn: number; // Average return per trade (%)
  followers: number;
  verified: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  monthlyReturn: number; // %
  description: string;
}

export interface CopyTrade {
  id: string;
  traderId: string;
  originalTradeId: string;
  fromToken: string;
  toToken: string;
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  status: 'pending' | 'copied' | 'closed' | 'failed';
  copiedAt: number;
  closedAt?: number;
  profitLoss?: number;
  profitLossPercent?: number;
}

export interface CopyTradingConfig {
  enabled: boolean;
  maxCopies: number;
  maxTradeSize: number; // USD
  stopLoss: number; // %
  takeProfit: number; // %
  autoClose: boolean;
  scaleFactor: number; // 0.1-1.0
}

class CopyTradingService {
  private traders: Map<string, Trader> = new Map();
  private copiedTrades: Map<string, CopyTrade> = new Map();
  private activeCopies: Map<string, string[]> = new Map(); // traderId -> copyTradeIds
  private config: CopyTradingConfig = {
    enabled: true,
    maxCopies: 10,
    maxTradeSize: 10000,
    stopLoss: 5,
    takeProfit: 20,
    autoClose: true,
    scaleFactor: 1.0,
  };

  private listeners: ((trade: CopyTrade) => void)[] = [];

  /**
   * Initialize copy trading service
   */
  public async init(): Promise<void> {
    this.initializeTraders();
    console.log('[CopyTrading] Service initialized');
  }

  /**
   * Initialize popular traders
   */
  private initializeTraders(): void {
    const traders: Trader[] = [
      {
        id: 'trader_1',
        name: 'Crypto Whale',
        address: '0x1234...5678',
        winRate: 78,
        totalTrades: 245,
        profitFactor: 2.5,
        avgReturn: 8.3,
        followers: 12500,
        verified: true,
        riskLevel: 'medium',
        monthlyReturn: 15.2,
        description: 'Experienced trader with focus on large cap coins',
      },
      {
        id: 'trader_2',
        name: 'DeFi Master',
        address: '0x9876...5432',
        winRate: 72,
        totalTrades: 189,
        profitFactor: 2.1,
        avgReturn: 6.7,
        followers: 8900,
        verified: true,
        riskLevel: 'medium',
        monthlyReturn: 12.1,
        description: 'Specialist in DeFi protocols and yield farming',
      },
      {
        id: 'trader_3',
        name: 'Swing Trader Pro',
        address: '0xabcd...efgh',
        winRate: 65,
        totalTrades: 312,
        profitFactor: 1.8,
        avgReturn: 5.2,
        followers: 6700,
        verified: true,
        riskLevel: 'low',
        monthlyReturn: 9.8,
        description: 'Conservative swing trader with low drawdowns',
      },
      {
        id: 'trader_4',
        name: 'Altcoin Hunter',
        address: '0xxyza...bcde',
        winRate: 58,
        totalTrades: 428,
        profitFactor: 1.5,
        avgReturn: 12.1,
        followers: 4200,
        verified: false,
        riskLevel: 'high',
        monthlyReturn: 18.5,
        description: 'High-risk high-reward altcoin trader',
      },
      {
        id: 'trader_5',
        name: 'Stablecoin Arbitrage',
        address: '0xmnop...qrst',
        winRate: 82,
        totalTrades: 156,
        profitFactor: 3.2,
        avgReturn: 3.1,
        followers: 5600,
        verified: true,
        riskLevel: 'low',
        monthlyReturn: 6.2,
        description: 'Low-risk arbitrage specialist',
      },
    ];

    traders.forEach((trader) => {
      this.traders.set(trader.id, trader);
      this.activeCopies.set(trader.id, []);
    });

    console.log('[CopyTrading] Traders initialized:', traders.length);
  }

  /**
   * Get all available traders
   */
  public getAllTraders(): Trader[] {
    return Array.from(this.traders.values());
  }

  /**
   * Get trader by ID
   */
  public getTraderById(traderId: string): Trader | undefined {
    return this.traders.get(traderId);
  }

  /**
   * Get top traders by win rate
   */
  public getTopTraders(limit: number = 5): Trader[] {
    return Array.from(this.traders.values())
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit);
  }

  /**
   * Get traders by risk level
   */
  public getTradersByRiskLevel(riskLevel: string): Trader[] {
    return Array.from(this.traders.values()).filter((t) => t.riskLevel === riskLevel);
  }

  /**
   * Start copying a trader
   */
  public async startCopyingTrader(traderId: string): Promise<boolean> {
    try {
      const trader = this.traders.get(traderId);
      if (!trader) throw new Error('Trader not found');

      const copies = this.activeCopies.get(traderId) || [];
      if (copies.length >= this.config.maxCopies) {
        throw new Error(`Maximum copies (${this.config.maxCopies}) reached for this trader`);
      }

      console.log('[CopyTrading] Started copying trader:', traderId);
      return true;
    } catch (error) {
      console.error('[CopyTrading] Error starting copy:', error);
      return false;
    }
  }

  /**
   * Stop copying a trader
   */
  public async stopCopyingTrader(traderId: string): Promise<boolean> {
    try {
      const copies = this.activeCopies.get(traderId) || [];
      
      // Close all open trades for this trader
      for (const copyTradeId of copies) {
        const trade = this.copiedTrades.get(copyTradeId);
        if (trade && trade.status === 'copied') {
          await this.closeCopyTrade(copyTradeId);
        }
      }

      this.activeCopies.set(traderId, []);
      console.log('[CopyTrading] Stopped copying trader:', traderId);
      return true;
    } catch (error) {
      console.error('[CopyTrading] Error stopping copy:', error);
      return false;
    }
  }

  /**
   * Copy a trade from a trader
   */
  public async copyTrade(
    traderId: string,
    originalTradeId: string,
    fromToken: string,
    toToken: string,
    originalAmount: number,
    entryPrice: number
  ): Promise<CopyTrade | null> {
    try {
      const trader = this.traders.get(traderId);
      if (!trader) throw new Error('Trader not found');

      // Scale the amount based on config
      const scaledAmount = originalAmount * this.config.scaleFactor;
      if (scaledAmount > this.config.maxTradeSize) {
        throw new Error(`Trade size exceeds maximum (${this.config.maxTradeSize} USD)`);
      }

      // Create copy trade
      const copyTrade: CopyTrade = {
        id: this.generateTradeId(),
        traderId,
        originalTradeId,
        fromToken,
        toToken,
        amount: scaledAmount,
        entryPrice,
        status: 'copied',
        copiedAt: Date.now(),
      };

      this.copiedTrades.set(copyTrade.id, copyTrade);

      // Add to active copies
      const copies = this.activeCopies.get(traderId) || [];
      copies.push(copyTrade.id);
      this.activeCopies.set(traderId, copies);

      this.notifyListeners(copyTrade);

      console.log('[CopyTrading] Trade copied:', copyTrade);
      return copyTrade;
    } catch (error) {
      console.error('[CopyTrading] Error copying trade:', error);
      return null;
    }
  }

  /**
   * Close a copy trade
   */
  public async closeCopyTrade(copyTradeId: string, exitPrice?: number): Promise<CopyTrade | null> {
    try {
      const trade = this.copiedTrades.get(copyTradeId);
      if (!trade) throw new Error('Trade not found');

      if (trade.status !== 'copied') {
        throw new Error('Trade is not open');
      }

      // Use current price if not provided
      const finalExitPrice = exitPrice || trade.entryPrice * 1.05; // Simulate 5% profit

      trade.exitPrice = finalExitPrice;
      trade.status = 'closed';
      trade.closedAt = Date.now();

      // Calculate P&L
      trade.profitLoss = (finalExitPrice - trade.entryPrice) * trade.amount;
      trade.profitLossPercent = ((finalExitPrice - trade.entryPrice) / trade.entryPrice) * 100;

      this.notifyListeners(trade);

      console.log('[CopyTrading] Trade closed:', copyTradeId, 'P&L:', trade.profitLoss);
      return trade;
    } catch (error) {
      console.error('[CopyTrading] Error closing trade:', error);
      return null;
    }
  }

  /**
   * Get all copied trades
   */
  public getAllCopiedTrades(): CopyTrade[] {
    return Array.from(this.copiedTrades.values());
  }

  /**
   * Get copied trades for a trader
   */
  public getCopiedTradesForTrader(traderId: string): CopyTrade[] {
    const copies = this.activeCopies.get(traderId) || [];
    return copies
      .map((id) => this.copiedTrades.get(id))
      .filter((trade) => trade !== undefined) as CopyTrade[];
  }

  /**
   * Get open trades
   */
  public getOpenTrades(): CopyTrade[] {
    return Array.from(this.copiedTrades.values()).filter((t) => t.status === 'copied');
  }

  /**
   * Get closed trades
   */
  public getClosedTrades(): CopyTrade[] {
    return Array.from(this.copiedTrades.values()).filter((t) => t.status === 'closed');
  }

  /**
   * Get configuration
   */
  public getConfig(): CopyTradingConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<CopyTradingConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[CopyTrading] Config updated:', this.config);
  }

  /**
   * Add listener for trade events
   */
  public addListener(listener: (trade: CopyTrade) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(trade: CopyTrade): void {
    this.listeners.forEach((listener) => {
      try {
        listener(trade);
      } catch (error) {
        console.error('[CopyTrading] Error in listener:', error);
      }
    });
  }

  /**
   * Generate trade ID
   */
  private generateTradeId(): string {
    return `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics for a trader
   */
  public getTraderStatistics(traderId: string): {
    totalCopies: number;
    openCopies: number;
    closedCopies: number;
    totalProfitLoss: number;
    winRate: number;
  } {
    const trades = this.getCopiedTradesForTrader(traderId);
    const closedTrades = trades.filter((t) => t.status === 'closed');

    const totalProfitLoss = closedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const winningTrades = closedTrades.filter((t) => (t.profitLoss || 0) > 0).length;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

    return {
      totalCopies: trades.length,
      openCopies: trades.filter((t) => t.status === 'copied').length,
      closedCopies: closedTrades.length,
      totalProfitLoss,
      winRate,
    };
  }

  /**
   * Get overall statistics
   */
  public getOverallStatistics(): {
    totalTraders: number;
    activeCopies: number;
    totalCopiedTrades: number;
    totalProfitLoss: number;
    averageWinRate: number;
  } {
    const allTrades = Array.from(this.copiedTrades.values());
    const closedTrades = allTrades.filter((t) => t.status === 'closed');

    const totalProfitLoss = closedTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const winningTrades = closedTrades.filter((t) => (t.profitLoss || 0) > 0).length;
    const averageWinRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

    return {
      totalTraders: this.traders.size,
      activeCopies: this.getOpenTrades().length,
      totalCopiedTrades: allTrades.length,
      totalProfitLoss,
      averageWinRate,
    };
  }

  /**
   * Clear all trades
   */
  public clearAllTrades(): void {
    this.copiedTrades.clear();
    for (const traderId of this.activeCopies.keys()) {
      this.activeCopies.set(traderId, []);
    }
    console.log('[CopyTrading] All trades cleared');
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.listeners = [];
    console.log('[CopyTrading] Service cleaned up');
  }

  /**
   * Validate copy parameters
   */
  public validateCopy(traderId: string, amount: number): { valid: boolean; error?: string } {
    const trader = this.traders.get(traderId);
    if (!trader) {
      return { valid: false, error: 'Trader not found' };
    }

    if (amount > this.config.maxTradeSize) {
      return { valid: false, error: `Amount exceeds maximum (${this.config.maxTradeSize} USD)` };
    }

    if (amount <= 0) {
      return { valid: false, error: 'Invalid amount' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const copyTradingService = new CopyTradingService();

/**
 * Hook to use copy trading service in components
 */
export function useCopyTrading() {
  return copyTradingService;
}
