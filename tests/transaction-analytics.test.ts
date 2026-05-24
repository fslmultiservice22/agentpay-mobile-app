import { describe, it, expect } from 'vitest';
import { transactionAnalyticsService, type Transaction } from '../lib/transaction-analytics-service';

const mockTransactions: Transaction[] = [
  {
    id: 'txn1',
    date: Date.now() - 5 * 24 * 60 * 60 * 1000,
    type: 'send',
    from: '0x1234',
    to: '0x5678',
    amount: 100,
    currency: 'USD',
    fee: 5,
    status: 'completed',
    description: 'Payment',
  },
  {
    id: 'txn2',
    date: Date.now() - 3 * 24 * 60 * 60 * 1000,
    type: 'receive',
    from: '0x9999',
    to: '0x1234',
    amount: 500,
    currency: 'USD',
    status: 'completed',
  },
  {
    id: 'txn3',
    date: Date.now() - 1 * 24 * 60 * 60 * 1000,
    type: 'swap',
    from: '0x1234',
    to: '0x5678',
    amount: 250,
    currency: 'USD',
    fee: 10,
    status: 'completed',
    description: 'Swap ETH to USDC',
  },
  {
    id: 'txn4',
    date: Date.now(),
    type: 'receive',
    from: '0x9999',
    to: '0x1234',
    amount: 1000,
    currency: 'USD',
    status: 'completed',
  },
];

