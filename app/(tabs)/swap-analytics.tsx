import { ScrollView, Text, View, StyleSheet, ActivityIndicator, Pressable, Share } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useSwapAnalytics } from '@/hooks/use-swap-analytics';
import { useI18n } from '@/hooks/use-i18n';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

export default function SwapAnalyticsScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { analytics, isLoading, error, timeRange, setTimeRange, exportToCSV } = useSwapAnalytics();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: '700', color: colors.foreground },
    subtitle: { fontSize: 12, color: colors.muted, marginTop: 4 },
    section: { marginVertical: 16, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 14, color: colors.muted, marginBottom: 12, fontWeight: '600' },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    label: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    value: { fontSize: 12, color: colors.muted },
    largeValue: { fontSize: 20, fontWeight: '700', color: colors.foreground },
    badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primary, marginHorizontal: 4 },
    badgeText: { fontSize: 12, fontWeight: '600', color: colors.background },
    badgeActive: { backgroundColor: colors.primary },
    badgeInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    badgeTextActive: { color: colors.background },
    badgeTextInactive: { color: colors.foreground },
    errorContainer: { backgroundColor: colors.error, borderRadius: 12, padding: 12, marginBottom: 12 },
    errorText: { color: colors.background, fontSize: 12, fontWeight: '600' },
    statGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
    statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
    statLabel: { fontSize: 11, color: colors.muted, marginBottom: 4, fontWeight: '600' },
    statValue: { fontSize: 16, fontWeight: '700', color: colors.foreground },
    exportButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6 },
    exportText: { fontSize: 12, fontWeight: '600', color: colors.background },
  });

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const handleExport = async () => {
    const csv = exportToCSV();
    if (csv) {
      try {
        await Share.share({
          message: csv,
          title: 'Swap History Export',
        });
      } catch (err) {
        console.error('Export failed:', err);
      }
    }
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Swap Analytics</Text>
          <Text style={styles.subtitle}>Track your trading activity</Text>
        </View>

        {/* Error Message */}
        {error && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.section, { marginVertical: 0, paddingTop: 0 }]}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </Animated.View>
        )}

        {/* Time Range Filter */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <Pressable
                key={range}
                onPress={() => setTimeRange(range)}
                style={[styles.badge, timeRange === range ? styles.badgeActive : styles.badgeInactive]}
              >
                <Text style={[styles.badgeText, timeRange === range ? styles.badgeTextActive : styles.badgeTextInactive]}>
                  {range.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Summary Statistics */}
        {analytics && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <Pressable onPress={handleExport} style={styles.exportButton}>
                <MaterialIcons name="download" size={16} color={colors.background} />
                <Text style={styles.exportText}>Export</Text>
              </Pressable>
            </View>

            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Total Swaps</Text>
                <Text style={styles.statValue}>{analytics.statistics.totalSwaps}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Completed</Text>
                <Text style={styles.statValue}>{analytics.statistics.completedSwaps}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Failed</Text>
                <Text style={styles.statValue}>{analytics.statistics.failedSwaps}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={[styles.row, { borderBottomWidth: 1 }]}>
                <Text style={styles.label}>Total Volume</Text>
                <Text style={styles.largeValue}>${analytics.statistics.totalVolumeUsd.toFixed(2)}</Text>
              </View>
              <View style={[styles.row, { borderBottomWidth: 1 }]}>
                <Text style={styles.label}>Total Fees</Text>
                <Text style={styles.largeValue}>${analytics.statistics.totalFeesUsd.toFixed(2)}</Text>
              </View>
              <View style={[styles.row, { borderBottomWidth: 1 }]}>
                <Text style={styles.label}>Average Fee</Text>
                <Text style={styles.largeValue}>${analytics.statistics.averageFee.toFixed(4)}</Text>
              </View>
              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <Text style={styles.label}>Avg Price Impact</Text>
                <Text style={styles.largeValue}>{(analytics.statistics.averagePriceImpact * 100).toFixed(2)}%</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Blockchain Distribution */}
        {analytics && analytics.blockchainStats.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>By Blockchain</Text>
            <View style={styles.card}>
              {analytics.blockchainStats.map((stat, index) => (
                <Animated.View
                  key={stat.blockchain}
                  entering={SlideInRight.delay(index * 50).duration(300)}
                  style={[styles.row, { borderBottomWidth: index === analytics.blockchainStats.length - 1 ? 0 : 1 }]}
                >
                  <View>
                    <Text style={styles.label}>{stat.blockchain.toUpperCase()}</Text>
                    <Text style={styles.value}>{stat.swapCount} swaps</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.largeValue}>${stat.volumeUsd.toFixed(0)}</Text>
                    <Text style={styles.value}>{stat.percentage.toFixed(1)}%</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Top Tokens In */}
        {analytics && analytics.tokenStats.in.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Top Tokens In</Text>
            <View style={styles.card}>
              {analytics.tokenStats.in.slice(0, 5).map((token, index) => (
                <Animated.View
                  key={token.symbol}
                  entering={SlideInRight.delay(index * 50).duration(300)}
                  style={[styles.row, { borderBottomWidth: index === Math.min(analytics.tokenStats.in.length, 5) - 1 ? 0 : 1 }]}
                >
                  <View>
                    <Text style={styles.label}>{token.symbol}</Text>
                    <Text style={styles.value}>{token.swapCount} swaps</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.largeValue}>{token.percentage.toFixed(1)}%</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Top Tokens Out */}
        {analytics && analytics.tokenStats.out.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Top Tokens Out</Text>
            <View style={styles.card}>
              {analytics.tokenStats.out.slice(0, 5).map((token, index) => (
                <Animated.View
                  key={token.symbol}
                  entering={SlideInRight.delay(index * 50).duration(300)}
                  style={[styles.row, { borderBottomWidth: index === Math.min(analytics.tokenStats.out.length, 5) - 1 ? 0 : 1 }]}
                >
                  <View>
                    <Text style={styles.label}>{token.symbol}</Text>
                    <Text style={styles.value}>{token.swapCount} swaps</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.largeValue}>{token.percentage.toFixed(1)}%</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Recent Swaps */}
        {analytics && analytics.recentSwaps.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Swaps</Text>
            <View style={styles.card}>
              {analytics.recentSwaps.slice(0, 5).map((swap, index) => (
                <Animated.View
                  key={swap.id}
                  entering={SlideInRight.delay(index * 50).duration(300)}
                  style={[styles.row, { borderBottomWidth: index === Math.min(analytics.recentSwaps.length, 5) - 1 ? 0 : 1 }]}
                >
                  <View>
                    <Text style={styles.label}>
                      {swap.tokenIn} → {swap.tokenOut}
                    </Text>
                    <Text style={styles.value}>
                      {swap.blockchain} • {new Date(swap.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.largeValue, { color: swap.status === 'completed' ? colors.success : colors.error }]}>
                      ${swap.feeUsd.toFixed(2)}
                    </Text>
                    <Text style={styles.value}>{swap.status}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
