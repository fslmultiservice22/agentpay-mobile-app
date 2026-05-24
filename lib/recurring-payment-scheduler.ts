/**
 * Recurring Payment Scheduler
 * Manages scheduled transfers to Qonto IBAN accounts
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringPayment {
  id: string;
  name: string;
  description?: string;
  fromIban: string;
  toIban: string;
  toName: string;
  amount: number;
  currency: string;
  frequency: RecurrenceFrequency;
  startDate: number; // timestamp
  endDate?: number; // timestamp
  nextExecutionDate: number; // timestamp
  lastExecutionDate?: number; // timestamp
  isActive: boolean;
  maxExecutions?: number;
  executionCount: number;
  failureCount: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PaymentExecution {
  id: string;
  paymentId: string;
  executionDate: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  transactionId?: string;
  error?: string;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface SchedulerConfig {
  maxRetries: number;
  retryDelayMs: number;
  executionTimeHour: number; // 0-23
  executionTimeMinute: number; // 0-59
  timezone: string;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  maxRetries: 3,
  retryDelayMs: 5000,
  executionTimeHour: 9,
  executionTimeMinute: 0,
  timezone: 'UTC',
};

class RecurringPaymentScheduler {
  private config: SchedulerConfig;
  private payments: Map<string, RecurringPayment> = new Map();
  private executions: Map<string, PaymentExecution[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new recurring payment
   */
  createRecurringPayment(payment: Omit<RecurringPayment, 'id' | 'executionCount' | 'failureCount' | 'createdAt' | 'updatedAt'>): RecurringPayment {
    const id = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newPayment: RecurringPayment = {
      ...payment,
      id,
      executionCount: 0,
      failureCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.payments.set(id, newPayment);
    this.schedulePayment(newPayment);

    return newPayment;
  }

  /**
   * Get a recurring payment by ID
   */
  getRecurringPayment(id: string): RecurringPayment | undefined {
    return this.payments.get(id);
  }

  /**
   * Get all recurring payments
   */
  getAllRecurringPayments(): RecurringPayment[] {
    return Array.from(this.payments.values());
  }

  /**
   * Get active recurring payments
   */
  getActiveRecurringPayments(): RecurringPayment[] {
    return Array.from(this.payments.values()).filter(p => p.isActive);
  }

  /**
   * Update a recurring payment
   */
  updateRecurringPayment(id: string, updates: Partial<RecurringPayment>): RecurringPayment | null {
    const payment = this.payments.get(id);
    if (!payment) return null;

    const updated: RecurringPayment = {
      ...payment,
      ...updates,
      id: payment.id, // Prevent ID change
      createdAt: payment.createdAt, // Prevent creation date change
      updatedAt: Date.now(),
    };

    this.payments.set(id, updated);

    // Reschedule if frequency or timing changed
    if (updates.frequency || updates.startDate || updates.nextExecutionDate) {
      this.cancelSchedule(id);
      this.schedulePayment(updated);
    }

    return updated;
  }

  /**
   * Delete a recurring payment
   */
  deleteRecurringPayment(id: string): boolean {
    this.cancelSchedule(id);
    this.payments.delete(id);
    this.executions.delete(id);
    return true;
  }

  /**
   * Pause a recurring payment
   */
  pauseRecurringPayment(id: string): RecurringPayment | null {
    const payment = this.payments.get(id);
    if (!payment) return null;

    this.cancelSchedule(id);
    return this.updateRecurringPayment(id, { isActive: false });
  }

  /**
   * Resume a recurring payment
   */
  resumeRecurringPayment(id: string): RecurringPayment | null {
    const payment = this.payments.get(id);
    if (!payment) return null;

    const updated = this.updateRecurringPayment(id, { isActive: true });
    if (updated) {
      this.schedulePayment(updated);
    }
    return updated;
  }

  /**
   * Get execution history for a payment
   */
  getExecutionHistory(paymentId: string): PaymentExecution[] {
    return this.executions.get(paymentId) || [];
  }

  /**
   * Calculate next execution date based on frequency
   */
  calculateNextExecutionDate(payment: RecurringPayment): number {
    const current = new Date(payment.nextExecutionDate);
    const next = new Date(current);

    switch (payment.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next.getTime();
  }

  /**
   * Execute a payment
   */
  async executePayment(paymentId: string): Promise<PaymentExecution> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const execution: PaymentExecution = {
      id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentId,
      executionDate: Date.now(),
      status: 'pending',
      amount: payment.amount,
      retryCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Store execution
    if (!this.executions.has(paymentId)) {
      this.executions.set(paymentId, []);
    }
    this.executions.get(paymentId)!.push(execution);

    // Try to execute with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        execution.status = 'processing';
        execution.updatedAt = Date.now();

        // Simulate payment execution
        // In production, this would call the Qonto API
        await this.simulatePaymentExecution(payment);

        execution.status = 'completed';
        execution.transactionId = `txn_${Date.now()}`;
        execution.updatedAt = Date.now();

        // Update payment
        payment.executionCount++;
        payment.lastExecutionDate = Date.now();
        payment.nextExecutionDate = this.calculateNextExecutionDate(payment);
        payment.updatedAt = Date.now();
        this.payments.set(paymentId, payment);

        // Reschedule if still active
        if (payment.isActive && (!payment.endDate || payment.nextExecutionDate < payment.endDate)) {
          this.schedulePayment(payment);
        }

        return execution;
      } catch (error) {
        lastError = error as Error;
        execution.retryCount = attempt + 1;
        execution.updatedAt = Date.now();

        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
        }
      }
    }

    // Mark as failed
    execution.status = 'failed';
    execution.error = lastError?.message;
    execution.updatedAt = Date.now();

    payment.failureCount++;
    payment.lastError = lastError?.message;
    payment.updatedAt = Date.now();
    this.payments.set(paymentId, payment);

    return execution;
  }

  /**
   * Simulate payment execution (mock)
   */
  private async simulatePaymentExecution(payment: RecurringPayment): Promise<void> {
    // Validate IBAN
    if (!this.validateIban(payment.toIban)) {
      throw new Error('Invalid IBAN format');
    }

    // Simulate API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // 95% success rate for simulation
        if (Math.random() < 0.95) {
          resolve();
        } else {
          reject(new Error('Payment processing failed'));
        }
      }, 100);
    });
  }

  /**
   * Validate IBAN format
   */
  private validateIban(iban: string): boolean {
    const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    return ibanRegex.test(iban.replace(/\s/g, ''));
  }

  /**
   * Schedule a payment for execution
   */
  private schedulePayment(payment: RecurringPayment): void {
    if (!payment.isActive) return;

    const now = Date.now();
    const nextExecution = payment.nextExecutionDate;

    // Check if payment has ended
    if (payment.endDate && nextExecution > payment.endDate) {
      return;
    }

    // Check if max executions reached
    if (payment.maxExecutions && payment.executionCount >= payment.maxExecutions) {
      return;
    }

    const delay = Math.max(0, nextExecution - now);

    const timer = setTimeout(() => {
      this.executePayment(payment.id).catch(error => {
        console.error(`Failed to execute payment ${payment.id}:`, error);
      });
    }, delay);

    this.timers.set(payment.id, timer);
  }

  /**
   * Cancel scheduled execution
   */
  private cancelSchedule(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  /**
   * Get statistics for a payment
   */
  getPaymentStatistics(paymentId: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    successRate: number;
    totalAmount: number;
    lastExecution?: PaymentExecution;
  } {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    const executions = this.executions.get(paymentId) || [];
    const successful = executions.filter(e => e.status === 'completed').length;
    const failed = executions.filter(e => e.status === 'failed').length;

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful,
      failedExecutions: failed,
      successRate: executions.length > 0 ? (successful / executions.length) * 100 : 0,
      totalAmount: successful * payment.amount,
      lastExecution: executions[executions.length - 1],
    };
  }

  /**
   * Format frequency for display
   */
  static formatFrequency(frequency: RecurrenceFrequency): string {
    const labels: Record<RecurrenceFrequency, string> = {
      daily: 'Every day',
      weekly: 'Every week',
      biweekly: 'Every 2 weeks',
      monthly: 'Every month',
      quarterly: 'Every 3 months',
      yearly: 'Every year',
    };
    return labels[frequency];
  }

  /**
   * Format date for display
   */
  static formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export const recurringPaymentScheduler = new RecurringPaymentScheduler();
