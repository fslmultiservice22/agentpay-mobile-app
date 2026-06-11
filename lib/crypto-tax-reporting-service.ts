/**
 * Crypto Tax Reporting Integration Service
 * TaxBit, CoinTracker integration for automated tax reporting
 */

export interface TaxableEvent {
  id: string;
  type: 'buy' | 'sell' | 'transfer' | 'income' | 'loss' | 'fee' | 'staking' | 'swap';
  date: number;
  asset: string;
  quantity: number;
  price: number;
  totalValue: number;
  costBasis?: number;
  gainLoss?: number;
  description: string;
}

export interface CapitalGain {
  id: string;
  asset: string;
  quantity: number;
  purchaseDate: number;
  saleDate: number;
  costBasis: number;
  salePrice: number;
  gainLoss: number;
  type: 'short-term' | 'long-term';
  holdingPeriod: number; // days
}

export interface TaxReport {
  userId: string;
  year: number;
  startDate: number;
  endDate: number;
  totalIncome: number;
  totalCapitalGains: number;
  shortTermGains: number;
  longTermGains: number;
  totalLosses: number;
  netGainLoss: number;
  taxableEvents: TaxableEvent[];
  capitalGains: CapitalGain[];
  status: 'draft' | 'ready' | 'submitted' | 'filed';
}

export interface TaxSoftwareExport {
  format: 'turbotax' | 'hrblock' | 'taxact' | 'csv' | 'json';
  data: Record<string, any>;
  filename: string;
}

export interface TaxOptimization {
  strategy: string;
  estimatedSavings: number;
  implementation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TaxBracket {
  year: number;
  income: number;
  bracket: string;
  rate: number;
  estimatedTax: number;
}

class CryptoTaxReportingService {
  private taxableEvents: Map<string, TaxableEvent[]> = new Map();
  private taxReports: Map<string, TaxReport[]> = new Map();
  private costBasisMethods: Map<string, 'fifo' | 'lifo' | 'average'> = new Map();

  /**
   * Add taxable event
   */
  addTaxableEvent(userId: string, event: Omit<TaxableEvent, 'id'>): TaxableEvent {
    const taxEvent: TaxableEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.taxableEvents.has(userId)) {
      this.taxableEvents.set(userId, []);
    }

    this.taxableEvents.get(userId)!.push(taxEvent);

    return taxEvent;
  }

  /**
   * Get taxable events
   */
  getTaxableEvents(userId: string, year?: number): TaxableEvent[] {
    let events = this.taxableEvents.get(userId) || [];

    if (year) {
      const startDate = new Date(year, 0, 1).getTime();
      const endDate = new Date(year, 11, 31).getTime();
      events = events.filter(e => e.date >= startDate && e.date <= endDate);
    }

    return events.sort((a, b) => a.date - b.date);
  }

