import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  Alert, Share, ActivityIndicator, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';

// ─── Tipi ────────────────────────────────────────────────────────────────────

interface SocialPost {
  id: string;
  platform: string;
  content: string;
  timestamp: number;
  type: 'goal' | 'trade' | 'plan' | 'milestone';
}

interface ConnectedAccount {
  platform: string;
  username: string;
  connected: boolean;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  achieved: boolean;
  achievedAt?: number;
}

interface UserProfile {
  displayName: string;
  bio: string;
}

// ─── Costanti ─────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  SOCIAL_FEED: 'agentpay_social_feed',
  SOCIAL_ACCOUNTS: 'social_accounts',
  SAVINGS_GOALS: 'agentpay_savings_goals_v2',
  USER_PROFILE: 'agentpay_social_user_profile',
};

const PLATFORM_COLORS: Record<string, string> = {
  'Twitter/X': '#1DA1F2',
  'Instagram': '#E1306C',
  'Facebook': '#1877F2',
  'Discord': '#5865F2',
  'Telegram': '#0088CC',
  'LinkedIn': '#0A66C2',
  'TikTok': '#010101',
  'YouTube': '#FF0000',
};

const PLATFORM_ICONS: Record<string, string> = {
  'Twitter/X': '𝕏',
  'Instagram': '📷',
  'Facebook': 'f',
  'Discord': '💬',
  'Telegram': '✈',
  'LinkedIn': 'in',
  'TikTok': '♪',
  'YouTube': '▶',
};

const MILESTONES: Milestone[] = [
  { id: 'first_post', title: 'Primo Post', description: 'Hai condiviso il tuo primo aggiornamento', icon: '🌟', achieved: false },
  { id: 'social_butterfly', title: 'Social Butterfly', description: 'Connesso a 3+ piattaforme social', icon: '🦋', achieved: false },
  { id: 'goal_sharer', title: 'Goal Sharer', description: 'Condiviso 5 obiettivi di risparmio', icon: '🎯', achieved: false },
  { id: 'planner', title: 'Pianificatore', description: 'Condiviso il piano finanziario mensile', icon: '📊', achieved: false },
  { id: 'consistent', title: 'Costante', description: '10 post condivisi in totale', icon: '🏆', achieved: false },
  { id: 'influencer', title: 'Influencer', description: '25 post condivisi in totale', icon: '💎', achieved: false },
  { id: 'multi_platform', title: 'Multi-Platform', description: 'Post condivisi su 3+ piattaforme diverse', icon: '🌐', achieved: false },
  { id: 'trader', title: 'Trader Sociale', description: 'Condiviso 3 analisi di trading', icon: '📈', achieved: false },
];

