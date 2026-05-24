/**
 * Real-Time Market Alerts & Notifications Service
 * Price alerts, sentiment tracking, whale monitoring
 */

export interface PriceAlert {
  id: string;
  userId: string;
  asset: string;
  type: 'above' | 'below' | 'change-percent';
  targetPrice?: number;
  changePercent?: number;
  isActive: boolean;
  createdAt: number;
  triggeredAt?: number;
  notificationChannels: ('push' | 'sms' | 'email')[];
}

export interface MarketSentiment {
  asset: string;
  sentiment: 'very-negative' | 'negative' | 'neutral' | 'positive' | 'very-positive';
  score: number; // -100 to 100
  sources: number;
  lastUpdated: number;
  trendingTopics: string[];
}

export interface WhaleTransaction {
  id: string;
  asset: string;
  type: 'buy' | 'sell';
  quantity: number;
  value: number;
  from: string;
  to: string;
  timestamp: number;
  isWhale: boolean;
  confidence: number;
}

export interface AlertNotification {
  id: string;
  userId: string;
  alertId: string;
  type: 'price' | 'sentiment' | 'whale' | 'market';
  title: string;
  message: string;
  asset: string;
  data: Record<string, any>;
  channels: ('push' | 'sms' | 'email')[];
  sentAt: number;
  read: boolean;
}

export interface MarketTrend {
  asset: string;
  trend: 'uptrend' | 'downtrend' | 'sideways';
  strength: number; // 0-100
  support: number;
  resistance: number;
  movingAverage50: number;
  movingAverage200: number;
}

class RealTimeMarketAlertsService {
  private priceAlerts: Map<string, PriceAlert[]> = new Map();
  private marketSentiments: Map<string, MarketSentiment> = new Map();
  private whaleTransactions: Map<string, WhaleTransaction[]> = new Map();
  private notifications: Map<string, AlertNotification[]> = new Map();
  private marketTrends: Map<string, MarketTrend> = new Map();

  constructor() {
    this.initializeMarketData();
  }

  /**
   * Initialize market data
   */
  private initializeMarketData(): void {
    const assets = ['BTC', 'ETH', 'SOL', 'MATIC', 'AVAX'];

    for (const asset of assets) {
      this.marketSentiments.set(asset, {
        asset,
        sentiment: 'neutral',
        score: Math.random() * 200 - 100,
        sources: Math.floor(Math.random() * 100) + 10,
        lastUpdated: Date.now(),
        trendingTopics: ['DeFi', 'NFT', 'Layer 2'],
      });

      this.whaleTransactions.set(asset, []);
      this.marketTrends.set(asset, {
        asset,
        trend: 'sideways',
        strength: Math.random() * 100,
        support: 1000,
        resistance: 2000,
        movingAverage50: 1500,
        movingAverage200: 1400,
      });
    }
  }

  /**
   * Create price alert
   */
  createPriceAlert(
    userId: string,
    asset: string,
    type: 'above' | 'below' | 'change-percent',
    targetPrice?: number,
    changePercent?: number,
    channels: ('push' | 'sms' | 'email')[] = ['push']
  ): PriceAlert {
    const alert: PriceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      asset,
      type,
      targetPrice,
      changePercent,
      isActive: true,
      createdAt: Date.now(),
      notificationChannels: channels,
    };

    if (!this.priceAlerts.has(userId)) {
      this.priceAlerts.set(userId, []);
    }

    this.priceAlerts.get(userId)!.push(alert);

