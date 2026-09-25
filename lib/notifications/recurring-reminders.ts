/**
 * AgentPay — Notifiche push locali per pagamenti ricorrenti in scadenza
 * Schedula promemoria per abbonamenti/pagamenti in scadenza entro 3 giorni.
 * Funziona solo su dispositivi fisici (non web, non simulatore).
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SUBSCRIPTIONS_KEY = 'agentpay_subscriptions';
const NOTIF_IDS_KEY = 'agentpay_notif_ids_recurring';
const CHANNEL_ID = 'agentpay-recurring';

// ─── Configurazione handler (da chiamare una volta all'avvio) ─────────────────
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Richiesta permessi ───────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  // Crea canale Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Pagamenti Ricorrenti',
      description: 'Promemoria per abbonamenti e pagamenti in scadenza',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0a7ea4',
      sound: 'default',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Cancella tutte le notifiche ricorrenti schedulate ────────────────────────
async function cancelAllRecurringNotifications() {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    }
  } catch {}
  await AsyncStorage.removeItem(NOTIF_IDS_KEY);
}

// ─── Schedula promemoria per i prossimi 3 giorni ─────────────────────────────
export async function scheduleRecurringReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Cancella le precedenti per evitare duplicati
  await cancelAllRecurringNotifications();

  const raw = await AsyncStorage.getItem(SUBSCRIPTIONS_KEY);
  if (!raw) return;

  let subs: any[] = [];
  try {
    subs = JSON.parse(raw);
  } catch {
    return;
  }

  const now = Date.now();
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  const scheduledIds: string[] = [];

  const upcoming = subs
    .filter((s) => s.active && s.nextBillingDate)
    .filter((s) => {
      const diff = s.nextBillingDate - now;
      return diff >= 0 && diff <= THREE_DAYS_MS;
    })
    .sort((a, b) => a.nextBillingDate - b.nextBillingDate);

  for (const sub of upcoming) {
    const daysLeft = Math.ceil((sub.nextBillingDate - now) / (24 * 60 * 60 * 1000));
    const amount = parseFloat(sub.amount || '0');
    const amountStr = amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let title = '';
    let body = '';

    if (daysLeft === 0) {
      title = `Pagamento oggi: ${sub.name}`;
      body = `€${amountStr} verranno addebitati oggi.`;
    } else if (daysLeft === 1) {
      title = `Pagamento domani: ${sub.name}`;
      body = `€${amountStr} verranno addebitati domani.`;
    } else {
      title = `Pagamento tra ${daysLeft} giorni: ${sub.name}`;
      body = `€${amountStr} verranno addebitati tra ${daysLeft} giorni.`;
    }

    // Schedula la notifica per le 9:00 del giorno di scadenza (o subito se oggi)
    let triggerDate = new Date(sub.nextBillingDate);
    triggerDate.setHours(9, 0, 0, 0);

    // Se la data è già passata oggi, notifica subito (tra 5 secondi)
    if (triggerDate.getTime() <= now) {
      triggerDate = new Date(now + 5000);
    }

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { screen: '/recurring-payments', subscriptionId: sub.id },
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      scheduledIds.push(id);
    } catch (err) {
      console.warn('Errore schedulazione notifica:', err);
    }
  }

  // Salva gli ID per poterle cancellare in seguito
  if (scheduledIds.length > 0) {
    await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(scheduledIds));
  }

}

// ─── Cancella tutte le notifiche ricorrenti (es. quando l'utente disabilita) ──
export async function cancelRecurringReminders(): Promise<void> {
  await cancelAllRecurringNotifications();
}

// ─── Hook per navigazione da notifica ────────────────────────────────────────
export function getNotificationTargetScreen(
  notification: Notifications.Notification,
): string | null {
  const data = notification.request.content.data;
  if (data?.screen && typeof data.screen === 'string') {
    return data.screen;
  }
  return null;
}
