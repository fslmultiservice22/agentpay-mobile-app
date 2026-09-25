import React, { useState, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, FlatList, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = 'frutta-verdura' | 'carne-pesce' | 'latticini' | 'pane-cereali' | 'bevande' | 'pulizia' | 'igiene' | 'altro';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  category: Category;
  checked: boolean;
}

interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: { id: Category; label: string; emoji: string; color: string }[] = [
  { id: 'frutta-verdura', label: 'Frutta & Verdura', emoji: '🥦', color: '#22c55e' },
  { id: 'carne-pesce',    label: 'Carne & Pesce',    emoji: '🥩', color: '#ef4444' },
  { id: 'latticini',      label: 'Latticini',         emoji: '🧀', color: '#f59e0b' },
  { id: 'pane-cereali',   label: 'Pane & Cereali',    emoji: '🍞', color: '#d97706' },
  { id: 'bevande',        label: 'Bevande',            emoji: '🥤', color: '#3b82f6' },
  { id: 'pulizia',        label: 'Pulizia',            emoji: '🧹', color: '#8b5cf6' },
  { id: 'igiene',         label: 'Igiene',             emoji: '🧴', color: '#06b6d4' },
  { id: 'altro',          label: 'Altro',              emoji: '🛒', color: '#6b7280' },
];

const UNITS = ['pz', 'kg', 'g', 'L', 'ml', 'conf', 'busta'];

const STORAGE_KEY = 'shopping_lists_v1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function getCategoryInfo(id: Category) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

