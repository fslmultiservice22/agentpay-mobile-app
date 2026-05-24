/**
 * Mobile App Notifications Center Service
 * Unified notification hub with filtering, search, and preferences
 */

export interface Notification {
  id: string;
  userId: string;
  type: 'portfolio' | 'trade' | 'referral' | 'community' | 'system' | 'alert';
  title: string;
  message: string;
  icon?: string;
  data?: Record<string, any>;
  isRead: boolean;
  isPinned: boolean;
  createdAt: number;
  expiresAt?: number;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationPreference {
  userId: string;
  enablePortfolioNotifications: boolean;
  enableTradeNotifications: boolean;
  enableReferralNotifications: boolean;
  enableCommunityNotifications: boolean;
  enableSystemNotifications: boolean;
  enableAlerts: boolean;
  quietHours: { start: number; end: number } | null;
  notificationChannels: ('push' | 'email' | 'sms')[];
}

export interface NotificationFilter {
  type?: Notification['type'];
  isRead?: boolean;
  isPinned?: boolean;
  startDate?: number;
  endDate?: number;
  searchQuery?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  todayCount: number;
  weekCount: number;
}

class NotificationsCenterService {
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreference> = new Map();

  /**
   * Create notification
   */
  createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: Record<string, any>,
    actionUrl?: string,
    actionLabel?: string
  ): Notification {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const notification: Notification = {
      id: notificationId,
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
      isPinned: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      actionUrl,
      actionLabel,
    };

    this.notifications.set(notificationId, notification);

    return notification;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.isRead = true;

    return true;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): number {
    let count = 0;

    this.notifications.forEach(notif => {
      if (notif.userId === userId && !notif.isRead) {
        notif.isRead = true;
        count++;
      }
    });

    return count;
  }

  /**
   * Pin notification
   */
  pinNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.isPinned = true;

    return true;
  }

  /**
   * Unpin notification
   */
  unpinNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.isPinned = false;

    return true;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  /**
   * Delete all notifications
   */
  deleteAllNotifications(userId: string): number {
    let count = 0;

    const toDelete: string[] = [];
    this.notifications.forEach((notif, id) => {
      if (notif.userId === userId) {
        toDelete.push(id);
        count++;
      }
    });

    toDelete.forEach(id => this.notifications.delete(id));

    return count;
  }

  /**
   * Get user notifications with filtering
   */
  getUserNotifications(userId: string, filter?: NotificationFilter, limit: number = 50): Notification[] {
    let notifications = Array.from(this.notifications.values()).filter(n => n.userId === userId);

    // Apply filters
    if (filter) {
      if (filter.type) {
        notifications = notifications.filter(n => n.type === filter.type);
      }

      if (filter.isRead !== undefined) {
        notifications = notifications.filter(n => n.isRead === filter.isRead);
      }

      if (filter.isPinned !== undefined) {
        notifications = notifications.filter(n => n.isPinned === filter.isPinned);
      }

      if (filter.startDate) {
        notifications = notifications.filter(n => n.createdAt >= filter.startDate!);
      }

      if (filter.endDate) {
        notifications = notifications.filter(n => n.createdAt <= filter.endDate!);
      }

      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        notifications = notifications.filter(
          n =>
            n.title.toLowerCase().includes(query) ||
            n.message.toLowerCase().includes(query)
        );
      }
    }

    // Sort: pinned first, then by date
    notifications.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    });

    return notifications.slice(0, limit);
  }

  /**
   * Get notification stats
   */
  getNotificationStats(userId: string): NotificationStats {
    const userNotifications = Array.from(this.notifications.values()).filter(n => n.userId === userId);

    const now = Date.now();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;

    const stats: NotificationStats = {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.isRead).length,
      byType: {},
      todayCount: userNotifications.filter(n => n.createdAt >= todayStart).length,
      weekCount: userNotifications.filter(n => n.createdAt >= weekStart).length,
    };

    // Count by type
    userNotifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Set notification preferences
   */
  setNotificationPreferences(userId: string, preferences: Partial<NotificationPreference>): NotificationPreference {
    let userPrefs = this.preferences.get(userId);

    if (!userPrefs) {
      userPrefs = {
        userId,
        enablePortfolioNotifications: true,
        enableTradeNotifications: true,
        enableReferralNotifications: true,
        enableCommunityNotifications: true,
        enableSystemNotifications: true,
        enableAlerts: true,
        quietHours: null,
        notificationChannels: ['push', 'email'],
      };
    }

    // Update preferences
    Object.assign(userPrefs, preferences);

    this.preferences.set(userId, userPrefs);

    return userPrefs;
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences(userId: string): NotificationPreference {
    return (
      this.preferences.get(userId) || {
        userId,
        enablePortfolioNotifications: true,
        enableTradeNotifications: true,
        enableReferralNotifications: true,
        enableCommunityNotifications: true,
        enableSystemNotifications: true,
        enableAlerts: true,
        quietHours: null,
        notificationChannels: ['push', 'email'],
      }
    );
  }

  /**
   * Check if notification should be sent based on preferences
   */
  shouldSendNotification(userId: string, type: Notification['type']): boolean {
    const prefs = this.getNotificationPreferences(userId);

    switch (type) {
      case 'portfolio':
        return prefs.enablePortfolioNotifications;
      case 'trade':
        return prefs.enableTradeNotifications;
      case 'referral':
        return prefs.enableReferralNotifications;
      case 'community':
        return prefs.enableCommunityNotifications;
      case 'system':
        return prefs.enableSystemNotifications;
      case 'alert':
        return prefs.enableAlerts;
      default:
        return true;
    }
  }

  /**
   * Check if in quiet hours
   */
  isInQuietHours(userId: string): boolean {
    const prefs = this.getNotificationPreferences(userId);
    if (!prefs.quietHours) return false;

    const now = new Date();
    const currentHour = now.getHours();

    const { start, end } = prefs.quietHours;

    if (start < end) {
      return currentHour >= start && currentHour < end;
    } else {
      // Quiet hours span midnight
      return currentHour >= start || currentHour < end;
    }
  }

  /**
   * Get notification by ID
   */
  getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Get pinned notifications
   */
  getPinnedNotifications(userId: string, limit: number = 10): Notification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && n.isPinned)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get unread count
   */
  getUnreadCount(userId: string): number {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId && !n.isRead).length;
  }

  /**
   * Clean expired notifications
   */
  cleanExpiredNotifications(): number {
    const now = Date.now();
    let count = 0;

    const toDelete: string[] = [];
    this.notifications.forEach((notif, id) => {
      if (notif.expiresAt && notif.expiresAt < now) {
        toDelete.push(id);
        count++;
      }
    });

    toDelete.forEach(id => this.notifications.delete(id));

    return count;
  }
}

export const notificationsCenterService = new NotificationsCenterService();
