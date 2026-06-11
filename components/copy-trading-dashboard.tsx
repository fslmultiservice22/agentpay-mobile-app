import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from './ui/icon-symbol';
import { copyTradingService, Trader, CopyTrade } from '@/lib/copy-trading';

interface CopyTradingDashboardProps {
  onTradeCreated?: (trade: CopyTrade) => void;
}

export function CopyTradingDashboard({ onTradeCreated }: CopyTradingDashboardProps) {
  const colors = useColors();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [copiedTrades, setCopiedTrades] = useState<CopyTrade[]>([]);
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTraderModal, setShowTraderModal] = useState(false);
  const [showTraderDetailsModal, setShowTraderDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    totalTraders: 0,
    activeCopies: 0,
    totalCopiedTrades: 0,
    totalProfitLoss: 0,
    averageWinRate: 0,
  });
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  useEffect(() => {
    copyTradingService.init();

    // Subscribe to trade events
    const unsubscribe = copyTradingService.addListener((trade) => {
      setCopiedTrades((prev) => {
        const updated = prev.filter((t) => t.id !== trade.id);
        return [trade, ...updated];
      });
      updateStats();
      if (trade.status === 'copied') {
        onTradeCreated?.(trade);
      }
    });

    // Load initial data
    setTraders(copyTradingService.getAllTraders());
    setCopiedTrades(copyTradingService.getAllCopiedTrades());
    updateStats();

    return () => unsubscribe();
  }, [onTradeCreated]);

  const updateStats = () => {
    const stats = copyTradingService.getOverallStatistics();
    setStats(stats);
  };

  const handleSelectTrader = (trader: Trader) => {
    setSelectedTrader(trader);
    setShowTraderModal(false);
    setShowTraderDetailsModal(true);
  };

  const handleStartCopying = async () => {
    if (!selectedTrader) return;

    setIsLoading(true);
    try {
      const success = await copyTradingService.startCopyingTrader(selectedTrader.id);
      if (success) {
        // Simulate copying a trade
        const mockTrade = await copyTradingService.copyTrade(
          selectedTrader.id,
          `trade_${Date.now()}`,
          'ETH',
          'USDC',
          selectedTrader.avgReturn * 100,
          2500
        );

        if (mockTrade) {
          setShowTraderDetailsModal(false);
          setSelectedTrader(null);
          updateStats();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopCopying = async (traderId: string) => {
    setIsLoading(true);
    try {
      await copyTradingService.stopCopyingTrader(traderId);
      updateStats();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseTrade = async (tradeId: string) => {
    setIsLoading(true);
    try {
      await copyTradingService.closeCopyTrade(tradeId);
      updateStats();
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTraders = traders.filter((trader) => {
    if (filterRisk === 'all') return true;
    return trader.riskLevel === filterRisk;
  });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return '#22C55E';
      case 'medium':
        return '#F59E0B';
      case 'high':
        return '#EF4444';
      default:
        return colors.muted;
    }
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
    statsContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    statLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    statValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
    filterContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
    filterButtonTextActive: {
      color: colors.background,
    },
    tradersContainer: {
      marginBottom: 16,
    },
    tradersTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
    },
    traderItem: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    traderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    traderName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    traderBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: colors.primary + '20',
    },
    traderBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary,
    },
    traderStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    traderStat: {
      fontSize: 11,
      color: colors.muted,
    },
    traderStatValue: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.foreground,
    },
    traderRisk: {
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      color: colors.background,
      alignSelf: 'flex-start',
      marginBottom: 8,
    },
    copyButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    copyButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.background,
    },
    tradesContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    tradesTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
    },
    tradeItem: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tradeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    tradePair: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    tradeStatus: {
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    tradeDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    tradeDetail: {
      fontSize: 11,
      color: colors.muted,
    },
    tradeDetailValue: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.foreground,
    },
    closeButton: {
      backgroundColor: '#EF444420',
      borderRadius: 8,
      paddingVertical: 6,
      alignItems: 'center',
    },
    closeButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#EF4444',
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
      paddingHorizontal: 20,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      marginBottom: 16,
    },
    traderDetailsContainer: {
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    detailValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
    confirmButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    confirmButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },
    traderList: {
      maxHeight: 400,
    },
    traderListItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    traderListItemText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
  });

  const renderTraderItem: ListRenderItem<Trader> = ({ item }) => (
    <View style={styles.traderItem}>
      <View style={styles.traderHeader}>
        <View>
          <Text style={styles.traderName}>{item.name}</Text>
          {item.verified && (
            <View style={styles.traderBadge}>
              <Text style={styles.traderBadgeText}>✓ Verified</Text>
            </View>
          )}
        </View>
        <Text style={styles.traderName}>{item.winRate}%</Text>
      </View>

      <View style={styles.traderStats}>
        <View>
          <Text style={styles.traderStat}>Monthly Return</Text>
          <Text style={styles.traderStatValue}>{item.monthlyReturn.toFixed(1)}%</Text>
        </View>
        <View>
          <Text style={styles.traderStat}>Avg Return</Text>
          <Text style={styles.traderStatValue}>{item.avgReturn.toFixed(1)}%</Text>
        </View>
        <View>
          <Text style={styles.traderStat}>Followers</Text>
          <Text style={styles.traderStatValue}>{(item.followers / 1000).toFixed(1)}K</Text>
        </View>
      </View>

      <Text
        style={[
          styles.traderRisk,
          { backgroundColor: getRiskColor(item.riskLevel) },
        ]}
      >
        {item.riskLevel.toUpperCase()}
      </Text>

      <TouchableOpacity
        style={styles.copyButton}
        onPress={() => handleSelectTrader(item)}
      >
        <Text style={styles.copyButtonText}>Copy Trader</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTradeItem: ListRenderItem<CopyTrade> = ({ item }) => {
    const trader = traders.find((t) => t.id === item.traderId);
    const statusColor = item.status === 'copied' ? '#F59E0B' : '#22C55E';

    return (
      <View style={styles.tradeItem}>
        <View style={styles.tradeHeader}>
          <Text style={styles.tradePair}>
            {item.fromToken} → {item.toToken}
          </Text>
          <Text style={[styles.tradeStatus, { backgroundColor: statusColor + '20', color: statusColor }]}>
            {item.status}
          </Text>
        </View>

        <View style={styles.tradeDetails}>
          <View>
            <Text style={styles.tradeDetail}>Trader</Text>
            <Text style={styles.tradeDetailValue}>{trader?.name}</Text>
          </View>
          <View>
            <Text style={styles.tradeDetail}>Amount</Text>
            <Text style={styles.tradeDetailValue}>${item.amount.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.tradeDetail}>Entry</Text>
            <Text style={styles.tradeDetailValue}>${item.entryPrice.toFixed(2)}</Text>
          </View>
        </View>

        {item.status === 'copied' && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => handleCloseTrade(item.id)}
            disabled={isLoading}
          >
            <Text style={styles.closeButtonText}>Close Trade</Text>
          </TouchableOpacity>
        )}

        {item.status === 'closed' && item.profitLoss !== undefined && (
          <View style={styles.tradeDetails}>
            <View>
              <Text style={styles.tradeDetail}>P&L</Text>
              <Text style={[styles.tradeDetailValue, { color: item.profitLoss >= 0 ? '#22C55E' : '#EF4444' }]}>
                ${item.profitLoss.toFixed(2)}
              </Text>
            </View>
            <View>
              <Text style={styles.tradeDetail}>Return</Text>
              <Text style={[styles.tradeDetailValue, { color: item.profitLossPercent! >= 0 ? '#22C55E' : '#EF4444' }]}>
                {item.profitLossPercent?.toFixed(2)}%
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Copy Trading</Text>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Active Copies</Text>
            <Text style={styles.statValue}>{stats.activeCopies}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Total P&L</Text>
            <Text style={[styles.statValue, { color: stats.totalProfitLoss >= 0 ? '#22C55E' : '#EF4444' }]}>
              ${stats.totalProfitLoss.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Win Rate</Text>
            <Text style={styles.statValue}>{stats.averageWinRate.toFixed(1)}%</Text>
          </View>
        </View>

        {/* Filter */}
        <View style={styles.filterContainer}>
          {(['all', 'low', 'medium', 'high'] as const).map((risk) => (
            <TouchableOpacity
              key={risk}
              style={[
                styles.filterButton,
                filterRisk === risk && styles.filterButtonActive,
              ]}
              onPress={() => setFilterRisk(risk)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterRisk === risk && styles.filterButtonTextActive,
                ]}
              >
                {risk === 'all' ? 'All' : risk.charAt(0).toUpperCase() + risk.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Traders */}
        <View style={styles.tradersContainer}>
          <Text style={styles.tradersTitle}>Top Traders</Text>
          <FlatList
            data={filteredTraders}
            renderItem={renderTraderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Trades */}
        {copiedTrades.length > 0 && (
          <View style={styles.tradesContainer}>
            <Text style={styles.tradesTitle}>Your Copied Trades</Text>
            <FlatList
              data={copiedTrades}
              renderItem={renderTradeItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>

      {/* Trader Details Modal */}
      <Modal
        visible={showTraderDetailsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTraderDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedTrader?.name}</Text>

            <View style={styles.traderDetailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Win Rate</Text>
                <Text style={styles.detailValue}>{selectedTrader?.winRate}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Monthly Return</Text>
                <Text style={styles.detailValue}>{selectedTrader?.monthlyReturn.toFixed(1)}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Avg Return</Text>
                <Text style={styles.detailValue}>{selectedTrader?.avgReturn.toFixed(1)}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Profit Factor</Text>
                <Text style={styles.detailValue}>{selectedTrader?.profitFactor.toFixed(2)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Trades</Text>
                <Text style={styles.detailValue}>{selectedTrader?.totalTrades}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Risk Level</Text>
                <Text style={styles.detailValue}>{selectedTrader?.riskLevel.toUpperCase()}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Followers</Text>
                <Text style={styles.detailValue}>{(selectedTrader?.followers || 0) / 1000}K</Text>
              </View>
            </View>

            <Text style={styles.detailLabel}>{selectedTrader?.description}</Text>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleStartCopying}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.confirmButtonText}>Start Copying</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
