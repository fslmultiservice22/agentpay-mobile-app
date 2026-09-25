import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import { useTelegramIntegration } from "@/hooks/use-telegram-integration";

/**
 * Preserva il percorso /(tabs)/settings senza montare wallet, conti, backup,
 * simulazioni, import/export o collegamenti a provider esterni.
 */
export default function TechnicalSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useThemeContext();
  const { config: telegramConfig, enableTelegramOptIn, disconnectTelegram, loadConfig } = useTelegramIntegration();
  const [telegramBusy, setTelegramBusy] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const nextScheme = colorScheme === "dark" ? "light" : "dark";

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleTelegramToggle = async (enabled: boolean) => {
    setTelegramBusy(true);
    setTelegramMessage(null);
    try {
      if (enabled) {
        await enableTelegramOptIn();
        setTelegramMessage("Opt-in locale attivato. Nessun collegamento o invio automatico è stato eseguito.");
      } else {
        await disconnectTelegram();
        setTelegramMessage("Opt-in Telegram revocato.");
      }
    } catch {
      setTelegramMessage("Impossibile aggiornare l’opt-in locale. Riprova.");
    } finally {
      setTelegramBusy(false);
    }
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={[styles.title, { color: colors.foreground }]}>Impostazioni tecniche</Text>
          <Text style={[styles.lead, { color: colors.muted }]}>Le preferenze finanziarie legacy non sono disponibili in questa beta controllata.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="shield" size={22} color={colors.success} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Perimetro protetto</Text>
          </View>
          <Text style={[styles.cardText, { color: colors.muted }]}>Nessun conto, carta, wallet, pagamento, saldo, trasferimento, consenso o dato Open Banking viene gestito da questa schermata.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Aspetto</Text>
          <Text style={[styles.cardText, { color: colors.muted }]}>Tema attuale: {colorScheme === "dark" ? "scuro" : "chiaro"}.</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Passa al tema ${nextScheme === "dark" ? "scuro" : "chiaro"}`}
            activeOpacity={0.82}
            onPress={() => setColorScheme(nextScheme)}
            style={[styles.outlinedAction, { borderColor: colors.border }]}
          >
            <MaterialIcons name="brightness-6" size={20} color={colors.foreground} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>Usa tema {nextScheme === "dark" ? "scuro" : "chiaro"}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="notifications-none" size={22} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Integrazione Telegram</Text>
          </View>
          <Text style={[styles.cardText, { color: colors.muted }]}>Attiva soltanto un consenso locale per la sezione Telegram. Il provider resta separato e non vengono inviati dati automaticamente.</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={[styles.rowText, { color: colors.foreground }]}>Opt-in Telegram</Text>
              <Text style={[styles.smallText, { color: colors.muted }]}>{telegramConfig?.optInGranted ? "Attivo localmente" : "Disattivato"}</Text>
            </View>
            <Switch
              accessibilityLabel="Attiva o disattiva l’opt-in Telegram"
              value={telegramConfig?.optInGranted === true}
              onValueChange={handleTelegramToggle}
              disabled={telegramBusy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
          {telegramMessage ? <Text accessibilityLiveRegion="polite" style={[styles.statusMessage, { color: colors.muted }]}>{telegramMessage}</Text> : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Strumenti</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Apri monitor tecnico" activeOpacity={0.82} onPress={() => router.push("/dashboard")} style={[styles.rowAction, { borderBottomColor: colors.border }]}>
            <View style={styles.rowLeading}><MaterialIcons name="analytics" size={21} color={colors.primary} /><Text style={[styles.rowText, { color: colors.foreground }]}>Monitor tecnico</Text></View>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Apri registro tecnico" activeOpacity={0.82} onPress={() => router.push("/monitor-log")} style={styles.rowAction}>
            <View style={styles.rowLeading}><MaterialIcons name="format-list-bulleted" size={21} color={colors.primary} /><Text style={[styles.rowText, { color: colors.foreground }]}>Registro tecnico</Text></View>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footer, { color: colors.muted }]}>AgentPay · Beta tecnica italiana · Funzioni finanziarie disattivate</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, padding: 24, paddingBottom: 40 },
  intro: { gap: 8 },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  lead: { fontSize: 15, lineHeight: 22 },
  card: { borderRadius: 16, borderWidth: 1, gap: 12, padding: 18 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 9 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardText: { fontSize: 14, lineHeight: 21 },
  outlinedAction: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 48, paddingHorizontal: 14 },
  actionText: { fontSize: 14, fontWeight: "700" },
  rowAction: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 52 },
  rowLeading: { alignItems: "center", flexDirection: "row", gap: 10 },
  rowText: { fontSize: 15, fontWeight: "600" },
  footer: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  settingRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 48 },
  settingCopy: { flex: 1, gap: 2 },
  smallText: { fontSize: 12, lineHeight: 18 },
  statusMessage: { fontSize: 12, lineHeight: 18 },
});
