/**
 * Margin Call Alerts & Liquidation Prevention Service
 * Real-time monitoring and alerts for margin positions
 */

export interface MarginMonitor {
  id: string;
  userId: string;
  positionId: string;
  pair: string;
  currentMarginRatio: number;
  warningThreshold: number; // e.g., 1.5
  liquidationThreshold: number; // e.g., 1.0
  status: 'healthy' | 'warning' | 'critical' | 'liquidation_imminent';
  lastCheckedAt: number;
  alertsSent: number;
}

export interface MarginAlert {
  id: string;
  userId: string;
  positionId: string;
  type: 'warning' | 'critical' | 'liquidation_imminent';
  marginRatio: number;
  message: string;
  recommendedAction: string;
  sentAt: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
}

export interface LiquidationPrevention {
  id: string;
  userId: string;
  positionId: string;
  action: 'add_margin' | 'close_position' | 'reduce_leverage';
  amount: number;
  status: 'pending' | 'executed' | 'failed';
  createdAt: number;
  executedAt?: number;
  result?: string;
}

export interface MarginHistory {
  id: string;
  userId: string;
  positionId: string;
  timestamp: number;
  marginRatio: number;
  collateralValue: number;
  borrowedValue: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface AlertPreference {
  userId: string;
  warningThreshold: number;
  criticalThreshold: number;
  enableSMS: boolean;
  enablePush: boolean;
  enableEmail: boolean;
  phoneNumber?: string;
  emailAddress?: string;
  autoAddMargin: boolean;
  autoAddMarginAmount?: number;
  autoClosePosition: boolean;
  autoCloseThreshold?: number;
}

class MarginCallAlertsService {
  private monitors: Map<string, MarginMonitor> = new Map();
  private alerts: Map<string, MarginAlert> = new Map();
  private preventions: Map<string, LiquidationPrevention> = new Map();
  private history: Map<string, MarginHistory> = new Map();
  private preferences: Map<string, AlertPreference> = new Map();
  private activePositions: Map<string, any> = new Map(); // Reference to positions

