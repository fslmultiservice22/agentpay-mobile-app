import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';

// ─── Tipi ──────────────────────────────────────────────────────────────────
interface FuelEntry {
  id: string;
  date: string;           // ISO string
  liters: number;         // litri riforniti
  pricePerLiter: number;  // €/litro
  totalCost: number;      // € totale
  odometer: number;       // km al momento del rifornimento
  fuelType: 'benzina' | 'diesel' | 'gpl' | 'elettrico';
  note?: string;
}

const STORAGE_KEY = 'agentpay_fuel_entries';

const FUEL_TYPES: { id: FuelEntry['fuelType']; label: string; emoji: string; color: string }[] = [
  { id: 'benzina', label: 'Benzina', emoji: '⛽', color: '#f59e0b' },
  { id: 'diesel', label: 'Diesel', emoji: '🛢️', color: '#6366f1' },
  { id: 'gpl', label: 'GPL', emoji: '🔵', color: '#22c55e' },
  { id: 'elettrico', label: 'Elettrico', emoji: '⚡', color: '#0ea5e9' },
];

function fuelLabel(type: FuelEntry['fuelType']) {
  return FUEL_TYPES.find((f) => f.id === type)?.label ?? type;
}
function fuelEmoji(type: FuelEntry['fuelType']) {
  return FUEL_TYPES.find((f) => f.id === type)?.emoji ?? '⛽';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Componente principale ──────────────────────────────────────────────────
export default function FuelTrackerScreen() {
  const colors = useColors();
  const router = useRouter();

  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'stats'>('list');

  // Form state
  const [liters, setLiters] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelType, setFuelType] = useState<FuelEntry['fuelType']>('benzina');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Carica dati
  const loadEntries = useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const list: FuelEntry[] = JSON.parse(raw);
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setEntries(list);
        } catch { /* ignore */ }
      }
    });
  }, []);

  useFocusEffect(useCallback(() => { loadEntries(); }, [loadEntries]));

  // Calcolo totale automatico
  const totalCostCalc = useMemo(() => {
    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    if (l > 0 && p > 0) return l * p;
    return null;
  }, [liters, pricePerLiter]);

  // Statistiche
  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalSpent = entries.reduce((s, e) => s + e.totalCost, 0);
    const totalLiters = entries.reduce((s, e) => s + e.liters, 0);
    const avgPricePerLiter = totalLiters > 0 ? totalSpent / totalLiters : 0;

    // Consumo medio (km/l) — calcolato tra rifornimenti consecutivi
    let totalKm = 0;
    let totalLitersForConsumption = 0;
    for (let i = 1; i < sorted.length; i++) {
      const kmDiff = sorted[i].odometer - sorted[i - 1].odometer;
      if (kmDiff > 0) {
        totalKm += kmDiff;
        totalLitersForConsumption += sorted[i].liters;
      }
    }
    const avgKmPerLiter = totalLitersForConsumption > 0 ? totalKm / totalLitersForConsumption : null;
    const avgCostPerKm = avgKmPerLiter ? avgPricePerLiter / avgKmPerLiter : null;

    // Mese corrente vs precedente
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthCost = entries.filter((e) => monthKey(e.date) === currentMonth).reduce((s, e) => s + e.totalCost, 0);
    const prevMonthCost = entries.filter((e) => monthKey(e.date) === prevMonth).reduce((s, e) => s + e.totalCost, 0);
    const monthDiff = prevMonthCost > 0 ? ((currentMonthCost - prevMonthCost) / prevMonthCost) * 100 : null;

    // Ultimo rifornimento
    const last = sorted[sorted.length - 1];

    return {
      totalSpent,
      totalLiters,
      avgPricePerLiter,
      avgKmPerLiter,
      avgCostPerKm,
      currentMonthCost,
      prevMonthCost,
      monthDiff,
      last,
      count: entries.length,
    };
  }, [entries]);

  const addEntry = async () => {
    const l = parseFloat(liters);
    const p = parseFloat(pricePerLiter);
    const km = parseInt(odometer, 10);
    if (!l || !p || !km || l <= 0 || p <= 0 || km <= 0) {
      Alert.alert('Dati mancanti', 'Inserisci litri, prezzo al litro e chilometraggio.');
      return;
    }
    const entry: FuelEntry = {
      id: `fuel_${Date.now()}`,
      date: new Date(entryDate).toISOString(),
      liters: l,
      pricePerLiter: p,
      totalCost: Math.round(l * p * 100) / 100,
      odometer: km,
      fuelType,
      note: note.trim() || undefined,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Reset form
    setLiters(''); setPricePerLiter(''); setOdometer(''); setNote('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setView('list');
  };

  const deleteEntry = (id: string) => {
    Alert.alert('Elimina', 'Vuoi eliminare questo rifornimento?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          const updated = entries.filter((e) => e.id !== id);
          setEntries(updated);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        },
      },
    ]);
  };

  const s = styles(colors);

  // ─── Vista lista ────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <ScreenContainer>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.backText}>‹ Indietro</Text>
          </Pressable>
          <Text style={s.headerTitle}>Carburante</Text>
          <Pressable onPress={() => setView('stats')} style={({ pressed }) => [s.histBtn, pressed && { opacity: 0.7 }]}>
            <Text style={s.histBtnText}>Stats</Text>
          </Pressable>
        </View>

        {/* Riepilogo rapido */}
        {stats && (
          <View style={s.summaryRow}>
            <View style={s.summaryBox}>
              <Text style={s.summaryLabel}>QUESTO MESE</Text>
              <Text style={s.summaryValue}>€{stats.currentMonthCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
              {stats.monthDiff !== null && (
                <Text style={{ fontSize: 11, color: stats.monthDiff > 0 ? colors.error : colors.success, fontWeight: '600', marginTop: 2 }}>
                  {stats.monthDiff > 0 ? '▲' : '▼'} {Math.abs(stats.monthDiff).toFixed(1)}% vs mese prec.
                </Text>
              )}
            </View>
            {stats.avgCostPerKm && (
              <View style={[s.summaryBox, { borderLeftWidth: 1, borderColor: colors.border }]}>
                <Text style={s.summaryLabel}>COSTO/KM</Text>
                <Text style={s.summaryValue}>€{stats.avgCostPerKm.toFixed(3)}</Text>
                {stats.avgKmPerLiter && (
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                    {stats.avgKmPerLiter.toFixed(1)} km/l
                  </Text>
                )}
              </View>
            )}
            <View style={[s.summaryBox, { borderLeftWidth: 1, borderColor: colors.border }]}>
              <Text style={s.summaryLabel}>TOTALE</Text>
              <Text style={s.summaryValue}>€{stats.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{stats.count} riforn.</Text>
            </View>
          </View>
        )}

        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>⛽</Text>
              <Text style={s.emptyTitle}>Nessun rifornimento</Text>
              <Text style={s.emptySubtitle}>Aggiungi il primo rifornimento per iniziare a tracciare i tuoi consumi.</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={[s.entryCard, index === 0 && { marginTop: 0 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Text style={{ fontSize: 28 }}>{fuelEmoji(item.fuelType)}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{fuelLabel(item.fuelType)}</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{formatDate(item.date)}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                      {item.liters.toFixed(2)} L · €{item.pricePerLiter.toFixed(3)}/L · {item.odometer.toLocaleString('it-IT')} km
                    </Text>
                    {item.note && <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }} numberOfLines={1}>{item.note}</Text>}
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: colors.foreground }}>
                    €{item.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Pressable onPress={() => deleteEntry(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
                    <Text style={{ fontSize: 14, color: colors.error }}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />

        {/* FAB */}
        <Pressable
          onPress={() => setView('add')}
          style={({ pressed }) => [s.fab, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
        >
          <Text style={s.fabText}>+ Rifornimento</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  // ─── Vista aggiunta ──────────────────────────────────────────────────────
  if (view === 'add') {
    return (
      <ScreenContainer>
        <View style={s.header}>
          <Pressable onPress={() => setView('list')} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.backText}>‹ Annulla</Text>
          </Pressable>
          <Text style={s.headerTitle}>Nuovo rifornimento</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Tipo carburante */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Tipo carburante</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {FUEL_TYPES.map((ft) => (
                <Pressable
                  key={ft.id}
                  onPress={() => setFuelType(ft.id)}
                  style={({ pressed }) => [
                    s.fuelChip,
                    fuelType === ft.id && { backgroundColor: ft.color + '22', borderColor: ft.color },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>{ft.emoji}</Text>
                  <Text style={[s.fuelChipText, fuelType === ft.id && { color: ft.color, fontWeight: '700' }]}>{ft.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Data */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Data</Text>
            <TextInput
              style={s.inputFull}
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="AAAA-MM-GG"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
            />
          </View>

          {/* Litri */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Litri riforniti</Text>
            <View style={s.inputWrapper}>
              <TextInput
                style={[s.inputInner, { flex: 1 }]}
                placeholder="es. 40.00"
                placeholderTextColor={colors.muted}
                value={liters}
                onChangeText={setLiters}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <Text style={s.inputSuffix}>L</Text>
            </View>
          </View>

          {/* Prezzo al litro */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Prezzo al litro</Text>
            <View style={s.inputWrapper}>
              <Text style={s.inputPrefix}>€</Text>
              <TextInput
                style={[s.inputInner, { flex: 1 }]}
                placeholder="es. 1.799"
                placeholderTextColor={colors.muted}
                value={pricePerLiter}
                onChangeText={setPricePerLiter}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <Text style={s.inputSuffix}>/L</Text>
            </View>
            {/* Prezzi comuni */}
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {['1.699', '1.749', '1.799', '1.849', '1.899', '1.949'].map((v) => (
                <Pressable key={v} onPress={() => setPricePerLiter(v)} style={({ pressed }) => [s.rateChip, pricePerLiter === v && { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}>
                  <Text style={[s.rateChipText, pricePerLiter === v && { color: '#fff' }]}>€{v}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Totale calcolato */}
          {totalCostCalc !== null && (
            <View style={s.previewCard}>
              <Text style={s.previewLabel}>TOTALE CALCOLATO</Text>
              <Text style={s.previewAmount}>€{totalCostCalc.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          )}

          {/* Chilometraggio */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Chilometraggio attuale</Text>
            <View style={s.inputWrapper}>
              <TextInput
                style={[s.inputInner, { flex: 1 }]}
                placeholder="es. 85420"
                placeholderTextColor={colors.muted}
                value={odometer}
                onChangeText={setOdometer}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              <Text style={s.inputSuffix}>km</Text>
            </View>
            {entries.length > 0 && (
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                Ultimo registrato: {entries[0].odometer.toLocaleString('it-IT')} km
              </Text>
            )}
          </View>

          {/* Note */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Note (opzionale)</Text>
            <TextInput
              style={s.inputFull}
              placeholder="es. Autostrada A1, stazione ENI..."
              placeholderTextColor={colors.muted}
              value={note}
              onChangeText={setNote}
              returnKeyType="done"
            />
          </View>

          <Pressable onPress={addEntry} style={({ pressed }) => [s.calcBtn, pressed && { opacity: 0.8 }]}>
            <Text style={s.calcBtnText}>⛽ Aggiungi rifornimento</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── Vista statistiche ────────────────────────────────────────────────────
  if (view === 'stats') {
    return (
      <ScreenContainer>
        <View style={s.header}>
          <Pressable onPress={() => setView('list')} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.backText}>‹ Indietro</Text>
          </Pressable>
          <Text style={s.headerTitle}>Statistiche</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {!stats ? (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>📊</Text>
              <Text style={s.emptyTitle}>Nessun dato</Text>
              <Text style={s.emptySubtitle}>Aggiungi almeno un rifornimento per vedere le statistiche.</Text>
            </View>
          ) : (
            <>
              {/* Griglia statistiche */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Totale speso', value: `€${stats.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: colors.primary },
                  { label: 'Litri totali', value: `${stats.totalLiters.toFixed(1)} L`, color: '#f59e0b' },
                  { label: 'Prezzo medio/L', value: `€${stats.avgPricePerLiter.toFixed(3)}`, color: '#6366f1' },
                  { label: 'Rifornimenti', value: String(stats.count), color: '#22c55e' },
                  ...(stats.avgKmPerLiter ? [{ label: 'Consumo medio', value: `${stats.avgKmPerLiter.toFixed(1)} km/L`, color: '#0ea5e9' }] : []),
                  ...(stats.avgCostPerKm ? [{ label: 'Costo per km', value: `€${stats.avgCostPerKm.toFixed(3)}`, color: '#ef4444' }] : []),
                ].map((item) => (
                  <View key={item.label} style={{ width: '47%', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 }}>
                    <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{item.label}</Text>
                    <Text style={{ fontSize: 20, fontWeight: '900', color: item.color }}>{item.value}</Text>
                  </View>
                ))}
              </View>

              {/* Confronto mensile */}
              <View style={[s.section, { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={s.sectionLabel}>Confronto mensile</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Mese precedente</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>€{stats.prevMonthCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </View>
                  {stats.monthDiff !== null && (
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22, color: stats.monthDiff >0 ? colors.error : colors.success, fontWeight: '900' }}>
                        {stats.monthDiff > 0 ? '▲' : '▼'} {Math.abs(stats.monthDiff).toFixed(1)}%</Text>
                    </View>
                  )}
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>Questo mese</Text>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>€{stats.currentMonthCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  </View>
                </View>
              </View>

              {/* Ultimo rifornimento */}
              <View style={[s.section, { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={s.sectionLabel}>Ultimo rifornimento</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <Text style={{ fontSize: 36 }}>{fuelEmoji(stats.last.fuelType)}</Text>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>{fuelLabel(stats.last.fuelType)} — {formatDate(stats.last.date)}</Text>
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                      {stats.last.liters.toFixed(2)} L · €{stats.last.pricePerLiter.toFixed(3)}/L · {stats.last.odometer.toLocaleString('it-IT')} km
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary, marginTop: 4 }}>
                      €{stats.last.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    );
  }

  return null;
}

// ─── Stili ──────────────────────────────────────────────────────────────────
const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, flex: 1, textAlign: 'center' },
    backBtn: { width: 70 },
    backText: { fontSize: 16, color: colors.primary },
    histBtn: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, width: 70, alignItems: 'center' },
    histBtnText: { fontSize: 13, fontWeight: '600', color: colors.foreground },
    summaryRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    summaryBox: { flex: 1, padding: 12, alignItems: 'center' },
    summaryLabel: { fontSize: 9, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
    summaryValue: { fontSize: 14, fontWeight: '800', color: colors.foreground },
    scrollContent: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    fuelChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fuelChipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 4,
    },
    inputPrefix: { fontSize: 16, color: colors.muted, marginRight: 6 },
    inputSuffix: { fontSize: 14, color: colors.muted, marginLeft: 6 },
    inputInner: { flex: 1, fontSize: 16, color: colors.foreground, paddingVertical: 10 },
    inputFull: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.foreground,
    },
    rateChip: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.border },
    rateChipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
    previewCard: {
      backgroundColor: colors.primary + '11',
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.primary + '33',
      alignItems: 'center',
    },
    previewLabel: { fontSize: 11, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    previewAmount: { fontSize: 28, fontWeight: '900', color: colors.primary },
    calcBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
    calcBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    entryCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      left: 20,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  });
