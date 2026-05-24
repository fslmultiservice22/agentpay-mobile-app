import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useTokenSwap } from '@/hooks/use-token-swap';
import { useChainId } from 'wagmi';

export default function TokenSwapScreen() {
  const colors = useColors();
  const chainId = useChainId();
  const { quote, tokens, isLoading, isQuoting, error, loadTokens, getQuote, clearQuote } = useTokenSwap();

  const [fromToken, setFromToken] = useState<string>('');
  const [toToken, setToToken] = useState<string>('');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<string>('1');
  const [showFromTokens, setShowFromTokens] = useState(false);
  const [showToTokens, setShowToTokens] = useState(false);

  // Load tokens on mount
  useEffect(() => {
    if (chainId) {
      loadTokens(chainId);
    }
  }, [chainId, loadTokens]);

  // Get quote when inputs change
  useEffect(() => {
    if (fromToken && toToken && fromAmount && parseFloat(fromAmount) > 0) {
      const timer = setTimeout(() => {
        getQuote(chainId, fromToken, toToken, fromAmount, parseFloat(slippage));
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [fromToken, toToken, fromAmount, slippage, chainId, getQuote]);

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    clearQuote();
  };

  const handleExecuteSwap = () => {
    if (!quote) {
      Alert.alert('Error', 'No quote available');
      return;
    }

    Alert.alert(
      'Confirm Swap',
      `Swap ${fromAmount} ${quote.fromToken} for ${quote.toAmount} ${quote.toToken}?`,
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success', 'Swap transaction submitted!');
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.foreground,
    },
    content: {
      padding: 16,
      gap: 16,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 8,
      fontWeight: '600',
    },
    tokenSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    tokenButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    tokenButtonText: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 14,
    },
    input: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      color: colors.foreground,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
    },
    swapButton: {
      alignSelf: 'center',
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginVertical: 12,
    },
    swapButtonText: {
      fontSize: 20,
    },
    quoteContainer: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    quoteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    quoteLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    quoteValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
    executeButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    executeButtonText: {
      color: colors.background,
      fontWeight: '600',
      fontSize: 16,
    },
    disabledButton: {
      opacity: 0.5,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 8,
    },
    slippageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    slippageInput: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 8,
      color: colors.foreground,
      fontSize: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    slippagePercent: {
      color: colors.muted,
      fontSize: 14,
    },
  });

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Token Swap</Text>
        </View>

        <View style={styles.content}>
          {/* From Token */}
          <View style={styles.card}>
            <Text style={styles.label}>From</Text>
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => setShowFromTokens(!showFromTokens)}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                {fromToken || 'Select token'}
              </Text>
              <Text style={{ color: colors.muted }}>▼</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor={colors.muted}
              value={fromAmount}
              onChangeText={setFromAmount}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Swap Button */}
          <TouchableOpacity style={styles.swapButton} onPress={handleSwapTokens}>
            <Text style={styles.swapButtonText}>⇅</Text>
          </TouchableOpacity>

          {/* To Token */}
          <View style={styles.card}>
            <Text style={styles.label}>To</Text>
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => setShowToTokens(!showToTokens)}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                {toToken || 'Select token'}
              </Text>
              <Text style={{ color: colors.muted }}>▼</Text>
            </TouchableOpacity>

            {quote && (
              <View style={styles.quoteContainer}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.foreground, marginBottom: 8 }}>
                  {quote.toAmount} {quote.toToken}
                </Text>
              </View>
            )}
          </View>

          {/* Slippage */}
          <View style={styles.card}>
            <Text style={styles.label}>Slippage Tolerance</Text>
            <View style={styles.slippageContainer}>
              <TextInput
                style={styles.slippageInput}
                placeholder="1"
                placeholderTextColor={colors.muted}
                value={slippage}
                onChangeText={setSlippage}
                keyboardType="decimal-pad"
              />
              <Text style={styles.slippagePercent}>%</Text>
            </View>
          </View>

          {/* Quote Details */}
          {quote && (
            <View style={styles.card}>
              <Text style={styles.label}>Quote Details</Text>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Price Impact</Text>
                <Text style={styles.quoteValue}>{quote.priceImpact}%</Text>
              </View>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Estimated Gas</Text>
                <Text style={styles.quoteValue}>{quote.estimatedGas}</Text>
              </View>
              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>Protocols</Text>
                <Text style={styles.quoteValue}>{quote.protocols.length} route(s)</Text>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && <Text style={styles.errorText}>Error: {error}</Text>}

          {/* Execute Button */}
          <TouchableOpacity
            style={[styles.executeButton, !quote && styles.disabledButton]}
            onPress={handleExecuteSwap}
            disabled={!quote || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.executeButtonText}>
                {isQuoting ? 'Getting Quote...' : 'Execute Swap'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
