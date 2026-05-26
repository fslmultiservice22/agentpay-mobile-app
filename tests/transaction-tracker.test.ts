import { describe, it, expect, beforeEach } from 'vitest';
import { transactionTracker } from '@/lib/transaction-tracker';

describe('Transaction Tracker Service', () => {
  beforeEach(() => {
    // Reset service before each test
  });

  it('should start tracking a transaction', () => {
    const update = transactionTracker.startTracking('txn_123456');
    expect(update).toBeDefined();
    expect(update.transactionId).toBe('txn_123456');
    expect(update.status).toBe('pending');
  });

  it('should get transaction update', () => {
    transactionTracker.startTracking('txn_test');
    const update = transactionTracker.getUpdate('txn_test');
    expect(update).toBeDefined();
    expect(update?.transactionId).toBe('txn_test');
  });

  it('should subscribe to transaction updates', () => {
    const unsubscribe = transactionTracker.subscribe(
      'txn_123456',
      (update) => {
        expect(update).toBeDefined();
        expect(update.status).toBeDefined();
      }
    );
    expect(typeof unsubscribe).toBe('function');
  });
});
