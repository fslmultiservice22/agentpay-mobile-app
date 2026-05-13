import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useWallet } from '@/lib/web3/wallet-context';
import { useColors } from '@/hooks/use-colors';

export default function ConnectWalletScreen() {
  const router = useRouter();
  const { connect, isConnected } = useWallet();
  const colors = useColors();
  const [loading, setLoading] = useState<string | null>(null);

  const handleConnect = async (type: 'metamask' | 'walletconnect' | 'local') => {
    setLoading(type);
    try {
      await connect(type);
      if (type === 'local') {
        // Redirect to home after local connection
        router.push('/(tabs)');
      }
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScreenContainer className="p-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="gap-8">
          {/* Header */}
          <View className="items-center gap-2">
            <Text className="text-4xl font-bold text-foreground">AgentPay</Text>
            <Text className="text-base text-muted">Connect Your Wallet</Text>
          </View>

          {/* Connection Options */}
          <View className="gap-4">
            {/* MetaMask */}
            <TouchableOpacity
              onPress={() => handleConnect('metamask')}
              disabled={loading !== null}
              className="bg-surface rounded-2xl p-6 border border-border active:opacity-80"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-semibold text-foreground">MetaMask</Text>
                  <Text className="text-sm text-muted mt-1">Connect via MetaMask</Text>
                </View>
                {loading === 'metamask' && <ActivityIndicator color={colors.primary} />}
              </View>
            </TouchableOpacity>

            {/* WalletConnect */}
            <TouchableOpacity
              onPress={() => handleConnect('walletconnect')}
              disabled={loading !== null}
              className="bg-surface rounded-2xl p-6 border border-border active:opacity-80"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-semibold text-foreground">WalletConnect</Text>
                  <Text className="text-sm text-muted mt-1">Scan QR code to connect</Text>
                </View>
                {loading === 'walletconnect' && <ActivityIndicator color={colors.primary} />}
              </View>
            </TouchableOpacity>

            {/* Local Wallet */}
            <TouchableOpacity
              onPress={() => handleConnect('local')}
              disabled={loading !== null}
              className="bg-surface rounded-2xl p-6 border border-border active:opacity-80"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-semibold text-foreground">Test Wallet</Text>
                  <Text className="text-sm text-muted mt-1">Use local test wallet</Text>
                </View>
                {loading === 'local' && <ActivityIndicator color={colors.primary} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View className="bg-surface rounded-lg p-4 border border-border">
            <Text className="text-xs text-muted leading-relaxed">
              Your wallet is secured locally. We never store your private keys or seed phrases on our servers.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
