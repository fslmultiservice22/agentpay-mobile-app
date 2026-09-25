import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import {
  View, Text, TextInput, TouchableOpacity,
  Platform, SectionList,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ResultKind = 'transfer' | 'account' | 'favorite' | 'budget';

interface SearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  meta: string;
  badge?: string;
  badgeColor?: string;
  route: string;
  params?: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#22C55E',
  processing: '#F59E0B',
  failed: '#EF4444',
  pending: '#9CA3AF',
  active: '#22C55E',
  inactive: '#9CA3AF',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completato',
  processing: 'In elaborazione',
  failed: 'Fallito',
  pending: 'In attesa',
  active: 'Attivo',
  inactive: 'Inattivo',
};

const KIND_ICON: Record<ResultKind, string> = {
  transfer: '💸',
  account:  '🏦',
  favorite: '⭐',
  budget:   '📊',
};

const KIND_LABEL: Record<ResultKind, string> = {
  transfer: 'Trasferimenti',
  account:  'Conti Bancari',
  favorite: 'Preferiti',
  budget:   'Budget',
};

export default function GlobalSearchScreen() {
  const router = useRouter();
  const colors = useColors();
  const { transfers, accounts } = useBankAccounts();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('agentpay_favorites').then((raw) => {
        if (raw) setFavorites(JSON.parse(raw));
      });
      AsyncStorage.getItem('agentpay_category_budgets').then((raw) => {
        if (raw) setBudgets(JSON.parse(raw));
      });
    }, [])
  );

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: SearchResult[] = [];

    // Search transfers
    transfers.forEach((t) => {
      const acc = accounts.find((a) => a.id === t.accountId);
      const amountStr = `€${t.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
      const dateStr = new Date(t.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

      const haystack = [
        amountStr,
        t.reference,
        t.status,
        STATUS_LABELS[t.status] ?? '',
        acc?.accountHolder ?? '',
        acc?.maskedIBAN ?? '',
        dateStr,
      ].join(' ').toLowerCase();

      if (haystack.includes(q)) {
        out.push({
          id: t.id,
          kind: 'transfer',
          title: amountStr,
          subtitle: acc?.accountHolder ?? 'Conto sconosciuto',
          meta: dateStr,
          badge: STATUS_LABELS[t.status] ?? t.status,
          badgeColor: STATUS_COLORS[t.status] ?? '#9CA3AF',
          route: '/transfer-detail',
          params: { transferId: t.id },
        });
      }
    });

    // Search accounts
    accounts.forEach((a) => {
      const haystack = [
        a.accountHolder,
        a.maskedIBAN,
        a.country,
        a.status,
        STATUS_LABELS[a.status] ?? '',
      ].join(' ').toLowerCase();

      if (haystack.includes(q)) {
        out.push({
          id: a.id,
          kind: 'account',
          title: a.accountHolder,
          subtitle: a.maskedIBAN,
          meta: a.country,
          badge: STATUS_LABELS[a.status] ?? a.status,
          badgeColor: STATUS_COLORS[a.status] ?? '#9CA3AF',
          route: '/bank-accounts-manage',
        });
      }
    });

    // Preferiti
    const favTransfers = transfers.filter((t) => favorites.includes(t.id));
    favTransfers.forEach((t) => {
      const amountStr = `€${t.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`;
      const haystack = [
        amountStr,
        t.reference,
        STATUS_LABELS[t.status] ?? '',
      ].join(' ').toLowerCase();
      if (haystack.includes(q)) {
        out.push({
          id: `fav-${t.id}`,
          kind: 'favorite' as ResultKind,
          title: t.reference || amountStr,
          subtitle: amountStr,
          meta: new Date(t.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
          badge: STATUS_LABELS[t.status] ?? t.status,
          badgeColor: STATUS_COLORS[t.status] ?? '#9CA3AF',
          route: '/transfer-detail',
          params: { transferId: t.id },
        });
      }
    });

    // Budget categorie
    Object.entries(budgets).forEach(([cat, amount]) => {
      if (cat.toLowerCase().includes(q)) {
        out.push({
          id: `budget-${cat}`,
          kind: 'budget' as ResultKind,
          title: cat,
          subtitle: 'Budget mensile',
          meta: `€${amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
          route: '/category-budget',
        });
      }
    });

    return out;
  }, [query, transfers, accounts, favorites, budgets]);

  // Group results by kind
  const sections = useMemo(() => {
    const trList = results.filter((r) => r.kind === 'transfer');
    const acList = results.filter((r) => r.kind === 'account');
    const favList = results.filter((r) => r.kind === 'favorite');
    const budList = results.filter((r) => r.kind === 'budget');
    const out: { title: string; data: SearchResult[] }[] = [];
    if (trList.length > 0) out.push({ title: `${KIND_ICON.transfer} ${KIND_LABEL.transfer} (${trList.length})`, data: trList });
    if (acList.length > 0) out.push({ title: `${KIND_ICON.account} ${KIND_LABEL.account} (${acList.length})`, data: acList });
    if (favList.length > 0) out.push({ title: `${KIND_ICON.favorite} ${KIND_LABEL.favorite} (${favList.length})`, data: favList });
    if (budList.length > 0) out.push({ title: `${KIND_ICON.budget} ${KIND_LABEL.budget} (${budList.length})`, data: budList });
    return out;
  }, [results]);

  const handleNavigate = (item: SearchResult) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Save recent search
    if (query.trim()) {
      setRecentSearches((prev) => {
        const next = [query.trim(), ...prev.filter((s) => s !== query.trim())].slice(0, 5);
        return next;
      });
    }
    if (item.params) {
      router.push({ pathname: item.route as any, params: item.params });
    } else {
      router.push(item.route as any);
    }
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const renderItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      onPress={() => handleNavigate(item)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 14,
      }}
    >
      {/* Icon */}
      <View style={{
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: colors.primary + '15',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 20 }}>{KIND_ICON[item.kind]}</Text>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }} numberOfLines={1}>
            {item.title}
          </Text>
          {item.badge && (
            <View style={{
              backgroundColor: (item.badgeColor ?? '#9CA3AF') + '20',
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: item.badgeColor ?? '#9CA3AF' }}>
                {item.badge}
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>{item.subtitle}</Text>
        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 1 }}>{item.meta}</Text>
      </View>

      <Text style={{ fontSize: 18, color: colors.muted }}>›</Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={{
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 }}>
        {section.title}
      </Text>
    </View>
  );

  return (
    <ScreenContainer containerClassName="flex-1">
      {/* Search bar header */}
      <View style={{
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' }}>✕</Text>
        </TouchableOpacity>

        <View style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 12,
          paddingHorizontal: 12,
          gap: 8,
        }}>
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>🔍</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Cerca trasferimenti, conti..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={{
              flex: 1,
              paddingVertical: 10,
              fontSize: 15,
              color: '#fff',
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Empty state / recent searches */}
      {query.trim() === '' ? (
        <View style={{ flex: 1, padding: 24 }}>
          {recentSearches.length > 0 ? (
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 }}>
                  RICERCHE RECENTI
                </Text>
                <TouchableOpacity onPress={() => setRecentSearches([])}>
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Cancella</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setQuery(s)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    gap: 12,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.muted }}>🕐</Text>
                  <Text style={{ fontSize: 15, color: colors.foreground, flex: 1 }}>{s}</Text>
                  <Text style={{ fontSize: 16, color: colors.muted }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <MaterialIcons name="search" size={48} style={{ marginBottom: 16 }} color={colors.muted} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>
                Cerca nell&apos;app
              </Text>
              <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
                Cerca per importo, riferimento, nome del conto, IBAN o stato del trasferimento.
              </Text>
              <View style={{ marginTop: 24, gap: 8, width: '100%' }}>
                {['€100', 'completato', 'Mario', 'IBAN'].map((hint) => (
                  <TouchableOpacity
                    key={hint}
                    onPress={() => setQuery(hint)}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 10,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: colors.muted }}>🔎</Text>
                    <Text style={{ fontSize: 14, color: colors.foreground }}>{hint}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      ) : results.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <MaterialIcons name="sentiment-dissatisfied" size={48} style={{ marginBottom: 16 }} color={colors.muted} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground, marginBottom: 8 }}>
            Nessun risultato
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
            Nessun trasferimento o conto trovato per &quot;{query}&quot;
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 13, color: colors.muted }}>
                {results.length} {results.length === 1 ? 'risultato' : 'risultati'} per &quot;{query}&quot;
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}
