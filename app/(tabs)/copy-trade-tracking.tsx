import { ScrollView, View, Text, Pressable, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useCopyTradeTracking } from '@/hooks/use-copy-trade-tracking';
import { useI18n } from '@/hooks/use-i18n';
import { useColors } from '@/hooks/use-colors';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';

type TabType = 'active' | 'closed' | 'metrics';

export default function CopyTradeTrackingScreen() {
  const { t } = useI18n();
  const colors = useColors();
  const { copyTrades, metrics, getActiveCopyTrades, getClosedCopyTrades, closeCopyTrade } =
    useCopyTradeTracking();
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCloseTrade = async (tradeId: string) => {
    const trade = copyTrades.find((t) => t.id === tradeId);
    if (trade) {
      await closeCopyTrade(tradeId, trade.currentPrice);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const activeTrades = getActiveCopyTrades();
  const closedTrades = getClosedCopyTrades();

  return (
    <ScreenContainer className="bg-background">
      {/* Header */}
      <View className="bg-surface rounded-2xl p-6 mb-6">
        <Text className="text-2xl font-bold text-foreground mb-2">{t('trading.copyTrades')}</Text>
        <Text className="text-sm text-muted">{t('trading.trackPerformance')}</Text>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row gap-2 mb-6">
        <Pressable
          onPress={() => handleTabChange('active')}
          style={({ pressed }) => [
            {
              backgroundColor: activeTab === 'active' ? colors.primary : colors.surface,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          className="flex-1 py-3 rounded-lg items-center"
        >
          <Text
            className={`font-semibold ${activeTab === 'active' ? 'text-background' : 'text-foreground'}`}
          >
            {t('trading.active')} ({activeTrades.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabChange('closed')}
          style={({ pressed }) => [
            {
              backgroundColor: activeTab === 'closed' ? colors.primary : colors.surface,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          className="flex-1 py-3 rounded-lg items-center"
        >
          <Text
            className={`font-semibold ${activeTab === 'closed' ? 'text-background' : 'text-foreground'}`}
          >
            {t('trading.closed')} ({closedTrades.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleTabChange('metrics')}
          style={({ pressed }) => [
            {
              backgroundColor: activeTab === 'metrics' ? colors.primary : colors.surface,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          className="flex-1 py-3 rounded-lg items-center"
        >
          <Text
            className={`font-semibold ${activeTab === 'metrics' ? 'text-background' : 'text-foreground'}`}
          >
            {t('trading.metrics')}
          </Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Active Trades Tab */}
        {activeTab === 'active' && (
          <View>
            {activeTrades.length > 0 ? (
              <FlatList
                data={activeTrades}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View className="bg-surface rounded-2xl p-4 mb-4">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-foreground">
                          {item.fromToken} → {item.toToken}
                        </Text>
                        <Text className="text-sm text-muted">{item.traderName}</Text>
                      </View>
                      <Text
                        className={`text-lg font-bold ${
                          item.profit > 0 ? 'text-success' : 'text-error'
                        }`}
                      >
                        {item.profit > 0 ? '+' : ''}{item.profit.toFixed(2)}
                      </Text>
                    </View>

                    <View className="gap-2 mb-4">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted">{t('trading.roi')}</Text>
                        <Text className="font-semibold text-foreground">
                          {item.roi.toFixed(2)}%
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted">{t('trading.copyPercentage')}</Text>
                        <Text className="font-semibold text-foreground">
                          {item.copyPercentage.toFixed(1)}%
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted">{t('trading.currentPrice')}</Text>
                        <Text className="font-semibold text-foreground">
                          ${item.currentPrice.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => handleCloseTrade(item.id)}
                      style={({ pressed }) => [
                        { opacity: pressed ? 0.8 : 1 },
                      ]}
                      className="bg-error py-2 rounded-lg items-center"
                    >
                      <Text className="text-background font-semibold">{t('trading.closeTrade')}</Text>
                    </Pressable>
                  </View>
                )}
              />
            ) : (
              <View className="items-center justify-center py-8">
                <Text className="text-muted">{t('common.noData')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Closed Trades Tab */}
        {activeTab === 'closed' && (
          <View>
            {closedTrades.length > 0 ? (
              <FlatList
                data={closedTrades}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View className="bg-surface rounded-2xl p-4 mb-4">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-foreground">
                          {item.fromToken} → {item.toToken}
                        </Text>
                        <Text className="text-sm text-muted">{item.traderName}</Text>
                      </View>
                      <Text
                        className={`text-lg font-bold ${
                          item.profit > 0 ? 'text-success' : 'text-error'
                        }`}
                      >
                        {item.profit > 0 ? '+' : ''}{item.profit.toFixed(2)}
                      </Text>
                    </View>

                    <View className="gap-2">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted">{t('trading.roi')}</Text>
                        <Text className="font-semibold text-foreground">
                          {item.roi.toFixed(2)}%
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-muted">{t('trading.closedAt')}</Text>
                        <Text className="font-semibold text-foreground">
                          {item.closedAt ? new Date(item.closedAt).toLocaleDateString() : 'N/A'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View className="items-center justify-center py-8">
                <Text className="text-muted">{t('common.noData')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && metrics && (
          <View className="gap-4">
            <View className="bg-surface rounded-2xl p-4">
              <Text className="text-lg font-bold text-foreground mb-4">{t('trading.summary')}</Text>

              <View className="gap-3">
                <View className="flex-row justify-between p-2 bg-background rounded-lg">
                  <Text className="text-muted">{t('trading.totalProfit')}</Text>
                  <Text
                    className={`font-bold ${metrics.totalProfit > 0 ? 'text-success' : 'text-error'}`}
                  >
                    {metrics.totalProfit > 0 ? '+' : ''}{metrics.totalProfit.toFixed(2)}
                  </Text>
                </View>

                <View className="flex-row justify-between p-2 bg-background rounded-lg">
                  <Text className="text-muted">{t('trading.averageROI')}</Text>
                  <Text className="font-bold text-foreground">{metrics.averageROI.toFixed(2)}%</Text>
                </View>

                <View className="flex-row justify-between p-2 bg-background rounded-lg">
                  <Text className="text-muted">{t('trading.winRate')}</Text>
                  <Text className="font-bold text-foreground">
                    {(metrics.winRate * 100).toFixed(1)}%
                  </Text>
                </View>

                <View className="flex-row justify-between p-2 bg-background rounded-lg">
                  <Text className="text-muted">{t('trading.profitFactor')}</Text>
                  <Text className="font-bold text-foreground">{metrics.profitFactor.toFixed(2)}</Text>
                </View>

                <View className="flex-row justify-between p-2 bg-background rounded-lg">
                  <Text className="text-muted">{t('trading.correlation')}</Text>
                  <Text className="font-bold text-foreground">
                    {(metrics.correlationWithTrader * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>

            {metrics.bestPerformingCopy && (
              <View className="bg-surface rounded-2xl p-4">
                <Text className="text-lg font-bold text-foreground mb-3">{t('trading.best')}</Text>
                <View className="bg-background rounded-lg p-3">
                  <Text className="font-semibold text-foreground">
                    {metrics.bestPerformingCopy.fromToken} → {metrics.bestPerformingCopy.toToken}
                  </Text>
                  <Text className="text-sm text-success mt-1">
                    +{metrics.bestPerformingCopy.roi.toFixed(2)}%
                  </Text>
                </View>
              </View>
            )}

            {metrics.worstPerformingCopy && (
              <View className="bg-surface rounded-2xl p-4">
                <Text className="text-lg font-bold text-foreground mb-3">{t('trading.worst')}</Text>
                <View className="bg-background rounded-lg p-3">
                  <Text className="font-semibold text-foreground">
                    {metrics.worstPerformingCopy.fromToken} → {metrics.worstPerformingCopy.toToken}
                  </Text>
                  <Text className="text-sm text-error mt-1">
                    {metrics.worstPerformingCopy.roi.toFixed(2)}%
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
