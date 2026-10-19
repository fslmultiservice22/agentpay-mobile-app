import { useCallback, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";

import type { ThemeColorPalette } from "@/constants/theme";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const PLANNER_HISTORY_KEY = "agentpay_planner_history";

interface PlanRecord {
  month: string;
  savedAt: string;
  income: number;
  recurring: number;
  savings: number;
  savingsRate: number;
  available: number;
}

interface BarChartProps {
  data: number[];
  history: PlanRecord[];
  maxValue: number;
  color: string;
  label: string;
}

function formatMonth(monthYear: string) {
  const [year, month] = monthYear.split("-");
  const months = [
    "Gen",
    "Feb",
    "Mar",
    "Apr",
    "Mag",
    "Giu",
    "Lug",
    "Ago",
    "Set",
    "Ott",
    "Nov",
    "Dic",
  ];
  return `${months[Number.parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

function formatAmount(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
}

function BarChart({ data, history, maxValue, color, label }: BarChartProps) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold text-foreground">{label}</Text>
      <View className="flex-row items-end gap-1" style={{ height: 100 }}>
        {data.map((value, index) => {
          const height = Math.max((value / maxValue) * 90, 4);
          return (
            <View
              key={`${history[index]?.month ?? "month"}-${index}`}
              className="flex-1 items-center justify-end"
              style={{ height: 100 }}
            >
              <Text className="text-[9px] text-muted mb-1">
                €{formatAmount(value)}
              </Text>
              <View
                style={{
                  width: "70%",
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
        {history.map((record, index) => (
          <View
            key={`${record.month}-${index}`}
            className="flex-1 items-center"
          >
            <Text className="text-[9px] text-muted">
              {formatMonth(record.month)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface SavingsRateChartProps {
  history: PlanRecord[];
  colors: ThemeColorPalette;
}

function SavingsRateChart({ history, colors }: SavingsRateChartProps) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold text-foreground">
        Tasso di Risparmio (%)
      </Text>
      <View className="flex-row items-end gap-1" style={{ height: 80 }}>
        {history.map((record, index) => {
          const height = Math.max((record.savingsRate / 100) * 70, 4);
          const barColor =
            record.savingsRate >= 20
              ? colors.success
              : record.savingsRate >= 10
                ? colors.warning
                : colors.error;
          return (
            <View
              key={`${record.month}-${index}`}
              className="flex-1 items-center justify-end"
              style={{ height: 80 }}
            >
              <Text className="text-[9px] text-muted mb-1">
                {record.savingsRate.toFixed(0)}%
              </Text>
              <View
                style={{
                  width: "70%",
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
        {history.map((record, index) => (
          <View
            key={`${record.month}-${index}`}
            className="flex-1 items-center"
          >
            <Text className="text-[9px] text-muted">
              {formatMonth(record.month)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function MonthlyComparisonScreen() {
  const router = useRouter();
  const colors = useColors();
  const [history, setHistory] = useState<PlanRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;

      AsyncStorage.getItem(PLANNER_HISTORY_KEY)
        .then((stored) => {
          if (!isCurrent) return;
          if (!stored) {
            setHistory([]);
            return;
          }

          const parsed = JSON.parse(stored) as PlanRecord[];
          const sorted = parsed
            .sort((first, second) => second.month.localeCompare(first.month))
            .slice(0, 6)
            .reverse();
          setHistory(sorted);
        })
        .catch(() => {
          if (isCurrent) setHistory([]);
        });

      return () => {
        isCurrent = false;
      };
    }, []),
  );

  const maxIncome = useMemo(
    () => Math.max(...history.map((record) => record.income), 1),
    [history],
  );
  const maxRecurring = useMemo(
    () => Math.max(...history.map((record) => record.recurring), 1),
    [history],
  );
  const maxSavings = useMemo(
    () => Math.max(...history.map((record) => record.savings), 1),
    [history],
  );

  const trend = useMemo(() => {
    if (history.length < 2) return null;

    const last = history[history.length - 1];
    const previous = history[history.length - 2];
    const incomeChange =
      previous.income === 0
        ? 0
        : ((last.income - previous.income) / previous.income) * 100;
    const savingsChange = last.savingsRate - previous.savingsRate;
    return { incomeChange, savingsChange };
  }, [history]);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 p-6 gap-5">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={{ padding: 8 }}
            >
              <Text className="text-2xl text-foreground">←</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">
                Confronto Mensile
              </Text>
              <Text className="text-xs text-muted">
                Ultimi {history.length} mesi dal Pianificatore
              </Text>
            </View>
          </View>

          {history.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-4 py-20">
              <Text style={{ fontSize: 48 }}>📊</Text>
              <Text className="text-lg font-semibold text-foreground text-center">
                Nessun dato disponibile
              </Text>
              <Text className="text-sm text-muted text-center px-8">
                Genera almeno 2 piani mensili dal Pianificatore Finanziario per
                visualizzare il confronto.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/financial-planner")}
                className="bg-primary rounded-xl px-6 py-3 mt-2"
              >
                <Text className="text-background font-semibold">
                  Vai al Pianificatore
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {trend ? (
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                    <Text className="text-xs text-muted">
                      Variazione Entrate
                    </Text>
                    <Text
                      className="text-lg font-bold"
                      style={{
                        color:
                          trend.incomeChange >= 0
                            ? colors.success
                            : colors.error,
                      }}
                    >
                      {trend.incomeChange >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(trend.incomeChange).toFixed(1)}%
                    </Text>
                  </View>
                  <View className="flex-1 bg-surface rounded-xl p-4 border border-border">
                    <Text className="text-xs text-muted">
                      Variazione Risparmio
                    </Text>
                    <Text
                      className="text-lg font-bold"
                      style={{
                        color:
                          trend.savingsChange >= 0
                            ? colors.success
                            : colors.error,
                      }}
                    >
                      {trend.savingsChange >= 0 ? "↑" : "↓"}{" "}
                      {Math.abs(trend.savingsChange).toFixed(1)}pp
                    </Text>
                  </View>
                </View>
              ) : null}

              <View className="bg-surface rounded-xl p-4 border border-border">
                <BarChart
                  data={history.map((record) => record.income)}
                  history={history}
                  maxValue={maxIncome}
                  color={colors.primary}
                  label="Entrate Mensili (€)"
                />
              </View>

              <View className="bg-surface rounded-xl p-4 border border-border">
                <BarChart
                  data={history.map((record) => record.recurring)}
                  history={history}
                  maxValue={maxRecurring}
                  color={colors.warning}
                  label="Spese Ricorrenti (€)"
                />
              </View>

              <View className="bg-surface rounded-xl p-4 border border-border">
                <BarChart
                  data={history.map((record) => record.savings)}
                  history={history}
                  maxValue={maxSavings}
                  color={colors.success}
                  label="Risparmio Mensile (€)"
                />
              </View>

              <View className="bg-surface rounded-xl p-4 border border-border">
                <SavingsRateChart history={history} colors={colors} />
              </View>

              <View className="bg-surface rounded-xl border border-border overflow-hidden">
                <View className="flex-row bg-primary/10 p-3">
                  <Text className="flex-1 text-xs font-bold text-foreground">
                    Mese
                  </Text>
                  <Text className="w-16 text-xs font-bold text-foreground text-right">
                    Entrate
                  </Text>
                  <Text className="w-16 text-xs font-bold text-foreground text-right">
                    Spese
                  </Text>
                  <Text className="w-14 text-xs font-bold text-foreground text-right">
                    Risp.%
                  </Text>
                </View>
                {history.map((record, index) => (
                  <View
                    key={`${record.month}-${index}`}
                    className="flex-row p-3"
                    style={{
                      borderTopWidth: index > 0 ? 0.5 : 0,
                      borderTopColor: colors.border,
                    }}
                  >
                    <Text className="flex-1 text-xs text-foreground">
                      {formatMonth(record.month)}
                    </Text>
                    <Text className="w-16 text-xs text-foreground text-right">
                      €{formatAmount(record.income)}
                    </Text>
                    <Text className="w-16 text-xs text-foreground text-right">
                      €{formatAmount(record.recurring)}
                    </Text>
                    <Text
                      className="w-14 text-xs font-semibold text-right"
                      style={{
                        color:
                          record.savingsRate >= 20
                            ? colors.success
                            : record.savingsRate >= 10
                              ? colors.warning
                              : colors.error,
                      }}
                    >
                      {record.savingsRate.toFixed(0)}%
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
