import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useI18n } from '@/hooks/use-i18n';
import { useSocialAuth } from '@/hooks/use-social-auth';
import { SOCIAL_PLATFORMS, SocialPlatform } from '@/lib/social/social-config';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

export default function SocialLoginScreen() {
  const { t } = useI18n();
  const colors = useColors();
  const { authenticate, loading, error, accounts } = useSocialAuth();

  const platforms: SocialPlatform[] = [
    'twitter',
    'instagram',
    'facebook',
    'tiktok',
    'linkedin',
    'discord',
    'telegram',
    'youtube',
  ];

  const handleConnect = async (platform: SocialPlatform) => {
    await authenticate(platform);
  };

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="gap-6">
          {/* Header */}
          <View className="items-center gap-2 mb-4">
            <Text className="text-3xl font-bold text-foreground">Connect Social Media</Text>
            <Text className="text-base text-muted text-center">
              Connect your social accounts to share trades and grow your community
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View className="bg-error/10 border border-error rounded-lg p-4">
              <Text className="text-error font-semibold">{error}</Text>
            </View>
          )}

          {/* Connected Accounts Summary */}
          {accounts.length > 0 && (
            <View className="bg-success/10 border border-success rounded-lg p-4">
              <Text className="text-success font-semibold">
                {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
              </Text>
            </View>
          )}

          {/* Social Platforms Grid */}
          <View className="gap-3">
            {platforms.map(platform => {
              const config = SOCIAL_PLATFORMS[platform];
              const isConnected = accounts.some(a => a.platform === platform);
              const isLoading = loading && accounts.some(a => a.platform === platform);

              return (
                <TouchableOpacity
                  key={platform}
                  onPress={() => handleConnect(platform)}
                  disabled={loading}
                  className={`flex-row items-center justify-between p-4 rounded-lg border ${
                    isConnected
                      ? 'bg-success/10 border-success'
                      : 'bg-surface border-border'
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <View
                      className="w-12 h-12 rounded-lg items-center justify-center"
                      style={{ backgroundColor: config.color }}
                    >
                      <MaterialIcons
                        name={config.icon as any}
                        size={24}
                        color="white"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-foreground">
                        {config.name}
                      </Text>
                      {isConnected && (
                        <Text className="text-sm text-success">
                          ✓ Connected as {accounts.find(a => a.platform === platform)?.username}
                        </Text>
                      )}
                    </View>
                  </View>

                  {isLoading ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <MaterialIcons
                      name={isConnected ? 'check-circle' : 'arrow-forward'}
                      size={24}
                      color={isConnected ? colors.success : colors.muted}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Connected Accounts Details */}
          {accounts.length > 0 && (
            <View className="gap-4 mt-6">
              <Text className="text-xl font-bold text-foreground">Connected Accounts</Text>
              {accounts.map(account => (
                <View
                  key={`${account.platform}_${account.userId}`}
                  className="bg-surface rounded-lg p-4 border border-border"
                >
                  <View className="flex-row items-center gap-3 mb-3">
                    <View
                      className="w-10 h-10 rounded-full"
                      style={{
                        backgroundColor: SOCIAL_PLATFORMS[account.platform].color,
                      }}
                    />
                    <View className="flex-1">
                      <Text className="font-semibold text-foreground">
                        {account.displayName}
                      </Text>
                      <Text className="text-sm text-muted">@{account.username}</Text>
                    </View>
                    {account.verified && (
                      <MaterialIcons name="verified" size={20} color={colors.primary} />
                    )}
                  </View>

                  {account.bio && (
                    <Text className="text-sm text-muted mb-3">{account.bio}</Text>
                  )}

                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <Text className="text-lg font-bold text-foreground">
                        {account.followers.toLocaleString()}
                      </Text>
                      <Text className="text-xs text-muted">Followers</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-lg font-bold text-foreground">
                        {account.following.toLocaleString()}
                      </Text>
                      <Text className="text-xs text-muted">Following</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Info Box */}
          <View className="bg-primary/10 rounded-lg p-4 mt-6">
            <Text className="text-primary font-semibold mb-2">Why Connect?</Text>
            <Text className="text-sm text-foreground leading-relaxed">
              • Share your trading wins with your followers{'\n'}
              • Build your trading community{'\n'}
              • Get verified badges{'\n'}
              • Earn referral rewards{'\n'}
              • Sync your profile across platforms
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
