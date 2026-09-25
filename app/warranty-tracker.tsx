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
type WarrantyCategory =
  | 'elettronica'
  | 'elettrodomestici'
  | 'auto'
  | 'casa'
  | 'abbigliamento'
  | 'altro';

interface WarrantyItem {
  id: string;
  productName: string;
  category: WarrantyCategory;
  purchaseDate: string;   // ISO date string
  warrantyMonths: number; // durata garanzia in mesi
  expiryDate: string;     // ISO date string (calcolata)
  price?: number;         // prezzo acquisto opzionale
  store?: string;         // negozio opzionale
  note?: string;
}

const STORAGE_KEY = 'agentpay_warranties';

const CATEGORIES: { id: WarrantyCategory; label: string; emoji: string; color: string }[] = [
  { id: 'elettronica', label: 'Elettronica', emoji: '💻', color: '#6366f1' },
  { id: 'elettrodomestici', label: 'Elettrodomestici', emoji: '🏠', color: '#0ea5e9' },
  { id: 'auto', label: 'Auto / Moto', emoji: '🚗', color: '#f59e0b' },
  { id: 'casa', label: 'Casa', emoji: '🛋️', color: '#22c55e' },
  { id: 'abbigliamento', label: 'Abbigliamento', emoji: '👕', color: '#ec4899' },
  { id: 'altro', label: 'Altro', emoji: '📦', color: '#94a3b8' },
];

const WARRANTY_DURATIONS = [
  { label: '6 mesi', value: 6 },
  { label: '1 anno', value: 12 },
  { label: '2 anni', value: 24 },
  { label: '3 anni', value: 36 },
  { label: '5 anni', value: 60 },
];

function catInfo(id: WarrantyCategory) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function daysUntil(expiryIso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiryIso);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusInfo(days: number, colors: ReturnType<typeof useColors>) {
  if (days < 0) return { label: 'Scaduta', color: colors.muted, bg: colors.surface };
  if (days <= 30) return { label: `Scade in ${days}g`, color: colors.error, bg: colors.error + '11' };
  if (days <= 90) return { label: `Scade in ${days}g`, color: colors.warning, bg: colors.warning + '11' };
  return { label: `${days} giorni`, color: colors.success, bg: colors.success + '11' };
}

