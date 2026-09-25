/**
 * balance-sweep-service.ts
 *
 * Giro di fondo automatico: quando il saldo di un conto sorgente supera
 * una soglia configurabile, l'eccedenza viene trasferita automaticamente
 * al conto di risparmio designato.
 *
 * Funzionalità:
 * - Soglia fissa configurabile
 * - Soglia dinamica per giorno del mese (es. soglia più alta vicino alle scadenze)
 * - Anti-spam: un solo sweep ogni 24 ore per coppia sorgente/destinazione
 * - Storico: ogni sweep viene registrato in AsyncStorage (max 100 record)
 * - Notifica push all'esecuzione
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Chiavi storage ────────────────────────────────────────────────────────────
const SETTINGS_KEY = '@agentpay_balance_sweep_settings';
const HISTORY_KEY = '@agentpay_balance_sweep_history';
const LAST_SWEEP_KEY = '@agentpay_balance_sweep_last';
const ACCOUNTS_KEY = 'agentpay_bank_accounts';
const TRANSFERS_KEY = 'agentpay_bank_transfers';

// ── Tipi ──────────────────────────────────────────────────────────────────────
export interface BalanceSweepSettings {
  enabled: boolean;
  sourceAccountId: string;
  targetAccountId: string;
  threshold: number;
  minSweepAmount: number;
  keepBuffer: number;
  // Soglia dinamica per giorno del mese
  dynamicThresholdEnabled: boolean;
  dynamicThresholdDays: number[];    // Giorni del mese (1-31) in cui usare la soglia alta
  dynamicThresholdAmount: number;    // Soglia alta da usare nei giorni configurati
}

export const DEFAULT_SWEEP_SETTINGS: BalanceSweepSettings = {
  enabled: false,
  sourceAccountId: '',
  targetAccountId: '',
  threshold: 1000,
  minSweepAmount: 10,
  keepBuffer: 0,
  dynamicThresholdEnabled: false,
  dynamicThresholdDays: [25, 26, 27, 28, 29, 30, 31],
  dynamicThresholdAmount: 2000,
};

export interface SweepRecord {
  id: string;
  timestamp: number;
  sourceAccountId: string;
  targetAccountId: string;
  sourceAccountName: string;
  targetAccountName: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  usedDynamicThreshold?: boolean;
  appliedThreshold?: number;
}

// ── Persistenza impostazioni ──────────────────────────────────────────────────
export async function loadSweepSettings(): Promise<BalanceSweepSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SWEEP_SETTINGS };
    return { ...DEFAULT_SWEEP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SWEEP_SETTINGS };
  }
}

export async function saveSweepSettings(settings: BalanceSweepSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Storico sweep ─────────────────────────────────────────────────────────────
export async function loadSweepHistory(): Promise<SweepRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function appendSweepRecord(record: SweepRecord): Promise<void> {
  const history = await loadSweepHistory();
  const updated = [record, ...history].slice(0, 100);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

// ── Notifica push ─────────────────────────────────────────────────────────────
async function sendSweepNotification(
  amount: number,
  sourceName: string,
  targetName: string,
  dynamic?: boolean
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('balance-sweep', {
        name: 'Giro di Fondo',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💸 Giro di fondo eseguito',
        body: `€${amount.toFixed(2)} trasferiti da "${sourceName}" a "${targetName}".${dynamic ? ' (soglia dinamica attiva)' : ''}`,
        data: { type: 'balance-sweep' },
      },
      trigger: null,
    });
  } catch {
    // Silenzioso
  }
}

// ── Logica principale ─────────────────────────────────────────────────────────
/**
 * Determina la soglia effettiva in base al giorno del mese corrente.
 * Se la soglia dinamica è abilitata e il giorno corrente è nella lista,
 * restituisce la soglia alta; altrimenti restituisce la soglia base.
 */
