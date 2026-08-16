import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import { SlippageControl } from '@/components/slippage-control';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';
import { usePortfolioSync } from '@/hooks/use-portfolio-sync';
import { useSwapHistory } from '@/hooks/use-swap-history';
import {
  NETWORK_FEE_PROFILES,
  SWAP_TOKEN_LIST,
  formatTokenAmount,
  getPriceImpactSeverity,
  getSwapQuote,
  getTokenPriceUsd,
  validateSwap,
  type SwapNetwork,
  type SwapQuoteWarning,
  type SwapTokenSymbol,
  type SwapValidationResult,
} from '@/lib/swap-quote-service';

/** Quick-fill shortcuts, expressed as a fraction of the available balance. */
const QUICK_AMOUNTS = [0.25, 0.5, 0.75, 1] as const;

const NETWORKS = Object.keys(NETWORK_FEE_PROFILES) as SwapNetwork[];

/**
 * Demo balances. The screen has no wallet connection yet, so balances are used
 * only to enable the quick-amount buttons and the insufficient-balance check.
 */
const DEMO_BALANCES: Partial<Record<SwapTokenSymbol, number>> = {
  ETH: 2.4318,
  WETH: 0.5,
  BTC: 0.0642,
  USDC: 5230.55,
  USDT: 1200,
  DAI: 640.12,
  MATIC: 1850,
  ARB: 420,
  OP: 260,
  UNI: 74.5,
  LINK: 120.8,
};

/** Maps a validation failure to a localized message. */
function validationMessageKey(code: SwapValidationResult['code']): string {
  switch (code) {
    case 'empty-amount':
      return 'trading.errorEmptyAmount';
    case 'invalid-amount':
      return 'trading.errorInvalidAmount';
    case 'non-positive-amount':
      return 'trading.errorPositiveAmount';
    case 'same-token':
      return 'trading.errorSameToken';
    case 'insufficient-balance':
      return 'trading.errorInsufficientBalance';
    case 'insufficient-gas':
      return 'trading.errorInsufficientGas';
    default:
      return 'trading.error';
  }
}

/** Maps a quote warning to a localized message. */
function warningMessageKey(code: SwapQuoteWarning['code']): string {
  switch (code) {
    case 'same-token':
      return 'trading.errorSameToken';
    case 'high-price-impact':
      return 'trading.warnHighPriceImpact';
    case 'severe-price-impact':
      return 'trading.warnSeverePriceImpact';
    case 'fee-exceeds-value':
      return 'trading.warnFeeExceedsValue';
    case 'low-slippage':
      return 'trading.warnLowSlippage';
    case 'high-slippage':
      return 'trading.highSlippageWarning';
    case 'dust-amount':
      return 'trading.warnDustAmount';
    default:
      return 'trading.error';
  }
}

