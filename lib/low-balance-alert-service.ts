/**
 * Servizio notifica saldo sotto soglia
 *
 * Invia una notifica push quando il saldo totale scende sotto
 * una soglia configurabile dall'utente.
 * Anti-spam: massimo 1 notifica ogni 6 ore.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const SETTINGS_KEY = 'agentpay_low_balance_alert';
const LAST_NOTIF_KEY = 'agentpay_low_balance_last_notif';
const COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 ore

export interface LowBalanceAlertSettings {
  enabled: boolean;
  threshold: number; // importo in EUR
}

export const DEFAULT_LOW_BALANCE_SETTINGS: LowBalanceAlertSettings = {
  enabled: false,
  threshold: 100,
};

export async function loadLowBalanceAlertSettings(): Promise<LowBalanceAlertSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_LOW_BALANCE_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_LOW_BALANCE_SETTINGS };
}

export async function saveLowBalanceAlertSettings(s: LowBalanceAlertSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export async function checkLowBalanceAlert(currentBalance: number): Promise<void> {
  try {
    const settings = await loadLowBalanceAlertSettings();
    if (!settings.enabled) return;
    if (currentBalance >= settings.threshold) return;

    // Anti-spam: controlla ultima notifica
    const lastRaw = await AsyncStorage.getItem(LAST_NOTIF_KEY);
    if (lastRaw) {
      const lastTs = parseInt(lastRaw, 10);
      if (Date.now() - lastTs < COOLDOWN_MS) return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Saldo basso',
        body: `Il tuo saldo (€${currentBalance.toLocaleString('it-IT', { minimumFractionDigits: 2 })}) è sceso sotto la soglia di €${settings.threshold.toLocaleString('it-IT', { minimumFractionDigits: 2 })}.`,
        data: { type: 'low_balance' },
      },
      trigger: null,
    });

    await AsyncStorage.setItem(LAST_NOTIF_KEY, String(Date.now()));
  } catch {}
}
