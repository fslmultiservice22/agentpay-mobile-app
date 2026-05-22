import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { Candle, calculatePriceChange, getHighLow } from '@/lib/trading/trading-config';
import Animated, { FadeIn } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface CandlestickChartProps {
  candles: Candle[];
  height?: number;
}

const chartStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  candlesContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  candle: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  wickLine: {
    width: 1,
  },
  candleBody: {
    borderRadius: 2,
    marginTop: 2,
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    opacity: 0.2,
  },
  priceLabel: {
    fontSize: 10,
    position: 'absolute',
    right: 8,
  },
});

export function CandlestickChart({ candles, height = 300 }: CandlestickChartProps) {
  const colors = useColors();

  if (candles.length === 0) {
    return (
      <View style={[chartStyles.container, { height, backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.muted }}>No data available</Text>
      </View>
    );
  }

  const { high, low } = getHighLow(candles);
  const priceRange = high - low;
  const chartWidth = width - 32;
  const candleWidth = Math.max(2, (chartWidth - 20) / candles.length);
  const priceChange = calculatePriceChange(candles);
  const isPositive = priceChange >= 0;

  const styles = {
    ...chartStyles,
    container: {
      ...chartStyles.container,
      backgroundColor: colors.surface,
    },
    title: {
      ...chartStyles.title,
      color: colors.foreground,
    },
    changeText: {
      ...chartStyles.changeText,
      color: isPositive ? colors.success : colors.error,
    },
    chart: {
      ...chartStyles.chart,
      height,
      backgroundColor: colors.background,
    },
    wickLine: {
      ...chartStyles.wickLine,
      backgroundColor: colors.border,
    },
    gridLine: {
      ...chartStyles.gridLine,
      backgroundColor: colors.border,
    },
    priceLabel: {
      ...chartStyles.priceLabel,
      color: colors.muted,
    },
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[chartStyles.container, styles.container]}>
      <View style={styles.header}>
        <Text style={styles.title}>Price Chart</Text>
        <Text style={styles.changeText}>
          {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
        </Text>
      </View>

      <View style={styles.chart}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio, i) => (
          <View
            key={`grid-${i}`}
            style={[
              styles.gridLine,
              {
                top: `${ratio * 100}%`,
              },
            ]}
          />
        ))}

        {/* Price labels */}
        {[0, 0.5, 1].map((ratio, i) => {
          const price = high - priceRange * ratio;
          return (
            <Text
              key={`price-${i}`}
              style={[
                styles.priceLabel,
                {
                  top: `${ratio * 100 - 5}%`,
                },
              ]}
            >
              ${price.toFixed(0)}
            </Text>
          );
        })}

        {/* Candles */}
        <View style={styles.candlesContainer}>
          {candles.map((candle, index) => {
            const candleHigh = (candle.high - low) / priceRange;
            const candleLow = (candle.low - low) / priceRange;
            const candleOpen = (candle.open - low) / priceRange;
            const candleClose = (candle.close - low) / priceRange;

            const isUp = candle.close >= candle.open;
            const bodyTop = Math.min(candleOpen, candleClose);
            const bodyHeight = Math.abs(candleClose - candleOpen) || 1;

            return (
              <View key={`candle-${index}`} style={styles.candle}>
                {/* Wick */}
                <View
                  style={[
                    styles.wickLine,
                    {
                      height: (candleHigh - candleLow) * height,
                    },
                  ]}
                />

                {/* Body */}
                <View
                  style={[
                    styles.candleBody,
                    {
                      width: Math.max(2, candleWidth - 2),
                      height: Math.max(2, bodyHeight * height),
                      backgroundColor: isUp ? colors.success : colors.error,
                      marginTop: bodyTop * height,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <View>
          <Text style={{ fontSize: 10, color: colors.muted }}>High</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            ${high.toFixed(2)}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 10, color: colors.muted }}>Low</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            ${low.toFixed(2)}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 10, color: colors.muted }}>Current</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground }}>
            ${candles[candles.length - 1].close.toFixed(2)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}


