/**
 * recurring-deadline-alert-service.ts
 *
 * Controlla i template di bonifici ricorrenti e invia una notifica push
 * N giorni prima della prossima scadenza (configurabile dall'utente).
 * Anti-spam: una sola notifica per template per ciclo (24h).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const RECURRING_KEY = 'agentpay_recurring_transfers';
const SETTINGS_KEY = '@agentpay_recurring_deadline_settings';
const LAST_NOTIF_KEY = '@agentpay_recurring_deadline_last';

export interface RecurringDeadlineSettings {
  enabled: boolean;
  daysBeforeAlert: number; // default 3
}

const DEFAULT_SETTINGS: RecurringDeadlineSettings = {
  enabled: true,
  daysBeforeAlert: 3,
};

export async function loadRecurringDeadlineSettings(): Promise<RecurringDeadlineSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveRecurringDeadlineSettings(settings: RecurringDeadlineSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Controlla tutti i template ricorrenti attivi e invia una notifica
 * per quelli la cui prossima scadenza è entro `daysBeforeAlert` giorni.
 */
export async function checkRecurringDeadlineAlerts(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const settings = await loadRecurringDeadlineSettings();
    if (!settings.enabled) return;

    const raw = await AsyncStorage.getItem(RECURRING_KEY);
    if (!raw) return;
    const templates: any[] = JSON.parse(raw);
    const activeTemplates = templates.filter((t) => t.active && t.reminderEnabled);
    if (activeTemplates.length === 0) return;

    // Leggi anti-spam map: templateId → last notif timestamp
    const lastRaw = await AsyncStorage.getItem(LAST_NOTIF_KEY);
    const lastMap: Record<string, number> = lastRaw ? JSON.parse(lastRaw) : {};

    const now = Date.now();
    const alertWindowMs = settings.daysBeforeAlert * 24 * 60 * 60 * 1000;
    const antiSpamMs = 24 * 60 * 60 * 1000; // 24h

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('recurring-deadline', {
        name: 'Scadenze Ricorrenti',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const updatedLastMap = { ...lastMap };

    for (const template of activeTemplates) {
      const nextDate = template.nextReminderDate as number;
      if (!nextDate) continue;

      const timeToDeadline = nextDate - now;
      if (timeToDeadline < 0 || timeToDeadline > alertWindowMs) continue;

      // Anti-spam: non notificare se già notificato nelle ultime 24h per questo template
      const lastNotif = lastMap[template.id] ?? 0;
      if (now - lastNotif < antiSpamMs) continue;

      const daysLeft = Math.ceil(timeToDeadline / (24 * 60 * 60 * 1000));
      const daysLabel = daysLeft === 0 ? 'oggi' : daysLeft === 1 ? 'domani' : `tra ${daysLeft} giorni`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Scadenza Pagamento Ricorrente',
          body: `"${template.description || 'Bonifico'}" di €${template.amount} scade ${daysLabel}`,
          data: { templateId: template.id, type: 'recurring-deadline' },
        },
        trigger: null, // immediata
      });

      updatedLastMap[template.id] = now;
    }

    await AsyncStorage.setItem(LAST_NOTIF_KEY, JSON.stringify(updatedLastMap));
  } catch {
    // Silenzioso
  }
}
