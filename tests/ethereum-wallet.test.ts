import { describe, it, expect } from 'vitest';
// @ts-ignore
import {
  isValidEthereumAddress,
  normalizeEthereumAddress,
  maskEthereumAddress,
  weiToEth,
  ethToWei,
  formatCurrency,
  getExplorerUrl,
  BLOCKCHAIN_NETWORKS,
} from '../lib/ethereum-validator';

describe('Ethereum Address Validator', () => {
  describe('isValidEthereumAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(isValidEthereumAddress('0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4')).toBe(true);
      expect(isValidEthereumAddress('0xEAE7380DD4CEF6FBD1144F49E4D1E6964258A4F4')).toBe(true);
      expect(isValidEthereumAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidEthereumAddress('0x')).toBe(false);
      expect(isValidEthereumAddress('0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f')).toBe(false); // Too short
      expect(isValidEthereumAddress('eae7380dd4cef6fbd1144f49e4d1e6964258a4f4')).toBe(false); // Missing 0x
      expect(isValidEthereumAddress('0xGGG7380dd4cef6fbd1144f49e4d1e6964258a4f4')).toBe(false); // Invalid hex
      expect(isValidEthereumAddress('')).toBe(false);
    });
  });

  describe('normalizeEthereumAddress', () => {
    it('should normalize addresses to lowercase', () => {
      expect(normalizeEthereumAddress('0xEAE7380DD4CEF6FBD1144F49E4D1E6964258A4F4')).toBe(
        '0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4'
      );
    });

    it('should return empty string for invalid addresses', () => {
      expect(normalizeEthereumAddress('invalid')).toBe('');
    });
  });

  describe('maskEthereumAddress', () => {
    it('should mask addresses correctly', () => {
      expect(maskEthereumAddress('0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4')).toBe('0xeae7...a4f4');
    });

    it('should return empty string for invalid addresses', () => {
      expect(maskEthereumAddress('invalid')).toBe('');
    });
  });

  describe('Wei to ETH conversion', () => {
    it('should convert wei to ETH correctly', () => {
      expect(weiToEth('1000000000000000000')).toBe(1);
      expect(weiToEth('2500000000000000000')).toBe(2.5);
      expect(weiToEth('0')).toBe(0);
    });

    it('should handle large numbers', () => {
      expect(weiToEth('1000000000000000000000')).toBe(1000);
    });
  });

  describe('ETH to Wei conversion', () => {
    it('should convert ETH to wei correctly', () => {
      expect(ethToWei(1)).toBe('1000000000000000000');
      expect(ethToWei(2.5)).toBe('2500000000000000000');
      expect(ethToWei(0)).toBe('0');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1000)).toBe('1,000.00');
      expect(formatCurrency(1000.5)).toBe('1,000.50');
      expect(formatCurrency(1000000)).toBe('1,000,000.00');
    });

    it('should respect decimal places', () => {
      expect(formatCurrency(1000.123, 3)).toBe('1,000.123');
      expect(formatCurrency(1000.123, 1)).toBe('1,000.1');
    });
  });

  describe('getExplorerUrl', () => {
    it('should generate correct explorer URLs', () => {
      const address = '0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4';
      expect(getExplorerUrl(address, 'ethereum')).toContain('etherscan.io');
      expect(getExplorerUrl(address, 'polygon')).toContain('polygonscan.com');
      expect(getExplorerUrl(address, 'arbitrum')).toContain('arbiscan.io');
      expect(getExplorerUrl(address, 'optimism')).toContain('optimistic.etherscan.io');
    });

    it('should return empty string for invalid addresses', () => {
      expect(getExplorerUrl('invalid')).toBe('');
    });
  });

  describe('BLOCKCHAIN_NETWORKS', () => {
    it('should have all required networks', () => {
      expect(BLOCKCHAIN_NETWORKS.ethereum).toBeDefined();
      expect(BLOCKCHAIN_NETWORKS.polygon).toBeDefined();
      expect(BLOCKCHAIN_NETWORKS.arbitrum).toBeDefined();
      expect(BLOCKCHAIN_NETWORKS.optimism).toBeDefined();
    });

    it('should have correct network IDs', () => {
      expect(BLOCKCHAIN_NETWORKS.ethereum.id).toBe(1);
      expect(BLOCKCHAIN_NETWORKS.polygon.id).toBe(137);
      expect(BLOCKCHAIN_NETWORKS.arbitrum.id).toBe(42161);
      expect(BLOCKCHAIN_NETWORKS.optimism.id).toBe(10);
    });
  });
});