export default function TradingScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { addSwap, getRecentSwaps } = useSwapHistory();
  const { syncAfterSwap } = usePortfolioSync();

  const [fromToken, setFromToken] = useState<SwapTokenSymbol>('ETH');
  const [toToken, setToToken] = useState<SwapTokenSymbol>('USDC');
  const [fromAmount, setFromAmount] = useState('');
  const [network, setNetwork] = useState<SwapNetwork>('ethereum');
  const [slippage, setSlippage] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const parsedAmount = useMemo(() => {
    const value = Number(fromAmount.replace(',', '.'));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [fromAmount]);

  const fromBalance = DEMO_BALANCES[fromToken] ?? 0;
  const gasToken = NETWORK_FEE_PROFILES[network].gasToken;

  // The quote is derived state: recomputed whenever any input changes, so the
  // "to" field and the fee breakdown always match what will be executed.
  const quote = useMemo(
    () =>
      getSwapQuote({
        fromToken,
        toToken,
        fromAmount: parsedAmount,
        slippagePercent: slippage,
        network,
      }),
    [fromToken, toToken, parsedAmount, slippage, network],
  );

  const validation = useMemo(
    () =>
      validateSwap({
        fromToken,
        toToken,
        rawAmount: fromAmount,
        balance: fromBalance,
        gasBalance: DEMO_BALANCES[gasToken],
        network,
      }),
    [fromToken, toToken, fromAmount, fromBalance, gasToken, network],
  );

  const impactSeverity = getPriceImpactSeverity(quote.priceImpactPercent);
  const impactColor =
    impactSeverity === 'high' ? colors.error : impactSeverity === 'medium' ? colors.warning : colors.success;

  const handleSelectToken = useCallback(
    (symbol: SwapTokenSymbol) => {
      if (pickerTarget === 'from') {
        // Selecting the token already on the other side swaps the pair instead
        // of producing an invalid same-token quote.
        if (symbol === toToken) setToToken(fromToken);
        setFromToken(symbol);
      } else if (pickerTarget === 'to') {
        if (symbol === fromToken) setFromToken(toToken);
        setToToken(symbol);
      }
      setPickerTarget(null);
      setError(null);
      void Haptics.selectionAsync();
    },
    [pickerTarget, fromToken, toToken],
  );

  const handleInvert = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [fromToken, toToken]);

  const handleQuickAmount = useCallback(
    (fraction: number) => {
      if (fromBalance <= 0) return;
      // Leave a gas buffer when spending the whole native balance.
      const isGasToken = gasToken === fromToken;
      const gasBuffer = isGasToken ? quote.networkFeeNative * 1.5 : 0;
      const usable = Math.max(0, fromBalance - gasBuffer);
      const amount = fraction === 1 ? usable : fromBalance * fraction;
      setFromAmount(amount > 0 ? amount.toFixed(6).replace(/\.?0+$/, '') : '0');
      setError(null);
      void Haptics.selectionAsync();
    },
    [fromBalance, gasToken, fromToken, quote.networkFeeNative],
  );

  const handleReview = useCallback(() => {
    if (!validation.valid) {
      setError(t(validationMessageKey(validation.code)));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setError(null);
    setShowConfirm(true);
  }, [validation, t]);

  const handleConfirmSwap = useCallback(async () => {
    setShowConfirm(false);
    setLoading(true);
    setError(null);

    try {
      await addSwap({
        fromToken,
        toToken,
        fromAmount: String(parsedAmount),
        toAmount: quote.toAmount.toFixed(6),
        timestamp: Date.now(),
        status: 'completed',
        priceImpact: quote.priceImpactPercent,
        slippage,
      });

      await syncAfterSwap(fromToken, toToken, parsedAmount, quote.toAmount, quote.rate);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t('trading.swapExecuted'),
        `${formatTokenAmount(fromToken, parsedAmount)} ${fromToken} → ${formatTokenAmount(
          toToken,
          quote.toAmount,
        )} ${toToken}`,
      );
      setFromAmount('');
    } catch (err) {
      console.error('Swap error:', err);
      setError(t('payment.error'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [
    addSwap,
    fromToken,
    toToken,
    parsedAmount,
    quote.toAmount,
    quote.priceImpactPercent,
    quote.rate,
    slippage,
    syncAfterSwap,
    t,
  ]);

  const recentSwaps = getRecentSwaps(5);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingVertical: 16,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        title: { fontSize: 28, fontWeight: '700', color: colors.foreground },
        section: { marginVertical: 16, paddingHorizontal: 16 },
        sectionTitle: {
          fontSize: 14,
          color: colors.muted,
          marginBottom: 12,
          fontWeight: '600',
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
        },
        tokenSelector: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        tokenButton: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.background,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.border,
          minWidth: 96,
          justifyContent: 'space-between',
        },
        tokenText: { fontSize: 14, fontWeight: '700', color: colors.foreground },
        chevron: { fontSize: 10, color: colors.muted, marginLeft: 8 },
        input: {
          backgroundColor: colors.background,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          fontSize: 18,
          fontWeight: '600',
          color: colors.foreground,
          borderWidth: 1,
          borderColor: colors.border,
        },
        label: { fontSize: 12, color: colors.muted, marginBottom: 8 },
        rowBetween: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        quickRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
        quickButton: {
          flex: 1,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          alignItems: 'center',
        },
        quickButtonText: { fontSize: 12, fontWeight: '600', color: colors.foreground },
        invertButton: {
          backgroundColor: colors.primary,
          borderRadius: 22,
          width: 44,
          height: 44,
          justifyContent: 'center',
          alignItems: 'center',
        },
        priceInfo: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          marginTop: 12,
        },
        priceLabel: { fontSize: 12, color: colors.muted },
        priceValue: { fontSize: 14, fontWeight: '600', color: colors.foreground },
        networkRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
        networkChip: {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 20,
          borderWidth: 1,
        },
        networkChipText: { fontSize: 12, fontWeight: '600' },
        swapButton: {
          backgroundColor: colors.primary,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          marginHorizontal: 16,
          marginVertical: 8,
        },
        swapButtonText: { color: colors.background, fontSize: 16, fontWeight: '700' },
        feeRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        },
        feeLabel: { fontSize: 12, color: colors.muted },
        feeValue: { fontSize: 12, fontWeight: '600', color: colors.foreground },
        warningBox: {
          borderRadius: 10,
          padding: 10,
          marginTop: 8,
          borderWidth: 1,
        },
        warningText: { fontSize: 12, fontWeight: '500' },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'flex-end',
        },
        modalSheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 16,
          paddingBottom: 32,
          paddingHorizontal: 16,
          maxHeight: '80%',
        },
        modalTitle: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.foreground,
          marginBottom: 12,
        },
        tokenRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        secondaryButton: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: 12,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        },
        primaryButton: {
          flex: 1,
          paddingVertical: 14,
          borderRadius: 12,
          backgroundColor: colors.primary,
          alignItems: 'center',
        },
      }),
    [colors],
  );

  const disableReview = loading || !validation.valid;

  return (
    <ScreenContainer className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('trading.title')}</Text>
        </View>

        {/* Swap card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('trading.swap')}</Text>

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>{t('trading.from')}</Text>
              <Text style={styles.label}>
                {t('trading.balance')}: {formatTokenAmount(fromToken, fromBalance)} {fromToken}
              </Text>
            </View>

            <View style={styles.tokenSelector}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 12 }]}
                placeholder="0.0"
                placeholderTextColor={colors.muted}
                value={fromAmount}
                onChangeText={value => {
                  setFromAmount(value);
                  setError(null);
                }}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={styles.tokenButton}
                onPress={() => setPickerTarget('from')}
                accessibilityRole="button"
                accessibilityLabel={t('trading.selectToken')}
              >
                <Text style={styles.tokenText}>{fromToken}</Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 8, marginBottom: 0 }]}>
              ≈ ${quote.fromValueUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </Text>

            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map(fraction => (
                <TouchableOpacity
                  key={fraction}
                  style={styles.quickButton}
                  onPress={() => handleQuickAmount(fraction)}
                >
                  <Text style={styles.quickButtonText}>
                    {fraction === 1 ? t('trading.max') : `${fraction * 100}%`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ alignItems: 'center', marginVertical: 14 }}>
              <TouchableOpacity
                style={styles.invertButton}
                onPress={handleInvert}
                accessibilityRole="button"
                accessibilityLabel={t('trading.invertPair')}
              >
                <Text style={{ fontSize: 20, color: colors.background }}>⇅</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>{t('trading.to')}</Text>
            <View style={styles.tokenSelector}>
              <View style={[styles.input, { flex: 1, marginRight: 12, justifyContent: 'center' }]}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: quote.toAmount > 0 ? colors.foreground : colors.muted,
                  }}
                >
                  {quote.toAmount > 0 ? formatTokenAmount(toToken, quote.toAmount) : '0.0'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.tokenButton}
                onPress={() => setPickerTarget('to')}
                accessibilityRole="button"
                accessibilityLabel={t('trading.selectToken')}
              >
                <Text style={styles.tokenText}>{toToken}</Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 8, marginBottom: 0 }]}>
              ≈ ${quote.toValueUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </Text>

            <View style={styles.priceInfo}>
              <Text style={styles.priceLabel}>{t('trading.rate')}</Text>
              <Text style={styles.priceValue}>
                1 {fromToken} = {formatTokenAmount(toToken, quote.rate)} {toToken}
              </Text>
            </View>
          </View>
        </View>

        {/* Network selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('trading.network')}</Text>
          <View style={styles.networkRow}>
            {NETWORKS.map(item => {
              const active = item === network;
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setNetwork(item);
                    void Haptics.selectionAsync();
                  }}
                  style={[
                    styles.networkChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.networkChipText,
                      { color: active ? colors.background : colors.foreground },
                    ]}
                  >
                    {NETWORK_FEE_PROFILES[item].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Slippage */}
        <View style={styles.section}>
          <SlippageControl value={slippage} onChange={setSlippage} />
        </View>

        {/* Fee breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('trading.transactionDetails')}</Text>

          <View style={styles.card}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{t('trading.minimumReceived')}</Text>
              <Text style={styles.feeValue}>
                {formatTokenAmount(toToken, quote.minimumReceived)} {toToken}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{t('trading.priceImpact')}</Text>
              <Text style={[styles.feeValue, { color: impactColor }]}>
                {quote.priceImpactPercent.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{t('trading.protocolFee')}</Text>
              <Text style={styles.feeValue}>
                {quote.protocolFeePercent.toFixed(2)}% (${quote.protocolFeeUsd.toFixed(2)})
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{t('trading.networkFee')}</Text>
              <Text style={styles.feeValue}>
                {quote.networkFeeNative.toFixed(6)} {gasToken} (${quote.networkFeeUsd.toFixed(2)})
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>{t('trading.estimatedTime')}</Text>
              <Text style={styles.feeValue}>~{quote.estimatedSeconds}s</Text>
            </View>
            <View
              style={[
                styles.feeRow,
                {
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingTop: 10,
                  marginTop: 2,
                  marginBottom: 0,
                },
              ]}
            >
              <Text style={[styles.feeLabel, { fontWeight: '700' }]}>{t('trading.totalCost')}</Text>
              <Text style={[styles.feeValue, { color: colors.primary, fontSize: 14 }]}>
                ${quote.totalFeeUsd.toFixed(2)}
              </Text>
            </View>

            {/* Quote warnings, ordered by severity by the service */}
            {parsedAmount > 0 &&
              quote.warnings.map(warning => {
                const tone =
                  warning.severity === 'critical'
                    ? colors.error
                    : warning.severity === 'warning'
                      ? colors.warning
                      : colors.muted;
                return (
                  <View
                    key={warning.code}
                    style={[styles.warningBox, { borderColor: tone, backgroundColor: `${tone}18` }]}
                  >
                    <Text style={[styles.warningText, { color: tone }]}>
                      {t(warningMessageKey(warning.code))}
                    </Text>
                  </View>
                );
              })}
          </View>
        </View>

        {error && (
          <View style={styles.section}>
            <View
              style={[
                styles.warningBox,
                { borderColor: colors.error, backgroundColor: `${colors.error}18`, marginTop: 0 },
              ]}
            >
              <Text style={[styles.warningText, { color: colors.error }]}>{error}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.swapButton, { opacity: disableReview ? 0.5 : 1 }]}
          onPress={handleReview}
          disabled={disableReview}
        >
          <Text style={styles.swapButtonText}>
            {loading ? t('common.loading') : t('trading.reviewSwap')}
          </Text>
        </TouchableOpacity>

        {/* Recent swaps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('trading.swapHistory')}</Text>

          {recentSwaps.length > 0 ? (
            recentSwaps.map(swap => (
              <View key={swap.id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View>
                    <Text style={[styles.priceValue, { marginBottom: 4 }]}>
                      {swap.fromToken} → {swap.toToken}
                    </Text>
                    <Text style={styles.feeLabel}>{new Date(swap.timestamp).toLocaleString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.priceValue, { color: colors.success }]}>
                      +{swap.toAmount} {swap.toToken}
                    </Text>
                    <Text style={[styles.feeLabel, { color: colors.success }]}>
                      {t('trading.completed')}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={[styles.feeLabel, { textAlign: 'center' }]}>{t('trading.noHistory')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Token picker */}
      <Modal
        visible={pickerTarget !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerTarget(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerTarget(null)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{t('trading.selectToken')}</Text>
            <FlatList
              data={SWAP_TOKEN_LIST}
              keyExtractor={item => item.symbol}
              renderItem={({ item }) => {
                const selected =
                  (pickerTarget === 'from' && item.symbol === fromToken) ||
                  (pickerTarget === 'to' && item.symbol === toToken);
                return (
                  <TouchableOpacity style={styles.tokenRow} onPress={() => handleSelectToken(item.symbol)}>
                    <View>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
                        {item.symbol}
                        {selected ? '  ✓' : ''}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{item.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground }}>
                        ${getTokenPriceUsd(item.symbol).toLocaleString('en-US')}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                        {formatTokenAmount(item.symbol, DEMO_BALANCES[item.symbol] ?? 0)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmation sheet */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{t('trading.confirmSwap')}</Text>

            <View style={[styles.card, { marginBottom: 16 }]}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{t('trading.youPay')}</Text>
                <Text style={styles.feeValue}>
                  {formatTokenAmount(fromToken, parsedAmount)} {fromToken}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{t('trading.youReceive')}</Text>
                <Text style={styles.feeValue}>
                  {formatTokenAmount(toToken, quote.toAmount)} {toToken}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{t('trading.minimumReceived')}</Text>
                <Text style={styles.feeValue}>
                  {formatTokenAmount(toToken, quote.minimumReceived)} {toToken}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>{t('trading.priceImpact')}</Text>
                <Text style={[styles.feeValue, { color: impactColor }]}>
                  {quote.priceImpactPercent.toFixed(2)}%
                </Text>
              </View>
              <View style={[styles.feeRow, { marginBottom: 0 }]}>
                <Text style={styles.feeLabel}>{t('trading.totalCost')}</Text>
                <Text style={styles.feeValue}>${quote.totalFeeUsd.toFixed(2)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowConfirm(false)}>
                <Text style={{ color: colors.foreground, fontWeight: '700' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmSwap}>
                <Text style={{ color: colors.background, fontWeight: '700' }}>
                  {t('trading.confirmSwap')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
