/**
 * Gas Fee Optimization Service
 * Handles gas price prediction and optimization using Etherscan API
 */

export interface GasPrice {
  standard: string;
  fast: string;
  fastest: string;
  safeGasPrice: string;
  standardGasPrice: string;
  fastGasPrice: string;
  suggestBaseGas: string;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  totalGas: string;
  estimatedCost: string;
  estimatedTime: string;
  savings: string;
}

export interface GasOptimization {
  currentGasPrice: string;
  recommendedGasPrice: string;
  potentialSavings: string;
  savingsPercent: string;
  recommendation: 'wait' | 'execute' | 'urgent';
  timeToOptimal: number; // minutes
}

export interface GasHistory {
  timestamp: number;
  gasPrice: string;
  standard: string;
  fast: string;
  fastest: string;
}

const ETHERSCAN_API_URL = 'https://api.etherscan.io/api';
const GAS_HISTORY_KEY = 'gas_price_history';
const MAX_HISTORY_ENTRIES = 100;

/**
 * Get current gas prices from Etherscan
 */
export async function getCurrentGasPrices(apiKey?: string): Promise<GasPrice> {
  try {
    const params = new URLSearchParams({
      module: 'gastracker',
      action: 'gasoracle',
    });

    if (apiKey) {
      params.append('apikey', apiKey);
    }

    const response = await fetch(`${ETHERSCAN_API_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to get gas prices: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== '1') {
      throw new Error('Etherscan API error: ' + data.message);
    }

    const result = data.result;

    return {
      standard: result.SafeGasPrice,
      fast: result.StandardGasPrice,
      fastest: result.FastGasPrice,
      safeGasPrice: result.SafeGasPrice,
      standardGasPrice: result.StandardGasPrice,
      fastGasPrice: result.FastGasPrice,
      suggestBaseGas: result.suggestBaseGas || '0',
    };
  } catch (error) {
    console.error('Failed to get gas prices:', error);
    throw error;
  }
}

/**
 * Estimate transaction gas cost
 */
export async function estimateGasCost(
  gasLimit: string,
  gasPrice: string,
  ethPrice: string = '2000' // Default ETH price in USD
): Promise<GasEstimate> {
  try {
    const gasLimitNum = parseFloat(gasLimit);
    const gasPriceNum = parseFloat(gasPrice);
    const ethPriceNum = parseFloat(ethPrice);

    // Calculate total gas in wei
    const totalGasWei = gasLimitNum * gasPriceNum;

    // Convert to ETH (1 ETH = 10^18 wei)
    const totalGasEth = totalGasWei / 1e18;

    // Convert to USD
    const totalGasUsd = totalGasEth * ethPriceNum;

    // Estimate time based on gas price
    const estimatedTime = estimateTransactionTime(gasPriceNum);

    return {
      gasLimit,
      gasPrice,
      totalGas: totalGasEth.toFixed(6),
      estimatedCost: `$${totalGasUsd.toFixed(2)}`,
      estimatedTime,
      savings: '0',
    };
  } catch (error) {
    console.error('Failed to estimate gas cost:', error);
    throw error;
  }
}

/**
 * Get gas optimization recommendation
 */
export async function getGasOptimization(
  currentGasPrice: string,
  apiKey?: string
): Promise<GasOptimization> {
  try {
    const prices = await getCurrentGasPrices(apiKey);
    const history = await getGasHistory();

    const currentPrice = parseFloat(currentGasPrice);
    const standardPrice = parseFloat(prices.standard);
    const fastPrice = parseFloat(prices.fast);

    // Calculate average gas price from history
    const avgPrice = history.length > 0
      ? history.reduce((sum, h) => sum + parseFloat(h.gasPrice), 0) / history.length
      : standardPrice;

    // Calculate potential savings
    const savings = currentPrice - standardPrice;
    const savingsPercent = ((savings / currentPrice) * 100).toFixed(2);

    // Determine recommendation
    let recommendation: 'wait' | 'execute' | 'urgent' = 'execute';
    let timeToOptimal = 0;

    if (currentPrice > fastPrice * 1.5) {
      recommendation = 'wait';
      timeToOptimal = 30; // Estimate 30 minutes
    } else if (currentPrice > fastPrice) {
      recommendation = 'wait';
      timeToOptimal = 15;
    } else {
      recommendation = 'execute';
    }

    // Save to history
    await saveGasPrice({
      timestamp: Date.now(),
      gasPrice: currentGasPrice,
      standard: prices.standard,
      fast: prices.fast,
      fastest: prices.fastest,
    });

    return {
      currentGasPrice,
      recommendedGasPrice: prices.standard,
      potentialSavings: savings.toFixed(2),
      savingsPercent,
      recommendation,
      timeToOptimal,
    };
  } catch (error) {
    console.error('Failed to get gas optimization:', error);
    throw error;
  }
}

/**
 * Estimate transaction time based on gas price
 */
function estimateTransactionTime(gasPrice: number): string {
  // Rough estimation based on gas price
  if (gasPrice < 20) {
    return '> 5 minutes';
  } else if (gasPrice < 50) {
    return '2-5 minutes';
  } else if (gasPrice < 100) {
    return '< 2 minutes';
  } else {
    return '< 30 seconds';
  }
}

/**
 * Save gas price to history
 */
export async function saveGasPrice(gasHistory: GasHistory): Promise<void> {
  try {
    const history = await getGasHistory();
    history.unshift(gasHistory);

    // Keep only last MAX_HISTORY_ENTRIES
    const limited = history.slice(0, MAX_HISTORY_ENTRIES);

    // Store in memory (in production, use database)
    globalThis.gasHistoryCache = limited;
  } catch (error) {
    console.error('Failed to save gas price:', error);
  }
}

/**
 * Get gas price history
 */
export async function getGasHistory(): Promise<GasHistory[]> {
  try {
    return (globalThis.gasHistoryCache as GasHistory[]) || [];
  } catch (error) {
    console.error('Failed to get gas history:', error);
    return [];
  }
}

/**
 * Get gas price trend
 */
export async function getGasPriceTrend(): Promise<{
  trend: 'up' | 'down' | 'stable';
  changePercent: string;
  averagePrice: string;
}> {
  try {
    const history = await getGasHistory();

    if (history.length < 2) {
      return {
        trend: 'stable',
        changePercent: '0',
        averagePrice: '0',
      };
    }

    const latest = parseFloat(history[0].gasPrice);
    const previous = parseFloat(history[Math.min(5, history.length - 1)].gasPrice);
    const average = history.reduce((sum, h) => sum + parseFloat(h.gasPrice), 0) / history.length;

    const change = latest - previous;
    const changePercent = ((change / previous) * 100).toFixed(2);

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(change) > previous * 0.05) {
      trend = change > 0 ? 'up' : 'down';
    }

    return {
      trend,
      changePercent,
      averagePrice: average.toFixed(2),
    };
  } catch (error) {
    console.error('Failed to get gas price trend:', error);
    return {
      trend: 'stable',
      changePercent: '0',
      averagePrice: '0',
    };
  }
}

/**
 * Calculate optimal gas price for transaction
 */
export function calculateOptimalGasPrice(
  prices: GasPrice,
  priority: 'low' | 'medium' | 'high' = 'medium'
): string {
  switch (priority) {
    case 'low':
      return prices.standard;
    case 'medium':
      return prices.fast;
    case 'high':
      return prices.fastest;
    default:
      return prices.fast;
  }
}

/**
 * Validate gas price
 */
export function validateGasPrice(gasPrice: string): { valid: boolean; error?: string } {
  try {
    const price = parseFloat(gasPrice);

    if (isNaN(price)) {
      return { valid: false, error: 'Invalid gas price format' };
    }

    if (price <= 0) {
      return { valid: false, error: 'Gas price must be greater than 0' };
    }

    if (price > 10000) {
      return { valid: false, error: 'Gas price seems unusually high' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Failed to validate gas price' };
  }
}

/**
 * Format gas price for display
 */
export function formatGasPrice(gasPrice: string, decimals: number = 2): string {
  try {
    const price = parseFloat(gasPrice);
    return `${price.toFixed(decimals)} Gwei`;
  } catch (error) {
    return gasPrice;
  }
}

/**
 * Get gas price statistics
 */
export async function getGasPriceStats(): Promise<{
  min: string;
  max: string;
  average: string;
  median: string;
}> {
  try {
    const history = await getGasHistory();

    if (history.length === 0) {
      return { min: '0', max: '0', average: '0', median: '0' };
    }

    const prices = history.map(h => parseFloat(h.gasPrice)).sort((a, b) => a - b);

    const min = prices[0];
    const max = prices[prices.length - 1];
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;
    const median = prices[Math.floor(prices.length / 2)];

    return {
      min: min.toFixed(2),
      max: max.toFixed(2),
      average: average.toFixed(2),
      median: median.toFixed(2),
    };
  } catch (error) {
    console.error('Failed to get gas price stats:', error);
    return { min: '0', max: '0', average: '0', median: '0' };
  }
}
