import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useWalletJSON } from '@/hooks/use-wallet-json';
// import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

export default function WalletImportScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { importJSON, loading } = useWalletJSON();

  const [jsonInput, setJsonInput] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handlePickFile = async () => {
    Alert.alert(
      t('wallet.info'),
      'Paste your wallet JSON configuration in the text field below.'
    );
  };

  const handlePasteExample = () => {
    const exampleJSON = {
      version: '1.0.0',
      blockchains: [
        {
          id: 'ethereum',
          name: 'Ethereum',
          chainId: 1,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        },
        {
          id: 'polygon',
          name: 'Polygon',
          chainId: 137,
          nativeCurrency: { name: 'Matic', symbol: 'MATIC', decimals: 18 },
        },
      ],
      tokens: [
        {
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          chainId: 1,
        },
      ],
      contacts: [
        {
          id: '1',
          name: 'Uniswap',
          address: '0x1111111254fb6c44bac0bed2854e76f90643097d',
          type: 'contract',
        },
      ],
      settings: {
        theme: 'auto',
        language: 'en',
        currency: 'USD',
      },
    };

    setJsonInput(JSON.stringify(exampleJSON, null, 2));
    setSelectedFile('example.json');
  };

  const handleImport = async () => {
    try {
      if (!jsonInput.trim()) {
        Alert.alert(t('wallet.error'), t('wallet.jsonRequired'));
        return;
      }

      setImporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const result = await importJSON(jsonInput, walletAddress || undefined);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          t('wallet.success'),
          `${t('wallet.importSuccess')}\n\nBlockchains: ${result.config?.blockchains.length || 0}\nTokens: ${result.config?.tokens.length || 0}\nContacts: ${result.config?.contacts.length || 0}`,
          [
            {
              text: t('wallet.ok'),
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(t('wallet.error'), result.errors?.join('\n') || t('wallet.importFailed'));
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('wallet.error'), error instanceof Error ? error.message : t('wallet.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-6 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">
            {t('wallet.importJSON')}
          </Text>
          <Text className="text-sm text-muted">
            {t('wallet.importJSONDescription')}
          </Text>
        </View>

        {/* Content */}
        <View className="px-6 py-6 gap-6">
          {/* File Selection */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">
              {t('wallet.selectFile')}
            </Text>
            <TouchableOpacity
              onPress={handlePickFile}
              className="bg-surface rounded-lg p-4 border-2 border-dashed border-border"
            >
              <Text className="text-center text-primary font-semibold">
                {selectedFile ? `✓ ${selectedFile}` : t('wallet.pickFile')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* JSON Input */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">
              {t('wallet.jsonInput')}
            </Text>
            <TextInput
              value={jsonInput}
              onChangeText={setJsonInput}
              placeholder={t('wallet.pasteJSON')}
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={8}
              className="bg-surface border border-border rounded-lg p-4 text-foreground"
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                color: colors.foreground,
              }}
            />
          </View>

          {/* Wallet Address (Optional) */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">
              {t('wallet.walletAddressOptional')}
            </Text>
            <TextInput
              value={walletAddress}
              onChangeText={setWalletAddress}
              placeholder="0x..."
              placeholderTextColor={colors.muted}
              className="bg-surface border border-border rounded-lg p-4 text-foreground"
              style={{ color: colors.foreground }}
            />
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mt-4">
            <TouchableOpacity
              onPress={handleImport}
              disabled={importing || loading || !jsonInput.trim()}
              className={`rounded-lg p-4 ${
                importing || loading || !jsonInput.trim()
                  ? 'bg-border opacity-50'
                  : 'bg-primary'
              }`}
            >
              <Text className="text-center text-white font-semibold">
                {importing ? t('wallet.importing') : t('wallet.import')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePasteExample}
              className="rounded-lg p-4 border border-primary bg-transparent"
            >
              <Text className="text-center text-primary font-semibold">
                {t('wallet.pasteExample')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View className="bg-surface rounded-lg p-4 border border-border mt-4">
            <Text className="text-xs font-semibold text-foreground mb-2">
              {t('wallet.importInfo')}
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • {t('wallet.importInfoBlockchains')}{'\n'}
              • {t('wallet.importInfoTokens')}{'\n'}
              • {t('wallet.importInfoContacts')}{'\n'}
              • {t('wallet.importInfoSettings')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
