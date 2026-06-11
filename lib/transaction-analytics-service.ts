/**
 * Transaction Analytics Service
 * Handles transaction export, analysis, and reporting
 */

export interface Transaction {
  id: string;
  date: number;
  type: 'send' | 'receive' | 'swap' | 'deposit' | 'withdrawal';
  from: string;
  to: string;
  amount: number;
  currency: string;
  fee?: number;
  status: 'pending' | 'completed' | 'failed';
  hash?: string;
  description?: string;
}

export interface TransactionAnalytics {
  totalTransactions: number;
  totalSpent: number;
  totalReceived: number;
  netChange: number;
  averageTransaction: number;
  largestTransaction: number;
  smallestTransaction: number;
  transactionsByType: Record<string, number>;
  transactionsByDay: Record<string, number>;
  transactionsByMonth: Record<string, number>;
  topRecipients: Array<{ address: string; count: number; total: number }>;
  topSenders: Array<{ address: string; count: number; total: number }>;
}

export interface SpendingCategory {
  name: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface TimeRange {
  startDate: number;
  endDate: number;
  label: string;
}

class TransactionAnalyticsService {
  /**
   * Analyze transactions
   */
  analyzeTransactions(transactions: Transaction[]): TransactionAnalytics {
    if (transactions.length === 0) {
      return this.getEmptyAnalytics();
    }

    const totalSpent = transactions
      .filter(t => t.type === 'send' || t.type === 'swap' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalReceived = transactions
      .filter(t => t.type === 'receive' || t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const amounts = transactions.map(t => t.amount).sort((a, b) => a - b);
    const largestTransaction = amounts[amounts.length - 1] || 0;
    const smallestTransaction = amounts[0] || 0;
    const averageTransaction = transactions.length > 0 ? amounts.reduce((a, b) => a + b, 0) / transactions.length : 0;

    // Group by type
    const transactionsByType: Record<string, number> = {};
    transactions.forEach(t => {
      transactionsByType[t.type] = (transactionsByType[t.type] || 0) + 1;
    });

    // Group by day
    const transactionsByDay: Record<string, number> = {};
    transactions.forEach(t => {
      const day = new Date(t.date).toLocaleDateString('en-US');
      transactionsByDay[day] = (transactionsByDay[day] || 0) + 1;
    });

    // Group by month
    const transactionsByMonth: Record<string, number> = {};
    transactions.forEach(t => {
      const month = new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      transactionsByMonth[month] = (transactionsByMonth[month] || 0) + 1;
    });

    // Top recipients
    const recipientMap = new Map<string, { count: number; total: number }>();
    transactions
      .filter(t => t.type === 'send' || t.type === 'withdrawal')
      .forEach(t => {
        const existing = recipientMap.get(t.to) || { count: 0, total: 0 };
        recipientMap.set(t.to, {
          count: existing.count + 1,
          total: existing.total + t.amount,
        });
      });

    const topRecipients = Array.from(recipientMap.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Top senders
    const senderMap = new Map<string, { count: number; total: number }>();
    transactions
      .filter(t => t.type === 'receive' || t.type === 'deposit')
      .forEach(t => {
        const existing = senderMap.get(t.from) || { count: 0, total: 0 };
        senderMap.set(t.from, {
          count: existing.count + 1,
          total: existing.total + t.amount,
        });
      });

    const topSenders = Array.from(senderMap.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      totalTransactions: transactions.length,
      totalSpent,
      totalReceived,
      netChange: totalReceived - totalSpent,
      averageTransaction,
      largestTransaction,
      smallestTransaction,
      transactionsByType,
      transactionsByDay,
      transactionsByMonth,
      topRecipients,
      topSenders,
    };
  }

  /**
   * Filter transactions by date range
   */
  filterByDateRange(transactions: Transaction[], startDate: number, endDate: number): Transaction[] {
    return transactions.filter(t => t.date >= startDate && t.date <= endDate);
  }

  /**
   * Filter transactions by type
   */
  filterByType(transactions: Transaction[], type: Transaction['type']): Transaction[] {
    return transactions.filter(t => t.type === type);
  }

  /**
   * Filter transactions by status
   */
  filterByStatus(transactions: Transaction[], status: Transaction['status']): Transaction[] {
    return transactions.filter(t => t.status === status);
  }

  /**
   * Get spending categories
   */
  getSpendingCategories(transactions: Transaction[]): SpendingCategory[] {
    const categories: Record<string, { amount: number; count: number }> = {};

    transactions
      .filter(t => t.type === 'send' || t.type === 'swap' || t.type === 'withdrawal')
      .forEach(t => {
        const category = t.description || 'Other';
        if (!categories[category]) {
          categories[category] = { amount: 0, count: 0 };
        }
        categories[category].amount += t.amount;
        categories[category].count += 1;
      });

    const totalSpent = Object.values(categories).reduce((sum, cat) => sum + cat.amount, 0);

    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Export transactions to CSV
   */
  exportToCSV(transactions: Transaction[]): string {
    const headers = ['Date', 'Type', 'From', 'To', 'Amount', 'Currency', 'Fee', 'Status', 'Hash', 'Description'];
    const rows = transactions.map(t => [
      new Date(t.date).toISOString(),
      t.type,
      t.from,
      t.to,
      t.amount.toString(),
      t.currency,
      (t.fee || 0).toString(),
      t.status,
      t.hash || '',
      t.description || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Export transactions to JSON
   */
  exportToJSON(transactions: Transaction[]): string {
    return JSON.stringify(transactions, null, 2);
  }

  /**
   * Generate PDF report (returns data for PDF generation)
   */
  generatePDFReport(transactions: Transaction[], analytics: TransactionAnalytics): {
    title: string;
    summary: string;
    data: any;
  } {
    const summary = `
Transaction Report
==================

Total Transactions: ${analytics.totalTransactions}
Total Spent: $${analytics.totalSpent.toFixed(2)}
Total Received: $${analytics.totalReceived.toFixed(2)}
Net Change: $${analytics.netChange.toFixed(2)}

Average Transaction: $${analytics.averageTransaction.toFixed(2)}
Largest Transaction: $${analytics.largestTransaction.toFixed(2)}
Smallest Transaction: $${analytics.smallestTransaction.toFixed(2)}

Top Recipients:
${analytics.topRecipients.map(r => `- ${r.address}: ${r.count} transactions, $${r.total.toFixed(2)}`).join('\n')}

Top Senders:
${analytics.topSenders.map(s => `- ${s.address}: ${s.count} transactions, $${s.total.toFixed(2)}`).join('\n')}
    `.trim();

    return {
      title: 'Transaction Report',
      summary,
      data: {
        transactions,
        analytics,
      },
    };
  }

  /**
   * Get time range presets
   */
  getTimeRangePresets(): Record<string, TimeRange> {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return {
      today: {
        startDate: new Date(now).setHours(0, 0, 0, 0),
        endDate: now,
        label: 'Today',
      },
      yesterday: {
        startDate: new Date(now - oneDay).setHours(0, 0, 0, 0),
        endDate: new Date(now - oneDay).setHours(23, 59, 59, 999),
        label: 'Yesterday',
      },
      last7days: {
        startDate: now - 7 * oneDay,
        endDate: now,
        label: 'Last 7 days',
      },
      last30days: {
        startDate: now - 30 * oneDay,
        endDate: now,
        label: 'Last 30 days',
      },
      last90days: {
        startDate: now - 90 * oneDay,
        endDate: now,
        label: 'Last 90 days',
      },
      lastYear: {
        startDate: now - 365 * oneDay,
        endDate: now,
        label: 'Last year',
      },
      allTime: {
        startDate: 0,
        endDate: now,
        label: 'All time',
      },
    };
  }

  /**
   * Calculate tax report data
   */
  calculateTaxReport(transactions: Transaction[]): {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    capitalGains: number;
    transactionsByMonth: Record<string, { income: number; expenses: number }>;
  } {
    const totalIncome = transactions
      .filter(t => t.type === 'receive' || t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'send' || t.type === 'withdrawal')
      .reduce((sum, t) => sum + (t.amount + (t.fee || 0)), 0);

    const transactionsByMonth: Record<string, { income: number; expenses: number }> = {};

    transactions.forEach(t => {
      const month = new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' });
      if (!transactionsByMonth[month]) {
        transactionsByMonth[month] = { income: 0, expenses: 0 };
      }

      if (t.type === 'receive' || t.type === 'deposit') {
        transactionsByMonth[month].income += t.amount;
      } else {
        transactionsByMonth[month].expenses += t.amount + (t.fee || 0);
      }
    });

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      capitalGains: 0, // Would need price data to calculate
      transactionsByMonth,
    };
  }

  /**
   * Get empty analytics object
   */
  private getEmptyAnalytics(): TransactionAnalytics {
    return {
      totalTransactions: 0,
      totalSpent: 0,
      totalReceived: 0,
      netChange: 0,
      averageTransaction: 0,
      largestTransaction: 0,
      smallestTransaction: 0,
      transactionsByType: {},
      transactionsByDay: {},
      transactionsByMonth: {},
      topRecipients: [],
      topSenders: [],
    };
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

export const transactionAnalyticsService = new TransactionAnalyticsService();
