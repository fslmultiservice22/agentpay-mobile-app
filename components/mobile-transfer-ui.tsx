import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { ScreenContainer } from './screen-container';
import { useColors } from '@/hooks/use-colors';
import { QRCodeScanner } from './qr-code-scanner';

export interface MobileTransferUIProps {
  onTransfer: (to: string, amount: string) => Promise<void>;
  onCancel: () => void;
  balance?: string;
  isLoading?: boolean;
}

/**
 * Mobile-Optimized Transfer UI
 * Simplified transfer interface for mobile with QR code scanning
 */
export function MobileTransferUI({
  onTransfer,
  onCancel,
  balance = '0.00',
  isLoading = false,
}: MobileTransferUIProps) {
  const colors = useColors();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQRScan = (data: string) => {
    // Extract address from QR code data
    const address = data.startsWith('0x') ? data : `0x${data}`;
    setRecipientAddress(address);
    setShowQRScanner(false);
  };

  const handleTransfer = async () => {
    setError(null);

    // Validate inputs
    if (!recipientAddress.trim()) {
      setError('Please enter recipient address');
      return;
    }

    if (!amount.trim()) {
      setError('Please enter amount');
      return;
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      setError('Insufficient balance');
      return;
    }

    setIsProcessing(true);

    try {
      await onTransfer(recipientAddress, amount);
      // Reset form
      setRecipientAddress('');
      setAmount('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (showQRScanner) {
    return (
      <QRCodeScanner
        onScan={handleQRScan}
        onCancel={() => setShowQRScanner(false)}
        title="Scan Recipient Address"
        description="Point camera at QR code or wallet address"
      />
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground">Send</Text>
          <Text className="text-sm text-muted mt-2">Transfer crypto to another wallet</Text>
        </View>

        {/* Balance Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text className="text-sm text-muted mb-2">Available Balance</Text>
          <Text className="text-3xl font-bold text-foreground">{balance} ETH</Text>
        </View>

        {/* Recipient Address */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Recipient Address</Text>
          <View className="flex-row gap-2">
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 12,
                paddingVertical: 12,
                color: colors.foreground,
                fontSize: 14,
              }}
              placeholder="0x..."
              placeholderTextColor={colors.muted}
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              editable={!isProcessing}
            />
            <TouchableOpacity
              onPress={() => setShowQRScanner(true)}
              disabled={isProcessing}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingHorizontal: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text className="text-white font-semibold">QR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Amount (ETH)</Text>
          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
              color: colors.foreground,
              fontSize: 16,
            }}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!isProcessing}
          />

          {/* Quick amount buttons */}
          <View className="flex-row gap-2 mt-3">
            {['0.1', '0.5', '1.0'].map(value => (
              <TouchableOpacity
                key={value}
                onPress={() => setAmount(value)}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 6,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text className="text-foreground font-semibold text-center text-sm">{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View
            style={{
              backgroundColor: colors.error,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text className="text-white text-sm">{error}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View className="flex-1 justify-end gap-3">
          <TouchableOpacity
            onPress={handleTransfer}
            disabled={isProcessing || isLoading}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 14,
              opacity: isProcessing || isLoading ? 0.6 : 1,
            }}
          >
            <Text className="text-white font-bold text-center text-base">
              {isProcessing ? 'Processing...' : 'Send'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onCancel}
            disabled={isProcessing}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text className="text-foreground font-semibold text-center text-base">Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
