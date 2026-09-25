import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import {
  loadIncomingAlertSettings,
  saveIncomingAlertSettings,
  type IncomingAlertSettings,
  DEFAULT_INCOMING_ALERT_SETTINGS,
} from "@/lib/incoming-alert-service";
import { setPreferredCurrency, type Currency } from "@/lib/currency-service";
import {
  loadLowBalanceAlertSettings,
  saveLowBalanceAlertSettings,
  type LowBalanceAlertSettings,
  DEFAULT_LOW_BALANCE_SETTINGS,
} from "@/lib/low-balance-alert-service";
import {
  loadRecurringDeadlineSettings,
  saveRecurringDeadlineSettings,
  type RecurringDeadlineSettings,
} from "@/lib/recurring-deadline-alert-service";
import {
  loadBudgetAlertSettings,
  saveBudgetAlertSettings,
  type BudgetAlertSettings,
  DEFAULT_BUDGET_ALERT_SETTINGS,
} from "@/lib/budget-alert-service";
import {
  loadLowBalanceAlertSettings as loadSweepLowAlert,
  saveLowBalanceAlertSettings as saveSweepLowAlert,
  type LowBalanceAlertSettings as SweepLowAlertSettings,
  DEFAULT_LOW_BALANCE_ALERT,
} from "@/lib/balance-sweep-service";

const STORAGE_KEY = "@agentpay_advanced_settings";

interface AdvancedSettings {
  language: "it" | "en";
  currency: "EUR" | "USD" | "GBP" | "CHF";
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  budgetAlertThreshold: 70 | 80 | 90 | 100;
  showCentsInList: boolean;
  compactMode: boolean;
  seasonalTheme: boolean;
}

function getSeasonEmoji(): string {
  const m = new Date().getMonth(); // 0-11
  if (m === 11 || m === 0) return '🎄'; // Dicembre-Gennaio
  if (m === 1) return '❤️'; // Febbraio (San Valentino)
  if (m === 2 || m === 3) return '🌸'; // Marzo-Aprile (Primavera)
  if (m === 6 || m === 7) return '☀️'; // Luglio-Agosto (Estate)
  if (m === 9) return '🎃'; // Ottobre (Halloween)
  return '🍂'; // Autunno default
}

const DEFAULT_SETTINGS: AdvancedSettings = {
  language: "it",
  currency: "EUR",
  dateFormat: "DD/MM/YYYY",
  budgetAlertThreshold: 80,
  showCentsInList: true,
  compactMode: false,
  seasonalTheme: false,
};

// ── Option sets ───────────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: "it", label: "Italiano 🇮🇹" },
  { value: "en", label: "English 🇬🇧" },
];

const CURRENCIES = [
  { value: "EUR", label: "Euro (€)" },
  { value: "USD", label: "Dollaro USA ($)" },
  { value: "GBP", label: "Sterlina (£)" },
  { value: "CHF", label: "Franco svizzero (Fr)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "GG/MM/AAAA  (es. 27/05/2026)" },
  { value: "MM/DD/YYYY", label: "MM/GG/AAAA  (es. 05/27/2026)" },
  { value: "YYYY-MM-DD", label: "AAAA-MM-GG  (es. 2026-05-27)" },
];

const THRESHOLDS = [
  { value: 70, label: "70%  — Avviso anticipato" },
  { value: 80, label: "80%  — Predefinito" },
  { value: 90, label: "90%  — Avviso tardivo" },
  { value: 100, label: "100% — Solo al superamento" },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 }}>
      {title}
    </Text>
  );
}

