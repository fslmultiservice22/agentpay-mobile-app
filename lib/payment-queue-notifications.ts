/**
 * Payment Queue Notifications Service
 * Gestione notifiche push per pagamenti schedulati nella coda
 * Invia reminder quando si avvicina la data/ora programmata di un pagamento
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadPaymentQueue, type QueuedPayment } from './payment-queue';

const SCHEDULED_NOTIFICATIONS_KEY = 'payment_queue_scheduled_notifications';
const REMINDER_MINUTES_BEFORE = 15; // Notifica 15 minuti prima

interface ScheduledNotificationRecord {
  paymentId: string;
  notificationId: string;
  scheduledFor: number;
}

/**
 * Carica i record delle notifiche già pianificate
 */
async function loadScheduledNotifications(): Promise<ScheduledNotificationRecord[]> {
  try {
    const stored = await AsyncStorage.getItem(SCHEDULED_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Salva i record delle notifiche pianificate
 */
async function saveScheduledNotifications(records: ScheduledNotificationRecord[]): Promise<void> {
  await AsyncStorage.setItem(SCHEDULED_NOTIFICATIONS_KEY, JSON.stringify(records));
}

/**
 * Pianifica una notifica push per un pagamento specifico
 */
async function schedulePaymentNotification(payment: QueuedPayment): Promise<string | null> {
  if (!payment.scheduledAt) return null;

  const reminderTime = payment.scheduledAt - REMINDER_MINUTES_BEFORE * 60 * 1000;
  const now = Date.now();

  // Se il reminder è già passato, non pianificare
  if (reminderTime <= now) return null;

  const secondsUntilReminder = Math.floor((reminderTime - now) / 1000);

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Pagamento in arrivo',
        body: `Pagamento di €${payment.amount.toFixed(2)} a ${payment.beneficiaryName} tra ${REMINDER_MINUTES_BEFORE} minuti`,
        data: {
          type: 'payment_reminder',
          paymentId: payment.id,
          amount: payment.amount,
          beneficiary: payment.beneficiaryName,
          screen: '/payment-queue',
        },
        sound: 'default',
      },
      trigger: { seconds: secondsUntilReminder } as any,
    });

    return notificationId;
  } catch (err) {
    console.error('Errore pianificazione notifica pagamento:', err);
    return null;
  }
}

/**
 * Pianifica notifiche per tutti i pagamenti schedulati nella coda
 * Chiamare dopo ogni aggiunta/modifica alla coda
 */
export async function scheduleAllPaymentReminders(): Promise<number> {
  const queue = await loadPaymentQueue();
  const existingRecords = await loadScheduledNotifications();
  const newRecords: ScheduledNotificationRecord[] = [];
  let scheduled = 0;

  // Filtra solo pagamenti pending con scheduledAt futuro
  const scheduledPayments = queue.filter(
    p => p.status === 'pending' && p.scheduledAt && p.scheduledAt > Date.now()
  );

  for (const payment of scheduledPayments) {
    // Controlla se già pianificato
    const existing = existingRecords.find(r => r.paymentId === payment.id);
    if (existing && existing.scheduledFor === payment.scheduledAt) {
      newRecords.push(existing);
      continue;
    }

    // Cancella notifica precedente se la data è cambiata
    if (existing) {
      try {
        await Notifications.cancelScheduledNotificationAsync(existing.notificationId);
      } catch { /* ignore */ }
    }

    // Pianifica nuova notifica
    const notificationId = await schedulePaymentNotification(payment);
    if (notificationId) {
      newRecords.push({
        paymentId: payment.id,
        notificationId,
        scheduledFor: payment.scheduledAt!,
      });
      scheduled++;
    }
  }

  await saveScheduledNotifications(newRecords);
  return scheduled;
}

/**
 * Cancella tutte le notifiche pianificate per i pagamenti
 */
export async function cancelAllPaymentReminders(): Promise<void> {
  const records = await loadScheduledNotifications();
  for (const record of records) {
    try {
      await Notifications.cancelScheduledNotificationAsync(record.notificationId);
    } catch { /* ignore */ }
  }
  await saveScheduledNotifications([]);
}

/**
 * Cancella la notifica per un pagamento specifico (es. quando viene rimosso dalla coda)
 */
export async function cancelPaymentReminder(paymentId: string): Promise<void> {
  const records = await loadScheduledNotifications();
  const record = records.find(r => r.paymentId === paymentId);
  if (record) {
    try {
      await Notifications.cancelScheduledNotificationAsync(record.notificationId);
    } catch { /* ignore */ }
    const updated = records.filter(r => r.paymentId !== paymentId);
    await saveScheduledNotifications(updated);
  }
}

/**
 * Invia notifica immediata quando un pagamento schedulato è ora (tempo scaduto)
 */
export async function sendPaymentDueNotification(payment: QueuedPayment): Promise<void> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💳 Pagamento da eseguire',
        body: `È ora di inviare €${payment.amount.toFixed(2)} a ${payment.beneficiaryName}`,
        data: {
          type: 'payment_due',
          paymentId: payment.id,
          amount: payment.amount,
          beneficiary: payment.beneficiaryName,
          screen: '/payment-queue',
        },
        sound: 'default',
      },
      trigger: { seconds: 1 } as any,
    });
  } catch (err) {
    console.error('Errore invio notifica pagamento scaduto:', err);
  }
}

/**
 * Controlla pagamenti scaduti e invia notifiche
 * Da chiamare periodicamente (es. ogni minuto con setInterval)
 */
export async function checkDuePayments(): Promise<number> {
  const queue = await loadPaymentQueue();
  const now = Date.now();
  let notified = 0;

  const duePayments = queue.filter(
    p => p.status === 'pending' && p.scheduledAt && p.scheduledAt <= now && p.scheduledAt > now - 60000
  );

  for (const payment of duePayments) {
    await sendPaymentDueNotification(payment);
    notified++;
  }

  return notified;
}
