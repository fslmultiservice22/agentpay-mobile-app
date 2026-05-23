import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useEthereumWallet } from '@/hooks/use-ethereum-wallet';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { maskEthereumAddress } from '@/lib/ethereum-validator';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { t } = useI18n();
  const { wallet, loading: walletLoading, refreshWallet, disconnectWallet } = useEthereumWallet();
  const { accounts, loading: bankLoading } = useBankAccounts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    if (wallet) {
      await refreshWallet();
    }
    setRefreshing(false);
  };

  const handleConnectWallet = () => {
    router.push('/wallet-connect');
  };

  const handleConnectBank = () => {
    router.push('/bank-account-connect');
  };

  const handleViewPortfolio = () => {
    router.push('/(tabs)/portfolio');
  };

  const handleTransferCredit = () => {
    router.push('/credit-transfer');
  };

  const handleManageBank = () => {
    router.push('/bank-accounts-manage');
  };

  const handleTransferHistory = () => {
    router.push('/transfer-history');
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View className="bg-gradient-to-b from-primary to-primary/80 px-6 py-8 gap-4">
          <Text className="text-4xl font-bold text-white">{t('home.title')}</Text>
          <Text className="text-base text-white/80">{t('home.subtitle')}</Text>
        </View>

        {/* Wallet Status Card */}
        <View className="px-6 py-6 gap-4">
          {wallet ? (
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-foreground">Connected Wallet</Text>
                <TouchableOpacity onPress={disconnectWallet}>
                  <Text className="text-sm text-error font-semibold">Disconnect</Text>
                </TouchableOpacity>
              </View>
              <Text className="text-sm text-muted">{maskEthereumAddress(wallet.address)}</Text>
              <View className="bg-background rounded-lg p-4 gap-2">
                <Text className="text-xs text-muted">Total Value</Text>
                <Text className="text-2xl font-bold text-foreground">
                  ${wallet.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
                <Text className={`text-sm font-semibold ${wallet.totalChange >= 0 ? 'text-success' : 'text-error'}`}>
                  {wallet.totalChange >= 0 ? '↑' : '↓'} ${Math.abs(wallet.totalChange).toLocaleString('en-US', { minimumFractionDigits: 2 })} ({wallet.totalChangePercent.toFixed(2)}%)
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleViewPortfolio}
                className="bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">View Portfolio</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <Text className="text-lg font-semibold text-foreground">Connect Your Wallet</Text>
              <Text className="text-sm text-muted">
                Connect your Ethereum wallet to view your assets and manage your portfolio across multiple chains.
              </Text>
              <TouchableOpacity
                onPress={handleConnectWallet}
                className="bg-primary rounded-lg py-3 items-center"
              >
                {walletLoading ? (
                  <ActivityIndicator color={colors.background} size="small" />
                ) : (
                  <Text className="text-white font-semibold">{t('wallet.connect')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bank Account Status Card */}
        <View className="px-6 pb-6 gap-4">
          {accounts && accounts.length > 0 ? (
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <View className="flex-row justify-between items-center">
                <Text className="text-lg font-semibold text-foreground">Bank Accounts</Text>
                <Text className="text-sm text-primary font-semibold">{accounts.length}</Text>
              </View>
              {accounts.slice(0, 2).map((account) => (
                <View key={account.id} className="bg-background rounded-lg p-3 gap-1">
                <Text className="text-sm font-semibold text-foreground">{account.accountHolder}</Text>
                <Text className="text-xs text-muted">{account.maskedIBAN}</Text>
                  {account.isDefault && (
                    <Text className="text-xs text-success font-semibold">Default Account</Text>
                  )}
                </View>
              ))}
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleTransferCredit}
                  className="flex-1 bg-primary rounded-lg py-2 items-center"
                >
                  <Text className="text-white font-semibold text-sm">Transfer Credit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleManageBank}
                  className="flex-1 bg-border rounded-lg py-2 items-center"
                >
                  <Text className="text-foreground font-semibold text-sm">Manage</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
              <Text className="text-lg font-semibold text-foreground">Connect Bank Account</Text>
              <Text className="text-sm text-muted">
                Add your bank account to transfer credit directly to your IBAN.
              </Text>
              <TouchableOpacity
                onPress={handleConnectBank}
                className="bg-primary rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">{t('bank.connect')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View className="px-6 pb-6 gap-4">
          <Text className="text-lg font-semibold text-foreground">Quick Actions</Text>
          <View className="gap-3">
            {wallet && (
              <TouchableOpacity
                onPress={handleViewPortfolio}
                className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">📊</Text>
                  <View>
                    <Text className="font-semibold text-foreground">Portfolio</Text>
                    <Text className="text-xs text-muted">View your assets</Text>
                  </View>
                </View>
                <Text className="text-lg">→</Text>
              </TouchableOpacity>
            )}

            {accounts && accounts.length > 0 && (
              <TouchableOpacity
                onPress={handleTransferHistory}
                className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">📋</Text>
                  <View>
                    <Text className="font-semibold text-foreground">Transfer History</Text>
                    <Text className="text-xs text-muted">View your transfers</Text>
                  </View>
                </View>
                <Text className="text-lg">→</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/settings')}
              className="bg-surface rounded-lg p-4 border border-border flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">⚙️</Text>
                <View>
                  <Text className="font-semibold text-foreground">Settings</Text>
                  <Text className="text-xs text-muted">Manage your account</Text>
                </View>
              </View>
              <Text className="text-lg">→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Section */}
        <View className="px-6 pb-6 gap-4">
          <Text className="text-lg font-semibold text-foreground">Features</Text>
          <View className="gap-3">
            <View className="bg-surface rounded-lg p-4 border border-border flex-row gap-3">
              <Text className="text-2xl">🔒</Text>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">Secure & Private</Text>
                <Text className="text-xs text-muted">Your keys, your funds</Text>
              </View>
            </View>
            <View className="bg-surface rounded-lg p-4 border border-border flex-row gap-3">
              <Text className="text-2xl">⚡</Text>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">Multi-Chain Support</Text>
                <Text className="text-xs text-muted">Ethereum, Polygon, Arbitrum, Optimism</Text>
              </View>
            </View>
            <View className="bg-surface rounded-lg p-4 border border-border flex-row gap-3">
              <Text className="text-2xl">💳</Text>
              <View className="flex-1">
                <Text className="font-semibold text-foreground">Bank Integration</Text>
                <Text className="text-xs text-muted">Transfer to your IBAN</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