async function loadLists(): Promise<ShoppingList[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveLists(lists: ShoppingList[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ShoppingListScreen() {
  const router = useRouter();
  const colors = useColors();

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [view, setView] = useState<'lists' | 'items' | 'add-item'>('lists');

  // Add list form
  const [newListName, setNewListName] = useState('');

  // Add item form
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemUnit, setItemUnit] = useState('pz');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState<Category>('altro');

  // Filter
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');

  useFocusEffect(useCallback(() => {
    loadLists().then(data => {
      setLists(data);
      if (data.length > 0 && !activeListId) {
        setActiveListId(data[0].id);
        setView('items');
      }
    });
  }, [activeListId]));

  const activeList = lists.find(l => l.id === activeListId) ?? null;

  // ── List actions ──────────────────────────────────────────────────────────

  const createList = async () => {
    const name = newListName.trim() || `Lista ${lists.length + 1}`;
    const newList: ShoppingList = {
      id: genId(),
      name,
      items: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [newList, ...lists];
    setLists(updated);
    await saveLists(updated);
    setActiveListId(newList.id);
    setNewListName('');
    setView('items');
  };

  const deleteList = (id: string) => {
    Alert.alert('Elimina lista', 'Sei sicuro?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          const updated = lists.filter(l => l.id !== id);
          setLists(updated);
          await saveLists(updated);
          if (activeListId === id) {
            setActiveListId(updated[0]?.id ?? null);
            setView(updated.length > 0 ? 'items' : 'lists');
          }
        },
      },
    ]);
  };

  // ── Item actions ──────────────────────────────────────────────────────────

  const addItem = async () => {
    if (!itemName.trim() || !activeList) return;
    const item: ShoppingItem = {
      id: genId(),
      name: itemName.trim(),
      quantity: parseFloat(itemQty) || 1,
      unit: itemUnit,
      estimatedPrice: parseFloat(itemPrice) || 0,
      category: itemCategory,
      checked: false,
    };
    const updatedItems = [...activeList.items, item];
    await updateListItems(updatedItems);
    setItemName(''); setItemQty('1'); setItemPrice(''); setItemCategory('altro');
    setView('items');
  };

  const toggleItem = async (itemId: string) => {
    if (!activeList) return;
    const updatedItems = activeList.items.map(i =>
      i.id === itemId ? { ...i, checked: !i.checked } : i
    );
    await updateListItems(updatedItems);
  };

  const deleteItem = async (itemId: string) => {
    if (!activeList) return;
    const updatedItems = activeList.items.filter(i => i.id !== itemId);
    await updateListItems(updatedItems);
  };

  const clearChecked = async () => {
    if (!activeList) return;
    const updatedItems = activeList.items.filter(i => !i.checked);
    await updateListItems(updatedItems);
  };

  const updateListItems = async (items: ShoppingItem[]) => {
    const updated = lists.map(l =>
      l.id === activeListId ? { ...l, items } : l
    );
    setLists(updated);
    await saveLists(updated);
  };

  // ── Computed ──────────────────────────────────────────────────────────────

  const filteredItems = activeList
    ? (filterCategory === 'all'
        ? activeList.items
        : activeList.items.filter(i => i.category === filterCategory))
    : [];

  const totalEstimated = activeList
    ? activeList.items.reduce((s, i) => s + i.estimatedPrice * i.quantity, 0)
    : 0;

  const totalChecked = activeList
    ? activeList.items.reduce((s, i) => i.checked ? s + i.estimatedPrice * i.quantity : s, 0)
    : 0;

  const checkedCount = activeList?.items.filter(i => i.checked).length ?? 0;
  const totalCount = activeList?.items.length ?? 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => {
          if (view === 'add-item') setView('items');
          else if (view === 'items') setView('lists');
          else router.back();
        }} style={styles.backBtn}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {view === 'lists' ? '🛒 Liste della Spesa'
            : view === 'items' ? (activeList?.name ?? 'Lista')
            : '➕ Aggiungi Articolo'}
        </Text>
        {view === 'items' && (
          <TouchableOpacity onPress={() => setView('add-item')} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>+</Text>
          </TouchableOpacity>
        )}
        {view !== 'items' && <View style={{ width: 36 }} />}
      </View>

      {/* ── VIEW: LISTS ── */}
      {view === 'lists' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* New list input */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Nuova Lista</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                placeholder="Nome lista (es. Supermercato)"
                placeholderTextColor={colors.muted}
                value={newListName}
                onChangeText={setNewListName}
                onSubmitEditing={createList}
                returnKeyType="done"
              />
              <TouchableOpacity onPress={createList} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Crea</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Existing lists */}
          {lists.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="shopping-cart" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nessuna lista</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Crea la tua prima lista della spesa</Text>
            </View>
          ) : (
            lists.map(list => {
              const total = list.items.reduce((s, i) => s + i.estimatedPrice * i.quantity, 0);
              const checked = list.items.filter(i => i.checked).length;
              return (
                <TouchableOpacity
                  key={list.id}
                  style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => { setActiveListId(list.id); setView('items'); }}
                >
                  <View style={styles.listCardLeft}>
                    <Text style={[styles.listCardName, { color: colors.foreground }]}>{list.name}</Text>
                    <Text style={[styles.listCardMeta, { color: colors.muted }]}>
                      {list.items.length} articoli · {checked}/{list.items.length} spuntati
                    </Text>
                    {total > 0 && (
                      <Text style={[styles.listCardTotal, { color: colors.primary }]}>
                        Stima: €{total.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => deleteList(list.id)} style={styles.deleteBtn}>
                    <MaterialIcons name="delete" size={18} color={colors.foreground} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── VIEW: ITEMS ── */}
      {view === 'items' && activeList && (
        <View style={{ flex: 1 }}>
          {/* Summary bar */}
          <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{checkedCount}/{totalCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Spuntati</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>€{totalEstimated.toFixed(2)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Totale stimato</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: '#22c55e' }]}>€{totalChecked.toFixed(2)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Nel carrello</Text>
            </View>
          </View>

          {/* Progress bar */}
          {totalCount > 0 && (
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${(checkedCount / totalCount) * 100}%` as any, backgroundColor: colors.primary }]} />
            </View>
          )}

          {/* Category filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
            <TouchableOpacity
              style={[styles.filterChip, filterCategory === 'all' && { backgroundColor: colors.primary }]}
              onPress={() => setFilterCategory('all')}
            >
              <Text style={[styles.filterChipText, { color: filterCategory === 'all' ? '#fff' : colors.muted }]}>Tutti</Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => {
              const hasItems = activeList.items.some(i => i.category === cat.id);
              if (!hasItems) return null;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterChip, filterCategory === cat.id && { backgroundColor: cat.color }]}
                  onPress={() => setFilterCategory(cat.id)}
                >
                  <Text style={[styles.filterChipText, { color: filterCategory === cat.id ? '#fff' : colors.muted }]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Items list */}
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="edit" size={40} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Lista vuota</Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>Premi + per aggiungere articoli</Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
              renderItem={({ item }) => {
                const cat = getCategoryInfo(item.category);
                return (
                  <TouchableOpacity
                    style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: colors.border, opacity: item.checked ? 0.6 : 1 }]}
                    onPress={() => toggleItem(item.id)}
                  >
                    <View style={[styles.checkbox, { borderColor: item.checked ? colors.primary : colors.border, backgroundColor: item.checked ? colors.primary : 'transparent' }]}>
                      {item.checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                    </View>
                    <View style={[styles.catDot, { backgroundColor: cat.color }]}>
                      <Text style={{ fontSize: 12 }}>{cat.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: colors.foreground, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.itemMeta, { color: colors.muted }]}>
                        {item.quantity} {item.unit}
                        {item.estimatedPrice > 0 ? ` · €${(item.estimatedPrice * item.quantity).toFixed(2)}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteItem(item.id)} style={{ padding: 8 }}>
                      <Text style={{ color: colors.error, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Clear checked button */}
          {checkedCount > 0 && (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: colors.error }]}
              onPress={clearChecked}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>🗑 Rimuovi spuntati ({checkedCount})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── VIEW: ADD ITEM ── */}
      {view === 'add-item' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Nuovo Articolo</Text>

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Nome articolo *</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="es. Latte intero"
              placeholderTextColor={colors.muted}
              value={itemName}
              onChangeText={setItemName}
              autoFocus
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Quantità</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
                  placeholder="1"
                  placeholderTextColor={colors.muted}
                  value={itemQty}
                  onChangeText={setItemQty}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Unità</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  <View style={styles.row}>
                    {UNITS.map(u => (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitChip, { borderColor: itemUnit === u ? colors.primary : colors.border, backgroundColor: itemUnit === u ? colors.primary : 'transparent' }]}
                        onPress={() => setItemUnit(u)}
                      >
                        <Text style={{ color: itemUnit === u ? '#fff' : colors.muted, fontSize: 12, fontWeight: '600' }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Prezzo stimato (€)</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              value={itemPrice}
              onChangeText={setItemPrice}
              keyboardType="decimal-pad"
            />

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Categoria</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, { borderColor: itemCategory === cat.id ? cat.color : colors.border, backgroundColor: itemCategory === cat.id ? cat.color + '22' : 'transparent' }]}
                  onPress={() => setItemCategory(cat.id)}
                >
                  <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                  <Text style={[styles.catChipText, { color: itemCategory === cat.id ? cat.color : colors.muted }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: itemName.trim() ? colors.primary : colors.border }]}
              onPress={addItem}
              disabled={!itemName.trim()}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Aggiungi Articolo</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  createBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14 },
  listCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  listCardLeft: { flex: 1 },
  listCardName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  listCardMeta: { fontSize: 13, marginBottom: 2 },
  listCardTotal: { fontSize: 14, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderBottomWidth: 1 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  progressBar: { height: 4, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  filterScroll: { maxHeight: 48, marginTop: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(100,100,100,0.1)' },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  catDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  clearBtn: { position: 'absolute', bottom: 16, left: 16, right: 16, padding: 14, borderRadius: 12, alignItems: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginRight: 6 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, minWidth: '45%' },
  catChipText: { fontSize: 12, fontWeight: '600' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
});
