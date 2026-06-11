import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { priceService, PriceData } from '@/lib/price-service';

interface PriceTickerProps {
  symbols?: string[];
  onRefresh?: () => Promise<void>;
}

const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE'];

export function PriceTicker({ symbols = DEFAULT_SYMBOLS, onRefresh }: PriceTickerProps) {
  const colors = useColors();
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Initialize price service
    priceService.init();

    // Subscribe to price updates
    const unsubscribers = symbols.map((symbol) =>
      priceService.subscribe(symbol, (data) => {
        setPrices((prev) => new Map(prev).set(symbol, data));
      })
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [symbols]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      // Prices will update automatically via subscriptions
    } finally {
      setIsRefreshing(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    scrollView: {
      paddingHorizontal: 16,
    },
    priceCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 12,
      marginRight: 8,
      minWidth: 120,
      borderWidth: 1,
      borderColor: colors.border,
    },
    symbol: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 4,
    },
    price: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 4,
    },
    change: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 4,
    },
    volume: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 4,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Prices</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {symbols.map((symbol) => {
          const priceData = prices.get(symbol);
          if (!priceData) {
            return (
              <View key={symbol} style={styles.priceCard}>
                <Text style={styles.symbol}>{symbol}</Text>
                <Text style={styles.price}>Loading...</Text>
              </View>
            );
          }

          const isPositive = priceData.changePercent24h >= 0;
          const changeColor = isPositive ? '#22C55E' : '#EF4444';
          const emoji = isPositive ? '📈' : '📉';

          return (
            <View key={symbol} style={styles.priceCard}>
              <Text style={styles.symbol}>{symbol}</Text>
              <Text style={styles.price}>${priceData.price.toFixed(2)}</Text>
              <Text style={[styles.change, { color: changeColor }]}>
                {emoji} {isPositive ? '+' : ''}
                {priceData.changePercent24h.toFixed(2)}%
              </Text>
              <Text style={styles.volume}>
                Vol: ${(priceData.volume24h / 1000000).toFixed(0)}M
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
