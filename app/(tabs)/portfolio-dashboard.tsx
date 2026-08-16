import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { PortfolioAreaChart, type AreaChartPoint } from '@/components/portfolio-area-chart';
import { PortfolioDonutChart } from '@/components/portfolio-donut-chart';
import { usePortfolioDashboard, type PortfolioAsset } from '@/hooks/use-portfolio-dashboard';
import { useI18n } from '@/hooks/use-i18n';
import { useColors } from '@/hooks/use-colors';
import { useEthereumWallet } from '@/hooks/use-ethereum-wallet';

const chartWidth = Dimensions.get('window').width - 56;
const chartHeight = 190;

type TimeRange = '24h' | '7d' | '30d' | '90d';
type HoldingSort = 'value' | 'change' | 'alphabetical';

/** Number of days covered by each range, used to slice the history. */
const RANGE_DAYS: Record<TimeRange, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const TIME_RANGES = Object.keys(RANGE_DAYS) as TimeRange[];
const HOLDING_SORTS: HoldingSort[] = ['value', 'change', 'alphabetical'];

function formatUsd(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PortfolioDashboardScreen() {
  const { t } = useI18n();
  const colors = useColors();
  const router = useRouter();
  const { activeWallet } = useEthereumWallet();
  const { currentPortfolio, metrics, isLoading, error, loadPortfolioHistory, getPortfolioValueHistory } =
    usePortfolioDashboard(activeWallet?.address || null);

  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [holdingSort, setHoldingSort] = useState<HoldingSort>('value');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPortfolioHistory();
    setRefreshing(false);
  }, [loadPortfolioHistory]);

  const totalValue = useMemo(
    () => currentPortfolio.reduce((sum, asset) => sum + (Number(asset.value) || 0), 0),
    [currentPortfolio],
  );

  /**
   * The time range now actually filters the series. When the stored history is
   * too short to plot a line, the current total is used as a single point so
   * the chart still communicates the present value.
   */
  const seriesData: AreaChartPoint[] = useMemo(() => {
    const history = getPortfolioValueHistory(RANGE_DAYS[timeRange]);
    if (history.length > 0) return history;
    if (totalValue > 0) return [{ timestamp: Date.now(), value: totalValue }];
    return [];
  }, [getPortfolioValueHistory, timeRange, totalValue]);

  /** Change over the selected range, derived from the first and last snapshot. */
  const rangeChange = useMemo(() => {
    if (seriesData.length < 2) {
      return {
        absolute: Number(metrics?.totalChange24h ?? 0),
        percent: metrics?.totalChangePercent24h ?? 0,
        derivedFromRange: false,
      };
    }
    const first = seriesData[0].value;
    const last = seriesData[seriesData.length - 1].value;
    const absolute = last - first;
    return {
      absolute,
      percent: first > 0 ? (absolute / first) * 100 : 0,
      derivedFromRange: true,
    };
  }, [seriesData, metrics]);

  const compositionData = useMemo(
    () =>
      currentPortfolio.map(asset => ({
        label: asset.symbol,
        value: Number(asset.value) || 0,
      })),
    [currentPortfolio],
  );

  const sortedHoldings = useMemo(() => {
    const holdings = [...currentPortfolio];
    switch (holdingSort) {
      case 'change':
        return holdings.sort((a, b) => b.priceChange24h - a.priceChange24h);
      case 'alphabetical':
        return holdings.sort((a, b) => a.symbol.localeCompare(b.symbol));
      case 'value':
      default:
        return holdings.sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    }
  }, [currentPortfolio, holdingSort]);

  const sortLabel = useCallback(
    (key: HoldingSort) => {
      switch (key) {
        case 'change':
          return t('portfolio.change');
        case 'alphabetical':
          return t('portfolio.sortAlphabetical');
        case 'value':
        default:
          return t('portfolio.value');
      }
    },
    [t],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          padding: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        title: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 6 },
        value: { fontSize: 32, fontWeight: '700', color: colors.foreground },
        changeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
        changeBadge: {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 8,
        },
        changeText: { fontSize: 13, fontWeight: '700' },
        timeRangeContainer: {
          flexDirection: 'row',
          gap: 8,
          marginTop: 16,
          paddingHorizontal: 16,
        },
        timeRangeButton: {
          flex: 1,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        },
        timeRangeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        timeRangeButtonText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
        timeRangeButtonTextActive: { color: colors.background },
        section: { paddingHorizontal: 16, paddingVertical: 12 },
        sectionHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        },
        sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 14,
        },
        metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
        metricCard: {
          flexGrow: 1,
          flexBasis: '46%',
          backgroundColor: colors.surface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
        },
        metricLabel: { fontSize: 11, color: colors.muted },
        metricValue: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginTop: 4 },
        metricHint: { fontSize: 10, color: colors.muted, marginTop: 2 },
        sortChip: {
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 14,
          borderWidth: 1,
        },
        sortChipText: { fontSize: 11, fontWeight: '600' },
        holdingRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        errorText: { color: colors.error, fontSize: 14, textAlign: 'center', padding: 16 },
        loadingText: { color: colors.muted, fontSize: 14, textAlign: 'center', padding: 16 },
        emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
        emptyTitle: {
          fontSize: 16,
          fontWeight: '700',
          color: colors.foreground,
          marginBottom: 6,
          textAlign: 'center',
        },
        emptyBody: {
          fontSize: 13,
          color: colors.muted,
          textAlign: 'center',
          lineHeight: 19,
          marginBottom: 16,
        },
        primaryButton: {
          paddingHorizontal: 18,
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: colors.primary,
        },
      }),
    [colors],
  );

  const changeTone = rangeChange.percent >= 0 ? colors.success : colors.error;

  /** No wallet connected: guide the user instead of showing zeros. */
  if (!activeWallet?.address) {
    return (
      <ScreenContainer className="bg-background">
        <View style={styles.header}>
          <Text style={styles.title}>{t('portfolio.title')}</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('portfolio.noWalletTitle')}</Text>
          <Text style={styles.emptyBody}>{t('portfolio.noWalletBody')}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/settings')}>
            <Text style={{ color: colors.background, fontWeight: '700', fontSize: 13 }}>
              {t('wallet.connect')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const renderHolding = (holding: PortfolioAsset, index: number) => {
    const changeColor = holding.priceChange24h >= 0 ? colors.success : colors.error;
    return (
      <View
        key={`${holding.symbol}-${index}`}
        style={[styles.holdingRow, index === sortedHoldings.length - 1 ? { borderBottomWidth: 0 } : null]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>
            {holding.symbol}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
            {(Number(holding.amount) || 0).toFixed(4)} · ${holding.price.toLocaleString('en-US')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>
            {formatUsd(Number(holding.value) || 0)}
          </Text>
          <Text style={{ color: changeColor, fontSize: 12, marginTop: 2 }}>
            {holding.priceChange24h >= 0 ? '+' : ''}
            {holding.priceChange24h.toFixed(2)}% · {holding.percentage.toFixed(1)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('portfolio.title')}</Text>
          <Text style={styles.value}>{formatUsd(totalValue)}</Text>
          <View style={styles.changeRow}>
            <View style={[styles.changeBadge, { backgroundColor: `${changeTone}22` }]}>
              <Text style={[styles.changeText, { color: changeTone }]}>
                {rangeChange.percent >= 0 ? '+' : ''}
                {rangeChange.percent.toFixed(2)}%
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {rangeChange.absolute >= 0 ? '+' : ''}
              {formatUsd(rangeChange.absolute)} ·{' '}
              {rangeChange.derivedFromRange ? timeRange : '24h'}
            </Text>
          </View>
        </View>

        {/* Time range */}
        <View style={styles.timeRangeContainer}>
          {TIME_RANGES.map(range => (
            <Pressable
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text
                style={[
                  styles.timeRangeButtonText,
                  timeRange === range && styles.timeRangeButtonTextActive,
                ]}
              >
                {range}
              </Text>
            </Pressable>
          ))}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {isLoading && <Text style={styles.loadingText}>{t('common.loading')}</Text>}

        {!isLoading && !error && currentPortfolio.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t('portfolio.noAssets')}</Text>
            <Text style={styles.emptyBody}>{t('portfolio.noAssetsBody')}</Text>
          </View>
        )}

        {!isLoading && !error && currentPortfolio.length > 0 && (
          <>
            {/* Value chart */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('portfolio.priceHistory')}</Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {seriesData.length} {t('portfolio.dataPoints')}
                </Text>
              </View>
              <View style={styles.card}>
                <PortfolioAreaChart
                  data={seriesData}
                  width={chartWidth}
                  height={chartHeight}
                  emptyLabel={t('common.noData')}
                />
                {seriesData.length < 2 && (
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 8 }}>
                    {t('portfolio.historyBuilding')}
                  </Text>
                )}
              </View>
            </View>

            {/* Composition */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('portfolio.composition')}</Text>
              <View style={styles.card}>
                <PortfolioDonutChart
                  data={compositionData}
                  size={140}
                  centerValue={`${currentPortfolio.length}`}
                  centerLabel={t('portfolio.assets')}
                  emptyLabel={t('common.noData')}
                  otherLabel={t('portfolio.other')}
                />
              </View>
            </View>

            {/* Metrics computed by the hook but previously never displayed */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>
                {t('portfolio.statistics')}
              </Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('portfolio.diversification')}</Text>
                  <Text style={styles.metricValue}>
                    {(metrics?.diversificationScore ?? 0).toFixed(1)}/100
                  </Text>
                  <Text style={styles.metricHint}>{t('portfolio.diversificationHint')}</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('portfolio.assets')}</Text>
                  <Text style={styles.metricValue}>{currentPortfolio.length}</Text>
                  <Text style={styles.metricHint}>
                    {t('portfolio.largestPosition')}:{' '}
                    {sortedHoldings.length > 0
                      ? `${Math.max(...currentPortfolio.map(a => a.percentage)).toFixed(1)}%`
                      : '—'}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('trading.best')}</Text>
                  <Text style={[styles.metricValue, { color: colors.success }]}>
                    {metrics?.bestPerformer
                      ? `${metrics.bestPerformer.symbol} +${metrics.bestPerformer.priceChange24h.toFixed(2)}%`
                      : '—'}
                  </Text>
                  <Text style={styles.metricHint}>24h</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{t('trading.worst')}</Text>
                  <Text style={[styles.metricValue, { color: colors.error }]}>
                    {metrics?.worstPerformer
                      ? `${metrics.worstPerformer.symbol} ${metrics.worstPerformer.priceChange24h.toFixed(2)}%`
                      : '—'}
                  </Text>
                  <Text style={styles.metricHint}>24h</Text>
                </View>
              </View>
            </View>

            {/* Holdings */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('portfolio.holdings')}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {HOLDING_SORTS.map(key => {
                    const active = holdingSort === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        onPress={() => setHoldingSort(key)}
                        style={[
                          styles.sortChip,
                          {
                            borderColor: active ? colors.primary : colors.border,
                            backgroundColor: active ? `${colors.primary}22` : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sortChipText,
                            { color: active ? colors.primary : colors.muted },
                          ]}
                        >
                          {sortLabel(key)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.card}>{sortedHoldings.map(renderHolding)}</View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
