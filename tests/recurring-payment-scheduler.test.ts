import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recurringPaymentScheduler, type RecurringPayment } from '../lib/recurring-payment-scheduler';

describe('Recurring Payment Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all payments before each test
    const payments = recurringPaymentScheduler.getAllRecurringPayments();
    payments.forEach(p => recurringPaymentScheduler.deleteRecurringPayment(p.id));
  });

  describe('createRecurringPayment', () => {
    it('should create a new recurring payment', () => {
      const payment = recurringPaymentScheduler.createRecurringPayment({
        name: 'Rent Payment',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Landlord',
        amount: 1000,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        isActive: true,
      });

      expect(payment).toBeDefined();
      expect(payment.name).toBe('Rent Payment');
      expect(payment.amount).toBe(1000);
      expect(payment.executionCount).toBe(0);
      expect(payment.failureCount).toBe(0);
    });

    it('should generate unique IDs', () => {
      const payment1 = recurringPaymentScheduler.createRecurringPayment({
        name: 'Payment 1',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient 1',
        amount: 100,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        isActive: true,
      });

      const payment2 = recurringPaymentScheduler.createRecurringPayment({
        name: 'Payment 2',
        fromIban: 'DE89370400440532013000',
        toIban: 'ES9121000418450200051332',
        toName: 'Recipient 2',
        amount: 200,
        currency: 'EUR',
        frequency: 'weekly',
        startDate: Date.now(),
        isActive: true,
      });

      expect(payment1.id).not.toBe(payment2.id);
    });
  });

  describe('getRecurringPayment', () => {
    it('should retrieve a payment by ID', () => {
      const created = recurringPaymentScheduler.createRecurringPayment({
        name: 'Test Payment',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Test Recipient',
        amount: 500,
        currency: 'EUR',
        frequency: 'daily',
        startDate: Date.now(),
        isActive: true,
      });

      const retrieved = recurringPaymentScheduler.getRecurringPayment(created.id);
      expect(retrieved).toEqual(created);
    });

    it('should return undefined for non-existent payment', () => {
      const retrieved = recurringPaymentScheduler.getRecurringPayment('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllRecurringPayments', () => {
    it('should return all payments', () => {
      recurringPaymentScheduler.createRecurringPayment({
        name: 'Payment 1',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient 1',
        amount: 100,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        isActive: true,
      });

      recurringPaymentScheduler.createRecurringPayment({
        name: 'Payment 2',
        fromIban: 'DE89370400440532013000',
        toIban: 'ES9121000418450200051332',
        toName: 'Recipient 2',
        amount: 200,
        currency: 'EUR',
        frequency: 'weekly',
        startDate: Date.now(),
        isActive: true,
      });

      const all = recurringPaymentScheduler.getAllRecurringPayments();
      expect(all).toHaveLength(2);
    });
  });

  describe('updateRecurringPayment', () => {
    it('should update a payment', () => {
      const created = recurringPaymentScheduler.createRecurringPayment({
        name: 'Original Name',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient',
        amount: 100,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        isActive: true,
      });

      const updated = recurringPaymentScheduler.updateRecurringPayment(created.id, {
        name: 'Updated Name',
        amount: 200,
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.amount).toBe(200);
    });

    it('should return null for non-existent payment', () => {
      const updated = recurringPaymentScheduler.updateRecurringPayment('non-existent-id', {
        name: 'Updated',
      });

      expect(updated).toBeNull();
    });
  });

  describe('deleteRecurringPayment', () => {
    it('should delete a payment', () => {
      const created = recurringPaymentScheduler.createRecurringPayment({
        name: 'Payment to Delete',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient',
        amount: 100,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        isActive: true,
      });

      const deleted = recurringPaymentScheduler.deleteRecurringPayment(created.id);
      expect(deleted).toBe(true);

      const retrieved = recurringPaymentScheduler.getRecurringPayment(created.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('pauseRecurringPayment', () => {
    it('should pause an active payment', () => {
      const created = recurringPaymentScheduler.createRecurringPayment({
        name: 'Payment to Pause',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient',
        amount: 100,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        isActive: true,
      });

      const paused = recurringPaymentScheduler.pauseRecurringPayment(created.id);
      expect(paused?.isActive).toBe(false);
    });
  });

  describe('resumeRecurringPayment', () => {
    it('should resume a paused payment', () => {
      const created = recurringPaymentScheduler.createRecurringPayment({
        name: 'Payment to Resume',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient',
        amount: 100,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        isActive: true,
      });

      recurringPaymentScheduler.pauseRecurringPayment(created.id);
      const resumed = recurringPaymentScheduler.resumeRecurringPayment(created.id);
      expect(resumed?.isActive).toBe(true);
    });
  });

  describe('calculateNextExecutionDate', () => {
    it('should calculate next execution for daily frequency', () => {
      const payment: RecurringPayment = {
        id: 'test-1',
        name: 'Daily Payment',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient',
        amount: 100,
        currency: 'EUR',
        frequency: 'daily',
        startDate: Date.now(),
        nextExecutionDate: Date.now(),
        isActive: true,
        executionCount: 0,
        failureCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const next = recurringPaymentScheduler.calculateNextExecutionDate(payment);
      const expected = new Date(Date.now());
      expected.setDate(expected.getDate() + 1);

      expect(next).toBeGreaterThan(Date.now());
      expect(next).toBeLessThanOrEqual(expected.getTime() + 1000); // Allow 1 second margin
    });

    it('should calculate next execution for monthly frequency', () => {
      const payment: RecurringPayment = {
        id: 'test-2',
        name: 'Monthly Payment',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient',
        amount: 100,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        nextExecutionDate: Date.now(),
        isActive: true,
        executionCount: 0,
        failureCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const next = recurringPaymentScheduler.calculateNextExecutionDate(payment);
      const expected = new Date(Date.now());
      expected.setMonth(expected.getMonth() + 1);

      expect(next).toBeGreaterThan(Date.now());
    });
  });

  describe('getPaymentStatistics', () => {
    it('should return statistics for a payment', () => {
      const created = recurringPaymentScheduler.createRecurringPayment({
        name: 'Payment for Stats',
        fromIban: 'DE89370400440532013000',
        toIban: 'FR1420041010050500013M02606',
        toName: 'Recipient',
        amount: 100,
        currency: 'EUR',
        frequency: 'monthly',
        startDate: Date.now(),
        isActive: true,
      });

      const stats = recurringPaymentScheduler.getPaymentStatistics(created.id);
      expect(stats).toBeDefined();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.failedExecutions).toBe(0);
    });

    it('should throw error for non-existent payment', () => {
      expect(() => {
        recurringPaymentScheduler.getPaymentStatistics('non-existent-id');
      }).toThrow();
    });
  });

});
