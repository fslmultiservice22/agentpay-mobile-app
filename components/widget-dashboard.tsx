import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from './ui/icon-symbol';
import { widgetService, WidgetData } from '@/lib/widget-service';

interface WidgetDashboardProps {
  onRefresh?: () => Promise<void>;
  onTap?: () => void;
}

export function WidgetDashboard({ onRefresh, onTap }: WidgetDashboardProps) {
  const colors = useColors();
  const [widgetData, setWidgetData] = useState<WidgetData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Get initial data
    const data = widgetService.getWidgetData();
    if (data) {
      setWidgetData(data);
    }

    // Subscribe to updates
    const unsubscribe = widgetService.addListener((data) => {
      setWidgetData(data);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const isPositive = (widgetData?.changePercent ?? 0) >= 0;
  const emoji = isPositive ? '📈' : '📉';
  const changeColor = isPositive ? '#22C55E' : '#EF4444';

  const styles = StyleSheet.create({
    container: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
    },
    refreshButton: {
      padding: 8,
    },
    content: {
      gap: 8,
    },
    valueContainer: {
      gap: 4,
    },
    value: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.foreground,
    },
    change: {
      fontSize: 16,
      fontWeight: '600',
      color: changeColor,
      flexDirection: 'row',
      alignItems: 'center',
    },
    changeText: {
      color: changeColor,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerItem: {
      flex: 1,
      alignItems: 'center',
    },
    footerLabel: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 4,
    },
    footerValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    lastUpdated: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      color: colors.muted,
    },
  });

  // Rendered only after `styles` exists, so the empty state can be themed too.
  if (!widgetData) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  const lastUpdatedTime = new Date(widgetData.lastUpdated).toLocaleTimeString();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onTap}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>AgentPay Portfolio</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <IconSymbol
            size={20}
            name="arrow.clockwise"
            color={isRefreshing ? colors.muted : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.valueContainer}>
          <Text style={styles.value}>${widgetData.totalValue.toFixed(2)}</Text>
          <Text style={styles.change}>
            <Text style={styles.changeText}>
              {emoji} {isPositive ? '+' : ''}{widgetData.changePercent.toFixed(2)}%
            </Text>
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Assets</Text>
            <Text style={styles.footerValue}>{widgetData.holdingCount}</Text>
          </View>
          {widgetData.topHolding && (
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Top</Text>
              <Text style={styles.footerValue}>{widgetData.topHolding}</Text>
            </View>
          )}
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Change</Text>
            <Text style={[styles.footerValue, { color: changeColor }]}>
              ${Math.abs(widgetData.changeAmount).toFixed(2)}
            </Text>
          </View>
        </View>

        <Text style={styles.lastUpdated}>Updated: {lastUpdatedTime}</Text>
      </View>
    </TouchableOpacity>
  );
}
