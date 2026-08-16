import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useWalletJSON } from '@/hooks/use-wallet-json';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
// import * as Sharing from 'expo-sharing';

export default function WalletExportScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { config, loading, loadConfig, exportJSON } = useWalletJSON();

  const [jsonString, setJsonString] = useState<string>('');
  const [copied, setCopied] = useState(false);
  // Distinguishes "still reading AsyncStorage" from "nothing stored", so the
  // empty state is only shown once we are sure there is no configuration.
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadConfig().finally(() => {
      if (!cancelled) setHasCheckedStorage(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loadConfig]);

  useEffect(() => {
    if (config) {
      const result = exportJSON();
      if (result.success && result.json) {
        setJsonString(result.json);
      }
    }
  }, [config]);

  const handleCopyToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(jsonString);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert(t('wallet.success'), t('wallet.copiedToClipboard'));
    } catch (error) {
      Alert.alert(t('wallet.error'), t('wallet.copyFailed'));
    }
  };

  const handleShare = async () => {
    try {
      await Clipboard.setStringAsync(jsonString);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(t('wallet.success'), t('wallet.copiedToClipboard'));
    } catch (error) {
      Alert.alert(t('wallet.error'), t('wallet.shareFailed'));
    }
  };

  const handleDownload = async () => {
    try {
      const fileName = `wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
      // In a real app, you would save this to the device's documents folder
      Alert.alert(
        t('wallet.success'),
        `${t('wallet.downloadReady')}: ${fileName}\n\n${t('wallet.downloadInfo')}`
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert(t('wallet.error'), t('wallet.downloadFailed'));
    }
  };

  // Still reading the local storage: avoid flashing the empty state.
  if (!config && (loading || !hasCheckedStorage)) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator color={colors.primary} />
        <Text className="text-sm text-muted text-center px-8">{t('common.loading')}</Text>
      </ScreenContainer>
    );
  }

  // No wallet configuration stored on this device (typically after a reinstall or
  // after clearing the app data). Explain what happened and offer a recovery path
  // instead of dead-ending on a "go back" button.
  if (!config) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="text-5xl mb-2">🗄️</Text>
        <Text className="text-xl font-bold text-foreground text-center">
          {t('wallet.noConfigToExport')}
        </Text>
        <Text className="text-sm text-muted text-center leading-relaxed">
          {t('wallet.noConfigToExportDescription')}
        </Text>

        <View className="w-full gap-3 mt-4">
          <TouchableOpacity
            className="bg-primary rounded-lg p-4"
            onPress={() => router.push('/wallet-import')}
            accessibilityRole="button"
            accessibilityLabel={t('wallet.importBackup')}
          >
            <Text className="text-center text-white font-semibold">
              {t('wallet.importBackup')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="rounded-lg p-4 border border-border bg-transparent"
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('wallet.goBack')}
          >
            <Text className="text-center text-foreground font-semibold">
              {t('wallet.goBack')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-6 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">
            {t('wallet.exportJSON')}
          </Text>
          <Text className="text-sm text-muted">
            {t('wallet.exportJSONDescription')}
          </Text>
        </View>

        {/* Content */}
        <View className="px-6 py-6 gap-6">
          {/* Config Summary */}
          <View className="bg-surface rounded-lg p-4 border border-border gap-3">
            <View className="flex-row justify-between">
              <View>
                <Text className="text-xs text-muted">{t('wallet.blockchains')}</Text>
                <Text className="text-lg font-bold text-primary">
                  {config.blockchains.length}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-muted">{t('wallet.tokens')}</Text>
                <Text className="text-lg font-bold text-primary">
                  {config.tokens.length}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-muted">{t('wallet.contacts')}</Text>
                <Text className="text-lg font-bold text-primary">
                  {config.contacts.length}
                </Text>
              </View>
            </View>
          </View>

          {/* JSON Preview */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">
              {t('wallet.jsonPreview')}
            </Text>
            <ScrollView
              horizontal
              className="bg-surface border border-border rounded-lg p-4 max-h-48"
            >
              <Text
                className="text-xs text-muted"
                style={{ fontFamily: 'monospace' }}
              >
                {jsonString.substring(0, 500)}...
              </Text>
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mt-4">
            <TouchableOpacity
              onPress={handleCopyToClipboard}
              className={`rounded-lg p-4 ${
                copied ? 'bg-success' : 'bg-primary'
              }`}
            >
              <Text className="text-center text-white font-semibold">
                {copied ? t('wallet.copied') : t('wallet.copyToClipboard')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              className="rounded-lg p-4 border border-primary bg-transparent"
            >
              <Text className="text-center text-primary font-semibold">
                {t('wallet.copyToClipboard')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDownload}
              className="rounded-lg p-4 border border-primary bg-transparent"
            >
              <Text className="text-center text-primary font-semibold">
                {t('wallet.download')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Info */}
          <View className="bg-warning/10 rounded-lg p-4 border border-warning mt-4">
            <Text className="text-xs font-semibold text-warning mb-2">
              ⚠️ {t('wallet.securityWarning')}
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              {t('wallet.securityWarningDescription')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
