import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getMockStatementContent, type MockStatementFormat } from "@/lib/mock-statement";
import { LOCAL_CSV_PILOT_ENABLED } from "@/lib/local-csv-pilot-gate";

/**
 * Percorso tecnico principale. Le precedenti dashboard di saldi, trasferimenti,
 * wallet e quotazioni sono rimosse da questa route e non vengono importate.
 */
export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [downloadStatus, setDownloadStatus] = useState("Nessun file mock preparato.");

  function handleMockDownload(format: MockStatementFormat) {
    const file = getMockStatementContent(format);
    if (Platform.OS !== "web") {
      setDownloadStatus("Il mock PDF/CSV è disponibile solo nella web preview.");
      return;
    }

    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.fileName;
    link.click();
    URL.revokeObjectURL(url);
    setDownloadStatus(`File mock preparato: ${file.fileName}`);
  }

  return (
    <ScreenContainer className="flex-1">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={[styles.title, { color: colors.foreground }]}>Dashboard tecnica</Text>
          <Text style={[styles.lead, { color: colors.muted }]}>AgentPay è in revisione controllata. Sono disponibili esclusivamente controlli locali e informazioni sullo stato tecnico.</Text>
        </View>

        <View
          accessibilityRole="text"
          accessibilityLabel="Connessione finanziaria non disponibile. Provider esterni, pagamenti e consensi sono disattivati."
          accessibilityLiveRegion="polite"
          style={[styles.status, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}55` }]}
        >
          <MaterialIcons name="portable-wifi-off" size={24} color={colors.warning} />
          <View style={styles.statusText}>
            <Text style={[styles.statusTitle, { color: colors.warning }]}>Connessione finanziaria non disponibile</Text>
            <Text style={[styles.statusDescription, { color: colors.foreground }]}>Provider esterni, pagamenti e consensi restano disattivati. Dati di conto disattivati.</Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Controlli disponibili</Text>
          <Text style={[styles.cardLine, { color: colors.muted }]}>Monitor tecnico locale e registro non finanziario.</Text>
          <Text style={[styles.cardLine, { color: colors.muted }]}>Stato policy e disponibilità dei servizi senza richieste a provider.</Text>
          <Text style={[styles.cardLine, { color: colors.muted }]}>Esportazione locale del solo registro tecnico.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="description" size={22} color={colors.primary} />
            <View style={styles.statusText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Estratto conto — prototipo mock</Text>
              <Text style={[styles.cardLine, { color: colors.muted }]}>Simula un download locale PDF o CSV. Non contiene conti, saldi, carte, transazioni o dati Wallester.</Text>
            </View>
          </View>
          <View style={styles.downloadRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Scarica estratto mock PDF"
              accessibilityHint="Prepara un file PDF sintetico locale senza chiamare API"
              activeOpacity={0.82}
              onPress={() => handleMockDownload("pdf")}
              style={[styles.downloadAction, { backgroundColor: colors.primary }]}
            >
              <MaterialIcons name="picture-as-pdf" size={19} color="#FFFFFF" />
              <Text style={styles.downloadActionText}>Mock PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Scarica estratto mock CSV"
              accessibilityHint="Prepara un file CSV sintetico locale senza chiamare API"
              activeOpacity={0.82}
              onPress={() => handleMockDownload("csv")}
              style={[styles.downloadAction, { backgroundColor: colors.foreground }]}
            >
              <MaterialIcons name="table-view" size={19} color={colors.background} />
              <Text style={[styles.downloadActionText, { color: colors.background }]}>Mock CSV</Text>
            </TouchableOpacity>
          </View>
          <Text accessibilityLiveRegion="polite" style={[styles.downloadStatus, { color: colors.muted }]}>{downloadStatus}</Text>
        </View>

        {LOCAL_CSV_PILOT_ENABLED && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Apri la demo locale di analisi spese da CSV sintetico"
            accessibilityHint="Mostra due movimenti fittizi incorporati, senza leggere file o contattare banche"
            activeOpacity={0.82}
            onPress={() => router.push("/local-csv-pilot")}
            style={[styles.secondaryAction, { borderColor: colors.border }]}
          >
            <MaterialIcons name="insert-drive-file" size={21} color={colors.foreground} />
            <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Analisi spese — demo sintetica</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Apri monitor tecnico"
          accessibilityHint="Mostra gli stati locali di app e backend senza contattare provider finanziari"
          activeOpacity={0.82}
          onPress={() => router.push("/dashboard")}
          style={[styles.primaryAction, { backgroundColor: colors.primary }]}
        >
          <MaterialIcons name="analytics" size={21} color="#FFFFFF" />
          <Text style={styles.primaryActionText}>Apri monitor tecnico</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Apri registro tecnico"
          accessibilityHint="Consulta la cronologia locale non finanziaria dei controlli"
          activeOpacity={0.82}
          onPress={() => router.push("/monitor-log")}
          style={[styles.secondaryAction, { borderColor: colors.border }]}
        >
          <MaterialIcons name="format-list-bulleted" size={21} color={colors.foreground} />
          <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Apri registro tecnico</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 18, justifyContent: "center", padding: 24, paddingBottom: 40 },
  intro: { gap: 8 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -0.4 },
  lead: { fontSize: 16, lineHeight: 24 },
  status: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 16 },
  statusText: { flex: 1, gap: 3 },
  statusTitle: { fontSize: 14, fontWeight: "800" },
  statusDescription: { fontSize: 12, lineHeight: 18 },
  card: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 18 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardLine: { fontSize: 14, lineHeight: 21 },
  sectionHeader: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  downloadRow: { flexDirection: "row", gap: 10 },
  downloadAction: { alignItems: "center", borderRadius: 12, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 46, paddingHorizontal: 12, paddingVertical: 12 },
  downloadActionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  downloadStatus: { fontSize: 12, lineHeight: 18 },
  primaryAction: { alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 10, justifyContent: "center", minHeight: 52, paddingHorizontal: 16, paddingVertical: 14 },
  primaryActionText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  secondaryAction: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "center", minHeight: 52, paddingHorizontal: 16, paddingVertical: 14 },
  secondaryActionText: { fontSize: 16, fontWeight: "700" },
});
