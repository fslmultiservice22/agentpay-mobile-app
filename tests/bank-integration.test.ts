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
    // `initiateTransfer` kicks off `processTransfer` without awaiting it, so the
    // status may already have moved past 'pending' by the time we assert.
    expect(['pending', 'processing', 'completed', 'failed']).toContain(result.status);
  });

  it('should get transfer status for a known transfer', async () => {
    const accounts = bankIntegration.getAccounts();
    const transfer = await bankIntegration.initiateTransfer(
      500,
      accounts[0]?.id || 'acc_test',
      'acc_recipient',
      'EUR',
      'stripe'
    );

    const status = bankIntegration.getTransferStatus(transfer.id);
    expect(status).not.toBeNull();
    expect(['pending', 'processing', 'completed', 'failed']).toContain(
      status!.status
    );
  });

  it('should return null for an unknown transfer', () => {
    expect(bankIntegration.getTransferStatus('txn_does_not_exist')).toBeNull();
  });

  it('should cancel transfer', async () => {
    const result = await bankIntegration.cancelTransfer('txn_123456');
    expect(typeof result).toBe('boolean');
  });
});