export function getEffectiveThreshold(settings: BalanceSweepSettings): { threshold: number; isDynamic: boolean } {
  if (settings.dynamicThresholdEnabled && settings.dynamicThresholdDays.length > 0) {
    const today = new Date().getDate();
    if (settings.dynamicThresholdDays.includes(today)) {
      return { threshold: settings.dynamicThresholdAmount, isDynamic: true };
    }
  }
  return { threshold: settings.threshold, isDynamic: false };
}

/**
 * Controlla se lo sweep è necessario e lo esegue.
 * Deve essere chiamata ogni volta che la Home riceve il focus o i saldi cambiano.
 */
export async function checkAndExecuteSweep(): Promise<SweepRecord | null> {
  try {
    const settings = await loadSweepSettings();
    if (!settings.enabled) return null;
    if (!settings.sourceAccountId || !settings.targetAccountId) return null;
    if (settings.sourceAccountId === settings.targetAccountId) return null;

    // Anti-spam: non fare più di uno sweep ogni 24 ore per questa coppia
    const pairKey = `${settings.sourceAccountId}:${settings.targetAccountId}`;
    const lastRaw = await AsyncStorage.getItem(LAST_SWEEP_KEY);
    const lastMap: Record<string, number> = lastRaw ? JSON.parse(lastRaw) : {};
    const lastTs = lastMap[pairKey] ?? 0;
    const hoursSinceLast = (Date.now() - lastTs) / (1000 * 60 * 60);
    if (hoursSinceLast < 24) return null;

    // Carica i conti
    const accountsRaw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!accountsRaw) return null;
    const accounts: Array<{ id: string; accountHolder: string; balance: number; iban?: string }> = JSON.parse(accountsRaw);

    const sourceIdx = accounts.findIndex((a) => a.id === settings.sourceAccountId);
    const targetIdx = accounts.findIndex((a) => a.id === settings.targetAccountId);
    if (sourceIdx === -1 || targetIdx === -1) return null;

    const source = accounts[sourceIdx];
    const target = accounts[targetIdx];
    const currentBalance = source.balance ?? 0;

    // Determina soglia effettiva (base o dinamica)
    const { threshold: effectiveThreshold, isDynamic } = getEffectiveThreshold(settings);

    // Calcola importo da spostare
    const excess = currentBalance - effectiveThreshold - settings.keepBuffer;
    if (excess < settings.minSweepAmount) return null;

    const sweepAmount = Math.floor(excess * 100) / 100;

    // Aggiorna i saldi
    const updatedAccounts = [...accounts];
    updatedAccounts[sourceIdx] = { ...source, balance: currentBalance - sweepAmount };
    updatedAccounts[targetIdx] = { ...target, balance: (target.balance ?? 0) + sweepAmount };
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updatedAccounts));

    // Crea un record di trasferimento nello storico
    const transferRecord = {
      id: `sweep_${Date.now()}`,
      status: 'completed',
      direction: 'outgoing',
      amount: sweepAmount,
      recipientName: target.accountHolder,
      recipientIban: target.iban ?? '',
      reference: `Giro di fondo automatico → ${target.accountHolder}${isDynamic ? ' (soglia dinamica)' : ''}`,
      createdAt: Date.now(),
      accountId: source.id,
      type: 'sweep',
    };
    const transfersRaw = await AsyncStorage.getItem(TRANSFERS_KEY);
    const transfers = transfersRaw ? JSON.parse(transfersRaw) : [];
    await AsyncStorage.setItem(TRANSFERS_KEY, JSON.stringify([transferRecord, ...transfers]));

    // Crea il record sweep
    const record: SweepRecord = {
      id: `sweep_${Date.now()}`,
      timestamp: Date.now(),
      sourceAccountId: source.id,
      targetAccountId: target.id,
      sourceAccountName: source.accountHolder,
      targetAccountName: target.accountHolder,
      amount: sweepAmount,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - sweepAmount,
      usedDynamicThreshold: isDynamic,
      appliedThreshold: effectiveThreshold,
    };

    await appendSweepRecord(record);
    const updatedLastMap = { ...lastMap, [pairKey]: Date.now() };
    await AsyncStorage.setItem(LAST_SWEEP_KEY, JSON.stringify(updatedLastMap));

    await sendSweepNotification(sweepAmount, source.accountHolder, target.accountHolder, isDynamic);

    return record;
  } catch {
    return null;
  }
}

