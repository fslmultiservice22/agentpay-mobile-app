/**
 * Tax Report Generator Service
 * Generates tax reports with capital gains/losses calculations
 */

export interface TaxableTransaction {
  id: string;
  date: number;
  type: 'buy' | 'sell' | 'transfer' | 'reward' | 'airdrop';
  symbol: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  feeUsd: number;
  costBasis: number;
}

export interface CapitalGain {
  transactionId: string;
  symbol: string;
  quantity: number;
  costBasis: number;
  salePrice: number;
  gainLoss: number;
  gainLossPercent: number;
  holdingPeriod: 'short' | 'long'; // < 1 year or >= 1 year
  date: number;
}

export interface TaxReport {
  id: string;
  year: number;
  totalIncome: number;
  totalCapitalGains: number;
  shortTermGains: number;
  longTermGains: number;
  totalFees: number;
  netIncome: number;
  estimatedTaxes: number;
  transactions: TaxableTransaction[];
  capitalGains: CapitalGain[];
  byMonth: Record<string, { income: number; gains: number; fees: number }>;
  bySymbol: Record<string, { income: number; gains: number; quantity: number }>;
}

class TaxReportService {
  private transactions: Map<string, TaxableTransaction> = new Map();
  private costBasis: Map<string, Array<{ quantity: number; costPerUnit: number }>> = new Map();

  /**
   * Add transaction for tax tracking
   */
  addTransaction(transaction: TaxableTransaction): void {
    this.transactions.set(transaction.id, transaction);

    // Track cost basis for FIFO calculation
    if (transaction.type === 'buy' || transaction.type === 'reward' || transaction.type === 'airdrop') {
      if (!this.costBasis.has(transaction.symbol)) {
        this.costBasis.set(transaction.symbol, []);
      }

      this.costBasis.get(transaction.symbol)?.push({
        quantity: transaction.quantity,
        costPerUnit: transaction.pricePerUnit,
      });
    }
  }

  /**
   * Calculate capital gains using FIFO method
   */
  calculateCapitalGains(symbol: string, sellQuantity: number, salePrice: number, saleDate: number): CapitalGain[] {
    const gains: CapitalGain[] = [];
    const basis = this.costBasis.get(symbol) || [];
    let remainingQuantity = sellQuantity;
    let basisIndex = 0;

    while (remainingQuantity > 0 && basisIndex < basis.length) {
      const basisLot = basis[basisIndex];
      const quantityFromLot = Math.min(remainingQuantity, basisLot.quantity);

      const costBasis = quantityFromLot * basisLot.costPerUnit;
      const saleValue = quantityFromLot * salePrice;
      const gainLoss = saleValue - costBasis;
      const gainLossPercent = (gainLoss / costBasis) * 100;

      // Find original purchase date
      const purchaseTransaction = Array.from(this.transactions.values()).find(
        t => t.symbol === symbol && (t.type === 'buy' || t.type === 'reward') && t.pricePerUnit === basisLot.costPerUnit
      );

      const holdingPeriod = saleDate - (purchaseTransaction?.date || saleDate) >= 365 * 24 * 60 * 60 * 1000 ? 'long' : 'short';

      gains.push({
        transactionId: `gain_${Date.now()}_${basisIndex}`,
        symbol,
        quantity: quantityFromLot,
        costBasis,
        salePrice,
        gainLoss,
        gainLossPercent: parseFloat(gainLossPercent.toFixed(2)),
        holdingPeriod,
        date: saleDate,
      });

      basisLot.quantity -= quantityFromLot;
      if (basisLot.quantity === 0) {
        basisIndex++;
      }

      remainingQuantity -= quantityFromLot;
    }

    return gains;
  }

  /**
   * Generate tax report for year
   */
  generateTaxReport(year: number): TaxReport {
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();

    const yearTransactions = Array.from(this.transactions.values()).filter(
      t => t.date >= yearStart && t.date <= yearEnd
    );

    let totalIncome = 0;
    let totalCapitalGains = 0;
    let shortTermGains = 0;
    let longTermGains = 0;
    let totalFees = 0;

    const byMonth: Record<string, { income: number; gains: number; fees: number }> = {};
    const bySymbol: Record<string, { income: number; gains: number; quantity: number }> = {};
    const capitalGains: CapitalGain[] = [];

    yearTransactions.forEach(tx => {
      const monthKey = new Date(tx.date).toISOString().substring(0, 7);

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = { income: 0, gains: 0, fees: 0 };
      }

      if (!bySymbol[tx.symbol]) {
        bySymbol[tx.symbol] = { income: 0, gains: 0, quantity: 0 };
      }

      // Income from rewards/airdrops
      if (tx.type === 'reward' || tx.type === 'airdrop') {
        totalIncome += tx.totalValue;
        byMonth[monthKey].income += tx.totalValue;
        bySymbol[tx.symbol].income += tx.totalValue;
      }

      // Track fees
      totalFees += tx.feeUsd;
      byMonth[monthKey].fees += tx.feeUsd;

      // Track quantity
      if (tx.type === 'buy' || tx.type === 'reward' || tx.type === 'airdrop') {
        bySymbol[tx.symbol].quantity += tx.quantity;
      } else if (tx.type === 'sell') {
        bySymbol[tx.symbol].quantity -= tx.quantity;

        // Calculate gains for this sale
        const gains = this.calculateCapitalGains(tx.symbol, tx.quantity, tx.pricePerUnit, tx.date);
        gains.forEach(gain => {
          capitalGains.push(gain);
          totalCapitalGains += gain.gainLoss;

          if (gain.holdingPeriod === 'short') {
            shortTermGains += gain.gainLoss;
          } else {
            longTermGains += gain.gainLoss;
          }

          byMonth[monthKey].gains += gain.gainLoss;
          bySymbol[tx.symbol].gains += gain.gainLoss;
        });
      }
    });

