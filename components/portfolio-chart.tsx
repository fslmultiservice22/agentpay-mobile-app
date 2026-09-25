import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { portfolioAnalytics, PortfolioStats } from '@/lib/portfolio-analytics';

interface PortfolioChartProps {
  timeframe?: '1h' | '24h' | '7d' | '30d';
  onStatsUpdate?: (stats: PortfolioStats) => void;
}

export function PortfolioChart({ timeframe = '24h', onStatsUpdate }: PortfolioChartProps) {
  const colors = useColors();
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] } | null>(null);

  useEffect(() => {
    // Initialize analytics
    portfolioAnalytics.init();

    // Subscribe to stats updates
    const unsubscribe = portfolioAnalytics.addListener((updatedStats) => {
      setStats(updatedStats);
      onStatsUpdate?.(updatedStats);
    });

    // Get initial data
    const initialStats = portfolioAnalytics.getStats();
    setStats(initialStats);

    const initialChartData = portfolioAnalytics.getChartData(timeframe);
    setChartData(initialChartData);

    return () => unsubscribe();
  }, [timeframe, onStatsUpdate]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 8,
    },
    value: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 4,
    },
    change: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    statItem: {
      flex: 1,
      minWidth: '48%',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
    },
    chartContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    chartPlaceholder: {
      height: 200,
      backgroundColor: colors.background,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    chartText: {
      fontSize: 14,
      color: colors.muted,
    },
    performanceContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    performanceTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
    },
    performanceGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    performanceItem: {
      flex: 1,
      minWidth: '48%',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    performanceLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 4,
    },
    performanceValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.foreground,
    },
  });

  if (!stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading analytics...</Text>
      </View>
    );
  }

  const isPositive = stats.totalChangePercent >= 0;
  const changeColor = isPositive ? '#22C55E' : '#EF4444';
  const emoji = isPositive ? '📈' : '📉';

  const performanceMetrics = portfolioAnalytics.getPerformanceMetrics();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio Performance</Text>
        <Text style={styles.value}>${stats.totalValue.toFixed(2)}</Text>
        <Text style={[styles.change, { color: changeColor }]}>
          {emoji} {isPositive ? '+' : ''}
          {stats.totalChangePercent.toFixed(2)}% (${stats.totalChange.toFixed(2)})
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Best Performer</Text>
          <Text style={styles.statValue}>
            {stats.bestPerformer ? `${stats.bestPerformer.symbol} +${stats.bestPerformer.changePercent.toFixed(1)}%` : 'N/A'}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Worst Performer</Text>
          <Text style={styles.statValue}>
            {stats.worstPerformer ? `${stats.worstPerformer.symbol} ${stats.worstPerformer.changePercent.toFixed(1)}%` : 'N/A'}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Diversification</Text>
          <Text style={styles.statValue}>{(stats.diversification * 100).toFixed(0)}%</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Volatility</Text>
          <Text style={styles.statValue}>{stats.volatility.toFixed(2)}%</Text>
        </View>
      </View>

      {/* Chart Placeholder */}
      <View style={styles.chartContainer}>
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartText}>📊 Chart visualization</Text>
          <Text style={styles.chartText}>({chartData?.data.length || 0} data points)</Text>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.performanceContainer}>
        <Text style={styles.performanceTitle}>Performance Metrics</Text>
        <View style={styles.performanceGrid}>
          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>ROI</Text>
            <Text style={[styles.performanceValue, { color: performanceMetrics.roi >= 0 ? '#22C55E' : '#EF4444' }]}>
              {performanceMetrics.roi.toFixed(2)}%
            </Text>
          </View>

          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Sharpe Ratio</Text>
            <Text style={styles.performanceValue}>{performanceMetrics.sharpeRatio.toFixed(2)}</Text>
          </View>

          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Max Drawdown</Text>
            <Text style={[styles.performanceValue, { color: '#EF4444' }]}>
              -{performanceMetrics.maxDrawdown.toFixed(2)}%
            </Text>
          </View>

          <View style={styles.performanceItem}>
            <Text style={styles.performanceLabel}>Win Rate</Text>
            <Text style={[styles.performanceValue, { color: '#22C55E' }]}>
              {performanceMetrics.winRate.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
