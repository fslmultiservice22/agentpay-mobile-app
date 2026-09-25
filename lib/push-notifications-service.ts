/**
 * Push Notifications Service
 * Handles local and remote push notifications
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
  type: 'transaction' | 'price_alert' | 'crash_report' | 'payment' | 'general';
}

export interface NotificationSettings {
  enabled: boolean;
  transactionsEnabled: boolean;
  priceAlertsEnabled: boolean;
  crashReportsEnabled: boolean;
  paymentsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'push_notifications';
const SETTINGS_STORAGE_KEY = 'notification_settings';

class PushNotificationsService {
  private notifications: Map<string, PushNotification> = new Map();
  private settings: NotificationSettings = {
    enabled: true,
    transactionsEnabled: true,
    priceAlertsEnabled: true,
    crashReportsEnabled: true,
    paymentsEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
  };

  constructor() {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    this.loadNotifications();
    this.loadSettings();
    this.setupNotificationHandlers();
  }

  /**
   * Initialize push notifications
   */
  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: this.settings.soundEnabled,
          shouldSetBadge: true,
        }),
      });

      // Get push token
      const token = await this.getPushToken();
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Get push token
   */
  async getPushToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Send local notification
   */
  async sendLocalNotification(notification: Omit<PushNotification, 'id' | 'timestamp' | 'read'>): Promise<PushNotification> {
    try {
      // Check if notifications are enabled for this type
      if (!this.isNotificationTypeEnabled(notification.type)) {
        return {
          ...notification,
          id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          read: false,
        };
      }

      const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Schedule notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: this.settings.soundEnabled ? 'default' : null,
        },
        trigger: { type: 'time', seconds: 1 },
      } as any);

      const pushNotification: PushNotification = {
        ...notification,
        id: notificationId,
        timestamp: Date.now(),
        read: false,
      };

      this.notifications.set(notificationId, pushNotification);
      await this.persistNotifications();

      return pushNotification;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      throw error;
    }
  }

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(
    amount: number,
    currency: string,
    counterparty: string,
    type: 'sent' | 'received'
  ): Promise<PushNotification> {
    const title = type === 'sent' ? 'Payment Sent' : 'Payment Received';
    const body = `${type === 'sent' ? 'Sent' : 'Received'} ${amount} ${currency} ${type === 'sent' ? 'to' : 'from'} ${counterparty}`;

    return this.sendLocalNotification({
      title,
      body,
      type: 'transaction',
      data: { amount, currency, counterparty, transactionType: type },
    });
  }

  /**
   * Send price alert notification
   */
  async sendPriceAlertNotification(
    symbol: string,
    currentPrice: number,
    targetPrice: number,
    direction: 'up' | 'down'
  ): Promise<PushNotification> {
    const title = `${symbol} Price Alert`;
    const body = `${symbol} has ${direction === 'up' ? 'reached' : 'dropped to'} $${currentPrice} (target: $${targetPrice})`;

    return this.sendLocalNotification({
      title,
      body,
      type: 'price_alert',
      data: { symbol, currentPrice, targetPrice, direction },
    });
  }

  /**
   * Send crash report notification
   */
  async sendCrashReportNotification(severity: string, message: string): Promise<PushNotification> {
    const title = 'App Error Detected';
    const body = `A ${severity} error has been reported: ${message.substring(0, 50)}...`;

    return this.sendLocalNotification({
      title,
      body,
      type: 'crash_report',
      data: { severity, message },
    });
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(status: 'pending' | 'completed' | 'failed', amount: number, currency: string): Promise<PushNotification> {
    const statusText = status === 'pending' ? 'Pending' : status === 'completed' ? 'Completed' : 'Failed';
    const title = `Payment ${statusText}`;
    const body = `Your payment of ${amount} ${currency} is ${status}`;

    return this.sendLocalNotification({
      title,
      body,
      type: 'payment',
      data: { status, amount, currency },
    });
  }

  /**
   * Get all notifications
   */
  getNotifications(): PushNotification[] {
    return Array.from(this.notifications.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(): number {
    return Array.from(this.notifications.values()).filter(n => !n.read).length;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      await this.persistNotifications();
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => (n.read = true));
    await this.persistNotifications();
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications.delete(notificationId);
    await this.persistNotifications();
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    this.notifications.clear();
    await this.persistNotifications();
  }

  /**
   * Get notification settings
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Update notification settings
   */
  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    await this.persistSettings();
  }

  /**
   * Check if notification type is enabled
   */
  private isNotificationTypeEnabled(type: PushNotification['type']): boolean {
    if (!this.settings.enabled) return false;

    switch (type) {
      case 'transaction':
        return this.settings.transactionsEnabled;
      case 'price_alert':
        return this.settings.priceAlertsEnabled;
      case 'crash_report':
        return this.settings.crashReportsEnabled;
      case 'payment':
        return this.settings.paymentsEnabled;
      default:
        return true;
    }
  }

  /**
   * Setup notification handlers
   */
  private setupNotificationHandlers(): void {
    // Handle notification received while app is in foreground
    this.notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
    });

    // Handle notification tapped
    this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    });
  }

  private notificationSubscription: any = null;
  private notificationResponseSubscription: any = null;

  /**
   * Cleanup notification handlers
   */
  cleanup(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
    }
    if (this.notificationResponseSubscription) {
      this.notificationResponseSubscription.remove();
    }
  }

  /**
   * Persist notifications to storage
   */
  private async persistNotifications(): Promise<void> {
    try {
      const data = Array.from(this.notifications.values());
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist notifications:', error);
    }
  }

  /**
   * Load notifications from storage
   */
  private async loadNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach((notification: PushNotification) => {
          this.notifications.set(notification.id, notification);
        });
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }

  /**
   * Persist settings to storage
   */
  private async persistSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to persist settings:', error);
    }
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        this.settings = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}

export const pushNotificationsService = new PushNotificationsService();