describe('Transaction Analytics Service', () => {
  describe('analyzeTransactions', () => {
    it('should analyze transactions correctly', () => {
      const analytics = transactionAnalyticsService.analyzeTransactions(mockTransactions);

      expect(analytics.totalTransactions).toBe(4);
      expect(analytics.totalSpent).toBe(350); // 100 + 250
      expect(analytics.totalReceived).toBe(1500); // 500 + 1000
      expect(analytics.netChange).toBe(1150); // 1500 - 350
    });

    it('should calculate average transaction', () => {
      const analytics = transactionAnalyticsService.analyzeTransactions(mockTransactions);

      const expectedAverage = (100 + 500 + 250 + 1000) / 4;
      expect(analytics.averageTransaction).toBeCloseTo(expectedAverage, 2);
    });

    it('should find largest and smallest transactions', () => {
      const analytics = transactionAnalyticsService.analyzeTransactions(mockTransactions);

      expect(analytics.largestTransaction).toBe(1000);
      expect(analytics.smallestTransaction).toBe(100);
    });

    it('should group transactions by type', () => {
      const analytics = transactionAnalyticsService.analyzeTransactions(mockTransactions);

      expect(analytics.transactionsByType.send).toBe(1);
      expect(analytics.transactionsByType.receive).toBe(2);
      expect(analytics.transactionsByType.swap).toBe(1);
    });

    it('should identify top recipients', () => {
      const analytics = transactionAnalyticsService.analyzeTransactions(mockTransactions);

      expect(analytics.topRecipients).toHaveLength(1);
      expect(analytics.topRecipients[0].address).toBe('0x5678');
      expect(analytics.topRecipients[0].count).toBe(1);
      expect(analytics.topRecipients[0].total).toBe(100);
    });

    it('should identify top senders', () => {
      const analytics = transactionAnalyticsService.analyzeTransactions(mockTransactions);

      expect(analytics.topSenders).toHaveLength(1);
      expect(analytics.topSenders[0].address).toBe('0x9999');
      expect(analytics.topSenders[0].count).toBe(2);
      expect(analytics.topSenders[0].total).toBe(1500);
    });

    it('should handle empty transactions', () => {
      const analytics = transactionAnalyticsService.analyzeTransactions([]);

      expect(analytics.totalTransactions).toBe(0);
      expect(analytics.totalSpent).toBe(0);
      expect(analytics.totalReceived).toBe(0);
    });
  });

  describe('filterByDateRange', () => {
    it('should filter transactions by date range', () => {
      const now = Date.now();
      const startDate = now - 4 * 24 * 60 * 60 * 1000;
      const endDate = now - 2 * 24 * 60 * 60 * 1000;

      const filtered = transactionAnalyticsService.filterByDateRange(mockTransactions, startDate, endDate);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('txn2');
    });
  });

  describe('filterByType', () => {
    it('should filter transactions by type', () => {
      const filtered = transactionAnalyticsService.filterByType(mockTransactions, 'receive');

      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => t.type === 'receive')).toBe(true);
    });
  });

  describe('filterByStatus', () => {
    it('should filter transactions by status', () => {
      const filtered = transactionAnalyticsService.filterByStatus(mockTransactions, 'completed');

      expect(filtered).toHaveLength(4);
      expect(filtered.every(t => t.status === 'completed')).toBe(true);
    });
  });

  describe('getSpendingCategories', () => {
    it('should categorize spending', () => {
      const categories = transactionAnalyticsService.getSpendingCategories(mockTransactions);

      expect(categories).toHaveLength(2);
      expect(categories[0].name).toBe('Swap ETH to USDC');
      expect(categories[0].amount).toBe(250);
      expect(categories[1].name).toBe('Payment');
      expect(categories[1].amount).toBe(100);
    });

    it('should calculate spending percentages', () => {
      const categories = transactionAnalyticsService.getSpendingCategories(mockTransactions);

      const totalSpent = 350;
      expect(categories[0].percentage).toBeCloseTo((250 / totalSpent) * 100, 2);
      expect(categories[1].percentage).toBeCloseTo((100 / totalSpent) * 100, 2);
    });
  });

  describe('exportToCSV', () => {
    it('should export transactions to CSV', () => {
      const csv = transactionAnalyticsService.exportToCSV(mockTransactions);

      expect(csv).toContain('Date,Type,From,To,Amount,Currency,Fee,Status,Hash,Description');
      expect(csv).toContain('send');
      expect(csv).toContain('receive');
    });

    it('should include all transaction data', () => {
      const csv = transactionAnalyticsService.exportToCSV([mockTransactions[0]]);

      expect(csv).toContain('0x1234');
      expect(csv).toContain('0x5678');
      expect(csv).toContain('100');
      expect(csv).toContain('USD');
    });
  });

  describe('exportToJSON', () => {
    it('should export transactions to JSON', () => {
      const json = transactionAnalyticsService.exportToJSON(mockTransactions);
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(4);
      expect(parsed[0].id).toBe('txn1');
    });
  });

  describe('generatePDFReport', () => {
    it('should generate PDF report data', () => {
      const analytics = transactionAnalyticsService.analyzeTransactions(mockTransactions);
      const report = transactionAnalyticsService.generatePDFReport(mockTransactions, analytics);

      expect(report.title).toBe('Transaction Report');
      expect(report.summary).toContain('Total Transactions: 4');
      expect(report.summary).toContain('Total Spent');
      expect(report.summary).toContain('Total Received');
    });
  });

  describe('getTimeRangePresets', () => {
    it('should return time range presets', () => {
      const presets = transactionAnalyticsService.getTimeRangePresets();

      expect(presets.today).toBeDefined();
      expect(presets.last7days).toBeDefined();
      expect(presets.last30days).toBeDefined();
      expect(presets.last90days).toBeDefined();
      expect(presets.lastYear).toBeDefined();
      expect(presets.allTime).toBeDefined();
    });

    it('should have correct labels', () => {
      const presets = transactionAnalyticsService.getTimeRangePresets();

      expect(presets.today.label).toBe('Today');
      expect(presets.last7days.label).toBe('Last 7 days');
      expect(presets.last30days.label).toBe('Last 30 days');
    });
  });

  describe('calculateTaxReport', () => {
    it('should calculate tax report', () => {
      const taxReport = transactionAnalyticsService.calculateTaxReport(mockTransactions);

      expect(taxReport.totalIncome).toBe(1500);
      expect(taxReport.totalExpenses).toBe(105); // 100 + 5 + 250 + 10
      expect(taxReport.netProfit).toBe(1395);
    });

    it('should group by month', () => {
      const taxReport = transactionAnalyticsService.calculateTaxReport(mockTransactions);

      expect(Object.keys(taxReport.transactionsByMonth).length).toBeGreaterThan(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      const formatted = transactionAnalyticsService.formatCurrency(1234.56);

      expect(formatted).toContain('$');
      expect(formatted).toContain('1,234');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const formatted = transactionAnalyticsService.formatDate(timestamp);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });
  });
});
