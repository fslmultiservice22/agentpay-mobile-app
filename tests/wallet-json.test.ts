import { describe, it, expect } from 'vitest';
import {
  parseWalletJSON,
  validateWalletJSON,
  extractBlockchains,
  extractTokens,
  extractContacts,
  extractSettings,
  createWalletJSON,
  exportWalletJSON,
} from '../lib/wallet-json-parser';

describe('Wallet JSON Parser', () => {
  describe('parseWalletJSON', () => {
    it('should parse valid wallet JSON', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        blockchains: [
          {
            id: 'ethereum',
            name: 'Ethereum',
            chainId: 1,
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          },
        ],
        tokens: [
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            chainId: 1,
          },
        ],
        settings: { theme: 'auto', language: 'en' },
      });

      const result = parseWalletJSON(json);
      expect(result.isValid).toBe(true);
      expect(result.data?.version).toBe('1.0.0');
      expect(result.data?.blockchains).toHaveLength(1);
      expect(result.data?.tokens).toHaveLength(1);
    });

    it('should reject invalid JSON', () => {
      const result = parseWalletJSON('{ invalid json }');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate blockchain structure', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        blockchains: [
          {
            id: 'ethereum',
            // missing name and chainId
          },
        ],
      });

      const result = parseWalletJSON(json);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('required fields'))).toBe(true);
    });

    it('should validate token Ethereum address format', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        tokens: [
          {
            address: 'invalid-address',
            symbol: 'TEST',
            name: 'Test Token',
            decimals: 18,
            chainId: 1,
          },
        ],
      });

      const result = parseWalletJSON(json);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('invalid Ethereum address'))).toBe(true);
    });

    it('should validate contact Ethereum address format', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        contacts: [
          {
            id: '1',
            name: 'Test',
            address: 'not-an-address',
          },
        ],
      });

      const result = parseWalletJSON(json);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('invalid Ethereum address'))).toBe(true);
    });

    it('should validate settings theme value', () => {
      const json = JSON.stringify({
        version: '1.0.0',
        settings: {
          theme: 'invalid-theme',
        },
      });

      const result = parseWalletJSON(json);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('theme must be one of'))).toBe(true);
    });
  });

  describe('validateWalletJSON', () => {
    it('should validate wallet JSON structure', () => {
      const data = {
        blockchains: [],
      };

      const result = validateWalletJSON(data);
      expect(result.isValid).toBe(true);
    });

    it('should reject empty wallet JSON', () => {
      const result = validateWalletJSON({});
      expect(result.isValid).toBe(false);
    });

    it('should reject non-object input', () => {
      const result = validateWalletJSON('not an object');
      expect(result.isValid).toBe(false);
    });
  });

  describe('extractBlockchains', () => {
    it('should extract blockchains from wallet JSON', () => {
      const walletJSON = {
        version: '1.0.0',
        blockchains: [
          { id: 'ethereum', name: 'Ethereum', chainId: 1 },
          { id: 'polygon', name: 'Polygon', chainId: 137 },
        ],
      };

      const blockchains = extractBlockchains(walletJSON as any);
      expect(blockchains).toHaveLength(2);
      expect(blockchains[0].id).toBe('ethereum');
    });

    it('should return empty array if no blockchains', () => {
      const walletJSON = { version: '1.0.0' };
      const blockchains = extractBlockchains(walletJSON as any);
      expect(blockchains).toHaveLength(0);
    });
  });

  describe('extractTokens', () => {
    it('should extract tokens from wallet JSON', () => {
      const walletJSON = {
        version: '1.0.0',
        tokens: [
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            chainId: 1,
          },
        ],
      };

      const tokens = extractTokens(walletJSON as any);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].symbol).toBe('USDC');
    });

    it('should include custom tokens', () => {
      const walletJSON = {
        version: '1.0.0',
        tokens: [
          {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            chainId: 1,
          },
        ],
        customTokens: [
          {
            address: '0x1234567890123456789012345678901234567890',
            symbol: 'CUSTOM',
            name: 'Custom Token',
            decimals: 18,
            chainId: 1,
          },
        ],
      };

      const tokens = extractTokens(walletJSON as any);
      expect(tokens).toHaveLength(2);
      expect(tokens[1].symbol).toBe('CUSTOM');
    });
  });

  describe('extractContacts', () => {
    it('should extract contacts from wallet JSON', () => {
      const walletJSON = {
        version: '1.0.0',
        contacts: [
          {
            id: '1',
            name: 'Uniswap',
            address: '0x1111111254fb6c44bac0bed2854e76f90643097d',
            type: 'contract',
          },
        ],
      };

      const contacts = extractContacts(walletJSON as any);
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe('Uniswap');
    });
  });

  describe('extractSettings', () => {
    it('should extract settings from wallet JSON', () => {
      const walletJSON = {
        version: '1.0.0',
        settings: {
          theme: 'dark',
          language: 'it',
          currency: 'EUR',
        },
      };

      const settings = extractSettings(walletJSON as any);
      expect(settings.theme).toBe('dark');
      expect(settings.language).toBe('it');
    });

    it('should return empty object if no settings', () => {
      const walletJSON = { version: '1.0.0' };
      const settings = extractSettings(walletJSON as any);
      expect(settings).toEqual({});
    });
  });

  describe('createWalletJSON', () => {
    it('should create wallet JSON export', () => {
      const blockchains = [{ id: 'ethereum', name: 'Ethereum', chainId: 1 }];
      const tokens = [
        {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: 1,
        },
      ];
      const contacts = [
        {
          id: '1',
          name: 'Uniswap',
          address: '0x1111111254fb6c44bac0bed2854e76f90643097d',
        },
      ];
      const settings = { theme: 'auto' as const, language: 'en' };

      const walletJSON = createWalletJSON(blockchains, tokens, contacts, settings, '0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4');

      expect(walletJSON.version).toBe('1.0.0');
      expect(walletJSON.blockchains).toHaveLength(1);
      expect(walletJSON.tokens).toHaveLength(1);
      expect(walletJSON.contacts).toHaveLength(1);
      expect(walletJSON.walletAddress).toBe('0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4');
    });
  });

  describe('exportWalletJSON', () => {
    it('should export wallet JSON as formatted string', () => {
      const walletJSON = {
        version: '1.0.0',
        blockchains: [{ id: 'ethereum', name: 'Ethereum', chainId: 1 }],
        tokens: [],
        contacts: [],
        settings: {},
      };

      const json = exportWalletJSON(walletJSON as any);
      expect(json).toContain('"version": "1.0.0"');
      expect(json).toContain('"blockchains"');
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });
});
