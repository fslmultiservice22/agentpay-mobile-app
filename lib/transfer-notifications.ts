/**
 * Transfer Notifications Service
 * Handles push notifications for transfers
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
}

export interface TransferNotification {
  id: string;
  transactionId: string;
  type: 'pending' | 'processing' | 'completed' | 'failed';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

class TransferNotificationsService {
  private notifications: Map<string, TransferNotification> = new Map();
  private listeners: Set<(notification: TransferNotification) => void> =
    new Set();

  constructor() {
    this.initializeNotifications();
  }

  private async initializeNotifications() {
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }

      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async sendTransferNotification(
    transactionId: string,
    type: 'pending' | 'processing' | 'completed' | 'failed',
    amount: string
  ): Promise<TransferNotification> {
    const notification: TransferNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId,
      type,
      title: this.getNotificationTitle(type),
      message: this.getNotificationMessage(type, amount),
      timestamp: Date.now(),
      read: false,
    };

    this.notifications.set(notification.id, notification);

    // Send push notification
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: {
            transactionId,
            notificationId: notification.id,
          },
          sound: 'default',
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    // Notify listeners
    this.notifyListeners(notification);

    // Save to storage
    await this.saveNotification(notification);

    return notification;
  }

  private getNotificationTitle(type: string): string {
    switch (type) {
      case 'pending':
        return 'Trasferimento in Sospeso';
      case 'processing':
        return 'Trasferimento in Elaborazione';
      case 'completed':
        return 'Trasferimento Completato';
      case 'failed':
        return 'Trasferimento Fallito';
      default:
        return 'Notifica Trasferimento';
    }
  }

  private getNotificationMessage(type: string, amount: string): string {
    switch (type) {
      case 'pending':
        return `Trasferimento di ${amount} in sospeso`;
      case 'processing':
        return `Trasferimento di ${amount} in elaborazione`;
      case 'completed':
        return `Trasferimento di ${amount} completato con successo`;
      case 'failed':
        return `Trasferimento di ${amount} non riuscito`;
      default:
        return `Trasferimento di ${amount}`;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      await this.saveNotification(notification);
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    this.notifications.delete(notificationId);
    await AsyncStorage.removeItem(`notification_${notificationId}`);
  }

  async clearAllNotifications(): Promise<void> {
    this.notifications.clear();
    const keys = await AsyncStorage.getAllKeys();
    const notificationKeys = keys.filter((key) =>
      key.startsWith('notification_')
    );
    await AsyncStorage.multiRemove(notificationKeys);
  }

  getNotifications(): TransferNotification[] {
    return Array.from(this.notifications.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );
  }

  getUnreadNotifications(): TransferNotification[] {
    return this.getNotifications().filter((n) => !n.read);
  }

  getUnreadCount(): number {
    return this.getUnreadNotifications().length;
  }

  subscribe(
    listener: (notification: TransferNotification) => void
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(notification: TransferNotification) {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  private async saveNotification(
    notification: TransferNotification
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `notification_${notification.id}`,
        JSON.stringify(notification)
      );
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  async loadNotifications(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const notificationKeys = keys.filter((key) =>
        key.startsWith('notification_')
      );

      const values = await AsyncStorage.multiGet(notificationKeys);
      values.forEach(([key, value]) => {
        if (value) {
          const notification = JSON.parse(value) as TransferNotification;
          this.notifications.set(notification.id, notification);
        }
      });
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }
}

export const transferNotificationsService = new TransferNotificationsService();
