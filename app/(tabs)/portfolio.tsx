import { ScrollView, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useEthereumWallet } from '@/hooks/use-ethereum-wallet';
import { maskEthereumAddress } from '@/lib/ethereum-validator';

export default function PortfolioScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { wallet, loading, refreshWallet, disconnectWallet } = useEthereumWallet();

  // Use wallet data if connected, otherwise use mock data
  const portfolio = wallet || {
    totalValue: 125000,
    totalChange: 5000,
    totalChangePercent: 4.17,
    assets: [
      { symbol: 'ETH', amount: 5.5, value: 18700, changePercent24h: 2.5 },
      { symbol: 'USDC', amount: 50000, value: 50000, changePercent24h: 0 },
      { symbol: 'MATIC', amount: 25000, value: 18500, changePercent24h: -1.2 },
      { symbol: 'ARB', amount: 8000, value: 12800, changePercent24h: 3.8 },
      { symbol: 'OP', amount: 6000, value: 25000, changePercent24h: 5.2 },
    ],
  };

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
    buttonRow: { flexDirection: 'row', gap: 8 },
    button: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  });

  const handleConnectWallet = () => {
    router.push('/wallet-connect');
  };

  const handleDisconnect = async () => {
    if (wallet?.address) {
      await disconnectWallet(wallet.address);
    }
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('portfolio.title')}</Text>
        </View>

        {/* Wallet Connection Status */}
        {wallet && (
          <View style={styles.section}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Connected Wallet</Text>
              <Text style={styles.assetValue}>{maskEthereumAddress(wallet.address)}</Text>
              <View style={[styles.buttonRow, { marginTop: 12 }]}>
                <TouchableOpacity
                  onPress={() => refreshWallet()}
                  disabled={loading}
                  style={[styles.button, { backgroundColor: colors.primary }]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.background} size="small" />
                  ) : (
                    <Text style={{ color: colors.background, fontWeight: '600' }}>Refresh</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDisconnect}
                  style={[styles.button, { backgroundColor: colors.error }]}
                >
                  <Text style={{ color: colors.background, fontWeight: '600' }}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Total Value Card */}
        <View style={styles.section}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('portfolio.totalValue')}</Text>
            <Text style={styles.totalValue}>${portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={[styles.change, { color: portfolio.totalChange >= 0 ? colors.success : colors.error }]}>
              {portfolio.totalChange >= 0 ? '↑' : '↓'} ${Math.abs(portfolio.totalChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({portfolio.totalChangePercent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        {/* Connect Wallet Button (if not connected) */}
        {!wallet && (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={handleConnectWallet}
              style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: colors.background, fontWeight: '600', fontSize: 16 }}>
                {t('wallet.connect')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Assets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('portfolio.assets')}</Text>
          <View style={styles.card}>
            {portfolio.assets && portfolio.assets.length > 0 ? (
              portfolio.assets.map((asset, index) => (
                <View key={asset.symbol} style={[styles.assetRow, { borderBottomWidth: index === portfolio.assets.length - 1 ? 0 : 1 }]}>
                  <View>
                    <Text style={styles.assetName}>{asset.symbol}</Text>
                    <Text style={styles.assetAmount}>
                      {('balance' in asset ? asset.balance : asset.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {asset.symbol}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.assetValue}>
                      ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.assetAmount, { color: asset.changePercent24h >= 0 ? colors.success : colors.error }]}>
                      {asset.changePercent24h >= 0 ? '↑' : '↓'} {Math.abs(asset.changePercent24h).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.assetAmount}>{t('portfolio.noAssets')}</Text>
            )}
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('portfolio.statistics')}</Text>
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
