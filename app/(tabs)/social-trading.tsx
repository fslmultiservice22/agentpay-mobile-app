import { View, Text, ScrollView, TouchableOpacity, FlatList, Image, Modal, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useSocialTrading } from '@/hooks/use-social-trading';
import { useAuth } from '@/hooks/use-auth';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function SocialTradingScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { user } = useAuth();
  const { traders, follows, getFollowedTraders, followTrader, unfollowTrader, isFollowing } = useSocialTrading(String(user?.id || 'guest'));

  const [selectedTab, setSelectedTab] = useState<'discover' | 'following' | 'copy'>('discover');
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<any>(null);
  const [copyPercentage, setCopyPercentage] = useState('50');

  const followedTraders = getFollowedTraders();

  const handleFollowTrader = async () => {
    if (selectedTrader) {
      const percentage = parseInt(copyPercentage, 10) || 50;
      await followTrader(selectedTrader.id, false, percentage);
      setShowFollowModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleUnfollowTrader = async (traderId: string) => {
    await unfollowTrader(traderId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderTraderCard = (trader: any) => {
    const isFollowed = isFollowing(trader.id);

    return (
      <Animated.View entering={FadeIn.duration(300)} key={trader.id}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Image
              source={{ uri: trader.avatar }}
              style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
                {trader.username}
                {trader.verified && ' ✓'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>
                {trader.followers.toLocaleString()} followers
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (isFollowed) {
                  handleUnfollowTrader(trader.id);
                } else {
                  setSelectedTrader(trader);
                  setShowFollowModal(true);
                }
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: isFollowed ? colors.error : colors.primary,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.background }}>
                {isFollowed ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>Win Rate</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
                {(trader.winRate * 100).toFixed(1)}%
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>ROI</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
                {trader.roi.toFixed(1)}%
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>Trades</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
                {trader.totalTrades}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>Profit</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
                ${(trader.totalProfit / 1000).toFixed(1)}K
              </Text>
            </View>
          </View>

          {/* Bio */}
          <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>{trader.bio}</Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground }}>
            Social Trading
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            Follow top traders and copy their strategies
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
          {(['discover', 'following', 'copy'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor: selectedTab === tab ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: selectedTab === tab ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: '600',
                  color: selectedTab === tab ? colors.background : colors.foreground,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {selectedTab === 'discover' && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
              Top Traders
            </Text>
            {traders.map((trader) => renderTraderCard(trader))}
          </View>
        )}

        {selectedTab === 'following' && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
              Following ({followedTraders.length})
            </Text>
            {followedTraders.length > 0 ? (
              followedTraders.map((trader) => renderTraderCard(trader))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.muted }}>No traders followed yet</Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'copy' && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 12 }}>
              Active Copy Trades
            </Text>
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.muted }}>No active copy trades</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Follow Modal */}
      <Modal visible={showFollowModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <Animated.View
            entering={SlideInRight.duration(300)}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 40,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 16 }}>
              Follow {selectedTrader?.username}
            </Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>Copy Percentage</Text>
              <TextInput
                value={copyPercentage}
                onChangeText={setCopyPercentage}
                keyboardType="number-pad"
                placeholder="50"
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  color: colors.foreground,
                  fontSize: 14,
                }}
                placeholderTextColor={colors.muted}
              />
              <Text style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>
                Enter percentage of your balance to copy (1-100%)
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowFollowModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.border,
                }}
              >
                <Text style={{ textAlign: 'center', color: colors.foreground, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleFollowTrader}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ textAlign: 'center', color: colors.background, fontWeight: '600' }}>
                  Follow
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
