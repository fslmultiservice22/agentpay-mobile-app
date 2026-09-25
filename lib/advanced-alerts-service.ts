/**
 * Advanced Alerts Service
 * Customizable price alerts with multiple conditions and notifications
 */

export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  type: 'price' | 'percentage' | 'technical' | 'volume';
  condition: 'above' | 'below' | 'change' | 'crossover';
  targetPrice?: number;
  percentageChange?: number;
  indicator?: 'RSI' | 'MACD' | 'SMA' | 'EMA';
  indicatorValue?: number;
  volumeThreshold?: number;
  isActive: boolean;
  notificationChannels: ('push' | 'email' | 'sms')[];
  frequency: 'once' | 'always' | 'daily' | 'weekly';
  createdAt: number;
  lastTriggeredAt?: number;
  triggerCount: number;
}

export interface AlertTrigger {
  id: string;
  alertId: string;
  symbol: string;
  currentPrice: number;
  targetPrice: number;
  timestamp: number;
  notificationsSent: string[];
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  totalTriggers: number;
  byType: Record<string, number>;
  bySymbol: Record<string, number>;
  mostTriggeredAlert: string;
}

export interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  type: PriceAlert['type'];
  condition: PriceAlert['condition'];
  targetPrice?: number;
  percentageChange?: number;
  indicator?: 'RSI' | 'MACD' | 'SMA' | 'EMA';
  indicatorValue?: number;
  notificationChannels: ('push' | 'email' | 'sms')[];
}

