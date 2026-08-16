import { describe, expect, it } from 'vitest';
import {
  MAX_SLIPPAGE_PERCENT,
  MIN_SLIPPAGE_PERCENT,
  NETWORK_FEE_PROFILES,
  PROTOCOL_FEE_PERCENT,
  SWAP_TOKENS,
  calculateNetworkFee,
  calculatePriceImpact,
  formatTokenAmount,
  getExchangeRate,
  getPriceImpactSeverity,
  getSwapQuote,
  validateSwap,
} from '../lib/swap-quote-service';

describe('Swap quote service', () => {
  describe('exchange rates and price impact', () => {
    it('derives the exchange rate from the two token prices', () => {
      expect(getExchangeRate('ETH', 'USDC')).toBe(2500);
      expect(getExchangeRate('USDC', 'ETH')).toBe(0.0004);
      expect(getExchangeRate('ETH', 'ETH')).toBe(1);
    });

    it('returns zero impact for a same-token pair or invalid amount', () => {
      expect(calculatePriceImpact('ETH', 'ETH', 10)).toBe(0);
      expect(calculatePriceImpact('ETH', 'USDC', 0)).toBe(0);
      expect(calculatePriceImpact('ETH', 'USDC', -1)).toBe(0);
      expect(calculatePriceImpact('ETH', 'USDC', Number.NaN)).toBe(0);
    });

    it('increases price impact as the notional trade size increases', () => {
      const small = calculatePriceImpact('ETH', 'USDC', 1);
      const large = calculatePriceImpact('ETH', 'USDC', 100_000);
      expect(small).toBeGreaterThan(0);
      expect(large).toBeGreaterThan(small);
      expect(large).toBeLessThanOrEqual(100);
    });

    it('uses deeper effective liquidity for stablecoin pairs', () => {
      const stableImpact = calculatePriceImpact('USDC', 'USDT', 100_000_000);
      const nonStableImpact = calculatePriceImpact('ETH', 'USDC', 40_000);
      expect(stableImpact).toBeLessThan(nonStableImpact);
    });
  });

  describe('network fees', () => {
    it('calculates native and USD fee from gas units and gwei', () => {
      const fee = calculateNetworkFee('ethereum');
      const profile = NETWORK_FEE_PROFILES.ethereum;
      const expectedNative = (profile.gasUnits * profile.gasPriceGwei) / 1e9;
      expect(fee.native).toBe(Number(expectedNative.toFixed(8)));
      expect(fee.usd).toBe(Number((expectedNative * profile.gasTokenPriceUsd).toFixed(4)));
      expect(fee.profile).toEqual(profile);
    });

    it('makes layer-2 quotes materially cheaper than Ethereum in the fixture', () => {
      expect(calculateNetworkFee('arbitrum').usd).toBeLessThan(calculateNetworkFee('ethereum').usd);
      expect(calculateNetworkFee('base').usd).toBeLessThan(calculateNetworkFee('arbitrum').usd);
    });
  });

  describe('complete quotes', () => {
    it('returns a quote with protocol fee, impact, minimum received and total fees', () => {
      const quote = getSwapQuote({
        fromToken: 'ETH',
        toToken: 'USDC',
        fromAmount: 1,
        slippagePercent: 0.5,
        network: 'ethereum',
      });

      expect(quote.rate).toBe(2500);
      expect(quote.fromAmount).toBe(1);
      expect(quote.toAmount).toBeGreaterThan(0);
      expect(quote.toAmount).toBeLessThan(quote.rate);
      expect(quote.effectiveRate).toBe(quote.toAmount);
      expect(quote.protocolFeePercent).toBe(PROTOCOL_FEE_PERCENT);
      expect(quote.network).toBe('ethereum');
      expect(quote.minimumReceived).toBeLessThan(quote.toAmount);
      expect(quote.totalFeeUsd).toBeGreaterThan(0);
      expect(quote.fromValueUsd).toBe(2500);
      expect(quote.toValueUsd).toBeGreaterThan(0);
    });

    it('clamps slippage to the supported bounds', () => {
      const low = getSwapQuote({
        fromToken: 'ETH',
        toToken: 'USDC',
        fromAmount: 1,
        slippagePercent: -10,
      });
      const normal = getSwapQuote({
        fromToken: 'ETH',
        toToken: 'USDC',
        fromAmount: 1,
        slippagePercent: MIN_SLIPPAGE_PERCENT,
      });
      const high = getSwapQuote({
        fromToken: 'ETH',
        toToken: 'USDC',
        fromAmount: 1,
        slippagePercent: 100,
      });
      const max = getSwapQuote({
        fromToken: 'ETH',
        toToken: 'USDC',
        fromAmount: 1,
        slippagePercent: MAX_SLIPPAGE_PERCENT,
      });

      expect(low.minimumReceived).toBe(normal.minimumReceived);
      expect(high.minimumReceived).toBe(max.minimumReceived);
      expect(max.minimumReceived).toBeLessThan(normal.minimumReceived);
    });

    it('emits warnings with the expected severity', () => {
      const low = getSwapQuote({
        fromToken: 'ETH',
        toToken: 'USDC',
        fromAmount: 1,
        slippagePercent: 0.5,
      });
      expect(low.warnings.some(warning => warning.code === 'high-price-impact')).toBe(false);

      const large = getSwapQuote({
        fromToken: 'ETH',
        toToken: 'USDC',
        fromAmount: 200_000,
        slippagePercent: 10,
      });
      expect(large.warnings.some(warning => warning.code === 'severe-price-impact')).toBe(true);
      expect(large.warnings.some(warning => warning.code === 'high-slippage')).toBe(true);
    });

    it('handles invalid or zero input without returning NaN', () => {
      const quote = getSwapQuote({
        fromToken: 'ETH',
        toToken: 'USDC',
        fromAmount: Number.NaN,
        slippagePercent: Number.NaN,
      });
      expect(quote.fromAmount).toBe(0);
      expect(quote.toAmount).toBe(0);
      expect(quote.effectiveRate).toBe(0);
      expect(Number.isNaN(quote.minimumReceived)).toBe(false);
    });
  });

  describe('validation', () => {
    const base = {
      fromToken: 'ETH' as const,
      toToken: 'USDC' as const,
      balance: 2,
      gasBalance: 2,
      network: 'ethereum' as const,
    };

    it.each([
      ['', 'empty-amount'],
      ['abc', 'invalid-amount'],
      ['0', 'non-positive-amount'],
      ['-1', 'non-positive-amount'],
    ] as const)('rejects raw amount %j with code %s', (rawAmount, code) => {
      expect(validateSwap({ ...base, rawAmount })).toEqual({ valid: false, code });
    });

    it('rejects same-token swaps', () => {
      expect(
        validateSwap({ ...base, fromToken: 'ETH', toToken: 'ETH', rawAmount: '1' }),
      ).toEqual({ valid: false, code: 'same-token' });
    });

    it('rejects an amount larger than the available balance', () => {
      expect(validateSwap({ ...base, rawAmount: '2.0001' })).toEqual({
        valid: false,
        code: 'insufficient-balance',
      });
    });

    it('rejects when the gas balance cannot cover the selected network fee', () => {
      expect(
        validateSwap({
          ...base,
          rawAmount: '0.1',
          gasBalance: 0,
          network: 'ethereum',
        }),
      ).toEqual({ valid: false, code: 'insufficient-gas' });
    });

    it('accepts a valid amount with comma decimal notation', () => {
      expect(validateSwap({ ...base, rawAmount: '1,25' })).toEqual({ valid: true });
    });
  });

  describe('formatting and severity', () => {
    it('formats token amounts using token-specific precision', () => {
      expect(formatTokenAmount('ETH', 1.234567)).toBe('1.23457');
      expect(formatTokenAmount('USDC', 12.3456)).toBe('12.35');
      expect(formatTokenAmount('ETH', 0)).toBe('0');
      expect(formatTokenAmount('ETH', Number.NaN)).toBe('0');
    });

    it('classifies price impact for presentation', () => {
      expect(getPriceImpactSeverity(0.99)).toBe('low');
      expect(getPriceImpactSeverity(1)).toBe('medium');
      expect(getPriceImpactSeverity(4.99)).toBe('medium');
      expect(getPriceImpactSeverity(5)).toBe('high');
    });

    it('keeps the token fixture internally consistent', () => {
      expect(Object.keys(SWAP_TOKENS).length).toBeGreaterThanOrEqual(10);
      for (const token of Object.values(SWAP_TOKENS)) {
        expect(token.priceUsd).toBeGreaterThan(0);
        expect(token.liquidityUsd).toBeGreaterThan(0);
        expect(token.displayDecimals).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
