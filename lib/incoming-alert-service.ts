/**
 * Incoming Alert Service
 *
 * Controlla se il totale degli accrediti del mese corrente ha superato
 * una soglia configurabile dall'utente (default €500).
 * Invia una notifica locale e salva un log anti-spam (max 1 avviso al giorno).
 *
 * Viene chiamato ogni volta che la Home riceve il focus e dopo ogni
 * simulazione di bonifico in entrata.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { addNotificationLog } from "./notification-log";

const TRANSFERS_KEY = "agentpay_bank_transfers";
export const INCOMING_ALERT_SETTINGS_KEY = "@agentpay_incoming_alert_settings";
const INCOMING_ALERT_SENT_KEY = "@agentpay_incoming_alert_sent"; // { YYYY-MM_threshold: timestamp }

export interface IncomingAlertSettings {
  enabled: boolean;
  threshold: number; // importo soglia in EUR
}

export const DEFAULT_INCOMING_ALERT_SETTINGS: IncomingAlertSettings = {
  enabled: true,
  threshold: 500,
};

export async function loadIncomingAlertSettings(): Promise<IncomingAlertSettings> {
  try {
    const raw = await AsyncStorage.getItem(INCOMING_ALERT_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_INCOMING_ALERT_SETTINGS };
    return { ...DEFAULT_INCOMING_ALERT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_INCOMING_ALERT_SETTINGS };
  }
}

export async function saveIncomingAlertSettings(settings: IncomingAlertSettings): Promise<void> {
  await AsyncStorage.setItem(INCOMING_ALERT_SETTINGS_KEY, JSON.stringify(settings));
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: { type: "time", seconds: 2 } as any,
    });
  } catch {
    // Silently ignore
  }
}

/**
 * Controlla se il totale degli accrediti mensili ha superato la soglia configurata.
 * Chiama questa funzione ogni volta che la Home riceve il focus o dopo una simulazione.
 */
export async function checkIncomingAlerts(): Promise<void> {
  try {
    const [settings, transfersRaw, sentRaw] = await Promise.all([
      loadIncomingAlertSettings(),
      AsyncStorage.getItem(TRANSFERS_KEY),
      AsyncStorage.getItem(INCOMING_ALERT_SENT_KEY),
    ]);

    if (!settings.enabled || settings.threshold <= 0) return;

    const transfers: Array<{
      amount: number;
      createdAt: number;
      direction?: string;
      status?: string;
    }> = transfersRaw ? JSON.parse(transfersRaw) : [];

    const sentMap: Record<string, number> = sentRaw ? JSON.parse(sentRaw) : {};

    const now = new Date();
    const mk = currentMonthKey();

    // Calcola totale accrediti del mese corrente
    const monthlyIncoming = transfers
      .filter((t) => {
        if ((t as any).direction !== "incoming") return false;
        const d = new Date(t.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);

    if (monthlyIncoming < settings.threshold) return;

    // Anti-spam: non inviare più di un avviso al giorno per la stessa soglia/mese
    const sentKey = `${mk}_${settings.threshold}`;
    const lastSent = sentMap[sentKey] ?? 0;
    const hoursSinceLast = (Date.now() - lastSent) / (1000 * 60 * 60);
    if (hoursSinceLast < 24) return;

    // Invia notifica
    const amountStr = `€${monthlyIncoming.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
    const thresholdStr = `€${settings.threshold.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
    const title = `💰 Soglia entrate superata!`;
    const body = `Hai ricevuto ${amountStr} questo mese, superando la soglia di ${thresholdStr}.`;

    await scheduleLocalNotification(title, body);

    // Log in-app
    await addNotificationLog({
      title,
      body,
      type: "transfer_completed",
      data: { monthlyIncoming, threshold: settings.threshold },
    });

    // Aggiorna anti-spam
    sentMap[sentKey] = Date.now();
    await AsyncStorage.setItem(INCOMING_ALERT_SENT_KEY, JSON.stringify(sentMap));
  } catch {
    // Silently ignore — non bloccare la UI
  }
}
