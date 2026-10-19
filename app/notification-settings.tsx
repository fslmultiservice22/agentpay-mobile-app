import {
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useFocusEffect, useRouter } from "expo-router";

import {
  NotificationSectionTitle,
  NotificationToggleRow,
} from "@/components/notification-settings-primitives";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const SETTINGS_KEY = "agentpay_notification_settings";

interface NotificationSettings {
  transferCompleted: boolean;
  transferFailed: boolean;
  recurringReminder: boolean;
  budgetAlert: boolean;
  currencyAlert: boolean;
  dailyDigest: boolean;
  dailyDigestHour: number;
  weeklyReport: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  transferCompleted: true,
  transferFailed: true,
  recurringReminder: true,
  budgetAlert: true,
  currencyAlert: false,
  dailyDigest: false,
  dailyDigestHour: 9,
  weeklyReport: false,
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [settings, setSettings] =
    useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      getNotificationSettings().then(setSettings);

      if (Platform.OS !== "web") {
        Notifications.getPermissionsAsync().then((status) => {
          setPermissionGranted(status.granted);
        });
      } else {
        setPermissionGranted(true);
      }
    }, []),
  );

  const save = async (updated: NotificationSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggle = (key: keyof NotificationSettings) => {
    if (typeof settings[key] !== "boolean") return;
    void save({ ...settings, [key]: !settings[key] });
  };

  const requestPermission = async () => {
    if (Platform.OS === "web") return;
    const { granted } = await Notifications.requestPermissionsAsync();
    setPermissionGranted(granted);

    if (!granted) {
      Alert.alert(
        "Permesso negato",
        "Per ricevere notifiche, abilita i permessi nelle Impostazioni del dispositivo.",
        [{ text: "OK" }],
      );
    }
  };

  return (
    <ScreenContainer>
      <View
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 28,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 16 }}
        >
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>
            ← Indietro
          </Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>
          Notifiche
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.7)",
            marginTop: 4,
          }}
        >
          Gestisci quando e come ricevere avvisi
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {permissionGranted === false ? (
          <TouchableOpacity
            onPress={requestPermission}
            style={{
              margin: 16,
              backgroundColor: `${colors.warning}18`,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: `${colors.warning}40`,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <MaterialIcons name="warning" size={22} color={colors.foreground} />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.warning,
                }}
              >
                Notifiche disabilitate
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
                Tocca per abilitare i permessi
              </Text>
            </View>
            <Text style={{ fontSize: 18, color: colors.warning }}>›</Text>
          </TouchableOpacity>
        ) : null}

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            marginHorizontal: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <NotificationSectionTitle title="Trasferimenti" colors={colors} />
          <NotificationToggleRow
            icon="✅"
            label="Bonifico completato"
            description="Avviso quando un bonifico viene accreditato"
            value={settings.transferCompleted}
            onToggle={() => toggle("transferCompleted")}
            colors={colors}
          />
          <NotificationToggleRow
            icon="❌"
            label="Bonifico fallito"
            description="Avviso in caso di errore o rifiuto"
            value={settings.transferFailed}
            onToggle={() => toggle("transferFailed")}
            colors={colors}
          />
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            marginHorizontal: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <NotificationSectionTitle title="Promemoria" colors={colors} />
          <NotificationToggleRow
            icon="🔁"
            label="Bonifici ricorrenti"
            description="Promemoria prima della scadenza programmata"
            value={settings.recurringReminder}
            onToggle={() => toggle("recurringReminder")}
            colors={colors}
          />
          <NotificationToggleRow
            icon="🎯"
            label="Sforamento budget"
            description="Avviso quando superi l'80% del budget mensile"
            value={settings.budgetAlert}
            onToggle={() => toggle("budgetAlert")}
            colors={colors}
          />
          <NotificationToggleRow
            icon="💱"
            label="Variazione valuta"
            description="Avviso quando il tasso cambia di oltre il 2%"
            value={settings.currencyAlert}
            onToggle={() => toggle("currencyAlert")}
            colors={colors}
          />
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            marginHorizontal: 16,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <NotificationSectionTitle title="Riepilogo" colors={colors} />
          <NotificationToggleRow
            icon="📋"
            label="Digest giornaliero"
            description="Riepilogo delle attività della giornata"
            value={settings.dailyDigest}
            onToggle={() => toggle("dailyDigest")}
            colors={colors}
          />

          {settings.dailyDigest ? (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: colors.muted,
                  marginBottom: 10,
                }}
              >
                🕐 Orario digest giornaliero
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {[6, 7, 8, 9, 10, 12, 18, 20, 21, 22].map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    onPress={() =>
                      void save({ ...settings, dailyDigestHour: hour })
                    }
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor:
                        settings.dailyDigestHour === hour
                          ? colors.primary
                          : colors.background,
                      borderWidth: 1,
                      borderColor:
                        settings.dailyDigestHour === hour
                          ? colors.primary
                          : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color:
                          settings.dailyDigestHour === hour
                            ? "#fff"
                            : colors.foreground,
                      }}
                    >
                      {hour.toString().padStart(2, "0")}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <NotificationToggleRow
            icon="📊"
            label="Report settimanale"
            description="Riepilogo delle spese ogni lunedì mattina"
            value={settings.weeklyReport}
            onToggle={() => toggle("weeklyReport")}
            colors={colors}
          />
        </View>

        <View
          style={{
            marginHorizontal: 16,
            marginTop: 20,
            padding: 14,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
            ℹ️ Le notifiche vengono generate localmente sul tuo dispositivo.
            Nessun dato viene inviato a server esterni. Puoi disabilitare tutte
            le notifiche dalle Impostazioni del dispositivo.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
