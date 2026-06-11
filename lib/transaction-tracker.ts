/**
 * Transaction Tracker Service
 * Real-time tracking of transaction status and updates
 */

export interface TransactionEvent {
  id: string;
  transactionId: string;
  timestamp: number;
  status: 'initiated' | 'processing' | 'confirmed' | 'completed' | 'failed';
  message: string;
  details?: Record<string, any>;
}

export interface TransactionUpdate {
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining: number; // in seconds
  events: TransactionEvent[];
}

type TransactionListener = (update: TransactionUpdate) => void;

class TransactionTracker {
  private listeners: Map<string, Set<TransactionListener>> = new Map();
  private updates: Map<string, TransactionUpdate> = new Map();
  private eventHistory: Map<string, TransactionEvent[]> = new Map();
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to transaction updates
   */
  subscribe(transactionId: string, listener: TransactionListener): () => void {
    if (!this.listeners.has(transactionId)) {
      this.listeners.set(transactionId, new Set());
    }

    this.listeners.get(transactionId)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(transactionId)?.delete(listener);
    };
  }

  /**
   * Start tracking a transaction
   */
  startTracking(transactionId: string) {
    const update: TransactionUpdate = {
      transactionId,
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing...',
      estimatedTimeRemaining: 30,
      events: [],
    };

    this.updates.set(transactionId, update);
    this.eventHistory.set(transactionId, []);

    // Add initial event
    this.addEvent(transactionId, 'initiated', 'Transaction initiated');

    // Simulate transaction progress
    this.simulateProgress(transactionId);

    return update;
  }

  /**
   * Simulate transaction progress
   */
  private simulateProgress(transactionId: string) {
    const steps = [
      { progress: 10, step: 'Validating transaction...', delay: 2000 },
      { progress: 30, step: 'Connecting to bank...', delay: 3000 },
      { progress: 50, step: 'Processing payment...', delay: 4000 },
      { progress: 70, step: 'Confirming transfer...', delay: 3000 },
      { progress: 90, step: 'Finalizing...', delay: 2000 },
      { progress: 100, step: 'Completed!', delay: 1000 },
    ];

    let stepIndex = 0;

    const interval = setInterval(() => {
      if (stepIndex >= steps.length) {
        clearInterval(interval);
        this.simulationIntervals.delete(transactionId);

        // Mark as completed
        const update = this.updates.get(transactionId);
        if (update) {
          update.status = 'completed';
          update.currentStep = 'Transaction completed successfully';
          this.addEvent(transactionId, 'completed', 'Transaction completed');
          this.notifyListeners(transactionId, update);
        }
        return;
      }

      const { progress, step } = steps[stepIndex];
      const update = this.updates.get(transactionId);

      if (update) {
        update.progress = progress;
        update.currentStep = step;
        update.status = progress === 100 ? 'completed' : 'processing';
        update.estimatedTimeRemaining = Math.max(0, 30 - Math.floor(progress / 3.33));

        // Add event for major steps
        if (progress % 30 === 0 && progress > 0) {
          this.addEvent(transactionId, 'processing', step);
        }

        this.notifyListeners(transactionId, update);
      }

      stepIndex++;
    }, steps[stepIndex].delay);

    this.simulationIntervals.set(transactionId, interval);
  }

  /**
   * Add event to transaction history
   */
  private addEvent(
    transactionId: string,
    status: TransactionEvent['status'],
    message: string,
    details?: Record<string, any>
  ) {
    const event: TransactionEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId,
      timestamp: Date.now(),
      status,
      message,
      details,
    };

    if (!this.eventHistory.has(transactionId)) {
      this.eventHistory.set(transactionId, []);
    }

    this.eventHistory.get(transactionId)!.push(event);

    // Update events in the main update object
    const update = this.updates.get(transactionId);
    if (update) {
      update.events.push(event);
    }
  }

  /**
   * Notify all listeners of an update
   */
  private notifyListeners(transactionId: string, update: TransactionUpdate) {
    const listeners = this.listeners.get(transactionId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(update);
        } catch (error) {
          console.error('Error in transaction listener:', error);
        }
      });
    }
  }

  /**
   * Get current transaction update
   */
  getUpdate(transactionId: string): TransactionUpdate | null {
    return this.updates.get(transactionId) || null;
  }

  /**
   * Get transaction events
   */
  getEvents(transactionId: string): TransactionEvent[] {
    return this.eventHistory.get(transactionId) || [];
  }

  /**
   * Mark transaction as failed
   */
  markFailed(transactionId: string, errorMessage: string) {
    const update = this.updates.get(transactionId);
    if (update) {
      update.status = 'failed';
      update.currentStep = `Failed: ${errorMessage}`;
      this.addEvent(transactionId, 'failed', errorMessage);
      this.notifyListeners(transactionId, update);
    }

    // Clear simulation interval
    const interval = this.simulationIntervals.get(transactionId);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(transactionId);
    }
  }

  /**
   * Stop tracking a transaction
   */
  stopTracking(transactionId: string) {
    const interval = this.simulationIntervals.get(transactionId);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(transactionId);
    }
  }

  /**
   * Get all active transactions
   */
  getActiveTransactions(): TransactionUpdate[] {
    return Array.from(this.updates.values()).filter(
      update => update.status === 'pending' || update.status === 'processing'
    );
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(limit: number = 20): TransactionUpdate[] {
    return Array.from(this.updates.values())
      .sort((a, b) => {
        const aLastEvent = a.events[a.events.length - 1];
        const bLastEvent = b.events[b.events.length - 1];
        return (bLastEvent?.timestamp || 0) - (aLastEvent?.timestamp || 0);
      })
      .slice(0, limit);
  }

  /**
   * Clear old transactions (older than 24 hours)
   */
  clearOldTransactions() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const [transactionId, update] of this.updates.entries()) {
      const lastEvent = update.events[update.events.length - 1];
      if (lastEvent && lastEvent.timestamp < oneDayAgo) {
        this.updates.delete(transactionId);
        this.eventHistory.delete(transactionId);
        this.listeners.delete(transactionId);
      }
    }
  }
}

// Export singleton instance
export const transactionTracker = new TransactionTracker();
