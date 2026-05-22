import * as Notifications from 'expo-notifications';
import { RebalancingEvent } from '@/hooks/use-auto-rebalancing';
import { translations } from '@/lib/i18n/translations';
import type { Language } from '@/lib/i18n/translations';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface RebalancingNotification {
  title: string;
  body: string;
  data: {
    type: 'rebalancing_started' | 'rebalancing_completed' | 'rebalancing_failed';
    eventId: string;
    copyTradeId: string;
    traderId: string;
  };
}

export function formatRebalancingNotification(
  event: RebalancingEvent,
  language: string = 'en'
): RebalancingNotification {
  const lang = language as Language;
  const t = translations[lang] || translations.en;

  const baseData = {
    eventId: event.id,
    copyTradeId: event.copyTradeId,
    traderId: event.traderId,
  };

  if (event.status === 'completed') {
    const changesCount = event.changes.length;
    const positiveChanges = event.changes.filter((c) => c.percentChange > 0).length;

    return {
      title: t['rebalancing.completed'] || 'Rebalancing Completed',
      body: `${changesCount} assets rebalanced (${positiveChanges} increased). Check portfolio for details.`,
      data: {
        type: 'rebalancing_completed',
        ...baseData,
      },
    };
  }

  if (event.status === 'failed') {
    return {
      title: t['rebalancing.failed'] || 'Rebalancing Failed',
      body: event.error || 'An error occurred during rebalancing. Please try again.',
      data: {
        type: 'rebalancing_failed',
        ...baseData,
      },
    };
  }

  return {
    title: t['rebalancing.started'] || 'Rebalancing Started',
    body: `Rebalancing ${event.changes.length} assets to match trader allocation.`,
    data: {
      type: 'rebalancing_started',
      ...baseData,
    },
  };
}

export async function sendRebalancingNotification(
  event: RebalancingEvent,
  language: string = 'en'
): Promise<string | null> {
  try {
    const notification = formatRebalancingNotification(event, language);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: 'default',
        badge: 1,
      },
      trigger: null,
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to send rebalancing notification:', error);
    return null;
  }
}

export function getRebalancingNotificationMessage(
  event: RebalancingEvent,
  language: string = 'en'
): string {
  const lang = language as Language;
  const t = translations[lang] || translations.en;

  if (event.status === 'completed') {
    const changesCount = event.changes.length;
    const increases = event.changes.filter((c) => c.percentChange > 0);
    const decreases = event.changes.filter((c) => c.percentChange < 0);

    let message = `✅ Rebalancing completed: ${changesCount} assets updated.\n`;

    if (increases.length > 0) {
      message += `📈 Increased: ${increases.map((c) => `${c.asset} (+${c.percentChange.toFixed(1)}%)`).join(', ')}\n`;
    }

    if (decreases.length > 0) {
      message += `📉 Decreased: ${decreases.map((c) => `${c.asset} (${c.percentChange.toFixed(1)}%)`).join(', ')}\n`;
    }

    if (event.executedAt) {
      const executedTime = new Date(event.executedAt);
      message += `⏱️ Executed at: ${executedTime.toLocaleTimeString()}`;
    }

    return message;
  }

  if (event.status === 'failed') {
    return `❌ Rebalancing failed: ${event.error || 'Unknown error'}`;
  }

  return `⏳ Rebalancing in progress for ${event.changes.length} assets...`;
}

export function getRebalancingAlertTitle(
  status: 'pending' | 'completed' | 'failed',
  language: string = 'en'
): string {
  const lang = language as Language;
  const t = translations[lang] || translations.en;

  switch (status) {
    case 'completed':
      return t['rebalancing.completed'] || 'Rebalancing Completed';
    case 'failed':
      return t['rebalancing.failed'] || 'Rebalancing Failed';
    case 'pending':
      return t['rebalancing.started'] || 'Rebalancing Started';
    default:
      return 'Rebalancing Update';
  }
}

export interface RebalancingNotificationStats {
  totalSent: number;
  completedNotifications: number;
  failedNotifications: number;
  pendingNotifications: number;
  lastNotificationAt?: string;
}

export function calculateNotificationStats(events: RebalancingEvent[]): RebalancingNotificationStats {
  return {
    totalSent: events.length,
    completedNotifications: events.filter((e) => e.status === 'completed').length,
    failedNotifications: events.filter((e) => e.status === 'failed').length,
    pendingNotifications: events.filter((e) => e.status === 'pending').length,
    lastNotificationAt: events.length > 0 ? events[events.length - 1].timestamp : undefined,
  };
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

export async function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  if (onNotificationReceived) {
    const subscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
    return subscription;
  }

  if (onNotificationResponse) {
    const subscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
    return subscription;
  }
}
