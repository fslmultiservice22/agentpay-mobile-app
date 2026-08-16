/**
 * Swap Quote Service
 *
 * Produces deterministic, auditable swap quotes for the trading screen.
 *
 * Before this service the trading screen used a single hardcoded rate of 2850
 * for every pair (so ETH -> ETH also "earned" 2850x) and displayed a fixed
 * "0.005 ETH ($12.50)" network fee. Quotes are now derived from a token price
 * table, price impact grows with the size of the trade relative to the pool
 * depth, and the network fee depends on the selected chain.
 */

export type SwapTokenSymbol = 'ETH' | 'WETH' | 'BTC' | 'USDC' | 'USDT' | 'DAI' | 'MATIC' | 'ARB' | 'OP' | 'UNI' | 'LINK';

export type SwapNetwork = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base';

export interface SwapToken {
  symbol: SwapTokenSymbol;
  name: string;
  /** Reference price in USD. */
  priceUsd: number;
  /** Decimals shown in the UI (not the on-chain decimals). */
  displayDecimals: number;
  /** Indicative pool depth in USD, used to model price impact. */
  liquidityUsd: number;
  stable: boolean;
}

export interface NetworkFeeProfile {
  network: SwapNetwork;
  label: string;
  /** Native token used to pay gas. */
  gasToken: SwapTokenSymbol;
  /** Typical gas units for a swap on this chain. */
  gasUnits: number;
  /** Gas price in gwei. */
  gasPriceGwei: number;
  /** USD price of the gas token. */
  gasTokenPriceUsd: number;
  /** Indicative confirmation time in seconds. */
  estimatedSeconds: number;
}

export interface SwapQuote {
  fromToken: SwapTokenSymbol;
  toToken: SwapTokenSymbol;
  /** Amount the user is selling. */
  fromAmount: number;
  /** Amount received before slippage protection, price impact already applied. */
  toAmount: number;
  /** Mid-market rate: how many `toToken` one `fromToken` buys. */
  rate: number;
  /** Effective rate actually obtained once price impact is applied. */
  effectiveRate: number;
  /** Price impact as a percentage (0-100). */
  priceImpactPercent: number;
  /** Protocol fee in percent, deducted from the output. */
  protocolFeePercent: number;
  /** Protocol fee expressed in USD. */
  protocolFeeUsd: number;
  /** Worst acceptable output given the slippage tolerance. */
  minimumReceived: number;
  /** Network fee in the gas token. */
  networkFeeNative: number;
  /** Network fee in USD. */
  networkFeeUsd: number;
  /** Sum of protocol fee and network fee in USD. */
  totalFeeUsd: number;
  /** USD notional of the sold amount. */
  fromValueUsd: number;
  /** USD notional of the received amount. */
  toValueUsd: number;
  network: SwapNetwork;
  estimatedSeconds: number;
  /** Human-readable warnings, already ordered by severity. */
  warnings: SwapQuoteWarning[];
}

export type SwapQuoteWarningCode =
  | 'same-token'
  | 'high-price-impact'
  | 'severe-price-impact'
  | 'fee-exceeds-value'
  | 'low-slippage'
  | 'high-slippage'
  | 'dust-amount';

export interface SwapQuoteWarning {
  code: SwapQuoteWarningCode;
  severity: 'info' | 'warning' | 'critical';
}

export interface SwapValidationResult {
  valid: boolean;
  /** Machine-readable reason, mapped to an i18n key by the caller. */
  code?:
    | 'empty-amount'
    | 'invalid-amount'
    | 'non-positive-amount'
    | 'same-token'
    | 'insufficient-balance'
    | 'insufficient-gas';
}

/** Protocol fee applied by the aggregator, in percent. */
export const PROTOCOL_FEE_PERCENT = 0.25;

/** Slippage tolerance bounds accepted by the UI, in percent. */
export const MIN_SLIPPAGE_PERCENT = 0.05;
export const MAX_SLIPPAGE_PERCENT = 50;

