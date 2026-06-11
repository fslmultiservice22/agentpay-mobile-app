import { ScrollView, Text, View, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useGasPriceComparator } from '@/hooks/use-gas-price-comparator';
import { useI18n } from '@/hooks/use-i18n';
import { formatGasPrice } from '@/lib/gas/gas-config';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

export default function GasComparatorScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { prices, comparison, isLoading, error, refetch, compareAllNetworks, getRecommendedNetwork } = useGasPriceComparator();

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
    priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    priceValue: { fontSize: 16, fontWeight: '700', color: colors.foreground },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.primary },
    badgeText: { fontSize: 10, fontWeight: '600', color: colors.background },
    refreshButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.primary },
    refreshText: { fontSize: 12, fontWeight: '600', color: colors.background },
    errorContainer: { backgroundColor: colors.error, borderRadius: 12, padding: 12, marginBottom: 12 },
    errorText: { color: colors.background, fontSize: 12, fontWeight: '600' },
    recommendedBadge: { backgroundColor: colors.success, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    recommendedText: { color: colors.background, fontSize: 10, fontWeight: '600' },
  });

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const comparisonData = compareAllNetworks(21000, 'standard');
  const recommendedNetwork = getRecommendedNetwork(21000, 'transfer');

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Gas Comparator</Text>
          <Text style={styles.subtitle}>Compare gas prices across blockchains</Text>
        </View>

        {/* Error Message */}
        {error && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.section, { marginVertical: 0, paddingTop: 0 }]}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </Animated.View>
        )}

        {/* Current Gas Prices */}
        {comparison && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sectionTitle}>Current Prices</Text>
              <Pressable onPress={refetch} style={styles.refreshButton}>
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <View>
                  <Text style={styles.label}>Average</Text>
                  <Text style={styles.value}>All networks</Text>
                </View>
                <Text style={styles.priceValue}>{formatGasPrice(comparison.average)}</Text>
              </View>
            </View>

            {/* Cheapest & Most Expensive */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={[styles.label, { marginBottom: 8 }]}>Cheapest</Text>
                <Text style={styles.priceValue}>{formatGasPrice(comparison.cheapest.standard)}</Text>
                <Text style={styles.value}>{comparison.cheapest.blockchain.toUpperCase()}</Text>
              </View>

              <View style={[styles.card, { flex: 1 }]}>
                <Text style={[styles.label, { marginBottom: 8 }]}>Most Expensive</Text>
                <Text style={styles.priceValue}>{formatGasPrice(comparison.mostExpensive.standard)}</Text>
                <Text style={styles.value}>{comparison.mostExpensive.blockchain.toUpperCase()}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Gas Price Comparison Table */}
        {prices.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Gas Prices by Network</Text>
            <View style={styles.card}>
              {prices.map((price, index) => (
                <Animated.View
                  key={price.blockchain}
                  entering={SlideInRight.delay(index * 50).duration(300)}
                  style={[styles.row, { borderBottomWidth: index === prices.length - 1 ? 0 : 1 }]}
                >
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={styles.label}>{price.blockchain.toUpperCase()}</Text>
                      {recommendedNetwork === price.blockchain && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>Recommended</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View>
                        <Text style={[styles.value, { fontSize: 10 }]}>Standard</Text>
                        <Text style={[styles.priceValue, { fontSize: 12 }]}>{formatGasPrice(price.standard)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.value, { fontSize: 10 }]}>Fast</Text>
                        <Text style={[styles.priceValue, { fontSize: 12 }]}>{formatGasPrice(price.fast)}</Text>
                      </View>
                      <View>
                        <Text style={[styles.value, { fontSize: 10 }]}>Instant</Text>
                        <Text style={[styles.priceValue, { fontSize: 12 }]}>{formatGasPrice(price.instant)}</Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Transaction Cost Comparison */}
        {comparisonData.length > 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Cost (Transfer)</Text>
            <View style={styles.card}>
              {comparisonData.map((item, index) => (
                <Animated.View
                  key={item.blockchain}
                  entering={SlideInRight.delay(index * 50).duration(300)}
                  style={[styles.row, { borderBottomWidth: index === comparisonData.length - 1 ? 0 : 1 }]}
                >
                  <View>
                    <Text style={styles.label}>{item.blockchain.toUpperCase()}</Text>
                    <Text style={styles.value}>${item.costUsd}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {index === 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Cheapest</Text>
                      </View>
                    ) : (
                      <Text style={[styles.value, { color: colors.success }]}>Save ${item.savings}</Text>
                    )}
                  </View>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Speed Explanation */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Speed Levels</Text>
          <View style={styles.card}>
            <View style={[styles.row, { borderBottomWidth: 1 }]}>
              <View>
                <Text style={styles.label}>Standard</Text>
                <Text style={styles.value}>Normal speed, lower cost</Text>
              </View>
            </View>
            <View style={[styles.row, { borderBottomWidth: 1 }]}>
              <View>
                <Text style={styles.label}>Fast</Text>
                <Text style={styles.value}>Faster confirmation</Text>
              </View>
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.label}>Instant</Text>
                <Text style={styles.value}>Highest priority</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}