    return alert;
  }

  /**
   * Get price alerts
   */
  getPriceAlerts(userId: string, asset?: string): PriceAlert[] {
    let alerts = this.priceAlerts.get(userId) || [];

    if (asset) {
      alerts = alerts.filter(a => a.asset === asset);
    }

    return alerts.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Trigger price alert
   */
  triggerPriceAlert(alertId: string, currentPrice: number): AlertNotification | null {
    for (const alerts of this.priceAlerts.values()) {
      const alert = alerts.find(a => a.id === alertId);

      if (alert && alert.isActive) {
        let shouldTrigger = false;

        if (alert.type === 'above' && alert.targetPrice && currentPrice >= alert.targetPrice) {
          shouldTrigger = true;
        } else if (alert.type === 'below' && alert.targetPrice && currentPrice <= alert.targetPrice) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          alert.triggeredAt = Date.now();

          const notification: AlertNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: alert.userId,
            alertId,
            type: 'price',
            title: `${alert.asset} Price Alert`,
            message: `${alert.asset} reached ${currentPrice}`,
            asset: alert.asset,
            data: { currentPrice, targetPrice: alert.targetPrice },
            channels: alert.notificationChannels,
            sentAt: Date.now(),
            read: false,
          };

          if (!this.notifications.has(alert.userId)) {
            this.notifications.set(alert.userId, []);
          }

          this.notifications.get(alert.userId)!.push(notification);

          return notification;
        }
      }
    }

    return null;
  }

  /**
   * Get market sentiment
   */
  getMarketSentiment(asset: string): MarketSentiment | undefined {
    return this.marketSentiments.get(asset);
  }

  /**
   * Update market sentiment
   */
  updateMarketSentiment(asset: string, sentiment: MarketSentiment): void {
    this.marketSentiments.set(asset, sentiment);
  }

  /**
   * Get whale transactions
   */
  getWhaleTransactions(asset?: string, limit: number = 10): WhaleTransaction[] {
    let transactions: WhaleTransaction[] = [];

    if (asset) {
      transactions = this.whaleTransactions.get(asset) || [];
    } else {
      for (const txs of this.whaleTransactions.values()) {
        transactions.push(...txs);
      }
    }

    return transactions
      .filter(t => t.isWhale)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Add whale transaction
   */
  addWhaleTransaction(transaction: Omit<WhaleTransaction, 'id'>): WhaleTransaction {
    const tx: WhaleTransaction = {
      ...transaction,
      id: `whale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    if (!this.whaleTransactions.has(transaction.asset)) {
      this.whaleTransactions.set(transaction.asset, []);
    }

    this.whaleTransactions.get(transaction.asset)!.push(tx);

    // Create notification for whale transactions
    if (tx.isWhale && tx.confidence > 0.8) {
      const notification: AlertNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: '', // Would be populated from user alerts
        alertId: '',
        type: 'whale',
        title: `Whale ${tx.type.toUpperCase()} - ${tx.asset}`,
        message: `Whale ${tx.type === 'buy' ? 'bought' : 'sold'} ${tx.quantity} ${tx.asset} (${tx.value.toFixed(2)} USD)`,
        asset: tx.asset,
        data: tx,
        channels: ['push', 'email'],
        sentAt: Date.now(),
        read: false,
      };

      return tx;
    }

    return tx;
  }

  /**
   * Get market trend
   */
  getMarketTrend(asset: string): MarketTrend | undefined {
    return this.marketTrends.get(asset);
  }

  /**
   * Get notifications
   */
  getNotifications(userId: string, unreadOnly: boolean = false): AlertNotification[] {
    let notifications = this.notifications.get(userId) || [];

    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    return notifications.sort((a, b) => b.sentAt - a.sentAt);
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId: string): boolean {
    for (const notifications of this.notifications.values()) {
      const notification = notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        return true;
      }
    }

    return false;
  }

  /**
   * Get market overview
   */
  getMarketOverview(): {
    topGainers: { asset: string; change: number }[];
    topLosers: { asset: string; change: number }[];
    sentiments: Record<string, string>;
    trends: Record<string, string>;
  } {
    const sentiments: Record<string, string> = {};
    const trends: Record<string, string> = {};

    for (const [asset, sentiment] of this.marketSentiments.entries()) {
      sentiments[asset] = sentiment.sentiment;
    }

    for (const [asset, trend] of this.marketTrends.entries()) {
      trends[asset] = trend.trend;
    }

    const topGainers = [
      { asset: 'BTC', change: 2.5 },
      { asset: 'ETH', change: 1.8 },
      { asset: 'SOL', change: 3.2 },
    ];

    const topLosers = [
      { asset: 'MATIC', change: -1.5 },
      { asset: 'AVAX', change: -0.8 },
    ];

    return {
      topGainers,
      topLosers,
      sentiments,
      trends,
    };
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(userId: string): {
    totalAlerts: number;
    activeAlerts: number;
    triggeredAlerts: number;
    unreadNotifications: number;
  } {
    const alerts = this.priceAlerts.get(userId) || [];
    const notifications = this.getNotifications(userId);

    return {
      totalAlerts: alerts.length,
      activeAlerts: alerts.filter(a => a.isActive).length,
      triggeredAlerts: alerts.filter(a => a.triggeredAt).length,
      unreadNotifications: notifications.filter(n => !n.read).length,
    };
  }

  /**
   * Delete price alert
   */
  deletePriceAlert(userId: string, alertId: string): boolean {
    const alerts = this.priceAlerts.get(userId);
    if (!alerts) return false;

    const index = alerts.findIndex(a => a.id === alertId);
    if (index === -1) return false;

    alerts.splice(index, 1);
    return true;
  }

  /**
   * Update price alert
   */
  updatePriceAlert(userId: string, alertId: string, updates: Partial<PriceAlert>): boolean {
    const alerts = this.priceAlerts.get(userId);
    if (!alerts) return false;

    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return false;

    Object.assign(alert, updates);
    return true;
  }
}

export const realTimeMarketAlertsService = new RealTimeMarketAlertsService();