export const SWAP_TOKENS: Record<SwapTokenSymbol, SwapToken> = {
  ETH: { symbol: 'ETH', name: 'Ethereum', priceUsd: 2500, displayDecimals: 5, liquidityUsd: 420_000_000, stable: false },
  WETH: { symbol: 'WETH', name: 'Wrapped Ethereum', priceUsd: 2499, displayDecimals: 5, liquidityUsd: 180_000_000, stable: false },
  BTC: { symbol: 'BTC', name: 'Bitcoin', priceUsd: 63_000, displayDecimals: 6, liquidityUsd: 310_000_000, stable: false },
  USDC: { symbol: 'USDC', name: 'USD Coin', priceUsd: 1, displayDecimals: 2, liquidityUsd: 540_000_000, stable: true },
  USDT: { symbol: 'USDT', name: 'Tether', priceUsd: 1, displayDecimals: 2, liquidityUsd: 610_000_000, stable: true },
  DAI: { symbol: 'DAI', name: 'Dai', priceUsd: 1, displayDecimals: 2, liquidityUsd: 120_000_000, stable: true },
  MATIC: { symbol: 'MATIC', name: 'Polygon', priceUsd: 0.72, displayDecimals: 3, liquidityUsd: 48_000_000, stable: false },
  ARB: { symbol: 'ARB', name: 'Arbitrum', priceUsd: 1.05, displayDecimals: 3, liquidityUsd: 36_000_000, stable: false },
  OP: { symbol: 'OP', name: 'Optimism', priceUsd: 1.85, displayDecimals: 3, liquidityUsd: 29_000_000, stable: false },
  UNI: { symbol: 'UNI', name: 'Uniswap', priceUsd: 12.5, displayDecimals: 3, liquidityUsd: 41_000_000, stable: false },
  LINK: { symbol: 'LINK', name: 'Chainlink', priceUsd: 14.8, displayDecimals: 3, liquidityUsd: 52_000_000, stable: false },
};

export const NETWORK_FEE_PROFILES: Record<SwapNetwork, NetworkFeeProfile> = {
  ethereum: {
    network: 'ethereum',
    label: 'Ethereum',
    gasToken: 'ETH',
    gasUnits: 180_000,
    gasPriceGwei: 24,
    gasTokenPriceUsd: 2500,
    estimatedSeconds: 45,
  },
  polygon: {
    network: 'polygon',
    label: 'Polygon',
    gasToken: 'MATIC',
    gasUnits: 210_000,
    gasPriceGwei: 90,
    gasTokenPriceUsd: 0.72,
    estimatedSeconds: 10,
  },
  arbitrum: {
    network: 'arbitrum',
    label: 'Arbitrum',
    gasToken: 'ETH',
    gasUnits: 600_000,
    gasPriceGwei: 0.12,
    gasTokenPriceUsd: 2500,
    estimatedSeconds: 6,
  },
  optimism: {
    network: 'optimism',
    label: 'Optimism',
    gasToken: 'ETH',
    gasUnits: 480_000,
    gasPriceGwei: 0.08,
    gasTokenPriceUsd: 2500,
    estimatedSeconds: 6,
  },
  base: {
    network: 'base',
    label: 'Base',
    gasToken: 'ETH',
    gasUnits: 420_000,
    gasPriceGwei: 0.05,
    gasTokenPriceUsd: 2500,
    estimatedSeconds: 4,
  },
};

/** Ordered list used to build token pickers. */
export const SWAP_TOKEN_LIST: SwapToken[] = Object.values(SWAP_TOKENS);

export function isSwapTokenSymbol(value: string): value is SwapTokenSymbol {
  return Object.prototype.hasOwnProperty.call(SWAP_TOKENS, value);
}

export function getTokenPriceUsd(symbol: SwapTokenSymbol): number {
  return SWAP_TOKENS[symbol].priceUsd;
}

