import { ScrollView, Text, View, TouchableOpacity, TextInput, Modal, FlatList, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useState, useEffect } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { useBlockchain } from '@/lib/blockchain/blockchain-context';
import { BLOCKCHAINS, type BlockchainId, AVAILABLE_BLOCKCHAINS } from '@/lib/blockchain/blockchain-config';
import { useCrossChainSwap, type CrossChainToken } from '@/hooks/use-cross-chain-swap';
import { STARGATE_CHAINS, getEstimatedBridgeTime, getStargateFee } from '@/lib/bridge/stargate-config';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

export default function CrossChainSwapScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { selectedBlockchain } = useBlockchain();
  const { getAvailableTokens, getSwapQuote, executeSwap, isLoading, error } = useCrossChainSwap();

  const [sourceChain, setSourceChain] = useState<BlockchainId>(selectedBlockchain);
  const [destinationChain, setDestinationChain] = useState<BlockchainId>('polygon');
  const [inputAmount, setInputAmount] = useState('');
  const [inputToken, setInputToken] = useState<CrossChainToken | null>(null);
  const [outputToken, setOutputToken] = useState<CrossChainToken | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [sourceChainModalVisible, setSourceChainModalVisible] = useState(false);
  const [destinationChainModalVisible, setDestinationChainModalVisible] = useState(false);
  const [inputTokenModalVisible, setInputTokenModalVisible] = useState(false);
  const [outputTokenModalVisible, setOutputTokenModalVisible] = useState(false);

  // Initialize tokens
  useEffect(() => {
    const sourceTokens = getAvailableTokens(sourceChain);
    const destTokens = getAvailableTokens(destinationChain);
    if (sourceTokens.length > 0 && !inputToken) {
      setInputToken(sourceTokens[1]); // Default to USDC
    }
    if (destTokens.length > 0 && !outputToken) {
      setOutputToken(destTokens[1]); // Default to USDC
    }
  }, [sourceChain, destinationChain]);

  const handleGetQuote = async () => {
    if (!inputToken || !outputToken || !inputAmount) return;

    const swapQuote = await getSwapQuote(sourceChain, destinationChain, inputToken, outputToken, inputAmount);
    setQuote(swapQuote);
  };

  const handleSwap = async () => {
    if (!quote) return;

    const result = await executeSwap(quote);
    if (result.success) {
      setInputAmount('');
      setQuote(null);
      // Show success message
    }
  };

  const sourceTokens = getAvailableTokens(sourceChain);
  const destTokens = getAvailableTokens(destinationChain);
  const availableDestinations = AVAILABLE_BLOCKCHAINS.filter((chain) => chain !== sourceChain);

  const estimatedTime = getEstimatedBridgeTime(sourceChain, destinationChain);
  const fee = getStargateFee(parseFloat(inputAmount) || 0);

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="gap-6 p-4">
          {/* Header */}
          <View className="items-center gap-2">
            <Text className="text-3xl font-bold text-foreground">Cross-Chain Swap</Text>
            <Text className="text-sm text-muted">Bridge tokens across blockchains</Text>
          </View>

          {/* Source Chain Selection */}
          <Animated.View entering={FadeIn.duration(300)} className="gap-2">
            <Text className="text-sm font-semibold text-foreground">From Blockchain</Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
              className="rounded-lg p-4 flex-row items-center justify-between"
              onPress={() => setSourceChainModalVisible(true)}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">{BLOCKCHAINS[sourceChain].icon}</Text>
                <Text className="text-base font-semibold text-foreground">{BLOCKCHAINS[sourceChain].name}</Text>
              </View>
              <Text className="text-lg text-muted">›</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Destination Chain Selection */}
          <Animated.View entering={FadeIn.duration(300)} className="gap-2">
            <Text className="text-sm font-semibold text-foreground">To Blockchain</Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
              className="rounded-lg p-4 flex-row items-center justify-between"
              onPress={() => setDestinationChainModalVisible(true)}
            >
              <View className="flex-row items-center gap-3">
                <Text className="text-2xl">{BLOCKCHAINS[destinationChain].icon}</Text>
                <Text className="text-base font-semibold text-foreground">{BLOCKCHAINS[destinationChain].name}</Text>
              </View>
              <Text className="text-lg text-muted">›</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Input Token and Amount */}
          <Animated.View entering={FadeIn.duration(300)} className="gap-2">
            <Text className="text-sm font-semibold text-foreground">You Send</Text>
            <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }} className="rounded-lg p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  className="flex-row items-center gap-2 flex-1"
                  onPress={() => setInputTokenModalVisible(true)}
                >
                  <Text className="text-lg font-semibold text-foreground">{inputToken?.symbol}</Text>
                  <Text className="text-sm text-muted">›</Text>
                </TouchableOpacity>
                <TextInput
                  style={{ color: colors.foreground, fontSize: 16, fontWeight: '600', textAlign: 'right', flex: 1 }}
                  placeholder="0.00"
                  placeholderTextColor={colors.muted}
                  value={inputAmount}
                  onChangeText={setInputAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text className="text-xs text-muted">Balance: 10.50 {inputToken?.symbol}</Text>
            </View>
          </Animated.View>

          {/* Output Token and Amount */}
          <Animated.View entering={FadeIn.duration(300)} className="gap-2">
            <Text className="text-sm font-semibold text-foreground">You Receive</Text>
            <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }} className="rounded-lg p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <TouchableOpacity
                  className="flex-row items-center gap-2 flex-1"
                  onPress={() => setOutputTokenModalVisible(true)}
                >
                  <Text className="text-lg font-semibold text-foreground">{outputToken?.symbol}</Text>
                  <Text className="text-sm text-muted">›</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '600' }}>
                  {quote ? quote.outputAmount : '0.00'}
                </Text>
              </View>
              <Text className="text-xs text-muted">Balance: 5.25 {outputToken?.symbol}</Text>
            </View>
          </Animated.View>

          {/* Swap Details */}
          {quote && (
            <Animated.View entering={FadeIn.duration(300)} style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }} className="rounded-lg p-4 gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Estimated Time:</Text>
                <Text className="text-sm font-semibold text-foreground">{estimatedTime}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Bridge Fee:</Text>
                <Text className="text-sm font-semibold text-foreground">{fee.toFixed(3)}%</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-sm text-muted">Price Impact:</Text>
                <Text className="text-sm font-semibold text-foreground">{quote.priceImpact}</Text>
              </View>
            </Animated.View>
          )}

          {/* Error Message */}
          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={{ backgroundColor: colors.error, opacity: 0.1 }} className="rounded-lg p-3">
              <Text style={{ color: colors.error }} className="text-sm font-semibold">
                {error}
              </Text>
            </Animated.View>
          )}

          {/* Action Buttons */}
          <View className="gap-3">
            {!quote ? (
              <TouchableOpacity
                onPress={handleGetQuote}
                disabled={isLoading || !inputAmount}
                style={{ backgroundColor: colors.primary, opacity: isLoading || !inputAmount ? 0.5 : 1 }}
                className="rounded-lg p-4 items-center justify-center"
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text className="text-base font-semibold text-background">Get Quote</Text>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleSwap}
                  disabled={isLoading}
                  style={{ backgroundColor: colors.primary, opacity: isLoading ? 0.5 : 1 }}
                  className="rounded-lg p-4 items-center justify-center"
                >
                  {isLoading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text className="text-base font-semibold text-background">Confirm Swap</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setQuote(null)}
                  style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
                  className="rounded-lg p-4 items-center justify-center"
                >
                  <Text className="text-base font-semibold text-foreground">Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Source Chain Modal */}
      <Modal
        visible={sourceChainModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSourceChainModalVisible(false)}
      >
        <View style={{ backgroundColor: colors.background, opacity: 0.5 }} className="flex-1" />
        <View style={{ backgroundColor: colors.background }} className="rounded-t-2xl p-4">
          <Text className="text-lg font-bold text-foreground mb-4">Select Source Blockchain</Text>
          <FlatList
            data={AVAILABLE_BLOCKCHAINS}
            keyExtractor={(item) => item}
            renderItem={({ item: blockchain }) => (
              <TouchableOpacity
                onPress={() => {
                  setSourceChain(blockchain);
                  setSourceChainModalVisible(false);
                }}
                className="flex-row items-center justify-between p-4 border-b"
                style={{ borderColor: colors.border }}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{BLOCKCHAINS[blockchain].icon}</Text>
                  <Text className="text-base font-semibold text-foreground">{BLOCKCHAINS[blockchain].name}</Text>
                </View>
                {sourceChain === blockchain && <Text className="text-lg text-primary">✓</Text>}
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      </Modal>

      {/* Destination Chain Modal */}
      <Modal
        visible={destinationChainModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDestinationChainModalVisible(false)}
      >
        <View style={{ backgroundColor: colors.background, opacity: 0.5 }} className="flex-1" />
        <View style={{ backgroundColor: colors.background }} className="rounded-t-2xl p-4">
          <Text className="text-lg font-bold text-foreground mb-4">Select Destination Blockchain</Text>
          <FlatList
            data={availableDestinations}
            keyExtractor={(item) => item}
            renderItem={({ item: blockchain }) => (
              <TouchableOpacity
                onPress={() => {
                  setDestinationChain(blockchain);
                  setDestinationChainModalVisible(false);
                }}
                className="flex-row items-center justify-between p-4 border-b"
                style={{ borderColor: colors.border }}
              >
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{BLOCKCHAINS[blockchain].icon}</Text>
                  <Text className="text-base font-semibold text-foreground">{BLOCKCHAINS[blockchain].name}</Text>
                </View>
                {destinationChain === blockchain && <Text className="text-lg text-primary">✓</Text>}
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      </Modal>

      {/* Input Token Modal */}
      <Modal
        visible={inputTokenModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInputTokenModalVisible(false)}
      >
        <View style={{ backgroundColor: colors.background, opacity: 0.5 }} className="flex-1" />
        <View style={{ backgroundColor: colors.background }} className="rounded-t-2xl p-4">
          <Text className="text-lg font-bold text-foreground mb-4">Select Token</Text>
          <FlatList
            data={sourceTokens}
            keyExtractor={(item) => item.address}
            renderItem={({ item: token }) => (
              <TouchableOpacity
                onPress={() => {
                  setInputToken(token);
                  setInputTokenModalVisible(false);
                }}
                className="flex-row items-center justify-between p-4 border-b"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-base font-semibold text-foreground">{token.symbol}</Text>
                {inputToken?.symbol === token.symbol && <Text className="text-lg text-primary">✓</Text>}
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      </Modal>

      {/* Output Token Modal */}
      <Modal
        visible={outputTokenModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOutputTokenModalVisible(false)}
      >
        <View style={{ backgroundColor: colors.background, opacity: 0.5 }} className="flex-1" />
        <View style={{ backgroundColor: colors.background }} className="rounded-t-2xl p-4">
          <Text className="text-lg font-bold text-foreground mb-4">Select Token</Text>
          <FlatList
            data={destTokens}
            keyExtractor={(item) => item.address}
            renderItem={({ item: token }) => (
              <TouchableOpacity
                onPress={() => {
                  setOutputToken(token);
                  setOutputTokenModalVisible(false);
                }}
                className="flex-row items-center justify-between p-4 border-b"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-base font-semibold text-foreground">{token.symbol}</Text>
                {outputToken?.symbol === token.symbol && <Text className="text-lg text-primary">✓</Text>}
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
