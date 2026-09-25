import AsyncStorage from "@react-native-async-storage/async-storage";

const LOG_KEY = "agentpay_notification_log";
const MAX_ENTRIES = 100;

export type NotificationLogEntry = {
  id: string;
  title: string;
  body: string;
  type: "transfer_completed" | "transfer_failed" | "reminder" | "recurring" | "info";
  timestamp: number;
  read: boolean;
  data?: Record<string, unknown>;
};

export async function addNotificationLog(
  entry: Omit<NotificationLogEntry, "id" | "timestamp" | "read">
): Promise<void> {
  const raw = await AsyncStorage.getItem(LOG_KEY);
  const existing: NotificationLogEntry[] = raw ? JSON.parse(raw) : [];
  const newEntry: NotificationLogEntry = {
    ...entry,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    read: false,
  };
  const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
}

export async function getNotificationLog(): Promise<NotificationLogEntry[]> {
  const raw = await AsyncStorage.getItem(LOG_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function markAllRead(): Promise<void> {
  const raw = await AsyncStorage.getItem(LOG_KEY);
  if (!raw) return;
  const entries: NotificationLogEntry[] = JSON.parse(raw);
  const updated = entries.map((e) => ({ ...e, read: true }));
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(updated));
}

export async function clearNotificationLog(): Promise<void> {
  await AsyncStorage.removeItem(LOG_KEY);
}

export async function getUnreadCount(): Promise<number> {
  const entries = await getNotificationLog();
  return entries.filter((e) => !e.read).length;
}
