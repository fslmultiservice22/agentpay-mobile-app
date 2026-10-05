import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  dismissFinancialNotice,
  initialFinancialNoticeState,
  toggleFinancialNoticeDetails,
  toggleFinancialUpdatesOptIn,
} from "@/lib/financial-notice";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getOperationalStatus, refreshOperationalStatus, type ConnectionStatus, type MonitorResponse } from "@/lib/operational-status";
import { WALLesterMock } from "@/lib/wallester-mock";

function statusColor(status: ConnectionStatus, colors: ReturnType<typeof useColors>) {
  if (status === "healthy") return colors.success;
  if (status === "attention") return colors.warning;
  return colors.error;
}


export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const [status, setStatus] = useState<MonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [financialNotice, setFinancialNotice] = useState(initialFinancialNoticeState);

  const load = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const result = manual ? await refreshOperationalStatus() : await getOperationalStatus();
      setStatus(result);
      setUnavailable(false);
    } catch {
      // A previous successful check must not appear current after a failed refresh.
      setStatus(null);
      setUnavailable(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const monitoring = status?.monitoring;
  const overall: ConnectionStatus = unavailable ? "unavailable" : (monitoring?.overallStatus ?? "unavailable");
  const tone = statusColor(overall, colors);
  const statusLabel = overall === "healthy" ? "Operativo" : overall === "attention" ? "Richiede attenzione" : "Non disponibile";

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.foreground, fontSize: 27, fontWeight: "900" }}>Pannello tecnico</Text>
          <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>Stato locale di app e backend. Nessun saldo, wallet, carta, pagamento, firma o provider finanziario è attivo.</Text>
        </View>

        {financialNotice.visible ? <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}55`, borderWidth: 1, borderRadius: 15, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <MaterialIcons accessibilityLabel="Attenzione" name="warning-amber" size={22} color={colors.warning} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text accessibilityRole="header" style={{ color: colors.warning, fontWeight: "900", fontSize: 13 }}>Funzionalità finanziarie inattive</Text>
              <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>Carte, credito, pagamenti, saldi e trasferimenti non sono disponibili in questa beta tecnica. Non inserire dati bancari.</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Chiudi avviso sulle funzionalità finanziarie" accessibilityHint="Nasconde questo avviso dalla dashboard" onPress={() => setFinancialNotice((state) => dismissFinancialNotice(state))} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="close" size={21} color={colors.warning} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Mostra spiegazione delle funzionalità finanziarie inattive" accessibilityHint="Apre o chiude i dettagli del perimetro tecnico" accessibilityState={{ expanded: financialNotice.detailsExpanded }} onPress={() => setFinancialNotice((state) => toggleFinancialNoticeDetails(state))} style={{ alignSelf: "flex-start", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, paddingHorizontal: 4 }}>
            <MaterialIcons name="info-outline" size={18} color={colors.warning} />
            <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "900" }}>{financialNotice.detailsExpanded ? "Nascondi dettagli" : "Perché è inattivo?"}</Text>
          </TouchableOpacity>
          {financialNotice.detailsExpanded ? <View accessibilityRole="text" style={{ marginTop: 8, paddingLeft: 4, gap: 10 }}>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Il pannello è solo tecnico/read-only. Eventuali funzioni future richiederanno revisione e conferma esplicita; nessun provider viene attivato da questa schermata.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={financialNotice.updatesOptedIn ? "Disattiva avviso futuro sulla riattivazione finanziaria" : "Ricevi un avviso quando le funzionalità finanziarie saranno riattivate"} accessibilityHint="Registra o revoca solo una preferenza locale; non attiva notifiche push" accessibilityState={{ selected: financialNotice.updatesOptedIn }} onPress={() => setFinancialNotice((state) => toggleFinancialUpdatesOptIn(state))} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", borderColor: `${colors.warning}66`, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }}>
              <MaterialIcons name={financialNotice.updatesOptedIn ? "notifications-active" : "notifications-none"} size={18} color={colors.warning} />
              <Text style={{ color: colors.warning, fontSize: 11, fontWeight: "900" }}>{financialNotice.updatesOptedIn ? "Avviso futuro registrato localmente" : "Avvisami in futuro"}</Text>
            </TouchableOpacity>
            {financialNotice.updatesOptedIn ? <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16 }}>Preferenza salvata solo in questa sessione. Non è stata attivata alcuna notifica reale.</Text> : null}
          </View> : null}
        </View> : null}

        <View accessibilityRole="text" accessibilityLabel="Prototipo Wallester con dati mock, sola lettura" style={{ backgroundColor: colors.surface, borderColor: `${colors.primary}55`, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.primary}18` }}>
              <MaterialIcons name="visibility" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>Wallester — prototipo read-only</Text>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "800", marginTop: 2 }}>DATI MOCK · NESSUN COLLEGAMENTO REALE</Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Questa anteprima serve solo a progettare la UI. Non legge l’account Wallester e non rappresenta carte, credito, disponibilità o stato contrattuale reali.</Text>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Identificativo demo</Text><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "800" }}>{WALLesterMock.accountLabel}</Text></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Verifica</Text><Text style={{ color: colors.warning, fontSize: 12, fontWeight: "800" }}>{WALLesterMock.verification}</Text></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Carte virtuali</Text><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "800" }}>{WALLesterMock.virtualCards}</Text></View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}><Text style={{ color: colors.muted, fontSize: 12 }}>Linea di credito</Text><Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "800" }}>{WALLesterMock.creditLine}</Text></View>
          </View>
        </View>

        <View accessibilityRole="text" accessibilityLabel={`Stato tecnico: ${loading ? "aggiornamento in corso" : statusLabel}`} accessibilityLiveRegion="polite" style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: `${tone}18` }}>
              {loading ? <ActivityIndicator color={tone} /> : <MaterialIcons name={overall === "healthy" ? "check-circle" : "error-outline"} size={23} color={tone} />}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>Stato tecnico</Text>
              <Text style={{ color: tone, fontSize: 12, fontWeight: "800" }}>{loading ? "Aggiornamento in corso" : statusLabel}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>{monitoring && !unavailable ? `${monitoring.checks.filter((check) => check.status === "healthy").length} controlli tecnici disponibili.` : "Il backend tecnico non è raggiungibile da questo dispositivo. Verifica la connessione e riprova; nessun provider finanziario viene avviato."}</Text>
            </View>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Aggiorna lo stato tecnico" accessibilityHint="Riprova il controllo del backend tecnico senza avviare provider finanziari" accessibilityState={{ disabled: refreshing, busy: refreshing }} activeOpacity={0.82} disabled={refreshing} onPress={() => void load(true)} style={{ alignSelf: "flex-start", flexDirection: "row", gap: 7, alignItems: "center", minHeight: 44, borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 9, opacity: refreshing ? 0.7 : 1 }}>
            {refreshing ? <ActivityIndicator size="small" color="#ffffff" /> : <MaterialIcons name="refresh" size={16} color="#ffffff" />}
            <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "900" }}>{refreshing ? "Aggiornamento…" : "Aggiorna stato"}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 }}>
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>Controlli tecnici</Text>
          {(monitoring?.checks ?? []).map((check) => (
            <View key={check.id} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <MaterialIcons name="check-circle-outline" size={18} color={statusColor(check.status, colors)} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: "800" }}>{check.label}</Text>
                <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 1 }}>{check.detail}</Text>
              </View>
            </View>
          ))}
          {!loading && !(monitoring?.checks.length) ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17 }}>Nessun controllo remoto confermato. Controlla la connessione del dispositivo e riprova; nessuna richiesta finanziaria viene inviata.</Text> : null}
        </View>

        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Apri il registro tecnico" accessibilityHint="Mostra la cronologia locale non finanziaria dei controlli" activeOpacity={0.82} onPress={() => router.push("/monitor-log")} style={{ minHeight: 74, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 13 }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: `${colors.primary}18` }}><MaterialIcons name="monitor-heart" size={22} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "900" }}>Registro tecnico</Text>
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }}>Consulta la cronologia volatile degli stati locali senza dati finanziari.</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
