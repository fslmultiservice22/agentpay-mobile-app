import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useEthereumWallet as useWallet } from '@/hooks/use-ethereum-wallet';
import { useColors } from '@/hooks/use-colors';
import { useP2PTransfer } from '@/hooks/use-p2p-transfer';
import { useQRPayment } from '@/hooks/use-qr-payment';
import { usePaymentLinks } from '@/hooks/use-payment-links';
import { useRecurringPayments } from '@/hooks/use-recurring-payments';
import { SendPaymentModal } from '@/components/send-payment-modal';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const colors = useColors();
  const wallet = useWallet();
  const router = useRouter();
  const { sendTransfer, loading: transferLoading } = useP2PTransfer();
  const { createPaymentLink, sharePaymentLink } = usePaymentLinks();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleSendPayment = () => {
    setShowPaymentModal(true);
  };

  const handleSendPaymentSubmit = async (address: string, amount: string) => {
    await sendTransfer(address, amount, 'ETH');
  };

  const handleReceivePayment = async () => {
    if (!wallet.address) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }
    try {
      const link = await createPaymentLink(wallet.address);
      await sharePaymentLink(link);
      Alert.alert('Success', 'Payment link copied to clipboard!');
    } catch (err) {
      Alert.alert('Error', 'Failed to create payment link');
    }
  };

  const handleQRScan = () => {
    router.push('/qr-scanner');
  };

  const handleRecurringPayment = () => {
    Alert.alert('Recurring Payment', 'Feature coming soon!');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    balanceCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginHorizontal: 16,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    balanceLabel: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 8,
    },
    balanceValue: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 12,
    },
    balanceChange: {
      fontSize: 14,
      color: colors.success,
      fontWeight: '600',
    },
    section: {
      marginVertical: 16,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 4,
    },
    cardValue: {
      fontSize: 14,
      color: colors.muted,
    },
    badge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    badgeText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: '600',
    },
    gridContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    gridItem: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    gridLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 8,
    },
    gridValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
    },
  });

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            {wallet?.isConnected ? `Connected: ${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}` : 'Not connected'}
          </Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Portfolio Value</Text>
          <Text style={styles.balanceValue}>${wallet?.balance || '0.00'}</Text>
          <Text style={styles.balanceChange}>↑ +12.5% (24h)</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Stats</Text>
          <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>24h Change</Text>
              <Text style={[styles.gridValue, { color: colors.success }]}>+12.5%</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>7d Change</Text>
              <Text style={[styles.gridValue, { color: colors.success }]}>+28.3%</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Total Return</Text>
              <Text style={[styles.gridValue, { color: colors.success }]}>+45.8%</Text>
            </View>
          </View>
        </View>

        {/* Active Positions */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Active Positions</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>3 Active</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Staking - ETH</Text>
              <Text style={styles.cardValue}>2.5 ETH @ 4.5% APY</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.success, fontWeight: '600' }]}>+$125</Text>
          </View>

          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Farming - Curve</Text>
              <Text style={styles.cardValue}>$5,000 @ 12.5% APY</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.success, fontWeight: '600' }]}>+$42</Text>
          </View>

          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Limit Order</Text>
              <Text style={styles.cardValue}>USDC → ETH @ $2,500</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>

          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Swap ETH → USDC</Text>
              <Text style={styles.cardValue}>2 hours ago</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.success, fontWeight: '600' }]}>+$2,500</Text>
          </View>

          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Claim Rewards</Text>
              <Text style={styles.cardValue}>1 day ago</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.success, fontWeight: '600' }]}>+$85</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleSendPayment}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.background, fontSize: 16, fontWeight: '700' }}>Send Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReceivePayment}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Receive Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleQRScan}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRecurringPayment}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Recurring Payment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <SendPaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSend={handleSendPaymentSubmit}
        loading={transferLoading}
      />
    </ScreenContainer>
  );
}