/**
 * Mid-market rate between two tokens: how many `to` a single `from` buys.
 */
export function getExchangeRate(from: SwapTokenSymbol, to: SwapTokenSymbol): number {
  const fromPrice = getTokenPriceUsd(from);
  const toPrice = getTokenPriceUsd(to);
  if (toPrice <= 0) return 0;
  return fromPrice / toPrice;
}

/**
 * Price impact of a trade, in percent.
 *
 * Modelled on a constant-product curve: impact = size / (size + depth). The
 * depth is the smaller of the two pools, because the shallow side dictates the
 * slippage. Stable-to-stable pairs are far deeper, so their depth is boosted.
 */
export function calculatePriceImpact(
  from: SwapTokenSymbol,
  to: SwapTokenSymbol,
  fromAmount: number,
): number {
  if (from === to) return 0;
  if (!Number.isFinite(fromAmount) || fromAmount <= 0) return 0;

  const notionalUsd = fromAmount * getTokenPriceUsd(from);
  const bothStable = SWAP_TOKENS[from].stable && SWAP_TOKENS[to].stable;
  const rawDepth = Math.min(SWAP_TOKENS[from].liquidityUsd, SWAP_TOKENS[to].liquidityUsd);
  const depth = bothStable ? rawDepth * 6 : rawDepth;

  const impact = (notionalUsd / (notionalUsd + depth)) * 100;
  return Math.min(100, Number(impact.toFixed(4)));
}

/**
 * Network fee for a swap on the given chain.
 */
export function calculateNetworkFee(network: SwapNetwork): { native: number; usd: number; profile: NetworkFeeProfile } {
  const profile = NETWORK_FEE_PROFILES[network];
  const native = (profile.gasUnits * profile.gasPriceGwei) / 1e9;
  return {
    native: Number(native.toFixed(8)),
    usd: Number((native * profile.gasTokenPriceUsd).toFixed(4)),
    profile,
  };
}

/**
 * Build a complete quote. Pure function: same inputs always give same output,
 * which keeps the screen predictable and the service unit-testable.
 */
export function getSwapQuote(params: {
  fromToken: SwapTokenSymbol;
  toToken: SwapTokenSymbol;
  fromAmount: number;
  slippagePercent: number;
  network?: SwapNetwork;
}): SwapQuote {
  const { fromToken, toToken, fromAmount, slippagePercent } = params;
  const network = params.network ?? 'ethereum';

  const safeAmount = Number.isFinite(fromAmount) && fromAmount > 0 ? fromAmount : 0;
  const rate = getExchangeRate(fromToken, toToken);
  const priceImpactPercent = calculatePriceImpact(fromToken, toToken, safeAmount);

  const grossToAmount = safeAmount * rate;
  const afterImpact = grossToAmount * (1 - priceImpactPercent / 100);
  const protocolFeeAmount = afterImpact * (PROTOCOL_FEE_PERCENT / 100);
  const toAmount = Math.max(0, afterImpact - protocolFeeAmount);

  const fee = calculateNetworkFee(network);
  const fromValueUsd = safeAmount * getTokenPriceUsd(fromToken);
  const toValueUsd = toAmount * getTokenPriceUsd(toToken);
  const protocolFeeUsd = protocolFeeAmount * getTokenPriceUsd(toToken);

  const boundedSlippage = Math.min(
    MAX_SLIPPAGE_PERCENT,
    Math.max(MIN_SLIPPAGE_PERCENT, Number.isFinite(slippagePercent) ? slippagePercent : 0.5),
  );
  const minimumReceived = toAmount * (1 - boundedSlippage / 100);

  const totalFeeUsd = Number((protocolFeeUsd + fee.usd).toFixed(4));

  const warnings: SwapQuoteWarning[] = [];
  if (fromToken === toToken) {
    warnings.push({ code: 'same-token', severity: 'critical' });
  }
  if (priceImpactPercent >= 5) {
    warnings.push({ code: 'severe-price-impact', severity: 'critical' });
  } else if (priceImpactPercent >= 1) {
    warnings.push({ code: 'high-price-impact', severity: 'warning' });
  }
  if (safeAmount > 0 && totalFeeUsd > fromValueUsd * 0.1) {
    warnings.push({ code: 'fee-exceeds-value', severity: 'warning' });
  }
  if (safeAmount > 0 && fromValueUsd < 1) {
    warnings.push({ code: 'dust-amount', severity: 'info' });
  }
  if (boundedSlippage < 0.1) {
    warnings.push({ code: 'low-slippage', severity: 'info' });
  } else if (boundedSlippage > 5) {
    warnings.push({ code: 'high-slippage', severity: 'warning' });
  }

  return {
    fromToken,
    toToken,
    fromAmount: safeAmount,
    toAmount,
    rate,
    effectiveRate: safeAmount > 0 ? toAmount / safeAmount : 0,
    priceImpactPercent,
    protocolFeePercent: PROTOCOL_FEE_PERCENT,
    protocolFeeUsd: Number(protocolFeeUsd.toFixed(4)),
    minimumReceived,
    networkFeeNative: fee.native,
    networkFeeUsd: fee.usd,
    totalFeeUsd,
    fromValueUsd: Number(fromValueUsd.toFixed(2)),
    toValueUsd: Number(toValueUsd.toFixed(2)),
    network,
    estimatedSeconds: fee.profile.estimatedSeconds,
    warnings,
  };
}

