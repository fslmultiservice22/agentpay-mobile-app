import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useTraderLeaderboard } from '@/hooks/use-trader-leaderboard';
import Animated, { SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

type MetricType = 'roi' | 'winRate' | 'profit' | 'followers' | 'trades';
type TimeframeType = '24h' | '7d' | '30d' | 'all';

export default function LeaderboardScreen() {
  const colors = useColors();
  useI18n();
  const { getLeaderboardByMetric, getLeaderboardByTimeframe, getTopTradersForMetric } = useTraderLeaderboard();

  const [selectedMetric, setSelectedMetric] = useState<MetricType>('roi');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('all');

  const handleMetricChange = (newMetric: MetricType) => {
    setSelectedMetric(newMetric);
    getLeaderboardByMetric(newMetric);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTimeframeChange = (newTimeframe: TimeframeType) => {
    setSelectedTimeframe(newTimeframe);
    getLeaderboardByTimeframe(newTimeframe);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const topTraders = getTopTradersForMetric(10);

  const renderTraderRow = (entry: any, index: number) => {
    const isTopThree = index < 3;
    const medalEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${entry.rank}`;

    return (
      <Animated.View entering={SlideInRight.delay(index * 50).duration(300)} key={entry.traderId}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 12,
            marginBottom: 8,
            backgroundColor: isTopThree ? colors.surface : colors.background,
            borderRadius: 12,
            borderWidth: isTopThree ? 2 : 1,
            borderColor: isTopThree ? colors.primary : colors.border,
          }}
        >
          {/* Rank */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.primary,
              width: 40,
              textAlign: 'center',
            }}
          >
            {medalEmoji}
          </Text>

          {/* Avatar & Name */}
          <Image
            source={{ uri: entry.avatar }}
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
              {entry.username}
              {entry.verified && ' ✓'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {entry.followers.toLocaleString()} followers
            </Text>
          </View>

          {/* Metric Value */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.success }}>
              {entry.metricLabel}
            </Text>
            {entry.trend && (
              <Text
                style={{
                  fontSize: 10,
                  color: entry.trend === 'up' ? colors.success : entry.trend === 'down' ? colors.error : colors.muted,
                }}
              >
                {entry.trend === 'up' ? '↑' : entry.trend === 'down' ? '↓' : '→'} {entry.trendValue?.toFixed(1)}%
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground }}>Leaderboard</Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            Top traders ranked by performance
          </Text>
        </View>

        {/* Metric Selector */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>
            Metric
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            {(['roi', 'winRate', 'profit', 'followers', 'trades'] as MetricType[]).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => handleMetricChange(m)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: selectedMetric === m ? colors.primary : colors.surface,
                  marginHorizontal: 4,
                  borderWidth: 1,
                  borderColor: selectedMetric === m ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: selectedMetric === m ? colors.background : colors.foreground,
                    textTransform: 'capitalize',
                  }}
                >
                  {m === 'winRate' ? 'Win Rate' : m === 'followers' ? 'Followers' : m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Timeframe Selector */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 8 }}>
            Timeframe
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['24h', '7d', '30d', 'all'] as TimeframeType[]).map((tf) => (
              <TouchableOpacity
                key={tf}
                onPress={() => handleTimeframeChange(tf)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: selectedTimeframe === tf ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: selectedTimeframe === tf ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: '600',
                    color: selectedTimeframe === tf ? colors.background : colors.foreground,
                  }}
                >
                  {tf}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Leaderboard */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
            Top 10 Traders
          </Text>
          {topTraders.length > 0 ? (
            topTraders.map((entry, index) => renderTraderRow(entry, index))
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: colors.muted }}>Nessun trader disponibile</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
