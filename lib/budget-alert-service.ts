/**
 * Budget Alert Service
 *
 * Controlla se una o più categorie di spesa hanno superato l'80% del budget mensile
 * e invia una notifica locale. Viene chiamato ogni volta che la Home riceve il focus.
 *
 * Anti-spam: salva in AsyncStorage la data dell'ultimo avviso per categoria
 * e non manda più di un avviso al giorno per categoria.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const BUDGETS_KEY = "agentpay_category_budgets";
const TRANSFERS_KEY = "agentpay_bank_transfers";
const ALERT_SENT_KEY = "@agentpay_budget_alert_sent"; // { categoryId_YYYY-MM: timestamp }
const ADVANCED_SETTINGS_KEY = "@agentpay_advanced_settings";
const BUDGET_ALERT_SETTINGS_KEY = "@agentpay_budget_alert_settings";

export interface BudgetAlertSettings {
  enabled: boolean;
  threshold80: boolean;  // Notifica all'80%
  threshold100: boolean; // Notifica al 100% (sforamento)
}

export const DEFAULT_BUDGET_ALERT_SETTINGS: BudgetAlertSettings = {
  enabled: true,
  threshold80: true,
  threshold100: true,
};

export async function loadBudgetAlertSettings(): Promise<BudgetAlertSettings> {
  try {
    const raw = await AsyncStorage.getItem(BUDGET_ALERT_SETTINGS_KEY);
    if (!raw) return DEFAULT_BUDGET_ALERT_SETTINGS;
    return { ...DEFAULT_BUDGET_ALERT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_BUDGET_ALERT_SETTINGS;
  }
}

export async function saveBudgetAlertSettings(settings: BudgetAlertSettings): Promise<void> {
  await AsyncStorage.setItem(BUDGET_ALERT_SETTINGS_KEY, JSON.stringify(settings));
}

// ── Categorie (stessa lista di category-budget.tsx) ────────────────────────────
const CATEGORIES = [
  { id: "affitto",    label: "Affitto",       icon: "🏠", keywords: ["affitto", "rent", "locazione", "canone"] },
  { id: "utenze",     label: "Utenze",        icon: "💡", keywords: ["luce", "gas", "acqua", "elettricità", "enel", "eni", "snam"] },
  { id: "stipendio",  label: "Stipendio",     icon: "💼", keywords: ["stipendio", "salary", "paga", "compenso", "retribuzione"] },
  { id: "spesa",      label: "Spesa/Cibo",    icon: "🛒", keywords: ["spesa", "supermercato", "cibo", "alimentari", "ristorante"] },
  { id: "assicuraz",  label: "Assicurazione", icon: "🛡️", keywords: ["assicurazione", "polizza", "rca", "inail"] },
  { id: "salute",     label: "Salute",        icon: "🏥", keywords: ["medico", "farmacia", "dentista", "visita", "analisi"] },
  { id: "trasporti",  label: "Trasporti",     icon: "🚗", keywords: ["carburante", "benzina", "bollo", "parcheggio", "treno"] },
  { id: "abbonament", label: "Abbonamenti",   icon: "📱", keywords: ["netflix", "spotify", "abbonamento", "subscription"] },
  { id: "rimborso",   label: "Rimborso",      icon: "🔄", keywords: ["rimborso", "restituzione", "refund"] },
  { id: "altro",      label: "Altro",         icon: "📦", keywords: [] },
] as const;

function classifyTransfer(description: string): string {
  const lower = (description || "").toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.id === "altro") continue;
    if ((cat.keywords as readonly string[]).some((kw) => lower.includes(kw))) return cat.id;
  }
  return "altro";
}

function monthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate();
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
    // Silently ignore notification errors
  }
}

export async function checkBudgetAlerts(): Promise<void> {
  try {
    // Carica budget e trasferimenti
    const [budgetRaw, transfersRaw, sentRaw, advancedRaw] = await Promise.all([
      AsyncStorage.getItem(BUDGETS_KEY),
      AsyncStorage.getItem(TRANSFERS_KEY),
      AsyncStorage.getItem(ALERT_SENT_KEY),
      AsyncStorage.getItem(ADVANCED_SETTINGS_KEY),
    ]);

    if (!budgetRaw) return; // Nessun budget configurato
    const budgets: Record<string, number> = JSON.parse(budgetRaw);
    // Leggi soglia personalizzata (default 80)
    const advancedSettings = advancedRaw ? JSON.parse(advancedRaw) : {};
    const alertThresholdPct = (advancedSettings.budgetAlertThreshold ?? 80) / 100;
    const transfers: Array<{
      status: string;
      createdAt: number;
      amount: number;
      reference?: string;
      recipientName?: string;
    }> = transfersRaw ? JSON.parse(transfersRaw) : [];
    const sentMap: Record<string, number> = sentRaw ? JSON.parse(sentRaw) : {};

    const now = new Date();
    const mk = monthKey();
    const daysLeft = daysLeftInMonth();

    // Filtra solo trasferimenti completati di questo mese
    const monthTransfers = transfers.filter((t) => {
      if (t.status !== "completed") return false;
      const d = new Date(t.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    // Calcola spesa per categoria
    const spentByCategory: Record<string, number> = {};
    for (const t of monthTransfers) {
      const desc = `${t.reference ?? ""} ${t.recipientName ?? ""}`;
      const catId = classifyTransfer(desc);
      spentByCategory[catId] = (spentByCategory[catId] ?? 0) + t.amount;
    }

    // Controlla ogni categoria con budget impostato
    const alertsToSend: Array<{ title: string; body: string }> = [];
    const updatedSentMap = { ...sentMap };

    for (const [catId, limit] of Object.entries(budgets)) {
      if (limit <= 0) continue;
      const spent = spentByCategory[catId] ?? 0;
      const pct = spent / limit;
      if (pct < alertThresholdPct) continue; // Sotto la soglia configurata, nessun avviso

      const sentKey = `${catId}_${mk}`;
      const lastSent = sentMap[sentKey] ?? 0;
      const hoursSinceLastSent = (Date.now() - lastSent) / (1000 * 60 * 60);

      // Non inviare più di un avviso ogni 24 ore per categoria
      if (hoursSinceLastSent < 24) continue;

      const cat = CATEGORIES.find((c) => c.id === catId);
      const icon = cat?.icon ?? "📊";
      const label = cat?.label ?? catId;
      const pctLabel = Math.round(pct * 100);

      if (pct >= 1) {
        alertsToSend.push({
          title: `${icon} Budget ${label} superato!`,
          body: `Hai speso €${spent.toFixed(2)} su €${limit.toFixed(2)} (${pctLabel}%). Limite mensile raggiunto.`,
        });
      } else if (daysLeft <= 5) {
        alertsToSend.push({
          title: `${icon} Budget ${label} quasi esaurito`,
          body: `Hai usato il ${pctLabel}% del budget (€${spent.toFixed(2)}/€${limit.toFixed(2)}). Mancano ${daysLeft} giorni al mese.`,
        });
      } else {
        alertsToSend.push({
          title: `${icon} Budget ${label} all'${pctLabel}%`,
          body: `Hai speso €${spent.toFixed(2)} su €${limit.toFixed(2)}. Attenzione: stai avvicinandoti al limite.`,
        });
      }

      updatedSentMap[sentKey] = Date.now();
    }

    if (alertsToSend.length === 0) return;

    // Aggiorna il registro degli avvisi inviati
    await AsyncStorage.setItem(ALERT_SENT_KEY, JSON.stringify(updatedSentMap));

    // Invia le notifiche (max 3 per non spammare)
    const toSend = alertsToSend.slice(0, 3);
    for (const alert of toSend) {
      await scheduleLocalNotification(alert.title, alert.body);
    }

    // Se ci sono più di 3 avvisi, invia un riepilogo
    if (alertsToSend.length > 3) {
      await scheduleLocalNotification(
        "⚠️ Più budget in scadenza",
        `${alertsToSend.length} categorie hanno superato l'80% del budget mensile.`
      );
    }
  } catch {
    // Silently ignore errors — non bloccare la UI
  }
}
