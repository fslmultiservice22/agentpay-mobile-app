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
type ItemType = 'asset' | 'liability';

interface NetWorthItem {
  id: string;
  type: ItemType;
  category: string;
  label: string;
  value: number;
  note?: string;
  updatedAt: string;
}

interface NetWorthSnapshot {
  date: string; // YYYY-MM
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

const STORAGE_KEY = 'agentpay_net_worth_items';
const HISTORY_KEY = 'agentpay_net_worth_history';

const ASSET_CATEGORIES = [
  { id: 'conto_corrente', label: 'Conto corrente', emoji: '🏦' },
  { id: 'risparmio', label: 'Risparmio', emoji: '💰' },
  { id: 'investimenti', label: 'Investimenti', emoji: '📈' },
  { id: 'immobili', label: 'Immobili', emoji: '🏠' },
  { id: 'auto', label: 'Auto / Veicoli', emoji: '🚗' },
  { id: 'pensione', label: 'Pensione / TFR', emoji: '🏛️' },
  { id: 'altro_attivo', label: 'Altro', emoji: '📦' },
];

const LIABILITY_CATEGORIES = [
  { id: 'mutuo', label: 'Mutuo', emoji: '🏡' },
  { id: 'prestito', label: 'Prestito personale', emoji: '💳' },
  { id: 'auto_finanziamento', label: 'Finanziamento auto', emoji: '🚘' },
  { id: 'carta_credito', label: 'Carta di credito', emoji: '💳' },
  { id: 'debiti', label: 'Debiti vari', emoji: '📋' },
  { id: 'altro_passivo', label: 'Altro', emoji: '📦' },
];

function catInfo(type: ItemType, catId: string) {
  const list = type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
  return list.find((c) => c.id === catId) ?? { id: catId, label: catId, emoji: '📦' };
}

function formatEur(n: number) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatEurDec(n: number) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Componente principale ──────────────────────────────────────────────────
export default function NetWorthScreen() {
  const colors = useColors();
  const router = useRouter();

  const [items, setItems] = useState<NetWorthItem[]>([]);
  const [history, setHistory] = useState<NetWorthSnapshot[]>([]);
  const [view, setView] = useState<'overview' | 'add' | 'list'>('overview');
  const [addType, setAddType] = useState<ItemType>('asset');

  // Form
  const [formCategory, setFormCategory] = useState('conto_corrente');
  const [formLabel, setFormLabel] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formNote, setFormNote] = useState('');

