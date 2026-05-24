import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Transaction History Service
 * Manages persistent storage of transaction history
 */

export interface StoredTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  token?: string;
  tokenDecimals?: number;
  status: 'pending' | 'success' | 'failed';
  type: 'send' | 'receive' | 'swap';
  timestamp: number;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  chainId: number;
  chainName: string;
  explorerUrl: string;
  notes?: string;
}

export interface TransactionFilter {
  status?: 'pending' | 'success' | 'failed';
  type?: 'send' | 'receive' | 'swap';
  chainId?: number;
  startDate?: number;
  endDate?: number;
  searchTerm?: string;
}

const STORAGE_KEY = 'transaction_history';
const MAX_STORED_TRANSACTIONS = 500;

/**
 * Save transaction to history
 */
export async function saveTransaction(transaction: StoredTransaction): Promise<void> {
  try {
    const history = await getTransactionHistory();
    
    // Check if transaction already exists
    const existingIndex = history.findIndex(t => t.hash === transaction.hash);
    
    if (existingIndex >= 0) {
      // Update existing transaction
      history[existingIndex] = transaction;
    } else {
      // Add new transaction at the beginning
      history.unshift(transaction);
    }
    
    // Keep only the most recent transactions
    const trimmedHistory = history.slice(0, MAX_STORED_TRANSACTIONS);
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save transaction:', error);
    throw error;
  }
}

/**
 * Get all transactions from history
 */
export async function getTransactionHistory(): Promise<StoredTransaction[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to get transaction history:', error);
    return [];
  }
}

/**
 * Get transaction by hash
 */
export async function getTransactionByHash(hash: string): Promise<StoredTransaction | null> {
  try {
    const history = await getTransactionHistory();
    return history.find(t => t.hash === hash) || null;
  } catch (error) {
    console.error('Failed to get transaction:', error);
    return null;
  }
}

/**
 * Filter transactions
 */
export async function filterTransactions(filter: TransactionFilter): Promise<StoredTransaction[]> {
  try {
    let transactions = await getTransactionHistory();
    
    if (filter.status) {
      transactions = transactions.filter(t => t.status === filter.status);
    }
    
    if (filter.type) {
      transactions = transactions.filter(t => t.type === filter.type);
    }
    
    if (filter.chainId) {
      transactions = transactions.filter(t => t.chainId === filter.chainId);
    }
    
    if (filter.startDate) {
      transactions = transactions.filter(t => t.timestamp >= filter.startDate!);
    }
    
    if (filter.endDate) {
      transactions = transactions.filter(t => t.timestamp <= filter.endDate!);
    }
    
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      transactions = transactions.filter(t =>
        t.hash.toLowerCase().includes(term) ||
        t.from.toLowerCase().includes(term) ||
        t.to.toLowerCase().includes(term) ||
        t.notes?.toLowerCase().includes(term)
      );
    }
    
    return transactions;
  } catch (error) {
    console.error('Failed to filter transactions:', error);
    return [];
  }
}

/**
 * Get transactions for a specific address
 */
export async function getTransactionsForAddress(address: string): Promise<StoredTransaction[]> {
  try {
    const history = await getTransactionHistory();
    const lowerAddress = address.toLowerCase();
    return history.filter(t =>
      t.from.toLowerCase() === lowerAddress || t.to.toLowerCase() === lowerAddress
    );
  } catch (error) {
    console.error('Failed to get transactions for address:', error);
    return [];
  }
}

/**
 * Get transaction statistics
 */
export async function getTransactionStats(): Promise<{
  total: number;
  successful: number;
  failed: number;
  pending: number;
  totalVolume: string;
  averageGasPrice: string;
}> {
  try {
    const history = await getTransactionHistory();
    
    const stats = {
      total: history.length,
      successful: history.filter(t => t.status === 'success').length,
      failed: history.filter(t => t.status === 'failed').length,
      pending: history.filter(t => t.status === 'pending').length,
      totalVolume: '0',
      averageGasPrice: '0',
    };
    
    // Calculate total volume
    const totalVolume = history
      .filter(t => t.status === 'success')
      .reduce((sum, t) => sum + parseFloat(t.value), 0);
    stats.totalVolume = totalVolume.toFixed(6);
    
    // Calculate average gas price
    const gasPrices = history
      .filter(t => t.gasPrice)
      .map(t => parseFloat(t.gasPrice!));
    if (gasPrices.length > 0) {
      const avgGasPrice = gasPrices.reduce((a, b) => a + b, 0) / gasPrices.length;
      stats.averageGasPrice = avgGasPrice.toFixed(2);
    }
    
    return stats;
  } catch (error) {
    console.error('Failed to get transaction stats:', error);
    return {
      total: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      totalVolume: '0',
      averageGasPrice: '0',
    };
  }
}

/**
 * Delete transaction from history
 */
export async function deleteTransaction(hash: string): Promise<void> {
  try {
    const history = await getTransactionHistory();
    const filtered = history.filter(t => t.hash !== hash);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw error;
  }
}

/**
 * Clear all transaction history
 */
export async function clearTransactionHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear transaction history:', error);
    throw error;
  }
}

/**
 * Export transaction history as JSON
 */
export async function exportTransactionHistory(): Promise<string> {
  try {
    const history = await getTransactionHistory();
    return JSON.stringify(history, null, 2);
  } catch (error) {
    console.error('Failed to export transaction history:', error);
    throw error;
  }
}

/**
 * Import transaction history from JSON
 */
export async function importTransactionHistory(jsonData: string): Promise<void> {
  try {
    const transactions = JSON.parse(jsonData);
    
    if (!Array.isArray(transactions)) {
      throw new Error('Invalid transaction history format');
    }
    
    // Validate transactions
    transactions.forEach(t => {
      if (!t.hash || !t.from || !t.to || !t.value) {
        throw new Error('Invalid transaction data');
      }
    });
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to import transaction history:', error);
    throw error;
  }
}

/**
 * Add note to transaction
 */
export async function addTransactionNote(hash: string, note: string): Promise<void> {
  try {
    const transaction = await getTransactionByHash(hash);
    if (transaction) {
      transaction.notes = note;
      await saveTransaction(transaction);
    }
  } catch (error) {
    console.error('Failed to add transaction note:', error);
    throw error;
  }
}

/**
 * Get recent transactions (last N)
 */
export async function getRecentTransactions(limit: number = 10): Promise<StoredTransaction[]> {
  try {
    const history = await getTransactionHistory();
    return history.slice(0, limit);
  } catch (error) {
    console.error('Failed to get recent transactions:', error);
    return [];
  }
}
