/**
 * Push Notification Dashboard Service
 * Real-time notification center with read/unread status and archiving
 */

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'portfolio_alert' | 'trade_recommendation' | 'referral_update' | 'payment_confirmation' | 'security_alert' | 'system_update';
  title: string;
  message: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  isRead: boolean;
  isArchived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  data: Record<string, any>;
  createdAt: number;
  readAt?: number;
  archivedAt?: number;
}

export interface NotificationPreference {
  userId: string;
  enablePortfolioAlerts: boolean;
  enableTradeRecommendations: boolean;
  enableReferralUpdates: boolean;
  enablePaymentConfirmations: boolean;
  enableSecurityAlerts: boolean;
  enableSystemUpdates: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  groupByType: boolean;
}

export interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  readCount: number;
  archivedCount: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

class PushNotificationDashboardService {
  private notifications: Map<string, NotificationItem> = new Map();
  private preferences: Map<string, NotificationPreference> = new Map();

  /**
   * Create notification
   */
  createNotification(
    userId: string,
    type: NotificationItem['type'],
    title: string,
    message: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
    data: Record<string, any> = {},
    actionUrl?: string,
    actionLabel?: string
  ): NotificationItem {
    const notification: NotificationItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      icon: this.getIconForType(type),
      priority,
      isRead: false,
      isArchived: false,
      actionUrl,
      actionLabel,
      data,
      createdAt: Date.now(),
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  /**
   * Get icon for notification type
   */
  private getIconForType(type: string): string {
    const iconMap: Record<string, string> = {
      portfolio_alert: '📊',
      trade_recommendation: '📈',
      referral_update: '🎁',
      payment_confirmation: '✅',
      security_alert: '🔒',
      system_update: '⚙️',
    };
    return iconMap[type] || '📢';
  }

  /**
   * Get all notifications for user
   */
  getUserNotifications(userId: string, includeArchived: boolean = false): NotificationItem[] {
    let userNotifications = Array.from(this.notifications.values()).filter(n => n.userId === userId);

    if (!includeArchived) {
      userNotifications = userNotifications.filter(n => !n.isArchived);
    }

    return userNotifications.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(userId: string): NotificationItem[] {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead && !n.isArchived)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.isRead = true;
    notification.readAt = Date.now();
    return true;
  }

  /**
   * Mark multiple notifications as read
   */
  markMultipleAsRead(notificationIds: string[]): number {
    let count = 0;
    for (const id of notificationIds) {
      if (this.markAsRead(id)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(userId: string): number {
    const unreadNotifications = this.getUnreadNotifications(userId);
    return this.markMultipleAsRead(unreadNotifications.map(n => n.id));
  }

  /**
   * Archive notification
   */
  archiveNotification(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    notification.isArchived = true;
    notification.archivedAt = Date.now();
    return true;
  }

  /**
   * Archive multiple notifications
   */
  archiveMultiple(notificationIds: string[]): number {
    let count = 0;
    for (const id of notificationIds) {
      if (this.archiveNotification(id)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): boolean {
    return this.notifications.delete(notificationId);
  }

  /**
   * Clear all archived notifications
   */
  clearArchivedNotifications(userId: string): number {
    const archivedNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId && n.isArchived);

    let count = 0;
    for (const notification of archivedNotifications) {
      if (this.deleteNotification(notification.id)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(userId: string): NotificationStats {
    const userNotifications = this.getUserNotifications(userId, true);

    const stats: NotificationStats = {
      totalNotifications: userNotifications.length,
      unreadCount: userNotifications.filter(n => !n.isRead).length,
      readCount: userNotifications.filter(n => n.isRead).length,
      archivedCount: userNotifications.filter(n => n.isArchived).length,
      byType: {},
      byPriority: {},
    };

    for (const notification of userNotifications) {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
    }

    return stats;
  }

  /**
   * Set notification preferences
   */
  setNotificationPreferences(userId: string, preferences: Partial<NotificationPreference>): NotificationPreference {
    const existing = this.preferences.get(userId) || {
      userId,
      enablePortfolioAlerts: true,
      enableTradeRecommendations: true,
      enableReferralUpdates: true,
      enablePaymentConfirmations: true,
      enableSecurityAlerts: true,
      enableSystemUpdates: true,
      soundEnabled: true,
      vibrationEnabled: true,
      groupByType: false,
    };

    const updated = { ...existing, ...preferences };
    this.preferences.set(userId, updated);

    return updated;
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences(userId: string): NotificationPreference | undefined {
    return this.preferences.get(userId);
  }

  /**
   * Filter notifications by type
   */
  filterByType(userId: string, type: NotificationItem['type']): NotificationItem[] {
    return this.getUserNotifications(userId).filter(n => n.type === type);
  }

  /**
   * Filter notifications by priority
   */
  filterByPriority(userId: string, priority: 'high' | 'medium' | 'low'): NotificationItem[] {
    return this.getUserNotifications(userId).filter(n => n.priority === priority);
  }

  /**
   * Get notifications by date range
   */
  getNotificationsByDateRange(userId: string, startDate: number, endDate: number): NotificationItem[] {
    return this.getUserNotifications(userId).filter(
      n => n.createdAt >= startDate && n.createdAt <= endDate
    );
  }

  /**
   * Search notifications
   */
  searchNotifications(userId: string, query: string): NotificationItem[] {
    const lowerQuery = query.toLowerCase();
    return this.getUserNotifications(userId).filter(
      n => n.title.toLowerCase().includes(lowerQuery) ||
           n.message.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get grouped notifications
   */
  getGroupedNotifications(userId: string): Record<string, NotificationItem[]> {
    const notifications = this.getUserNotifications(userId);
    const grouped: Record<string, NotificationItem[]> = {};

    for (const notification of notifications) {
      const key = notification.type;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(notification);
    }

    return grouped;
  }

  /**
   * Get recent notifications
   */
  getRecentNotifications(userId: string, limit: number = 10): NotificationItem[] {
    return this.getUserNotifications(userId).slice(0, limit);
  }

  /**
   * Get notification by ID
   */
  getNotificationById(notificationId: string): NotificationItem | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Perform action on notification
   */
  performAction(notificationId: string): boolean {
    const notification = this.notifications.get(notificationId);
    if (!notification || !notification.actionUrl) return false;

    // Mark as read when action is performed
    this.markAsRead(notificationId);
    return true;
  }

  /**
   * Export notifications
   */
  exportNotifications(userId: string, format: 'csv' | 'json'): string {
    const notifications = this.getUserNotifications(userId, true);

    if (format === 'json') {
      return JSON.stringify(notifications, null, 2);
    }

    // CSV format
    let csv = 'Id,Type,Title,Message,Priority,IsRead,IsArchived,CreatedAt\n';
    for (const notification of notifications) {
      csv += `${notification.id},${notification.type},${notification.title},${notification.message},${notification.priority},${notification.isRead},${notification.isArchived},${notification.createdAt}\n`;
    }

    return csv;
  }
}

export const pushNotificationDashboardService = new PushNotificationDashboardService();
