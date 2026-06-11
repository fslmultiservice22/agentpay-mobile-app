/**
 * Portfolio Gains and Losses Calculation
 * Calculates unrealized and realized gains/losses
 */

export interface GainLossEntry {
  symbol: string;
  blockchain: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  totalCost: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  realizedGain?: number;
  realizedGainPercent?: number;
}

export interface PortfolioGainLoss {
  totalCost: number;
  totalCurrentValue: number;
  totalUnrealizedGain: number;
  totalUnrealizedGainPercent: number;
  totalRealizedGain: number;
  totalRealizedGainPercent: number;
  totalGain: number;
  totalGainPercent: number;
  entries: GainLossEntry[];
}

/**
 * Calculate unrealized gains/losses for a single asset
 */
export function calculateAssetGainLoss(
  quantity: number,
  averageCost: number,
  currentPrice: number
): GainLossEntry {
  const totalCost = quantity * averageCost;
  const currentValue = quantity * currentPrice;
  const unrealizedGain = currentValue - totalCost;
  const unrealizedGainPercent = totalCost > 0 ? (unrealizedGain / totalCost) * 100 : 0;

  return {
    symbol: '',
    blockchain: '',
    quantity,
    averageCost,
    currentPrice,
    totalCost,
    currentValue,
    unrealizedGain,
    unrealizedGainPercent,
  };
}

/**
 * Calculate portfolio gains/losses
 */
export function calculatePortfolioGainLoss(entries: GainLossEntry[]): PortfolioGainLoss {
  const totalCost = entries.reduce((sum, entry) => sum + entry.totalCost, 0);
  const totalCurrentValue = entries.reduce((sum, entry) => sum + entry.currentValue, 0);
  const totalUnrealizedGain = entries.reduce((sum, entry) => sum + entry.unrealizedGain, 0);
  const totalRealizedGain = entries.reduce((sum, entry) => sum + (entry.realizedGain || 0), 0);

  const totalUnrealizedGainPercent = totalCost > 0 ? (totalUnrealizedGain / totalCost) * 100 : 0;
  const totalRealizedGainPercent = totalCost > 0 ? (totalRealizedGain / totalCost) * 100 : 0;
  const totalGain = totalUnrealizedGain + totalRealizedGain;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return {
    totalCost,
    totalCurrentValue,
    totalUnrealizedGain,
    totalUnrealizedGainPercent,
    totalRealizedGain,
    totalRealizedGainPercent,
    totalGain,
    totalGainPercent,
    entries,
  };
}

/**
 * Format gain/loss value for display
 */
export function formatGainLoss(value: number, includeSign = true): string {
  const sign = value >= 0 ? (includeSign ? '+' : '') : '-';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

/**
 * Format gain/loss percentage for display
 */
export function formatGainLossPercent(percent: number, includeSign = true): string {
  const sign = percent >= 0 ? (includeSign ? '+' : '') : '-';
  return `${sign}${Math.abs(percent).toFixed(2)}%`;
}

/**
 * Get color for gain/loss (green for positive, red for negative)
 */
export function getGainLossColor(value: number, successColor: string, errorColor: string): string {
  return value >= 0 ? successColor : errorColor;
}

/**
 * Calculate cost basis using different methods
 */
export enum CostBasisMethod {
  FIFO = 'FIFO', // First In First Out
  LIFO = 'LIFO', // Last In First Out
  AVERAGE = 'AVERAGE', // Average Cost
}

/**
 * Calculate average cost basis
 */
export function calculateAverageCostBasis(purchases: Array<{ quantity: number; price: number }>): number {
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.quantity * p.price, 0);
  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
}

/**
 * Calculate FIFO cost basis
 */
export function calculateFIFOCostBasis(
  purchases: Array<{ quantity: number; price: number }>,
  quantitySold: number
): number {
  let remaining = quantitySold;
  let totalCost = 0;

  for (const purchase of purchases) {
    if (remaining <= 0) break;

    const quantityToSell = Math.min(purchase.quantity, remaining);
    totalCost += quantityToSell * purchase.price;
    remaining -= quantityToSell;
  }

  return quantitySold > 0 ? totalCost / quantitySold : 0;
}

/**
 * Calculate LIFO cost basis
 */
export function calculateLIFOCostBasis(
  purchases: Array<{ quantity: number; price: number }>,
  quantitySold: number
): number {
  let remaining = quantitySold;
  let totalCost = 0;

  for (let i = purchases.length - 1; i >= 0; i--) {
    if (remaining <= 0) break;

    const purchase = purchases[i];
    const quantityToSell = Math.min(purchase.quantity, remaining);
    totalCost += quantityToSell * purchase.price;
    remaining -= quantityToSell;
  }

  return quantitySold > 0 ? totalCost / quantitySold : 0;
}

/**
 * Calculate tax liability (simplified)
 * Assumes short-term capital gains tax rate of 37% and long-term of 20%
 */
export function calculateTaxLiability(
  realizedGain: number,
  holdingDays: number,
  shortTermRate = 0.37,
  longTermRate = 0.2
): number {
  const isLongTerm = holdingDays >= 365;
  const rate = isLongTerm ? longTermRate : shortTermRate;
  return realizedGain > 0 ? realizedGain * rate : 0;
}
