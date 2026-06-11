import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from './ui/icon-symbol';
import { swapService, SwapQuote, SwapTransaction } from '@/lib/swap-service';

interface SwapInterfaceProps {
  onSwapComplete?: (tx: SwapTransaction) => void;
}

const POPULAR_TOKENS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'USDC', 'USDT', 'DAI'];

export function SwapInterface({ onSwapComplete }: SwapInterfaceProps) {
  const colors = useColors();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [fromAmount, setFromAmount] = useState('1');
  const [toAmount, setToAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedTokenField, setSelectedTokenField] = useState<'from' | 'to'>('from');
  const [swapHistory, setSwapHistory] = useState<SwapTransaction[]>([]);

  useEffect(() => {
    swapService.init();

    // Subscribe to swap events
    const unsubscribe = swapService.addListener((tx) => {
      setSwapHistory((prev) => [tx, ...prev]);
      if (tx.status === 'completed') {
        onSwapComplete?.(tx);
      }
    });

    return () => unsubscribe();
  }, [onSwapComplete]);

  const handleGetQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      const newQuote = await swapService.getQuote(fromToken, toToken, parseFloat(fromAmount));
      if (newQuote) {
        setQuote(newQuote);
        setToAmount(newQuote.toAmount.toFixed(6));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!quote) return;

    setIsLoading(true);
    try {
      await swapService.executeSwap(quote);
      setFromAmount('');
      setToAmount('');
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setQuote(null);
    setToAmount('');
  };

  const handleSelectToken = (token: string) => {
    if (selectedTokenField === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }
    setShowTokenModal(false);
    setQuote(null);
    setToAmount('');
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 16,
    },
    swapBox: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    input: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.foreground,
      paddingVertical: 8,
    },
    tokenButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.primary,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tokenButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
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
    quoteContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
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
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 12,
    },
    executeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },
    historyContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    historyTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
    },
    historyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    historyText: {
      fontSize: 12,
      color: colors.foreground,
    },
    historyStatus: {
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingTop: 20,
      paddingBottom: 32,
      maxHeight: '80%',
    },
    modalHeader: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
    },
    tokenList: {
      paddingHorizontal: 20,
    },
    tokenItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tokenItemText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
  });

  const renderHistoryItem: ListRenderItem<SwapTransaction> = ({ item }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyText}>
        {item.fromAmount.toFixed(4)} {item.fromToken} → {item.toAmount.toFixed(4)} {item.toToken}
      </Text>
      <Text
        style={[
          styles.historyStatus,
          {
            backgroundColor:
              item.status === 'completed'
                ? '#22C55E20'
                : item.status === 'pending'
                  ? '#F59E0B20'
                  : '#EF444420',
          },
        ]}
      >
        {item.status === 'completed' ? '✓' : item.status === 'pending' ? '⏳' : '✗'} {item.status}
      </Text>
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Swap Tokens</Text>

        {/* From Token */}
        <View style={styles.swapBox}>
          <Text style={styles.label}>From</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.muted}
              value={fromAmount}
              onChangeText={setFromAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.tokenButton}
              onPress={() => {
                setSelectedTokenField('from');
                setShowTokenModal(true);
              }}
            >
              <Text style={styles.tokenButtonText}>{fromToken}</Text>
              <IconSymbol size={14} name="chevron.right" color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Swap Button */}
        <TouchableOpacity style={styles.swapButton} onPress={handleSwapTokens}>
          <IconSymbol size={20} name="arrow.up.arrow.down" color={colors.background} />
        </TouchableOpacity>

        {/* To Token */}
        <View style={styles.swapBox}>
          <Text style={styles.label}>To</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.muted}
              value={toAmount}
              editable={false}
            />
            <TouchableOpacity
              style={styles.tokenButton}
              onPress={() => {
                setSelectedTokenField('to');
                setShowTokenModal(true);
              }}
            >
              <Text style={styles.tokenButtonText}>{toToken}</Text>
              <IconSymbol size={14} name="chevron.right" color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Get Quote Button */}
        <TouchableOpacity
          style={styles.executeButton}
          onPress={handleGetQuote}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.executeButtonText}>Get Quote</Text>
          )}
        </TouchableOpacity>

        {/* Quote Details */}
        {quote && (
          <View style={styles.quoteContainer}>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Price Impact</Text>
              <Text style={styles.quoteValue}>{quote.priceImpact.toFixed(2)}%</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Slippage</Text>
              <Text style={styles.quoteValue}>{quote.slippage.toFixed(2)}%</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Fee</Text>
              <Text style={styles.quoteValue}>{quote.fee.toFixed(6)} {quote.toToken}</Text>
            </View>

            {/* Execute Swap Button */}
            <TouchableOpacity
              style={styles.executeButton}
              onPress={handleSwap}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.executeButtonText}>Confirm Swap</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Swap History */}
        {swapHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Recent Swaps</Text>
            <FlatList
              data={swapHistory.slice(0, 5)}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>

      {/* Token Selection Modal */}
      <Modal
        visible={showTokenModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Token</Text>
            </View>

            <FlatList
              data={POPULAR_TOKENS}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tokenItem}
                  onPress={() => handleSelectToken(item)}
                >
                  <Text style={styles.tokenItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
              style={styles.tokenList}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
