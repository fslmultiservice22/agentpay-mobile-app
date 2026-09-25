/**
 * Servizio: Promemoria bonifico atteso
 *
 * Permette di impostare un promemoria per un mittente specifico:
 * se quel mittente non invia un bonifico entro N giorni dall'ultimo accredito,
 * viene inviata una notifica push.
 *
 * Struttura dati in AsyncStorage:
 * {
 *   senderName: string,
 *   days: number,          // giorni di attesa
 *   lastTransferAt: number, // timestamp ultimo bonifico
 *   enabled: boolean,
 *   lastNotifiedAt: number, // timestamp ultima notifica (anti-spam)
 * }
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import { addNotificationLog } from './notification-log';

const REMINDERS_KEY = 'agentpay_transfer_reminders';

export interface TransferReminder {
  senderName: string;
  days: number;
  lastTransferAt: number;
  enabled: boolean;
  lastNotifiedAt: number;
}

export async function getAllReminders(): Promise<TransferReminder[]> {
  const raw = await AsyncStorage.getItem(REMINDERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveReminder(reminder: TransferReminder): Promise<void> {
  const all = await getAllReminders();
  const idx = all.findIndex((r) => r.senderName === reminder.senderName);
  if (idx >= 0) {
    all[idx] = reminder;
  } else {
    all.push(reminder);
  }
  await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(all));
}

export async function getReminder(senderName: string): Promise<TransferReminder | null> {
  const all = await getAllReminders();
  return all.find((r) => r.senderName === senderName) ?? null;
}

export async function deleteReminder(senderName: string): Promise<void> {
  const all = await getAllReminders();
  const updated = all.filter((r) => r.senderName !== senderName);
  await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
}

/**
 * Controlla tutti i promemoria attivi e invia notifiche per quelli scaduti.
 * Chiamare all'avvio dell'app e periodicamente.
 */
export async function checkTransferReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const reminders = await getAllReminders();
    const now = Date.now();
    let changed = false;

    for (const r of reminders) {
      if (!r.enabled) continue;
      const thresholdMs = r.days * 24 * 60 * 60 * 1000;
      const elapsed = now - r.lastTransferAt;
      if (elapsed < thresholdMs) continue;

      // Anti-spam: non notificare più di una volta ogni 24 ore per lo stesso promemoria
      if (r.lastNotifiedAt > 0 && now - r.lastNotifiedAt < 24 * 60 * 60 * 1000) continue;

      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: ns } = await Notifications.requestPermissionsAsync();
        if (ns !== 'granted') continue;
      }

      const daysSince = Math.floor(elapsed / (24 * 60 * 60 * 1000));
      const title = '⏰ Bonifico atteso';
      const body = `${r.senderName} non ti ha inviato bonifici da ${daysSince} giorni`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'transfer_reminder', senderName: r.senderName },
          sound: true,
        },
        trigger: null,
      });

      await addNotificationLog({
        title,
        body,
        type: 'reminder',
        data: { senderName: r.senderName, daysSince },
      });

      DeviceEventEmitter.emit('agentpay:newNotification');

      r.lastNotifiedAt = now;
      changed = true;
    }

    if (changed) {
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    }
  } catch {
    // silently ignore
  }
}
