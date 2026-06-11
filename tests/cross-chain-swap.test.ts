import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateCrossChainSwap, validateSwapQuote, getErrorMessage, getAllErrorMessages } from '../lib/bridge/swap-validation';
import type { CrossChainToken } from '../hooks/use-cross-chain-swap';

describe('Cross-Chain Swap Validation', () => {
  const mockToken: CrossChainToken = {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x...',
    decimals: 6,
    chainId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateCrossChainSwap', () => {
    it('should validate correct swap parameters', () => {
      const result = validateCrossChainSwap('ethereum', 'polygon', mockToken, mockToken, '10', '100');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject same source and destination chain', () => {
      const result = validateCrossChainSwap('ethereum', 'ethereum', mockToken, mockToken, '10', '100');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'SAME_CHAIN',
        })
      );
    });

    it('should reject missing source chain', () => {
      const result = validateCrossChainSwap('' as any, 'polygon', mockToken, mockToken, '10', '100');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_SOURCE_CHAIN',
        })
      );
    });

    it('should reject missing input token', () => {
      const result = validateCrossChainSwap('ethereum', 'polygon', null, mockToken, '10', '100');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_INPUT_TOKEN',
        })
      );
    });

    it('should reject zero amount', () => {
      const result = validateCrossChainSwap('ethereum', 'polygon', mockToken, mockToken, '0', '100');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_AMOUNT',
        })
      );
    });

    it('should reject amount below minimum (0.01)', () => {
      const result = validateCrossChainSwap('ethereum', 'polygon', mockToken, mockToken, '0.001', '100');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'AMOUNT_TOO_SMALL',
        })
      );
    });

    it('should reject amount above maximum (1,000,000)', () => {
      const result = validateCrossChainSwap('ethereum', 'polygon', mockToken, mockToken, '2000000', '3000000');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'AMOUNT_TOO_LARGE',
        })
      );
    });

    it('should reject insufficient balance', () => {
      const result = validateCrossChainSwap('ethereum', 'polygon', mockToken, mockToken, '100', '50');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INSUFFICIENT_BALANCE',
        })
      );
    });

    it('should reject invalid amount format', () => {
      const result = validateCrossChainSwap('ethereum', 'polygon', mockToken, mockToken, 'abc', '100');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_AMOUNT_FORMAT',
        })
      );
    });
  });

  describe('validateSwapQuote', () => {
    const mockQuote = {
      sourceChain: 'ethereum',
      destinationChain: 'polygon',
      inputToken: mockToken,
      outputToken: mockToken,
      inputAmount: '10',
      outputAmount: '9.9',
      fee: '0.1',
      estimatedTime: '5-10 minutes',
      priceImpact: '0.1%',
    };

    it('should validate correct quote', () => {
      const result = validateSwapQuote(mockQuote);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null quote', () => {
      const result = validateSwapQuote(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_QUOTE',
        })
      );
    });

    it('should reject quote with zero output amount', () => {
      const invalidQuote = { ...mockQuote, outputAmount: '0' };
      const result = validateSwapQuote(invalidQuote);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'INVALID_OUTPUT_AMOUNT',
        })
      );
    });

    it('should reject quote with high price impact', () => {
      const invalidQuote = { ...mockQuote, priceImpact: '75%' };
      const result = validateSwapQuote(invalidQuote);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'HIGH_PRICE_IMPACT',
        })
      );
    });

    it('should reject quote with missing input token', () => {
      const invalidQuote = { ...mockQuote, inputToken: null };
      const result = validateSwapQuote(invalidQuote);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'MISSING_INPUT_TOKEN',
        })
      );
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly error message', () => {
      const error = { field: 'sourceChain', message: 'Source chain is required', code: 'MISSING_SOURCE_CHAIN' };
      const message = getErrorMessage(error);
      expect(message).toBe('Please select a source blockchain');
    });

    it('should return custom message for insufficient balance', () => {
      const error = { field: 'inputAmount', message: 'Insufficient balance. Available: 50', code: 'INSUFFICIENT_BALANCE' };
      const message = getErrorMessage(error);
      expect(message).toContain('Insufficient balance');
    });

    it('should return fallback message for unknown error code', () => {
      const error = { field: 'unknown', message: 'Unknown error', code: 'UNKNOWN_ERROR' };
      const message = getErrorMessage(error);
      expect(message).toBe('Unknown error');
    });
  });

  describe('getAllErrorMessages', () => {
    it('should return all error messages', () => {
      const errors = [
        { field: 'sourceChain', message: 'Source chain is required', code: 'MISSING_SOURCE_CHAIN' },
        { field: 'inputAmount', message: 'Invalid amount', code: 'INVALID_AMOUNT' },
      ];
      const messages = getAllErrorMessages(errors);
      expect(messages).toHaveLength(2);
      expect(messages[0]).toBe('Please select a source blockchain');
      expect(messages[1]).toBe('Please enter a valid amount');
    });

    it('should return empty array for no errors', () => {
      const messages = getAllErrorMessages([]);
      expect(messages).toHaveLength(0);
    });
  });
});
