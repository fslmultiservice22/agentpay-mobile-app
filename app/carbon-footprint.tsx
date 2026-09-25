import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, FlatList,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { MaterialIcons } from '@expo/vector-icons';

// ─── Tipi ────────────────────────────────────────────────────────────────────
interface CarbonEntry {
  id: string;
  category: 'trasporti' | 'energia' | 'alimentazione' | 'acquisti' | 'altro';
  label: string;
  value: number;   // quantità (km, kWh, kg, €, ...)
  unit: string;
  co2kg: number;   // CO₂ calcolata in kg
  date: string;    // ISO
}

// ─── Fattori emissione (kg CO₂ per unità) ────────────────────────────────────
const EMISSION_FACTORS: Record<string, { label: string; unit: string; factor: number; category: CarbonEntry['category'] }> = {
  car_petrol:   { label: 'Auto benzina',      unit: 'km',  factor: 0.192, category: 'trasporti' },
  car_diesel:   { label: 'Auto diesel',        unit: 'km',  factor: 0.171, category: 'trasporti' },
  car_electric: { label: 'Auto elettrica',     unit: 'km',  factor: 0.053, category: 'trasporti' },
  moto:         { label: 'Moto',               unit: 'km',  factor: 0.113, category: 'trasporti' },
  aereo_short:  { label: 'Aereo (< 3h)',       unit: 'km',  factor: 0.255, category: 'trasporti' },
  aereo_long:   { label: 'Aereo (> 3h)',       unit: 'km',  factor: 0.195, category: 'trasporti' },
  treno:        { label: 'Treno',              unit: 'km',  factor: 0.041, category: 'trasporti' },
  electricity:  { label: 'Elettricità',        unit: 'kWh', factor: 0.233, category: 'energia' },
  gas_natural:  { label: 'Gas naturale',       unit: 'm³',  factor: 2.040, category: 'energia' },
  beef:         { label: 'Carne bovina',       unit: 'kg',  factor: 27.0,  category: 'alimentazione' },
  pork:         { label: 'Carne suina',        unit: 'kg',  factor: 12.1,  category: 'alimentazione' },
  chicken:      { label: 'Pollo',              unit: 'kg',  factor: 6.9,   category: 'alimentazione' },
  fish:         { label: 'Pesce',              unit: 'kg',  factor: 5.1,   category: 'alimentazione' },
  vegetables:   { label: 'Verdura/frutta',     unit: 'kg',  factor: 2.0,   category: 'alimentazione' },
  clothing:     { label: 'Abbigliamento',      unit: '€',   factor: 0.025, category: 'acquisti' },
  electronics:  { label: 'Elettronica',        unit: '€',   factor: 0.040, category: 'acquisti' },
  other_spend:  { label: 'Altro acquisto',     unit: '€',   factor: 0.015, category: 'acquisti' },
};

const CATEGORY_COLORS: Record<CarbonEntry['category'], string> = {
  trasporti:    '#3b82f6',
  energia:      '#f59e0b',
  alimentazione:'#22c55e',
  acquisti:     '#a855f7',
  altro:        '#94a3b8',
};

const CATEGORY_ICONS: Record<CarbonEntry['category'], string> = {
  trasporti:    '🚗',
  energia:      '⚡',
  alimentazione:'🥩',
  acquisti:     '🛍️',
  altro:        '📦',
};

// Media italiana mensile: ~800 kg CO₂/mese (9.6 t/anno)
const ITALIAN_MONTHLY_AVG = 800;

const STORAGE_KEY = '@agentpay_carbon_footprint';

