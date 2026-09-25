import React, { useState, useMemo, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect , useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

// ─── Types ────────────────────────────────────────────────────────────────────
type AssetType = 'crypto' | 'stock' | 'etf' | 'other';

interface Investment {
  id: string;
  name: string;
  ticker: string;
  type: AssetType;
  quantity: number;
  avgBuyPrice: number;   // prezzo medio di carico (€)
  currentPrice: number;  // prezzo corrente (€)
  currency: string;
  notes: string;
  history: { date: string; price: number }[]; // storico prezzi
  createdAt: number;
}

const STORAGE_KEY = 'agentpay_investments';

const TYPE_LABELS: Record<AssetType, string> = {
  crypto: '₿ Crypto',
  stock: '📈 Azione',
  etf: '🏦 ETF',
  other: '📦 Altro',
};

const TYPE_COLORS: Record<AssetType, string> = {
  crypto: '#F7931A',
  stock: '#22C55E',
  etf: '#3B82F6',
  other: '#8B5CF6',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcPnL(inv: Investment) {
  const cost = inv.quantity * inv.avgBuyPrice;
  const value = inv.quantity * inv.currentPrice;
  const pnl = value - cost;
  const pct = cost > 0 ? (pnl / cost) * 100 : 0;
  return { cost, value, pnl, pct };
}

// ─── InvestmentCard ───────────────────────────────────────────────────────────
function InvestmentCard({
  inv,
  colors,
  onEdit,
  onDelete,
}: {
  inv: Investment;
  colors: ReturnType<typeof useColors>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { value, pnl, pct } = calcPnL(inv);
  const isProfit = pnl >= 0;
  const pnlColor = isProfit ? colors.success : colors.error;
  const typeColor = TYPE_COLORS[inv.type];

  return (
    <TouchableOpacity
      onPress={onEdit}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            backgroundColor: typeColor + '20',
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: typeColor }}>{TYPE_LABELS[inv.type]}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.foreground }}>{inv.ticker.toUpperCase()}</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>{inv.name}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          style={{ padding: 6 }}
        >
          <MaterialIcons name="delete" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Valori */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>VALORE ATTUALE</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground, marginTop: 2 }}>€{value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>P&L</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: pnlColor, marginTop: 2 }}>{isProfit ? '+' : ''}€{pnl.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
        </View>
      </View>

      {/* Dettagli */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 11, color: colors.muted }}>Quantità</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>{inv.quantity.toLocaleString('it-IT', { maximumFractionDigits: 8 })}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>Prezzo medio</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>€{inv.avgBuyPrice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>Prezzo attuale</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>€{inv.currentPrice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 11, color: colors.muted }}>Variazione</Text>
          <View style={{
            backgroundColor: pnlColor + '20',
            borderRadius: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            marginTop: 2,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: pnlColor }}>
              {isProfit ? '+' : ''}{pct.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Mini sparkline storico */}
      {inv.history.length >= 2 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 10, color: colors.muted, marginBottom: 4 }}>Storico prezzi</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 40 }}>
            {inv.history.slice(-12).map((h, i) => {
              const prices = inv.history.slice(-12).map((x) => x.price);
              const minP = Math.min(...prices);
              const maxP = Math.max(...prices);
              const range = maxP - minP || 1;
              const barH = Math.max(((h.price - minP) / range) * 36, 3);
              const isLast = i === inv.history.slice(-12).length - 1;
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: barH,
                    backgroundColor: isLast ? pnlColor : pnlColor + '50',
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── AddEditModal ─────────────────────────────────────────────────────────────
function AddEditModal({
  visible,
  initial,
  colors,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: Partial<Investment> | null;
  colors: ReturnType<typeof useColors>;
  onSave: (inv: Investment) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [type, setType] = useState<AssetType>(initial?.type ?? 'crypto');
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? '');
  const [avgBuyPrice, setAvgBuyPrice] = useState(initial?.avgBuyPrice?.toString() ?? '');
  const [currentPrice, setCurrentPrice] = useState(initial?.currentPrice?.toString() ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setTicker(initial?.ticker ?? '');
      setType(initial?.type ?? 'crypto');
      setQuantity(initial?.quantity?.toString() ?? '');
      setAvgBuyPrice(initial?.avgBuyPrice?.toString() ?? '');
      setCurrentPrice(initial?.currentPrice?.toString() ?? '');
      setNotes(initial?.notes ?? '');
    }
  }, [visible, initial]);

  const handleSave = () => {
    if (!name.trim() || !ticker.trim()) {
      Alert.alert('Errore', 'Nome e ticker sono obbligatori');
      return;
    }
    const qty = parseFloat(quantity.replace(',', '.'));
    const buy = parseFloat(avgBuyPrice.replace(',', '.'));
    const cur = parseFloat(currentPrice.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) { Alert.alert('Errore', 'Quantità non valida'); return; }
    if (isNaN(buy) || buy <= 0) { Alert.alert('Errore', 'Prezzo medio di carico non valido'); return; }
    if (isNaN(cur) || cur <= 0) { Alert.alert('Errore', 'Prezzo attuale non valido'); return; }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const existing = initial?.history ?? [];
    const newHistory = [...existing, { date: dateStr, price: cur }];

    const inv: Investment = {
      id: initial?.id ?? Date.now().toString(),
      name: name.trim(),
      ticker: ticker.trim().toUpperCase(),
      type,
      quantity: qty,
      avgBuyPrice: buy,
      currentPrice: cur,
      currency: 'EUR',
      notes: notes.trim(),
      history: newHistory,
      createdAt: initial?.createdAt ?? Date.now(),
    };
    onSave(inv);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: colors.background, padding: 24 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.foreground }}>{initial?.id ? 'Modifica Investimento' : 'Nuovo Investimento'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 16, color: colors.primary, fontWeight: '600' }}>Annulla</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Tipo */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8 }}>TIPO</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(Object.keys(TYPE_LABELS) as AssetType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: type === t ? TYPE_COLORS[t] + '20' : colors.surface,
                    borderWidth: 1.5,
                    borderColor: type === t ? TYPE_COLORS[t] : colors.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: type === t ? TYPE_COLORS[t] : colors.muted }}>
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nome */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>NOME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="es. Bitcoin, Apple Inc."
              placeholderTextColor={colors.muted}
              style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.foreground, marginBottom: 14 }}
            />

            {/* Ticker */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>TICKER / SIMBOLO</Text>
            <TextInput
              value={ticker}
              onChangeText={setTicker}
              placeholder="es. BTC, AAPL, SPY"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.foreground, marginBottom: 14 }}
            />

            {/* Quantità */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>QUANTITÀ</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="es. 0.5"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.foreground, marginBottom: 14 }}
            />

            {/* Prezzo medio carico */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>PREZZO MEDIO DI CARICO (€)</Text>
            <TextInput
              value={avgBuyPrice}
              onChangeText={setAvgBuyPrice}
              placeholder="es. 45000"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.foreground, marginBottom: 14 }}
            />

            {/* Prezzo attuale */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>PREZZO ATTUALE (€)</Text>
            <TextInput
              value={currentPrice}
              onChangeText={setCurrentPrice}
              placeholder="es. 67000"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.foreground, marginBottom: 14 }}
            />

            {/* Note */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 }}>NOTE (opzionale)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="es. Acquistato su Coinbase"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={2}
              style={{ backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.foreground, marginBottom: 24 }}
            />

            {/* Salva */}
            <TouchableOpacity
              onPress={handleSave}
              style={{ backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>
                {initial?.id ? 'Aggiorna' : 'Aggiungi'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function InvestmentTrackerScreen() {
  const router = useRouter();
  const colors = useColors();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Investment | null>(null);
  const [filter, setFilter] = useState<AssetType | 'all'>('all');

  // Load
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
        if (raw) setInvestments(JSON.parse(raw));
      }).catch(() => {});
    }, [])
  );

  const save = async (list: Investment[]) => {
    setInvestments(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  };

  const handleAdd = () => {
    setEditTarget(null);
    setModalVisible(true);
  };

  const handleEdit = (inv: Investment) => {
    setEditTarget(inv);
    setModalVisible(true);
  };

  const handleSave = async (inv: Investment) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const existing = investments.find((i) => i.id === inv.id);
    const updated = existing
      ? investments.map((i) => (i.id === inv.id ? inv : i))
      : [...investments, inv];
    await save(updated);
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Elimina', 'Vuoi eliminare questo investimento?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina', style: 'destructive', onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await save(investments.filter((i) => i.id !== id));
        }
      },
    ]);
  };

  // Totali
  const totals = useMemo(() => {
    const list = investments;
    const totalValue = list.reduce((s, i) => s + i.quantity * i.currentPrice, 0);
    const totalCost = list.reduce((s, i) => s + i.quantity * i.avgBuyPrice, 0);
    const totalPnL = totalValue - totalCost;
    const totalPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalPnL, totalPct };
  }, [investments]);

  const filtered = useMemo(() => {
    if (filter === 'all') return investments;
    return investments.filter((i) => i.type === filter);
  }, [investments, filter]);

  const isProfitTotal = totals.totalPnL >= 0;
  const pnlColor = isProfitTotal ? colors.success : colors.error;

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
            <Text style={{ fontSize: 24, color: colors.primary }}>‹</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground, flex: 1 }}>Investment Tracker</Text>
          <TouchableOpacity
            onPress={handleAdd}
            style={{ backgroundColor: colors.primary, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 22, color: '#fff', lineHeight: 28 }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Riepilogo totale */}
        {investments.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <View style={{
              backgroundColor: colors.primary + '12',
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: colors.primary + '30',
              padding: 20,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Portafoglio Totale</Text>
              <Text style={{ fontSize: 32, fontWeight: '900', color: colors.foreground, marginTop: 4 }}>€{totals.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                <View>
                  <Text style={{ fontSize: 11, color: colors.muted }}>Investito</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
                    €{totals.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.muted }}>P&L Totale</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: pnlColor }}>
                    {isProfitTotal ? '+' : ''}€{totals.totalPnL.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: pnlColor + '20',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  alignSelf: 'flex-end',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: pnlColor }}>
                    {isProfitTotal ? '+' : ''}{totals.totalPct.toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Filtri tipo */}
        {investments.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['all', 'crypto', 'stock', 'etf', 'other'] as const).map((f) => {
                const isActive = filter === f;
                const label = f === 'all' ? '🌐 Tutti' : TYPE_LABELS[f];
                const col = f === 'all' ? colors.primary : TYPE_COLORS[f];
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 20,
                      backgroundColor: isActive ? col + '20' : colors.surface,
                      borderWidth: 1.5,
                      borderColor: isActive ? col : colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isActive ? col : colors.muted }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Lista investimenti */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <MaterialIcons name="insert-chart" size={48} style={{ marginBottom: 16 }} color={colors.muted} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>
                {investments.length === 0 ? 'Nessun investimento' : 'Nessun risultato'}
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 24 }}>
                {investments.length === 0
                  ? 'Aggiungi il tuo primo investimento per tracciare P&L e storico prezzi'
                  : 'Prova un filtro diverso'}
              </Text>
              {investments.length === 0 && (
                <TouchableOpacity
                  onPress={handleAdd}
                  style={{ backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>+ Aggiungi Investimento</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filtered.map((inv) => (
              <InvestmentCard
                key={inv.id}
                inv={inv}
                colors={colors}
                onEdit={() => handleEdit(inv)}
                onDelete={() => handleDelete(inv.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AddEditModal
        visible={modalVisible}
        initial={editTarget}
        colors={colors}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </ScreenContainer>
  );
}