// ─── Componente principale ──────────────────────────────────────────────────
export default function WarrantyTrackerScreen() {
  const colors = useColors();
  const router = useRouter();

  const [items, setItems] = useState<WarrantyItem[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'expired'>('list');
  const [filterCat, setFilterCat] = useState<WarrantyCategory | 'all'>('all');

  // Form state
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<WarrantyCategory>('elettronica');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [warrantyMonths, setWarrantyMonths] = useState(24);
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('');
  const [note, setNote] = useState('');

  const loadItems = useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setItems(JSON.parse(raw)); } catch { /* ignore */ }
      }
    });
  }, []);

  useFocusEffect(useCallback(() => { loadItems(); }, [loadItems]));

  // Garanzie attive ordinate per scadenza
  const activeItems = useMemo(() => {
    return items
      .filter((i) => daysUntil(i.expiryDate) >= 0)
      .filter((i) => filterCat === 'all' || i.category === filterCat)
      .sort((a, b) => daysUntil(a.expiryDate) - daysUntil(b.expiryDate));
  }, [items, filterCat]);

  const expiredItems = useMemo(() => {
    return items
      .filter((i) => daysUntil(i.expiryDate) < 0)
      .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime());
  }, [items]);

  const expiringSoon = useMemo(() => items.filter((i) => { const d = daysUntil(i.expiryDate); return d >= 0 && d <= 30; }), [items]);

  const addItem = async () => {
    if (!productName.trim()) {
      Alert.alert('Dati mancanti', 'Inserisci il nome del prodotto.');
      return;
    }
    const expiry = addMonths(purchaseDate, warrantyMonths);
    const item: WarrantyItem = {
      id: `warranty_${Date.now()}`,
      productName: productName.trim(),
      category,
      purchaseDate,
      warrantyMonths,
      expiryDate: expiry,
      price: price ? parseFloat(price) : undefined,
      store: store.trim() || undefined,
      note: note.trim() || undefined,
    };
    const updated = [item, ...items];
    setItems(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setProductName(''); setPrice(''); setStore(''); setNote('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setWarrantyMonths(24);
    setView('list');
  };

  const deleteItem = (id: string) => {
    Alert.alert('Elimina', 'Vuoi eliminare questa garanzia?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          const updated = items.filter((i) => i.id !== id);
          setItems(updated);
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
          <Text style={s.headerTitle}>Garanzie</Text>
          <Pressable onPress={() => setView('expired')} style={({ pressed }) => [s.histBtn, pressed && { opacity: 0.7 }]}>
            <Text style={s.histBtnText}>Scadute</Text>
          </Pressable>
        </View>

        {/* Banner alert garanzie in scadenza */}
        {expiringSoon.length > 0 && (
          <View style={s.alertBanner}>
            <Text style={s.alertText}>
              ⚠️ {expiringSoon.length} garanzi{expiringSoon.length === 1 ? 'a' : 'e'} in scadenza entro 30 giorni
            </Text>
          </View>
        )}

        {/* Filtro categorie */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        >
          <Pressable
            onPress={() => setFilterCat('all')}
            style={({ pressed }) => [s.catChip, filterCat === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }, pressed && { opacity: 0.7 }]}
          >
            <Text style={[s.catChipText, filterCat === 'all' && { color: '#fff' }]}>Tutte</Text>
          </Pressable>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setFilterCat(cat.id)}
              style={({ pressed }) => [s.catChip, filterCat === cat.id && { backgroundColor: cat.color + '22', borderColor: cat.color }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ fontSize: 14 }}>{cat.emoji}</Text>
              <Text style={[s.catChipText, filterCat === cat.id && { color: cat.color, fontWeight: '700' }]}>{cat.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <FlatList
          data={activeItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>🛡️</Text>
              <Text style={s.emptyTitle}>Nessuna garanzia attiva</Text>
              <Text style={s.emptySubtitle}>Aggiungi le garanzie dei tuoi prodotti per non perderne la scadenza.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const days = daysUntil(item.expiryDate);
            const st = statusInfo(days, colors);
            const cat = catInfo(item.category);
            return (
              <View style={s.itemCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cat.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground, flex: 1 }} numberOfLines={1}>{item.productName}</Text>
                      <View style={{ backgroundColor: st.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: st.color }}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
                      Acquisto: {formatDate(item.purchaseDate)} · {item.warrantyMonths} mesi
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>
                      Scadenza: {formatDate(item.expiryDate)}
                    </Text>
                    {item.store && <Text style={{ fontSize: 12, color: colors.muted }}>📍 {item.store}</Text>}
                    {item.price && <Text style={{ fontSize: 12, color: colors.muted }}>€{item.price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>}
                  </View>
                  <Pressable onPress={() => deleteItem(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 4 }]}>
                    <Text style={{ fontSize: 14, color: colors.error }}>🗑</Text>
                  </Pressable>
                </View>
                {/* Barra progresso garanzia */}
                {(() => {
                  const totalDays = warrantyMonths * 30;
                  const elapsed = totalDays - days;
                  const pct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
                  return (
                    <View style={{ marginTop: 10, height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: days <= 30 ? colors.error : days <= 90 ? colors.warning : colors.success, borderRadius: 2 }} />
                    </View>
                  );
                })()}
              </View>
            );
          }}
        />

        <Pressable
          onPress={() => setView('add')}
          style={({ pressed }) => [s.fab, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
        >
          <Text style={s.fabText}>+ Aggiungi garanzia</Text>
        </Pressable>
      </ScreenContainer>
    );
  }

  // ─── Vista aggiunta ──────────────────────────────────────────────────────
  if (view === 'add') {
    const expiryPreview = addMonths(purchaseDate, warrantyMonths);
    return (
      <ScreenContainer>
        <View style={s.header}>
          <Pressable onPress={() => setView('list')} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.backText}>‹ Annulla</Text>
          </Pressable>
          <Text style={s.headerTitle}>Nuova garanzia</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Nome prodotto */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Nome prodotto *</Text>
            <TextInput
              style={s.inputFull}
              placeholder="es. iPhone 15 Pro, Lavatrice Samsung..."
              placeholderTextColor={colors.muted}
              value={productName}
              onChangeText={setProductName}
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* Categoria */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Categoria</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategory(cat.id)}
                  style={({ pressed }) => [
                    s.catChip,
                    category === cat.id && { backgroundColor: cat.color + '22', borderColor: cat.color },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{cat.emoji}</Text>
                  <Text style={[s.catChipText, category === cat.id && { color: cat.color, fontWeight: '700' }]}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Data acquisto */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Data acquisto</Text>
            <TextInput
              style={s.inputFull}
              value={purchaseDate}
              onChangeText={setPurchaseDate}
              placeholder="AAAA-MM-GG"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
            />
          </View>

          {/* Durata garanzia */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Durata garanzia</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {WARRANTY_DURATIONS.map((d) => (
                <Pressable
                  key={d.value}
                  onPress={() => setWarrantyMonths(d.value)}
                  style={({ pressed }) => [
                    s.catChip,
                    warrantyMonths === d.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[s.catChipText, warrantyMonths === d.value && { color: '#fff', fontWeight: '700' }]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
            {/* Input personalizzato */}
            <View style={[s.inputWrapper, { marginTop: 8 }]}>
              <TextInput
                style={[s.inputInner, { flex: 1 }]}
                placeholder="Mesi personalizzati"
                placeholderTextColor={colors.muted}
                value={String(warrantyMonths)}
                onChangeText={(v) => { const n = parseInt(v, 10); if (!isNaN(n) && n > 0) setWarrantyMonths(n); }}
                keyboardType="number-pad"
                returnKeyType="next"
              />
              <Text style={s.inputSuffix}>mesi</Text>
            </View>
          </View>

          {/* Anteprima scadenza */}
          <View style={s.previewCard}>
            <Text style={s.previewLabel}>SCADENZA GARANZIA</Text>
            <Text style={s.previewAmount}>{formatDate(expiryPreview)}</Text>
            <Text style={s.previewSub}>
              {(() => { const d = daysUntil(expiryPreview); return d > 0 ? `Tra ${d} giorni` : 'Già scaduta'; })()}
            </Text>
          </View>

          {/* Prezzo (opzionale) */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Prezzo acquisto (opzionale)</Text>
            <View style={s.inputWrapper}>
              <Text style={s.inputPrefix}>€</Text>
              <TextInput
                style={[s.inputInner, { flex: 1 }]}
                placeholder="es. 899.00"
                placeholderTextColor={colors.muted}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Negozio (opzionale) */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Negozio / Rivenditore (opzionale)</Text>
            <TextInput
              style={s.inputFull}
              placeholder="es. Unieuro, Amazon, MediaWorld..."
              placeholderTextColor={colors.muted}
              value={store}
              onChangeText={setStore}
              returnKeyType="next"
            />
          </View>

          {/* Note */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Note (opzionale)</Text>
            <TextInput
              style={s.inputFull}
              placeholder="es. Numero ordine, numero seriale..."
              placeholderTextColor={colors.muted}
              value={note}
              onChangeText={setNote}
              returnKeyType="done"
            />
          </View>

          <Pressable onPress={addItem} style={({ pressed }) => [s.calcBtn, pressed && { opacity: 0.8 }]}>
            <Text style={s.calcBtnText}>🛡️ Salva garanzia</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── Vista scadute ────────────────────────────────────────────────────────
  if (view === 'expired') {
    return (
      <ScreenContainer>
        <View style={s.header}>
          <Pressable onPress={() => setView('list')} style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}>
            <Text style={s.backText}>‹ Indietro</Text>
          </Pressable>
          <Text style={s.headerTitle}>Garanzie scadute</Text>
          <View style={{ width: 70 }} />
        </View>
        <FlatList
          data={expiredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>✅</Text>
              <Text style={s.emptyTitle}>Nessuna garanzia scaduta</Text>
              <Text style={s.emptySubtitle}>Tutte le garanzie registrate sono ancora attive.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cat = catInfo(item.category);
            const days = Math.abs(daysUntil(item.expiryDate));
            return (
              <View style={[s.itemCard, { opacity: 0.7 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>{item.productName}</Text>
                    <Text style={{ fontSize: 12, color: colors.muted }}>Scaduta il {formatDate(item.expiryDate)} ({days} giorni fa)</Text>
                    {item.store && <Text style={{ fontSize: 12, color: colors.muted }}>📍 {item.store}</Text>}
                  </View>
                  <Pressable onPress={() => deleteItem(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1 }]}>
                    <Text style={{ fontSize: 14, color: colors.error }}>🗑</Text>
                  </Pressable>
                </View>
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
    alertBanner: {
      backgroundColor: colors.warning + '22',
      borderBottomWidth: 1,
      borderBottomColor: colors.warning + '55',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    alertText: { fontSize: 13, fontWeight: '600', color: colors.warning },
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
    scrollContent: { padding: 16, paddingBottom: 40 },
    section: { marginBottom: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
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
    previewAmount: { fontSize: 24, fontWeight: '900', color: colors.primary },
    previewSub: { fontSize: 13, color: colors.muted, marginTop: 4 },
    calcBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 8 },
    calcBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    itemCard: {
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