// ── Notifica saldo sotto soglia ─────────────────────────────────────────────────

export interface LowBalanceAlertSettings {
  enabled: boolean;
  thresholdPercent: number;  // % della soglia sweep sotto cui scatta l'avviso (es. 20 = saldo < 20% della soglia)
  absoluteThreshold: number; // Soglia assoluta alternativa in EUR
  useAbsolute: boolean;      // true = usa soglia assoluta, false = usa percentuale
}

export const DEFAULT_LOW_BALANCE_ALERT: LowBalanceAlertSettings = {
  enabled: false,
  thresholdPercent: 20,
  absoluteThreshold: 200,
  useAbsolute: false,
};

const LOW_BALANCE_ALERT_KEY = '@agentpay_low_balance_sweep_alert';
const LOW_BALANCE_LAST_KEY = '@agentpay_low_balance_sweep_last';

export async function loadLowBalanceAlertSettings(): Promise<LowBalanceAlertSettings> {
  try {
    const raw = await AsyncStorage.getItem(LOW_BALANCE_ALERT_KEY);
    if (!raw) return { ...DEFAULT_LOW_BALANCE_ALERT };
    return { ...DEFAULT_LOW_BALANCE_ALERT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_LOW_BALANCE_ALERT };
  }
}

export async function saveLowBalanceAlertSettings(s: LowBalanceAlertSettings): Promise<void> {
  await AsyncStorage.setItem(LOW_BALANCE_ALERT_KEY, JSON.stringify(s));
}

/**
 * Controlla se il saldo del conto sorgente sweep è sceso sotto la soglia configurata
 * e invia una notifica push. Anti-spam: una notifica ogni 12 ore.
 */
export async function checkLowBalanceAlert(): Promise<void> {
  try {
    const alertSettings = await loadLowBalanceAlertSettings();
    if (!alertSettings.enabled) return;

    const sweepSettings = await loadSweepSettings();
    if (!sweepSettings.sourceAccountId) return;

    // Anti-spam 12h
    const lastRaw = await AsyncStorage.getItem(LOW_BALANCE_LAST_KEY);
    const lastTs = lastRaw ? parseInt(lastRaw, 10) : 0;
    if ((Date.now() - lastTs) < 12 * 60 * 60 * 1000) return;

    const accountsRaw = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (!accountsRaw) return;
    const accounts: Array<{ id: string; accountHolder: string; balance: number }> = JSON.parse(accountsRaw);
    const source = accounts.find((a) => a.id === sweepSettings.sourceAccountId);
    if (!source) return;

    const currentBalance = source.balance ?? 0;
    const { threshold: effectiveThreshold } = getEffectiveThreshold(sweepSettings);

    let alertThreshold: number;
    if (alertSettings.useAbsolute) {
      alertThreshold = alertSettings.absoluteThreshold;
    } else {
      alertThreshold = effectiveThreshold * (alertSettings.thresholdPercent / 100);
    }

    if (currentBalance > alertThreshold) return;

    // Invia notifica
    if (Platform.OS === 'web') return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('low-balance-sweep', {
        name: 'Saldo Basso Sweep',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Saldo sotto soglia',
        body: `Il saldo di "${source.accountHolder}" (€${currentBalance.toFixed(2)}) è sceso sotto la soglia di €${alertThreshold.toFixed(2)}.`,
        data: { type: 'low-balance-sweep' },
      },
      trigger: null,
    });

    await AsyncStorage.setItem(LOW_BALANCE_LAST_KEY, String(Date.now()));
  } catch {
    // Silenzioso
  }
}
