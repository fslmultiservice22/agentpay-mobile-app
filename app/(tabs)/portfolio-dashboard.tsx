import { useState, useCallback, useMemo } from 'react';
import { ScrollView, Text, View, Pressable, RefreshControl, StyleSheet, Dimensions } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { usePortfolioDashboard } from '@/hooks/use-portfolio-dashboard';
import { useI18n } from '@/hooks/use-i18n';
import { useColors } from '@/hooks/use-colors';
import { useEthereumWallet } from '@/hooks/use-ethereum-wallet';

// Mock chart components for testing
const LineChart = ({ data, width, height, chartConfig, style }: any) => (
  <View style={[{ width, height, backgroundColor: '#f0f0f0', borderRadius: 8 }, style]} />
);
const PieChart = ({ data, width, height, chartConfig, style }: any) => (
  <View style={[{ width, height, backgroundColor: '#f0f0f0', borderRadius: 8 }, style]} />
);

const chartWidth = Dimensions.get('window').width - 32;
const chartHeight = 220;

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    strokeWidth?: number;
    color?: (opacity: number) => string;
  }>;
}

export default function PortfolioDashboardScreen() {
  const { t } = useI18n();
  const colors = useColors();
  const { wallet } = useEthereumWallet();
  const { portfolio, loading, error, refreshPortfolio } = usePortfolioDashboard();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPortfolio();
    setRefreshing(false);
  }, [refreshPortfolio]);

  const chartData: ChartData = useMemo(() => {
    if (!portfolio.priceHistory || portfolio.priceHistory.length === 0) {
      return { labels: [], datasets: [{ data: [0] }] };
    }

    return {
      labels: portfolio.priceHistory.slice(-10).map((_, i) => `${i}`),
      datasets: [
        {
          data: portfolio.priceHistory.slice(-10).map(p => p.price),
          strokeWidth: 2,
          color: () => colors.primary,
        },
      ],
    };
  }, [portfolio.priceHistory, colors.primary]);

  const pieData = useMemo(() => {
    if (!portfolio.composition || portfolio.composition.length === 0) {
      return { labels: [], datasets: [{ data: [100] }] };
    }

    return {
      labels: portfolio.composition.map(c => c.symbol),
      datasets: [
        {
          data: portfolio.composition.map(c => c.percentage),
        },
      ],
    };
  }, [portfolio.composition]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.foreground,
      marginBottom: 8,
    },
    value: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.primary,
    },
    timeRangeContainer: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
      paddingHorizontal: 16,
    },
    timeRangeButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeRangeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timeRangeButtonText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '600',
    },
    timeRangeButtonTextActive: {
      color: colors.background,
    },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    chartContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      textAlign: 'center',
      padding: 16,
    },
    loadingText: {
      color: colors.muted,
      fontSize: 14,
      textAlign: 'center',
      padding: 16,
    },
  });

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('portfolio.title')}</Text>
          <Text style={styles.value}>${portfolio.totalValue.toFixed(2)}</Text>
          <Text style={[styles.value, { fontSize: 16, color: portfolio.change24h >= 0 ? colors.success : colors.error }]}>
            {portfolio.change24h >= 0 ? '+' : ''}{portfolio.change24h.toFixed(2)}%
          </Text>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {(['24h', '7d', '30d'] as const).map(range => (
            <Pressable
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[styles.timeRangeButtonText, timeRange === range && styles.timeRangeButtonTextActive]}>
                {range}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Error State */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Loading State */}
        {loading && <Text style={styles.loadingText}>{t('common.loading')}</Text>}

        {/* Charts */}
        {!loading && !error && (
          <>
            {/* Price Chart */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('portfolio.priceHistory')}</Text>
              <View style={styles.chartContainer}>
                <LineChart
                  data={chartData}
                  width={chartWidth}
                  height={chartHeight}
                  chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    color: () => colors.primary,
                    strokeWidth: 2,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
                  }}
                  style={styles.chartContainer}
                />
              </View>
            </View>

            {/* Portfolio Composition */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('portfolio.composition')}</Text>
              <View style={styles.chartContainer}>
                <PieChart
                  data={pieData}
                  width={chartWidth}
                  height={chartHeight}
                  chartConfig={{
                    backgroundColor: colors.surface,
                    backgroundGradientFrom: colors.surface,
                    backgroundGradientTo: colors.surface,
                    color: () => colors.primary,
                  }}
                  style={styles.chartContainer}
                />
              </View>
            </View>

            {/* Holdings List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('portfolio.holdings')}</Text>
              {portfolio.composition.map((holding, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View>
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>{holding.symbol}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{holding.amount.toFixed(4)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>${holding.value.toFixed(2)}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{holding.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
