/**
 * Mobile Push Notifications Service
 * Firebase Cloud Messaging integration for mobile notifications
 */

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  timestamp: number;
  read: boolean;
  type: 'price_alert' | 'transaction' | 'portfolio' | 'reward' | 'social';
  actionUrl?: string;
}

export interface NotificationPreferences {
  priceAlerts: boolean;
  transactionAlerts: boolean;
  portfolioAlerts: boolean;
  rewardAlerts: boolean;
  socialAlerts: boolean;
  quietHours: { start: number; end: number } | null;
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
}

export interface NotificationStats {
  totalSent: number;
  totalRead: number;
  readRate: number;
  byType: Record<string, number>;
  byDay: Record<string, number>;
}

class PushNotificationsFirebaseService {
  private notifications: Map<string, PushNotification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private deviceTokens: Map<string, string[]> = new Map();
  private notificationQueue: PushNotification[] = [];

  constructor() {
    this.initializeDefaultPreferences();
  }

  /**
   * Initialize default notification preferences
   */
  private initializeDefaultPreferences(): void {
    const defaultPrefs: NotificationPreferences = {
      priceAlerts: true,
      transactionAlerts: true,
      portfolioAlerts: true,
      rewardAlerts: true,
      socialAlerts: true,
      quietHours: null,
      frequency: 'instant',
    };

    this.preferences.set('default', defaultPrefs);
  }

  /**
   * Register device token
   */
  registerDeviceToken(userId: string, token: string): void {
    if (!this.deviceTokens.has(userId)) {
      this.deviceTokens.set(userId, []);
    }

    const tokens = this.deviceTokens.get(userId)!;
    if (!tokens.includes(token)) {
      tokens.push(token);
    }
  }

  /**
   * Unregister device token
   */
  unregisterDeviceToken(userId: string, token: string): void {
    const tokens = this.deviceTokens.get(userId);
    if (tokens) {
      const index = tokens.indexOf(token);
      if (index > -1) {
        tokens.splice(index, 1);
      }
    }
  }

  /**
   * Send price alert notification
   */
  sendPriceAlert(
    userId: string,
    symbol: string,
    currentPrice: number,
    targetPrice: number,
    direction: 'above' | 'below'
  ): PushNotification {
    const notification: PushNotification = {
      id: `notif_${Date.now()}`,
      title: `${symbol} Price Alert`,
      body: `${symbol} is now ${direction === 'above' ? 'above' : 'below'} $${targetPrice.toFixed(2)} (Current: $${currentPrice.toFixed(2)})`,
      data: {
        type: 'price_alert',
        symbol,
        price: currentPrice.toString(),
      },
      timestamp: Date.now(),
      read: false,
      type: 'price_alert',
      actionUrl: `/price/${symbol}`,
    };

    this.queueNotification(userId, notification);
    return notification;
  }

  /**
   * Send transaction notification
   */
  sendTransactionNotification(
    userId: string,
    txType: 'sent' | 'received' | 'swap',
    amount: string,
    symbol: string,
    hash?: string
  ): PushNotification {
    const titles = {
      sent: `Sent ${symbol}`,
      received: `Received ${symbol}`,
      swap: `Swapped ${symbol}`,
    };

    const bodies = {
      sent: `You sent ${amount} ${symbol}`,
      received: `You received ${amount} ${symbol}`,
      swap: `You swapped ${amount} ${symbol}`,
    };

    const notification: PushNotification = {
      id: `notif_${Date.now()}`,
      title: titles[txType],
      body: bodies[txType],
      data: {
        type: 'transaction',
        txType,
        amount,
        symbol,
        hash: hash || '',
      },
      timestamp: Date.now(),
      read: false,
      type: 'transaction',
      actionUrl: hash ? `/transaction/${hash}` : undefined,
    };

    this.queueNotification(userId, notification);
    return notification;
  }

  /**
   * Send portfolio milestone notification
   */
  sendPortfolioMilestone(
    userId: string,
    milestone: 'all_time_high' | 'recovery' | 'target_reached',
    value: number
  ): PushNotification {
    const titles = {
      all_time_high: '🎉 All-Time High!',
      recovery: '📈 Portfolio Recovery',
      target_reached: '🎯 Target Reached',
    };

    const bodies = {
      all_time_high: `Your portfolio reached an all-time high of $${value.toFixed(2)}!`,
      recovery: `Your portfolio has recovered to $${value.toFixed(2)}!`,
      target_reached: `Your portfolio target of $${value.toFixed(2)} has been reached!`,
    };

    const notification: PushNotification = {
      id: `notif_${Date.now()}`,
      title: titles[milestone],
      body: bodies[milestone],
      data: {
        type: 'portfolio',
        milestone,
        value: value.toString(),
      },
      timestamp: Date.now(),
      read: false,
      type: 'portfolio',
      actionUrl: '/portfolio',
    };

    this.queueNotification(userId, notification);
    return notification;
  }

