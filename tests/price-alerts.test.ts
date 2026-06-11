import { describe, it, expect } from 'vitest';
import {
  getAlertDescription,
  shouldTriggerAlert,
  formatAlertNotification,
  calculateAlertStatistics,
  validateAlert,
  formatPrice,
  MOCK_PRICE_ALERTS,
  MOCK_NOTIFICATIONS,
  type PriceAlert,
} from '../lib/alerts/price-alerts-config';

describe('Price Alerts', () => {
  describe('getAlertDescription', () => {
    it('should return description for price_above alert', () => {
      const alert = MOCK_PRICE_ALERTS.find((a) => a.type === 'price_above');
      if (alert) {
        const desc = getAlertDescription(alert);
        expect(desc).toContain('above');
        expect(desc).toContain(alert.asset);
      }
    });

    it('should return description for price_below alert', () => {
      const alert = MOCK_PRICE_ALERTS.find((a) => a.type === 'price_below');
      if (alert) {
        const desc = getAlertDescription(alert);
        expect(desc).toContain('below');
        expect(desc).toContain(alert.asset);
      }
    });

    it('should return description for price_change_percent alert', () => {
      const alert = MOCK_PRICE_ALERTS.find((a) => a.type === 'price_change_percent');
      if (alert) {
        const desc = getAlertDescription(alert);
        expect(desc).toContain('changes');
      }
    });

    it('should return description for portfolio_milestone alert', () => {
      const alert = MOCK_PRICE_ALERTS.find((a) => a.type === 'portfolio_milestone');
      if (alert) {
        const desc = getAlertDescription(alert);
        expect(desc).toContain('portfolio');
      }
    });
  });

  describe('shouldTriggerAlert', () => {
    it('should trigger price_above alert when price is above target', () => {
      const alert: PriceAlert = {
        id: '1',
        type: 'price_above',
        asset: 'ETH',
        targetPrice: 3000,
        currentPrice: 2500,
        status: 'active',
        createdAt: Date.now(),
        notificationSent: false,
      };

      expect(shouldTriggerAlert(alert, 3500)).toBe(true);
      expect(shouldTriggerAlert(alert, 2500)).toBe(false);
    });

    it('should trigger price_below alert when price is below target', () => {
      const alert: PriceAlert = {
        id: '2',
        type: 'price_below',
        asset: 'BTC',
        targetPrice: 40000,
        currentPrice: 45000,
        status: 'active',
        createdAt: Date.now(),
        notificationSent: false,
      };

      expect(shouldTriggerAlert(alert, 35000)).toBe(true);
      expect(shouldTriggerAlert(alert, 45000)).toBe(false);
    });

    it('should not trigger inactive alerts', () => {
      const alert: PriceAlert = {
        id: '3',
        type: 'price_above',
        asset: 'ETH',
        targetPrice: 3000,
        currentPrice: 2500,
        status: 'disabled',
        createdAt: Date.now(),
        notificationSent: false,
      };

      expect(shouldTriggerAlert(alert, 3500)).toBe(false);
    });

    it('should trigger price_change_percent alert', () => {
      const alert: PriceAlert = {
        id: '4',
        type: 'price_change_percent',
        asset: 'MATIC',
        percentChange: 10,
        currentPrice: 1.0,
        status: 'active',
        createdAt: Date.now(),
        notificationSent: false,
      };

      expect(shouldTriggerAlert(alert, 1.1)).toBe(true);
      expect(shouldTriggerAlert(alert, 1.05)).toBe(false);
    });
  });

  describe('formatAlertNotification', () => {
    it('should format price_above notification', () => {
      const alert: PriceAlert = {
        id: '1',
        type: 'price_above',
        asset: 'ETH',
        targetPrice: 3000,
        currentPrice: 2500,
        status: 'active',
        createdAt: Date.now(),
        notificationSent: false,
      };

      const notification = formatAlertNotification(alert, 3500);
      expect(notification.title).toContain('ETH');
      expect(notification.body).toContain('3500');
    });

    it('should format price_below notification', () => {
      const alert: PriceAlert = {
        id: '2',
        type: 'price_below',
        asset: 'BTC',
        targetPrice: 40000,
        currentPrice: 45000,
        status: 'active',
        createdAt: Date.now(),
        notificationSent: false,
      };

      const notification = formatAlertNotification(alert, 35000);
      expect(notification.title).toContain('BTC');
      expect(notification.body).toContain('35000');
    });
  });

  describe('calculateAlertStatistics', () => {
    it('should calculate correct statistics', () => {
      const stats = calculateAlertStatistics(MOCK_PRICE_ALERTS, MOCK_NOTIFICATIONS);
      expect(stats.totalAlerts).toBe(MOCK_PRICE_ALERTS.length);
      expect(stats.activeAlerts).toBeGreaterThan(0);
      expect(stats.triggeredAlerts).toBeGreaterThan(0);
    });

    it('should count notifications correctly', () => {
      const stats = calculateAlertStatistics(MOCK_PRICE_ALERTS, MOCK_NOTIFICATIONS);
      expect(stats.totalNotifications).toBe(MOCK_NOTIFICATIONS.length);
      expect(stats.unreadNotifications).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty arrays', () => {
      const stats = calculateAlertStatistics([], []);
      expect(stats.totalAlerts).toBe(0);
      expect(stats.totalNotifications).toBe(0);
    });
  });

  describe('validateAlert', () => {
    it('should validate price_above alert', () => {
      const result = validateAlert('price_above', { targetPrice: 3000 });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid price_above alert', () => {
      const result = validateAlert('price_above', { targetPrice: -100 });
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate price_change_percent alert', () => {
      const result = validateAlert('price_change_percent', { percentChange: 10 });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid price_change_percent alert', () => {
      const result = validateAlert('price_change_percent', { percentChange: 0 });
      expect(result.valid).toBe(false);
    });

    it('should validate portfolio_milestone alert', () => {
      const result = validateAlert('portfolio_milestone', { targetValue: 10000 });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid portfolio_milestone alert', () => {
      const result = validateAlert('portfolio_milestone', { targetValue: -5000 });
      expect(result.valid).toBe(false);
    });
  });

  describe('formatPrice', () => {
    it('should format prices correctly', () => {
      expect(formatPrice(100)).toBe('$100.00');
      expect(formatPrice(1500)).toBe('$1.50K');
      expect(formatPrice(50000)).toBe('$50.00K');
    });

    it('should handle edge cases', () => {
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice(0.5)).toBe('$0.50');
      expect(formatPrice(999.99)).toBe('$999.99');
    });
  });

  describe('Mock Data', () => {
    it('should have valid mock price alerts', () => {
      MOCK_PRICE_ALERTS.forEach((alert) => {
        expect(alert.id).toBeDefined();
        expect(alert.type).toBeDefined();
        expect(alert.asset).toBeDefined();
        expect(alert.status).toMatch(/active|triggered|disabled/);
      });
    });

    it('should have valid mock notifications', () => {
      MOCK_NOTIFICATIONS.forEach((notification) => {
        expect(notification.id).toBeDefined();
        expect(notification.alertId).toBeDefined();
        expect(notification.title).toBeDefined();
        expect(notification.body).toBeDefined();
      });
    });
  });

  describe('Alert Triggering Scenarios', () => {
    it('should handle multiple alert types correctly', () => {
      const alerts: PriceAlert[] = [
        {
          id: '1',
          type: 'price_above',
          asset: 'ETH',
          targetPrice: 3000,
          currentPrice: 2500,
          status: 'active',
          createdAt: Date.now(),
          notificationSent: false,
        },
        {
          id: '2',
          type: 'price_below',
          asset: 'BTC',
          targetPrice: 40000,
          currentPrice: 45000,
          status: 'active',
          createdAt: Date.now(),
          notificationSent: false,
        },
      ];

      const triggered1 = shouldTriggerAlert(alerts[0], 3500);
      const triggered2 = shouldTriggerAlert(alerts[1], 35000);

      expect(triggered1).toBe(true);
      expect(triggered2).toBe(true);
    });

    it('should not trigger already triggered alerts', () => {
      const alert: PriceAlert = {
        id: '1',
        type: 'price_above',
        asset: 'ETH',
        targetPrice: 3000,
        currentPrice: 2500,
        status: 'triggered',
        createdAt: Date.now(),
        triggeredAt: Date.now(),
        notificationSent: true,
      };

      expect(shouldTriggerAlert(alert, 3500)).toBe(false);
    });
  });
});
