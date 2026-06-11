/**
 * 1inch Swap Service
 * Handles token swaps using 1inch API
 */

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  priceImpact: string;
  slippage: string;
  allowanceTarget: string;
  protocols: string[][];
}

export interface SwapTransaction {
  from: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  gasPrice: string;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface SwapRoute {
  protocols: string[][];
  parts: Array<{
    fromTokenAddress: string;
    toTokenAddress: string;
    proportion: string;
  }>;
}

const API_BASE_URL = 'https://api.1inch.io/v5.0';
const CHAIN_IDS = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  sepolia: 11155111,
};

/**
 * Get 1inch API URL for chain
 */
function getApiUrl(chainId: number): string {
  return `${API_BASE_URL}/${chainId}`;
}

/**
 * Get swap quote from 1inch
 */
export async function getSwapQuote(
  chainId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  slippage: number = 1
): Promise<SwapQuote> {
  try {
    const apiUrl = getApiUrl(chainId);
    const params = new URLSearchParams({
      fromTokenAddress,
      toTokenAddress,
      amount,
      slippage: slippage.toString(),
    });

    const response = await fetch(`${apiUrl}/quote?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get swap quote: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      fromToken: data.fromToken.symbol,
      toToken: data.toToken.symbol,
      fromAmount: data.fromTokenAmount,
      toAmount: data.toTokenAmount,
      estimatedGas: data.estimatedGas,
      priceImpact: data.priceImpact,
      slippage: slippage.toString(),
      allowanceTarget: data.allowanceTarget,
      protocols: data.protocols,
    };
  } catch (error) {
    console.error('Failed to get swap quote:', error);
    throw error;
  }
}

/**
 * Get swap transaction data
 */
export async function getSwapTransaction(
  chainId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  fromAddress: string,
  slippage: number = 1,
  referrer?: string
): Promise<SwapTransaction> {
  try {
    const apiUrl = getApiUrl(chainId);
    const params = new URLSearchParams({
      fromTokenAddress,
      toTokenAddress,
      amount,
      fromAddress,
      slippage: slippage.toString(),
      disableEstimate: 'true',
    });

    if (referrer) {
      params.append('referrer', referrer);
    }

    const response = await fetch(`${apiUrl}/swap?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get swap transaction: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      from: data.tx.from,
      to: data.tx.to,
      data: data.tx.data,
      value: data.tx.value,
      gas: data.tx.gas,
      gasPrice: data.tx.gasPrice,
    };
  } catch (error) {
    console.error('Failed to get swap transaction:', error);
    throw error;
  }
}

/**
 * Get tokens for chain
 */
export async function getTokens(chainId: number): Promise<Token[]> {
  try {
    const apiUrl = getApiUrl(chainId);
    const response = await fetch(`${apiUrl}/tokens`);
    
    if (!response.ok) {
      throw new Error(`Failed to get tokens: ${response.statusText}`);
    }

    const data = await response.json();
    
    return Object.values(data.tokens).map((token: any) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
    }));
  } catch (error) {
    console.error('Failed to get tokens:', error);
    throw error;
  }
}

/**
 * Get token by address
 */
export async function getToken(chainId: number, tokenAddress: string): Promise<Token | null> {
  try {
    const tokens = await getTokens(chainId);
    return tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase()) || null;
  } catch (error) {
    console.error('Failed to get token:', error);
    return null;
  }
}

/**
 * Get swap routes
 */
export async function getSwapRoutes(
  chainId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string
): Promise<SwapRoute[]> {
  try {
    const apiUrl = getApiUrl(chainId);
    const params = new URLSearchParams({
      fromTokenAddress,
      toTokenAddress,
      amount,
    });

    const response = await fetch(`${apiUrl}/swap?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get swap routes: ${response.statusText}`);
    }

    const data = await response.json();
    
    return [{
      protocols: data.protocols,
      parts: data.parts || [],
    }];
  } catch (error) {
    console.error('Failed to get swap routes:', error);
    throw error;
  }
}

/**
 * Calculate swap output
 */
export function calculateSwapOutput(
  inputAmount: string,
  inputDecimals: number,
  outputDecimals: number,
  exchangeRate: string
): string {
  try {
    const input = parseFloat(inputAmount);
    const rate = parseFloat(exchangeRate);
    
    // Adjust for decimals
    const decimalDifference = inputDecimals - outputDecimals;
    const adjustedRate = rate / Math.pow(10, decimalDifference);
    
    const output = input * adjustedRate;
    return output.toFixed(outputDecimals);
  } catch (error) {
    console.error('Failed to calculate swap output:', error);
    return '0';
  }
}

/**
 * Get price impact
 */
export function getPriceImpact(
  inputAmount: string,
  outputAmount: string,
  spotPrice: string
): string {
  try {
    const input = parseFloat(inputAmount);
    const output = parseFloat(outputAmount);
    const spot = parseFloat(spotPrice);
    
    const expectedOutput = input * spot;
    const impact = ((expectedOutput - output) / expectedOutput) * 100;
    
    return impact.toFixed(2);
  } catch (error) {
    console.error('Failed to calculate price impact:', error);
    return '0';
  }
}

/**
 * Format token amount
 */
export function formatTokenAmount(amount: string, decimals: number): string {
  try {
    const num = parseFloat(amount);
    return num.toFixed(decimals);
  } catch (error) {
    console.error('Failed to format token amount:', error);
    return '0';
  }
}

/**
 * Validate swap parameters
 */
export function validateSwapParams(
  fromToken: string,
  toToken: string,
  amount: string
): { valid: boolean; error?: string } {
  if (!fromToken || fromToken.length === 0) {
    return { valid: false, error: 'From token is required' };
  }

  if (!toToken || toToken.length === 0) {
    return { valid: false, error: 'To token is required' };
  }

  if (fromToken.toLowerCase() === toToken.toLowerCase()) {
    return { valid: false, error: 'From and to tokens must be different' };
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  return { valid: true };
}

/**
 * Get supported chains
 */
export function getSupportedChains(): Record<string, number> {
  return CHAIN_IDS;
}

/**
 * Check if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return Object.values(CHAIN_IDS).includes(chainId);
}
