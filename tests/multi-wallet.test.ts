import { describe, it, expect, beforeEach } from 'vitest';
import { multiWalletService } from '../lib/multi-wallet';

describe('Multi-Wallet Service', () => {
  beforeEach(() => {
    multiWalletService.clearAll();
  });

  it('should add wallet', () => {
    const wallet = multiWalletService.addWallet('0x123...', 'Main Wallet', 'ethereum');
    expect(wallet).toBeDefined();
    expect(wallet.address).toBe('0x123...');
    expect(wallet.name).toBe('Main Wallet');
    expect(wallet.chain).toBe('ethereum');
    expect(wallet.isActive).toBe(true);
  });

  it('should get all wallets', () => {
    multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    const wallets = multiWalletService.getAllWallets();
    expect(wallets).toHaveLength(2);
  });

  it('should get active wallet', () => {
    const wallet1 = multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    const active = multiWalletService.getActiveWallet();
    expect(active?.id).toBe(wallet1.id);
  });

  it('should switch wallet', () => {
    const wallet1 = multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    const wallet2 = multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    
    multiWalletService.switchWallet(wallet2.id);
    const active = multiWalletService.getActiveWallet();
    expect(active?.id).toBe(wallet2.id);
    expect(wallet1.isActive).toBe(false);
    expect(wallet2.isActive).toBe(true);
  });

  it('should update wallet balance', () => {
    const wallet = multiWalletService.addWallet('0x123...', 'Main Wallet', 'ethereum');
    multiWalletService.updateWalletBalance(wallet.id, 100, 250000);
    
    const updated = multiWalletService.getWallet(wallet.id);
    expect(updated?.balance).toBe(100);
    expect(updated?.usdValue).toBe(250000);
  });

  it('should update wallet assets', () => {
    const wallet = multiWalletService.addWallet('0x123...', 'Main Wallet', 'ethereum');
    const assets = new Map([
      ['BTC', 2],
      ['ETH', 10],
    ]);
    
    multiWalletService.updateWalletAssets(wallet.id, assets);
    const updated = multiWalletService.getWallet(wallet.id);
    expect(updated?.assets.get('BTC')).toBe(2);
    expect(updated?.assets.get('ETH')).toBe(10);
  });

  it('should rename wallet', () => {
    const wallet = multiWalletService.addWallet('0x123...', 'Old Name', 'ethereum');
    multiWalletService.renameWallet(wallet.id, 'New Name');
    
    const updated = multiWalletService.getWallet(wallet.id);
    expect(updated?.name).toBe('New Name');
  });

  it('should remove wallet', () => {
    const wallet1 = multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    
    multiWalletService.removeWallet(wallet1.id);
    expect(multiWalletService.getWalletCount()).toBe(1);
  });

  it('should get consolidated portfolio', () => {
    const wallet1 = multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    const wallet2 = multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    
    multiWalletService.updateWalletBalance(wallet1.id, 50, 125000);
    multiWalletService.updateWalletBalance(wallet2.id, 50, 125000);
    
    const portfolio = multiWalletService.getConsolidatedPortfolio();
    expect(portfolio.totalBalance).toBe(100);
    expect(portfolio.totalUsdValue).toBe(250000);
    expect(portfolio.wallets).toHaveLength(2);
  });

  it('should get portfolio by chain', () => {
    multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    const wallet2 = multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    
    multiWalletService.updateWalletBalance(wallet2.id, 50, 125000);
    
    const portfolio = multiWalletService.getPortfolioByChain('polygon');
    expect(portfolio.wallets).toHaveLength(1);
    expect(portfolio.wallets[0].chain).toBe('polygon');
  });

  it('should get wallets by chain', () => {
    multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    multiWalletService.addWallet('0x222...', 'Wallet 2', 'ethereum');
    multiWalletService.addWallet('0x333...', 'Wallet 3', 'polygon');
    
    const ethWallets = multiWalletService.getWalletsByChain('ethereum');
    expect(ethWallets).toHaveLength(2);
  });

  it('should export wallets as JSON', () => {
    multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    
    const json = multiWalletService.exportWallets();
    const data = JSON.parse(json);
    expect(data).toHaveLength(2);
    expect(data[0].address).toBe('0x111...');
  });

  it('should import wallets from JSON', () => {
    const json = JSON.stringify([
      { address: '0x111...', name: 'Wallet 1', chain: 'ethereum' },
      { address: '0x222...', name: 'Wallet 2', chain: 'polygon' },
    ]);
    
    const imported = multiWalletService.importWallets(json);
    expect(imported).toHaveLength(2);
    expect(multiWalletService.getWalletCount()).toBe(2);
  });

  it('should consolidate assets from multiple wallets', () => {
    const wallet1 = multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    const wallet2 = multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    
    const assets1 = new Map([['BTC', 2]]);
    const assets2 = new Map([['BTC', 3]]);
    
    multiWalletService.updateWalletAssets(wallet1.id, assets1);
    multiWalletService.updateWalletAssets(wallet2.id, assets2);
    
    const portfolio = multiWalletService.getConsolidatedPortfolio();
    expect(portfolio.assets.get('BTC')?.amount).toBe(5);
  });

  it('should get wallet count', () => {
    expect(multiWalletService.getWalletCount()).toBe(0);
    multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    expect(multiWalletService.getWalletCount()).toBe(1);
    multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    expect(multiWalletService.getWalletCount()).toBe(2);
  });

  it('should notify listeners on portfolio update', () => {
    let callCount = 0;
    const unsubscribe = multiWalletService.addListener(() => {
      callCount++;
    });
    
    multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    expect(callCount).toBeGreaterThan(0);
    
    unsubscribe();
  });

  it('should clear all wallets', () => {
    multiWalletService.addWallet('0x111...', 'Wallet 1', 'ethereum');
    multiWalletService.addWallet('0x222...', 'Wallet 2', 'polygon');
    
    multiWalletService.clearAll();
    expect(multiWalletService.getWalletCount()).toBe(0);
    expect(multiWalletService.getActiveWallet()).toBeNull();
  });
});
