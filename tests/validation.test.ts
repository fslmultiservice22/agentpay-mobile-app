import { describe, it, expect } from 'vitest';

function validateAddress(address: string) {
  if (!address) {
    return { isValid: false, error: 'Address is required' };
  }
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethereumAddressRegex.test(address)) {
    return { isValid: false, error: 'Invalid Ethereum address format' };
  }
  return { isValid: true };
}

function validateAmount(amount: string, balance: string) {
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
}

describe('Validation Tests', () => {
  it('should validate correct Ethereum address', () => {
    const result = validateAddress('0x1234567890123456789012345678901234567890');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid Ethereum address', () => {
    const result = validateAddress('0xinvalid');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid Ethereum address format');
  });

  it('should reject empty address', () => {
    const result = validateAddress('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Address is required');
  });

  it('should validate positive amount within balance', () => {
    const result = validateAmount('1.5', '2.5');
    expect(result.isValid).toBe(true);
  });

  it('should reject amount exceeding balance', () => {
    const result = validateAmount('3.0', '2.5');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Insufficient balance');
  });

  it('should reject zero amount', () => {
    const result = validateAmount('0', '2.5');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Amount must be a positive number');
  });

  it('should reject negative amount', () => {
    const result = validateAmount('-1.0', '2.5');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Amount must be a positive number');
  });

  it('should reject empty amount', () => {
    const result = validateAmount('', '2.5');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Amount is required');
  });
});
