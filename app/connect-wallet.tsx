import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useEthereumWallet as useWallet } from '@/hooks/use-ethereum-wallet';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';

export default function ConnectWalletScreen() {
  const router = useRouter();
  const { connect, isConnected, error } = useWallet();
  const colors = useColors();
  const { t } = useI18n();
  const [loading, setLoading] = useState<string | null>(null);

  const handleConnect = async (type: 'metamask' | 'walletconnect' | 'okx' | 'local') => {
    setLoading(type);
    try {
      await connect(type);
      
      // Aggiungi un piccolo delay per permettere al state di aggiornarsi
      setTimeout(() => {
        if (isConnected || type === 'local') {
          router.push('/(tabs)');
        }
      }, 500);
    } catch (err) {
      console.error('Connection failed:', err);
      Alert.alert('Connection Error', `Failed to connect with ${type}`);
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
            <Text className="text-base text-muted">{t('wallet.connectDesc')}</Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-red-100 border border-red-300 rounded-lg p-4">
              <Text className="text-red-800 text-sm">{error}</Text>
            </View>
          )}

          {/* Connection Options */}
          <View className="gap-4">
            {/* MetaMask */}
            <TouchableOpacity
              onPress={() => handleConnect('metamask')}
              disabled={loading !== null}
              className={`rounded-2xl p-6 border ${
                loading === 'metamask' ? 'bg-gray-200' : 'bg-surface'
              } border-border active:opacity-80`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">{t('wallet.metamask')}</Text>
                  <Text className="text-sm text-muted mt-1">{t('wallet.metamaskDesc')}</Text>
                </View>
                {loading === 'metamask' && <ActivityIndicator color={colors.primary} />}
              </View>
            </TouchableOpacity>

            {/* WalletConnect */}
            <TouchableOpacity
              onPress={() => handleConnect('walletconnect')}
              disabled={loading !== null}
              className={`rounded-2xl p-6 border ${
                loading === 'walletconnect' ? 'bg-gray-200' : 'bg-surface'
              } border-border active:opacity-80`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">{t('wallet.walletconnect')}</Text>
                  <Text className="text-sm text-muted mt-1">{t('wallet.walletconnectDesc')}</Text>
                </View>
                {loading === 'walletconnect' && <ActivityIndicator color={colors.primary} />}
              </View>
            </TouchableOpacity>

            {/* OKX Wallet */}
            <TouchableOpacity
              onPress={() => handleConnect('okx')}
              disabled={loading !== null}
              className={`rounded-2xl p-6 border ${
                loading === 'okx' ? 'bg-gray-200' : 'bg-surface'
              } border-border active:opacity-80`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-foreground">{t('wallet.okx')}</Text>
                  <Text className="text-sm text-muted mt-1">{t('wallet.okxDesc')}</Text>
                </View>
                {loading === 'okx' && <ActivityIndicator color={colors.primary} />}
              </View>
            </TouchableOpacity>

            {/* Local Wallet */}
            <TouchableOpacity
              onPress={() => handleConnect('local')}
              disabled={loading !== null}
              className={`rounded-2xl p-6 border ${
                loading === 'local' ? 'bg-gray-200' : 'bg-surface'
              } border-border active:opacity-80`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
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

          {/* Connection Status */}
          {isConnected && (
            <View className="bg-green-100 border border-green-300 rounded-lg p-4">
              <Text className="text-green-800 text-sm font-semibold">✓ Wallet Connected Successfully</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
