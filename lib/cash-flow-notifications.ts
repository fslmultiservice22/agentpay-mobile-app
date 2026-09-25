/**
 * Cash Flow Forecast Notifications
 * Invia notifiche push automatiche quando la previsione del flusso di cassa è negativa
 * - All'inizio di ogni mese se il flusso previsto è negativo
 * - Una sola notifica per mese (evita spam)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIF_KEY = 'agentpay_cashflow_notif_sent';

export interface CashFlowForecastData {
  net: number;
  income: number;
  expenses: number;
  month: string; // es. "giugno 2026"
}

/**
 * Richiede i permessi per le notifiche push (solo la prima volta)
 */
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Controlla se occorre inviare una notifica per il flusso di cassa negativo.
 * Chiama questa funzione ogni volta che l'utente apre /cash-flow-forecast.
 */
export async function checkCashFlowNotifications(forecast: CashFlowForecastData): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;

    // Leggi le notifiche già inviate
    const raw = await AsyncStorage.getItem(NOTIF_KEY);
    const sent: Record<string, boolean> = raw ? JSON.parse(raw) : {};

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    // Notifica flusso negativo (una sola volta per mese)
    const negativeKey = `negative_${monthKey}`;
    if (forecast.net < 0 && !sent[negativeKey]) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Flusso di cassa negativo previsto',
          body: `Per ${forecast.month} prevedi uscite di €${Math.abs(forecast.expenses).toFixed(0)} vs entrate di €${forecast.income.toFixed(0)}. Considera di ridurre le spese variabili.`,
          data: { screen: '/cash-flow-forecast' },
        },
        trigger: null, // immediata
      });
      sent[negativeKey] = true;
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(sent));
    }

    // Notifica flusso molto negativo (>20% negativo)
    const severeKey = `severe_${monthKey}`;
    const severity = forecast.income > 0 ? Math.abs(forecast.net) / forecast.income : 0;
    if (forecast.net < 0 && severity > 0.2 && !sent[severeKey]) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Attenzione: flusso di cassa critico',
          body: `Il flusso negativo previsto per ${forecast.month} supera il 20% delle entrate (€${Math.abs(forecast.net).toFixed(0)}). Rivedi i pagamenti ricorrenti.`,
          data: { screen: '/cash-flow-forecast' },
        },
        trigger: null,
      });
      sent[severeKey] = true;
      await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(sent));
    }

    // Notifica positiva di recupero (se il mese scorso era negativo e ora è positivo)
    const recoveryKey = `recovery_${monthKey}`;
    if (forecast.net > 0 && !sent[recoveryKey]) {
      const prevMonthKey = `negative_${now.getFullYear()}-${now.getMonth()}`;
      if (sent[prevMonthKey]) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Flusso di cassa in recupero',
            body: `Ottimo! Per ${forecast.month} prevedi un flusso positivo di €${forecast.net.toFixed(0)}. Continua così!`,
            data: { screen: '/cash-flow-forecast' },
          },
          trigger: null,
        });
        sent[recoveryKey] = true;
        await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(sent));
      }
    }
  } catch (err) {
    // Silently fail — notifiche non critiche
  }
}