  /**
   * Create margin monitor
   */
  createMonitor(
    userId: string,
    positionId: string,
    pair: string,
    warningThreshold: number = 1.5,
    liquidationThreshold: number = 1.0
  ): MarginMonitor {
    const monitor: MarginMonitor = {
      id: `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      positionId,
      pair,
      currentMarginRatio: 2.0, // Start healthy
      warningThreshold,
      liquidationThreshold,
      status: 'healthy',
      lastCheckedAt: Date.now(),
      alertsSent: 0,
    };

    this.monitors.set(monitor.id, monitor);

    // Initialize preferences if not exists
    if (!this.preferences.has(userId)) {
      this.preferences.set(userId, {
        userId,
        warningThreshold,
        criticalThreshold: liquidationThreshold,
        enableSMS: true,
        enablePush: true,
        enableEmail: true,
        autoAddMargin: false,
        autoClosePosition: false,
      });
    }

    return monitor;
  }

  /**
   * Update margin ratio
   */
  updateMarginRatio(monitorId: string, marginRatio: number): MarginAlert | null {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) return null;

    const previousStatus = monitor.status;
    monitor.currentMarginRatio = marginRatio;
    monitor.lastCheckedAt = Date.now();

    // Record history
    this.recordHistory(monitor.userId, monitor.positionId, marginRatio);

    // Determine status
    if (marginRatio < monitor.liquidationThreshold) {
      monitor.status = 'liquidation_imminent';
    } else if (marginRatio < monitor.warningThreshold) {
      monitor.status = 'critical';
    } else if (marginRatio < monitor.warningThreshold + 0.5) {
      monitor.status = 'warning';
    } else {
      monitor.status = 'healthy';
    }

    // Send alert if status changed
    if (previousStatus !== monitor.status) {
      return this.sendAlert(monitor);
    }

    return null;
  }

  /**
   * Send alert
   */
  private sendAlert(monitor: MarginMonitor): MarginAlert {
    const preference = this.preferences.get(monitor.userId);
    let type: 'warning' | 'critical' | 'liquidation_imminent' = 'warning';
    let message = '';
    let recommendedAction = '';

    if (monitor.status === 'liquidation_imminent') {
      type = 'liquidation_imminent';
      message = `⚠️ LIQUIDATION IMMINENT: Your ${monitor.pair} position margin ratio is ${monitor.currentMarginRatio.toFixed(2)}x. Liquidation threshold: ${monitor.liquidationThreshold}x`;
      recommendedAction = 'Add margin immediately or close position to prevent forced liquidation';
    } else if (monitor.status === 'critical') {
      type = 'critical';
      message = `🚨 CRITICAL: Your ${monitor.pair} position margin ratio is ${monitor.currentMarginRatio.toFixed(2)}x. Warning threshold: ${monitor.warningThreshold}x`;
      recommendedAction = 'Add margin or reduce position size to avoid liquidation';
    } else if (monitor.status === 'warning') {
      type = 'warning';
      message = `⚠️ WARNING: Your ${monitor.pair} position margin ratio is ${monitor.currentMarginRatio.toFixed(2)}x`;
      recommendedAction = 'Monitor closely and consider adding margin if ratio continues to decline';
    }

    const alert: MarginAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: monitor.userId,
      positionId: monitor.positionId,
      type,
      marginRatio: monitor.currentMarginRatio,
      message,
      recommendedAction,
      sentAt: Date.now(),
      acknowledged: false,
    };

    this.alerts.set(alert.id, alert);
    monitor.alertsSent++;

    // Trigger notifications based on preferences
    if (preference) {
      this.triggerNotifications(alert, preference);
    }

    // Auto-execute prevention if enabled
    if (preference?.autoAddMargin && type === 'critical') {
      this.autoAddMargin(monitor.userId, monitor.positionId, preference.autoAddMarginAmount || 100);
    } else if (preference?.autoClosePosition && type === 'liquidation_imminent') {
      this.autoClosePosition(monitor.userId, monitor.positionId);
    }

    return alert;
  }

  /**
   * Trigger notifications
   */
  private triggerNotifications(alert: MarginAlert, preference: AlertPreference): void {
    if (preference.enablePush) {
      // Push notification
    }

    if (preference.enableSMS && preference.phoneNumber) {
      // SMS notification
    }

    if (preference.enableEmail && preference.emailAddress) {
      // Email notification
    }
  }

  /**
   * Auto add margin
   */
  private autoAddMargin(userId: string, positionId: string, amount: number): void {
    const prevention: LiquidationPrevention = {
      id: `prev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      positionId,
      action: 'add_margin',
      amount,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.preventions.set(prevention.id, prevention);

    // Simulate execution
    setTimeout(() => {
      prevention.status = 'executed';
      prevention.executedAt = Date.now();
      prevention.result = `Added ${amount} USDC margin to position`;
    }, 1000);
  }

  /**
   * Auto close position
   */
  private autoClosePosition(userId: string, positionId: string): void {
    const prevention: LiquidationPrevention = {
      id: `prev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      positionId,
      action: 'close_position',
      amount: 0,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.preventions.set(prevention.id, prevention);

    // Simulate execution
    setTimeout(() => {
      prevention.status = 'executed';
      prevention.executedAt = Date.now();
      prevention.result = 'Position closed to prevent liquidation';
    }, 1000);
  }

  /**
   * Record history
   */
  private recordHistory(userId: string, positionId: string, marginRatio: number): void {
    const history: MarginHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      positionId,
      timestamp: Date.now(),
      marginRatio,
      collateralValue: marginRatio * 1000, // Simplified
      borrowedValue: 1000, // Simplified
      status: marginRatio > 1.5 ? 'healthy' : marginRatio > 1 ? 'warning' : 'critical',
    };

    this.history.set(history.id, history);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedAt = Date.now();

    return true;
  }

  /**
   * Get user alerts
   */
  getUserAlerts(userId: string, unacknowledgedOnly: boolean = false): MarginAlert[] {
    let alerts = Array.from(this.alerts.values()).filter(a => a.userId === userId);

    if (unacknowledgedOnly) {
      alerts = alerts.filter(a => !a.acknowledged);
    }

    return alerts.sort((a, b) => b.sentAt - a.sentAt);
  }

  /**
   * Get monitor status
   */
  getMonitorStatus(monitorId: string): MarginMonitor | undefined {
    return this.monitors.get(monitorId);
  }

  /**
   * Get user monitors
   */
  getUserMonitors(userId: string): MarginMonitor[] {
    return Array.from(this.monitors.values()).filter(m => m.userId === userId);
  }

  /**
   * Get margin history
   */
  getMarginHistory(userId: string, positionId: string, limit: number = 100): MarginHistory[] {
    return Array.from(this.history.values())
      .filter(h => h.userId === userId && h.positionId === positionId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Update alert preferences
   */
  updatePreferences(userId: string, preferences: Partial<AlertPreference>): AlertPreference {
    let prefs = this.preferences.get(userId);

    if (!prefs) {
      prefs = {
        userId,
        warningThreshold: 1.5,
        criticalThreshold: 1.0,
        enableSMS: true,
        enablePush: true,
        enableEmail: true,
        autoAddMargin: false,
        autoClosePosition: false,
      };
    }

    Object.assign(prefs, preferences);
    this.preferences.set(userId, prefs);

    return prefs;
  }

  /**
   * Get alert preferences
   */
  getPreferences(userId: string): AlertPreference | undefined {
    return this.preferences.get(userId);
  }

  /**
   * Get prevention actions
   */
  getPreventionActions(userId: string): LiquidationPrevention[] {
    return Array.from(this.preventions.values())
      .filter(p => p.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get margin statistics
   */
  getMarginStatistics(userId: string): {
    averageMarginRatio: number;
    minMarginRatio: number;
    maxMarginRatio: number;
    alertsTriggered: number;
    preventionsExecuted: number;
  } {
    const history = Array.from(this.history.values()).filter(h => h.userId === userId);
    const alerts = this.getUserAlerts(userId);
    const preventions = this.getPreventionActions(userId).filter(p => p.status === 'executed');

    const marginRatios = history.map(h => h.marginRatio);

    return {
      averageMarginRatio: marginRatios.length > 0 ? marginRatios.reduce((a, b) => a + b) / marginRatios.length : 0,
      minMarginRatio: marginRatios.length > 0 ? Math.min(...marginRatios) : 0,
      maxMarginRatio: marginRatios.length > 0 ? Math.max(...marginRatios) : 0,
      alertsTriggered: alerts.length,
      preventionsExecuted: preventions.length,
    };
  }

  /**
   * Get risk assessment
   */
  getRiskAssessment(monitorId: string): {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    recommendation: string;
  } {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) throw new Error('Monitor not found');

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let riskScore = 0;
    let recommendation = 'Position is healthy';

    if (monitor.currentMarginRatio < monitor.liquidationThreshold) {
      riskLevel = 'critical';
      riskScore = 100;
      recommendation = 'IMMEDIATE ACTION REQUIRED: Add margin or close position to prevent liquidation';
    } else if (monitor.currentMarginRatio < monitor.warningThreshold) {
      riskLevel = 'high';
      riskScore = 75;
      recommendation = 'Add margin to reduce liquidation risk';
    } else if (monitor.currentMarginRatio < monitor.warningThreshold + 0.5) {
      riskLevel = 'medium';
      riskScore = 50;
      recommendation = 'Monitor position closely';
    } else {
      riskLevel = 'low';
      riskScore = 25;
      recommendation = 'Position is healthy';
    }

    return {
      riskLevel,
      riskScore,
      recommendation,
    };
  }
}

export const marginCallAlertsService = new MarginCallAlertsService();
