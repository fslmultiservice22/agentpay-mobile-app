import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useQRPayment } from '@/hooks/use-qr-payment';

export default function QRScannerScreen() {
  const router = useRouter();
  const colors = useColors();
  const { parseQRCode, scannedData } = useQRPayment();
  const [manualInput, setManualInput] = useState('');

  const handleManualInput = () => {
    const input = manualInput.trim();
    
    if (!input) {
      Alert.alert('Error', 'Please enter a valid address or QR code data');
      return;
    }

    const parsed = parseQRCode(input);
    
    if (parsed) {
      Alert.alert('Success', `Scanned: ${parsed.address}\nAmount: ${parsed.amount || 'Not specified'}`);
      // TODO: Implement wallet connection flow with QR data
      // For now, navigate to trading with the parsed data
      router.push({
        pathname: '/(tabs)/trading',
        params: {
          address: parsed.address,
          amount: parsed.amount,
          token: parsed.token,
        },
      });
    } else {
      Alert.alert(
        'Invalid Format',
        'Please enter:\n• A valid Ethereum address (0x...)\n• Or AgentPay payment link',
        [{ text: 'OK' }]
      );
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
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.muted,
    },
    content: {
      flex: 1,
      padding: 16,
      justifyContent: 'center',
    },
    placeholder: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 40,
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    placeholderText: {
      fontSize: 16,
      color: colors.muted,
      textAlign: 'center',
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
    <ScreenContainer style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>Scan a QR code or enter address manually</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>📱 Camera would appear here{'\n'}(In production with expo-camera)</Text>
        </View>

        <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>Or enter manually:</Text>
        <TextInput
          style={styles.input}
          placeholder="0x14ea40648fc8c1781d19363f5b9cc9a877ac2469"
          placeholderTextColor={colors.muted}
          value={manualInput}
          onChangeText={setManualInput}
        />
        <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 12 }}>
          Example: 0x14ea40648fc8c1781d19363f5b9cc9a877ac2469
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleManualInput}>
          <Text style={styles.buttonText}>Parse QR Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
