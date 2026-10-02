import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { AppState, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { LOCAL_CSV_DEMO } from "@/lib/local-csv-demo";
import { LOCAL_CSV_PILOT_ENABLED } from "@/lib/local-csv-pilot-gate";
import {
  parseLocalCsvStatement,
  summarizeLocalCsvMonths,
  type LocalCsvMovement,
  type LocalCsvStatement,
} from "@/lib/local-csv-statement";

const eur = (cents: number) => new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
}).format(cents / 100);

export default function LocalCsvPilotScreen() {
  const router = useRouter();
  const colors = useColors();
  const [statement, setStatement] = useState<LocalCsvStatement | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const months = useMemo(() => summarizeLocalCsvMonths(statement?.movements ?? []), [statement]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") return;
      setStatement(null);
      setConfirmed(false);
      setError("");
    });
    return () => subscription.remove();
  }, []);

  function loadDemo() {
    setStatement(null);
    setConfirmed(false);
    setError("");
    try {
      setStatement(parseLocalCsvStatement(LOCAL_CSV_DEMO));
    } catch {
      setError("L'esempio sintetico non è disponibile in questa build.");
    }
  }

  function erase() {
    setStatement(null);
    setConfirmed(false);
    setError("");
  }

  if (!LOCAL_CSV_PILOT_ENABLED) {
    return (
      <ScreenContainer className="flex-1">
        <View style={styles.disabled}>
          <Text style={[styles.title, { color: colors.foreground }]}>Anteprima locale non disponibile</Text>
          <Text style={[styles.copy, { color: colors.muted }]}>Il pilota CSV è spento in questa build. Conti, pagamenti e provider restano disattivati.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText}>Torna indietro</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const movements = confirmed ? statement?.movements ?? [] : [];
  return (
    <ScreenContainer className="flex-1">
      <FlatList<LocalCsvMovement>
        data={movements}
        keyExtractor={(movement) => movement.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Torna alla dashboard tecnica" onPress={() => router.back()} style={styles.back}>
              <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
              <Text style={{ color: colors.foreground }}>Indietro</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>Analisi spese — demo locale</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>Soltanto dati fittizi incorporati nell'app: nessun estratto reale, collegamento bancario o saldo di conto.</Text>
            <Text style={[styles.notice, { color: colors.foreground, borderColor: colors.border }]}>Questo prototipo non apre il selettore dei file e non può leggere CSV dell'utente. Nessuna banca, pagamento o provider è collegato.</Text>
            <Text style={[styles.copy, { color: colors.muted }]}>Esempio: due movimenti fittizi in EUR nel formato data;descrizione;importo;valuta. L'importazione di file personali richiede una fase e una review separate.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Carica l'esempio CSV sintetico" onPress={loadDemo} style={[styles.button, { backgroundColor: colors.primary }]}>
              <Text style={styles.buttonText}>Carica CSV demo sintetico</Text>
            </TouchableOpacity>
            {!!error && <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.warning }]}>{error}</Text>}
            {!!statement && (
              <View style={styles.group}>
                <Text style={[styles.heading, { color: colors.foreground }]}>{statement.movements.length} movimenti demo</Text>
                {!confirmed ? (
                  <>
                    <Text style={[styles.copy, { color: colors.muted }]}>Anteprima delle righe fittizie. Nessun movimento viene inviato al server.</Text>
                    <Text style={[styles.copy, { color: colors.muted }]}>Colonne riconosciute: data · descrizione · importo · valuta (EUR).</Text>
                    {statement.movements.map((movement) => (
                      <Text key={movement.id} style={[styles.preview, { color: colors.foreground }]}>
                        {movement.date.slice(8, 10)}/{movement.date.slice(5, 7)}/{movement.date.slice(0, 4)} · {movement.description} · {eur(movement.amountCents)}
                      </Text>
                    ))}
                    <TouchableOpacity accessibilityRole="button" onPress={() => setConfirmed(true)} style={[styles.button, { backgroundColor: colors.primary }]}>
                      <Text style={styles.buttonText}>Conferma e visualizza riepilogo</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[styles.copy, { color: colors.muted }]}>I dati fittizi restano solo in memoria: usa «Elimina» o metti l'app in background per rimuoverli dalla schermata.</Text>
                    {months.map((month) => (
                      <View key={month.month} style={[styles.month, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.heading, { color: colors.foreground }]}>{month.month} · {month.count} movimenti demo</Text>
                        <Text style={{ color: colors.foreground }}>Entrate demo: {eur(month.incomeCents)}</Text>
                        <Text style={{ color: colors.foreground }}>Uscite demo: {eur(month.expenseCents)}</Text>
                      </View>
                    ))}
                    <Text style={[styles.heading, { color: colors.foreground }]}>Movimenti demo</Text>
                  </>
                )}
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Elimina tutti i dati demo" onPress={erase} style={[styles.erase, { borderColor: colors.warning }]}>
                  <Text style={{ color: colors.warning }}>Elimina dati demo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.movement, { borderColor: colors.border }]}>
            <View style={styles.movementLine}>
              <Text style={{ color: colors.muted }}>{item.date.slice(8, 10)}/{item.date.slice(5, 7)}/{item.date.slice(0, 4)}</Text>
              <Text style={{ color: colors.foreground, fontWeight: "700" }}>{item.amountCents > 0 ? "+" : ""}{eur(item.amountCents)}</Text>
            </View>
            <Text style={{ color: colors.foreground }}>{item.description}</Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 60, gap: 12 },
  header: { gap: 16 },
  disabled: { padding: 24, gap: 20 },
  title: { fontSize: 27, fontWeight: "800" },
  copy: { fontSize: 14, lineHeight: 21 },
  notice: { borderWidth: 1, borderRadius: 12, padding: 14, lineHeight: 21 },
  back: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  button: { padding: 15, borderRadius: 12, alignItems: "center", minHeight: 48, justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  error: { fontSize: 14, lineHeight: 21 },
  group: { gap: 12, marginTop: 10 },
  heading: { fontSize: 17, fontWeight: "700" },
  preview: { fontSize: 13, lineHeight: 20 },
  month: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  erase: { minHeight: 44, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", marginVertical: 10 },
  movement: { borderBottomWidth: 1, paddingVertical: 14, gap: 6 },
  movementLine: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
});
