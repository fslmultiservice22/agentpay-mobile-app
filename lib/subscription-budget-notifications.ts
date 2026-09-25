/**
 * subscription-budget-notifications.ts
 * Servizio per le notifiche push relative al budget mensile degli abbonamenti.
 * Invia notifiche automatiche quando la spesa supera l'80% o il 100% del budget.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const STORAGE_KEY_NOTIF_SENT = 'agentpay_sub_budget_notif_sent';
const STORAGE_KEY_SUBSCRIPTIONS = 'agentpay_subscriptions';
const STORAGE_KEY_BUDGET = 'agentpay_subscription_budget';

export interface SubBudgetNotifState {
  /** Mese in formato YYYY-MM per cui è già stata inviata la notifica 80% */
  warn80Month: string | null;
  /** Mese in formato YYYY-MM per cui è già stata inviata la notifica 100% */
  warn100Month: string | null;
}

const CYCLE_FACTOR: Record<string, number> = {
  monthly: 1,
  yearly: 1 / 12,
  weekly: 52 / 12,
};

/** Restituisce il mese corrente in formato YYYY-MM */
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Legge lo stato notifiche già inviate */
async function loadNotifState(): Promise<SubBudgetNotifState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_NOTIF_SENT);
    if (raw) return JSON.parse(raw) as SubBudgetNotifState;
  } catch {}
  return { warn80Month: null, warn100Month: null };
}

/** Salva lo stato notifiche */
async function saveNotifState(state: SubBudgetNotifState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_NOTIF_SENT, JSON.stringify(state));
}

/** Richiede i permessi per le notifiche (no-op su web) */
async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Invia una notifica locale immediata */
async function sendLocalNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null, // immediata
  });
}

/**
 * Controlla il budget abbonamenti e invia notifiche push se necessario.
 * Da chiamare ogni volta che si apre la schermata /subscription-budget
 * o al refresh della Home screen.
 */
export async function checkSubscriptionBudgetNotifications(): Promise<void> {
  try {
    const [rawSubs, rawBudget] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_SUBSCRIPTIONS),
      AsyncStorage.getItem(STORAGE_KEY_BUDGET),
    ]);

    if (!rawBudget) return; // nessun budget impostato

    const budget = parseFloat(rawBudget);
    if (isNaN(budget) || budget <= 0) return;

    const subs = rawSubs ? (() => { try { return JSON.parse(rawSubs); } catch { return []; } })() : [];
    const activeSubs = (subs as any[]).filter((s) => s.active);
    const totalMonthly = activeSubs.reduce(
      (sum: number, s: any) => sum + parseFloat(s.amount || '0') * (CYCLE_FACTOR[s.billingCycle] ?? 1),
      0
    );

    const pct = (totalMonthly / budget) * 100;
    const month = currentMonth();
    const state = await loadNotifState();
    const hasPermission = await ensurePermissions();
    if (!hasPermission) return;

    // Notifica 100% (sforamento)
    if (pct >= 100 && state.warn100Month !== month) {
      await sendLocalNotification(
        '⚠️ Budget abbonamenti sforato!',
        `Hai speso €${totalMonthly.toFixed(2)} su un budget di €${budget.toFixed(2)} (${pct.toFixed(0)}%). Considera di disattivare qualche abbonamento.`
      );
      state.warn100Month = month;
      await saveNotifState(state);
      return; // non inviare anche quella dell'80%
    }

    // Notifica 80% (avviso)
    if (pct >= 80 && state.warn80Month !== month) {
      await sendLocalNotification(
        '📋 Budget abbonamenti all\'80%',
        `Hai già usato l'${pct.toFixed(0)}% del budget mensile abbonamenti (€${totalMonthly.toFixed(2)} su €${budget.toFixed(2)}).`
      );
      state.warn80Month = month;
      await saveNotifState(state);
    }
  } catch (err) {
    // Silently ignore errors to avoid crashing the app
    console.warn('[SubBudgetNotif] Error:', err);
  }
}

/**
 * Resetta lo stato notifiche (utile per i test o quando l'utente cambia il budget).
 */
export async function resetSubscriptionBudgetNotifState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_NOTIF_SENT);
}
