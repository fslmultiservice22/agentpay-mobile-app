import { ScrollView, Text, View, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useWallet } from "@/lib/web3/wallet-context";
import { useColors } from "@/hooks/use-colors";
import { useI18n } from "@/hooks/use-i18n";
import { useBlockchain } from "@/lib/blockchain/blockchain-context";
import { BLOCKCHAINS } from "@/lib/blockchain/blockchain-config";

export default function HomeScreen() {
  const router = useRouter();
  const { address, balance, network, isConnected } = useWallet();
  const colors = useColors();
  const { t } = useI18n();
  const { selectedBlockchain } = useBlockchain();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (!isConnected) {
    return (
      <ScreenContainer className="p-0">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          {/* Hero Section */}
          <View className="bg-primary px-6 py-12 gap-4">
            <View className="items-center gap-4">
              <Text className="text-5xl">💰</Text>
              <Text className="text-4xl font-bold text-white text-center">{t('home.title')}</Text>
              <Text className="text-base text-white/80 text-center">{t('home.subtitle')}</Text>
            </View>
          </View>

          {/* Features Section */}
          <View className="px-6 py-8 gap-4">
            <View className="bg-surface rounded-2xl p-4 border border-border flex-row gap-4 items-center">
              <Text className="text-3xl">🔒</Text>
              <View className="flex-1">
                <Text className="font-bold text-foreground">Secure & Private</Text>
                <Text className="text-xs text-muted">Your keys, your funds</Text>
              </View>
            </View>

            <View className="bg-surface rounded-2xl p-4 border border-border flex-row gap-4 items-center">
              <Text className="text-3xl">⚡</Text>
              <View className="flex-1">
                <Text className="font-bold text-foreground">Fast Transactions</Text>
                <Text className="text-xs text-muted">Multi-chain support</Text>
              </View>
            </View>

            <View className="bg-surface rounded-2xl p-4 border border-border flex-row gap-4 items-center">
              <Text className="text-3xl">📊</Text>
              <View className="flex-1">
                <Text className="font-bold text-foreground">Portfolio Tracking</Text>
                <Text className="text-xs text-muted">Real-time analytics</Text>
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <View className="px-6 py-4">
            <TouchableOpacity
              onPress={() => router.push('/connect-wallet')}
              className="bg-primary rounded-2xl py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">{t('home.connectWallet')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-0">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header with Primary Background */}
        <View className="bg-primary px-6 py-6 gap-4">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white/80 text-sm">{t('home.balance')}</Text>
              <Text className="text-4xl font-bold text-white mt-1">${balance || '0.00'}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              className="bg-white/20 rounded-full p-3"
            >
              <Text className="text-xl">⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Network Badge */}
          <View className="bg-white/10 rounded-full px-3 py-2 flex-row items-center gap-2 w-fit">
            <Text className="text-lg">{BLOCKCHAINS[selectedBlockchain].icon}</Text>
            <Text className="text-white text-xs font-semibold">{BLOCKCHAINS[selectedBlockchain].name}</Text>
          </View>
        </View>

        {/* Main Content */}
        <View className="px-6 py-6 gap-6">
          {/* Quick Actions */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Quick Actions</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => router.push('/dashboard')}
                className="flex-1 bg-primary/10 rounded-2xl p-4 items-center border border-primary/20"
              >
                <Text className="text-3xl mb-2">📤</Text>
                <Text className="font-semibold text-foreground text-xs">{t('payment.send')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/dashboard')}
                className="flex-1 bg-primary/10 rounded-2xl p-4 items-center border border-primary/20"
              >
                <Text className="text-3xl mb-2">📥</Text>
                <Text className="font-semibold text-foreground text-xs">{t('payment.receive')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/trading')}
                className="flex-1 bg-primary/10 rounded-2xl p-4 items-center border border-primary/20"
              >
                <Text className="text-3xl mb-2">💱</Text>
                <Text className="font-semibold text-foreground text-xs">{t('trading.swap')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Portfolio Stats */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">Portfolio Stats</Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted mb-2">24h Change</Text>
                <Text className="text-lg font-bold text-success">+12.5%</Text>
              </View>
              <View className="flex-1 bg-surface rounded-2xl p-4 border border-border">
                <Text className="text-xs text-muted mb-2">Total Assets</Text>
                <Text className="text-lg font-bold text-foreground">5 Assets</Text>
              </View>
            </View>
          </View>

          {/* Recent Transactions */}
          <View className="gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-bold text-foreground">{t('dashboard.recentTransactions')}</Text>
              <TouchableOpacity onPress={() => router.push('/dashboard')}>
                <Text className="text-primary text-xs font-semibold">View All</Text>
              </TouchableOpacity>
            </View>

            {[
              { type: 'sent', amount: '0.5', to: '0x1234...5678', status: 'Confirmed', icon: '📤' },
              { type: 'received', amount: '1.2', from: '0x8765...4321', status: 'Confirmed', icon: '📥' },
              { type: 'sent', amount: '0.3', to: '0x9999...0000', status: 'Pending', icon: '⏳' },
            ].map((tx, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => console.log('Transaction detail')}
                className="bg-surface rounded-2xl p-4 border border-border flex-row justify-between items-center"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="bg-primary/10 rounded-full p-2">
                    <Text className="text-lg">{tx.icon}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground text-sm">
                      {tx.type === 'sent' ? t('payment.send') : t('payment.receive')}
                    </Text>
                    <Text className="text-xs text-muted">{tx.type === 'sent' ? tx.to : tx.from}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-foreground">{tx.amount} ETH</Text>
                  <Text className={`text-xs font-medium ${tx.status === 'Confirmed' ? 'text-success' : 'text-warning'}`}>
                    {tx.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Wallet Address Card */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-2">
            <Text className="text-xs text-muted font-semibold">{t('wallet.address')}</Text>
            <TouchableOpacity className="flex-row justify-between items-center">
              <Text className="font-mono text-sm font-bold text-foreground">{address?.slice(0, 10)}...{address?.slice(-8)}</Text>
              <Text className="text-lg">📋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
