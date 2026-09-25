import { useState, useEffect, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLANNER_HISTORY_KEY = 'agentpay_planner_history';

interface PlanRecord {
  month: string; // "2026-06"
  savedAt: string;
  income: number;
  recurring: number;
  savings: number;
  savingsRate: number;
  available: number;
}

export default function MonthlyComparisonScreen() {
  const router = useRouter();
  const colors = useColors();
  const [history, setHistory] = useState<PlanRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(PLANNER_HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PlanRecord[];
        // Sort by month descending, take last 6
        const sorted = parsed.sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6).reverse();
        setHistory(sorted);
      }
    } catch {}
  };

  const maxIncome = useMemo(() => Math.max(...history.map(h => h.income), 1), [history]);
  const maxRecurring = useMemo(() => Math.max(...history.map(h => h.recurring), 1), [history]);
  const maxSavings = useMemo(() => Math.max(...history.map(h => h.savings), 1), [history]);

  const formatMonth = (m: string) => {
    const [year, month] = m.split('-');
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
  };

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);

  // Trend calculation
  const trend = useMemo(() => {
    if (history.length < 2) return null;
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const incomeChange = ((last.income - prev.income) / prev.income) * 100;
    const savingsChange = last.savingsRate - prev.savingsRate;
    return { incomeChange, savingsChange };
  }, [history]);

  const BarChart = ({ data, maxVal, color, label }: { data: number[]; maxVal: number; color: string; label: string }) => (
    <View className="gap-2">
      <Text className="text-xs font-semibold text-foreground">{label}</Text>
      <View className="flex-row items-end gap-1" style={{ height: 100 }}>
        {data.map((val, i) => {
          const height = Math.max((val / maxVal) * 90, 4);
          return (
            <View key={i} className="flex-1 items-center justify-end" style={{ height: 100 }}>
              <Text className="text-[9px] text-muted mb-1">€{fmt(val)}</Text>
              <View
                style={{
                  width: '70%',
                  height,
                  backgroundColor: color,
                  borderRadius: 4,
                }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row gap-1">
        {history.map((h, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-[9px] text-muted">{formatMonth(h.month)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const SavingsRateChart = () => (
    <View className="gap-2">
      <Text className="text-xs font-semibold text-foreground">Tasso di Risparmio (%)</Text>
      <View className="flex-row items-end gap-1" style={{ height: 80 }}>
        {history.map((h, i) => {
          const height = Math.max((h.savingsRate / 100) * 70, 4);
          const barColor = h.savingsRate >= 20 ? colors.success : h.savingsRate >= 10 ? colors.warning : colors.error;
          return (
            <View key={i} className="flex-1 items-center justify-end" style={{ height: 80 }}>
              <Text className="text-[9px] text-muted mb-1">{h.savingsRate.toFixed(0)}%</Text>
              <View
                style={{
                  width: '70%',
                  height,
                  backgroundColor: barColor,
                  borderRadius: 4,
                }}
              />
            </View>
          );
        })}
      </View>
      <View className="flex-row gap-1">
        {history.map((h, i) => (
          <View key={i} className="flex-1 items-center">
            <Text className="text-[9px] text-muted">{formatMonth(h.month)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 gap-5">
          {/* Header */}
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
              style={{ padding: 8 }}
            >
              <Text className="text-2xl text-foreground">←</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">Confronto Mensile</Text>
              <Text className="text-xs text-muted">Ultimi {history.length} mesi dal Pianificatore</Text>
            </View>
          </View>

          {history.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-4 py-20">
              <Text style={{ fontSize: 48 }}>📊</Text>
              <Text className="text-lg font-semibold text-foreground text-center">
                Nessun dato disponibile
              </Text>
              <Text className="text-sm text-muted text-center px-8">
                Genera almeno 2 piani mensili dal Pianificatore Finanziario per visualizzare il confronto.
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/financial-planner')}
                className="bg-primary rounded-xl px-6 py-3 mt-2"
              >
                <Text className="text-background font-semibold">Vai al Pianificatore</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Trend KPI */}
              {trend && (
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                    <Text className="text-xs text-muted">Variazione Entrate</Text>
                    <Text
                      className="text-lg font-bold"
                      style={{ color: trend.incomeChange >= 0 ? colors.success : colors.error }}
                    >
                      {trend.incomeChange >= 0 ? '↑' : '↓'} {Math.abs(trend.incomeChange).toFixed(1)}%
                    </Text>
                  </View>
                  <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                    <Text className="text-xs text-muted">Variazione Risparmio</Text>
                    <Text
                      className="text-lg font-bold"
                      style={{ color: trend.savingsChange >= 0 ? colors.success : colors.error }}
                    >
                      {trend.savingsChange >= 0 ? '↑' : '↓'} {Math.abs(trend.savingsChange).toFixed(1)}pp
                    </Text>
                  </View>
                </View>
              )}

              {/* Income Chart */}
              <View className="bg-surface rounded-xl p-4 border border-border">
                <BarChart
                  data={history.map(h => h.income)}
                  maxVal={maxIncome}
                  color={colors.primary}
                  label="Entrate Mensili (€)"
                />
              </View>

              {/* Recurring Chart */}
              <View className="bg-surface rounded-xl p-4 border border-border">
                <BarChart
                  data={history.map(h => h.recurring)}
                  maxVal={maxRecurring}
                  color={colors.warning}
                  label="Spese Ricorrenti (€)"
                />
              </View>

              {/* Savings Chart */}
              <View className="bg-surface rounded-xl p-4 border border-border">
                <BarChart
                  data={history.map(h => h.savings)}
                  maxVal={maxSavings}
                  color={colors.success}
                  label="Risparmio Mensile (€)"
                />
              </View>

              {/* Savings Rate Chart */}
              <View className="bg-surface rounded-xl p-4 border border-border">
                <SavingsRateChart />
              </View>

              {/* Summary Table */}
              <View className="bg-surface rounded-xl border border-border overflow-hidden">
                <View className="flex-row bg-primary/10 p-3">
                  <Text className="flex-1 text-xs font-bold text-foreground">Mese</Text>
                  <Text className="w-16 text-xs font-bold text-foreground text-right">Entrate</Text>
                  <Text className="w-16 text-xs font-bold text-foreground text-right">Spese</Text>
                  <Text className="w-14 text-xs font-bold text-foreground text-right">Risp.%</Text>
                </View>
                {history.map((h, i) => (
                  <View
                    key={i}
                    className="flex-row p-3"
                    style={{ borderTopWidth: i > 0 ? 0.5 : 0, borderTopColor: colors.border }}
                  >
                    <Text className="flex-1 text-xs text-foreground">{formatMonth(h.month)}</Text>
                    <Text className="w-16 text-xs text-foreground text-right">€{fmt(h.income)}</Text>
                    <Text className="w-16 text-xs text-foreground text-right">€{fmt(h.recurring)}</Text>
                    <Text
                      className="w-14 text-xs font-semibold text-right"
                      style={{ color: h.savingsRate >= 20 ? colors.success : h.savingsRate >= 10 ? colors.warning : colors.error }}
                    >
                      {h.savingsRate.toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
