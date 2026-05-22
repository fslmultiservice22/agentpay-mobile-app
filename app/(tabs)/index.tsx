import { ScrollView, Text, View, TouchableOpacity, RefreshControl } from "react-native";
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
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (!isConnected) {
    return (
      <ScreenContainer className="p-6">
        <View className="flex-1 justify-center items-center gap-6">
          <Text className="text-3xl font-bold text-foreground">{t('home.title')}</Text>
          <Text className="text-base text-muted text-center">{t('home.subtitle')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/connect-wallet')}
            className="bg-primary px-8 py-3 rounded-full"
          >
            <Text className="text-background font-semibold text-lg">{t('home.connectWallet')}</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-6">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="flex-1 gap-6">
          {/* Network Indicator */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg">{BLOCKCHAINS[selectedBlockchain].icon}</Text>
              <Text className="text-sm font-semibold text-muted">{BLOCKCHAINS[selectedBlockchain].name}</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              className="px-3 py-1 bg-surface rounded-full border border-border"
            >
              <Text className="text-xs text-foreground font-medium">{t('home.settings')}</Text>
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-8 gap-4">
            <Text className="text-sm text-white opacity-80">{t('home.balance')}</Text>
            <Text className="text-5xl font-bold text-white">${balance || '0.00'}</Text>
            <View className="flex-row justify-between pt-4 border-t border-white/20">
              <View>
                <Text className="text-xs text-white opacity-80">USD Balance</Text>
                <Text className="text-lg font-semibold text-white mt-1">${balance || '0.00'}</Text>
              </View>
              <View>
                <Text className="text-xs text-white opacity-80">Gas (BNB)</Text>
                <Text className="text-lg font-semibold text-white mt-1">0.85</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="flex-row gap-4 justify-between">
            <TouchableOpacity
              onPress={() => router.push('/dashboard')}
              className="flex-1 bg-surface rounded-2xl p-4 items-center border border-border"
            >
              <Text className="text-2xl mb-2">📤</Text>
              <Text className="font-semibold text-foreground text-sm">{t('payment.send')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/dashboard')}
              className="flex-1 bg-surface rounded-2xl p-4 items-center border border-border"
            >
              <Text className="text-2xl mb-2">📥</Text>
              <Text className="font-semibold text-foreground text-sm">{t('payment.receive')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/dashboard')}
              className="flex-1 bg-surface rounded-2xl p-4 items-center border border-border"
            >
              <Text className="text-2xl mb-2">📋</Text>
              <Text className="font-semibold text-foreground text-sm">{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Transactions */}
          <View className="gap-3">
            <Text className="text-lg font-bold text-foreground">{t('dashboard.recentTransactions')}</Text>
            {[
              { type: 'sent', amount: '0.5', to: '0x1234...5678', status: 'Confirmed' },
              { type: 'received', amount: '1.2', from: '0x8765...4321', status: 'Confirmed' },
              { type: 'sent', amount: '0.3', to: '0x9999...0000', status: 'Pending' },
            ].map((tx, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => console.log('Transaction detail')}
                className="bg-surface rounded-xl p-4 border border-border flex-row justify-between items-center"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Text className="text-2xl">{tx.type === 'sent' ? '📤' : '📥'}</Text>
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">
                      {tx.type === 'sent' ? t('payment.send') : t('payment.receive')}
                    </Text>
                    <Text className="text-xs text-muted">{tx.type === 'sent' ? tx.to : tx.from}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-foreground">{tx.amount} ETH</Text>
                  <Text className={`text-xs ${tx.status === 'Confirmed' ? 'text-success' : 'text-warning'}`}>
                    {tx.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Wallet Address */}
          <View className="bg-surface rounded-xl p-4 border border-border mt-4">
            <Text className="text-xs text-muted mb-2">{t('wallet.address')}</Text>
            <TouchableOpacity className="flex-row justify-between items-center">
              <Text className="font-mono text-sm text-foreground">{address?.slice(0, 10)}...{address?.slice(-8)}</Text>
              <Text className="text-lg">📋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
