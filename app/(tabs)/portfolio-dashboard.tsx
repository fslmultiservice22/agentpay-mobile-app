import { ScrollView, Text, View, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { usePortfolioDashboard } from '@/hooks/use-portfolio-dashboard';
import { useI18n } from '@/hooks/use-i18n';
import { useColors } from '@/hooks/use-colors';
import { useEthereumWallet } from '@/lib/web3/wallet-context';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const chartWidth = Dimensions.get('window').width - 32;
const chartHeight = 220;

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    strokeWidth?: number;
    color?: (opacity: number) => string;
  }>;
}

export default function PortfolioDashboardScreen() {
  const { t } = useI18n();
  const colors = useColors();
  const { wallets } = useEthereumWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // Mock holdings for demo
  const mockHoldings = useMemo(
    () => ({
      ETH: 2.5,
      USDC: 5000,
      MATIC: 1000,
      NEAR: 100,
    }),
    []
  );

  const { assets, totalValue, totalChangePercentage_24h, refresh, loading } =
    usePortfolioDashboard(mockHoldings);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Prepare pie chart data
  const pieChartData = useMemo(() => {
    if (assets.length === 0) return null;

    const colors_array = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
    ];

    return {
      labels: assets.map((a) => a.symbol),
      datasets: [
        {
          data: assets.map((a) => a.value),
        },
      ],
      colors: assets.map((_, i) => colors_array[i % colors_array.length]),
    };
  }, [assets]);

  // Prepare line chart data for price history
  const lineChartData = useMemo((): ChartData => {
    if (assets.length === 0) {
      return {
        labels: ['', '', '', '', '', ''],
        datasets: [{ data: [0, 0, 0, 0, 0, 0] }],
      };
    }

    // Generate mock price history
    const days = timeRange === '24h' ? 24 : timeRange === '7d' ? 7 : 30;
    const labels = Array.from({ length: Math.min(6, days) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    // Simulate price data
    const baseValue = totalValue;
    const volatility = baseValue * 0.05; // 5% volatility
    const data = Array.from({ length: labels.length }, (_, i) => {
      const variation = Math.sin(i * 0.5) * volatility;
      return Math.max(0, baseValue - volatility + variation);
    });

    return {
      labels,
      datasets: [
        {
          data,
          strokeWidth: 2,
          color: (opacity) => `rgba(76, 175, 80, ${opacity})`,
        },
      ],
    };
  }, [assets, totalValue, timeRange]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const changeColor = totalChangePercentage_24h >= 0 ? '#4CAF50' : '#F44336';

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="p-4 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-sm text-muted">{t('portfolio.totalValue')}</Text>
            <Text className="text-4xl font-bold text-foreground">
              {formatCurrency(totalValue)}
            </Text>
            <Text style={{ color: changeColor }} className="text-lg font-semibold">
              {formatPercentage(totalChangePercentage_24h)} {t('portfolio.last24h')}
            </Text>
          </View>

          {/* Time Range Selector */}
          <View className="flex-row gap-2">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <Pressable
                key={range}
                onPress={() => setTimeRange(range)}
                className={`flex-1 py-2 px-3 rounded-lg ${
                  timeRange === range ? 'bg-primary' : 'bg-surface'
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    timeRange === range ? 'text-background' : 'text-foreground'
                  }`}
                >
                  {range}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Price Chart */}
          {!loading && lineChartData.datasets[0].data.length > 0 && (
            <View className="bg-surface rounded-2xl p-4 gap-2">
              <Text className="text-lg font-semibold text-foreground">
                {t('portfolio.priceChart')}
              </Text>
              <LineChart
                data={lineChartData}
                width={chartWidth}
                height={chartHeight}
                chartConfig={{
                  backgroundColor: colors.surface,
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  color: (opacity) => `rgba(0, 0, 0, ${opacity})`,
                  strokeWidth: 2,
                  useShadowColorFromDataset: false,
                }}
                bezier
                style={{ borderRadius: 12 }}
              />
            </View>
          )}

          {/* Portfolio Composition */}
          {pieChartData && !loading && (
            <View className="bg-surface rounded-2xl p-4 gap-2">
              <Text className="text-lg font-semibold text-foreground">
                {t('portfolio.composition')}
              </Text>
              <PieChart
                data={pieChartData}
                width={chartWidth}
                height={chartHeight}
                chartConfig={{
                  color: (opacity) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="data"
                backgroundColor="transparent"
                paddingLeft="15"
                center={[chartWidth / 2 - 16, 0]}
              />
            </View>
          )}

          {/* Assets List */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">{t('portfolio.assets')}</Text>
            {assets.map((asset) => (
              <View
                key={asset.symbol}
                className="bg-surface rounded-xl p-4 flex-row items-center justify-between"
              >
                <View className="flex-1 gap-1">
                  <Text className="text-base font-semibold text-foreground">
                    {asset.symbol}
                  </Text>
                  <Text className="text-sm text-muted">
                    {asset.amount.toFixed(4)} {asset.symbol}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="text-base font-semibold text-foreground">
                    {formatCurrency(asset.value)}
                  </Text>
                  <Text
                    style={{ color: asset.change_percentage_24h >= 0 ? '#4CAF50' : '#F44336' }}
                    className="text-sm font-semibold"
                  >
                    {formatPercentage(asset.change_percentage_24h)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Empty State */}
          {assets.length === 0 && !loading && (
            <View className="items-center justify-center py-12 gap-2">
              <Text className="text-lg text-muted">{t('portfolio.noAssets')}</Text>
              <Pressable className="bg-primary px-6 py-2 rounded-lg">
                <Text className="text-background font-semibold">{t('portfolio.addAssets')}</Text>
              </Pressable>
            </View>
          )}

          {/* Loading State */}
          {loading && (
            <View className="items-center justify-center py-12">
              <Text className="text-muted">{t('common.loading')}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
