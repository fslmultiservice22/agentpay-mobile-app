import { describe, it, expect } from 'vitest';
import { BLOCKCHAINS, AVAILABLE_BLOCKCHAINS, type BlockchainId } from '../lib/blockchain/blockchain-config';

describe('Blockchain Configuration', () => {
  it('should have 5 blockchains', () => {
    expect(AVAILABLE_BLOCKCHAINS.length).toBe(5);
  });

  it('should have ethereum, polygon, bsc, arbitrum, optimism', () => {
    expect(AVAILABLE_BLOCKCHAINS).toContain('ethereum');
    expect(AVAILABLE_BLOCKCHAINS).toContain('polygon');
    expect(AVAILABLE_BLOCKCHAINS).toContain('bsc');
    expect(AVAILABLE_BLOCKCHAINS).toContain('arbitrum');
    expect(AVAILABLE_BLOCKCHAINS).toContain('optimism');
  });

  it('should have correct chain IDs', () => {
    expect(BLOCKCHAINS.ethereum.chainId).toBe(1);
    expect(BLOCKCHAINS.polygon.chainId).toBe(137);
    expect(BLOCKCHAINS.bsc.chainId).toBe(56);
    expect(BLOCKCHAINS.arbitrum.chainId).toBe(42161);
    expect(BLOCKCHAINS.optimism.chainId).toBe(10);
  });

  it('should have RPC URLs', () => {
    AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
      expect(BLOCKCHAINS[blockchain].rpcUrl).toBeTruthy();
      expect(typeof BLOCKCHAINS[blockchain].rpcUrl).toBe('string');
    });
  });

  it('should have block explorers', () => {
    AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
      expect(BLOCKCHAINS[blockchain].blockExplorer).toBeTruthy();
      expect(typeof BLOCKCHAINS[blockchain].blockExplorer).toBe('string');
    });
  });

  it('should have native currency info', () => {
    AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
      const currency = BLOCKCHAINS[blockchain].nativeCurrency;
      expect(currency.name).toBeTruthy();
      expect(currency.symbol).toBeTruthy();
      expect(currency.decimals).toBeGreaterThan(0);
    });
  });

  it('should have colors', () => {
    AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
      expect(BLOCKCHAINS[blockchain].color).toBeTruthy();
      expect(typeof BLOCKCHAINS[blockchain].color).toBe('string');
    });
  });

  it('should have icons', () => {
    AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
      expect(BLOCKCHAINS[blockchain].icon).toBeTruthy();
      expect(typeof BLOCKCHAINS[blockchain].icon).toBe('string');
    });
  });

  it('should have correct names', () => {
    expect(BLOCKCHAINS.ethereum.name).toBe('Ethereum');
    expect(BLOCKCHAINS.polygon.name).toBe('Polygon');
    expect(BLOCKCHAINS.bsc.name).toBe('Binance Smart Chain');
    expect(BLOCKCHAINS.arbitrum.name).toBe('Arbitrum');
    expect(BLOCKCHAINS.optimism.name).toBe('Optimism');
  });

  it('should have all blockchains in config', () => {
    AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
      expect(BLOCKCHAINS[blockchain]).toBeDefined();
      expect(BLOCKCHAINS[blockchain].id).toBe(blockchain);
    });
  });

  it('should have unique symbols', () => {
    const symbols = AVAILABLE_BLOCKCHAINS.map((b) => BLOCKCHAINS[b].symbol);
    const uniqueSymbols = new Set(symbols);
    expect(uniqueSymbols.size).toBe(AVAILABLE_BLOCKCHAINS.length);
  });

  it('should have unique chain IDs', () => {
    const chainIds = AVAILABLE_BLOCKCHAINS.map((b) => BLOCKCHAINS[b].chainId);
    const uniqueChainIds = new Set(chainIds);
    expect(uniqueChainIds.size).toBe(AVAILABLE_BLOCKCHAINS.length);
  });
});