  /**
   * Calculate capital gains
   */
  calculateCapitalGains(userId: string, year: number): CapitalGain[] {
    const events = this.getTaxableEvents(userId, year);
    const gains: CapitalGain[] = [];
    const holdings: Map<string, { quantity: number; costBasis: number; purchaseDate: number }[]> = new Map();

    const method = this.costBasisMethods.get(userId) || 'fifo';

    for (const event of events) {
      if (event.type === 'buy') {
        if (!holdings.has(event.asset)) {
          holdings.set(event.asset, []);
        }

        holdings.get(event.asset)!.push({
          quantity: event.quantity,
          costBasis: event.price,
          purchaseDate: event.date,
        });
      } else if (event.type === 'sell') {
        const assetHoldings = holdings.get(event.asset) || [];

        let remainingQuantity = event.quantity;

        while (remainingQuantity > 0 && assetHoldings.length > 0) {
          let holding;

          if (method === 'fifo') {
            holding = assetHoldings.shift()!;
          } else if (method === 'lifo') {
            holding = assetHoldings.pop()!;
          } else {
            // average cost
            const totalCost = assetHoldings.reduce((sum, h) => sum + h.costBasis * h.quantity, 0);
            const totalQuantity = assetHoldings.reduce((sum, h) => sum + h.quantity, 0);
            const avgCost = totalCost / totalQuantity;
            holding = { quantity: totalQuantity, costBasis: avgCost, purchaseDate: assetHoldings[0].purchaseDate };
            assetHoldings.length = 0;
          }

          const quantityToSell = Math.min(remainingQuantity, holding.quantity);
          const costBasis = holding.costBasis * quantityToSell;
          const salePrice = event.price * quantityToSell;
          const gainLoss = salePrice - costBasis;
          const holdingPeriod = Math.floor((event.date - holding.purchaseDate) / (24 * 60 * 60 * 1000));
          const type = holdingPeriod > 365 ? 'long-term' : 'short-term';

          gains.push({
            id: `gain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            asset: event.asset,
            quantity: quantityToSell,
            purchaseDate: holding.purchaseDate,
            saleDate: event.date,
            costBasis,
            salePrice,
            gainLoss,
            type,
            holdingPeriod,
          });

          remainingQuantity -= quantityToSell;
          holding.quantity -= quantityToSell;

          if (holding.quantity > 0) {
            assetHoldings.unshift(holding);
          }
        }

        holdings.set(event.asset, assetHoldings);
      }
    }

    return gains;
  }

  /**
   * Generate tax report
   */
  generateTaxReport(userId: string, year: number): TaxReport {
    const startDate = new Date(year, 0, 1).getTime();
    const endDate = new Date(year, 11, 31).getTime();

    const taxableEvents = this.getTaxableEvents(userId, year);
    const capitalGains = this.calculateCapitalGains(userId, year);

    let totalIncome = 0;
    let totalCapitalGains = 0;
    let shortTermGains = 0;
    let longTermGains = 0;
    let totalLosses = 0;

    for (const event of taxableEvents) {
      if (event.type === 'income' || event.type === 'staking') {
        totalIncome += event.totalValue;
      }
    }

    for (const gain of capitalGains) {
      if (gain.gainLoss > 0) {
        totalCapitalGains += gain.gainLoss;
        if (gain.type === 'short-term') {
          shortTermGains += gain.gainLoss;
        } else {
          longTermGains += gain.gainLoss;
        }
      } else {
        totalLosses += Math.abs(gain.gainLoss);
      }
    }

    const netGainLoss = totalCapitalGains - totalLosses;

    const report: TaxReport = {
      userId,
      year,
      startDate,
      endDate,
      totalIncome,
      totalCapitalGains,
      shortTermGains,
      longTermGains,
      totalLosses,
      netGainLoss,
      taxableEvents,
      capitalGains,
      status: 'draft',
    };

    if (!this.taxReports.has(userId)) {
      this.taxReports.set(userId, []);
    }

    this.taxReports.get(userId)!.push(report);

    return report;
  }

  /**
   * Export to tax software
   */
  exportToTaxSoftware(report: TaxReport, format: 'turbotax' | 'hrblock' | 'taxact' | 'csv' | 'json'): TaxSoftwareExport {
    let data: Record<string, any> = {};
    let filename = `tax_report_${report.year}`;

    if (format === 'turbotax') {
      data = {
        form: '8949',
        scheduleD: {
          shortTermGains: report.shortTermGains,
          longTermGains: report.longTermGains,
          totalGains: report.totalCapitalGains,
          totalLosses: report.totalLosses,
          netGainLoss: report.netGainLoss,
        },
        transactions: report.capitalGains.map(g => ({
          description: `${g.asset} Sale`,
          dateAcquired: new Date(g.purchaseDate).toISOString().split('T')[0],
          dateSold: new Date(g.saleDate).toISOString().split('T')[0],
          proceeds: g.salePrice,
          costBasis: g.costBasis,
          gain: g.gainLoss,
        })),
      };
      filename += '.txt';
    } else if (format === 'hrblock') {
      data = {
        capitalGains: {
          shortTerm: report.shortTermGains,
          longTerm: report.longTermGains,
          total: report.totalCapitalGains,
        },
        capitalLosses: report.totalLosses,
        transactions: report.capitalGains,
      };
      filename += '.json';
    } else if (format === 'csv') {
      const rows = [
        ['Asset', 'Quantity', 'Purchase Date', 'Sale Date', 'Cost Basis', 'Sale Price', 'Gain/Loss', 'Type'],
        ...report.capitalGains.map(g => [
          g.asset,
          g.quantity.toString(),
          new Date(g.purchaseDate).toISOString().split('T')[0],
          new Date(g.saleDate).toISOString().split('T')[0],
          g.costBasis.toString(),
          g.salePrice.toString(),
          g.gainLoss.toString(),
          g.type,
        ]),
      ];
      data = { rows };
      filename += '.csv';
    } else {
      data = report;
      filename += '.json';
    }

    return {
      format,
      data,
      filename,
    };
  }

  /**
   * Get tax optimization strategies
   */
  getTaxOptimizationStrategies(report: TaxReport): TaxOptimization[] {
    const strategies: TaxOptimization[] = [];

    // Tax-loss harvesting
    if (report.totalLosses > 0) {
      strategies.push({
        strategy: 'Tax-Loss Harvesting',
        estimatedSavings: report.totalLosses * 0.37, // Assuming 37% tax bracket
        implementation: 'Sell losing positions to offset gains',
        riskLevel: 'low',
      });
    }

    // Long-term capital gains
    if (report.shortTermGains > report.longTermGains) {
      strategies.push({
        strategy: 'Hold for Long-Term Gains',
        estimatedSavings: (report.shortTermGains - report.longTermGains) * 0.17, // Difference in tax rates
        implementation: 'Hold positions for over 1 year to qualify for long-term rates',
        riskLevel: 'medium',
      });
    }

    // Income timing
    if (report.totalIncome > 50000) {
      strategies.push({
        strategy: 'Income Timing',
        estimatedSavings: report.totalIncome * 0.1,
        implementation: 'Defer staking rewards to next tax year if possible',
        riskLevel: 'medium',
      });
    }

    return strategies;
  }

  /**
   * Calculate estimated tax
   */
  calculateEstimatedTax(report: TaxReport, taxBracket: number): TaxBracket {
    const totalIncome = report.totalIncome + report.netGainLoss;
    const estimatedTax = totalIncome * (taxBracket / 100);

    return {
      year: report.year,
      income: totalIncome,
      bracket: `${taxBracket}%`,
      rate: taxBracket,
      estimatedTax,
    };
  }

  /**
   * Set cost basis method
   */
  setCostBasisMethod(userId: string, method: 'fifo' | 'lifo' | 'average'): void {
    this.costBasisMethods.set(userId, method);
  }

  /**
   * Get tax reports
   */
  getTaxReports(userId: string): TaxReport[] {
    return this.taxReports.get(userId) || [];
  }

  /**
   * Get tax report by year
   */
  getTaxReportByYear(userId: string, year: number): TaxReport | undefined {
    const reports = this.taxReports.get(userId) || [];
    return reports.find(r => r.year === year);
  }
}

export const cryptoTaxReportingService = new CryptoTaxReportingService();
