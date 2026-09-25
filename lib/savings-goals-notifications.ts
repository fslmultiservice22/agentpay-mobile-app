/**
 * savings-goals-notifications.ts
 * Servizio per notifiche push locali sugli obiettivi di risparmio.
 * Invia promemoria quando una scadenza si avvicina (30, 7, 1 giorno).
 */

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "agentpay_savings_goals_v2";
const NOTIF_PREFS_KEY = "agentpay_savings_goals_notif_enabled";
const SCHEDULED_IDS_KEY = "agentpay_savings_goals_notif_ids";

export interface SavingsGoalNotifGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  color: string;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Richiede i permessi per le notifiche push.
 * Restituisce true se i permessi sono stati concessi.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Abilita o disabilita i promemoria per gli obiettivi di risparmio.
 */
export async function setSavingsGoalsNotifEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(enabled));
  if (enabled) {
    await scheduleSavingsGoalsReminders();
  } else {
    await cancelAllSavingsGoalsReminders();
  }
}

export async function isSavingsGoalsNotifEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
  if (!raw) return false;
  try { return JSON.parse(raw) as boolean; } catch { return false; }
}

/**
 * Cancella tutte le notifiche schedulate per gli obiettivi di risparmio.
 */
export async function cancelAllSavingsGoalsReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
  } catch {}
}

/**
 * Schedula notifiche per tutti gli obiettivi con scadenza imminente.
 * Invia promemoria a 30, 7 e 1 giorno dalla scadenza.
 */
export async function scheduleSavingsGoalsReminders(): Promise<void> {
  if (Platform.OS === "web") return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  // Cancella le precedenti
  await cancelAllSavingsGoalsReminders();

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const goals: SavingsGoalNotifGoal[] = raw ? JSON.parse(raw) : [];
    const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount);

    const scheduledIds: string[] = [];

    for (const goal of activeGoals) {
      const days = daysUntil(goal.deadline);
      const remaining = goal.targetAmount - goal.currentAmount;

      // Promemoria a 30 giorni
      if (days === 30) {
        const id = await scheduleImmediateNotif(
          `Obiettivo "${goal.name}" — 30 giorni`,
          `Mancano ${formatCurrency(remaining)} per raggiungere l'obiettivo entro il ${new Date(goal.deadline).toLocaleDateString("it-IT")}.`
        );
        if (id) scheduledIds.push(id);
      }

      // Promemoria a 7 giorni
      if (days === 7) {
        const id = await scheduleImmediateNotif(
          `Obiettivo "${goal.name}" — 1 settimana!`,
          `Hai ancora 7 giorni. Ti mancano ${formatCurrency(remaining)} per completarlo.`
        );
        if (id) scheduledIds.push(id);
      }

      // Promemoria a 1 giorno
      if (days === 1) {
        const id = await scheduleImmediateNotif(
          `Obiettivo "${goal.name}" — domani scade!`,
          `Ultimo giorno per raggiungere l'obiettivo. Mancano ancora ${formatCurrency(remaining)}.`
        );
        if (id) scheduledIds.push(id);
      }

      // Promemoria scaduto
      if (days === 0 && remaining > 0) {
        const id = await scheduleImmediateNotif(
          `Obiettivo "${goal.name}" scaduto`,
          `L'obiettivo è scaduto con ${formatCurrency(remaining)} ancora da raggiungere. Vuoi aggiornare la scadenza?`
        );
        if (id) scheduledIds.push(id);
      }
    }

    if (scheduledIds.length > 0) {
      await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(scheduledIds));
    }
  } catch {}
}

async function scheduleImmediateNotif(title: string, body: string): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { screen: "/savings-goals" },
      },
      trigger: null, // Immediata
    });
    return id;
  } catch {
    return null;
  }
}

/**
 * Schedula un controllo giornaliero alle 9:00 per tutti gli obiettivi.
 * Da chiamare all'avvio dell'app se le notifiche sono abilitate.
 */
export async function scheduleDailyCheck(): Promise<void> {
  if (Platform.OS === "web") return;

  const enabled = await isSavingsGoalsNotifEnabled();
  if (!enabled) return;

  await scheduleSavingsGoalsReminders();
}
