/**
 * Transaction Cache Service
 * Handles local transaction storage with SQLite for offline access
 */

export interface CachedTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  data?: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  chainId: number;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  timestamp: number;
  confirmations: number;
  type: 'send' | 'receive' | 'swap' | 'approve';
  description?: string;
  metadata?: Record<string, any>;
}

export interface TransactionFilter {
  status?: string;
  type?: string;
  chainId?: number;
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}

export interface TransactionStats {
  totalTransactions: number;
  pendingTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalVolume: string;
  averageGasPrice: string;
  lastTransactionDate: number;
}

const TRANSACTIONS_CACHE_KEY = 'transaction_cache';
const MAX_CACHED_TRANSACTIONS = 1000;

class TransactionCacheService {
  private transactions: Map<string, CachedTransaction> = new Map();
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize cache
   */
  async initialize(): Promise<void> {
    try {
      await this.loadFromCache();
      this.initialized = true;
      console.log('Transaction cache initialized');
    } catch (error) {
      console.error('Failed to initialize transaction cache:', error);
    }
  }

  /**
   * Add transaction
   */
  async addTransaction(transaction: CachedTransaction): Promise<void> {
    try {
      this.transactions.set(transaction.id, transaction);
      await this.persistToCache();
    } catch (error) {
      console.error('Failed to add transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(id: string, updates: Partial<CachedTransaction>): Promise<void> {
    try {
      const transaction = this.transactions.get(id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const updated = { ...transaction, ...updates };
      this.transactions.set(id, updated);
      await this.persistToCache();
    } catch (error) {
      console.error('Failed to update transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): CachedTransaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Get transaction by hash
   */
  getTransactionByHash(hash: string): CachedTransaction | undefined {
    return Array.from(this.transactions.values()).find(t => t.hash === hash);
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): CachedTransaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transactions with filter
   */
  getTransactions(filter: TransactionFilter): CachedTransaction[] {
    let results = Array.from(this.transactions.values());

    // Apply filters
    if (filter.status) {
      results = results.filter(t => t.status === filter.status);
    }

    if (filter.type) {
      results = results.filter(t => t.type === filter.type);
    }

    if (filter.chainId) {
      results = results.filter(t => t.chainId === filter.chainId);
    }

    if (filter.startDate) {
      results = results.filter(t => t.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      results = results.filter(t => t.timestamp <= filter.endDate!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    return results.slice(offset, offset + limit);
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    try {
      this.transactions.delete(id);
      await this.persistToCache();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw error;
    }
  }

  /**
   * Clear all transactions
   */
  async clearAllTransactions(): Promise<void> {
    try {
      this.transactions.clear();
      await this.persistToCache();
    } catch (error) {
      console.error('Failed to clear transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(chainId?: number): TransactionStats {
    let transactions = Array.from(this.transactions.values());

    if (chainId) {
      transactions = transactions.filter(t => t.chainId === chainId);
    }

    const pending = transactions.filter(t => t.status === 'pending').length;
    const successful = transactions.filter(t => t.status === 'success').length;
    const failed = transactions.filter(t => t.status === 'failed').length;

    const totalVolume = transactions.reduce((sum, t) => sum + parseFloat(t.value), 0);
    const gasPrices = transactions
      .filter(t => t.gasPrice)
      .map(t => parseFloat(t.gasPrice!));
    const avgGasPrice = gasPrices.length > 0 ? gasPrices.reduce((a, b) => a + b) / gasPrices.length : 0;

    const lastTransaction = transactions.length > 0 ? Math.max(...transactions.map(t => t.timestamp)) : 0;

    return {
      totalTransactions: transactions.length,
      pendingTransactions: pending,
      successfulTransactions: successful,
      failedTransactions: failed,
      totalVolume: totalVolume.toFixed(6),
      averageGasPrice: avgGasPrice.toFixed(2),
      lastTransactionDate: lastTransaction,
    };
  }

  /**
   * Export transactions
   */
  exportTransactions(format: 'json' | 'csv' = 'json'): string {
    const transactions = this.getAllTransactions();

    if (format === 'json') {
      return JSON.stringify(transactions, null, 2);
    }

    // CSV format
    const headers = [
      'ID',
      'Hash',
      'From',
      'To',
      'Value',
      'Status',
      'Type',
      'Timestamp',
      'Gas Used',
      'Gas Price',
    ];

    const rows = transactions.map(t => [
      t.id,
      t.hash,
      t.from,
      t.to,
      t.value,
      t.status,
      t.type,
      new Date(t.timestamp).toISOString(),
      t.gasUsed || '',
      t.gasPrice || '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    return csv;
  }

  /**
   * Import transactions
   */
  async importTransactions(data: string, format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      let transactions: CachedTransaction[] = [];

      if (format === 'json') {
        transactions = JSON.parse(data);
      } else {
        // Parse CSV
        const lines = data.split('\n');
        const headers = lines[0].split(',');

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          if (values.length === headers.length) {
            const transaction: CachedTransaction = {
              id: values[0],
              hash: values[1],
              from: values[2],
              to: values[3],
              value: values[4],
              status: values[5] as any,
              type: values[6] as any,
              timestamp: new Date(values[7]).getTime(),
              gasUsed: values[8],
              gasPrice: values[9],
              chainId: 1,
              confirmations: 0,
            };

            transactions.push(transaction);
          }
        }
      }

      // Add imported transactions
      for (const tx of transactions) {
        this.transactions.set(tx.id, tx);
      }

      await this.persistToCache();
    } catch (error) {
      console.error('Failed to import transactions:', error);
      throw error;
    }
  }

  /**
   * Sync with blockchain
   */
  async syncWithBlockchain(chainId: number, getTransactionStatus: (hash: string) => Promise<any>): Promise<void> {
    try {
      const transactions = Array.from(this.transactions.values()).filter(
        t => t.chainId === chainId && t.status === 'pending'
      );

      for (const tx of transactions) {
        try {
          const status = await getTransactionStatus(tx.hash);
          if (status) {
            await this.updateTransaction(tx.id, {
              status: status.status,
              confirmations: status.confirmations,
              blockNumber: status.blockNumber,
              gasUsed: status.gasUsed,
            });
          }
        } catch (error) {
          console.error(`Failed to sync transaction ${tx.hash}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to sync with blockchain:', error);
    }
  }

  /**
   * Persist to cache
   */
  private async persistToCache(): Promise<void> {
    try {
      const transactions = Array.from(this.transactions.values());
      
      // Keep only last MAX_CACHED_TRANSACTIONS
      if (transactions.length > MAX_CACHED_TRANSACTIONS) {
        const sorted = transactions.sort((a, b) => b.timestamp - a.timestamp);
        const limited = sorted.slice(0, MAX_CACHED_TRANSACTIONS);
        
        this.transactions.clear();
        limited.forEach(t => this.transactions.set(t.id, t));
      }

      // In production, use SQLite
      globalThis.transactionCacheData = Array.from(this.transactions.values());
    } catch (error) {
      console.error('Failed to persist to cache:', error);
    }
  }

  /**
   * Load from cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      const data = (globalThis.transactionCacheData as CachedTransaction[]) || [];
      data.forEach(tx => {
        this.transactions.set(tx.id, tx);
      });
    } catch (error) {
      console.error('Failed to load from cache:', error);
    }
  }
}

export const transactionCacheService = new TransactionCacheService();
