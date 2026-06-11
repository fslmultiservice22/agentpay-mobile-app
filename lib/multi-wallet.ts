/**
 * Multi-Wallet Service
 * Manages multiple wallet addresses and consolidates portfolio data
 */

export interface WalletAccount {
  id: string;
  address: string;
  name: string;
  chain: 'ethereum' | 'polygon' | 'bsc' | 'solana' | 'arbitrum';
  balance: number;
  usdValue: number;
  assets: Map<string, number>;
  isActive: boolean;
  createdAt: number;
  lastUpdatedAt: number;
}

export interface ConsolidatedPortfolio {
  totalBalance: number;
  totalUsdValue: number;
  assets: Map<string, { amount: number; usdValue: number }>;
  wallets: WalletAccount[];
  lastUpdatedAt: number;
}

class MultiWalletService {
  private wallets: Map<string, WalletAccount> = new Map();
  private activeWalletId: string | null = null;
  private listeners: ((portfolio: ConsolidatedPortfolio) => void)[] = [];

  /**
   * Initialize multi-wallet service
   */
  public async init(): Promise<void> {
    console.log('[MultiWallet] Service initialized');
  }

  /**
   * Add wallet account
   */
  public addWallet(
    address: string,
    name: string,
    chain: 'ethereum' | 'polygon' | 'bsc' | 'solana' | 'arbitrum' = 'ethereum'
  ): WalletAccount {
    const wallet: WalletAccount = {
      id: `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      address,
      name,
      chain,
      balance: 0,
      usdValue: 0,
      assets: new Map(),
      isActive: this.wallets.size === 0, // First wallet is active by default
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };

    this.wallets.set(wallet.id, wallet);

    if (this.wallets.size === 1) {
      this.activeWalletId = wallet.id;
    }

    this.notifyListeners();
    console.log('[MultiWallet] Wallet added:', name, address);
    return wallet;
  }

  /**
   * Get wallet by ID
   */
  public getWallet(walletId: string): WalletAccount | undefined {
    return this.wallets.get(walletId);
  }

  /**
   * Get all wallets
   */
  public getAllWallets(): WalletAccount[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Get active wallet
   */
  public getActiveWallet(): WalletAccount | null {
    if (!this.activeWalletId) return null;
    return this.wallets.get(this.activeWalletId) || null;
  }

  /**
   * Switch active wallet
   */
  public switchWallet(walletId: string): WalletAccount | null {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return null;

    // Deactivate current wallet
    if (this.activeWalletId) {
      const current = this.wallets.get(this.activeWalletId);
      if (current) {
        current.isActive = false;
      }
    }

    // Activate new wallet
    wallet.isActive = true;
    this.activeWalletId = walletId;

    this.notifyListeners();
    console.log('[MultiWallet] Switched to wallet:', wallet.name);
    return wallet;
  }

  /**
   * Update wallet balance
   */
  public updateWalletBalance(walletId: string, balance: number, usdValue: number): WalletAccount | null {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return null;

    wallet.balance = balance;
    wallet.usdValue = usdValue;
    wallet.lastUpdatedAt = Date.now();

    this.notifyListeners();
    console.log('[MultiWallet] Wallet balance updated:', walletId, balance);
    return wallet;
  }

  /**
   * Update wallet assets
   */
  public updateWalletAssets(walletId: string, assets: Map<string, number>): WalletAccount | null {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return null;

    wallet.assets = assets;
    wallet.lastUpdatedAt = Date.now();

    this.notifyListeners();
    console.log('[MultiWallet] Wallet assets updated:', walletId);
    return wallet;
  }

  /**
   * Remove wallet
   */
  public removeWallet(walletId: string): boolean {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return false;

    // Cannot remove active wallet
    if (wallet.isActive && this.wallets.size > 1) {
      const otherWallet = Array.from(this.wallets.values()).find((w) => w.id !== walletId);
      if (otherWallet) {
        this.switchWallet(otherWallet.id);
      }
    }

    this.wallets.delete(walletId);

    if (this.activeWalletId === walletId) {
      this.activeWalletId = null;
    }

    this.notifyListeners();
    console.log('[MultiWallet] Wallet removed:', walletId);
    return true;
  }

  /**
   * Rename wallet
   */
  public renameWallet(walletId: string, newName: string): WalletAccount | null {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return null;

    wallet.name = newName;
    this.notifyListeners();

    console.log('[MultiWallet] Wallet renamed:', walletId, newName);
    return wallet;
  }

  /**
   * Get consolidated portfolio
   */
  public getConsolidatedPortfolio(): ConsolidatedPortfolio {
    let totalBalance = 0;
    let totalUsdValue = 0;
    const consolidatedAssets: Map<string, { amount: number; usdValue: number }> = new Map();

    this.wallets.forEach((wallet) => {
      totalBalance += wallet.balance;
      totalUsdValue += wallet.usdValue;

      wallet.assets.forEach((amount, symbol) => {
        const existing = consolidatedAssets.get(symbol) || { amount: 0, usdValue: 0 };
        existing.amount += amount;
        consolidatedAssets.set(symbol, existing);
      });
    });

    return {
      totalBalance,
      totalUsdValue,
      assets: consolidatedAssets,
      wallets: Array.from(this.wallets.values()),
      lastUpdatedAt: Date.now(),
    };
  }

  /**
   * Get portfolio by chain
   */
  public getPortfolioByChain(chain: string): ConsolidatedPortfolio {
    let totalBalance = 0;
    let totalUsdValue = 0;
    const consolidatedAssets: Map<string, { amount: number; usdValue: number }> = new Map();
    const walletsByChain: WalletAccount[] = [];

    this.wallets.forEach((wallet) => {
      if (wallet.chain === chain) {
        totalBalance += wallet.balance;
        totalUsdValue += wallet.usdValue;
        walletsByChain.push(wallet);

        wallet.assets.forEach((amount, symbol) => {
          const existing = consolidatedAssets.get(symbol) || { amount: 0, usdValue: 0 };
          existing.amount += amount;
          consolidatedAssets.set(symbol, existing);
        });
      }
    });

    return {
      totalBalance,
      totalUsdValue,
      assets: consolidatedAssets,
      wallets: walletsByChain,
      lastUpdatedAt: Date.now(),
    };
  }

  /**
   * Get wallet count
   */
  public getWalletCount(): number {
    return this.wallets.size;
  }

  /**
   * Get wallets by chain
   */
  public getWalletsByChain(chain: string): WalletAccount[] {
    return Array.from(this.wallets.values()).filter((w) => w.chain === chain);
  }

  /**
   * Add listener for portfolio updates
   */
  public addListener(listener: (portfolio: ConsolidatedPortfolio) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    const portfolio = this.getConsolidatedPortfolio();
    this.listeners.forEach((listener) => {
      try {
        listener(portfolio);
      } catch (error) {
        console.error('[MultiWallet] Error in listener:', error);
      }
    });
  }

  /**
   * Export wallets as JSON
   */
  public exportWallets(): string {
    const walletData = Array.from(this.wallets.values()).map((w) => ({
      address: w.address,
      name: w.name,
      chain: w.chain,
    }));

    return JSON.stringify(walletData, null, 2);
  }

  /**
   * Import wallets from JSON
   */
  public importWallets(jsonData: string): WalletAccount[] {
    try {
      const walletData = JSON.parse(jsonData);
      const imported: WalletAccount[] = [];

      walletData.forEach((data: any) => {
        const wallet = this.addWallet(data.address, data.name, data.chain);
        imported.push(wallet);
      });

      console.log('[MultiWallet] Imported', imported.length, 'wallets');
      return imported;
    } catch (error) {
      console.error('[MultiWallet] Error importing wallets:', error);
      return [];
    }
  }

  /**
   * Clear all wallets
   */
  public clearAll(): void {
    this.wallets.clear();
    this.activeWalletId = null;
    this.notifyListeners();

    console.log('[MultiWallet] All wallets cleared');
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.listeners = [];
    console.log('[MultiWallet] Service cleaned up');
  }
}

// Export singleton instance
export const multiWalletService = new MultiWalletService();

/**
 * Hook to use multi-wallet service in components
 */
export function useMultiWallet() {
  return multiWalletService;
}
