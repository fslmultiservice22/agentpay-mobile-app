/**
 * Mobile App Widgets & Home Screen Shortcuts Service
 * iOS/Android widgets and home screen shortcuts
 */

export interface Widget {
  id: string;
  userId: string;
  type: 'portfolio-summary' | 'price-ticker' | 'quick-actions' | 'alerts' | 'news' | 'watchlist';
  platform: 'ios' | 'android' | 'both';
  size: 'small' | 'medium' | 'large';
  isActive: boolean;
  refreshInterval: number; // milliseconds
  lastRefreshed: number;
  configuration: Record<string, any>;
}

export interface HomeScreenShortcut {
  id: string;
  userId: string;
  title: string;
  icon: string;
  action: 'send-payment' | 'view-portfolio' | 'check-alerts' | 'trade' | 'view-signals' | 'open-stream';
  targetData?: Record<string, any>;
  isActive: boolean;
  position: number;
}

export interface WidgetData {
  widgetId: string;
  data: Record<string, any>;
  lastUpdated: number;
  expiresAt: number;
}

export interface WidgetNotification {
  id: string;
  widgetId: string;
  title: string;
  message: string;
  action?: string;
  timestamp: number;
  isRead: boolean;
}

export interface WidgetAnalytics {
  widgetId: string;
  impressions: number;
  taps: number;
  clickThroughRate: number;
  averageSessionDuration: number;
  lastUpdated: number;
}

class MobileWidgetsService {
  private widgets: Map<string, Widget[]> = new Map();
  private shortcuts: Map<string, HomeScreenShortcut[]> = new Map();
  private widgetData: Map<string, WidgetData> = new Map();
  private widgetNotifications: Map<string, WidgetNotification[]> = new Map();
  private widgetAnalytics: Map<string, WidgetAnalytics> = new Map();

  /**
   * Create widget
   */
  createWidget(
    userId: string,
    type: Widget['type'],
    platform: 'ios' | 'android' | 'both' = 'both',
    size: 'small' | 'medium' | 'large' = 'medium',
    refreshInterval: number = 5 * 60 * 1000, // 5 minutes
    configuration?: Record<string, any>
  ): Widget {
    const widgetId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const widget: Widget = {
      id: widgetId,
      userId,
      type,
      platform,
      size,
      isActive: true,
      refreshInterval,
      lastRefreshed: Date.now(),
      configuration: configuration || {},
    };

    if (!this.widgets.has(userId)) {
      this.widgets.set(userId, []);
    }

    this.widgets.get(userId)!.push(widget);

    // Initialize widget data
    this.widgetData.set(widgetId, {
      widgetId,
      data: this.getDefaultWidgetData(type),
      lastUpdated: Date.now(),
      expiresAt: Date.now() + refreshInterval,
    });

    // Initialize analytics
    this.widgetAnalytics.set(widgetId, {
      widgetId,
      impressions: 0,
      taps: 0,
      clickThroughRate: 0,
      averageSessionDuration: 0,
      lastUpdated: Date.now(),
    });

    return widget;
  }

  /**
   * Get default widget data
   */
  private getDefaultWidgetData(type: Widget['type']): Record<string, any> {
    switch (type) {
      case 'portfolio-summary':
        return {
          totalValue: 50000,
          change24h: 1250,
          changePercent: 2.5,
          topAsset: 'BTC',
        };
      case 'price-ticker':
        return {
          assets: [
            { symbol: 'BTC', price: 45000, change: 2.5 },
            { symbol: 'ETH', price: 2500, change: 1.8 },
            { symbol: 'SOL', price: 100, change: 3.2 },
          ],
        };
      case 'quick-actions':
        return {
          actions: [
            { title: 'Send', icon: 'send' },
            { title: 'Receive', icon: 'receive' },
            { title: 'Trade', icon: 'trade' },
            { title: 'Stake', icon: 'stake' },
          ],
        };
      case 'alerts':
        return {
          alerts: [
            { title: 'BTC above $45k', status: 'active' },
            { title: 'Portfolio +5%', status: 'active' },
          ],
          unreadCount: 2,
        };
      case 'news':
        return {
          articles: [
            { title: 'Bitcoin reaches new ATH', source: 'CoinDesk', timestamp: Date.now() },
            { title: 'Ethereum upgrade completed', source: 'The Block', timestamp: Date.now() },
          ],
        };
      case 'watchlist':
        return {
          assets: [
            { symbol: 'BTC', price: 45000, change: 2.5 },
            { symbol: 'ETH', price: 2500, change: 1.8 },
          ],
        };
      default:
        return {};
    }
  }

  /**
   * Get user widgets
   */
  getUserWidgets(userId: string): Widget[] {
    return this.widgets.get(userId) || [];
  }

  /**
   * Update widget
   */
  updateWidget(userId: string, widgetId: string, updates: Partial<Widget>): boolean {
    const userWidgets = this.widgets.get(userId);
    if (!userWidgets) return false;

    const widget = userWidgets.find(w => w.id === widgetId);
    if (!widget) return false;

    Object.assign(widget, updates);
    return true;
  }

