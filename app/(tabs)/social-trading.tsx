import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useSocialTrading } from '@/hooks/use-social-trading';
import { useAuth } from '@/hooks/use-auth';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { CopyTrade, TraderProfile } from '@/lib/social/social-trading-config';

type SocialTab = 'discover' | 'following' | 'copy';
type SortKey = 'roi' | 'winRate' | 'followers' | 'trades';

const SORT_KEYS: SortKey[] = ['roi', 'winRate', 'followers', 'trades'];

const MIN_COPY_PERCENTAGE = 1;
const MAX_COPY_PERCENTAGE = 100;

/** Compact currency formatting used across the trader cards. */
function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function SocialTradingScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const userId = String(user?.id || 'guest');
  const {
    traders,
    isLoading,
    getFollowedTraders,
    followTrader,
    unfollowTrader,
    isFollowing,
    getFollowData,
    getActiveCopyTrades,
    getClosedCopyTrades,
    getTraderTrades,
    createCopyTrade,
    closeCopyTrade,
    refetch,
  } = useSocialTrading(userId);

  const [selectedTab, setSelectedTab] = useState<SocialTab>('discover');
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<TraderProfile | null>(null);
  const [copyPercentage, setCopyPercentage] = useState('50');
  const [autoCopy, setAutoCopy] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('roi');
  const [refreshing, setRefreshing] = useState(false);

  const followedTraders = getFollowedTraders();
  const activeCopyTrades = getActiveCopyTrades();
  const closedCopyTrades = getClosedCopyTrades();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  /** Search and sorting applied to the discover list. */
  const visibleTraders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? traders.filter(
          trader =>
            trader.username.toLowerCase().includes(needle) ||
            trader.bio.toLowerCase().includes(needle),
        )
      : traders;

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'winRate':
          return b.winRate - a.winRate;
        case 'followers':
          return b.followers - a.followers;
        case 'trades':
          return b.totalTrades - a.totalTrades;
        case 'roi':
        default:
          return b.roi - a.roi;
      }
    });
  }, [traders, query, sortKey]);

  const traderById = useMemo(() => {
    const map = new Map<string, TraderProfile>();
    traders.forEach(trader => map.set(trader.id, trader));
    return map;
  }, [traders]);

  const copySummary = useMemo(() => {
    const closedWithProfit = closedCopyTrades.filter(trade => typeof trade.profit === 'number');
    const totalProfit = closedWithProfit.reduce((sum, trade) => sum + (trade.profit ?? 0), 0);
    const winners = closedWithProfit.filter(trade => (trade.profit ?? 0) > 0).length;
    return {
      openCount: activeCopyTrades.length,
      closedCount: closedCopyTrades.length,
      totalProfit,
      winRate: closedWithProfit.length > 0 ? (winners / closedWithProfit.length) * 100 : 0,
    };
  }, [activeCopyTrades, closedCopyTrades]);

  const openFollowModal = useCallback(
    (trader: TraderProfile) => {
      const existing = getFollowData(trader.id);
      setSelectedTrader(trader);
      setCopyPercentage(String(existing?.copyPercentage ?? 50));
      setAutoCopy(existing?.autoTrade ?? false);
      setCopyError(null);
      setShowFollowModal(true);
    },
    [getFollowData],
  );

  const handleFollowTrader = useCallback(async () => {
    if (!selectedTrader) return;

    const percentage = Number(copyPercentage.replace(',', '.'));
    if (!Number.isFinite(percentage) || percentage < MIN_COPY_PERCENTAGE || percentage > MAX_COPY_PERCENTAGE) {
      setCopyError(t('social.invalidCopyPercentage'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    await followTrader(selectedTrader.id, autoCopy, Math.round(percentage));
    setShowFollowModal(false);
    setCopyError(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedTrader, copyPercentage, autoCopy, followTrader, t]);

  /** Unfollowing destroys the copy configuration, so it is confirmed first. */
  const handleUnfollowTrader = useCallback(
    (trader: TraderProfile) => {
      Alert.alert(
        t('social.unfollowTitle'),
        `${t('social.unfollowMessage')} ${trader.username}`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('social.unfollow'),
            style: 'destructive',
            onPress: async () => {
              await unfollowTrader(trader.id);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            },
          },
        ],
      );
    },
    [unfollowTrader, t],
  );

  /** Copies the trader's most recent shared trade with the configured size. */
  const handleCopyLatestTrade = useCallback(
    async (trader: TraderProfile) => {
      const follow = getFollowData(trader.id);
      if (!follow) return;

      const trades = getTraderTrades(trader.id);
      if (trades.length === 0) {
        Alert.alert(t('social.noTradesTitle'), t('social.noTradesMessage'));
        return;
      }

      const latest = trades[0];
      const created = await createCopyTrade(trader.id, latest.id, follow.copyPercentage);
      if (created) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('social.copyCreatedTitle'), `${latest.symbol} · ${follow.copyPercentage}%`);
        setSelectedTab('copy');
      }
    },
    [getFollowData, getTraderTrades, createCopyTrade, t],
  );

  const handleCloseCopyTrade = useCallback(
    (trade: CopyTrade) => {
      const trader = traderById.get(trade.traderId);
      Alert.alert(
        t('trading.closeTrade'),
        `${trader?.username ?? trade.traderId} · ${trade.copyPercentage}%`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('trading.closeTrade'),
            onPress: async () => {
              // Without a live feed the exit is settled at the entry price and
              // the profit is derived from the trader's shared trade.
              const shared = getTraderTrades(trade.traderId).find(item => item.id === trade.tradeId);
              const exitPrice = shared?.exitPrice ?? shared?.entryPrice ?? trade.entryPrice;
              const profit = ((shared?.profit ?? 0) * trade.copyPercentage) / 100;
              await closeCopyTrade(trade.id, exitPrice, profit);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            },
          },
        ],
      );
    },
    [traderById, getTraderTrades, closeCopyTrade, t],
  );

  const sortLabel = useCallback(
    (key: SortKey): string => {
      switch (key) {
        case 'winRate':
          return t('trading.winRate');
        case 'followers':
          return t('social.followers');
        case 'trades':
          return t('trading.trades');
        case 'roi':
        default:
          return t('trading.roi');
      }
    },
    [t],
  );

  const renderTraderCard = (trader: TraderProfile) => {
    const followed = isFollowing(trader.id);
    const follow = getFollowData(trader.id);

    return (
      <Animated.View entering={FadeIn.duration(250)} key={trader.id}>
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
          {/* Header: tapping the identity opens the full trader profile */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => router.push(`/trader-profile?traderId=${trader.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`${t('social.viewProfile')} ${trader.username}`}
            >
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
                  {trader.followers.toLocaleString()} {t('social.followers').toLowerCase()}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => (followed ? handleUnfollowTrader(trader) : openFollowModal(trader))}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: followed ? colors.surface : colors.primary,
                borderWidth: 1,
                borderColor: followed ? colors.error : colors.primary,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: followed ? colors.error : colors.background,
                }}
              >
                {followed ? t('social.unfollow') : t('social.follow')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.winRate')}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.success }}>
                {(trader.winRate * 100).toFixed(1)}%
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.roi')}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: trader.roi >= 0 ? colors.success : colors.error,
                }}
              >
                {trader.roi >= 0 ? '+' : ''}
                {trader.roi.toFixed(1)}%
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.trades')}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
                {trader.totalTrades.toLocaleString()}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.totalProfit')}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: trader.totalProfit >= 0 ? colors.success : colors.error,
                }}
              >
                {formatUsd(trader.totalProfit)}
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18 }}>{trader.bio}</Text>

          {/* Copy configuration, shown only once the trader is followed */}
          {followed && follow && (
            <View
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Text style={{ fontSize: 12, color: colors.muted, flex: 1 }}>
                {t('trading.copyPercentage')}: {follow.copyPercentage}%
                {follow.autoTrade ? ` · ${t('social.autoCopyOn')}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => openFollowModal(trader)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.foreground }}>
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCopyLatestTrade(trader)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  backgroundColor: colors.primary,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.background }}>
                  {t('social.copyLatestTrade')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  const renderCopyTrade = (trade: CopyTrade) => {
    const trader = traderById.get(trade.traderId);
    const profit = trade.profit ?? 0;
    const isOpen = trade.status === 'active' || trade.status === 'pending';

    return (
      <View
        key={trade.id}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>
              {trader?.username ?? trade.traderId}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              {t('trading.copyPercentage')}: {trade.copyPercentage}% ·{' '}
              {new Date(trade.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: isOpen ? `${colors.primary}22` : `${colors.muted}22`,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: isOpen ? colors.primary : colors.muted,
              }}
            >
              {isOpen ? t('trading.active') : t('trading.closed')}
            </Text>
          </View>
        </View>

        {!isOpen && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.totalProfit')}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: profit >= 0 ? colors.success : colors.error,
                }}
              >
                {profit >= 0 ? '+' : ''}
                {formatUsd(profit)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.roi')}</Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: (trade.roi ?? 0) >= 0 ? colors.success : colors.error,
                }}
              >
                {(trade.roi ?? 0).toFixed(2)}%
              </Text>
            </View>
          </View>
        )}

        {isOpen && (
          <TouchableOpacity
            onPress={() => handleCloseCopyTrade(trade)}
            style={{
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
              {t('trading.closeTrade')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.foreground }}>
            {t('social.title')}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
            {t('social.subtitle')}
          </Text>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
          {(['discover', 'following', 'copy'] as const).map(tab => {
            const active = selectedTab === tab;
            const badge =
              tab === 'following'
                ? followedTraders.length
                : tab === 'copy'
                  ? activeCopyTrades.length
                  : 0;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: '600',
                    color: active ? colors.background : colors.foreground,
                  }}
                >
                  {t(`social.tab${tab.charAt(0).toUpperCase()}${tab.slice(1)}`)}
                  {badge > 0 ? ` (${badge})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Discover */}
        {selectedTab === 'discover' && (
          <View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('social.searchPlaceholder')}
              placeholderTextColor={colors.muted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.foreground,
                fontSize: 14,
                marginBottom: 12,
              }}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {SORT_KEYS.map(key => {
                const active = sortKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setSortKey(key)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? `${colors.primary}22` : colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: active ? colors.primary : colors.muted,
                      }}
                    >
                      {sortLabel(key)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isLoading && traders.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 40 }}>
                {t('common.loading')}
              </Text>
            ) : visibleTraders.length > 0 ? (
              visibleTraders.map(trader => renderTraderCard(trader))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.muted }}>{t('social.noTradersFound')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Following */}
        {selectedTab === 'following' && (
          <View>
            {followedTraders.length > 0 ? (
              followedTraders.map(trader => renderTraderCard(trader))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.muted, marginBottom: 12 }}>
                  {t('social.noFollowedTraders')}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedTab('discover')}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Text style={{ color: colors.background, fontWeight: '600', fontSize: 13 }}>
                    {t('social.discoverTraders')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Copy trades */}
        {selectedTab === 'copy' && (
          <View>
            {/* Aggregate summary of the copied positions */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                marginBottom: 16,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <View>
                <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.active')}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>
                  {copySummary.openCount}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.closed')}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>
                  {copySummary.closedCount}
                </Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.winRate')}</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground }}>
                  {copySummary.winRate.toFixed(0)}%
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, color: colors.muted }}>{t('trading.totalProfit')}</Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: copySummary.totalProfit >= 0 ? colors.success : colors.error,
                  }}
                >
                  {copySummary.totalProfit >= 0 ? '+' : ''}
                  {formatUsd(copySummary.totalProfit)}
                </Text>
              </View>
            </View>

            {activeCopyTrades.length === 0 && closedCopyTrades.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.muted, marginBottom: 12 }}>
                  {t('social.noCopyTrades')}
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedTab(followedTraders.length > 0 ? 'following' : 'discover')}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: colors.primary,
                  }}
                >
                  <Text style={{ color: colors.background, fontWeight: '600', fontSize: 13 }}>
                    {followedTraders.length > 0
                      ? t('social.copyLatestTrade')
                      : t('social.discoverTraders')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {activeCopyTrades.length > 0 && (
                  <>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.muted,
                        marginBottom: 8,
                      }}
                    >
                      {t('trading.active')}
                    </Text>
                    {activeCopyTrades.map(trade => renderCopyTrade(trade))}
                  </>
                )}
                {closedCopyTrades.length > 0 && (
                  <>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.muted,
                        marginTop: 8,
                        marginBottom: 8,
                      }}
                    >
                      {t('trading.closed')}
                    </Text>
                    {closedCopyTrades.map(trade => renderCopyTrade(trade))}
                  </>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Follow / copy configuration sheet */}
      <Modal
        visible={showFollowModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFollowModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowFollowModal(false)}
        >
          <Animated.View
            entering={SlideInDown.duration(250)}
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              paddingBottom: 40,
            }}
          >
            <Pressable onPress={() => undefined}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: colors.foreground,
                  marginBottom: 16,
                }}
              >
                {t('social.follow')} {selectedTrader?.username}
              </Text>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>
                  {t('trading.copyPercentage')}
                </Text>
                <TextInput
                  value={copyPercentage}
                  onChangeText={value => {
                    setCopyPercentage(value);
                    setCopyError(null);
                  }}
                  keyboardType="number-pad"
                  placeholder="50"
                  style={{
                    borderWidth: 1,
                    borderColor: copyError ? colors.error : colors.border,
                    borderRadius: 8,
                    padding: 12,
                    color: colors.foreground,
                    fontSize: 14,
                  }}
                  placeholderTextColor={colors.muted}
                />
                <Text style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>
                  {t('social.copyPercentageHint')}
                </Text>
                {copyError && (
                  <Text style={{ fontSize: 11, color: colors.error, marginTop: 6 }}>{copyError}</Text>
                )}

                {/* Quick presets keep the field usable without the keyboard */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  {[10, 25, 50, 100].map(preset => (
                    <TouchableOpacity
                      key={preset}
                      onPress={() => {
                        setCopyPercentage(String(preset));
                        setCopyError(null);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor:
                          copyPercentage === String(preset) ? colors.primary : colors.border,
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color:
                            copyPercentage === String(preset) ? colors.primary : colors.foreground,
                        }}
                      >
                        {preset}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                    {t('social.autoCopy')}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                    {t('social.autoCopyHint')}
                  </Text>
                </View>
                <Switch
                  value={autoCopy}
                  onValueChange={setAutoCopy}
                  trackColor={{ false: colors.border, true: colors.primary }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setShowFollowModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ textAlign: 'center', color: colors.foreground, fontWeight: '600' }}>
                    {t('common.cancel')}
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
                    {t('common.save')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
