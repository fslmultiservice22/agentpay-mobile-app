/**
 * Notifications Center Service
 * Manages in-app notifications for orders, rewards, leaderboard updates
 */

export type NotificationType = 'order' | 'reward' | 'leaderboard' | 'alert' | 'achievement' | 'system';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  icon?: string;
  action?: { label: string; route: string };
  read: boolean;
  createdAt: number;
  expiresAt?: number;
}

class NotificationsCenterService {
  private notifications: Map<string, Notification> = new Map();
  private listeners: ((notifications: Notification[]) => void)[] = [];

  /**
   * Initialize notifications center service
   */
  public async init(): Promise<void> {
    console.log('[NotificationsCenter] Service initialized');
  }

  /**
   * Add notification
   */
  public addNotification(
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'medium',
    icon?: string,
    action?: { label: string; route: string }
  ): Notification {
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      priority,
      icon,
      action,
      read: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    this.notifications.set(notification.id, notification);
    this.notifyListeners();

    console.log('[NotificationsCenter] Notification added:', notification);
    return notification;
  }

  /**
   * Get all notifications
   */
  public getAllNotifications(): Notification[] {
    return Array.from(this.notifications.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get unread notifications
   */
  public getUnreadNotifications(): Notification[] {
    return this.getAllNotifications().filter((n) => !n.read);
  }

  /**
   * Get notifications by type
   */
  public getNotificationsByType(type: NotificationType): Notification[] {
    return this.getAllNotifications().filter((n) => n.type === type);
  }

  /**
   * Get notifications by priority
   */
  public getNotificationsByPriority(priority: NotificationPriority): Notification[] {
    return this.getAllNotifications().filter((n) => n.priority === priority);
  }

  /**
   * Mark notification as read
   */
  public markAsRead(notificationId: string): Notification | null {
    const notification = this.notifications.get(notificationId);
    if (!notification) return null;

    notification.read = true;
    this.notifyListeners();

    console.log('[NotificationsCenter] Notification marked as read:', notificationId);
    return notification;
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): void {
    this.notifications.forEach((n) => {
      n.read = true;
    });
    this.notifyListeners();

    console.log('[NotificationsCenter] All notifications marked as read');
  }

  /**
   * Delete notification
   */
  public deleteNotification(notificationId: string): boolean {
    const result = this.notifications.delete(notificationId);
    if (result) {
      this.notifyListeners();
      console.log('[NotificationsCenter] Notification deleted:', notificationId);
    }
    return result;
  }

  /**
   * Clear expired notifications
   */
  public clearExpired(): void {
    const now = Date.now();
    let count = 0;

    this.notifications.forEach((n, id) => {
      if (n.expiresAt && n.expiresAt < now) {
        this.notifications.delete(id);
        count++;
      }
    });

    if (count > 0) {
      this.notifyListeners();
      console.log('[NotificationsCenter] Cleared', count, 'expired notifications');
    }
  }

  /**
   * Get unread count
   */
  public getUnreadCount(): number {
    return this.getUnreadNotifications().length;
  }

  /**
   * Get notification by ID
   */
  public getNotification(notificationId: string): Notification | undefined {
    return this.notifications.get(notificationId);
  }

  /**
   * Add listener for notification updates
   */
  public addListener(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    const notifications = this.getAllNotifications();
    this.listeners.forEach((listener) => {
      try {
        listener(notifications);
      } catch (error) {
        console.error('[NotificationsCenter] Error in listener:', error);
      }
    });
  }

  /**
   * Add order notification
   */
  public addOrderNotification(orderType: 'buy' | 'sell', symbol: string, amount: number, price: number): Notification {
    return this.addNotification(
      'order',
      `${orderType.toUpperCase()} Order Executed`,
      `${amount} ${symbol} at $${price.toFixed(2)}`,
      'high',
      '📊',
      { label: 'View Order', route: '/portfolio' }
    );
  }

  /**
   * Add reward notification
   */
  public addRewardNotification(rewardType: string, amount: number): Notification {
    return this.addNotification(
      'reward',
      'Reward Received',
      `You earned ${amount} ${rewardType}`,
      'high',
      '🎁',
      { label: 'Claim Reward', route: '/referral' }
    );
  }

  /**
   * Add leaderboard notification
   */
  public addLeaderboardNotification(rank: number, category: string): Notification {
    return this.addNotification(
      'leaderboard',
      'Leaderboard Update',
      `You reached rank #${rank} in ${category}`,
      'medium',
      '🏆',
      { label: 'View Leaderboard', route: '/leaderboard' }
    );
  }

  /**
   * Add achievement notification
   */
  public addAchievementNotification(achievement: string, description: string): Notification {
    return this.addNotification(
      'achievement',
      `Achievement Unlocked: ${achievement}`,
      description,
      'high',
      '⭐',
      { label: 'View Achievements', route: '/achievements' }
    );
  }

  /**
   * Add alert notification
   */
  public addAlertNotification(title: string, message: string): Notification {
    return this.addNotification('alert', title, message, 'critical', '⚠️');
  }

  /**
   * Add system notification
   */
  public addSystemNotification(title: string, message: string): Notification {
    return this.addNotification('system', title, message, 'low', '⚙️');
  }

  /**
   * Clear all notifications
   */
  public clearAll(): void {
    this.notifications.clear();
    this.notifyListeners();
    console.log('[NotificationsCenter] All notifications cleared');
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.listeners = [];
    console.log('[NotificationsCenter] Service cleaned up');
  }
}

// Export singleton instance
export const notificationsCenterService = new NotificationsCenterService();

/**
 * Hook to use notifications center service in components
 */
export function useNotificationsCenter() {
  return notificationsCenterService;
}
