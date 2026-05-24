/**
 * Portfolio Alerts & Price Monitoring Service
 * Customizable price alerts, portfolio rebalancing, and tax-loss harvesting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PriceAlert {
  id: string;
  assetId: string;
  assetSymbol: string;
  triggerPrice: number;
  triggerType: 'above' | 'below';
  isActive: boolean;
  createdAt: number;
  triggeredAt?: number;
  notificationSent: boolean;
}

export interface PortfolioRebalancingSuggestion {
  id: string;
  assetId: string;
  currentAllocation: number;
  targetAllocation: number;
  action: 'buy' | 'sell';
  amount: number;
  reason: string;
  createdAt: number;
  implemented: boolean;
}

export interface TaxLossHarvestingOpportunity {
  id: string;
  assetId: string;
  assetSymbol: string;
  currentPrice: number;
  purchasePrice: number;
  loss: number;
  lossPercentage: number;
  createdAt: number;
  implemented: boolean;
  replacementAsset?: string;
}

export interface PortfolioAlert {
  id: string;
  type: 'price_alert' | 'rebalancing' | 'tax_loss';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: number;
  read: boolean;
  actionTaken: boolean;
}

class PortfolioAlertsService {
  private priceAlerts: Map<string, PriceAlert> = new Map();
  private rebalancingSuggestions: Map<string, PortfolioRebalancingSuggestion> = new Map();
  private taxLossOpportunities: Map<string, TaxLossHarvestingOpportunity> = new Map();
  private alerts: Map<string, PortfolioAlert> = new Map();

  private readonly PRICE_ALERTS_STORAGE_KEY = 'portfolio_price_alerts';
  private readonly REBALANCING_STORAGE_KEY = 'portfolio_rebalancing';
  private readonly TAX_LOSS_STORAGE_KEY = 'portfolio_tax_loss';
  private readonly ALERTS_STORAGE_KEY = 'portfolio_alerts';

  constructor() {
    this.loadAlerts();
  }

  /**
   * Create price alert
   */
  async createPriceAlert(
    assetId: string,
    assetSymbol: string,
    triggerPrice: number,
    triggerType: 'above' | 'below'
  ): Promise<PriceAlert> {
    const alert: PriceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId,
      assetSymbol,
      triggerPrice,
      triggerType,
      isActive: true,
      createdAt: Date.now(),
      notificationSent: false,
    };

    this.priceAlerts.set(alert.id, alert);
    await this.persistPriceAlerts();

    return alert;
  }

  /**
   * Get price alerts
   */
  getPriceAlerts(assetId?: string): PriceAlert[] {
    const alerts = Array.from(this.priceAlerts.values());
    if (assetId) {
      return alerts.filter(a => a.assetId === assetId);
    }
    return alerts;
  }

  /**
   * Update price alert
   */
  async updatePriceAlert(alertId: string, updates: Partial<PriceAlert>): Promise<boolean> {
    const alert = this.priceAlerts.get(alertId);
    if (!alert) return false;

    Object.assign(alert, updates);
    await this.persistPriceAlerts();
    return true;
  }

  /**
   * Delete price alert
   */
  async deletePriceAlert(alertId: string): Promise<boolean> {
    const deleted = this.priceAlerts.delete(alertId);
    if (deleted) {
      await this.persistPriceAlerts();
    }
    return deleted;
  }

  /**
   * Check price alerts
   */
  async checkPriceAlerts(prices: Record<string, number>): Promise<PriceAlert[]> {
    const triggeredAlerts: PriceAlert[] = [];

    for (const alert of this.priceAlerts.values()) {
      if (!alert.isActive) continue;

      const currentPrice = prices[alert.assetId];
      if (!currentPrice) continue;

      let triggered = false;
      if (alert.triggerType === 'above' && currentPrice >= alert.triggerPrice) {
        triggered = true;
      } else if (alert.triggerType === 'below' && currentPrice <= alert.triggerPrice) {
        triggered = true;
      }

      if (triggered && !alert.notificationSent) {
        alert.triggeredAt = Date.now();
        alert.notificationSent = true;
        triggeredAlerts.push(alert);
      }
    }

    if (triggeredAlerts.length > 0) {
      await this.persistPriceAlerts();
    }

    return triggeredAlerts;
  }

  /**
   * Create rebalancing suggestion
   */
  async createRebalancingSuggestion(
    assetId: string,
    currentAllocation: number,
    targetAllocation: number,
    action: 'buy' | 'sell',
    amount: number,
    reason: string
  ): Promise<PortfolioRebalancingSuggestion> {
    const suggestion: PortfolioRebalancingSuggestion = {
      id: `rebal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId,
      currentAllocation,
      targetAllocation,
      action,
      amount,
      reason,
      createdAt: Date.now(),
      implemented: false,
    };

    this.rebalancingSuggestions.set(suggestion.id, suggestion);
    await this.persistRebalancingSuggestions();

    return suggestion;
  }

  /**
   * Get rebalancing suggestions
   */
  getRebalancingSuggestions(): PortfolioRebalancingSuggestion[] {
    return Array.from(this.rebalancingSuggestions.values());
  }

  /**
   * Implement rebalancing suggestion
   */
  async implementRebalancingSuggestion(suggestionId: string): Promise<boolean> {
    const suggestion = this.rebalancingSuggestions.get(suggestionId);
    if (!suggestion) return false;

    suggestion.implemented = true;
    await this.persistRebalancingSuggestions();
    return true;
  }

  /**
   * Create tax loss harvesting opportunity
   */
  async createTaxLossOpportunity(
    assetId: string,
    assetSymbol: string,
    currentPrice: number,
    purchasePrice: number
  ): Promise<TaxLossHarvestingOpportunity> {
    const loss = currentPrice - purchasePrice;
    const lossPercentage = (loss / purchasePrice) * 100;

    const opportunity: TaxLossHarvestingOpportunity = {
      id: `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assetId,
      assetSymbol,
      currentPrice,
      purchasePrice,
      loss,
      lossPercentage,
      createdAt: Date.now(),
      implemented: false,
    };

    this.taxLossOpportunities.set(opportunity.id, opportunity);
    await this.persistTaxLossOpportunities();

    return opportunity;
  }

  /**
   * Get tax loss harvesting opportunities
   */
  getTaxLossOpportunities(): TaxLossHarvestingOpportunity[] {
    return Array.from(this.taxLossOpportunities.values()).filter(o => !o.implemented);
  }

  /**
   * Implement tax loss harvesting
   */
  async implementTaxLossHarvesting(opportunityId: string, replacementAsset?: string): Promise<boolean> {
    const opportunity = this.taxLossOpportunities.get(opportunityId);
    if (!opportunity) return false;

    opportunity.implemented = true;
    opportunity.replacementAsset = replacementAsset;
    await this.persistTaxLossOpportunities();
    return true;
  }

  /**
   * Create portfolio alert
   */
  async createAlert(
    type: 'price_alert' | 'rebalancing' | 'tax_loss',
    title: string,
    description: string,
    severity: 'low' | 'medium' | 'high'
  ): Promise<PortfolioAlert> {
    const alert: PortfolioAlert = {
      id: `palert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      description,
      severity,
      createdAt: Date.now(),
      read: false,
      actionTaken: false,
    };

    this.alerts.set(alert.id, alert);
    await this.persistAlerts();

    return alert;
  }

  /**
   * Get portfolio alerts
   */
  getAlerts(unreadOnly: boolean = false): PortfolioAlert[] {
    const alerts = Array.from(this.alerts.values());
    if (unreadOnly) {
      return alerts.filter(a => !a.read);
    }
    return alerts;
  }

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.read = true;
    await this.persistAlerts();
    return true;
  }

  /**
   * Mark alert action taken
   */
  async markAlertActionTaken(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.actionTaken = true;
    await this.persistAlerts();
    return true;
  }

  /**
   * Get portfolio summary
   */
  getPortfolioSummary(): {
    priceAlertsCount: number;
    rebalancingSuggestionsCount: number;
    taxLossOpportunitiesCount: number;
    unreadAlertsCount: number;
  } {
    return {
      priceAlertsCount: this.priceAlerts.size,
      rebalancingSuggestionsCount: this.rebalancingSuggestions.size,
      taxLossOpportunitiesCount: Array.from(this.taxLossOpportunities.values()).filter(o => !o.implemented).length,
      unreadAlertsCount: Array.from(this.alerts.values()).filter(a => !a.read).length,
    };
  }

  /**
   * Persist price alerts
   */
  private async persistPriceAlerts(): Promise<void> {
    try {
      const data = Object.fromEntries(this.priceAlerts);
      await AsyncStorage.setItem(this.PRICE_ALERTS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist price alerts:', error);
    }
  }

  /**
   * Persist rebalancing suggestions
   */
  private async persistRebalancingSuggestions(): Promise<void> {
    try {
      const data = Object.fromEntries(this.rebalancingSuggestions);
      await AsyncStorage.setItem(this.REBALANCING_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist rebalancing suggestions:', error);
    }
  }

  /**
   * Persist tax loss opportunities
   */
  private async persistTaxLossOpportunities(): Promise<void> {
    try {
      const data = Object.fromEntries(this.taxLossOpportunities);
      await AsyncStorage.setItem(this.TAX_LOSS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist tax loss opportunities:', error);
    }
  }

  /**
   * Persist alerts
   */
  private async persistAlerts(): Promise<void> {
    try {
      const data = Object.fromEntries(this.alerts);
      await AsyncStorage.setItem(this.ALERTS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist alerts:', error);
    }
  }

  /**
   * Load alerts
   */
  private async loadAlerts(): Promise<void> {
    try {
      const priceAlerts = await AsyncStorage.getItem(this.PRICE_ALERTS_STORAGE_KEY);
      if (priceAlerts) {
        this.priceAlerts = new Map(Object.entries(JSON.parse(priceAlerts)));
      }

      const rebalancing = await AsyncStorage.getItem(this.REBALANCING_STORAGE_KEY);
      if (rebalancing) {
        this.rebalancingSuggestions = new Map(Object.entries(JSON.parse(rebalancing)));
      }

      const taxLoss = await AsyncStorage.getItem(this.TAX_LOSS_STORAGE_KEY);
      if (taxLoss) {
        this.taxLossOpportunities = new Map(Object.entries(JSON.parse(taxLoss)));
      }

      const alerts = await AsyncStorage.getItem(this.ALERTS_STORAGE_KEY);
      if (alerts) {
        this.alerts = new Map(Object.entries(JSON.parse(alerts)));
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }
}

export const portfolioAlertsService = new PortfolioAlertsService();
