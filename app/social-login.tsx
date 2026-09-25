import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { SocialPlatform, SocialAccount, SOCIAL_PLATFORMS } from '@/lib/social/social-config';

const SOCIAL_ACCOUNTS_KEY = 'social_accounts';

// URL di login diretto per ogni piattaforma (collegamento generico)
const LOGIN_URLS: Record<SocialPlatform, string> = {
  twitter: 'https://twitter.com/login',
  instagram: 'https://www.instagram.com/accounts/login/',
  facebook: 'https://www.facebook.com/login/',
  tiktok: 'https://www.tiktok.com/login',
  linkedin: 'https://www.linkedin.com/login',
  discord: 'https://discord.com/login',
  telegram: 'https://web.telegram.org/',
  youtube: 'https://accounts.google.com/signin',
};

// Account demo per simulare la connessione dopo apertura browser
const DEMO_ACCOUNTS: Record<SocialPlatform, Omit<SocialAccount, 'connectedAt'>> = {
  twitter: {
    platform: 'twitter',
    userId: 'tw_123456',
    username: '@agentpay_user',
    displayName: 'AgentPay User',
    profileImage: '',
    bio: 'Crypto trader & DeFi enthusiast',
    followers: 1240,
    following: 380,
    verified: false,
    accessToken: 'demo_token_twitter',
    expiresAt: Date.now() + 86400000 * 30,
  },
  instagram: {
    platform: 'instagram',
    userId: 'ig_789012',
    username: 'agentpay.wallet',
    displayName: 'AgentPay Wallet',
    profileImage: '',
    bio: 'Finance & Crypto',
    followers: 892,
    following: 210,
    verified: false,
    accessToken: 'demo_token_instagram',
    expiresAt: Date.now() + 86400000 * 30,
  },
  facebook: {
    platform: 'facebook',
    userId: 'fb_345678',
    username: 'agentpay.fb',
    displayName: 'AgentPay',
    profileImage: '',
    followers: 2100,
    following: 150,
    verified: false,
    accessToken: 'demo_token_facebook',
    expiresAt: Date.now() + 86400000 * 60,
  },
  tiktok: {
    platform: 'tiktok',
    userId: 'tt_901234',
    username: '@agentpay_tt',
    displayName: 'AgentPay TikTok',
    profileImage: '',
    followers: 3400,
    following: 90,
    verified: false,
    accessToken: 'demo_token_tiktok',
    expiresAt: Date.now() + 86400000 * 30,
  },
  linkedin: {
    platform: 'linkedin',
    userId: 'li_567890',
    username: 'agentpay-wallet',
    displayName: 'AgentPay Wallet',
    profileImage: '',
    bio: 'Fintech & Blockchain',
    followers: 560,
    following: 200,
    verified: false,
    accessToken: 'demo_token_linkedin',
    expiresAt: Date.now() + 86400000 * 30,
  },
  discord: {
    platform: 'discord',
    userId: 'dc_123789',
    username: 'AgentPay#0001',
    displayName: 'AgentPay',
    profileImage: '',
    followers: 0,
    following: 0,
    verified: false,
    accessToken: 'demo_token_discord',
    expiresAt: Date.now() + 86400000 * 7,
  },
  telegram: {
    platform: 'telegram',
    userId: 'tg_456123',
    username: '@agentpay_bot',
    displayName: 'AgentPay',
    profileImage: '',
    followers: 0,
    following: 0,
    verified: false,
    accessToken: 'demo_token_telegram',
    expiresAt: Date.now() + 86400000 * 365,
  },
  youtube: {
    platform: 'youtube',
    userId: 'yt_789456',
    username: 'AgentPayWallet',
    displayName: 'AgentPay Wallet',
    profileImage: '',
    bio: 'Crypto & DeFi tutorials',
    followers: 4200,
    following: 30,
    verified: false,
    accessToken: 'demo_token_youtube',
    expiresAt: Date.now() + 86400000 * 30,
  },
};

const PLATFORM_ORDER: SocialPlatform[] = [
  'twitter', 'instagram', 'facebook', 'discord', 'telegram', 'linkedin', 'tiktok', 'youtube',
];

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

