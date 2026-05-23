/**
 * Push Notifications Service
 * Handle push notifications for transactions and alerts
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export enum NotificationType {
  TRANSACTION = 'transaction',
  PRICE_ALERT = 'price_alert',
  SECURITY = 'security',
  PROMOTION = 'promotion',
  INFO = 'info',
}

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
}

export interface NotificationSettings {
  enabled?: boolean;
  transactions?: boolean;
  priceAlerts?: boolean;
  security?: boolean;
  promotions?: boolean;
}

const NOTIFICATIONS_STORAGE_KEY = 'agentpay_notifications';
const NOTIFICATION_SETTINGS_KEY = 'agentpay_notification_settings';

class PushNotificationService {
  private notifications: PushNotification[] = [];
  private settings: NotificationSettings = {
    enabled: true,
    transactions: true,
    priceAlerts: true,
    security: true,
    promotions: false,
  } as NotificationSettings;

  async initialize(): Promise<void> {
    try {
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        } as any),
      });

      // Load settings
      await this.loadSettings();

      // Load notifications
      await this.loadNotifications();

      console.log('✅ Push notifications initialized');
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Failed to request notification permissions:', error);
      return false;
    }
  }

  async sendNotification(notification: Omit<PushNotification, 'id' | 'timestamp' | 'read'>): Promise<void> {
    try {
      // Check if notifications are enabled for this type
      if (!this.isNotificationTypeEnabled(notification.type)) {
        return;
      }

      const fullNotification: PushNotification = {
        ...notification,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        read: false,
      };

      // Add to local storage
      this.notifications.unshift(fullNotification);
      await this.saveNotifications();

      // Send local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: {
            notificationId: fullNotification.id,
            ...notification.data,
          },
          badge: this.getUnreadCount(),
        },
        trigger: null,
      });
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
    }
  }

  private isNotificationTypeEnabled(type: NotificationType): boolean {
    if (!this.settings.enabled) return false;

    switch (type) {
      case NotificationType.TRANSACTION:
        return this.settings.transactions ?? true;
      case NotificationType.PRICE_ALERT:
        return this.settings.priceAlerts ?? true;
      case NotificationType.SECURITY:
        return this.settings.security ?? true;
      case NotificationType.PROMOTION:
        return this.settings.promotions ?? false;
      default:
        return true;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      await this.saveNotifications();
    }
  }

  async markAllAsRead(): Promise<void> {
    this.notifications.forEach((n) => {
      n.read = true;
    });
    await this.saveNotifications();
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications = this.notifications.filter((n) => n.id !== notificationId);
    await this.saveNotifications();
  }

  async clearAllNotifications(): Promise<void> {
    this.notifications = [];
    await this.saveNotifications();
  }

  getNotifications(): PushNotification[] {
    return this.notifications;
  }

  getUnreadNotifications(): PushNotification[] {
    return this.notifications.filter((n) => !n.read);
  }

  getUnreadCount(): number {
    return this.getUnreadNotifications().length;
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings } as NotificationSettings;
    await this.saveSettings();
  }

  getSettings(): NotificationSettings {
    return this.settings;
  }

  private async saveNotifications(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('❌ Failed to save notifications:', error);
    }
  }

  private async loadNotifications(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (data) {
        this.notifications = JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('❌ Failed to save notification settings:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (data) {
        this.settings = { ...this.settings, ...JSON.parse(data) };
      }
    } catch (error) {
      console.error('❌ Failed to load notification settings:', error);
    }
  }
}

// Singleton instance
let notificationService: PushNotificationService | null = null;

export function getPushNotificationService(): PushNotificationService {
  if (!notificationService) {
    notificationService = new PushNotificationService();
  }
  return notificationService;
}

export async function initializePushNotifications(): Promise<PushNotificationService> {
  const service = getPushNotificationService();
  await service.initialize();
  return service;
}
