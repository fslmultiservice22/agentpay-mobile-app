import { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  MAX_LOCAL_CSV_BYTES,
  parseExpenseCsv,
  summarizeExpenses,
  type ExpenseImportResult,
} from "@/lib/local-expense-csv-adapter";

const previewLimit = 5;

/** Pilota autonomo; non tocca il Portafoglio protetto né alcun provider. */
export default function LocalExpensePilot() {
  const colors = useColors();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExpenseImportResult | null>(null);
  const [message, setMessage] = useState("Nessun CSV selezionato.");
  const [cacheWarning, setCacheWarning] = useState(false);
  const summary = result ? summarizeExpenses(result.entries) : null;

  const clearPreview = () => {
    setResult(null);
    setConfirmed(false);
    setMessage("Anteprima cancellata dalla memoria della schermata.");
  };

  const selectCsv = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    setResult(null);
    setCacheWarning(false);
    setMessage("Lettura locale in corso…");
    let copiedUri: string | null = null;
    let blobUri: string | null = null;
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/plain", "application/vnd.ms-excel"],
        multiple: false,
        copyToCacheDirectory: true,
        base64: false,
      });
      if (picked.canceled || !picked.assets?.[0]) {
        setMessage("Selezione annullata.");
        return;
      }
      const asset = picked.assets[0];
      if (Platform.OS === "web" && asset.uri.startsWith("blob:"))
        blobUri = asset.uri;
      // Never delete an original file: only the picker-generated app-cache copy.
      if (Platform.OS !== "web" && asset.uri.startsWith(Paths.cache.uri))
        copiedUri = asset.uri;
      if (!asset.name.toLowerCase().endsWith(".csv")) {
        setMessage("Seleziona un file .csv anonimizzato.");
        return;
      }
      if (asset.size === undefined || asset.size > MAX_LOCAL_CSV_BYTES) {
        setMessage("File non verificabile o troppo grande: massimo 100 KB.");
        return;
      }
      if (Platform.OS !== "web" && !copiedUri) {
        setMessage(
          "Impossibile verificare la copia locale del file. Nessuna lettura eseguita.",
        );
        return;
      }
      const text = asset.file
        ? await asset.file.text()
        : await new File(asset.uri).text();
      const parsed = parseExpenseCsv(text);
      setResult(parsed);
      setMessage(
        parsed.entries.length
          ? `Analisi locale completata: ${parsed.entries.length} righe valide. Nessun invio o salvataggio.`
          : (parsed.issues[0]?.message ?? "Nessuna riga valida."),
      );
    } catch {
      setMessage("Impossibile leggere il CSV. Nessun dato importato.");
    } finally {
      if (copiedUri) {
        try {
          new File(copiedUri).delete();
        } catch {
          setCacheWarning(true);
        }
      }
      if (blobUri && typeof URL !== "undefined") URL.revokeObjectURL(blobUri);
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <FlatList
        data={result?.entries.slice(0, previewLimit) ?? []}
        keyExtractor={(entry) => entry.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Torna alle impostazioni"
              onPress={() => router.back()}
              style={styles.back}
            >
              <Text style={[styles.link, { color: colors.primary }]}>
                ‹ Indietro
              </Text>
            </Pressable>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Analisi CSV locale
            </Text>
            <Text style={[styles.copy, { color: colors.muted }]}>
              Pilota non transazionale: solo file .csv sintetici o anonimizzati.
              Non usare estratti conto originali, nomi, IBAN, email, carte o
              altri identificativi. Nessun provider è collegato.
            </Text>
            <Text style={[styles.copy, { color: colors.muted }]}>
              Formato: data ISO (AAAA-MM-GG), descrizione generica, importo
              positivo; facoltative valuta e categoria. Massimo 100 KB e 100
              righe. I file non vengono sincronizzati.
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
              onPress={() => setConfirmed((value) => !value)}
              style={[styles.checkRow, { borderColor: colors.border }]}
            >
              <Text style={[styles.check, { color: colors.primary }]}>
                {confirmed ? "☑" : "☐"}
              </Text>
              <Text
                style={[
                  styles.copy,
                  styles.checkText,
                  { color: colors.foreground },
                ]}
              >
                Confermo che il CSV contiene solo dati fittizi o anonimizzati e
                nessun identificativo bancario/personale.
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Seleziona CSV anonimizzato"
              accessibilityState={{ disabled: !confirmed || busy }}
              disabled={!confirmed || busy}
              onPress={selectCsv}
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                (!confirmed || busy) && styles.disabled,
              ]}
            >
              <Text style={styles.buttonText}>
                {busy ? "Lettura…" : "Seleziona CSV"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancella anteprima CSV"
              disabled={!result || busy}
              onPress={clearPreview}
              style={[
                styles.clear,
                { borderColor: colors.border },
                (!result || busy) && styles.disabled,
              ]}
            >
              <Text style={[styles.link, { color: colors.foreground }]}>
                Cancella anteprima
              </Text>
            </Pressable>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.status, { color: colors.muted }]}
            >
              {message}
            </Text>
            {cacheWarning && (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.warning, { color: colors.warning }]}
              >
                La copia temporanea non è stata rimossa. Cancella la cache
                dell’app dal sistema.
              </Text>
            )}
            {summary && summary.entryCount > 0 && (
              <View
                style={[
                  styles.panel,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={[styles.section, { color: colors.foreground }]}>
                  Riepilogo in memoria
                </Text>
                <Text style={[styles.copy, { color: colors.muted }]}>
                  Righe valide: {summary.entryCount} · Righe ignorate:{" "}
                  {result?.issues.length ?? 0}
                </Text>
                {Object.entries(summary.totalsByCurrency).map(
                  ([currency, amount]) => (
                    <Text
                      key={currency}
                      style={[styles.copy, { color: colors.foreground }]}
                    >
                      {currency}: {amount.toFixed(2)}
                    </Text>
                  ),
                )}
                {Object.entries(summary.byCategory).map(
                  ([category, totals]) => (
                    <Text
                      key={category}
                      style={[styles.copy, { color: colors.muted }]}
                    >
                      {category}:{" "}
                      {Object.entries(totals)
                        .map(
                          ([currency, amount]) =>
                            `${amount.toFixed(2)} ${currency}`,
                        )
                        .join(" · ")}
                    </Text>
                  ),
                )}
              </View>
            )}
            {!!result?.issues.length && (
              <View
                style={[
                  styles.panel,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <Text style={[styles.section, { color: colors.foreground }]}>
                  Avvisi di importazione
                </Text>
                {result.issues.slice(0, 5).map((issue) => (
                  <Text
                    key={`issue-${issue.row}`}
                    style={[styles.copy, { color: colors.warning }]}
                  >
                    Riga {issue.row}: {issue.message}
                  </Text>
                ))}
              </View>
            )}
            {!!result?.entries.length && (
              <Text style={[styles.section, { color: colors.foreground }]}>
                Anteprima (prime {Math.min(result.entries.length, previewLimit)}{" "}
                righe)
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.previewRow, { borderColor: colors.border }]}>
            <Text style={[styles.copy, { color: colors.foreground }]}>
              {item.date} · {item.description}
            </Text>
            <Text style={[styles.copy, { color: colors.muted }]}>
              {item.amount.toFixed(2)} {item.currency}
              {item.category ? ` · ${item.category}` : ""}
            </Text>
          </View>
        )}
        ListFooterComponent={
          <Text style={[styles.footer, { color: colors.muted }]}>
            Il pulsante Cancella rimuove solo l’anteprima in memoria. Non
            elimina il file originale dal dispositivo.
          </Text>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 44, gap: 12 },
  header: { gap: 14 },
  back: { alignSelf: "flex-start", paddingVertical: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  copy: { fontSize: 14, lineHeight: 21 },
  link: { fontSize: 15, fontWeight: "700" },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  check: { fontSize: 26 },
  checkText: { flex: 1 },
  button: {
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  clear: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.45 },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  status: { fontSize: 14, lineHeight: 21 },
  warning: { fontSize: 14, lineHeight: 21, fontWeight: "600" },
  panel: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  section: { fontSize: 17, fontWeight: "700" },
  previewRow: { borderBottomWidth: 1, paddingVertical: 10, gap: 2 },
  footer: { fontSize: 12, lineHeight: 18, paddingTop: 18 },
});
