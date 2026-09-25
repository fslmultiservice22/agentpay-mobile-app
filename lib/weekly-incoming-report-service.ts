/**
 * Weekly Incoming Report Service
 *
 * Ogni lunedì mattina invia una notifica push con il totale degli accrediti
 * della settimana precedente (lun–dom) e il confronto con la settimana prima.
 *
 * Rispetta il toggle `weeklyReport` in notification-settings.tsx.
 * Anti-spam: massimo 1 notifica per settimana ISO (chiave YYYY-Wxx).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { addNotificationLog } from "./notification-log";
import { getNotificationSettings } from "@/app/notification-settings";

const TRANSFERS_KEY = "agentpay_bank_transfers";
const WEEKLY_SENT_KEY = "@agentpay_weekly_incoming_sent"; // { YYYY-Wxx: timestamp }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Restituisce la chiave ISO della settimana: es. "2026-W22" */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1=lun … 7=dom
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Restituisce inizio (lun 00:00) e fine (dom 23:59:59) della settimana precedente */
function prevWeekRange(): { start: number; end: number; label: string } {
  const now = new Date();
  const day = now.getDay() || 7; // 1=lun … 7=dom
  // Inizio della settimana corrente (lunedì)
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - (day - 1));
  thisMonday.setHours(0, 0, 0, 0);
  // Settimana precedente
  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(thisMonday.getDate() - 7);
  const prevSunday = new Date(thisMonday);
  prevSunday.setMilliseconds(-1);

  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
  const label = `${fmt(prevMonday)} – ${fmt(prevSunday)}`;
  return { start: prevMonday.getTime(), end: prevSunday.getTime(), label };
}

/** Restituisce inizio e fine della settimana 2 settimane fa */
function twoWeeksAgoRange(): { start: number; end: number } {
  const now = new Date();
  const day = now.getDay() || 7;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - (day - 1));
  thisMonday.setHours(0, 0, 0, 0);
  const twoAgoMonday = new Date(thisMonday);
  twoAgoMonday.setDate(thisMonday.getDate() - 14);
  const twoAgoSunday = new Date(thisMonday);
  twoAgoSunday.setDate(thisMonday.getDate() - 7);
  twoAgoSunday.setMilliseconds(-1);
  return { start: twoAgoMonday.getTime(), end: twoAgoSunday.getTime() };
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

// ─── Funzione principale ──────────────────────────────────────────────────────

/**
 * Controlla se è lunedì e se non è già stato inviato il report settimanale.
 * Se sì, calcola il totale degli accrediti della settimana precedente e invia
 * una notifica push con il confronto rispetto alla settimana prima.
 *
 * Chiama questa funzione ogni volta che la Home riceve il focus.
 */
export async function checkWeeklyIncomingReport(): Promise<void> {
  try {
    // Controlla se il toggle weeklyReport è abilitato
    const notifSettings = await getNotificationSettings();
    if (!notifSettings.weeklyReport) return;

    // Solo il lunedì
    const now = new Date();
    if (now.getDay() !== 1) return; // 1 = lunedì

    const [transfersRaw, sentRaw] = await Promise.all([
      AsyncStorage.getItem(TRANSFERS_KEY),
      AsyncStorage.getItem(WEEKLY_SENT_KEY),
    ]);

    const sentMap: Record<string, number> = sentRaw ? JSON.parse(sentRaw) : {};

    // Anti-spam: una sola notifica per settimana ISO
    const weekKey = isoWeekKey(now);
    const lastSent = sentMap[weekKey] ?? 0;
    const hoursSinceLast = (Date.now() - lastSent) / (1000 * 60 * 60);
    if (hoursSinceLast < 24) return;

    const transfers: Array<{
      amount: number;
      createdAt: number;
      direction?: string;
      status?: string;
    }> = transfersRaw ? JSON.parse(transfersRaw) : [];

    const { start: prevStart, end: prevEnd, label: weekLabel } = prevWeekRange();
    const { start: twoStart, end: twoEnd } = twoWeeksAgoRange();

    const inPrevWeek = transfers.filter(
      (t) => (t as any).direction === "incoming" && t.createdAt >= prevStart && t.createdAt <= prevEnd
    );
    const inTwoWeeksAgo = transfers.filter(
      (t) => (t as any).direction === "incoming" && t.createdAt >= twoStart && t.createdAt <= twoEnd
    );

    const prevTotal = inPrevWeek.reduce((s, t) => s + t.amount, 0);
    const twoTotal = inTwoWeeksAgo.reduce((s, t) => s + t.amount, 0);

    // Non inviare se non ci sono accrediti la settimana scorsa
    if (prevTotal === 0 && inPrevWeek.length === 0) return;

    const amountStr = `€${prevTotal.toLocaleString("it-IT", { minimumFractionDigits: 2 })}`;
    const countStr = `${inPrevWeek.length} ${inPrevWeek.length === 1 ? "bonifico" : "bonifici"}`;

    let trendStr = "";
    if (twoTotal > 0) {
      const diff = ((prevTotal - twoTotal) / twoTotal) * 100;
      trendStr = diff >= 0
        ? ` · ↑ +${Math.round(diff)}% vs settimana prima`
        : ` · ↓ ${Math.round(diff)}% vs settimana prima`;
    }

    const title = "💚 Riepilogo entrate settimanale";
    const body = `${weekLabel}: hai ricevuto ${amountStr} (${countStr})${trendStr}.`;

    await scheduleLocalNotification(title, body);

    await addNotificationLog({
      title,
      body,
      type: "transfer_completed",
      data: { weekLabel, prevTotal, prevCount: inPrevWeek.length, twoTotal },
    });

    // Aggiorna anti-spam
    sentMap[weekKey] = Date.now();
    await AsyncStorage.setItem(WEEKLY_SENT_KEY, JSON.stringify(sentMap));
  } catch {
    // Silently ignore — non bloccare la UI
  }
}
