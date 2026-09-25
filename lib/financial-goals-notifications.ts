/**
 * financial-goals-notifications.ts
 * Servizio notifiche push per obiettivi finanziari:
 * - Promemoria mensile con progresso
 * - Avviso scadenza a 30 giorni
 * - Avviso scadenza a 7 giorni
 * - Notifica completamento obiettivo
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIF_STATE_KEY = 'agentpay_goals_notif_state';
const GOALS_KEY = 'agentpay_financial_goals';

interface FinancialGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  color: string;
}

interface GoalNotifState {
  lastMonthlyReminder: string;   // ISO month string "YYYY-MM"
  sentDeadline30: string[];      // goal IDs per cui è stato inviato l'avviso 30gg
  sentDeadline7: string[];       // goal IDs per cui è stato inviato l'avviso 7gg
  sentCompletion: string[];      // goal IDs per cui è stata inviata la notifica completamento
}

async function getNotifState(): Promise<GoalNotifState> {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    lastMonthlyReminder: '',
    sentDeadline30: [],
    sentDeadline7: [],
    sentCompletion: [],
  };
}

async function saveNotifState(state: GoalNotifState): Promise<void> {
  await AsyncStorage.setItem(NOTIF_STATE_KEY, JSON.stringify(state));
}

async function sendLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {}
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: number): string {
  if (amount >= 1000) return `€${(amount / 1000).toFixed(1)}k`;
  return `€${amount.toFixed(0)}`;
}

/**
 * Controlla tutti gli obiettivi e invia le notifiche appropriate.
 * Da chiamare all'apertura dell'app o al focus sulla schermata /financial-goals.
 */
export async function checkFinancialGoalsNotifications(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    if (!raw) return;
    const goals: FinancialGoal[] = JSON.parse(raw);
    if (goals.length === 0) return;

    const state = await getNotifState();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let stateChanged = false;

    for (const goal of goals) {
      const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      const isCompleted = pct >= 100;
      const days = daysUntil(goal.deadline);
      const remaining = goal.targetAmount - goal.currentAmount;

      // 1. Notifica completamento (una sola volta per obiettivo)
      if (isCompleted && !state.sentCompletion.includes(goal.id)) {
        await sendLocalNotification(
          `🎉 Obiettivo raggiunto: ${goal.emoji} ${goal.name}`,
          `Complimenti! Hai raggiunto il tuo obiettivo di ${formatCurrency(goal.targetAmount)}. Ora puoi impostarne uno nuovo!`
        );
        state.sentCompletion.push(goal.id);
        stateChanged = true;
      }

      if (isCompleted) continue;

      // 2. Avviso scadenza a 7 giorni
      if (days <= 7 && days >= 0 && !state.sentDeadline7.includes(goal.id)) {
        await sendLocalNotification(
          `⚠️ Scadenza imminente: ${goal.emoji} ${goal.name}`,
          `Mancano solo ${days} giorni alla scadenza! Ti mancano ancora ${formatCurrency(remaining)} per raggiungere il tuo obiettivo.`
        );
        state.sentDeadline7.push(goal.id);
        stateChanged = true;
      }

      // 3. Avviso scadenza a 30 giorni (solo se non già inviato a 7gg)
      if (days <= 30 && days > 7 && !state.sentDeadline30.includes(goal.id)) {
        await sendLocalNotification(
          `📅 Scadenza tra ${days} giorni: ${goal.emoji} ${goal.name}`,
          `Hai ancora ${formatCurrency(remaining)} da risparmiare. Aggiungi un contributo per restare in carreggiata!`
        );
        state.sentDeadline30.push(goal.id);
        stateChanged = true;
      }
    }

    // 4. Promemoria mensile (una volta al mese, solo se ci sono obiettivi attivi)
    const activeGoals = goals.filter((g) => (g.currentAmount / g.targetAmount) < 1);
    if (activeGoals.length > 0 && state.lastMonthlyReminder !== currentMonth) {
      const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
      const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
      const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

      await sendLocalNotification(
        `🎯 I tuoi obiettivi finanziari — ${overallPct}% completato`,
        `Hai ${activeGoals.length} obiettivi attivi. Hai risparmiato ${formatCurrency(totalSaved)} su ${formatCurrency(totalTarget)}. Aggiungi un contributo questo mese!`
      );
      state.lastMonthlyReminder = currentMonth;
      stateChanged = true;
    }

    if (stateChanged) {
      await saveNotifState(state);
    }
  } catch {}
}

/**
 * Resetta lo stato delle notifiche per un obiettivo specifico.
 * Da chiamare quando un obiettivo viene eliminato o reimpostato.
 */
export async function resetGoalNotifState(goalId: string): Promise<void> {
  try {
    const state = await getNotifState();
    state.sentDeadline30 = state.sentDeadline30.filter((id) => id !== goalId);
    state.sentDeadline7 = state.sentDeadline7.filter((id) => id !== goalId);
    state.sentCompletion = state.sentCompletion.filter((id) => id !== goalId);
    await saveNotifState(state);
  } catch {}
}
