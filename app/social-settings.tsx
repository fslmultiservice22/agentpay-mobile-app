import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { SocialPlatform, SocialAccount, SOCIAL_PLATFORMS } from '@/lib/social/social-config';

const SOCIAL_ACCOUNTS_KEY = 'social_accounts';
const SOCIAL_PREFS_KEY = 'social_share_prefs';

interface SocialPrefs {
  autoShareTrades: boolean;
  autoShareMilestones: boolean;
  autoShareAchievements: boolean;
  enabledPlatforms: SocialPlatform[];
  sharePortfolioValue: boolean;
  shareUsername: boolean;
}

const DEFAULT_PREFS: SocialPrefs = {
  autoShareTrades: false,
  autoShareMilestones: true,
  autoShareAchievements: true,
  enabledPlatforms: [],
  sharePortfolioValue: false,
  shareUsername: true,
};

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  twitter: 'X',
  instagram: 'IG',
  facebook: 'FB',
  tiktok: 'TT',
  linkedin: 'LI',
  discord: 'DC',
  telegram: 'TG',
  youtube: 'YT',
};

export default function SocialSettingsScreen() {
  const router = useRouter();
  const colors = useColors();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [prefs, setPrefs] = useState<SocialPrefs>(DEFAULT_PREFS);

  const loadData = useCallback(async () => {
    try {
      const [savedAccounts, savedPrefs] = await Promise.all([
        AsyncStorage.getItem(SOCIAL_ACCOUNTS_KEY),
        AsyncStorage.getItem(SOCIAL_PREFS_KEY),
      ]);
      if (savedAccounts) setAccounts(JSON.parse(savedAccounts));
      if (savedPrefs) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(savedPrefs) });
    } catch (e) {
      console.error('Error loading social settings:', e);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const savePrefs = useCallback(async (updated: SocialPrefs) => {
    setPrefs(updated);
    await AsyncStorage.setItem(SOCIAL_PREFS_KEY, JSON.stringify(updated));
  }, []);

  const togglePref = useCallback(
    async (key: keyof Omit<SocialPrefs, 'enabledPlatforms'>) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const updated = { ...prefs, [key]: !prefs[key] };
      await savePrefs(updated);
    },
    [prefs, savePrefs]
  );

  const togglePlatform = useCallback(
    async (platform: SocialPlatform) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const enabled = prefs.enabledPlatforms.includes(platform);
      const updated = {
        ...prefs,
        enabledPlatforms: enabled
          ? prefs.enabledPlatforms.filter(p => p !== platform)
          : [...prefs.enabledPlatforms, platform],
      };
      await savePrefs(updated);
    },
    [prefs, savePrefs]
  );

  const handleDisconnectAll = useCallback(() => {
    Alert.alert(
      'Disconnetti tutti',
      'Vuoi disconnettere tutti gli account social?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Disconnetti tutti',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.setItem(SOCIAL_ACCOUNTS_KEY, JSON.stringify([]));
            setAccounts([]);
            await savePrefs({ ...prefs, enabledPlatforms: [] });
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }, [prefs, savePrefs]);

  const connectedAccounts = accounts;
  const hasConnected = connectedAccounts.length > 0;

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 16,
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
    backText: {
      fontSize: 18,
      color: colors.foreground,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
      flex: 1,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginHorizontal: 20,
      marginBottom: 8,
      marginTop: 20,
    },
    card: {
      marginHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 14,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    rowDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginLeft: 16,
    },
    rowIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIconText: {
      fontSize: 16,
    },
    rowInfo: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.foreground,
    },
    rowSubtitle: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    emptyBox: {
      marginHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 24,
      alignItems: 'center',
      gap: 10,
    },
    emptyIcon: {
      fontSize: 32,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    emptySubtitle: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
    },
    connectBtn: {
      marginTop: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
    },
    connectBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    platformRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    platformIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    platformIconText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#fff',
    },
    platformInfo: {
      flex: 1,
    },
    platformName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.foreground,
    },
    platformUsername: {
      fontSize: 12,
      color: '#22C55E',
      marginTop: 1,
    },
    disconnectAllBtn: {
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: '#EF444415',
      borderWidth: 1,
      borderColor: '#EF444430',
      alignItems: 'center',
    },
    disconnectAllText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#EF4444',
    },
    privacyNote: {
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 24,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-start',
    },
    privacyIcon: {
      fontSize: 14,
      marginTop: 1,
    },
    privacyText: {
      flex: 1,
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
  });

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.title}>Impostazioni Social</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.primary + '15' }]}
            onPress={() => (router.push as any)('/social-feed')}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>Feed</Text>
          </Pressable>
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.success + '15' }]}
            onPress={() => (router.push as any)('/social-profile')}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success }}>Profilo</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Account connessi */}
        <Text style={styles.sectionLabel}>Account connessi</Text>
        {hasConnected ? (
          <View style={styles.card}>
            {connectedAccounts.map((account, idx) => {
              const config = SOCIAL_PLATFORMS[account.platform];
              const isEnabled = prefs.enabledPlatforms.includes(account.platform);
              return (
                <View key={account.platform}>
                  {idx > 0 && <View style={styles.rowDivider} />}
                  <View style={styles.platformRow}>
                    <View style={[styles.platformIcon, { backgroundColor: config.color }]}>
                      <Text style={styles.platformIconText}>{PLATFORM_ICONS[account.platform]}</Text>
                    </View>
                    <View style={styles.platformInfo}>
                      <Text style={styles.platformName}>{config.name}</Text>
                      <Text style={styles.platformUsername}>{account.username}</Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => togglePlatform(account.platform)}
                      trackColor={{ false: colors.border, true: config.color + '80' }}
                      thumbColor={isEnabled ? config.color : colors.muted}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{'🔗'}</Text>
            <Text style={styles.emptyTitle}>Nessun account connesso</Text>
            <Text style={styles.emptySubtitle}>
              Connetti i tuoi social media per abilitare la condivisione automatica
            </Text>
            <Pressable style={styles.connectBtn} onPress={() => router.push('/social-login')}>
              <Text style={styles.connectBtnText}>Connetti account</Text>
            </Pressable>
          </View>
        )}

        {/* Preferenze condivisione */}
        <Text style={styles.sectionLabel}>Condivisione automatica</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#3B82F620' }]}>
              <Text style={styles.rowIconText}>{'📈'}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Condividi trade</Text>
              <Text style={styles.rowSubtitle}>Pubblica automaticamente i trade completati</Text>
            </View>
            <Switch
              value={prefs.autoShareTrades}
              onValueChange={() => togglePref('autoShareTrades')}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={prefs.autoShareTrades ? colors.primary : colors.muted}
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#F59E0B20' }]}>
              <Text style={styles.rowIconText}>{'🏆'}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Condividi milestone</Text>
              <Text style={styles.rowSubtitle}>Pubblica quando raggiungi obiettivi di portfolio</Text>
            </View>
            <Switch
              value={prefs.autoShareMilestones}
              onValueChange={() => togglePref('autoShareMilestones')}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={prefs.autoShareMilestones ? colors.primary : colors.muted}
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#22C55E20' }]}>
              <Text style={styles.rowIconText}>{'🎯'}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Condividi achievement</Text>
              <Text style={styles.rowSubtitle}>Pubblica quando sblocchi nuovi badge</Text>
            </View>
            <Switch
              value={prefs.autoShareAchievements}
              onValueChange={() => togglePref('autoShareAchievements')}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={prefs.autoShareAchievements ? colors.primary : colors.muted}
            />
          </View>
        </View>

        {/* Privacy */}
        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#8B5CF620' }]}>
              <Text style={styles.rowIconText}>{'💰'}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Mostra valore portfolio</Text>
              <Text style={styles.rowSubtitle}>Includi il valore totale nei post condivisi</Text>
            </View>
            <Switch
              value={prefs.sharePortfolioValue}
              onValueChange={() => togglePref('sharePortfolioValue')}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={prefs.sharePortfolioValue ? colors.primary : colors.muted}
            />
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#06B6D420' }]}>
              <Text style={styles.rowIconText}>{'👤'}</Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Mostra username</Text>
              <Text style={styles.rowSubtitle}>Includi il tuo username nei contenuti condivisi</Text>
            </View>
            <Switch
              value={prefs.shareUsername}
              onValueChange={() => togglePref('shareUsername')}
              trackColor={{ false: colors.border, true: colors.primary + '80' }}
              thumbColor={prefs.shareUsername ? colors.primary : colors.muted}
            />
          </View>
        </View>

        {/* Gestione account */}
        {hasConnected && (
          <>
            <Text style={styles.sectionLabel}>Gestione</Text>
            <Pressable
              style={styles.disconnectAllBtn}
              onPress={handleDisconnectAll}
            >
              <Text style={styles.disconnectAllText}>Disconnetti tutti gli account</Text>
            </Pressable>
          </>
        )}

        {/* Note privacy */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyIcon}>{'🔒'}</Text>
          <Text style={styles.privacyText}>
            I dati delle connessioni social sono salvati localmente sul dispositivo e non vengono condivisi con server esterni. Puoi disconnettere qualsiasi account in qualsiasi momento.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
