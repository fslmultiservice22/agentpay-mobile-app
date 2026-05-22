import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { usePortfolioAggregator } from '@/hooks/use-portfolio-aggregator';
import { useI18n } from '@/hooks/use-i18n';
import Animated, { FadeIn } from 'react-native-reanimated';
import { PieChart } from '@/components/pie-chart';
import { BarChart } from '@/components/bar-chart';

export default function PortfolioMultiScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { assets, allocations, metrics, isLoading, calculateDiversification } = usePortfolioAggregator();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: '700', color: colors.foreground },
    section: { marginVertical: 16, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 14, color: colors.muted, marginBottom: 12, fontWeight: '600' },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    totalValue: { fontSize: 32, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
    change: { fontSize: 14, fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    label: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    value: { fontSize: 12, color: colors.muted },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statLabel: { fontSize: 12, color: colors.muted },
    statValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  });

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const diversification = calculateDiversification();

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
        </View>

        {/* Total Value Card */}
        {metrics && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Total Value</Text>
              <Text style={styles.totalValue}>${metrics.totalValue}</Text>
              <Text style={[styles.change, { color: parseFloat(metrics.totalChange24h) >= 0 ? colors.success : colors.error }]}>
                {parseFloat(metrics.totalChange24h) >= 0 ? '↑' : '↓'} ${Math.abs(parseFloat(metrics.totalChange24h)).toFixed(2)} ({metrics.totalChange24hPercent.toFixed(2)}%)
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Blockchain Allocation Chart */}
        {allocations.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Allocation Distribution</Text>
            <View style={styles.card}>
              <PieChart
                data={allocations.map((a, idx) => ({
                  label: a.blockchain.toUpperCase(),
                  value: parseFloat(a.value),
                  color: ['#0a7ea4', '#ec4899', '#f59e0b', '#8b5cf6', '#06b6d4'][idx % 5],
                }))}
              />
            </View>
          </Animated.View>
        )}

        {/* Blockchain Allocation Details */}
        {allocations.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Blockchain Allocation</Text>
            <View style={styles.card}>
              {allocations.map((allocation, index) => (
                <View key={allocation.blockchain} style={[styles.row, { borderBottomWidth: index === allocations.length - 1 ? 0 : 1 }]}>
                  <View>
                    <Text style={styles.label}>{allocation.blockchain.toUpperCase()}</Text>
                    <Text style={styles.value}>{allocation.assetCount} assets</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>${allocation.value}</Text>
                    <Text style={styles.value}>{allocation.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Top Assets */}
        {assets.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Top Assets</Text>
            <View style={styles.card}>
              {assets.slice(0, 5).map((asset, index) => (
                <View key={`${asset.blockchain}-${asset.symbol}`} style={[styles.row, { borderBottomWidth: index === Math.min(assets.length, 5) - 1 ? 0 : 1 }]}>
                  <View>
                    <Text style={styles.label}>{asset.symbol}</Text>
                    <Text style={styles.value}>{asset.balance} on {asset.blockchain}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>${asset.usdValue}</Text>
                    <Text style={[styles.value, { color: asset.change24h >= 0 ? colors.success : colors.error }]}>
                      {asset.change24h >= 0 ? '↑' : '↓'} {Math.abs(asset.change24h).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Portfolio Metrics */}
        {metrics && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Metrics</Text>
            <View style={styles.card}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>24h Change</Text>
                <Text style={[styles.statValue, { color: parseFloat(metrics.totalChange24h) >= 0 ? colors.success : colors.error }]}>
                  {metrics.totalChange24hPercent.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>7d Change</Text>
                <Text style={[styles.statValue, { color: parseFloat(metrics.totalChange7d) >= 0 ? colors.success : colors.error }]}>
                  {metrics.totalChange7dPercent.toFixed(2)}%
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Diversification</Text>
                <Text style={styles.statValue}>{diversification.toFixed(1)}%</Text>
              </View>
              <View style={[styles.statRow, { marginBottom: 0 }]}>
                <Text style={styles.statLabel}>Assets</Text>
                <Text style={styles.statValue}>{assets.length}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Best & Worst Performers */}
        {metrics && (metrics.bestPerformer || metrics.worstPerformer) && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.card}>
              {metrics.bestPerformer && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Best: {metrics.bestPerformer.symbol}</Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    ↑ {metrics.bestPerformer.change24h.toFixed(1)}%
                  </Text>
                </View>
              )}
              {metrics.worstPerformer && (
                <View style={[styles.statRow, { marginBottom: 0 }]}>
                  <Text style={styles.statLabel}>Worst: {metrics.worstPerformer.symbol}</Text>
                  <Text style={[styles.statValue, { color: colors.error }]}>
                    ↓ {Math.abs(metrics.worstPerformer.change24h).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
