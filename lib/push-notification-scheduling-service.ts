/**
 * Push Notification Scheduling Service
 * Scheduled notifications for recurring events
 */

export interface ScheduledNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'daily_portfolio' | 'weekly_performance' | 'monthly_tax' | 'price_alert' | 'transaction' | 'custom';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once';
  scheduledTime: number; // Unix timestamp
  nextScheduledTime?: number;
  isActive: boolean;
  isRecurring: boolean;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timeOfDay?: string; // HH:mm format
  timezone?: string;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  lastSentAt?: number;
}

export interface NotificationSchedule {
  id: string;
  notifications: ScheduledNotification[];
  isActive: boolean;
  totalScheduled: number;
  totalSent: number;
  createdAt: number;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  notificationId: string;
  title: string;
  body: string;
  type: string;
  sentAt: number;
  deliveredAt?: number;
  readAt?: number;
  isDelivered: boolean;
  isRead: boolean;
}

class PushNotificationSchedulingService {
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private notificationSchedules: Map<string, NotificationSchedule> = new Map();
  private notificationHistory: Map<string, NotificationHistory> = new Map();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create scheduled notification
   */
  createScheduledNotification(
    userId: string,
    title: string,
    body: string,
    type: ScheduledNotification['type'],
    frequency: ScheduledNotification['frequency'],
    scheduledTime: number,
    metadata?: Record<string, any>
  ): ScheduledNotification {
    const notificationId = `notif_${Date.now()}`;

    const notification: ScheduledNotification = {
      id: notificationId,
      userId,
      title,
      body,
      type,
      frequency,
      scheduledTime,
      isActive: true,
      isRecurring: frequency !== 'once',
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.scheduledNotifications.set(notificationId, notification);

    // Schedule the notification
    this.scheduleNotification(notification);

    return notification;
  }

  /**
   * Schedule notification with cron-like pattern
   */
  scheduleNotification(notification: ScheduledNotification): void {
    const now = Date.now();
    let nextScheduledTime = notification.scheduledTime;

    // Calculate next scheduled time if in the past
    if (nextScheduledTime < now) {
      nextScheduledTime = this.calculateNextScheduledTime(notification);
    }

    const delay = nextScheduledTime - now;

    if (delay > 0) {
      const taskId = `task_${notification.id}`;

      const timeout = setTimeout(() => {
        this.sendScheduledNotification(notification);

        // Reschedule if recurring
        if (notification.isRecurring) {
          const nextNotification = { ...notification };
          nextNotification.scheduledTime = this.calculateNextScheduledTime(nextNotification);
          this.scheduleNotification(nextNotification);
        }
      }, delay);

      this.scheduledTasks.set(taskId, timeout);
    }
  }

  /**
   * Calculate next scheduled time based on frequency
   */
  private calculateNextScheduledTime(notification: ScheduledNotification): number {
    const now = new Date();
    let nextTime = new Date(notification.scheduledTime);

    switch (notification.frequency) {
      case 'daily':
        nextTime.setDate(nextTime.getDate() + 1);
        break;
      case 'weekly':
        nextTime.setDate(nextTime.getDate() + 7);
        break;
      case 'monthly':
        nextTime.setMonth(nextTime.getMonth() + 1);
        break;
      case 'yearly':
        nextTime.setFullYear(nextTime.getFullYear() + 1);
        break;
      case 'once':
        return notification.scheduledTime;
    }

    return nextTime.getTime();
  }

  /**
   * Send scheduled notification
   */
  private sendScheduledNotification(notification: ScheduledNotification): void {
    const historyId = `hist_${Date.now()}`;

    const history: NotificationHistory = {
      id: historyId,
      userId: notification.userId,
      notificationId: notification.id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      sentAt: Date.now(),
      isDelivered: true,
      isRead: false,
    };

    this.notificationHistory.set(historyId, history);

    // Update notification
    notification.lastSentAt = Date.now();
    notification.updatedAt = Date.now();
  }

  /**
   * Get scheduled notifications for user
   */
  getScheduledNotifications(userId: string): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values()).filter(n => n.userId === userId && n.isActive);
  }

  /**
   * Update scheduled notification
   */
  updateScheduledNotification(notificationId: string, updates: Partial<ScheduledNotification>): ScheduledNotification | null {
    const notification = this.scheduledNotifications.get(notificationId);
    if (!notification) return null;

    Object.assign(notification, updates, { updatedAt: Date.now() });

    // Reschedule if time changed
    if (updates.scheduledTime) {
      this.scheduleNotification(notification);
    }

    return notification;
  }

  /**
   * Cancel scheduled notification
   */
  cancelScheduledNotification(notificationId: string): boolean {
    const notification = this.scheduledNotifications.get(notificationId);
    if (!notification) return false;

    notification.isActive = false;
    notification.updatedAt = Date.now();

    // Cancel scheduled task
    const taskId = `task_${notificationId}`;
    const timeout = this.scheduledTasks.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledTasks.delete(taskId);
    }

    return true;
  }

  /**
   * Get notification history for user
   */
  getNotificationHistory(userId: string, limit: number = 50): NotificationHistory[] {
    const history = Array.from(this.notificationHistory.values()).filter(h => h.userId === userId);

    history.sort((a, b) => b.sentAt - a.sentAt);

    return history.slice(0, limit);
  }

  /**
   * Mark notification as delivered
   */
  markAsDelivered(historyId: string): boolean {
    const history = this.notificationHistory.get(historyId);
    if (!history) return false;

    history.isDelivered = true;
    history.deliveredAt = Date.now();

    return true;
  }

  /**
   * Mark notification as read
   */
  markAsRead(historyId: string): boolean {
    const history = this.notificationHistory.get(historyId);
    if (!history) return false;

    history.isRead = true;
    history.readAt = Date.now();

    return true;
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(userId: string): number {
    return Array.from(this.notificationHistory.values()).filter(h => h.userId === userId && !h.isRead).length;
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(userId: string): {
    totalScheduled: number;
    activeScheduled: number;
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    unreadCount: number;
  } {
    const scheduled = Array.from(this.scheduledNotifications.values()).filter(n => n.userId === userId);
    const history = Array.from(this.notificationHistory.values()).filter(h => h.userId === userId);

    return {
      totalScheduled: scheduled.length,
      activeScheduled: scheduled.filter(n => n.isActive).length,
      totalSent: history.length,
      totalDelivered: history.filter(h => h.isDelivered).length,
      totalRead: history.filter(h => h.isRead).length,
      unreadCount: history.filter(h => !h.isRead).length,
    };
  }

  /**
   * Create daily portfolio update notification
   */
  createDailyPortfolioNotification(userId: string, timeOfDay: string = '09:00'): ScheduledNotification {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);

    return this.createScheduledNotification(
      userId,
      'Daily Portfolio Update',
      'Your portfolio value has been updated. Tap to view details.',
      'daily_portfolio',
      'daily',
      tomorrow.getTime(),
      { timeOfDay }
    );
  }

  /**
   * Create weekly performance notification
   */
  createWeeklyPerformanceNotification(userId: string, dayOfWeek: number = 0, timeOfDay: string = '10:00'): ScheduledNotification {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + (dayOfWeek + 7 - nextWeek.getDay()) % 7);
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    nextWeek.setHours(hours, minutes, 0, 0);

    return this.createScheduledNotification(
      userId,
      'Weekly Performance Report',
      'Your weekly performance report is ready. Check your returns and insights.',
      'weekly_performance',
      'weekly',
      nextWeek.getTime(),
      { dayOfWeek, timeOfDay }
    );
  }

  /**
   * Create monthly tax notification
   */
  createMonthlyTaxNotification(userId: string, dayOfMonth: number = 1, timeOfDay: string = '09:00'): ScheduledNotification {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(dayOfMonth);
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    nextMonth.setHours(hours, minutes, 0, 0);

    return this.createScheduledNotification(
      userId,
      'Monthly Tax Summary',
      'Your monthly tax summary is ready. Review your capital gains and losses.',
      'monthly_tax',
      'monthly',
      nextMonth.getTime(),
      { dayOfMonth, timeOfDay }
    );
  }

  /**
   * Get active schedules
   */
  getActiveSchedules(): NotificationSchedule[] {
    const schedules: NotificationSchedule[] = [];

    const userIds = new Set(Array.from(this.scheduledNotifications.values()).map(n => n.userId));

    userIds.forEach(userId => {
      const userNotifications = Array.from(this.scheduledNotifications.values()).filter(n => n.userId === userId && n.isActive);

      if (userNotifications.length > 0) {
        const scheduleId = `schedule_${userId}`;
        const schedule: NotificationSchedule = {
          id: scheduleId,
          notifications: userNotifications,
          isActive: true,
          totalScheduled: userNotifications.length,
          totalSent: Array.from(this.notificationHistory.values()).filter(h => h.userId === userId).length,
          createdAt: Date.now(),
        };

        schedules.push(schedule);
      }
    });

    return schedules;
  }

  /**
   * Cleanup old notifications
   */
  cleanupOldNotifications(daysOld: number = 30): number {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    this.notificationHistory.forEach((history, key) => {
      if (history.sentAt < cutoffTime) {
        this.notificationHistory.delete(key);
        deletedCount++;
      }
    });

    return deletedCount;
  }
}

export const pushNotificationSchedulingService = new PushNotificationSchedulingService();