/**
 * Validate a swap before it is submitted. Returns a machine-readable code so
 * the caller can map it to a localized message.
 */
export function validateSwap(params: {
  fromToken: SwapTokenSymbol;
  toToken: SwapTokenSymbol;
  rawAmount: string;
  /** Balance of `fromToken` available to the user, when known. */
  balance?: number;
  /** Balance of the gas token, when known. */
  gasBalance?: number;
  network?: SwapNetwork;
}): SwapValidationResult {
  const { fromToken, toToken, rawAmount, balance, gasBalance } = params;
  const network = params.network ?? 'ethereum';

  const trimmed = rawAmount.trim();
  if (trimmed.length === 0) {
    return { valid: false, code: 'empty-amount' };
  }

  const amount = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(amount)) {
    return { valid: false, code: 'invalid-amount' };
  }
  if (amount <= 0) {
    return { valid: false, code: 'non-positive-amount' };
  }
  if (fromToken === toToken) {
    return { valid: false, code: 'same-token' };
  }
  if (typeof balance === 'number' && amount > balance) {
    return { valid: false, code: 'insufficient-balance' };
  }
  if (typeof gasBalance === 'number') {
    const fee = calculateNetworkFee(network);
    const gasToken = NETWORK_FEE_PROFILES[network].gasToken;
    // When gas is paid with the token being sold, both amounts share the balance.
    const required = gasToken === fromToken ? fee.native + amount : fee.native;
    if (required > gasBalance) {
      return { valid: false, code: 'insufficient-gas' };
    }
  }

  return { valid: true };
}

/**
 * Format a token amount with the number of decimals suited to its price, so
 * that 0.00004 ETH does not render as "0.00".
 */
export function formatTokenAmount(symbol: SwapTokenSymbol, amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  const decimals = SWAP_TOKENS[symbol].displayDecimals;
  if (amount === 0) return '0';
  if (Math.abs(amount) < Math.pow(10, -decimals)) {
    return `<${Math.pow(10, -decimals).toFixed(decimals)}`;
  }
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/** Severity of the current price impact, used to colour the UI. */
export function getPriceImpactSeverity(priceImpactPercent: number): 'low' | 'medium' | 'high' {
  if (priceImpactPercent >= 5) return 'high';
  if (priceImpactPercent >= 1) return 'medium';
  return 'low';
}
