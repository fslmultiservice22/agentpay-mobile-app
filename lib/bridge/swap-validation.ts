import { type CrossChainToken } from '@/hooks/use-cross-chain-swap';
import { type BlockchainId } from '@/lib/blockchain/blockchain-config';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate cross-chain swap inputs
 */
export function validateCrossChainSwap(
  sourceChain: BlockchainId,
  destinationChain: BlockchainId,
  inputToken: CrossChainToken | null,
  outputToken: CrossChainToken | null,
  inputAmount: string,
  userBalance: string
): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate source and destination chains
  if (!sourceChain) {
    errors.push({
      field: 'sourceChain',
      message: 'Source blockchain is required',
      code: 'MISSING_SOURCE_CHAIN',
    });
  }

  if (!destinationChain) {
    errors.push({
      field: 'destinationChain',
      message: 'Destination blockchain is required',
      code: 'MISSING_DESTINATION_CHAIN',
    });
  }

  if (sourceChain === destinationChain) {
    errors.push({
      field: 'destinationChain',
      message: 'Source and destination blockchains must be different',
      code: 'SAME_CHAIN',
    });
  }

  // Validate tokens
  if (!inputToken) {
    errors.push({
      field: 'inputToken',
      message: 'Input token is required',
      code: 'MISSING_INPUT_TOKEN',
    });
  }

  if (!outputToken) {
    errors.push({
      field: 'outputToken',
      message: 'Output token is required',
      code: 'MISSING_OUTPUT_TOKEN',
    });
  }

  // Validate amount
  if (!inputAmount || inputAmount === '0') {
    errors.push({
      field: 'inputAmount',
      message: 'Amount must be greater than 0',
      code: 'INVALID_AMOUNT',
    });
  }

  const amount = parseFloat(inputAmount);
  if (isNaN(amount)) {
    errors.push({
      field: 'inputAmount',
      message: 'Invalid amount format',
      code: 'INVALID_AMOUNT_FORMAT',
    });
  }

  // Validate minimum amount (0.01)
  if (amount < 0.01) {
    errors.push({
      field: 'inputAmount',
      message: 'Minimum swap amount is 0.01',
      code: 'AMOUNT_TOO_SMALL',
    });
  }

  // Validate maximum amount (1,000,000)
  if (amount > 1000000) {
    errors.push({
      field: 'inputAmount',
      message: 'Maximum swap amount is 1,000,000',
      code: 'AMOUNT_TOO_LARGE',
    });
  }

  // Validate balance
  const balance = parseFloat(userBalance);
  if (amount > balance) {
    errors.push({
      field: 'inputAmount',
      message: `Insufficient balance. Available: ${userBalance}`,
      code: 'INSUFFICIENT_BALANCE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate swap quote
 */
export function validateSwapQuote(quote: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!quote) {
    errors.push({
      field: 'quote',
      message: 'Quote is required',
      code: 'MISSING_QUOTE',
    });
    return { isValid: false, errors };
  }

  if (!quote.sourceChain) {
    errors.push({
      field: 'sourceChain',
      message: 'Source chain is missing from quote',
      code: 'MISSING_SOURCE_CHAIN',
    });
  }

  if (!quote.destinationChain) {
    errors.push({
      field: 'destinationChain',
      message: 'Destination chain is missing from quote',
      code: 'MISSING_DESTINATION_CHAIN',
    });
  }

  if (!quote.inputToken) {
    errors.push({
      field: 'inputToken',
      message: 'Input token is missing from quote',
      code: 'MISSING_INPUT_TOKEN',
    });
  }

  if (!quote.outputToken) {
    errors.push({
      field: 'outputToken',
      message: 'Output token is missing from quote',
      code: 'MISSING_OUTPUT_TOKEN',
    });
  }

  if (!quote.inputAmount) {
    errors.push({
      field: 'inputAmount',
      message: 'Input amount is missing from quote',
      code: 'MISSING_INPUT_AMOUNT',
    });
  }

  if (!quote.outputAmount) {
    errors.push({
      field: 'outputAmount',
      message: 'Output amount is missing from quote',
      code: 'MISSING_OUTPUT_AMOUNT',
    });
  }

  // Validate output amount is positive
  const outputAmount = parseFloat(quote.outputAmount);
  if (outputAmount <= 0) {
    errors.push({
      field: 'outputAmount',
      message: 'Output amount must be greater than 0',
      code: 'INVALID_OUTPUT_AMOUNT',
    });
  }

  // Validate price impact is reasonable (< 50%)
  const priceImpact = parseFloat(quote.priceImpact);
  if (priceImpact > 50) {
    errors.push({
      field: 'priceImpact',
      message: 'Price impact is too high (> 50%)',
      code: 'HIGH_PRICE_IMPACT',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: ValidationError): string {
  const messages: Record<string, string> = {
    MISSING_SOURCE_CHAIN: 'Please select a source blockchain',
    MISSING_DESTINATION_CHAIN: 'Please select a destination blockchain',
    SAME_CHAIN: 'Source and destination must be different',
    MISSING_INPUT_TOKEN: 'Please select an input token',
    MISSING_OUTPUT_TOKEN: 'Please select an output token',
    INVALID_AMOUNT: 'Please enter a valid amount',
    INVALID_AMOUNT_FORMAT: 'Amount must be a valid number',
    AMOUNT_TOO_SMALL: 'Minimum swap amount is 0.01',
    AMOUNT_TOO_LARGE: 'Maximum swap amount is 1,000,000',
    INSUFFICIENT_BALANCE: error.message, // Use custom message from error
    MISSING_QUOTE: 'Please get a quote first',
    HIGH_PRICE_IMPACT: 'Price impact is too high. Please review the swap details',
  };

  return messages[error.code] || error.message;
}

/**
 * Get all error messages
 */
export function getAllErrorMessages(errors: ValidationError[]): string[] {
  return errors.map(getErrorMessage);
}