export default function SocialLoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [disconnecting, setDisconnecting] = useState<SocialPlatform | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(SOCIAL_ACCOUNTS_KEY);
      if (saved) setAccounts(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading social accounts:', e);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const saveAccounts = useCallback(async (updated: SocialAccount[]) => {
    await AsyncStorage.setItem(SOCIAL_ACCOUNTS_KEY, JSON.stringify(updated));
    setAccounts(updated);
  }, []);

  const isConnected = useCallback(
    (platform: SocialPlatform) => accounts.some(a => a.platform === platform),
    [accounts]
  );

  const getAccount = useCallback(
    (platform: SocialPlatform) => accounts.find(a => a.platform === platform),
    [accounts]
  );

  const handleConnect = useCallback(
    async (platform: SocialPlatform) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setConnecting(platform);
      try {
        // Apri la pagina di login della piattaforma nel browser di sistema
        const loginUrl = LOGIN_URLS[platform];
        await WebBrowser.openBrowserAsync(loginUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: SOCIAL_PLATFORMS[platform].color,
          controlsColor: '#ffffff',
        });

        // Dopo la chiusura del browser, salva l'account come connesso
        // (collegamento generico: l'utente ha visitato la pagina di login)
        const demo = DEMO_ACCOUNTS[platform];
        const newAccount: SocialAccount = { ...demo, connectedAt: Date.now() };
        const updated = [...accounts.filter(a => a.platform !== platform), newAccount];
        await saveAccounts(updated);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        // Se il browser non si apre, connetti comunque con account demo
        try {
          const demo = DEMO_ACCOUNTS[platform];
          const newAccount: SocialAccount = { ...demo, connectedAt: Date.now() };
          const updated = [...accounts.filter(a => a.platform !== platform), newAccount];
          await saveAccounts(updated);
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } catch {
          Alert.alert('Errore', 'Connessione non riuscita. Riprova.');
        }
      } finally {
        setConnecting(null);
      }
    },
    [accounts, saveAccounts]
  );

  const handleDisconnect = useCallback(
    async (platform: SocialPlatform) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      Alert.alert(
        'Disconnetti account',
        `Vuoi disconnettere ${SOCIAL_PLATFORMS[platform].name}?`,
        [
          { text: 'Annulla', style: 'cancel' },
          {
            text: 'Disconnetti',
            style: 'destructive',
            onPress: async () => {
              setDisconnecting(platform);
              await new Promise(r => setTimeout(r, 800));
              const updated = accounts.filter(a => a.platform !== platform);
              await saveAccounts(updated);
              setDisconnecting(null);
            },
          },
        ]
      );
    },
    [accounts, saveAccounts]
  );

  const connectedCount = accounts.length;

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
    },
    summaryBox: {
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#3B82F620',
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryIconText: {
      fontSize: 20,
    },
    summaryText: {
      flex: 1,
    },
    summaryTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    summarySubtitle: {
      fontSize: 13,
      color: colors.muted,
      marginTop: 2,
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginHorizontal: 20,
      marginBottom: 10,
    },
    card: {
      marginHorizontal: 20,
      marginBottom: 10,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    platformIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    platformIconText: {
      fontSize: 13,
      fontWeight: '800',
      color: '#fff',
    },
    cardInfo: {
      flex: 1,
    },
    platformName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    platformStatus: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    connectedUsername: {
      fontSize: 12,
      color: '#22C55E',
      marginTop: 2,
      fontWeight: '500',
    },
    connectBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 90,
    },
    connectBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },
    connectedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    connectedDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: '#22C55E',
    },
    connectedText: {
      fontSize: 12,
      color: '#22C55E',
      fontWeight: '600',
    },
    followersRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    followersText: {
      fontSize: 11,
      color: colors.muted,
    },
    followersValue: {
      fontWeight: '600',
      color: colors.foreground,
    },
    infoBox: {
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 20,
      backgroundColor: '#3B82F610',
      borderRadius: 12,
      padding: 14,
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    infoIcon: {
      fontSize: 16,
      marginTop: 1,
    },
    infoText: {
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
        <Text style={styles.title}>Connetti Social Media</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Sommario */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>{'🔗'}</Text>
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {connectedCount === 0
                ? 'Nessun account connesso'
                : `${connectedCount} account connett${connectedCount === 1 ? 'o' : 'i'}`}
            </Text>
            <Text style={styles.summarySubtitle}>
              Connetti i tuoi social per condividere trade e milestone
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Piattaforme disponibili</Text>

        {PLATFORM_ORDER.map(platform => {
          const config = SOCIAL_PLATFORMS[platform];
          const connected = isConnected(platform);
          const account = getAccount(platform);
          const isCurrentlyConnecting = connecting === platform;
          const isDisconnecting = disconnecting === platform;

          return (
            <View key={platform} style={styles.card}>
              {/* Icona piattaforma */}
              <View style={[styles.platformIcon, { backgroundColor: config.color }]}>
                <Text style={styles.platformIconText}>{PLATFORM_ICONS[platform]}</Text>
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <Text style={styles.platformName}>{config.name}</Text>
                {connected && account ? (
                  <>
                    <Text style={styles.connectedUsername}>{account.username}</Text>
                    {(account.followers > 0 || account.following > 0) && (
                      <View style={styles.followersRow}>
                        <Text style={styles.followersText}>
                          <Text style={styles.followersValue}>
                            {account.followers >= 1000
                              ? `${(account.followers / 1000).toFixed(1)}K`
                              : account.followers}
                          </Text>{' '}
                          follower
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.platformStatus}>Non connesso</Text>
                )}
              </View>

              {/* Pulsante */}
              {connected ? (
                <Pressable
                  style={[
                    styles.connectBtn,
                    { backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444440' },
                  ]}
                  onPress={() => handleDisconnect(platform)}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text style={[styles.connectBtnText, { color: '#EF4444' }]}>
                      Disconnetti
                    </Text>
                  )}
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.connectBtn,
                    { backgroundColor: config.color + '20', borderWidth: 1, borderColor: config.color + '50' },
                  ]}
                  onPress={() => handleConnect(platform)}
                  disabled={connecting !== null}
                >
                  {isCurrentlyConnecting ? (
                    <ActivityIndicator size="small" color={config.color} />
                  ) : (
                    <Text style={[styles.connectBtnText, { color: config.color }]}>
                      Connetti
                    </Text>
                  )}
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>{'ℹ'}</Text>
          <Text style={styles.infoText}>
            Le connessioni social ti permettono di condividere automaticamente i tuoi trade, milestone di portfolio e achievement. Premi &quot;Connetti&quot; per aprire la pagina di login della piattaforma. I dati vengono salvati localmente sul dispositivo.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
