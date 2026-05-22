import { ScrollView, Text, View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useWallet } from '@/lib/web3/wallet-context';
import { useColors } from '@/hooks/use-colors';
import { useState } from 'react';

export default function TradingScreen() {
  const colors = useColors();
  const wallet = useWallet();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwap = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simula uno swap
      const amount = parseFloat(fromAmount);
      const rate = 2850;
      const receivedAmount = amount * rate;

      // Calcola le fee
      const networkFee = 0.005;
      const slippage = amount * 0.005;
      const totalCost = networkFee + slippage;

      // Aggiorna l'importo ricevuto
      setToAmount(receivedAmount.toFixed(2));

      // Mostra un alert di successo
      alert(`Swap successful!\nYou will receive ${receivedAmount.toFixed(2)} ${toToken}`);

      // Resetta i campi dopo 2 secondi
      setTimeout(() => {
        setFromAmount('');
        setToAmount('');
      }, 2000);
    } catch (err) {
      setError('Swap failed. Please try again.');
      console.error('Swap error:', err);
    } finally {
      setLoading(false);
    }
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
    },
    section: {
      marginVertical: 16,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 12,
      fontWeight: '600',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    tokenSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    tokenButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tokenText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginLeft: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 8,
    },
    priceInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 12,
    },
    priceLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    priceValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    swapButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginVertical: 16,
    },
    swapButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '700',
    },
    feeInfo: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    feeLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    feeValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
  });

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trading</Text>
        </View>

        {/* Swap Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Swap Tokens</Text>
          
          <View style={styles.card}>
            {/* From Token */}
            <Text style={styles.label}>From</Text>
            <View style={styles.tokenSelector}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 12 }]}
                placeholder="0.0"
                placeholderTextColor={colors.muted}
                value={fromAmount}
                onChangeText={setFromAmount}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity style={styles.tokenButton}>
                <Text style={styles.tokenText}>{fromToken}</Text>
              </TouchableOpacity>
            </View>

            {/* Swap Icon */}
            <View style={{ alignItems: 'center', marginVertical: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 50,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 20, color: colors.background }}>⇅</Text>
              </TouchableOpacity>
            </View>

            {/* To Token */}
            <Text style={styles.label}>To</Text>
            <View style={styles.tokenSelector}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 12 }]}
                placeholder="0.0"
                placeholderTextColor={colors.muted}
                value={toAmount}
                editable={false}
              />
              <TouchableOpacity style={styles.tokenButton}>
                <Text style={styles.tokenText}>{toToken}</Text>
              </TouchableOpacity>
            </View>

            {/* Price Info */}
            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>Rate</Text>
              <Text style={styles.priceValue}>1 {fromToken} = 2,850 {toToken}</Text>
            </View>
          </View>
        </View>

        {/* Fee Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          
          <View style={styles.feeInfo}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Network Fee</Text>
              <Text style={styles.feeValue}>0.005 ETH ($12.50)</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Slippage</Text>
              <Text style={styles.feeValue}>0.5%</Text>
            </View>
            <View style={[styles.feeRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 8 }]}>
              <Text style={[styles.feeLabel, { fontWeight: '600' }]}>Total Cost</Text>
              <Text style={[styles.feeValue, { color: colors.primary }]}>$12.50</Text>
            </View>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={[styles.section, { backgroundColor: colors.error, borderRadius: 12, padding: 12 }]}>
            <Text style={{ color: colors.background, fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {/* Swap Button */}
        <TouchableOpacity 
          style={[styles.swapButton, { opacity: loading || !fromAmount ? 0.5 : 1 }]}
          onPress={handleSwap}
          disabled={loading || !fromAmount}
        >
          <Text style={styles.swapButtonText}>{loading ? 'Processing...' : 'Review Swap'}</Text>
        </TouchableOpacity>

        {/* Recent Swaps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Swaps</Text>
          
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[styles.priceValue, { marginBottom: 4 }]}>ETH → USDC</Text>
                <Text style={styles.feeLabel}>2 hours ago</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.priceValue, { color: colors.success }]}>+2,850 USDC</Text>
                <Text style={[styles.feeLabel, { color: colors.success }]}>Completed</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
