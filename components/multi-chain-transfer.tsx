import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { ScreenContainer } from './screen-container';
import { useColors } from '@/hooks/use-colors';
import { useAnchorWallet } from '@/hooks/use-anchor-wallet';
import { NetworkSelector } from './network-selector';

export interface MultiChainTransferProps {
  onTransfer: (networkId: string, to: string, amount: string, memo?: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Multi-Chain Transfer Component
 * Send transactions across 25+ blockchain networks
 */
export function MultiChainTransfer({ onTransfer, onCancel }: MultiChainTransferProps) {
  const colors = useColors();
  const { currentNetwork, getNetworkInfo } = useAnchorWallet();
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNetworkSelect = (networkId: string) => {
    setSelectedNetworkId(networkId);
    setShowNetworkSelector(false);
  };

  const handleTransfer = async () => {
    setError(null);

    if (!selectedNetworkId) {
      setError('Please select a network');
      return;
    }

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

    setIsProcessing(true);

    try {
      await onTransfer(selectedNetworkId, recipientAddress, amount, memo);
      // Reset form
      setSelectedNetworkId(null);
      setRecipientAddress('');
      setAmount('');
      setMemo('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transfer failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (showNetworkSelector) {
    return (
      <NetworkSelector
        onNetworkSelect={handleNetworkSelect}
        onCancel={() => setShowNetworkSelector(false)}
      />
    );
  }

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground">Multi-Chain Send</Text>
          <Text className="text-sm text-muted mt-2">Transfer across 25+ blockchain networks</Text>
        </View>

        {/* Network Selection */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Select Network</Text>
          <TouchableOpacity
            onPress={() => setShowNetworkSelector(true)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
            }}
          >
            <Text className="text-base text-foreground">
              {selectedNetworkId ? selectedNetworkId : 'Choose a network...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recipient Address */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Recipient Address</Text>
          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
              color: colors.foreground,
              fontSize: 14,
            }}
            placeholder="Enter recipient address"
            placeholderTextColor={colors.muted}
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            editable={!isProcessing}
          />
        </View>

        {/* Amount */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Amount</Text>
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
        </View>

        {/* Memo (Optional) */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-foreground mb-2">Memo (Optional)</Text>
          <TextInput
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
              color: colors.foreground,
              fontSize: 14,
            }}
            placeholder="Add a memo"
            placeholderTextColor={colors.muted}
            value={memo}
            onChangeText={setMemo}
            editable={!isProcessing}
          />
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
            disabled={isProcessing}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 14,
              opacity: isProcessing ? 0.6 : 1,
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  networkButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  networkButtonText: {
    fontSize: 16,
  },
  errorContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  actions: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
