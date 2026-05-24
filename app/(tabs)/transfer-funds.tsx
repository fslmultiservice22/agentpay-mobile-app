import React, { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { WalletConnection } from '@/components/wallet-connection';
import { SendTransactionModal } from '@/components/send-transaction-modal';
import { TestnetInfo } from '@/components/testnet-info';
import { useAccount } from 'wagmi';
import { useRealTransactions } from '@/hooks/use-real-transactions';

export default function TransferFundsScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { address, isConnected } = useAccount();
  const { balance, transactions } = useRealTransactions();
  const [showSendModal, setShowSendModal] = useState(false);

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
    subtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    balanceCard: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
    },
    balanceLabel: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 8,
    },
    balanceValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: 'white',
    },
    balanceSubtext: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 8,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.background,
    },
    transactionItem: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    transactionHash: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: 'monospace',
      marginBottom: 4,
    },
    transactionStatus: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
    },
    statusSuccess: {
      color: colors.success,
    },
    statusFailed: {
      color: colors.error,
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      padding: 20,
    },
    warningBox: {
      backgroundColor: `${colors.warning}20`,
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
      padding: 12,
      borderRadius: 4,
      marginBottom: 16,
    },
    warningText: {
      color: colors.warning,
      fontSize: 12,
      lineHeight: 18,
    },
  });

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transfer Funds</Text>
          <Text style={styles.subtitle}>Send crypto on real blockchain networks</Text>
        </View>

        <View style={styles.content}>
          {/* Wallet Connection */}
          <WalletConnection />

          {/* Warning */}
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ This app supports real blockchain transactions. Always verify addresses and amounts before sending.
            </Text>
          </View>

          {/* Balance Card */}
          {isConnected && (
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceValue}>{balance} ETH</Text>
              <Text style={styles.balanceSubtext}>
                {address ? `Address: ${address.slice(0, 10)}...${address.slice(-8)}` : 'Not connected'}
              </Text>
            </View>
          )}

          {/* Send Button */}
          {isConnected && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => setShowSendModal(true)}
            >
              <Text style={styles.buttonText}>Send ETH</Text>
            </TouchableOpacity>
          )}

          {/* Testnet Info */}
          <TestnetInfo address={address} />

          {/* Transaction History */}
          {transactions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              {transactions.slice(0, 5).map((tx, index) => (
                <View key={index} style={styles.transactionItem}>
                  <Text style={styles.transactionHash}>
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                  </Text>
                  <Text style={styles.transactionHash}>
                    To: {tx.to.slice(0, 10)}...{tx.to.slice(-8)}
                  </Text>
                  <Text style={styles.transactionHash}>
                    Amount: {tx.value} ETH
                  </Text>
                  <Text style={[styles.transactionStatus, styles[`status${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}` as keyof typeof styles]]}>
                    Status: {tx.status.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!isConnected && (
            <View>
              <Text style={styles.emptyText}>
                Connect your wallet to start transferring funds
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Send Transaction Modal */}
      <SendTransactionModal
        visible={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSuccess={(txHash) => {
          console.log('Transaction sent:', txHash);
        }}
      />
    </ScreenContainer>
  );
}