  const load = useCallback(async () => {
    const [rawItems, rawHistory] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(HISTORY_KEY),
    ]);
    if (rawItems) { try { setItems(JSON.parse(rawItems)); } catch { /* ignore */ } }
    if (rawHistory) { try { setHistory(JSON.parse(rawHistory)); } catch { /* ignore */ } }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveItems = async (updated: NetWorthItem[]) => {
    setItems(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Aggiorna snapshot mensile
    const totalAssets = updated.filter((i) => i.type === 'asset').reduce((s, i) => s + i.value, 0);
    const totalLiabilities = updated.filter((i) => i.type === 'liability').reduce((s, i) => s + i.value, 0);
    const netWorth = totalAssets - totalLiabilities;
    const month = currentMonth();
    const rawHistory = await AsyncStorage.getItem(HISTORY_KEY);
    let hist: NetWorthSnapshot[] = [];
    if (rawHistory) { try { hist = JSON.parse(rawHistory); } catch { /* ignore */ } }
    const idx = hist.findIndex((s) => s.date === month);
    const snap: NetWorthSnapshot = { date: month, netWorth, totalAssets, totalLiabilities };
    if (idx >= 0) hist[idx] = snap; else hist.push(snap);
    hist.sort((a, b) => a.date.localeCompare(b.date));
    setHistory(hist);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  };

  const totalAssets = useMemo(() => items.filter((i) => i.type === 'asset').reduce((s, i) => s + i.value, 0), [items]);
  const totalLiabilities = useMemo(() => items.filter((i) => i.type === 'liability').reduce((s, i) => s + i.value, 0), [items]);
  const netWorth = totalAssets - totalLiabilities;

  // Variazione vs mese precedente
  const prevMonthNetWorth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const pm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return history.find((s) => s.date === pm)?.netWorth ?? null;
  }, [history]);

  const addItem = async () => {
    if (!formLabel.trim() || !formValue.trim()) {
      Alert.alert('Dati mancanti', 'Inserisci nome e valore.');
      return;
    }
    const val = parseFloat(formValue.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      Alert.alert('Valore non valido', 'Inserisci un valore numerico positivo.');
      return;
    }
    const item: NetWorthItem = {
      id: `nw_${Date.now()}`,
      type: addType,
      category: formCategory,
      label: formLabel.trim(),
      value: val,
      note: formNote.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
    await saveItems([...items, item]);
    setFormLabel(''); setFormValue(''); setFormNote('');
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setView('overview');
  };

  const deleteItem = (id: string) => {
    Alert.alert('Elimina', 'Vuoi eliminare questa voce?', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => { await saveItems(items.filter((i) => i.id !== id)); } },
    ]);
  };

  const s = styles(colors);

  // ─── Vista panoramica ────────────────────────────────────────────────────
  if (view === 'overview') {
    const assetItems = items.filter((i) => i.type === 'asset');
    const liabilityItems = items.filter((i) => i.type === 'liability');
    const diff = prevMonthNetWorth !== null ? netWorth - prevMonthNetWorth : null;
    const diffPct = prevMonthNetWorth !== null && prevMonthNetWorth !== 0 ? (diff! / Math.abs(prevMonthNetWorth)) * 100 : null;

    return (
      <ScreenContainer>
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.backText}>‹ Indietro</Text>
          </Pressable>
          <Text style={s.headerTitle}>Patrimonio netto</Text>
          <Pressable onPress={() => setView('list')} style={({ pressed }) => [s.histBtn, pressed && { opacity: 0.7 }]}>
            <Text style={s.histBtnText}>Voci</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Card patrimonio netto */}
          <View style={s.heroCard}>
            <Text style={s.heroLabel}>PATRIMONIO NETTO</Text>
            <Text style={[s.heroValue, { color: netWorth >= 0 ? colors.success : colors.error }]}>
              {netWorth < 0 ? '-' : ''}€{formatEur(Math.abs(netWorth))}
            </Text>
            {diff !== null && diffPct !== null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <Text style={{ fontSize: 13, color: diff >= 0 ? colors.success : colors.error, fontWeight: '700' }}>
                  {diff >= 0 ? '▲' : '▼'} €{formatEur(Math.abs(diff))} ({Math.abs(diffPct).toFixed(1)}%) vs mese scorso
                </Text>
              </View>
            )}
          </View>

          {/* Riepilogo attività / passività */}
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 }}>
            <View style={[s.statCard, { flex: 1, borderColor: colors.success + '44', backgroundColor: colors.success + '0a' }]}>
              <Text style={[s.statLabel, { color: colors.success }]}>ATTIVITÀ</Text>
              <Text style={[s.statValue, { color: colors.success }]}>€{formatEur(totalAssets)}</Text>
              <Text style={s.statSub}>{assetItems.length} voci</Text>
            </View>
            <View style={[s.statCard, { flex: 1, borderColor: colors.error + '44', backgroundColor: colors.error + '0a' }]}>
              <Text style={[s.statLabel, { color: colors.error }]}>PASSIVITÀ</Text>
              <Text style={[s.statValue, { color: colors.error }]}>€{formatEur(totalLiabilities)}</Text>
              <Text style={s.statSub}>{liabilityItems.length} voci</Text>
            </View>
          </View>

          {/* Barra visuale attività vs passività */}
          {(totalAssets > 0 || totalLiabilities > 0) && (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={s.sectionLabel}>Composizione patrimonio</Text>
              <View style={{ height: 16, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.border }}>
                {totalAssets > 0 && (
                  <View style={{ flex: totalAssets, backgroundColor: colors.success, borderRadius: 8 }} />
                )}
                {totalLiabilities > 0 && (
                  <View style={{ flex: totalLiabilities, backgroundColor: colors.error }} />
                )}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: colors.success, fontWeight: '600' }}>
                  Attività {totalAssets + totalLiabilities > 0 ? ((totalAssets / (totalAssets + totalLiabilities)) * 100).toFixed(0) : 0}%
                </Text>
                <Text style={{ fontSize: 11, color: colors.error, fontWeight: '600' }}>
                  Passività {totalAssets + totalLiabilities > 0 ? ((totalLiabilities / (totalAssets + totalLiabilities)) * 100).toFixed(0) : 0}%
                </Text>
              </View>
            </View>
          )}

          {/* Storico mensile */}
          {history.length > 1 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
              <Text style={s.sectionLabel}>Storico mensile</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[...history].slice(-6).map((snap) => {
                    const isPos = snap.netWorth >= 0;
                    return (
                      <View key={snap.date} style={{ alignItems: 'center', minWidth: 72, backgroundColor: colors.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 10, color: colors.muted, fontWeight: '600' }}>{snap.date.slice(5)}/{snap.date.slice(2, 4)}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: isPos ? colors.success : colors.error, marginTop: 4 }}>
                          {isPos ? '' : '-'}€{formatEur(Math.abs(snap.netWorth))}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Lista attività */}
          {assetItems.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={s.sectionLabel}>Attività</Text>
              {assetItems.map((item) => {
                const cat = catInfo('asset', item.category);
                return (
                  <View key={item.id} style={s.itemRow}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{cat.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{item.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{cat.label}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.success }}>€{formatEurDec(item.value)}</Text>
                    <Pressable onPress={() => deleteItem(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, marginLeft: 10 }]}>
                      <Text style={{ fontSize: 13, color: colors.error }}>🗑</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {/* Lista passività */}
          {liabilityItems.length > 0 && (
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <Text style={s.sectionLabel}>Passività</Text>
              {liabilityItems.map((item) => {
                const cat = catInfo('liability', item.category);
                return (
                  <View key={item.id} style={s.itemRow}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>{cat.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{item.label}</Text>
                      <Text style={{ fontSize: 12, color: colors.muted }}>{cat.label}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: colors.error }}>-€{formatEurDec(item.value)}</Text>
                    <Pressable onPress={() => deleteItem(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, marginLeft: 10 }]}>
                      <Text style={{ fontSize: 13, color: colors.error }}>🗑</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {items.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>💼</Text>
              <Text style={s.emptyTitle}>Nessuna voce</Text>
              <Text style={s.emptySubtitle}>Aggiungi attività e passività per calcolare il tuo patrimonio netto.</Text>
            </View>
          )}
        </ScrollView>

        {/* FAB split: attività / passività */}
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => { setAddType('asset'); setFormCategory('conto_corrente'); setView('add'); }}
            style={({ pressed }) => [s.fabHalf, { backgroundColor: colors.success }, pressed && { opacity: 0.8 }]}
          >
            <Text style={s.fabText}>+ Attività</Text>
          </Pressable>
          <Pressable
            onPress={() => { setAddType('liability'); setFormCategory('mutuo'); setView('add'); }}
            style={({ pressed }) => [s.fabHalf, { backgroundColor: colors.error }, pressed && { opacity: 0.8 }]}
          >
            <Text style={s.fabText}>+ Passività</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ─── Vista aggiunta ──────────────────────────────────────────────────────
  if (view === 'add') {
    const cats = addType === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;
    return (
      <ScreenContainer>
        <View style={s.header}>
          <Pressable onPress={() => setView('overview')} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.backText}>‹ Annulla</Text>
          </Pressable>
          <Text style={s.headerTitle}>{addType === 'asset' ? 'Nuova attività' : 'Nuova passività'}</Text>
          <View style={{ width: 70 }} />
        </View>
        <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Tipo toggle */}
          <View style={s.section}>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
              <Pressable
                onPress={() => { setAddType('asset'); setFormCategory('conto_corrente'); }}
                style={[{ flex: 1, paddingVertical: 12, alignItems: 'center' }, addType === 'asset' && { backgroundColor: colors.success }]}
              >
                <Text style={{ fontWeight: '700', color: addType === 'asset' ? '#fff' : colors.muted }}>Attività</Text>
              </Pressable>
              <Pressable
                onPress={() => { setAddType('liability'); setFormCategory('mutuo'); }}
                style={[{ flex: 1, paddingVertical: 12, alignItems: 'center' }, addType === 'liability' && { backgroundColor: colors.error }]}
              >
                <Text style={{ fontWeight: '700', color: addType === 'liability' ? '#fff' : colors.muted }}>Passività</Text>
              </Pressable>
            </View>
          </View>

          {/* Categoria */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Categoria</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {cats.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setFormCategory(cat.id)}
                  style={({ pressed }) => [
                    s.catChip,
                    formCategory === cat.id && { backgroundColor: (addType === 'asset' ? colors.success : colors.error) + '22', borderColor: addType === 'asset' ? colors.success : colors.error },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                  <Text style={[s.catChipText, formCategory === cat.id && { color: addType === 'asset' ? colors.success : colors.error, fontWeight: '700' }]}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Nome */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Nome *</Text>
            <TextInput
              style={s.inputFull}
              placeholder={addType === 'asset' ? 'es. Conto BancoPosta, Appartamento Milano...' : 'es. Mutuo casa, Prestito auto...'}
              placeholderTextColor={colors.muted}
              value={formLabel}
              onChangeText={setFormLabel}
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* Valore */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Valore attuale *</Text>
            <View style={s.inputWrapper}>
              <Text style={s.inputPrefix}>€</Text>
              <TextInput
                style={[s.inputInner, { flex: 1 }]}
                placeholder="es. 15000.00"
                placeholderTextColor={colors.muted}
                value={formValue}
                onChangeText={setFormValue}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Note */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Note (opzionale)</Text>
            <TextInput
              style={s.inputFull}
              placeholder="es. Tasso fisso 2.5%, scadenza 2035..."
              placeholderTextColor={colors.muted}
              value={formNote}
              onChangeText={setFormNote}
              returnKeyType="done"
            />
          </View>

          <Pressable onPress={addItem} style={({ pressed }) => [s.calcBtn, { backgroundColor: addType === 'asset' ? colors.success : colors.error }, pressed && { opacity: 0.8 }]}>
            <Text style={s.calcBtnText}>💼 Salva voce</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── Vista lista completa ────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <ScreenContainer>
        <View style={s.header}>
          <Pressable onPress={() => setView('overview')} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.backText}>‹ Indietro</Text>
          </Pressable>
          <Text style={s.headerTitle}>Tutte le voci</Text>
          <View style={{ width: 70 }} />
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>💼</Text>
              <Text style={s.emptyTitle}>Nessuna voce</Text>
              <Text style={s.emptySubtitle}>Torna alla panoramica e aggiungi attività o passività.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = catInfo(item.type, item.category);
            return (
              <View style={s.itemRow}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>{cat.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{cat.label} · {item.type === 'asset' ? 'Attività' : 'Passività'}</Text>
                  {item.note && <Text style={{ fontSize: 11, color: colors.muted }}>{item.note}</Text>}
                </View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: item.type === 'asset' ? colors.success : colors.error }}>
                  {item.type === 'liability' ? '-' : ''}€{formatEurDec(item.value)}
                </Text>
                <Pressable onPress={() => deleteItem(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, marginLeft: 10 }]}>
                  <Text style={{ fontSize: 13, color: colors.error }}>🗑</Text>
                </Pressable>
              </View>
            );
          }}
        />
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
    histBtn: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.border, width: 70, alignItems: 'center' },
    histBtnText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
    heroCard: {
      margin: 16,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
    heroValue: { fontSize: 40, fontWeight: '900' },
    statCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, color: colors.muted },
    statValue: { fontSize: 18, fontWeight: '900', color: colors.foreground },
    statSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    scrollContent: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 20 },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catChipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
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
    calcBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
    calcBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    fabHalf: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyIcon: { fontSize: 48, marginBottom: 16 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  });
