/**
 * Wallet Portfolio Sync Service
 * Multi-wallet aggregation and unified dashboard
 */

export interface ConnectedWallet {
  id: string;
  userId: string;
  address: string;
  walletType: 'metamask' | 'ledger' | 'trezor' | 'coinbase' | 'walletconnect' | 'custom';
  chainId: number;
  name: string;
  balance: number;
  lastSynced: number;
  isActive: boolean;
  verificationStatus: 'verified' | 'pending' | 'failed';
}

export interface WalletAsset {
  walletId: string;
  address: string;
  asset: string;
  quantity: number;
  value: number;
  price: number;
  change24h: number;
  lastUpdated: number;
}

export interface AggregatedPortfolio {
  userId: string;
  totalValue: number;
  totalAssets: number;
  connectedWallets: number;
  assets: WalletAsset[];
  chains: Record<string, { value: number; assetCount: number }>;
  lastSynced: number;
}

export interface WalletSync {
  id: string;
  walletId: string;
  startTime: number;
  endTime?: number;
  status: 'syncing' | 'completed' | 'failed';
  assetsFound: number;
  error?: string;
}

export interface WalletVerification {
  walletId: string;
  challenge: string;
  signature?: string;
  verifiedAt?: number;
  expiresAt: number;
}

class WalletPortfolioSyncService {
  private connectedWallets: Map<string, ConnectedWallet> = new Map();
  private walletAssets: Map<string, WalletAsset[]> = new Map();
  private syncHistory: Map<string, WalletSync[]> = new Map();
  private verifications: Map<string, WalletVerification> = new Map();

