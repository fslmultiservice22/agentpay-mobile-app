import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRealTransactions } from '@/hooks/use-real-transactions';
import { useColors } from '@/hooks/use-colors';
import { isValidAddress, shortenAddress } from '@/lib/real-transaction-service';

interface SendTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
  defaultRecipient?: string;
}

export function SendTransactionModal({
  visible,
  onClose,
  onSuccess,
  defaultRecipient = '',
}: SendTransactionModalProps) {
  const colors = useColors();
  const {
    isLoading,
    error,
    balance,
    sendEth,
    estimateGasCost,
    isConnected,
    address,
  } = useRealTransactions();

  const [recipient, setRecipient] = useState(defaultRecipient);
  const [amount, setAmount] = useState('');
  const [gasEstimate, setGasEstimate] = useState<any>(null);
  const [isEstimating, setIsEstimating] = useState(false);

  // Estimate gas when recipient and amount change
  useEffect(() => {
    if (recipient && amount && isValidAddress(recipient)) {
      estimateGasAsync();
    }
  }, [recipient, amount]);

  const estimateGasAsync = async () => {
    try {
      setIsEstimating(true);
      const estimate = await estimateGasCost(recipient, amount);
      setGasEstimate(estimate);
    } catch (err) {
      console.error('Gas estimation error:', err);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSend = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }

    if (!recipient || !isValidAddress(recipient)) {
      Alert.alert('Error', 'Invalid recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    try {
      const result = await sendEth(recipient, amount);
      Alert.alert('Success', `Transaction sent: ${result.hash}`);
      onSuccess?.(result.hash);
      handleClose();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  const handleClose = () => {
    setRecipient(defaultRecipient);
    setAmount('');
    setGasEstimate(null);
    onClose();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '90%',
    },
    header: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.foreground,
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: colors.foreground,
      backgroundColor: colors.surface,
    },
    infoBox: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    infoText: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 4,
    },
    infoValue: {
      color: colors.foreground,
      fontSize: 14,
      fontWeight: '600',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButton: {
      backgroundColor: colors.primary,
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    sendButtonText: {
      color: colors.background,
    },
    cancelButtonText: {
      color: colors.foreground,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 4,
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
    },
  });

  const isValidRecipient = isValidAddress(recipient);
  const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(balance);
  const canSend = isValidRecipient && isValidAmount && !isLoading;
  const totalCost = gasEstimate ? (parseFloat(amount) + parseFloat(gasEstimate.estimatedCost)).toFixed(6) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.modal}>
          <ScrollView>
            <Text style={styles.header}>Send ETH</Text>

            {/* Wallet Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>From</Text>
              <Text style={styles.infoValue}>
                {address ? shortenAddress(address) : 'Not connected'}
              </Text>
            </View>

            {/* Recipient */}
            <Text style={styles.label}>Recipient Address</Text>
            <TextInput
              style={[styles.input, !isValidRecipient && recipient && styles.errorText]}
              placeholder="0x..."
              placeholderTextColor={colors.muted}
              value={recipient}
              onChangeText={setRecipient}
              editable={!isLoading}
            />
            {recipient && !isValidRecipient && (
              <Text style={styles.errorText}>Invalid Ethereum address</Text>
            )}

            {/* Amount */}
            <Text style={styles.label}>Amount (ETH)</Text>
            <TextInput
              style={[styles.input, !isValidAmount && amount && styles.errorText]}
              placeholder="0.0"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
            {amount && !isValidAmount && (
              <Text style={styles.errorText}>Invalid amount or insufficient balance</Text>
            )}

            {/* Balance Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Available Balance</Text>
              <Text style={styles.infoValue}>{balance} ETH</Text>
            </View>

            {/* Gas Estimate */}
            {gasEstimate && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Gas Price</Text>
                <Text style={styles.infoValue}>{gasEstimate.gasPrice} Gwei</Text>
                <Text style={[styles.infoText, { marginTop: 8 }]}>Estimated Gas Cost</Text>
                <Text style={styles.infoValue}>{gasEstimate.estimatedCost} ETH</Text>
                {totalCost && (
                  <>
                    <Text style={[styles.infoText, { marginTop: 8 }]}>Total Cost</Text>
                    <Text style={styles.infoValue}>{totalCost} ETH</Text>
                  </>
                )}
              </View>
            )}

            {/* Warning */}
            {isValidRecipient && isValidAmount && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Please verify the recipient address before sending. Transactions cannot be reversed.
                </Text>
              </View>
            )}

            {/* Error Message */}
            {error && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{error}</Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.sendButton, !canSend && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={!canSend}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={[styles.buttonText, styles.sendButtonText]}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
