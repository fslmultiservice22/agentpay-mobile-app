import { describe, it, expect, beforeEach } from 'vitest';
import { bankIntegration } from '@/lib/bank-integration';

describe('Bank Integration Service', () => {
  beforeEach(() => {
    // Reset service before each test
  });



  it('should validate IBAN', () => {
    const validIBAN = 'IT60X0542811101000000123456';
    const isValid = bankIntegration.validateIban(validIBAN);
    expect(isValid).toBe(true);
  });

  it('should reject invalid IBAN', () => {
    const invalidIBAN = 'INVALID123';
    const isValid = bankIntegration.validateIban(invalidIBAN);
    expect(isValid).toBe(false);
  });

  it('should get accounts', () => {
    const accounts = bankIntegration.getAccounts();
    expect(Array.isArray(accounts)).toBe(true);
    expect(accounts.length).toBeGreaterThan(0);
  });

  it('should get transfer quote', async () => {
    const quote = await bankIntegration.getTransferQuote(1000, 'EUR', 'EUR', 'stripe');
    expect(quote).toBeDefined();
    expect(quote.fee).toBeGreaterThanOrEqual(0);
    expect(quote.total).toBeGreaterThan(0);
  });

  it('should initiate transfer', async () => {
    const accounts = bankIntegration.getAccounts();
    const result = await bankIntegration.initiateTransfer(
      1000,
      accounts[0]?.id || 'acc_test',
      'acc_recipient',
      'EUR',
      'stripe'
    );

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.status).toBe('pending');
  });

  it('should get transfer status', async () => {
    const status = await bankIntegration.getTransferStatus(
      'txn_123456'
    );
    expect(status).toBeDefined();
    expect(['pending', 'processing', 'completed', 'failed']).toContain(
      status.status
    );
  });

  it('should cancel transfer', async () => {
    const result = await bankIntegration.cancelTransfer('txn_123456');
    expect(typeof result).toBe('boolean');
  });
});
