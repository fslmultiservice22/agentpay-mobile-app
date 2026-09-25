import { ScrollView, Text, View, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const SETTINGS_KEY = 'agentpay_notification_settings';

interface NotificationSettings {
  transferCompleted: boolean;
  transferFailed: boolean;
  recurringReminder: boolean;
  budgetAlert: boolean;
  currencyAlert: boolean;
  dailyDigest: boolean;
  dailyDigestHour: number; // 0-23
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
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Load settings
      getNotificationSettings().then(setSettings);
      // Check permission
      if (Platform.OS !== 'web') {
        Notifications.getPermissionsAsync().then((status) => {
          setPermissionGranted(status.granted);
        });
      } else {
        setPermissionGranted(true);
      }
    }, [])
  );

  const save = async (updated: NotificationSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggle = (key: keyof NotificationSettings) => {
    if (typeof settings[key] !== 'boolean') return;
    save({ ...settings, [key]: !settings[key] });
  };

  const requestPermission = async () => {
    if (Platform.OS === 'web') return;
    const { granted } = await Notifications.requestPermissionsAsync();
    setPermissionGranted(granted);
    if (!granted) {
      Alert.alert(
        'Permesso negato',
        'Per ricevere notifiche, abilita i permessi nelle Impostazioni del dispositivo.',
        [{ text: 'OK' }]
      );
    }
  };


  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
      {title}
    </Text>
  );

  const ToggleRow = ({
    icon,
    label,
    description,
    value,
    onToggle,
    disabled,
  }: {
    icon: string;
    label: string;
    description?: string;
    value: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) => (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 14,
      opacity: disabled ? 0.5 : 1,
    }}>
      <Text style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{label}</Text>
        {description && (
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onToggle}
        trackColor={{ false: colors.border, true: colors.primary + '80' }}
        thumbColor={value ? colors.primary : colors.muted}
        disabled={disabled}
      />
    </View>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>Notifiche</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
          Gestisci quando e come ricevere avvisi
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Permission Banner */}
        {permissionGranted === false && (
          <TouchableOpacity
            onPress={requestPermission}
            style={{
              margin: 16,
              backgroundColor: colors.warning + '18',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.warning + '40',
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <MaterialIcons name="warning" size={22} color={colors.foreground} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.warning }}>Notifiche disabilitate</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Tocca per abilitare i permessi</Text>
            </View>
            <Text style={{ fontSize: 18, color: colors.warning }}>›</Text>
          </TouchableOpacity>
        )}

        {/* Transazioni */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <SectionTitle title="Trasferimenti" />
          <ToggleRow
            icon="✅"
            label="Bonifico completato"
            description="Avviso quando un bonifico viene accreditato"
            value={settings.transferCompleted}
            onToggle={() => toggle('transferCompleted')}
          />
          <ToggleRow
            icon="❌"
            label="Bonifico fallito"
            description="Avviso in caso di errore o rifiuto"
            value={settings.transferFailed}
            onToggle={() => toggle('transferFailed')}
          />
        </View>

        {/* Promemoria */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <SectionTitle title="Promemoria" />
          <ToggleRow
            icon="🔁"
            label="Bonifici ricorrenti"
            description="Promemoria prima della scadenza programmata"
            value={settings.recurringReminder}
            onToggle={() => toggle('recurringReminder')}
          />
          <ToggleRow
            icon="🎯"
            label="Sforamento budget"
            description="Avviso quando superi l'80% del budget mensile"
            value={settings.budgetAlert}
            onToggle={() => toggle('budgetAlert')}
          />
          <ToggleRow
            icon="💱"
            label="Variazione valuta"
            description="Avviso quando il tasso cambia di oltre il 2%"
            value={settings.currencyAlert}
            onToggle={() => toggle('currencyAlert')}
          />
        </View>

        {/* Digest */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, marginHorizontal: 16, marginTop: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
          <SectionTitle title="Riepilogo" />
          <ToggleRow
            icon="📋"
            label="Digest giornaliero"
            description="Riepilogo delle attività della giornata"
            value={settings.dailyDigest}
            onToggle={() => toggle('dailyDigest')}
          />

          {/* Hour selector */}
          {settings.dailyDigest && (
            <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 10 }}>
                🕐 Orario digest giornaliero
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[6, 7, 8, 9, 10, 12, 18, 20, 21, 22].map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => save({ ...settings, dailyDigestHour: h })}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: settings.dailyDigestHour === h ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: settings.dailyDigestHour === h ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: settings.dailyDigestHour === h ? '#fff' : colors.foreground,
                    }}>
                      {h.toString().padStart(2, '0')}:00
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <ToggleRow
            icon="📊"
            label="Report settimanale"
            description="Riepilogo delle spese ogni lunedì mattina"
            value={settings.weeklyReport}
            onToggle={() => toggle('weeklyReport')}
          />
        </View>

        {/* Info */}
        <View style={{ marginHorizontal: 16, marginTop: 20, padding: 14, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>
            ℹ️ Le notifiche vengono generate localmente sul tuo dispositivo. Nessun dato viene inviato a server esterni. Puoi disabilitare tutte le notifiche dalle Impostazioni del dispositivo.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
