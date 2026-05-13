import { useState } from 'react';
import { Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ScreenContainer } from '@/components/screen-container';

export default function ReceiveScreen() {
  const router = useRouter();
  const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    await Clipboard.setStringAsync(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="gap-4">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Receive Payment</Text>
          <Text className="text-base text-muted">Share your wallet address</Text>
        </View>

        {/* QR Code Placeholder */}
        <View className="bg-surface border border-border rounded-lg p-6 items-center justify-center h-64">
          <View className="bg-gray-200 w-48 h-48 items-center justify-center rounded-lg">
            <Text className="text-gray-600 font-semibold">QR Code</Text>
            <Text className="text-gray-500 text-sm mt-2">Scan to receive funds</Text>
          </View>
        </View>

        {/* Wallet Address */}
        <View className="bg-surface border border-border rounded-lg p-4">
          <Text className="text-muted text-sm mb-2">Your Wallet Address</Text>
          <Text className="text-foreground font-mono text-sm break-words">{walletAddress}</Text>
        </View>

        {/* Copy Button */}
        <TouchableOpacity
          className={`rounded-lg p-4 items-center justify-center ${copied ? 'bg-green-600' : 'bg-primary'}`}
          onPress={handleCopyAddress}
        >
          <Text className="text-white font-semibold text-base">{copied ? 'Copied!' : 'Copy Address'}</Text>
        </TouchableOpacity>

        {/* Security Info */}
        <View className="bg-surface border border-border rounded-lg p-4">
          <Text className="text-foreground font-semibold mb-2">Security Tips</Text>
          <Text className="text-muted text-sm">• Only share your address with trusted sources</Text>
          <Text className="text-muted text-sm">• Never share your private key or seed phrase</Text>
          <Text className="text-muted text-sm">• Your wallet is secured locally on this device</Text>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          className="rounded-lg p-4 items-center justify-center border border-border"
          onPress={() => router.back()}
        >
          <Text className="text-foreground font-semibold text-base">Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}