  /**
   * Connect wallet
   */
  connectWallet(
    userId: string,
    address: string,
    walletType: ConnectedWallet['walletType'],
    chainId: number = 1,
    name?: string
  ): ConnectedWallet {
    const walletId = `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const wallet: ConnectedWallet = {
      id: walletId,
      userId,
      address,
      walletType,
      chainId,
      name: name || `${walletType} - ${address.slice(0, 6)}...${address.slice(-4)}`,
      balance: 0,
      lastSynced: 0,
      isActive: true,
      verificationStatus: 'pending',
    };

    this.connectedWallets.set(walletId, wallet);

    // Create verification challenge
    this.createVerificationChallenge(walletId);

    return wallet;
  }

  /**
   * Get connected wallets
   */
  getConnectedWallets(userId: string): ConnectedWallet[] {
    return Array.from(this.connectedWallets.values())
      .filter(w => w.userId === userId)
      .sort((a, b) => b.lastSynced - a.lastSynced);
  }

  /**
   * Create verification challenge
   */
  private createVerificationChallenge(walletId: string): WalletVerification {
    const challenge = `Verify wallet ownership: ${walletId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const verification: WalletVerification = {
      walletId,
      challenge,
      expiresAt,
    };

    this.verifications.set(walletId, verification);

    return verification;
  }

  /**
   * Verify wallet signature
   */
  verifyWalletSignature(walletId: string, signature: string): boolean {
    const verification = this.verifications.get(walletId);
    if (!verification) return false;

    if (verification.verifiedAt || Date.now() > verification.expiresAt) {
      return false;
    }

    // Simplified verification - in production, use ethers.js or web3.js
    const isValid = signature.length > 0 && signature.startsWith('0x');

    if (isValid) {
      verification.signature = signature;
      verification.verifiedAt = Date.now();

      const wallet = this.connectedWallets.get(walletId);
      if (wallet) {
        wallet.verificationStatus = 'verified';
      }
    }

    return isValid;
  }

  /**
   * Sync wallet portfolio
   */
  async syncWalletPortfolio(walletId: string): Promise<WalletSync> {
    const wallet = this.connectedWallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');

    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sync: WalletSync = {
      id: syncId,
      walletId,
      startTime: Date.now(),
      status: 'syncing',
      assetsFound: 0,
    };

    if (!this.syncHistory.has(walletId)) {
      this.syncHistory.set(walletId, []);
    }

    this.syncHistory.get(walletId)!.push(sync);

    // Simulate sync
    setTimeout(() => {
      try {
        const assets = this.fetchWalletAssets(walletId);
        sync.assetsFound = assets.length;
        sync.status = 'completed';
        sync.endTime = Date.now();

        wallet.lastSynced = Date.now();
        wallet.balance = assets.reduce((sum, a) => sum + a.value, 0);

        this.walletAssets.set(walletId, assets);
      } catch (error) {
        sync.status = 'failed';
        sync.error = (error as Error).message;
        sync.endTime = Date.now();
      }
    }, 2000);

    return sync;
  }

  /**
   * Fetch wallet assets
   */
  private fetchWalletAssets(walletId: string): WalletAsset[] {
    const mockAssets = [
      { asset: 'ETH', quantity: 5, price: 2500, change24h: 2.5 },
      { asset: 'USDC', quantity: 10000, price: 1, change24h: 0 },
      { asset: 'DAI', quantity: 5000, price: 1, change24h: 0.1 },
      { asset: 'AAVE', quantity: 10, price: 200, change24h: 3.2 },
      { asset: 'UNI', quantity: 50, price: 6, change24h: 1.8 },
    ];

    return mockAssets.map(asset => ({
      walletId,
      address: this.connectedWallets.get(walletId)?.address || '',
      ...asset,
      value: asset.quantity * asset.price,
      lastUpdated: Date.now(),
    }));
  }

  /**
   * Get wallet assets
   */
  getWalletAssets(walletId: string): WalletAsset[] {
    return this.walletAssets.get(walletId) || [];
  }

  /**
   * Get aggregated portfolio
   */
  getAggregatedPortfolio(userId: string): AggregatedPortfolio {
    const wallets = this.getConnectedWallets(userId);
    const allAssets: WalletAsset[] = [];
    let totalValue = 0;

    const chains: Record<string, { value: number; assetCount: number }> = {};

    for (const wallet of wallets) {
      if (!wallet.isActive) continue;

      const assets = this.getWalletAssets(wallet.id);
      allAssets.push(...assets);

      const chainKey = `chain_${wallet.chainId}`;
      if (!chains[chainKey]) {
        chains[chainKey] = { value: 0, assetCount: 0 };
      }

      for (const asset of assets) {
        chains[chainKey].value += asset.value;
        chains[chainKey].assetCount += 1;
        totalValue += asset.value;
      }
    }

    // Aggregate assets by type
    const aggregatedAssets: Record<string, WalletAsset> = {};
    for (const asset of allAssets) {
      const key = asset.asset;
      if (!aggregatedAssets[key]) {
        aggregatedAssets[key] = { ...asset, quantity: 0, value: 0 };
      }
      aggregatedAssets[key].quantity += asset.quantity;
      aggregatedAssets[key].value += asset.value;
    }

    return {
      userId,
      totalValue,
      totalAssets: Object.keys(aggregatedAssets).length,
      connectedWallets: wallets.length,
      assets: Object.values(aggregatedAssets),
      chains,
      lastSynced: Math.max(...wallets.map(w => w.lastSynced), 0),
    };
  }

  /**
   * Disconnect wallet
   */
  disconnectWallet(walletId: string): boolean {
    const wallet = this.connectedWallets.get(walletId);
    if (!wallet) return false;

    wallet.isActive = false;
    this.walletAssets.delete(walletId);

    return true;
  }

  /**
   * Get sync history
   */
  getSyncHistory(walletId: string): WalletSync[] {
    return (this.syncHistory.get(walletId) || []).sort((a, b) => b.startTime - a.startTime);
  }

  /**
   * Get wallet statistics
   */
  getWalletStatistics(userId: string): {
    totalWallets: number;
    verifiedWallets: number;
    totalValue: number;
    lastSyncTime: number;
    syncStatus: 'synced' | 'syncing' | 'failed';
  } {
    const wallets = this.getConnectedWallets(userId);
    const verifiedWallets = wallets.filter(w => w.verificationStatus === 'verified').length;
    const portfolio = this.getAggregatedPortfolio(userId);

    const recentSyncs = wallets
      .map(w => this.getSyncHistory(w.id)[0])
      .filter(s => s && s.status !== 'syncing');

    let syncStatus: 'synced' | 'syncing' | 'failed' = 'synced';
    if (wallets.some(w => this.getSyncHistory(w.id).some(s => s.status === 'syncing'))) {
      syncStatus = 'syncing';
    } else if (recentSyncs.some(s => s?.status === 'failed')) {
      syncStatus = 'failed';
    }

    return {
      totalWallets: wallets.length,
      verifiedWallets,
      totalValue: portfolio.totalValue,
      lastSyncTime: portfolio.lastSynced,
      syncStatus,
    };
  }

  /**
   * Sync all wallets
   */
  async syncAllWallets(userId: string): Promise<WalletSync[]> {
    const wallets = this.getConnectedWallets(userId);
    const syncs: WalletSync[] = [];

    for (const wallet of wallets) {
      if (wallet.isActive) {
        const sync = await this.syncWalletPortfolio(wallet.id);
        syncs.push(sync);
      }
    }

    return syncs;
  }

  /**
   * Get portfolio changes
   */
  getPortfolioChanges(userId: string, timeframe: '24h' | '7d' | '30d' = '24h'): {
    value: number;
    percent: number;
    topGainer: string;
    topLoser: string;
  } {
    const portfolio = this.getAggregatedPortfolio(userId);

    // Simplified calculation
    const change = portfolio.totalValue * (Math.random() - 0.5) * 0.1;
    const changePercent = (change / portfolio.totalValue) * 100;

    const topGainer = portfolio.assets.length > 0 ? portfolio.assets[0].asset : '';
    const topLoser = portfolio.assets.length > 1 ? portfolio.assets[1].asset : '';

    return {
      value: change,
      percent: changePercent,
      topGainer,
      topLoser,
    };
  }
}

export const walletPortfolioSyncService = new WalletPortfolioSyncService();
