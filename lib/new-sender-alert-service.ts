/**
 * Servizio: Notifica per nuovo mittente
 *
 * Quando arriva un bonifico in entrata da un mittente mai visto prima,
 * invia una notifica push: "Nuovo mittente: [Nome] ti ha inviato €X".
 *
 * Mantiene un set di mittenti già visti in AsyncStorage.
 * Anti-spam: una sola notifica per mittente (non ripete se il mittente è già noto).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addNotificationLog } from './notification-log';
import { DeviceEventEmitter } from 'react-native';

const KNOWN_SENDERS_KEY = 'agentpay_known_senders';

function formatEur(v: number): string {
  return `€${v.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
}

async function getKnownSenders(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(KNOWN_SENDERS_KEY);
  const list: string[] = raw ? JSON.parse(raw) : [];
  return new Set(list);
}

async function addKnownSender(name: string): Promise<void> {
  const known = await getKnownSenders();
  known.add(name);
  await AsyncStorage.setItem(KNOWN_SENDERS_KEY, JSON.stringify(Array.from(known)));
}

/**
 * Controlla tutti i bonifici in entrata e invia notifiche per i mittenti nuovi.
 * Chiamare dopo ogni ricarica dei trasferimenti.
 */
export async function checkNewSenderAlerts(
  transfers: any[]
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const known = await getKnownSenders();
    const incoming = transfers.filter(
      (t) => t.direction === 'incoming' && t.senderName && t.status === 'completed'
    );

    // Raggruppa per mittente: prendi il bonifico più recente per ogni mittente nuovo
    const newSenders = new Map<string, any>();
    for (const t of incoming) {
      const name: string = t.senderName;
      if (!known.has(name)) {
        const existing = newSenders.get(name);
        if (!existing || t.createdAt > existing.createdAt) {
          newSenders.set(name, t);
        }
      }
    }

    if (newSenders.size === 0) return;

    // Richiedi permessi notifiche se non già concessi
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') return;
    }

    for (const [name, t] of newSenders.entries()) {
      const title = '👤 Nuovo mittente';
      const body = `${name} ti ha inviato ${formatEur(t.amount)}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'new_sender', senderName: name, transferId: t.id },
          sound: true,
        },
        trigger: null, // immediata
      });

      await addNotificationLog({
        title,
        body,
        type: 'info',
        data: { senderName: name, amount: t.amount, transferId: t.id },
      });

      // Segnala al tab badge
      DeviceEventEmitter.emit('agentpay:newNotification');

      // Marca il mittente come noto per non ripetere la notifica
      await addKnownSender(name);
    }
  } catch {
    // silently ignore
  }
}

/**
 * Resetta tutti i mittenti conosciuti (utile per test o reset app).
 */
export async function resetKnownSenders(): Promise<void> {
  await AsyncStorage.removeItem(KNOWN_SENDERS_KEY);
}
