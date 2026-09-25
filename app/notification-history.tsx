import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useState, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  getNotificationLog,
  markAllRead,
  clearNotificationLog,
  NotificationLogEntry,
} from "@/lib/notification-log";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from '@expo/vector-icons';

const TYPE_CONFIG: Record<
  NotificationLogEntry["type"],
  { icon: string; label: string; color: (c: ReturnType<typeof useColors>) => string }
> = {
  transfer_completed: { icon: "✅", label: "Completato", color: (c) => c.success },
  transfer_failed:    { icon: "❌", label: "Fallito",    color: (c) => c.error },
  reminder:           { icon: "⏰", label: "Promemoria", color: (c) => c.warning },
  recurring:          { icon: "🔄", label: "Ricorrente", color: (c) => c.primary },
  info:               { icon: "ℹ️", label: "Info",       color: (c) => c.muted },
};

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Adesso";
  if (mins < 60) return `${mins} min fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ore fa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} giorni fa`;
  return new Date(ts).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NotificationHistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const [entries, setEntries] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const data = await getNotificationLog();
    setEntries(data);
    setLoading(false);
    // Mark all as read when screen opens
    await markAllRead();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleClear = () => {
    Alert.alert(
      "Cancella storico",
      "Sei sicuro di voler eliminare tutte le notifiche?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Cancella tutto",
          style: "destructive",
          onPress: async () => {
            await clearNotificationLog();
            setEntries([]);
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const unread = entries.filter((e) => !e.read).length;

  return (
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>← Indietro</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>Notifiche</Text>
            <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
              {entries.length > 0
                ? `${entries.length} notifiche${unread > 0 ? ` · ${unread} non lette` : ""}`
                : "Nessuna notifica"}
            </Text>
          </View>
          {entries.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>🗑 Cancella</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 60, gap: 12 }}>
              <MaterialIcons name="notifications" size={56} color={colors.muted} />
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Nessuna notifica</Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", paddingHorizontal: 32 }}>
                Le notifiche di trasferimenti, promemoria e bonifici ricorrenti appariranno qui
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = TYPE_CONFIG[item.type];
            const accentColor = cfg.color(colors);
            return (
              <View
                style={{
                  backgroundColor: item.read ? colors.surface : colors.primary + "08",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: item.read ? colors.border : colors.primary + "30",
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  padding: 14,
                  gap: 12,
                }}
              >
                {/* Icon */}
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: accentColor + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
                </View>

                {/* Content */}
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 }} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!item.read && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 18 }} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <View style={{
                      backgroundColor: accentColor + "18",
                      borderRadius: 6,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: accentColor }}>{cfg.label}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{formatRelativeTime(item.timestamp)}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
