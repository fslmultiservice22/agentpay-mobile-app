import { ScrollView, Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useWallet } from '@/lib/web3/wallet-context';
import { useColors } from '@/hooks/use-colors';
import { usePortfolioSync } from '@/hooks/use-portfolio-sync';

export default function PortfolioScreen() {
  const colors = useColors();
  const wallet = useWallet();
  const { portfolio, loading, error } = usePortfolioSync();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 28, fontWeight: '700', color: colors.foreground },
    section: { marginVertical: 16, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 14, color: colors.muted, marginBottom: 12, fontWeight: '600' },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
    totalValue: { fontSize: 32, fontWeight: '700', color: colors.foreground, marginBottom: 8 },
    change: { fontSize: 14, color: colors.success, fontWeight: '600' },
    assetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    assetName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    assetAmount: { fontSize: 12, color: colors.muted },
    assetValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statLabel: { fontSize: 12, color: colors.muted },
    statValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  });

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
        </View>

        {/* Total Value Card */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Total Value</Text>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : portfolio ? (
              <>
                <Text style={styles.totalValue}>${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                <Text style={[styles.change, { color: portfolio.totalChange >= 0 ? colors.success : colors.error }]}>
                  {portfolio.totalChange >= 0 ? '\u2191' : '\u2193'} ${Math.abs(portfolio.totalChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({portfolio.totalChangePercent.toFixed(2)}%)
                </Text>
              </>
            ) : (
              <Text style={styles.change}>Error loading portfolio</Text>
            )}
          </View>
        </View>

        {/* Assets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Assets</Text>
          <View style={styles.card}>
            {portfolio?.assets.map((asset, index) => (
              <View key={asset.symbol} style={[styles.assetRow, { borderBottomWidth: index === portfolio.assets.length - 1 ? 0 : 1 }]}>
                <View>
                  <Text style={styles.assetName}>{asset.symbol}</Text>
                  <Text style={styles.assetAmount}>{asset.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {asset.symbol}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.assetValue}>${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  <Text style={[styles.assetAmount, { color: asset.changePercent24h >= 0 ? colors.success : colors.error }]}>
                    {asset.changePercent24h >= 0 ? '\u2191' : '\u2193'} {Math.abs(asset.changePercent24h).toFixed(1)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>24h High</Text>
              <Text style={styles.statValue}>$128,750.00</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>24h Low</Text>
              <Text style={styles.statValue}>$117,200.00</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>All-Time High</Text>
              <Text style={styles.statValue}>$135,000.00</Text>
            </View>
            <View style={[styles.statRow, { marginBottom: 0 }]}>
              <Text style={styles.statLabel}>Diversification</Text>
              <Text style={styles.statValue}>85%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