// ─── Componente principale ────────────────────────────────────────────────────
export default function CarbonFootprintScreen() {
  const colors = useColors();
  const router = useRouter();

  const [entries, setEntries] = useState<CarbonEntry[]>([]);
  const [tab, setTab] = useState<'add' | 'history'>('add');
  const [selectedFactor, setSelectedFactor] = useState<string>('car_petrol');
  const [valueInput, setValueInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Carica dati
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (raw) {
          try { setEntries(JSON.parse(raw)); } catch { /* ignore */ }
        }
      });
    }, [])
  );

  const save = async (updated: CarbonEntry[]) => {
    setEntries(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Aggiungi voce
  const handleAdd = async () => {
    const v = parseFloat(valueInput.replace(',', '.'));
    if (isNaN(v) || v <= 0) {
      Alert.alert('Valore non valido', 'Inserisci un numero positivo.');
      return;
    }
    setSaving(true);
    const factor = EMISSION_FACTORS[selectedFactor];
    const entry: CarbonEntry = {
      id: Date.now().toString(),
      category: factor.category,
      label: factor.label,
      value: v,
      unit: factor.unit,
      co2kg: parseFloat((v * factor.factor).toFixed(2)),
      date: new Date().toISOString(),
    };
    await save([entry, ...entries]);
    setValueInput('');
    setSaving(false);
    Alert.alert('Aggiunto', `+${entry.co2kg} kg CO₂ registrati.`);
  };

  // Elimina voce
  const handleDelete = (id: string) => {
    Alert.alert('Elimina', 'Rimuovere questa voce?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => save(entries.filter((e) => e.id !== id)) },
    ]);
  };

  // Calcoli mensili (ultimi 30 giorni)
  const now = Date.now();
  const month30 = 30 * 24 * 60 * 60 * 1000;
  const monthlyEntries = entries.filter((e) => now - new Date(e.date).getTime() <= month30);
  const totalMonthly = monthlyEntries.reduce((s, e) => s + e.co2kg, 0);

  // Totale per categoria (mensile)
  const byCategory = Object.keys(CATEGORY_COLORS).reduce((acc, cat) => {
    acc[cat as CarbonEntry['category']] = monthlyEntries
      .filter((e) => e.category === cat)
      .reduce((s, e) => s + e.co2kg, 0);
    return acc;
  }, {} as Record<CarbonEntry['category'], number>);

  const pctVsAvg = ITALIAN_MONTHLY_AVG > 0 ? Math.round((totalMonthly / ITALIAN_MONTHLY_AVG) * 100) : 0;
  const statusColor = pctVsAvg <= 60 ? colors.success : pctVsAvg <= 100 ? colors.warning : colors.error;
  const statusLabel = pctVsAvg <= 60 ? 'Ottimo 🌱' : pctVsAvg <= 100 ? 'Nella media' : 'Sopra la media ⚠️';

  const s = styles(colors);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Indietro</Text>
        </TouchableOpacity>
        <Text style={s.title}>🌍 Carbon Footprint</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Riepilogo mensile */}
      <View style={s.summaryCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.summaryLabel}>CO₂ ultimi 30 giorni</Text>
          <Text style={[s.summaryValue, { color: statusColor }]}>
            {totalMonthly.toFixed(1)} <Text style={{ fontSize: 16 }}>kg</Text>
          </Text>
          <Text style={{ fontSize: 12, color: statusColor, fontWeight: '700', marginTop: 4 }}>{statusLabel}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>Media italiana</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{ITALIAN_MONTHLY_AVG} kg/mese</Text>
          <View style={{ backgroundColor: statusColor + '20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 12, color: statusColor, fontWeight: '700' }}>{pctVsAvg}% della media</Text>
          </View>
        </View>
      </View>

      {/* Barre per categoria */}
      {totalMonthly > 0 && (
        <View style={s.catBars}>
          {(Object.keys(CATEGORY_COLORS) as CarbonEntry['category'][]).map((cat) => {
            const val = byCategory[cat];
            if (val === 0) return null;
            const pct = totalMonthly > 0 ? (val / totalMonthly) * 100 : 0;
            return (
              <View key={cat} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 12, color: colors.foreground }}>
                    {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{val.toFixed(1)} kg ({Math.round(pct)}%)</Text>
                </View>
                <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3 }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: CATEGORY_COLORS[cat], width: `${pct}%` as any }} />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Tab bar */}
      <View style={s.tabBar}>
        {(['add', 'history'] as const).map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
            <Text style={[s.tabLabel, tab === t && { color: colors.primary }]}>
              {t === 'add' ? '➕ Aggiungi' : '📋 Storico'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'add' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Selezione tipo */}
          <Text style={s.sectionTitle}>Tipo di attività</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {Object.entries(EMISSION_FACTORS).map(([key, f]) => (
              <TouchableOpacity
                key={key}
                onPress={() => setSelectedFactor(key)}
                style={[s.factorChip, selectedFactor === key && s.factorChipActive]}
              >
                <Text style={{ fontSize: 10, color: selectedFactor === key ? '#fff' : colors.muted, fontWeight: '600' }}>
                  {CATEGORY_ICONS[f.category]} {f.label}
                </Text>
                <Text style={{ fontSize: 9, color: selectedFactor === key ? 'rgba(255,255,255,0.7)' : colors.muted }}>
                  {f.factor} kg/{f.unit}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input quantità */}
          <Text style={s.sectionTitle}>Quantità ({EMISSION_FACTORS[selectedFactor].unit})</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              value={valueInput}
              onChangeText={setValueInput}
              keyboardType="decimal-pad"
              placeholder={`es. 50 ${EMISSION_FACTORS[selectedFactor].unit}`}
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />
            <Text style={{ fontSize: 14, color: colors.muted, marginLeft: 8 }}>
              {EMISSION_FACTORS[selectedFactor].unit}
            </Text>
          </View>

          {/* Anteprima CO₂ */}
          {valueInput.length > 0 && !isNaN(parseFloat(valueInput)) && (
            <View style={s.previewBox}>
              <Text style={{ fontSize: 13, color: colors.muted }}>CO₂ stimata:</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{(parseFloat(valueInput.replace(',', '.')) * EMISSION_FACTORS[selectedFactor].factor).toFixed(2)} kg CO₂</Text>
            </View>
          )}

          {/* Preset rapidi */}
          <Text style={s.sectionTitle}>Preset rapidi</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {[10, 50, 100, 200, 500].map((v) => (
              <TouchableOpacity key={v} onPress={() => setValueInput(String(v))} style={s.preset}>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={handleAdd} style={[s.addBtn, saving && { opacity: 0.6 }]} disabled={saving}>
            <Text style={s.addBtnText}>Registra emissione</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>
              Nessuna voce registrata. Aggiungi la prima emissione!
            </Text>
          }
          renderItem={({ item }) => (
            <View style={s.historyItem}>
              <View style={[s.catDot, { backgroundColor: CATEGORY_COLORS[item.category] }]} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>
                  {CATEGORY_ICONS[item.category]} {item.label}
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {item.value} {item.unit} · {new Date(item.date).toLocaleDateString('it-IT')}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: CATEGORY_COLORS[item.category], marginRight: 12 }}>
                {item.co2kg} kg
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <MaterialIcons name="delete" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────
function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { width: 80 },
    title: { fontSize: 17, fontWeight: '800', color: colors.foreground },
    summaryCard: {
      flexDirection: 'row', alignItems: 'center', margin: 16,
      backgroundColor: colors.surface, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: colors.border,
    },
    summaryLabel: { fontSize: 11, color: colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { fontSize: 32, fontWeight: '900', lineHeight: 38 },
    catBars: { marginHorizontal: 16, marginBottom: 8 },
    tabBar: {
      flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
      backgroundColor: colors.surface, borderRadius: 12, padding: 4,
    },
    tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    tabBtnActive: { backgroundColor: colors.primary + '20' },
    tabLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
    factorChip: {
      backgroundColor: colors.surface, borderRadius: 10, padding: 8,
      marginRight: 8, borderWidth: 1, borderColor: colors.border, minWidth: 80, alignItems: 'center',
    },
    factorChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    input: {
      flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12,
      fontSize: 16, color: colors.foreground, borderWidth: 1, borderColor: colors.border,
    },
    previewBox: {
      backgroundColor: colors.primary + '15', borderRadius: 12, padding: 12,
      alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: colors.primary + '30',
    },
    preset: {
      backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
      borderWidth: 1, borderColor: colors.border,
    },
    addBtn: {
      backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center',
    },
    addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    historyItem: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
      borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    },
    catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  });
}
