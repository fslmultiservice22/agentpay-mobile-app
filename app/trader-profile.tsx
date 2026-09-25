import { ScrollView, View, Text, Image, Pressable, FlatList , Animated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useTraderProfile } from '@/hooks/use-trader-profile';
import { useI18n } from '@/hooks/use-i18n';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';

export default function TraderProfileScreen() {
  const { traderId } = useLocalSearchParams<{ traderId: string }>();
  const { t } = useI18n();
  const colors = useColors();
  const {
    profile,
    isLoading,
    getTraderStats,
    getTraderRankings,
    getTradeHistory,
    getTraderPerformance,
    followTrader,
    unfollowTrader,
    isFollowing: checkIsFollowing,
  } = useTraderProfile(traderId || '');

  const [isFollowing, setIsFollowing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkFollowing = async () => {
      const following = await checkIsFollowing();
      setIsFollowing(following);
    };
    checkFollowing();
  }, [checkIsFollowing]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleFollowPress = async () => {
    if (isFollowing) {
      await unfollowTrader();
      setIsFollowing(false);
    } else {
      await followTrader();
      setIsFollowing(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground">{t('common.loading')}</Text>
      </ScreenContainer>
    );
  }

  if (!profile) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground">{t('common.error')}</Text>
      </ScreenContainer>
    );
  }

  const stats = getTraderStats();
  const rankings = getTraderRankings();
  const performance = getTraderPerformance();
  const trades = getTradeHistory(10);

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={{ opacity: fadeAnim }} className="items-center gap-4 p-6 bg-surface rounded-2xl mb-6">
          <Image
            source={{ uri: profile.avatar }}
            className="w-24 h-24 rounded-full border-2"
            style={{ borderColor: colors.primary }}
          />

          <View className="items-center">
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl font-bold text-foreground">{profile.username}</Text>
              {profile.verified && <Text className="text-lg">✓</Text>}
            </View>
            <Text className="text-sm text-muted">{profile.bio}</Text>
          </View>

          {/* Stats Row */}
          <View className="flex-row gap-4 w-full justify-around">
            <View className="items-center">
              <Text className="text-lg font-bold text-primary">{profile.followers}</Text>
              <Text className="text-xs text-muted">{t('social.followers')}</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-primary">{profile.following}</Text>
              <Text className="text-xs text-muted">{t('social.following')}</Text>
            </View>
            <View className="items-center">
              <Text className="text-lg font-bold text-primary">{stats?.totalTrades || 0}</Text>
              <Text className="text-xs text-muted">{t('trading.trades')}</Text>
            </View>
          </View>

          {/* Follow Button */}
          <Pressable
            onPress={handleFollowPress}
            style={({ pressed }) => [
              {
                backgroundColor: isFollowing ? colors.surface : colors.primary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            className="w-full py-3 rounded-lg items-center"
          >
            <Text
              className={`font-semibold ${isFollowing ? 'text-foreground' : 'text-background'}`}
            >
              {isFollowing ? t('social.following') : t('social.follow')}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Performance Section */}
        {performance && (
          <View className="bg-surface rounded-2xl p-4 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">{t('trading.performance')}</Text>

            <View className="gap-3">
              <View className="flex-row justify-between items-center p-3 bg-background rounded-lg">
                <Text className="text-muted">{t('trading.level')}</Text>
                <Text className="font-bold text-foreground capitalize">{performance.level}</Text>
              </View>

              <View className="flex-row justify-between items-center p-3 bg-background rounded-lg">
                <Text className="text-muted">{t('trading.score')}</Text>
                <Text className="font-bold text-primary">{performance.score.toFixed(1)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Rankings Section */}
        {rankings && (
          <View className="bg-surface rounded-2xl p-4 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">{t('trading.rankings')}</Text>

            <View className="gap-2">
              <View className="flex-row justify-between p-2">
                <Text className="text-muted">{t('trading.winRate')}</Text>
                <Text className="font-bold text-foreground">{rankings.winRate}</Text>
              </View>
              <View className="flex-row justify-between p-2">
                <Text className="text-muted">{t('trading.roi')}</Text>
                <Text className="font-bold text-foreground">{rankings.roi}</Text>
              </View>
              <View className="flex-row justify-between p-2">
                <Text className="text-muted">{t('trading.profitFactor')}</Text>
                <Text className="font-bold text-foreground">{rankings.profitFactor}</Text>
              </View>
              <View className="flex-row justify-between p-2">
                <Text className="text-muted">{t('trading.sharpeRatio')}</Text>
                <Text className="font-bold text-foreground">{rankings.sharpeRatio}</Text>
              </View>
              <View className="flex-row justify-between p-2">
                <Text className="text-muted">{t('trading.maxDrawdown')}</Text>
                <Text className="font-bold text-foreground">{rankings.maxDrawdown}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent Trades Section */}
        <View className="bg-surface rounded-2xl p-4 mb-6">
          <Text className="text-lg font-bold text-foreground mb-4">{t('trading.recentTrades')}</Text>

          {trades.length > 0 ? (
            <FlatList
              data={trades}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <View
                  key={index}
                  className="flex-row justify-between items-center p-3 border-b border-border"
                >
                  <View className="flex-1">
                    <Text className="font-semibold text-foreground">
                      {item.fromToken} → {item.toToken}
                    </Text>
                    <Text className="text-xs text-muted">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    className={`font-bold ${
                      (item.profit || 0) > 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {(item.profit || 0) > 0 ? '+' : ''}{(item.profit || 0).toFixed(2)}
                  </Text>
                </View>
              )}
            />
          ) : (
            <Text className="text-center text-muted py-4">{t('common.noData')}</Text>
          )}
        </View>

        {/* Social Links */}
        {profile.socialLinks && (
          <View className="bg-surface rounded-2xl p-4 mb-6">
            <Text className="text-lg font-bold text-foreground mb-4">{t('social.connect')}</Text>

            <View className="gap-2">
              {profile.socialLinks.twitter && (
                <Pressable className="p-3 bg-background rounded-lg flex-row items-center">
                  <Text className="text-primary mr-2">𝕏</Text>
                  <Text className="text-foreground flex-1">{profile.socialLinks.twitter}</Text>
                </Pressable>
              )}
              {profile.socialLinks.discord && (
                <Pressable className="p-3 bg-background rounded-lg flex-row items-center">
                  <Text className="text-primary mr-2">💬</Text>
                  <Text className="text-foreground flex-1">{profile.socialLinks.discord}</Text>
                </Pressable>
              )}
              {profile.socialLinks.telegram && (
                <Pressable className="p-3 bg-background rounded-lg flex-row items-center">
                  <Text className="text-primary mr-2">✈️</Text>
                  <Text className="text-foreground flex-1">{profile.socialLinks.telegram}</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
