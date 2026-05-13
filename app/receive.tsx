import { useState } from 'react';
import { ScrollView, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useWallet } from '@/lib/web3/wallet-context';
import * as Clipboard from 'expo-clipboard';

export default function ReceiveScreen() {
  const router = useRouter();
  const { address } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      setCopied(true);
      Alert.alert('Copied', 'Wallet address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">Receive Payment</Text>
            <Text className="text-base text-muted">Share your wallet address to receive funds</Text>
          </View>

          {/* QR Code Placeholder */}
          <View className="bg-surface border border-border rounded-lg p-8 items-center justify-center h-64">
            <View className="w-48 h-48 bg-background border-2 border-border rounded-lg items-center justify-center">
              <Text className="text-muted text-sm">QR Code</Text>
              <Text className="text-muted text-xs mt-2">(Scan to receive)</Text>
            </View>
          </View>

          {/* Wallet Address */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Your Wallet Address</Text>
            <View className="bg-surface border border-border rounded-lg p-4 flex-row justify-between items-center">
              <Text className="text-foreground font-mono text-sm flex-1">
                {address ? `${address.slice(0, 10)}...${address.slice(-8)}` : 'Not connected'}
              </Text>
              <TouchableOpacity
                className="ml-2 p-2 bg-primary rounded-lg"
                onPress={handleCopyAddress}
              >
                <Text className="text-white text-xs font-semibold">Copy</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Full Address */}
          <View className="gap-2">
            <Text className="text-xs text-muted">Full Address:</Text>
            <View className="bg-surface border border-border rounded-lg p-3">
              <Text className="text-foreground font-mono text-xs break-words">
                {address || 'Not connected'}
              </Text>
            </View>
          </View>

          {/* Info Box */}
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 gap-2">
            <Text className="text-sm font-semibold text-blue-900">💡 Tips</Text>
            <Text className="text-xs text-blue-800">
              • Share your address or QR code with the sender{'\n'}
              • Your funds will appear in your wallet after confirmation{'\n'}
              • Never share your private key or seed phrase
            </Text>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            className="rounded-lg p-4 items-center justify-center border border-border"
            onPress={() => router.back()}
          >
            <Text className="text-foreground font-semibold text-base">Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
