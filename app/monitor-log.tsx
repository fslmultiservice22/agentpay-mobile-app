import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getMonitorHistory, type ConnectionStatus, type MonitorSnapshot } from "@/lib/operational-status";
import { buildTechnicalLogCsv } from "@/lib/technical-log-csv";
import { DeviceSaveError, saveTechnicalLogOnDevice } from "@/lib/technical-log-export";

function statusColor(status: ConnectionStatus, colors: ReturnType<typeof useColors>) {
  if (status === "healthy") return colors.success;
  if (status === "attention") return colors.warning;
  return colors.error;
}

export default function MonitorLogScreen() {
  const colors = useColors();
  const [entries, setEntries] = useState<MonitorSnapshot[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [previewCsv, setPreviewCsv] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPreviewCsv(null);
    try {
      const result = await getMonitorHistory();
      setEntries(result.entries);
      setError(null);
    } catch {
      setEntries([]);
      setError("Il registro tecnico non è raggiungibile in questo momento.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it-IT");
    if (!normalized) return entries;
    return entries.filter((entry) => entry.checks.some((check) => `${check.label} ${check.detail} ${check.status}`.toLocaleLowerCase("it-IT").includes(normalized)));
  }, [entries, query]);

  const openPreview = useCallback(() => {
    if (loading || error || !entries.length) return;
    try {
      setPreviewCsv(buildTechnicalLogCsv(entries));
    } catch {
      setPreviewCsv(null);
      Alert.alert("Anteprima non disponibile", "Il registro tecnico non è valido. Aggiorna il registro prima di riprovare.");
    }
  }, [entries, error, loading]);

  const saveLocally = useCallback(async () => {
    if (loading || error || !entries.length) {
      Alert.alert("Nessun dato tecnico", "Aggiorna il registro prima di salvarlo.");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const result = await saveTechnicalLogOnDevice(entries);
      if (result.status === "cancelled") return;
      Alert.alert("CSV salvato", result.mode === "download"
        ? `Il download del file ${result.filename} è stato richiesto al browser.`
        : `Il file ${result.filename} è stato scritto e verificato nella cartella locale scelta. Aprilo con I miei file per completare il controllo.`);
    } catch (saveError) {
      Alert.alert("Salvataggio non riuscito", saveError instanceof DeviceSaveError ? saveError.message : "Impossibile verificare il file locale.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [entries, error, loading]);

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: "900" }}>Registro tecnico</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>Mostra soltanto orari, stati tecnici e policy di protezione. Non contiene saldi, carte, indirizzi, transazioni o credenziali.</Text>
        </View>

        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: `${colors.warning}55`, backgroundColor: `${colors.warning}12`, padding: 14 }}>
          <Text style={{ color: colors.warning, fontWeight: "900", fontSize: 13 }}>Monitor read-only</Text>
          <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18, marginTop: 4 }}>Il refresh non contatta provider finanziari e non avvia alcuna operazione.</Text>
        </View>

        <View accessibilityRole="text" accessibilityLiveRegion="polite" style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, flexDirection: "row", gap: 10, alignItems: "center" }}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name={error ? "error-outline" : "verified-user"} size={20} color={error ? colors.error : colors.success} />}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: "900", fontSize: 13 }}>{loading ? "Aggiornamento tecnico in corso" : error ? "Registro tecnico non disponibile" : "Registro tecnico aggiornato"}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 }}>{loading ? "Sto leggendo solo stati locali e policy di protezione." : error ? "Nessun provider finanziario viene contattato durante il controllo." : "Nessun pagamento, consenso o provider esterno è stato avviato."}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca nel registro"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Cerca nel registro tecnico"
            accessibilityHint="Filtra localmente le rilevazioni tecniche visualizzate"
            accessibilityRole="search"
            returnKeyType="search"
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, color: colors.foreground, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 }}
          />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={loading ? "Aggiornamento registro tecnico in corso" : "Aggiorna registro tecnico"} accessibilityHint="Rilegge solo stati locali e policy di protezione" accessibilityState={{ disabled: loading, busy: loading }} activeOpacity={0.82} disabled={loading} onPress={() => void load()} style={{ minWidth: 48, minHeight: 46, borderRadius: 12, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", paddingHorizontal: 13, opacity: loading ? 0.55 : 1 }}>
            {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialIcons name="refresh" size={20} color="#ffffff" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mostra anteprima locale del CSV tecnico" accessibilityHint="Mostra solo le quattro colonne tecniche senza creare o condividere un file" accessibilityState={{ disabled: loading || !!error || !entries.length }} activeOpacity={0.82} disabled={loading || !!error || !entries.length} onPress={openPreview} style={{ minHeight: 48, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8, opacity: loading || error || !entries.length ? 0.55 : 1 }}>
          <MaterialIcons name="visibility" size={19} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>Vedi anteprima CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Salva il CSV tecnico sul dispositivo" accessibilityHint="Scegli Download o Documenti nella memoria interna; Drive e le altre cartelle cloud vengono rifiutate" accessibilityState={{ disabled: loading || !!error || saving || !entries.length || Platform.OS === "ios", busy: saving }} activeOpacity={0.82} disabled={loading || !!error || saving || !entries.length || Platform.OS === "ios"} onPress={() => void saveLocally()} style={{ minHeight: 48, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 8, opacity: loading || error || saving || !entries.length || Platform.OS === "ios" ? 0.55 : 1 }}>
          {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="file-download" size={19} color={colors.primary} />}
          <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>{saving ? "Salvataggio in corso…" : "Salva CSV sul dispositivo"}</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>{Platform.OS === "ios" ? "Il salvataggio locale iOS non è ancora disponibile." : "L’anteprima non crea file. Per salvare scegli Download o Documenti in Memoria interna; non viene aperto il foglio Condividi. Il CSV contiene solo orario, stato e identificativo tecnico."}</Text>

        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {error ? <Text style={{ color: colors.error, fontSize: 13 }}>{error}</Text> : null}
        {!loading && !error && filtered.length === 0 ? <Text style={{ color: colors.muted, textAlign: "center", paddingVertical: 28 }}>Nessuna rilevazione tecnica disponibile.</Text> : null}

        {filtered.map((entry) => (
          <View key={entry.checkedAt} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 15, gap: 10 }}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>Controllo: {new Date(entry.checkedAt).toLocaleString("it-IT")}</Text>
            {entry.checks.map((check) => {
              const tone = statusColor(check.status, colors);
              return (
                <View key={check.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
                  <MaterialIcons name={check.status === "healthy" ? "check-circle" : "warning-amber"} size={18} color={tone} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "800" }}>{check.label}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 1 }}>{check.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <Modal visible={previewCsv !== null} transparent animationType="slide" onRequestClose={() => setPreviewCsv(null)}>
        <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#00000099" }}>
          <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 18, maxHeight: "85%", gap: 12 }}>
            <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "900" }}>Anteprima CSV tecnica</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Solo sul dispositivo. Nessun file è stato creato o condiviso da questa anteprima.</Text>
            <ScrollView horizontal nestedScrollEnabled accessibilityLabel="Colonne del CSV tecnico" style={{ flexGrow: 0 }}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 420 }}>
                <Text selectable style={{ color: colors.foreground, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, lineHeight: 19 }}>{previewCsv ?? ""}</Text>
              </ScrollView>
            </ScrollView>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Chiudi anteprima CSV" onPress={() => setPreviewCsv(null)} style={{ minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "800" }}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
