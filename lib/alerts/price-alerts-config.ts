export type AlertType = 'price_above' | 'price_below' | 'portfolio_milestone' | 'price_change_percent';
export type AlertStatus = 'active' | 'triggered' | 'disabled';

export interface PriceAlert {
  id: string;
  type: AlertType;
  asset: string;
  targetPrice?: number;
  targetValue?: number;
  percentChange?: number;
  currentPrice: number;
  status: AlertStatus;
  createdAt: number;
  triggeredAt?: number;
  notificationSent: boolean;
  blockchain?: string;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  triggeredAlerts: number;
  disabledAlerts: number;
  totalNotifications: number;
  unreadNotifications: number;
}

/**
 * Mock price alerts for demonstration
 */
export const MOCK_PRICE_ALERTS: PriceAlert[] = [
  {
    id: '1',
    type: 'price_above',
    asset: 'ETH',
    targetPrice: 3000,
    currentPrice: 2500,
    status: 'active',
    createdAt: Date.now() - 86400000,
    notificationSent: false,
    blockchain: 'ethereum',
  },
  {
    id: '2',
    type: 'price_below',
    asset: 'BTC',
    targetPrice: 40000,
    currentPrice: 45000,
    status: 'active',
    createdAt: Date.now() - 172800000,
    notificationSent: false,
    blockchain: 'ethereum',
  },
  {
    id: '3',
    type: 'price_change_percent',
    asset: 'MATIC',
    percentChange: 10,
    currentPrice: 1.2,
    status: 'triggered',
    createdAt: Date.now() - 259200000,
    triggeredAt: Date.now() - 3600000,
    notificationSent: true,
    blockchain: 'polygon',
  },
  {
    id: '4',
    type: 'portfolio_milestone',
    asset: 'PORTFOLIO',
    targetValue: 10000,
    currentPrice: 8500,
    status: 'active',
    createdAt: Date.now() - 345600000,
    notificationSent: false,
  },
];

/**
 * Mock notifications
 */
export const MOCK_NOTIFICATIONS: AlertNotification[] = [
  {
    id: '1',
    alertId: '3',
    title: 'Price Alert Triggered!',
    body: 'MATIC increased by 10% - now at $1.32',
    timestamp: Date.now() - 3600000,
    read: false,
  },
  {
    id: '2',
    alertId: '2',
    title: 'Price Alert',
    body: 'BTC is still above $40,000 target',
    timestamp: Date.now() - 86400000,
    read: true,
  },
];

/**
 * Get alert description
 */
export function getAlertDescription(alert: PriceAlert): string {
  switch (alert.type) {
    case 'price_above':
      return `Alert when ${alert.asset} goes above $${alert.targetPrice}`;
    case 'price_below':
      return `Alert when ${alert.asset} goes below $${alert.targetPrice}`;
    case 'price_change_percent':
      return `Alert when ${alert.asset} changes by ${alert.percentChange}%`;
    case 'portfolio_milestone':
      return `Alert when portfolio reaches $${alert.targetValue}`;
    default:
      return 'Unknown alert type';
  }
}

/**
 * Check if alert should be triggered
 */
export function shouldTriggerAlert(alert: PriceAlert, currentPrice: number): boolean {
  if (alert.status !== 'active') return false;

  switch (alert.type) {
    case 'price_above':
      return currentPrice >= (alert.targetPrice || 0);
    case 'price_below':
      return currentPrice <= (alert.targetPrice || Infinity);
    case 'price_change_percent':
      const percentChange = ((currentPrice - alert.currentPrice) / alert.currentPrice) * 100;
      return Math.abs(percentChange) >= (alert.percentChange || 0);
    default:
      return false;
  }
}

/**
 * Format alert for notification
 */
export function formatAlertNotification(alert: PriceAlert, currentPrice: number): { title: string; body: string } {
  const priceChange = ((currentPrice - alert.currentPrice) / alert.currentPrice) * 100;

  switch (alert.type) {
    case 'price_above':
      return {
        title: `${alert.asset} Price Alert!`,
        body: `${alert.asset} reached $${currentPrice.toFixed(2)} (above $${alert.targetPrice})`,
      };
    case 'price_below':
      return {
        title: `${alert.asset} Price Alert!`,
        body: `${alert.asset} dropped to $${currentPrice.toFixed(2)} (below $${alert.targetPrice})`,
      };
    case 'price_change_percent':
      return {
        title: `${alert.asset} Price Change!`,
        body: `${alert.asset} changed by ${priceChange.toFixed(2)}% - now at $${currentPrice.toFixed(2)}`,
      };
    case 'portfolio_milestone':
      return {
        title: 'Portfolio Milestone!',
        body: `Your portfolio reached $${currentPrice.toFixed(2)}!`,
      };
    default:
      return { title: 'Alert', body: 'Price alert triggered' };
  }
}

/**
 * Calculate alert statistics
 */
export function calculateAlertStatistics(alerts: PriceAlert[], notifications: AlertNotification[]): AlertStatistics {
  return {
    totalAlerts: alerts.length,
    activeAlerts: alerts.filter((a) => a.status === 'active').length,
    triggeredAlerts: alerts.filter((a) => a.status === 'triggered').length,
    disabledAlerts: alerts.filter((a) => a.status === 'disabled').length,
    totalNotifications: notifications.length,
    unreadNotifications: notifications.filter((n) => !n.read).length,
  };
}

/**
 * Validate alert parameters
 */
export function validateAlert(type: AlertType, params: Record<string, any>): { valid: boolean; error?: string } {
  switch (type) {
    case 'price_above':
    case 'price_below':
      if (!params.targetPrice || params.targetPrice <= 0) {
        return { valid: false, error: 'Target price must be greater than 0' };
      }
      break;
    case 'price_change_percent':
      if (!params.percentChange || params.percentChange <= 0) {
        return { valid: false, error: 'Percent change must be greater than 0' };
      }
      break;
    case 'portfolio_milestone':
      if (!params.targetValue || params.targetValue <= 0) {
        return { valid: false, error: 'Target value must be greater than 0' };
      }
      break;
  }
  return { valid: true };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${(price / 1000).toFixed(2)}K`;
  }
  return `$${price.toFixed(2)}`;
}

/**
 * Get alert color based on status
 */
export function getAlertColor(status: AlertStatus, colors: Record<string, string>): string {
  switch (status) {
    case 'active':
      return colors.primary;
    case 'triggered':
      return colors.success;
    case 'disabled':
      return colors.muted;
    default:
      return colors.foreground;
  }
}