class AdvancedAlertsService {
  private alerts: Map<string, PriceAlert> = new Map();
  private triggers: Map<string, AlertTrigger> = new Map();
  private templates: Map<string, AlertTemplate> = new Map();
  private alertHistory: AlertTrigger[] = [];

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize default alert templates
   */
  private initializeTemplates(): void {
    const templates: AlertTemplate[] = [
      {
        id: 'template_1',
        name: 'Price Above Target',
        description: 'Alert when price goes above target',
        type: 'price',
        condition: 'above',
        notificationChannels: ['push', 'email'],
      },
      {
        id: 'template_2',
        name: 'Price Below Target',
        description: 'Alert when price goes below target',
        type: 'price',
        condition: 'below',
        notificationChannels: ['push', 'email'],
      },
      {
        id: 'template_3',
        name: 'Large Price Change',
        description: 'Alert on significant percentage change',
        type: 'percentage',
        condition: 'change',
        percentageChange: 5,
        notificationChannels: ['push'],
      },
      {
        id: 'template_4',
        name: 'RSI Overbought',
        description: 'Alert when RSI > 70',
        type: 'technical',
        condition: 'crossover',
        indicator: 'RSI',
        indicatorValue: 70,
        notificationChannels: ['push', 'email'],
      },
      {
        id: 'template_5',
        name: 'High Volume',
        description: 'Alert on unusual trading volume',
        type: 'volume',
        condition: 'above',
        notificationChannels: ['push'],
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Create price alert
   */
  createAlert(
    userId: string,
    symbol: string,
    type: PriceAlert['type'],
    condition: PriceAlert['condition'],
    targetPrice?: number,
    percentageChange?: number,
    indicator?: string,
    notificationChannels: ('push' | 'email' | 'sms')[] = ['push']
  ): PriceAlert {
    const alert: PriceAlert = {
      id: `alert_${Date.now()}`,
      userId,
      symbol,
      type,
      condition,
      targetPrice,
      percentageChange,
      indicator: indicator as any,
      isActive: true,
      notificationChannels,
      frequency: 'always',
      createdAt: Date.now(),
      triggerCount: 0,
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  /**
   * Get user alerts
   */
  getUserAlerts(userId: string, activeOnly: boolean = false): PriceAlert[] {
    return Array.from(this.alerts.values()).filter(
      alert => alert.userId === userId && (!activeOnly || alert.isActive)
    );
  }

  /**
   * Update alert
   */
  updateAlert(alertId: string, updates: Partial<PriceAlert>): PriceAlert | undefined {
    const alert = this.alerts.get(alertId);
    if (alert) {
      Object.assign(alert, updates);
    }
    return alert;
  }

  /**
   * Delete alert
   */
  deleteAlert(alertId: string): void {
    this.alerts.delete(alertId);
  }

  /**
   * Enable/disable alert
   */
  toggleAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.isActive = !alert.isActive;
    }
  }

  /**
   * Check if alert should trigger
   */
  checkAlertTrigger(
    alertId: string,
    currentPrice: number,
    currentRSI?: number,
    currentVolume?: number
  ): AlertTrigger | null {
    const alert = this.alerts.get(alertId);
    if (!alert || !alert.isActive) {
      return null;
    }

    let shouldTrigger = false;

    if (alert.type === 'price') {
      if (alert.condition === 'above' && currentPrice > (alert.targetPrice || 0)) {
        shouldTrigger = true;
      } else if (alert.condition === 'below' && currentPrice < (alert.targetPrice || 0)) {
        shouldTrigger = true;
      }
    } else if (alert.type === 'technical') {
      if (alert.indicator === 'RSI' && currentRSI !== undefined) {
        if (alert.condition === 'above' && currentRSI > (alert.indicatorValue || 70)) {
          shouldTrigger = true;
        } else if (alert.condition === 'below' && currentRSI < (alert.indicatorValue || 30)) {
          shouldTrigger = true;
        }
      }
    } else if (alert.type === 'volume') {
      if (currentVolume && currentVolume > (alert.volumeThreshold || 0)) {
        shouldTrigger = true;
      }
    }

    if (shouldTrigger) {
      const trigger: AlertTrigger = {
        id: `trigger_${Date.now()}`,
        alertId,
        symbol: alert.symbol,
        currentPrice,
        targetPrice: alert.targetPrice || currentPrice,
        timestamp: Date.now(),
        notificationsSent: alert.notificationChannels,
      };

      this.triggers.set(trigger.id, trigger);
      this.alertHistory.push(trigger);
      alert.lastTriggeredAt = Date.now();
      alert.triggerCount++;

      return trigger;
    }

    return null;
  }

  /**
   * Get alert triggers
   */
  getAlertTriggers(alertId: string, limit: number = 20): AlertTrigger[] {
    return this.alertHistory
      .filter(t => t.alertId === alertId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get alert templates
   */
  getTemplates(): AlertTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create alert from template
   */
  createAlertFromTemplate(
    userId: string,
    symbol: string,
    templateId: string,
    targetPrice?: number
  ): PriceAlert | null {
    const template = this.templates.get(templateId);
    if (!template) {
      return null;
    }

    return this.createAlert(
      userId,
      symbol,
      template.type,
      template.condition,
      targetPrice || template.targetPrice,
      template.percentageChange,
      template.indicator,
      template.notificationChannels
    );
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(userId: string): AlertStatistics {
    const userAlerts = this.getUserAlerts(userId);
    const activeAlerts = userAlerts.filter(a => a.isActive);

    const byType: Record<string, number> = {};
    const bySymbol: Record<string, number> = {};

    userAlerts.forEach(alert => {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      bySymbol[alert.symbol] = (bySymbol[alert.symbol] || 0) + 1;
    });

    const totalTriggers = userAlerts.reduce((sum, alert) => sum + alert.triggerCount, 0);
    const mostTriggeredAlert = userAlerts.reduce((max, alert) =>
      alert.triggerCount > (max?.triggerCount || 0) ? alert : max
    )?.id || '';

    return {
      totalAlerts: userAlerts.length,
      activeAlerts: activeAlerts.length,
      totalTriggers,
      byType,
      bySymbol,
      mostTriggeredAlert,
    };
  }

  /**
   * Get alert history
   */
  getAlertHistory(userId: string, limit: number = 50): AlertTrigger[] {
    const userAlerts = new Set(this.getUserAlerts(userId).map(a => a.id));
    return this.alertHistory
      .filter(t => userAlerts.has(t.alertId))
      .slice(-limit)
      .reverse();
  }

  /**
   * Batch check alerts
   */
  batchCheckAlerts(
    alertIds: string[],
    priceData: Record<string, number>
  ): AlertTrigger[] {
    const triggers: AlertTrigger[] = [];

    alertIds.forEach(alertId => {
      const alert = this.alerts.get(alertId);
      if (alert && alert.isActive) {
        const currentPrice = priceData[alert.symbol];
        if (currentPrice !== undefined) {
          const trigger = this.checkAlertTrigger(alertId, currentPrice);
          if (trigger) {
            triggers.push(trigger);
          }
        }
      }
    });

    return triggers;
  }

  /**
   * Clear old triggers
   */
  clearOldTriggers(daysOld: number = 30): number {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const initialLength = this.alertHistory.length;

    this.alertHistory = this.alertHistory.filter(t => t.timestamp > cutoffTime);

    return initialLength - this.alertHistory.length;
  }
}

export const advancedAlertsService = new AdvancedAlertsService();
