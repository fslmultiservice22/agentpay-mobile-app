import { ScrollView, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { useEthereumWallet as useWallet } from '@/hooks/use-ethereum-wallet';
import { validateAddressAuto, detectBlockchain, maskAddress, type BlockchainType } from '@/lib/multi-chain-validator';
import { useState, useEffect } from 'react';
import { useMultiChainWallet } from '@/hooks/use-multi-chain-wallet';

export default function WalletConnectScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const router = useRouter();
  const { connectManualWallet, loading, error: walletError } = useWallet();
  const { addWallet, error: multiChainError } = useMultiChainWallet();
  const params = useLocalSearchParams();
  const [address, setAddress] = useState('');
  const [blockchain, setBlockchain] = useState<BlockchainType>('ethereum');
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.address) {
      const addr = params.address as string;
      setAddress(addr);
      
      const detectedBlockchain = detectBlockchain(addr);
      if (detectedBlockchain) {
        setBlockchain(detectedBlockchain);
        setIsValid(true);
        
        setTimeout(() => {
          handleConnect(addr, detectedBlockchain);
        }, 500);
      } else {
        setIsValid(false);
        setError('Invalid address format');
      }
    }
  }, [params?.address]);

  const handleAddressChange = (text: string) => {
    setAddress(text);
    
    const validated = validateAddressAuto(text);
    setIsValid(validated !== null);
    
    if (validated && validated.blockchain !== blockchain) {
      setBlockchain(validated.blockchain);
    }
  };

  const handleConnect = async (addr?: string, chain?: BlockchainType) => {
    const finalAddress = addr || address;
    const finalBlockchain = chain || blockchain;
    
    if (!finalAddress || !isValid) {
      setError('Please enter a valid address');
      return;
    }
    
    try {
      setError(null);
      
      if (finalBlockchain === 'ethereum') {
        await connectManualWallet(finalAddress);
      } else {
        const success = await addWallet(finalAddress, finalBlockchain);
        if (!success) {
          setError(multiChainError || 'Failed to connect wallet');
          return;
        }
      }
      
      router.back();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
    }
  };

  const handlePasteExample = () => {
    const exampleAddress = '0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4';
    setAddress(exampleAddress);
    setBlockchain('ethereum');
    setIsValid(true);
  };

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-6 py-6 border-b border-border">
          <Text className="text-3xl font-bold text-foreground mb-2">
            {t('wallet.connect')}
          </Text>
          <Text className="text-sm text-muted">
            {t('wallet.connectDescription')}
          </Text>
        </View>

        {/* Content */}
        <View className="px-6 py-6 gap-6">
          {/* Info Card */}
          <View className="bg-surface rounded-2xl p-4 border border-border">
            <Text className="text-sm font-semibold text-foreground mb-2">
              {t('wallet.supportedNetworks')}
            </Text>
            <Text className="text-xs text-muted">
              Ethereum, Polygon, Arbitrum, Optimism, NEAR, Orderly Network
            </Text>
            {blockchain && (
              <Text className="text-xs text-primary mt-2 font-medium">
                Detected: {blockchain.toUpperCase()}
              </Text>
            )}
          </View>

          {/* Address Input */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">
              Wallet Address
            </Text>
            <TextInput
              placeholder="0x..."
              placeholderTextColor={colors.muted}
              value={address}
              onChangeText={handleAddressChange}
              editable={!loading}
              className="bg-surface border border-border rounded-lg px-4 py-3 text-foreground"
              style={{
                borderColor: isValid ? colors.success : colors.border,
              }}
            />
            {isValid && (
              <Text className="text-xs text-success font-medium">
                ✓ {maskAddress(address, blockchain)}
              </Text>
            )}
            {(error || walletError) && (
              <Text className="text-xs text-error font-medium">
                ✗ {error || walletError}
              </Text>
            )}
          </View>

          {/* Example Button */}
          <TouchableOpacity
            onPress={handlePasteExample}
            disabled={loading}
            className="bg-surface border border-border rounded-lg px-4 py-3"
          >
            <Text className="text-sm font-medium text-primary text-center">
              {t('wallet.useExample')}
            </Text>
          </TouchableOpacity>

          {/* Connect Button */}
          <TouchableOpacity
            onPress={handleConnect}
            disabled={!isValid || loading}
            className={`rounded-lg px-6 py-4 flex-row items-center justify-center gap-2 ${
              isValid && !loading ? 'bg-primary' : 'bg-muted opacity-50'
            }`}
          >
            {loading ? (
              <>
                <ActivityIndicator color={colors.background} size="small" />
                <Text className="text-base font-semibold text-background">
                  {t('wallet.connecting')}
                </Text>
              </>
            ) : (
              <Text className="text-base font-semibold text-background">
                {t('wallet.connect')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Info Section */}
          <View className="bg-surface rounded-2xl p-4 border border-border gap-3">
            <Text className="text-sm font-semibold text-foreground">
              {t('wallet.info')}
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • {t('wallet.infoSecure')}
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • {t('wallet.infoMultiChain')}
            </Text>
            <Text className="text-xs text-muted leading-relaxed">
              • {t('wallet.infoReadOnly')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