function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>{label}</Text>
      {options.map((opt, idx) => (
        <TouchableOpacity
          key={String(opt.value)}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(opt.value); }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: value === opt.value ? colors.primary + "10" : "transparent",
          }}
        >
          <View style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: value === opt.value ? colors.primary : colors.border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}>
            {value === opt.value && (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
            )}
          </View>
          <Text style={{ fontSize: 14, color: value === opt.value ? colors.primary : colors.foreground, fontWeight: value === opt.value ? "600" : "400", flex: 1 }}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(!value); }}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>{description}</Text>
      </View>
      <View style={{
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: value ? colors.primary : colors.border,
        justifyContent: "center",
        paddingHorizontal: 3,
      }}>
        <View style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: "#fff",
          alignSelf: value ? "flex-end" : "flex-start",
        }} />
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AdvancedSettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [incomingAlert, setIncomingAlert] = useState<IncomingAlertSettings>(DEFAULT_INCOMING_ALERT_SETTINGS);
  const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_INCOMING_ALERT_SETTINGS.threshold));
  const [lowBalanceAlert, setLowBalanceAlert] = useState<LowBalanceAlertSettings>(DEFAULT_LOW_BALANCE_SETTINGS);
  const [lowBalanceInput, setLowBalanceInput] = useState(String(DEFAULT_LOW_BALANCE_SETTINGS.threshold));
  const [recurringDeadline, setRecurringDeadline] = useState<RecurringDeadlineSettings>({ enabled: true, daysBeforeAlert: 3 });
  const [recurringDaysInput, setRecurringDaysInput] = useState('3');
  const [budgetAlert, setBudgetAlert] = useState<BudgetAlertSettings>(DEFAULT_BUDGET_ALERT_SETTINGS);
  const [sweepLowAlert, setSweepLowAlert] = useState<SweepLowAlertSettings>(DEFAULT_LOW_BALANCE_ALERT);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); } catch { /* ignore */ }
      }
    });
    loadIncomingAlertSettings().then((s) => {
      setIncomingAlert(s);
      setThresholdInput(String(s.threshold));
    });
    loadLowBalanceAlertSettings().then((s) => {
      setLowBalanceAlert(s);
      setLowBalanceInput(String(s.threshold));
    });
    loadRecurringDeadlineSettings().then((s) => {
      setRecurringDeadline(s);
      setRecurringDaysInput(String(s.daysBeforeAlert));
    });
    loadBudgetAlertSettings().then((s) => setBudgetAlert(s));
    loadSweepLowAlert().then((s) => setSweepLowAlert(s));
  }, []);

  const update = <K extends keyof AdvancedSettings>(key: K, value: AdvancedSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Sincronizza valuta con currency-service
    await setPreferredCurrency(settings.currency as Currency);
    // Salva anche le impostazioni soglia entrate
    const parsedThreshold = parseFloat(thresholdInput.replace(',', '.'));
    const validThreshold = !isNaN(parsedThreshold) && parsedThreshold > 0 ? parsedThreshold : DEFAULT_INCOMING_ALERT_SETTINGS.threshold;
    const updatedIncoming = { ...incomingAlert, threshold: validThreshold };
    await saveIncomingAlertSettings(updatedIncoming);
    setIncomingAlert(updatedIncoming);
    setThresholdInput(String(validThreshold));
    // Salva impostazioni saldo basso
    const parsedLow = parseFloat(lowBalanceInput.replace(',', '.'));
    const validLow = !isNaN(parsedLow) && parsedLow >= 0 ? parsedLow : DEFAULT_LOW_BALANCE_SETTINGS.threshold;
    const updatedLow = { ...lowBalanceAlert, threshold: validLow };
    await saveLowBalanceAlertSettings(updatedLow);
    setLowBalanceAlert(updatedLow);
    setLowBalanceInput(String(validLow));
    // Salva impostazioni scadenze ricorrenti
    const parsedDays = parseInt(recurringDaysInput, 10);
    const validDays = !isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 30 ? parsedDays : 3;
    const updatedRecurring = { ...recurringDeadline, daysBeforeAlert: validDays };
    await saveRecurringDeadlineSettings(updatedRecurring);
    setRecurringDeadline(updatedRecurring);
    setRecurringDaysInput(String(validDays));
    // Salva impostazioni avvisi budget
    await saveBudgetAlertSettings(budgetAlert);
    await saveSweepLowAlert(sweepLowAlert);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    Alert.alert("Ripristina predefiniti", "Vuoi ripristinare tutte le impostazioni avanzate ai valori predefiniti?", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Ripristina",
        style: "destructive",
        onPress: async () => {
          setSettings(DEFAULT_SETTINGS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  return (
    <ScreenContainer className="flex-1">
      {/* Header */}
      <View style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff" }}>Impostazioni Avanzate</Text>
        <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
          Personalizza lingua, valuta, formato e soglie
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 4 }}>

        {/* Language */}
        <SectionHeader title="Lingua" />
        <OptionRow
          label="Lingua dell'app"
          options={LANGUAGES as { value: "it" | "en"; label: string }[]}
          value={settings.language}
          onChange={(v) => update("language", v)}
        />

        {/* Currency */}
        <SectionHeader title="Valuta predefinita" />
        <OptionRow
          label="Valuta visualizzata"
          options={CURRENCIES as { value: "EUR" | "USD" | "GBP" | "CHF"; label: string }[]}
          value={settings.currency}
          onChange={(v) => update("currency", v)}
        />

        {/* Date format */}
        <SectionHeader title="Formato data" />
        <OptionRow
          label="Come vengono mostrate le date"
          options={DATE_FORMATS as { value: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD"; label: string }[]}
          value={settings.dateFormat}
          onChange={(v) => update("dateFormat", v)}
        />

        {/* Budget alert threshold */}
        <SectionHeader title="Soglia avviso budget" />
        <OptionRow
          label="Avvisa quando il budget raggiunge"
          options={THRESHOLDS as { value: 70 | 80 | 90 | 100; label: string }[]}
          value={settings.budgetAlertThreshold}
          onChange={(v) => update("budgetAlertThreshold", v)}
        />

        {/* Display toggles */}
        <SectionHeader title="Visualizzazione" />
        <ToggleRow
          label="Mostra centesimi nelle liste"
          description="Visualizza €12.50 invece di €12 nelle liste trasferimenti"
          value={settings.showCentsInList}
          onChange={(v) => update("showCentsInList", v)}
        />
        <ToggleRow
          label="Modalità compatta"
          description="Riduce la spaziatura nelle liste per mostrare più elementi"
          value={settings.compactMode}
          onChange={(v) => update("compactMode", v)}
        />

        {/* Soglia notifica entrate mensili */}
        <SectionHeader title="Notifica soglia entrate mensili" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Attiva avviso entrate</Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>Notifica quando il totale mensile supera la soglia</Text>
            </View>
            <Switch
              value={incomingAlert.enabled}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIncomingAlert((prev) => ({ ...prev, enabled: v })); }}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={incomingAlert.enabled ? colors.primary : '#f4f3f4'}
            />
          </View>
          {incomingAlert.enabled && (
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Soglia importo (€)</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 16,
                  fontWeight: '700',
                  color: colors.foreground,
                  backgroundColor: colors.background,
                }}
                value={thresholdInput}
                onChangeText={setThresholdInput}
                keyboardType="decimal-pad"
                placeholder="500"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
              <Text style={{ fontSize: 11, color: colors.muted }}>
                Riceverai una notifica quando gli accrediti del mese superano €{thresholdInput || '500'}.
              </Text>
            </View>
          )}
        </View>

        {/* Low balance alert */}
        <SectionHeader title="Notifica saldo basso" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>Avviso saldo sotto soglia</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Notifica quando il saldo scende sotto la soglia (max 1 ogni 6 ore)</Text>
            </View>
            <Switch
              value={lowBalanceAlert.enabled}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLowBalanceAlert((prev) => ({ ...prev, enabled: v })); }}
              trackColor={{ false: colors.border, true: colors.warning + '80' }}
              thumbColor={lowBalanceAlert.enabled ? colors.warning : '#f4f3f4'}
            />
          </View>
          {lowBalanceAlert.enabled && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Soglia saldo (€)</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, fontWeight: '700', color: colors.foreground, backgroundColor: colors.background }}
                value={lowBalanceInput}
                onChangeText={setLowBalanceInput}
                keyboardType="decimal-pad"
                placeholder="100"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[50, 100, 200, 500].map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => { setLowBalanceInput(String(v)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: lowBalanceInput === String(v) ? colors.warning + '20' : colors.border + '40', borderWidth: 1, borderColor: lowBalanceInput === String(v) ? colors.warning : colors.border }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: lowBalanceInput === String(v) ? colors.warning : colors.muted }}>€{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 11, color: colors.muted }}>Riceverai una notifica quando il saldo scende sotto €{lowBalanceInput || '100'}.</Text>
            </View>
          )}
        </View>

        {/* Notifica scadenze ricorrenti */}
        <SectionHeader title="Notifica scadenze ricorrenti" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>Avviso scadenza pagamento</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Ricevi una notifica prima che scada un bonifico ricorrente</Text>
            </View>
            <Switch
              value={recurringDeadline.enabled}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRecurringDeadline((prev) => ({ ...prev, enabled: v })); }}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={recurringDeadline.enabled ? colors.primary : '#f4f3f4'}
            />
          </View>
          {recurringDeadline.enabled && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>Giorni di anticipo</Text>
              <TextInput
                style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.foreground }}
                value={recurringDaysInput}
                onChangeText={setRecurringDaysInput}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
              />
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 3, 5, 7].map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => { setRecurringDaysInput(String(v)); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: recurringDaysInput === String(v) ? colors.primary + '20' : colors.border + '40', borderWidth: 1, borderColor: recurringDaysInput === String(v) ? colors.primary : colors.border }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: recurringDaysInput === String(v) ? colors.primary : colors.muted }}>{v}g</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ fontSize: 11, color: colors.muted }}>Riceverai una notifica {recurringDaysInput || '3'} giorni prima della scadenza di un bonifico ricorrente.</Text>
            </View>
          )}
        </View>

        {/* Avvisi budget categoria */}
        <SectionHeader title="Avvisi budget categoria" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>Avvisi superamento budget</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Notifica quando una categoria supera la soglia mensile</Text>
            </View>
            <Switch
              value={budgetAlert.enabled}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBudgetAlert((prev) => ({ ...prev, enabled: v })); }}
              trackColor={{ false: colors.border, true: colors.warning + '80' }}
              thumbColor={budgetAlert.enabled ? colors.warning : '#f4f3f4'}
            />
          </View>
          {budgetAlert.enabled && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Avviso all&apos;80%</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Notifica quando la spesa raggiunge l&apos;80% del budget</Text>
                </View>
                <Switch
                  value={budgetAlert.threshold80}
                  onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBudgetAlert((prev) => ({ ...prev, threshold80: v })); }}
                  trackColor={{ false: colors.border, true: colors.warning + '80' }}
                  thumbColor={budgetAlert.threshold80 ? colors.warning : '#f4f3f4'}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Avviso al 100% (sforamento)</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Notifica quando la spesa supera il limite mensile</Text>
                </View>
                <Switch
                  value={budgetAlert.threshold100}
                  onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBudgetAlert((prev) => ({ ...prev, threshold100: v })); }}
                  trackColor={{ false: colors.border, true: colors.error + '80' }}
                  thumbColor={budgetAlert.threshold100 ? colors.error : '#f4f3f4'}
                />
              </View>
              <Text style={{ fontSize: 11, color: colors.muted }}>Configura i budget in &quot;Gestione Budget&quot; dalla Home.</Text>
            </View>
          )}
        </View>

        {/* Saldo sotto soglia sweep */}
        <SectionHeader title="Avviso saldo basso (Giro di fondo)" />
        <View style={{ backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Avviso saldo basso</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>Notifica push quando il saldo del conto sorgente scende sotto la soglia</Text>
            </View>
            <Switch
              value={sweepLowAlert.enabled}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSweepLowAlert((prev) => ({ ...prev, enabled: v })); }}
              trackColor={{ false: colors.border, true: colors.warning + '80' }}
              thumbColor={sweepLowAlert.enabled ? colors.warning : '#f4f3f4'}
            />
          </View>
          {sweepLowAlert.enabled && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.foreground }}>Usa soglia assoluta (€)</Text>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Altrimenti usa % della soglia sweep</Text>
                </View>
                <Switch
                  value={sweepLowAlert.useAbsolute}
                  onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSweepLowAlert((prev) => ({ ...prev, useAbsolute: v })); }}
                  trackColor={{ false: colors.border, true: colors.primary + '80' }}
                  thumbColor={sweepLowAlert.useAbsolute ? colors.primary : '#f4f3f4'}
                />
              </View>
              {sweepLowAlert.useAbsolute ? (
                <View>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Soglia assoluta (€)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 10, color: colors.foreground, fontSize: 15 }}
                    value={String(sweepLowAlert.absoluteThreshold)}
                    onChangeText={(v) => { const n = parseFloat(v); if (!isNaN(n) && n >= 0) setSweepLowAlert((prev) => ({ ...prev, absoluteThreshold: n })); }}
                    keyboardType="numeric"
                    returnKeyType="done"
                    placeholder="200"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              ) : (
                <View>
                  <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 6 }}>Soglia: {sweepLowAlert.thresholdPercent}% della soglia sweep</Text>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {[10, 15, 20, 25, 30, 50].map((pct) => (
                      <TouchableOpacity
                        key={pct}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSweepLowAlert((prev) => ({ ...prev, thresholdPercent: pct })); }}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: sweepLowAlert.thresholdPercent === pct ? colors.warning : colors.surface, borderWidth: 1, borderColor: sweepLowAlert.thresholdPercent === pct ? colors.warning : colors.border }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: sweepLowAlert.thresholdPercent === pct ? '#fff' : colors.foreground }}>{pct}%</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <Text style={{ fontSize: 11, color: colors.muted }}>Anti-spam: una notifica ogni 12 ore. Configura il giro di fondo in &quot;Giro di Fondo&quot; dalla Home.</Text>
            </View>
          )}
        </View>

        {/* Seasonal theme */}
        <SectionHeader title="Tema stagionale" />
        <ToggleRow
          label={`Tema stagionale ${getSeasonEmoji()}`}
          description={`Attiva decorazioni stagionali nell'app (${getSeasonEmoji()} attivo questo mese)`}
          value={settings.seasonalTheme}
          onChange={(v) => update("seasonalTheme", v)}
        />

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          style={{
            backgroundColor: saved ? colors.success : colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
            {saved ? "✓ Salvato!" : "Salva impostazioni"}
          </Text>
        </TouchableOpacity>

        {/* Reset */}
        <TouchableOpacity
          onPress={handleReset}
          style={{
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.error + "60",
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.error }}>Ripristina predefiniti</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}
