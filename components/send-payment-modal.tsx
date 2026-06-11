import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { useColors } from '@/hooks/use-colors';

interface SendPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (address: string, amount: string) => Promise<void>;
  loading?: boolean;
}

export function SendPaymentModal({ visible, onClose, onSend, loading = false }: SendPaymentModalProps) {
  const colors = useColors();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');

  const handleSend = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Please enter recipient address');
      return;
    }

    if (!amount.trim() || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter valid amount');
      return;
    }

    try {
      await onSend(address, amount);
      setAddress('');
      setAmount('');
      onClose();
      Alert.alert('Success', 'Payment sent successfully!');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send payment');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 30,
    },
    header: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      color: colors.foreground,
      fontSize: 14,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: '700',
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelButtonText: {
      color: colors.foreground,
      fontSize: 16,
      fontWeight: '700',
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.modal}>
          <Text style={styles.header}>Send Payment</Text>

          <Text style={styles.label}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            placeholder="0x..."
            placeholderTextColor={colors.muted}
            value={address}
            onChangeText={setAddress}
            editable={!loading}
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.0"
            placeholderTextColor={colors.muted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!loading}
          />

          <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