  /**
   * Delete widget
   */
  deleteWidget(userId: string, widgetId: string): boolean {
    const userWidgets = this.widgets.get(userId);
    if (!userWidgets) return false;

    const index = userWidgets.findIndex(w => w.id === widgetId);
    if (index === -1) return false;

    userWidgets.splice(index, 1);
    this.widgetData.delete(widgetId);
    this.widgetAnalytics.delete(widgetId);

    return true;
  }

  /**
   * Create home screen shortcut
   */
  createShortcut(
    userId: string,
    title: string,
    action: HomeScreenShortcut['action'],
    icon: string = 'default',
    targetData?: Record<string, any>
  ): HomeScreenShortcut {
    const shortcutId = `shortcut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const shortcut: HomeScreenShortcut = {
      id: shortcutId,
      userId,
      title,
      icon,
      action,
      targetData,
      isActive: true,
      position: (this.shortcuts.get(userId) || []).length,
    };

    if (!this.shortcuts.has(userId)) {
      this.shortcuts.set(userId, []);
    }

    this.shortcuts.get(userId)!.push(shortcut);

    return shortcut;
  }

  /**
   * Get user shortcuts
   */
  getUserShortcuts(userId: string): HomeScreenShortcut[] {
    return (this.shortcuts.get(userId) || []).sort((a, b) => a.position - b.position);
  }

  /**
   * Reorder shortcuts
   */
  reorderShortcuts(userId: string, shortcutIds: string[]): boolean {
    const userShortcuts = this.shortcuts.get(userId);
    if (!userShortcuts) return false;

    const shortcutMap = new Map(userShortcuts.map(s => [s.id, s]));

    for (let i = 0; i < shortcutIds.length; i++) {
      const shortcut = shortcutMap.get(shortcutIds[i]);
      if (shortcut) {
        shortcut.position = i;
      }
    }

    return true;
  }

  /**
   * Delete shortcut
   */
  deleteShortcut(userId: string, shortcutId: string): boolean {
    const userShortcuts = this.shortcuts.get(userId);
    if (!userShortcuts) return false;

    const index = userShortcuts.findIndex(s => s.id === shortcutId);
    if (index === -1) return false;

    userShortcuts.splice(index, 1);

    // Reorder remaining shortcuts
    for (let i = 0; i < userShortcuts.length; i++) {
      userShortcuts[i].position = i;
    }

    return true;
  }

  /**
   * Update widget data
   */
  updateWidgetData(widgetId: string, data: Record<string, any>): boolean {
    const widgetData = this.widgetData.get(widgetId);
    if (!widgetData) return false;

    widgetData.data = data;
    widgetData.lastUpdated = Date.now();

    return true;
  }

  /**
   * Get widget data
   */
  getWidgetData(widgetId: string): WidgetData | undefined {
    return this.widgetData.get(widgetId);
  }

  /**
   * Record widget impression
   */
  recordWidgetImpression(widgetId: string): void {
    const analytics = this.widgetAnalytics.get(widgetId);
    if (analytics) {
      analytics.impressions += 1;
    }
  }

  /**
   * Record widget tap
   */
  recordWidgetTap(widgetId: string): void {
    const analytics = this.widgetAnalytics.get(widgetId);
    if (analytics) {
      analytics.taps += 1;
      analytics.clickThroughRate = (analytics.taps / analytics.impressions) * 100;
    }
  }

  /**
   * Get widget analytics
   */
  getWidgetAnalytics(widgetId: string): WidgetAnalytics | undefined {
    return this.widgetAnalytics.get(widgetId);
  }

  /**
   * Send widget notification
   */
  sendWidgetNotification(widgetId: string, title: string, message: string, action?: string): WidgetNotification {
    const notification: WidgetNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      widgetId,
      title,
      message,
      action,
      timestamp: Date.now(),
      isRead: false,
    };

    if (!this.widgetNotifications.has(widgetId)) {
      this.widgetNotifications.set(widgetId, []);
    }

    this.widgetNotifications.get(widgetId)!.push(notification);

    return notification;
  }

  /**
   * Get widget notifications
   */
  getWidgetNotifications(widgetId: string, unreadOnly: boolean = false): WidgetNotification[] {
    let notifications = this.widgetNotifications.get(widgetId) || [];

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.isRead);
    }

    return notifications.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(widgetId: string, notificationId: string): boolean {
    const notifications = this.widgetNotifications.get(widgetId);
    if (!notifications) return false;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return false;

    notification.isRead = true;
    return true;
  }

  /**
   * Get widget configuration options
   */
  getWidgetConfigurationOptions(type: Widget['type']): Record<string, any> {
    const options: Record<string, Record<string, any>> = {
      'portfolio-summary': {
        showPercentage: true,
        showChart: false,
        refreshInterval: 5 * 60 * 1000,
      },
      'price-ticker': {
        assets: ['BTC', 'ETH', 'SOL'],
        showChart: true,
        refreshInterval: 60 * 1000,
      },
      'quick-actions': {
        actions: ['send', 'receive', 'trade'],
        style: 'grid',
      },
      'alerts': {
        maxAlerts: 5,
        showExpired: false,
      },
      'news': {
        sources: ['CoinDesk', 'The Block'],
        maxArticles: 3,
      },
      'watchlist': {
        assets: ['BTC', 'ETH'],
        showChart: true,
      },
    };

    return options[type] || {};
  }
}

export const mobileWidgetsService = new MobileWidgetsService();
