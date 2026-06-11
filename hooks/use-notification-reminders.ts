import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export interface ReminderSchedule {
  id: string;
  type: 'daily_checkin' | 'portfolio_milestone' | 'price_alert' | 'trading_opportunity';
  title: string;
  body: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:mm format
  lastSentAt?: number;
  nextScheduledAt?: number;
}

export interface ReminderStats {
  totalReminders: number;
  enabledReminders: number;
  totalSent: number;
  lastReminderAt?: number;
}

export interface ReminderState {
  reminders: ReminderSchedule[];
  stats: ReminderStats;
  isLoading: boolean;
  error: string | null;
}

const REMINDERS_KEY = 'agentpay_notification_reminders';
const REMINDERS_STATS_KEY = 'agentpay_reminders_stats';

const DEFAULT_REMINDERS: ReminderSchedule[] = [
  {
    id: 'daily_checkin',
    type: 'daily_checkin',
    title: 'Daily Check-in',
    body: 'Check your portfolio and latest market updates',
    enabled: true,
    frequency: 'daily',
    time: '09:00',
  },
  {
    id: 'portfolio_milestone',
    type: 'portfolio_milestone',
    title: 'Portfolio Milestone',
    body: 'Your portfolio reached a new milestone!',
    enabled: true,
    frequency: 'weekly',
    time: '18:00',
  },
  {
    id: 'price_alert',
    type: 'price_alert',
    title: 'Price Alert',
    body: 'A price alert you set has been triggered',
    enabled: true,
    frequency: 'daily',
  },
  {
    id: 'trading_opportunity',
    type: 'trading_opportunity',
    title: 'Trading Opportunity',
    body: 'New trading opportunities available based on your interests',
    enabled: true,
    frequency: 'weekly',
    time: '12:00',
  },
];

export function useNotificationReminders() {
  const [state, setState] = useState<ReminderState>({
    reminders: DEFAULT_REMINDERS,
    stats: {
      totalReminders: DEFAULT_REMINDERS.length,
      enabledReminders: DEFAULT_REMINDERS.filter(r => r.enabled).length,
      totalSent: 0,
    },
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const notificationTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Carica i reminder
  const loadReminders = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(REMINDERS_KEY);
      const reminders = stored ? JSON.parse(stored) : DEFAULT_REMINDERS;

      const statsStored = await AsyncStorage.getItem(REMINDERS_STATS_KEY);
      const stats = statsStored ? JSON.parse(statsStored) : {
        totalReminders: reminders.length,
        enabledReminders: reminders.filter((r: ReminderSchedule) => r.enabled).length,
        totalSent: 0,
      };

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          reminders,
          stats,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reminders';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, []);

  // Abilita/disabilita un reminder
  const toggleReminder = useCallback(async (reminderId: string): Promise<boolean> => {
    try {
      const updated = state.reminders.map(r =>
        r.id === reminderId ? { ...r, enabled: !r.enabled } : r,
      );

      const stats = {
        ...state.stats,
        enabledReminders: updated.filter(r => r.enabled).length,
      };

      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(REMINDERS_STATS_KEY, JSON.stringify(stats));

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          reminders: updated,
          stats,
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to toggle reminder:', err);
      return false;
    }
  }, [state.reminders, state.stats]);

  // Invia un reminder
  const sendReminder = useCallback(async (reminder: ReminderSchedule): Promise<boolean> => {
    try {
      // Richiedi permessi
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // Invia la notifica
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          data: { reminderId: reminder.id },
        },
        trigger: { seconds: 1 } as any,
      });

      // Aggiorna il reminder
      const updated = state.reminders.map(r =>
        r.id === reminder.id
          ? {
              ...r,
              lastSentAt: Date.now(),
              nextScheduledAt: calculateNextScheduleTime(r),
            }
          : r,
      );

      const stats = {
        ...state.stats,
        totalSent: state.stats.totalSent + 1,
        lastReminderAt: Date.now(),
      };

      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(REMINDERS_STATS_KEY, JSON.stringify(stats));

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          reminders: updated,
          stats,
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to send reminder:', err);
      return false;
    }
  }, [state.reminders, state.stats]);

  // Calcola il prossimo orario di pianificazione
  const calculateNextScheduleTime = (reminder: ReminderSchedule): number => {
    const now = Date.now();
    const nextTime = new Date(now);

    if (reminder.time) {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      nextTime.setHours(hours, minutes, 0, 0);

      if (nextTime.getTime() <= now) {
        nextTime.setDate(nextTime.getDate() + 1);
      }
    }

    return nextTime.getTime();
  };

  // Pianifica i reminder
  const scheduleReminders = useCallback(async () => {
    try {
      // Cancella i timeout precedenti
      notificationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeoutsRef.current.clear();

      // Pianifica i nuovi reminder
      for (const reminder of state.reminders) {
        if (!reminder.enabled) continue;

        const nextScheduledAt = calculateNextScheduleTime(reminder);
        const delayMs = nextScheduledAt - Date.now();

        if (delayMs > 0) {
          const timeout = setTimeout(() => {
            sendReminder(reminder);
          }, delayMs) as unknown as NodeJS.Timeout;

          notificationTimeoutsRef.current.set(reminder.id, timeout);
        }
      }
    } catch (err) {
      console.error('Failed to schedule reminders:', err);
    }
  }, [state.reminders, sendReminder]);

  // Carica i reminder al mount
  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Pianifica i reminder quando cambiano
  useEffect(() => {
    scheduleReminders();
  }, [scheduleReminders]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      notificationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeoutsRef.current.clear();
    };
  }, []);

  return {
    ...state,
    loadReminders,
    toggleReminder,
    sendReminder,
    scheduleReminders,
  };
}
