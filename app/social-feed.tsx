import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  FlatList,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

const SOCIAL_FEED_KEY = 'agentpay_social_feed';
const SOCIAL_ACCOUNTS_KEY = 'social_accounts';

interface SocialPost {
  id: string;
  platform: string;
  text: string;
  timestamp: number;
  type: 'trade' | 'milestone' | 'achievement' | 'savings' | 'manual';
  metadata?: Record<string, string | number>;
}

interface SocialAccount {
  platform: string;
  username: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  instagram: '#E1306C',
  facebook: '#1877F2',
  discord: '#5865F2',
  telegram: '#26A5E4',
  linkedin: '#0A66C2',
  tiktok: '#010101',
  youtube: '#FF0000',
};

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'X',
  instagram: 'IG',
  facebook: 'FB',
  discord: 'DC',
  telegram: 'TG',
  linkedin: 'LI',
  tiktok: 'TT',
  youtube: 'YT',
};

const PLATFORM_NAMES: Record<string, string> = {
  twitter: 'Twitter/X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  discord: 'Discord',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

const TYPE_LABELS: Record<string, string> = {
  trade: 'Trade',
  milestone: 'Milestone',
  achievement: 'Achievement',
  savings: 'Risparmio',
  manual: 'Manuale',
};

const TYPE_ICONS: Record<string, string> = {
  trade: '📈',
  milestone: '🏆',
  achievement: '🎯',
  savings: '💰',
  manual: '✏️',
};

export default function SocialFeedScreen() {
  const router = useRouter();
  const colors = useColors();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [rawPosts, rawAccounts] = await Promise.all([
        AsyncStorage.getItem(SOCIAL_FEED_KEY),
        AsyncStorage.getItem(SOCIAL_ACCOUNTS_KEY),
      ]);
      if (rawPosts) setPosts(JSON.parse(rawPosts));
      if (rawAccounts) setAccounts(JSON.parse(rawAccounts));
    } catch (e) {
      console.error('Error loading social feed:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleDelete = useCallback((postId: string) => {
    Alert.alert(
      'Elimina post',
      'Vuoi eliminare questo post dal feed?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            const updated = posts.filter(p => p.id !== postId);
            setPosts(updated);
            await AsyncStorage.setItem(SOCIAL_FEED_KEY, JSON.stringify(updated));
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }, [posts]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      'Svuota feed',
      'Vuoi eliminare tutti i post dal feed?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Svuota tutto',
          style: 'destructive',
          onPress: async () => {
            setPosts([]);
            await AsyncStorage.setItem(SOCIAL_FEED_KEY, JSON.stringify([]));
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }, []);

  const filteredPosts = posts.filter(p => {
    if (filterPlatform && p.platform !== filterPlatform) return false;
    if (filterType && p.type !== filterType) return false;
    return true;
  }).sort((a, b) => b.timestamp - a.timestamp);

  const connectedPlatforms = accounts.map(a => a.platform);

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Adesso';
    if (diff < 3600) return Math.floor(diff / 60) + 'm fa';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h fa';
    const d = new Date(ts);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { fontSize: 18, color: colors.foreground },
    title: { fontSize: 20, fontWeight: '700', color: colors.foreground, flex: 1 },
    deleteAllBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: '#EF444415',
    },
    deleteAllText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
    filterRow: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 8,
    },
    filterLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    filterChips: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    chipText: { fontSize: 12, color: colors.muted, fontWeight: '500' },
    chipTextActive: { color: colors.primary, fontWeight: '700' },
    statsRow: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    statValue: { fontSize: 18, fontWeight: '800', color: colors.foreground },
    statLabel: { fontSize: 10, color: colors.muted, marginTop: 2 },
    postCard: {
      marginHorizontal: 20,
      marginBottom: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 10,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    platformBadge: {
      width: 28,
      height: 28,
      borderRadius: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    platformBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
    postMeta: { flex: 1 },
    postPlatformName: { fontSize: 13, fontWeight: '600', color: colors.foreground },
    postTime: { fontSize: 11, color: colors.muted, marginTop: 1 },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: colors.border,
    },
    typeBadgeText: { fontSize: 10, fontWeight: '600', color: colors.muted },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#EF444415',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteBtnText: { fontSize: 14, color: '#EF4444' },
    postText: {
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 19,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      gap: 12,
    },
    emptyIcon: { fontSize: 40 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground },
    emptySubtitle: { fontSize: 13, color: colors.muted, textAlign: 'center', paddingHorizontal: 40 },
    connectBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    connectBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  });

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.title}>Feed Social</Text>
        {posts.length > 0 && (
          <Pressable style={styles.deleteAllBtn} onPress={handleDeleteAll}>
            <Text style={styles.deleteAllText}>Svuota</Text>
          </Pressable>
        )}
      </View>

      {/* Stats */}
      {posts.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{posts.length}</Text>
            <Text style={styles.statLabel}>Post totali</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{connectedPlatforms.length}</Text>
            <Text style={styles.statLabel}>Piattaforme</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {posts.filter(p => p.type === 'manual').length}
            </Text>
            <Text style={styles.statLabel}>Manuali</Text>
          </View>
        </View>
      )}

      {/* Filtri piattaforma */}
      {posts.length > 0 && connectedPlatforms.length > 1 && (
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Piattaforma</Text>
          <View style={styles.filterChips}>
            <Pressable
              style={[styles.chip, !filterPlatform && styles.chipActive]}
              onPress={() => setFilterPlatform(null)}
            >
              <Text style={[styles.chipText, !filterPlatform && styles.chipTextActive]}>Tutte</Text>
            </Pressable>
            {connectedPlatforms.map(p => (
              <Pressable
                key={p}
                style={[styles.chip, filterPlatform === p && styles.chipActive]}
                onPress={() => setFilterPlatform(filterPlatform === p ? null : p)}
              >
                <Text style={[styles.chipText, filterPlatform === p && styles.chipTextActive]}>
                  {PLATFORM_LABELS[p] || p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Filtri tipo */}
      {posts.length > 0 && (
        <View style={[styles.filterRow, { paddingTop: 0 }]}>
          <Text style={styles.filterLabel}>Tipo</Text>
          <View style={styles.filterChips}>
            <Pressable
              style={[styles.chip, !filterType && styles.chipActive]}
              onPress={() => setFilterType(null)}
            >
              <Text style={[styles.chipText, !filterType && styles.chipTextActive]}>Tutti</Text>
            </Pressable>
            {['trade', 'milestone', 'achievement', 'savings', 'manual'].map(t => (
              <Pressable
                key={t}
                style={[styles.chip, filterType === t && styles.chipActive]}
                onPress={() => setFilterType(filterType === t ? null : t)}
              >
                <Text style={[styles.chipText, filterType === t && styles.chipTextActive]}>
                  {TYPE_ICONS[t]} {TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Lista post o stato vuoto */}
      {filteredPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{'📭'}</Text>
          <Text style={styles.emptyTitle}>
            {posts.length === 0 ? 'Feed vuoto' : 'Nessun post trovato'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {posts.length === 0
              ? accounts.length === 0
                ? 'Connetti i tuoi account social per iniziare a condividere'
                : 'Condividi il progresso dei tuoi obiettivi di risparmio o i tuoi trade'
              : 'Prova a rimuovere i filtri attivi'}
          </Text>
          {accounts.length === 0 && (
            <Pressable style={styles.connectBtn} onPress={() => router.push('/social-login')}>
              <Text style={styles.connectBtnText}>Connetti account</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={[styles.platformBadge, { backgroundColor: PLATFORM_COLORS[item.platform] || colors.primary }]}>
                  <Text style={styles.platformBadgeText}>
                    {PLATFORM_LABELS[item.platform] || '?'}
                  </Text>
                </View>
                <View style={styles.postMeta}>
                  <Text style={styles.postPlatformName}>
                    {PLATFORM_NAMES[item.platform] || item.platform}
                  </Text>
                  <Text style={styles.postTime}>{formatTime(item.timestamp)}</Text>
                </View>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {TYPE_ICONS[item.type]} {TYPE_LABELS[item.type] || item.type}
                  </Text>
                </View>
                <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteBtnText}>{'×'}</Text>
                </Pressable>
              </View>
              <Text style={styles.postText}>{item.text}</Text>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}
