import { useState, useCallback, useRef, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  transactionAlerts: boolean;
  priceAlerts: boolean;
  daoProposals: boolean;
  farmingRewards: boolean;
  limitOrderFilled: boolean;
  bridgeCompleted: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  type: 'transaction' | 'price' | 'dao' | 'farming' | 'order' | 'bridge';
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
}

interface AdvancedNotificationsState {
  notifications: StoredNotification[];
  preferences: NotificationPreferences;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  transactionAlerts: true,
  priceAlerts: true,
  daoProposals: true,
  farmingRewards: true,
  limitOrderFilled: true,
  bridgeCompleted: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

const STORAGE_KEY = 'agentpay_notifications';
const PREFERENCES_KEY = 'agentpay_notification_preferences';

export function useAdvancedNotifications(address: string | null) {
  const [state, setState] = useState<AdvancedNotificationsState>({
    notifications: [],
    preferences: DEFAULT_PREFERENCES,
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Carica le preferenze di notifica
  const loadPreferences = useCallback(async () => {
    if (!address) return;

    try {
      const stored = await AsyncStorage.getItem(`${PREFERENCES_KEY}_${address}`);
      const preferences = stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          preferences,
        }));
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    }
  }, [address]);

  // Carica le notifiche salvate
  const loadNotifications = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
      const notifications: StoredNotification[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          notifications,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Carica le preferenze e notifiche al mount
  useEffect(() => {
    loadPreferences();
    loadNotifications();
  }, [address, loadPreferences, loadNotifications]);

  // Invia una notifica
  const sendNotification = useCallback(
    async (
      title: string,
      body: string,
      type: StoredNotification['type'],
      data?: Record<string, any>,
    ): Promise<boolean> => {
      if (!address) return false;

      try {
        // Controlla le preferenze
        const preferencesMap: Record<StoredNotification['type'], keyof NotificationPreferences> = {
          transaction: 'transactionAlerts',
          price: 'priceAlerts',
          dao: 'daoProposals',
          farming: 'farmingRewards',
          order: 'limitOrderFilled',
          bridge: 'bridgeCompleted',
        };

        if (!state.preferences[preferencesMap[type]]) {
          return false;
        }

        // Invia la notifica
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: state.preferences.soundEnabled ? 'default' : null,
            vibrate: state.preferences.vibrationEnabled ? [0, 250, 250, 250] : undefined,
            data: data || {},
          },
          trigger: null, // Invia immediatamente
        });

        // Salva la notifica
        const notification: StoredNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title,
          body,
          type,
          data,
          timestamp: Date.now(),
          read: false,
        };

        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let notifications: StoredNotification[] = stored ? JSON.parse(stored) : [];

        notifications.unshift(notification);
        notifications = notifications.slice(0, 100); // Mantieni solo le ultime 100

        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(notifications));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            notifications,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to send notification:', err);
        return false;
      }
    },
    [address, state.preferences],
  );

  // Aggiorna le preferenze di notifica
  const updatePreferences = useCallback(
    async (newPreferences: Partial<NotificationPreferences>): Promise<boolean> => {
      if (!address) return false;

      try {
        const updatedPreferences = { ...state.preferences, ...newPreferences };

        await AsyncStorage.setItem(`${PREFERENCES_KEY}_${address}`, JSON.stringify(updatedPreferences));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            preferences: updatedPreferences,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to update notification preferences:', err);
        return false;
      }
    },
    [address, state.preferences],
  );

  // Marca una notifica come letta
  const markAsRead = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!address) return false;

      try {
        const updatedNotifications = state.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n,
        );

        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(updatedNotifications));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            notifications: updatedNotifications,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
        return false;
      }
    },
    [address, state.notifications],
  );

  // Cancella una notifica
  const deleteNotification = useCallback(
    async (notificationId: string): Promise<boolean> => {
      if (!address) return false;

      try {
        const updatedNotifications = state.notifications.filter(n => n.id !== notificationId);

        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(updatedNotifications));

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            notifications: updatedNotifications,
          }));
        }

        return true;
      } catch (err) {
        console.error('Failed to delete notification:', err);
        return false;
      }
    },
    [address, state.notifications],
  );

  // Ottieni le notifiche non lette
  const getUnreadCount = useCallback((): number => {
    return state.notifications.filter(n => !n.read).length;
  }, [state.notifications]);

  // Ottieni le notifiche per tipo
  const getNotificationsByType = useCallback(
    (type: StoredNotification['type']): StoredNotification[] => {
      return state.notifications.filter(n => n.type === type);
    },
    [state.notifications],
  );

  // Pulisci le notifiche vecchie (> 30 giorni)
  const cleanupOldNotifications = useCallback(async () => {
    if (!address) return;

    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const updatedNotifications = state.notifications.filter(n => n.timestamp > thirtyDaysAgo);

      await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(updatedNotifications));

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          notifications: updatedNotifications,
        }));
      }
    } catch (err) {
      console.error('Failed to cleanup old notifications:', err);
    }
  }, [address, state.notifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    notifications: state.notifications,
    preferences: state.preferences,
    isLoading: state.isLoading,
    error: state.error,
    sendNotification,
    updatePreferences,
    markAsRead,
    deleteNotification,
    getUnreadCount,
    getNotificationsByType,
    cleanupOldNotifications,
    loadNotifications,
    loadPreferences,
  };
}
