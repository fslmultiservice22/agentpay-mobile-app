import { useState, useCallback } from 'react';

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function useValidation() {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validate Ethereum address
  const validateAddress = useCallback((address: string): ValidationResult => {
    if (!address) {
      return { isValid: false, error: 'Address is required' };
    }

    const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!ethereumAddressRegex.test(address)) {
      return { isValid: false, error: 'Invalid Ethereum address format' };
    }

    return { isValid: true };
  }, []);

  // Validate amount
  const validateAmount = useCallback((amount: string, balance: string): ValidationResult => {
    if (!amount) {
      return { isValid: false, error: 'Amount is required' };
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return { isValid: false, error: 'Amount must be a positive number' };
    }

    const balanceNum = parseFloat(balance);
    if (amountNum > balanceNum) {
      return { isValid: false, error: 'Insufficient balance' };
    }

    return { isValid: true };
  }, []);

  // Validate gas fee
  const validateGasFee = useCallback((gasPrice: string, gasLimit: string): ValidationResult => {
    if (!gasPrice || !gasLimit) {
      return { isValid: false, error: 'Gas price and limit are required' };
    }

    const gasPriceNum = parseFloat(gasPrice);
    const gasLimitNum = parseFloat(gasLimit);

    if (isNaN(gasPriceNum) || isNaN(gasLimitNum)) {
      return { isValid: false, error: 'Invalid gas values' };
    }

    if (gasPriceNum <= 0 || gasLimitNum <= 0) {
      return { isValid: false, error: 'Gas values must be positive' };
    }

    return { isValid: true };
  }, []);

  // Validate transaction
  const validateTransaction = useCallback((to: string, amount: string, balance: string): ValidationResult => {
    const addressValidation = validateAddress(to);
    if (!addressValidation.isValid) {
      return addressValidation;
    }

    const amountValidation = validateAmount(amount, balance);
    if (!amountValidation.isValid) {
      return amountValidation;
    }

    return { isValid: true };
  }, [validateAddress, validateAmount]);

  return {
    validationErrors,
    setValidationErrors,
    validateAddress,
    validateAmount,
    validateGasFee,
    validateTransaction,
  };
}