    const netIncome = totalIncome + totalCapitalGains - totalFees;
    const estimatedTaxes = netIncome * 0.3; // Simplified 30% tax rate

    return {
      id: `tax_${year}_${Date.now()}`,
      year,
      totalIncome,
      totalCapitalGains,
      shortTermGains,
      longTermGains,
      totalFees,
      netIncome,
      estimatedTaxes,
      transactions: yearTransactions,
      capitalGains,
      byMonth,
      bySymbol,
    };
  }

  /**
   * Export tax report to CSV
   */
  exportToCSV(report: TaxReport): string {
    const headers = [
      'Date',
      'Type',
      'Symbol',
      'Quantity',
      'Price/Unit',
      'Total Value',
      'Fees',
      'Cost Basis',
    ];

    const rows = report.transactions.map(tx => [
      new Date(tx.date).toISOString().split('T')[0],
      tx.type.toUpperCase(),
      tx.symbol,
      tx.quantity.toString(),
      tx.pricePerUnit.toFixed(2),
      tx.totalValue.toFixed(2),
      tx.feeUsd.toFixed(2),
      tx.costBasis.toFixed(2),
    ]);

    const summary = [
      ['', '', '', '', '', '', '', ''],
      ['SUMMARY', '', '', '', '', '', '', ''],
      ['Total Income', '', '', '', '', report.totalIncome.toFixed(2), '', ''],
      ['Capital Gains', '', '', '', '', report.totalCapitalGains.toFixed(2), '', ''],
      ['Short-Term Gains', '', '', '', '', report.shortTermGains.toFixed(2), '', ''],
      ['Long-Term Gains', '', '', '', '', report.longTermGains.toFixed(2), '', ''],
      ['Total Fees', '', '', '', '', report.totalFees.toFixed(2), '', ''],
      ['Net Income', '', '', '', '', report.netIncome.toFixed(2), '', ''],
      ['Estimated Taxes (30%)', '', '', '', '', report.estimatedTaxes.toFixed(2), '', ''],
    ];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      ...summary.map(row => row.join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Export to PDF-ready format
   */
  exportToPDFData(report: TaxReport): {
    title: string;
    summary: string;
    details: string;
  } {
    const summary = `
TAX REPORT - ${report.year}
============================

INCOME SUMMARY:
  Total Income (Rewards/Airdrops): $${report.totalIncome.toFixed(2)}
  Capital Gains: $${report.totalCapitalGains.toFixed(2)}
    - Short-Term Gains: $${report.shortTermGains.toFixed(2)}
    - Long-Term Gains: $${report.longTermGains.toFixed(2)}
  Total Fees: $${report.totalFees.toFixed(2)}
  
NET INCOME: $${report.netIncome.toFixed(2)}
ESTIMATED TAXES (30%): $${report.estimatedTaxes.toFixed(2)}

BREAKDOWN BY SYMBOL:
${Object.entries(report.bySymbol)
  .map(
    ([symbol, data]) =>
      `  ${symbol}: Income $${data.income.toFixed(2)}, Gains $${data.gains.toFixed(2)}, Qty ${data.quantity}`
  )
  .join('\n')}

BREAKDOWN BY MONTH:
${Object.entries(report.byMonth)
  .map(
    ([month, data]) =>
      `  ${month}: Income $${data.income.toFixed(2)}, Gains $${data.gains.toFixed(2)}, Fees $${data.fees.toFixed(2)}`
  )
  .join('\n')}
    `.trim();

    const details = `
CAPITAL GAINS DETAILS:
${report.capitalGains
  .map(
    (gain, i) =>
      `${i + 1}. ${gain.symbol}
   Quantity: ${gain.quantity}
   Cost Basis: $${gain.costBasis.toFixed(2)}
   Sale Price: $${gain.salePrice.toFixed(2)}
   Gain/Loss: $${gain.gainLoss.toFixed(2)} (${gain.gainLossPercent.toFixed(2)}%)
   Holding Period: ${gain.holdingPeriod === 'long' ? 'Long-term (>1 year)' : 'Short-term (<1 year)'}
   Date: ${new Date(gain.date).toISOString().split('T')[0]}`
  )
  .join('\n\n')}
    `.trim();

    return {
      title: `Tax Report - ${report.year}`,
      summary,
      details,
    };
  }
}

export const taxReportService = new TaxReportService();
