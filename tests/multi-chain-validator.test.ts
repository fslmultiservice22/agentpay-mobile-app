import { describe, it, expect } from 'vitest';
import {
  isValidEthereumAddress,
  isValidNearAddress,
  isValidOrderlyAddress,
  detectBlockchain,
  validateAddress,
  validateAddressAuto,
  createMultiChainWallet,
  maskAddress,
  getBlockchainInfo,
  normalizeAddress,
} from '../lib/multi-chain-validator';

describe('Multi-Chain Validator', () => {
  describe('Ethereum Validation', () => {
    it('should validate valid Ethereum addresses', () => {
      expect(isValidEthereumAddress('0x14ea40648fc8c1781d19363f5b9cc9a877ac2469')).toBe(true);
      expect(isValidEthereumAddress('0xd3978d5243fa21c9fccc6a17ff87309adead6666')).toBe(true);
    });

    it('should reject invalid Ethereum addresses', () => {
      expect(isValidEthereumAddress('0x123')).toBe(false);
      expect(isValidEthereumAddress('14ea40648fc8c1781d19363f5b9cc9a877ac2469')).toBe(false);
      expect(isValidEthereumAddress('')).toBe(false);
    });
  });

  describe('NEAR Validation', () => {
    it('should validate valid NEAR addresses', () => {
      expect(isValidNearAddress('phoenix-bonds.near')).toBe(true);
      expect(isValidNearAddress('asset-manager')).toBe(true);
      expect(isValidNearAddress('orderly-network.near')).toBe(true);
    });

    it('should reject invalid NEAR addresses', () => {
      expect(isValidNearAddress('a')).toBe(false);
      expect(isValidNearAddress('')).toBe(false);
    });
  });

  describe('Orderly Network Validation', () => {
    it('should validate Ethereum addresses as Orderly', () => {
      expect(isValidOrderlyAddress('0x14ea40648fc8c1781d19363f5b9cc9a877ac2469')).toBe(true);
    });

    it('should validate NEAR addresses as Orderly', () => {
      expect(isValidOrderlyAddress('orderly-network.near')).toBe(true);
    });
  });

  describe('Blockchain Detection', () => {
    it('should detect Ethereum addresses', () => {
      expect(detectBlockchain('0x14ea40648fc8c1781d19363f5b9cc9a877ac2469')).toBe('ethereum');
    });

    it('should detect NEAR addresses', () => {
      expect(detectBlockchain('phoenix-bonds.near')).toBe('near');
    });

    it('should return null for truly invalid addresses', () => {
      expect(detectBlockchain('!!!invalid!!!')).toBe(null);
    });
  });

  describe('Address Validation', () => {
    it('should validate Ethereum addresses on ethereum blockchain', () => {
      const result = validateAddress('0x14ea40648fc8c1781d19363f5b9cc9a877ac2469', 'ethereum');
      expect(result.isValid).toBe(true);
      expect(result.blockchain).toBe('ethereum');
      expect(result.type).toBe('contract');
    });

    it('should validate NEAR addresses on near blockchain', () => {
      const result = validateAddress('phoenix-bonds.near', 'near');
      expect(result.isValid).toBe(true);
      expect(result.blockchain).toBe('near');
      expect(result.type).toBe('account');
    });

    it('should reject invalid addresses', () => {
      const result = validateAddress('!!!invalid!!!', 'ethereum');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Auto Validation', () => {
    it('should auto-detect and validate Ethereum addresses', () => {
      const result = validateAddressAuto('0x14ea40648fc8c1781d19363f5b9cc9a877ac2469');
      expect(result).not.toBeNull();
      expect(result?.isValid).toBe(true);
      expect(result?.blockchain).toBe('ethereum');
    });

    it('should auto-detect and validate NEAR addresses', () => {
      const result = validateAddressAuto('orderly-network.near');
      expect(result).not.toBeNull();
      expect(result?.isValid).toBe(true);
      expect(result?.blockchain).toBe('near');
    });

    it('should return null for truly invalid addresses', () => {
      const result = validateAddressAuto('!!!invalid-format!!!');
      expect(result).toBeNull();
    });
  });

  describe('Multi-Chain Wallet Creation', () => {
    it('should create multi-chain wallet with multiple addresses', () => {
      const wallet = createMultiChainWallet({
        ethereum: '0x14ea40648fc8c1781d19363f5b9cc9a877ac2469',
        near: 'phoenix-bonds.near',
      });

      expect(wallet.isMultiChain).toBe(true);
      expect(wallet.addresses.size).toBe(2);
      expect(wallet.primaryBlockchain).toBe('ethereum');
    });

    it('should create single-chain wallet', () => {
      const wallet = createMultiChainWallet({
        ethereum: '0x14ea40648fc8c1781d19363f5b9cc9a877ac2469',
      });

      expect(wallet.isMultiChain).toBe(false);
      expect(wallet.addresses.size).toBe(1);
      expect(wallet.primaryBlockchain).toBe('ethereum');
    });

    it('should ignore invalid addresses', () => {
      const wallet = createMultiChainWallet({
        ethereum: '0x14ea40648fc8c1781d19363f5b9cc9a877ac2469',
        near: '!!!invalid!!!',
      });

      expect(wallet.addresses.size).toBe(1);
      expect(wallet.addresses.has('ethereum')).toBe(true);
      expect(wallet.addresses.has('near')).toBe(false);
    });
  });

  describe('Address Masking', () => {
    it('should mask Ethereum addresses', () => {
      const masked = maskAddress('0x14ea40648fc8c1781d19363f5b9cc9a877ac2469', 'ethereum');
      expect(masked).toBe('0x14ea...2469');
    });

    it('should mask NEAR addresses', () => {
      const masked = maskAddress('phoenix-bonds.near', 'near');
      expect(masked).toBe('phoeni...near');
    });

    it('should not mask short addresses', () => {
      const masked = maskAddress('short', 'ethereum');
      expect(masked).toBe('short');
    });
  });

  describe('Blockchain Info', () => {
    it('should return Ethereum info', () => {
      const info = getBlockchainInfo('ethereum');
      expect(info.name).toBe('Ethereum');
      expect(info.symbol).toBe('ETH');
      expect(info.chainId).toBe(1);
    });

    it('should return NEAR info', () => {
      const info = getBlockchainInfo('near');
      expect(info.name).toBe('NEAR Protocol');
      expect(info.symbol).toBe('NEAR');
    });

    it('should return Orderly info', () => {
      const info = getBlockchainInfo('orderly');
      expect(info.name).toBe('Orderly Network');
      expect(info.symbol).toBe('ORD');
    });
  });

  describe('Address Normalization', () => {
    it('should normalize Ethereum addresses to lowercase', () => {
      const normalized = normalizeAddress('0x14EA40648FC8C1781D19363F5B9CC9A877AC2469', 'ethereum');
      expect(normalized).toBe('0x14ea40648fc8c1781d19363f5b9cc9a877ac2469');
    });

    it('should normalize NEAR addresses to lowercase', () => {
      const normalized = normalizeAddress('Phoenix-Bonds.NEAR', 'near');
      expect(normalized).toBe('phoenix-bonds.near');
    });
  });

  describe('Real-world Test Cases', () => {
    it('should handle the provided test addresses', () => {
      const testCases = [
        { addr: 'phoenix-bonds.near', expected: 'near' },
        { addr: 'asset-manager', expected: 'near' },
        { addr: 'orderly-network.near', expected: 'near' },
        { addr: '0xd3978d5243fa21c9fccc6a17ff87309adead6666', expected: 'ethereum' },
      ];

      testCases.forEach(({ addr, expected }) => {
        const result = validateAddressAuto(addr);
        expect(result).not.toBeNull();
        expect(result?.isValid).toBe(true);
        expect(result?.blockchain).toBe(expected);
      });
    });

    it('should create multi-chain wallet from test addresses', () => {
      const wallet = createMultiChainWallet({
        near: 'phoenix-bonds.near',
        ethereum: '0xd3978d5243fa21c9fccc6a17ff87309adead6666',
      });

      expect(wallet.isMultiChain).toBe(true);
      expect(wallet.addresses.size).toBe(2);
    });
  });
});