const DEFAULT_PROFILE: UserProfile = {
  displayName: 'AgentPay User',
  bio: 'Gestisco le mie finanze con AgentPay Wallet.',
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SocialProfileScreen() {
  const colors = useColors();
  const router = useRouter();

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>(MILESTONES);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── Caricamento dati ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [feedRaw, accountsRaw, profileRaw] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_FEED),
        AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_ACCOUNTS),
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
      ]);

      const feedData: SocialPost[] = feedRaw ? JSON.parse(feedRaw) : [];
      const accountsData: ConnectedAccount[] = accountsRaw ? JSON.parse(accountsRaw) : [];
      const profileData: UserProfile = profileRaw ? JSON.parse(profileRaw) : DEFAULT_PROFILE;

      setPosts(feedData);
      setAccounts(accountsData);
      setUserProfile(profileData);

      // Calcola milestone raggiunte
      const connectedCount = accountsData.filter(a => a.connected).length;
      const goalPosts = feedData.filter(p => p.type === 'goal').length;
      const planPosts = feedData.filter(p => p.type === 'plan').length;
      const tradePosts = feedData.filter(p => p.type === 'trade').length;
      const uniquePlatforms = new Set(feedData.map(p => p.platform)).size;

      setMilestones(MILESTONES.map(m => {
        let achieved = false;
        switch (m.id) {
          case 'first_post': achieved = feedData.length >= 1; break;
          case 'social_butterfly': achieved = connectedCount >= 3; break;
          case 'goal_sharer': achieved = goalPosts >= 5; break;
          case 'planner': achieved = planPosts >= 1; break;
          case 'consistent': achieved = feedData.length >= 10; break;
          case 'influencer': achieved = feedData.length >= 25; break;
          case 'multi_platform': achieved = uniquePlatforms >= 3; break;
          case 'trader': achieved = tradePosts >= 3; break;
        }
        return { ...m, achieved, achievedAt: achieved ? Date.now() : undefined };
      }));
    } catch (e) {
      console.error('Failed to load social profile:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // ─── Statistiche ──────────────────────────────────────────────────────────

  const connectedAccounts = accounts.filter(a => a.connected);
  const achievedMilestones = milestones.filter(m => m.achieved);
  const postsByPlatform = posts.reduce<Record<string, number>>((acc, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1;
    return acc;
  }, {});

  // ─── Modifica profilo ─────────────────────────────────────────────────────

  const openEditModal = () => {
    setEditName(userProfile.displayName);
    setEditBio(userProfile.bio);
    setEditModalVisible(true);
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Errore', 'Il nome non può essere vuoto.');
      return;
    }
    setSaving(true);
    try {
      const updated: UserProfile = {
        displayName: editName.trim(),
        bio: editBio.trim(),
      };
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
      setUserProfile(updated);
      setEditModalVisible(false);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Errore', 'Impossibile salvare il profilo.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Condividi profilo ────────────────────────────────────────────────────

  const shareProfile = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const lines = [
      `👤 ${userProfile.displayName}`,
      userProfile.bio ? `"${userProfile.bio}"` : '',
      '',
      `📊 ${posts.length} post condivisi`,
      `🔗 ${connectedAccounts.length} piattaforme connesse`,
      `🏆 ${achievedMilestones.length}/${milestones.length} milestone raggiunte`,
      '',
      '#AgentPay #FinanzaPersonale',
    ].filter(l => l !== undefined);
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      Alert.alert('Errore', 'Impossibile condividere il profilo.');
    }
  };

  const s = makeStyles(colors);

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={s.title}>Profilo Social</Text>
        <TouchableOpacity style={s.shareBtn} onPress={shareProfile}>
          <MaterialIcons name="share" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Avatar + nome + bio */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {userProfile.displayName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={s.username}>{userProfile.displayName}</Text>
            {userProfile.bio ? (
              <Text style={[s.userBio, { color: colors.muted }]}>{userProfile.bio}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={[s.editBtn, { borderColor: colors.border }]} onPress={openEditModal}>
            <MaterialIcons name="edit" size={14} color={colors.muted} />
            <Text style={[s.editBtnText, { color: colors.muted }]}>Modifica profilo</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: colors.primary }]}>{posts.length}</Text>
            <Text style={s.statLabel}>Post</Text>
          </View>
          <View style={[s.statBox, s.statBorder]}>
            <Text style={[s.statValue, { color: colors.success }]}>{connectedAccounts.length}</Text>
            <Text style={s.statLabel}>Piattaforme</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: colors.warning }]}>{achievedMilestones.length}</Text>
            <Text style={s.statLabel}>Milestone</Text>
          </View>
        </View>

        {/* Piattaforme connesse */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Piattaforme Connesse</Text>
          {connectedAccounts.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Nessuna piattaforma connessa</Text>
              <Pressable onPress={() => (router.push as any)('/social-login')}>
                <Text style={[s.emptyLink, { color: colors.primary }]}>Connetti ora →</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.platformGrid}>
              {connectedAccounts.map(acc => (
                <View key={acc.platform} style={[s.platformChip, { borderColor: PLATFORM_COLORS[acc.platform] || colors.border }]}>
                  <Text style={{ fontSize: 14, marginRight: 4 }}>{PLATFORM_ICONS[acc.platform] || '🔗'}</Text>
                  <View>
                    <Text style={[s.platformName, { color: PLATFORM_COLORS[acc.platform] || colors.foreground }]}>{acc.platform}</Text>
                    <Text style={s.platformUser}>@{acc.username}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Post per piattaforma */}
        {posts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Attività per Piattaforma</Text>
            {Object.entries(postsByPlatform).sort((a, b) => b[1] - a[1]).map(([platform, count]) => {
              const pct = Math.round((count / posts.length) * 100);
              return (
                <View key={platform} style={s.platformRow}>
                  <Text style={s.platformRowIcon}>{PLATFORM_ICONS[platform] || '🔗'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={s.platformRowName}>{platform}</Text>
                      <Text style={[s.platformRowCount, { color: colors.primary }]}>{count} post</Text>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${pct}%` as any, backgroundColor: PLATFORM_COLORS[platform] || colors.primary }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Milestone */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Milestone ({achievedMilestones.length}/{milestones.length})</Text>
          <View style={s.milestoneGrid}>
            {milestones.map(m => (
              <View key={m.id} style={[s.milestoneCard, { opacity: m.achieved ? 1 : 0.4, borderColor: m.achieved ? colors.success : colors.border }]}>
                <Text style={s.milestoneIcon}>{m.icon}</Text>
                <Text style={[s.milestoneTitle, { color: m.achieved ? colors.foreground : colors.muted }]}>{m.title}</Text>
                <Text style={s.milestoneDesc}>{m.description}</Text>
                {m.achieved && (
                  <View style={[s.achievedBadge, { backgroundColor: colors.success + '20' }]}>
                    <Text style={[s.achievedText, { color: colors.success }]}>Raggiunta</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Link rapidi */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Azioni Rapide</Text>
          <View style={s.quickActions}>
            <Pressable style={[s.quickBtn, { backgroundColor: colors.primary + '15' }]} onPress={() => (router.push as any)('/social-feed')}>
              <Text style={[s.quickBtnText, { color: colors.primary }]}>Apri Feed</Text>
            </Pressable>
            <Pressable style={[s.quickBtn, { backgroundColor: colors.surface }]} onPress={() => (router.push as any)('/social-settings')}>
              <Text style={[s.quickBtnText, { color: colors.foreground }]}>Impostazioni</Text>
            </Pressable>
            <Pressable style={[s.quickBtn, { backgroundColor: colors.surface }]} onPress={() => (router.push as any)('/social-login')}>
              <Text style={[s.quickBtnText, { color: colors.foreground }]}>Connetti</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>

      {/* Modal modifica profilo */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={s.modalOverlay} onPress={() => setEditModalVisible(false)}>
            <Pressable style={[s.modalCard, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => {}}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: colors.foreground }]}>Modifica Profilo</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <Text style={[s.inputLabel, { color: colors.muted }]}>Nome visualizzato</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Il tuo nome"
                placeholderTextColor={colors.muted}
                maxLength={40}
                returnKeyType="next"
              />

              <Text style={[s.inputLabel, { color: colors.muted }]}>Bio</Text>
              <TextInput
                style={[s.input, s.inputMultiline, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Descrivi il tuo approccio alla finanza..."
                placeholderTextColor={colors.muted}
                maxLength={120}
                multiline
                numberOfLines={3}
                returnKeyType="done"
              />
              <Text style={[s.charCount, { color: colors.muted }]}>{editBio.length}/120</Text>

              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                onPress={saveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.saveBtnText}>Salva</Text>
                )}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

// ─── Stili ────────────────────────────────────────────────────────────────────

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 17, fontWeight: '700', color: colors.foreground },
    shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '15', borderRadius: 10 },
    avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
    username: { fontSize: 20, fontWeight: '700', color: colors.foreground },
    userBio: { fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 32, lineHeight: 18 },
    editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, marginTop: 4 },
    editBtnText: { fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 8 },
    statBox: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
    statValue: { fontSize: 24, fontWeight: '800' },
    statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
    section: { marginHorizontal: 16, marginTop: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 12 },
    emptyBox: { backgroundColor: colors.surface, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    emptyText: { fontSize: 14, color: colors.muted, marginBottom: 8 },
    emptyLink: { fontSize: 14, fontWeight: '600' },
    platformGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    platformChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    platformName: { fontSize: 13, fontWeight: '700' },
    platformUser: { fontSize: 11, color: colors.muted },
    platformRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    platformRowIcon: { fontSize: 18, marginRight: 10, width: 28, textAlign: 'center' },
    platformRowName: { fontSize: 13, fontWeight: '600', color: colors.foreground },
    platformRowCount: { fontSize: 12, fontWeight: '700' },
    barBg: { height: 6, backgroundColor: colors.border, borderRadius: 3 },
    barFill: { height: 6, borderRadius: 3 },
    milestoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    milestoneCard: { width: '47%', backgroundColor: colors.surface, borderWidth: 1.5, borderRadius: 14, padding: 14, alignItems: 'center' },
    milestoneIcon: { fontSize: 28, marginBottom: 6 },
    milestoneTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
    milestoneDesc: { fontSize: 11, color: colors.muted, textAlign: 'center', lineHeight: 15 },
    achievedBadge: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
    achievedText: { fontSize: 10, fontWeight: '700' },
    quickActions: { flexDirection: 'row', gap: 10 },
    quickBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    quickBtnText: { fontSize: 13, fontWeight: '700' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: 20, paddingBottom: 36 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
    input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
    inputMultiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 },
    charCount: { fontSize: 11, textAlign: 'right', marginTop: 4 },
    saveBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  });
}