  /**
   * Send reward notification
   */
  sendRewardNotification(userId: string, amount: string, symbol: string): PushNotification {
    const notification: PushNotification = {
      id: `notif_${Date.now()}`,
      title: `${symbol} Reward Earned`,
      body: `You earned ${amount} ${symbol} as a reward!`,
      data: {
        type: 'reward',
        amount,
        symbol,
      },
      timestamp: Date.now(),
      read: false,
      type: 'reward',
      actionUrl: '/rewards',
    };

    this.queueNotification(userId, notification);
    return notification;
  }

  /**
   * Send social notification
   */
  sendSocialNotification(
    userId: string,
    fromUser: string,
    action: 'follow' | 'like' | 'comment' | 'share',
    content?: string
  ): PushNotification {
    const titles = {
      follow: `${fromUser} followed you`,
      like: `${fromUser} liked your post`,
      comment: `${fromUser} commented on your post`,
      share: `${fromUser} shared your strategy`,
    };

    const bodies = {
      follow: `${fromUser} is now following your portfolio!`,
      like: `${fromUser} liked your post: "${content || 'Your trading strategy'}"`,
      comment: `${fromUser} commented: "${content || 'Great strategy!'}"`,
      share: `${fromUser} shared your strategy with their followers!`,
    };

    const notification: PushNotification = {
      id: `notif_${Date.now()}`,
      title: titles[action],
      body: bodies[action],
      data: {
        type: 'social',
        action,
        fromUser,
      },
      timestamp: Date.now(),
      read: false,
      type: 'social',
      actionUrl: `/social/${fromUser}`,
    };

    this.queueNotification(userId, notification);
    return notification;
  }

  /**
   * Queue notification for sending
   */
  private queueNotification(userId: string, notification: PushNotification): void {
    this.notifications.set(notification.id, notification);
    this.notificationQueue.push(notification);

    // Check quiet hours
    const prefs = this.preferences.get(userId) || this.preferences.get('default')!;
    if (prefs.quietHours) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= prefs.quietHours.start && currentHour < prefs.quietHours.end) {
        return; // Don't send during quiet hours
      }
    }

    // Send to device tokens
    this.sendToDevices(userId, notification);
  }

  /**
   * Send notification to devices
   */
  private sendToDevices(userId: string, notification: PushNotification): void {
    const tokens = this.deviceTokens.get(userId) || [];
    tokens.forEach(token => {
      // Mock Firebase send
      console.log(`[Firebase] Sending notification to ${token}:`, notification.title);
    });
  }

  /**
   * Get notifications
   */
  getNotifications(userId: string, limit: number = 20): PushNotification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead(): void {
    this.notifications.forEach(notif => {
      notif.read = true;
    });
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    this.notifications.delete(notificationId);
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || this.preferences.get('default')!;
  }

  /**
   * Update notification preferences
   */
  updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): void {
    const current = this.getPreferences(userId);
    this.preferences.set(userId, { ...current, ...prefs });
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): NotificationStats {
    const notifications = Array.from(this.notifications.values());
    const totalSent = notifications.length;
    const totalRead = notifications.filter(n => n.read).length;
    const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

    const byType: Record<string, number> = {};
    const byDay: Record<string, number> = {};

    notifications.forEach(notif => {
      byType[notif.type] = (byType[notif.type] || 0) + 1;

      const day = new Date(notif.timestamp).toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    return {
      totalSent,
      totalRead,
      readRate: parseFloat(readRate.toFixed(2)),
      byType,
      byDay,
    };
  }

  /**
   * Clear old notifications
   */
  clearOldNotifications(daysOld: number = 30): number {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deleted = 0;

    this.notifications.forEach((notif, id) => {
      if (notif.timestamp < cutoffTime) {
        this.notifications.delete(id);
        deleted++;
      }
    });

    return deleted;
  }
}

export const pushNotificationsService = new PushNotificationsFirebaseService();
