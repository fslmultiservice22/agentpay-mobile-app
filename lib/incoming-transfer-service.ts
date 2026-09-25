/**
 * Incoming Transfer Notification Service
 *
 * Simula la ricezione di un bonifico in entrata e invia una notifica locale
 * con importo e mittente. Aggiunge anche il trasferimento alla lista con
 * direction="incoming" per distinguerlo dai pagamenti in uscita.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { addNotificationLog } from "./notification-log";

const TRANSFERS_KEY = "agentpay_bank_transfers";
const INCOMING_COOLDOWN_KEY = "@agentpay_incoming_cooldown"; // anti-spam: 30s

// Nomi mittenti di esempio per la simulazione
const SAMPLE_SENDERS = [
  "Mario Rossi",
  "Giulia Bianchi",
  "Luca Verdi",
  "Anna Ferrari",
  "Marco Esposito",
  "Sara Romano",
  "Paolo Colombo",
  "Chiara Ricci",
  "Azienda S.r.l.",
  "Studio Legale Marini",
];

const SAMPLE_REFERENCES = [
  "Rimborso cena",
  "Quota affitto",
  "Prestito restituito",
  "Contributo spese",
  "Compenso consulenza",
  "Rimborso spese",
  "Pagamento fattura",
  "Acconto lavori",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function scheduleLocalNotification(title: string, body: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: { type: "time", seconds: 1 } as any,
    });
  } catch {
    // Silently ignore
  }
}

export interface IncomingTransferResult {
  id: string;
  sender: string;
  amount: number;
  currency: string;
  reference: string;
}

/**
 * Simula la ricezione di un bonifico in entrata su un conto specifico.
 * Aggiunge il trasferimento ad AsyncStorage e invia una notifica locale.
 *
 * @param accountId  ID del conto che riceve il bonifico
 * @param amount     Importo (opzionale, casuale se non specificato)
 * @param sender     Nome mittente (opzionale, casuale se non specificato)
 * @param reference  Causale (opzionale, casuale se non specificato)
 */
export async function simulateIncomingTransfer(
  accountId: string,
  amount?: number,
  sender?: string,
  reference?: string
): Promise<IncomingTransferResult | null> {
  try {
    // Anti-spam: non simulare più di un bonifico ogni 30 secondi
    const cooldownRaw = await AsyncStorage.getItem(INCOMING_COOLDOWN_KEY);
    if (cooldownRaw) {
      const lastTime = parseInt(cooldownRaw, 10);
      if (Date.now() - lastTime < 30_000) {
        return null; // Troppo presto
      }
    }

    const resolvedSender = sender ?? randomFrom(SAMPLE_SENDERS);
    const resolvedAmount = amount ?? Math.round((Math.random() * 490 + 10) * 100) / 100;
    const resolvedReference = reference ?? randomFrom(SAMPLE_REFERENCES);
    const currency = "EUR";

    // Crea il trasferimento in entrata
    const transfer = {
      id: `incoming_${Date.now()}`,
      accountId,
      amount: resolvedAmount,
      currency,
      status: "completed",
      createdAt: Date.now(),
      completedAt: Date.now(),
      reference: resolvedReference,
      direction: "incoming",
      senderName: resolvedSender,
    };

    // Salva in AsyncStorage
    const raw = await AsyncStorage.getItem(TRANSFERS_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(TRANSFERS_KEY, JSON.stringify([transfer, ...existing]));

    // Aggiorna cooldown
    await AsyncStorage.setItem(INCOMING_COOLDOWN_KEY, String(Date.now()));

    // Notifica locale
    const amountStr = `€${resolvedAmount.toFixed(2)}`;
    await scheduleLocalNotification(
      `💰 Bonifico ricevuto: ${amountStr}`,
      `Da ${resolvedSender} — ${resolvedReference}`
    );

    // Log notifiche in-app
    await addNotificationLog({
      title: `Bonifico ricevuto: ${amountStr}`,
      body: `Da ${resolvedSender} — ${resolvedReference}`,
      type: "transfer_completed",
      data: { transferId: transfer.id, sender: resolvedSender, amount: resolvedAmount },
    });

    return {
      id: transfer.id,
      sender: resolvedSender,
      amount: resolvedAmount,
      currency,
      reference: resolvedReference,
    };
  } catch {
    return null;
  }
}
