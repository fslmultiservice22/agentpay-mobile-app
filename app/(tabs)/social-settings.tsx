import { ScrollView, Text, View, TouchableOpacity, Switch, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useI18n } from '@/hooks/use-i18n';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { useSocialShare } from '@/hooks/use-social-share';
import { useSocialSync } from '@/hooks/use-social-sync';
import { SOCIAL_PLATFORMS } from '@/lib/social/social-config';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ShareSettings {
  [key: string]: {
    shareTradesAutomatically: boolean;
    sharePortfolioUpdates: boolean;
    shareAchievements: boolean;
    includePerformanceMetrics: boolean;
  };
}

export default function SocialSettingsScreen() {
  const { t } = useI18n();
  const colors = useColors();
  const { accounts, disconnectAccount } = useSocialAuth();
  const { syncProfile } = useSocialSync();
  const [shareSettings, setShareSettings] = useState<ShareSettings>({});
  const [syncing, setSyncing] = useState(false);

  // Load share settings
  useEffect(() => {
    loadShareSettings();
  }, []);

  const loadShareSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('social_share_settings');
      if (saved) {
        setShareSettings(JSON.parse(saved));
      } else {
        // Initialize default settings
        const defaults: ShareSettings = {};
        accounts.forEach(account => {
          defaults[account.platform] = {
            shareTradesAutomatically: false,
            sharePortfolioUpdates: true,
            shareAchievements: true,
            includePerformanceMetrics: false,
          };
        });
        setShareSettings(defaults);
      }
    } catch (error) {
      console.error('Error loading share settings:', error);
    }
  };

  const saveShareSettings = async (newSettings: ShareSettings) => {
    try {
      await AsyncStorage.setItem('social_share_settings', JSON.stringify(newSettings));
      setShareSettings(newSettings);
    } catch (error) {
      console.error('Error saving share settings:', error);
    }
  };

  const handleDisconnect = (platform: string) => {
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect your ${platform} account?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Disconnect',
          onPress: async () => {
            await disconnectAccount(platform as any);
            const newSettings = { ...shareSettings };
            delete newSettings[platform];
            await saveShareSettings(newSettings);
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSyncProfile = async () => {
    setSyncing(true);
    try {
      await syncProfile();
      Alert.alert('Success', 'Profile synced successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to sync profile');
    } finally {
      setSyncing(false);
    }
  };

  const toggleSetting = async (platform: string, setting: keyof ShareSettings[string]) => {
    const newSettings = { ...shareSettings };
    if (!newSettings[platform]) {
      newSettings[platform] = {
        shareTradesAutomatically: false,
        sharePortfolioUpdates: true,
        shareAchievements: true,
        includePerformanceMetrics: false,
      };
    }
    newSettings[platform][setting] = !newSettings[platform][setting];
    await saveShareSettings(newSettings);
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="items-center gap-2 mb-4">
            <Text className="text-3xl font-bold text-foreground">Social Settings</Text>
            <Text className="text-base text-muted text-center">
              Manage your social media accounts and sharing preferences
            </Text>
          </View>

          {/* Sync Profile Button */}
          <TouchableOpacity
            onPress={handleSyncProfile}
            disabled={syncing || accounts.length === 0}
            className="bg-primary rounded-lg p-4 items-center"
          >
            <Text className="text-white font-semibold">
              {syncing ? 'Syncing...' : 'Sync Profile Across Platforms'}
            </Text>
          </TouchableOpacity>

          {/* Connected Accounts */}
          {accounts.length > 0 ? (
            <View className="gap-4">
              <Text className="text-xl font-bold text-foreground">Connected Accounts</Text>
              {accounts.map(account => {
                const config = SOCIAL_PLATFORMS[account.platform];
                const settings = shareSettings[account.platform];

                return (
                  <View
                    key={`${account.platform}_${account.userId}`}
                    className="bg-surface rounded-lg border border-border overflow-hidden"
                  >
                    {/* Account Header */}
                    <View className="flex-row items-center justify-between p-4 border-b border-border">
                      <View className="flex-row items-center gap-3 flex-1">
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{ backgroundColor: config.color }}
                        >
                          <MaterialIcons
                            name={config.icon as any}
                            size={20}
                            color="white"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-foreground">
                            {account.displayName}
                          </Text>
                          <Text className="text-sm text-muted">@{account.username}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDisconnect(account.platform)}
                        className="p-2"
                      >
                        <MaterialIcons
                          name="close"
                          size={24}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Share Settings */}
                    {settings && (
                      <View className="p-4 gap-4">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-foreground flex-1">Share Trades Automatically</Text>
                          <Switch
                            value={settings.shareTradesAutomatically}
                            onValueChange={() =>
                              toggleSetting(account.platform, 'shareTradesAutomatically')
                            }
                            trackColor={{ false: colors.border, true: colors.primary }}
                          />
                        </View>

                        <View className="flex-row items-center justify-between">
                          <Text className="text-foreground flex-1">Share Portfolio Updates</Text>
                          <Switch
                            value={settings.sharePortfolioUpdates}
                            onValueChange={() =>
                              toggleSetting(account.platform, 'sharePortfolioUpdates')
                            }
                            trackColor={{ false: colors.border, true: colors.primary }}
                          />
                        </View>

                        <View className="flex-row items-center justify-between">
                          <Text className="text-foreground flex-1">Share Achievements</Text>
                          <Switch
                            value={settings.shareAchievements}
                            onValueChange={() =>
                              toggleSetting(account.platform, 'shareAchievements')
                            }
                            trackColor={{ false: colors.border, true: colors.primary }}
                          />
                        </View>

                        <View className="flex-row items-center justify-between">
                          <Text className="text-foreground flex-1">Include Performance Metrics</Text>
                          <Switch
                            value={settings.includePerformanceMetrics}
                            onValueChange={() =>
                              toggleSetting(account.platform, 'includePerformanceMetrics')
                            }
                            trackColor={{ false: colors.border, true: colors.primary }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View className="bg-surface rounded-lg p-6 items-center gap-4 border border-border">
              <MaterialIcons name="info" size={48} color={colors.muted} />
              <Text className="text-center text-muted">
                No social accounts connected. Go to Social Login to connect your accounts.
              </Text>
            </View>
          )}

          {/* Privacy Info */}
          <View className="bg-primary/10 rounded-lg p-4 mt-6">
            <Text className="text-primary font-semibold mb-2">Privacy & Security</Text>
            <Text className="text-sm text-foreground leading-relaxed">
              • Your social media tokens are encrypted and stored securely{'\n'}
              • We never post without your permission{'\n'}
              • You can disconnect any account at any time{'\n'}
              • Your data is not shared with third parties
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
