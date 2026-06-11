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
  ScrollView,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from './ui/icon-symbol';
import { yieldFarmingService, YieldPool, YieldPosition } from '@/lib/yield-farming';

interface YieldFarmingDashboardProps {
  onPositionCreated?: (position: YieldPosition) => void;
}

export function YieldFarmingDashboard({ onPositionCreated }: YieldFarmingDashboardProps) {
  const colors = useColors();
  const [pools, setPools] = useState<YieldPool[]>([]);
  const [positions, setPositions] = useState<YieldPosition[]>([]);
  const [selectedPool, setSelectedPool] = useState<YieldPool | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [stats, setStats] = useState({
    totalPositions: 0,
    activePositions: 0,
    totalValueLocked: 0,
    totalRewardsEarned: 0,
    averageAPY: 0,
  });
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  useEffect(() => {
    yieldFarmingService.init();

    // Subscribe to position events
    const unsubscribe = yieldFarmingService.addListener((position) => {
      setPositions((prev) => {
        const updated = prev.filter((p) => p.id !== position.id);
        return [position, ...updated];
      });
      updateStats();
      if (position.status === 'active') {
        onPositionCreated?.(position);
      }
    });

    // Load initial data
    setPools(yieldFarmingService.getAllPools());
    setPositions(yieldFarmingService.getAllPositions());
    updateStats();

    return () => unsubscribe();
  }, [onPositionCreated]);

  const updateStats = () => {
    const stats = yieldFarmingService.getStatistics();
    setStats(stats);
  };

  const handleSelectPool = (pool: YieldPool) => {
    setSelectedPool(pool);
    setShowPoolModal(false);
    setShowDepositModal(true);
  };

  const handleDeposit = async () => {
    if (!selectedPool || !depositAmount || parseFloat(depositAmount) <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      const position = await yieldFarmingService.depositToPool(
        selectedPool.id,
        parseFloat(depositAmount)
      );

      if (position) {
        setDepositAmount('');
        setShowDepositModal(false);
        setSelectedPool(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (positionId: string) => {
    setIsLoading(true);
    try {
      await yieldFarmingService.withdrawFromPool(positionId);
      updateStats();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompound = async (positionId: string) => {
    setIsLoading(true);
    try {
      await yieldFarmingService.compoundRewards(positionId);
      updateStats();
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPools = pools.filter((pool) => {
    if (filterRisk === 'all') return true;
    return pool.riskLevel === filterRisk;
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
    poolsContainer: {
      marginBottom: 16,
    },
    poolsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
    },
    poolItem: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    poolHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    poolName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    poolAPY: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
    poolDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    poolDetail: {
      fontSize: 11,
      color: colors.muted,
    },
    poolDetailValue: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.foreground,
    },
    poolRisk: {
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      color: colors.background,
      alignSelf: 'flex-start',
    },
    depositButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    depositButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.background,
    },
    positionsContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    positionsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
    },
    positionItem: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    positionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    positionPool: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    positionStatus: {
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: '#22C55E20',
      color: '#22C55E',
    },
    positionDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    positionDetail: {
      fontSize: 11,
      color: colors.muted,
    },
    positionDetailValue: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.foreground,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 6,
      borderRadius: 6,
      alignItems: 'center',
    },
    compoundButton: {
      backgroundColor: colors.primary + '20',
    },
    withdrawButton: {
      backgroundColor: '#EF444420',
    },
    actionButtonText: {
      fontSize: 11,
      fontWeight: '600',
    },
    compoundButtonText: {
      color: colors.primary,
    },
    withdrawButtonText: {
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
    depositForm: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      color: colors.muted,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 16,
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
    poolList: {
      maxHeight: 400,
    },
    poolListItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    poolListItemText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
  });

  const renderPoolItem: ListRenderItem<YieldPool> = ({ item }) => (
    <View style={styles.poolItem}>
      <View style={styles.poolHeader}>
        <Text style={styles.poolName}>{item.name}</Text>
        <Text style={styles.poolAPY}>{item.apy.toFixed(1)}%</Text>
      </View>

      <View style={styles.poolDetails}>
        <View>
          <Text style={styles.poolDetail}>TVL</Text>
          <Text style={styles.poolDetailValue}>${(item.tvl / 1000000).toFixed(0)}M</Text>
        </View>
        <View>
          <Text style={styles.poolDetail}>Min Deposit</Text>
          <Text style={styles.poolDetailValue}>{item.minDeposit} {item.token}</Text>
        </View>
        <View>
          <Text
            style={[
              styles.poolRisk,
              { backgroundColor: getRiskColor(item.riskLevel) },
            ]}
          >
            {item.riskLevel.toUpperCase()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.depositButton}
        onPress={() => handleSelectPool(item)}
      >
        <Text style={styles.depositButtonText}>Deposit</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPositionItem: ListRenderItem<YieldPosition> = ({ item }) => {
    const pool = yieldFarmingService.getAllPools().find((p) => p.id === item.poolId);
    const rewards = yieldFarmingService.calculateRewards(item.id);

    return (
      <View style={styles.positionItem}>
        <View style={styles.positionHeader}>
          <Text style={styles.positionPool}>{pool?.name}</Text>
          <Text style={styles.positionStatus}>{item.status}</Text>
        </View>

        <View style={styles.positionDetails}>
          <View>
            <Text style={styles.positionDetail}>Amount</Text>
            <Text style={styles.positionDetailValue}>{item.amount.toFixed(4)} {item.rewardsToken}</Text>
          </View>
          <View>
            <Text style={styles.positionDetail}>Rewards</Text>
            <Text style={styles.positionDetailValue}>{rewards.toFixed(4)} {item.rewardsToken}</Text>
          </View>
          <View>
            <Text style={styles.positionDetail}>APY</Text>
            <Text style={styles.positionDetailValue}>{pool?.apy.toFixed(1)}%</Text>
          </View>
        </View>

        {item.status === 'active' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.compoundButton]}
              onPress={() => handleCompound(item.id)}
              disabled={isLoading}
            >
              <Text style={[styles.actionButtonText, styles.compoundButtonText]}>
                Compound
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={() => handleWithdraw(item.id)}
              disabled={isLoading}
            >
              <Text style={[styles.actionButtonText, styles.withdrawButtonText]}>
                Withdraw
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Yield Farming</Text>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Total Value Locked</Text>
            <Text style={styles.statValue}>${stats.totalValueLocked.toFixed(2)}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Total Rewards Earned</Text>
            <Text style={styles.statValue}>${stats.totalRewardsEarned.toFixed(2)}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Average APY</Text>
            <Text style={styles.statValue}>{stats.averageAPY.toFixed(2)}%</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statLabel}>Active Positions</Text>
            <Text style={styles.statValue}>{stats.activePositions}/{stats.totalPositions}</Text>
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

        {/* Pools */}
        <View style={styles.poolsContainer}>
          <Text style={styles.poolsTitle}>Available Pools</Text>
          <FlatList
            data={filteredPools}
            renderItem={renderPoolItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Positions */}
        {positions.length > 0 && (
          <View style={styles.positionsContainer}>
            <Text style={styles.positionsTitle}>Your Positions</Text>
            <FlatList
              data={positions}
              renderItem={renderPositionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}
      </View>

      {/* Deposit Modal */}
      <Modal
        visible={showDepositModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDepositModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Deposit to {selectedPool?.name}</Text>

            <View style={styles.depositForm}>
              <Text style={styles.label}>Amount ({selectedPool?.token})</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                value={depositAmount}
                onChangeText={setDepositAmount}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Pool Details</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statsRow}>
                  <Text style={styles.statLabel}>APY</Text>
                  <Text style={styles.statValue}>{selectedPool?.apy.toFixed(1)}%</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statLabel}>Min Deposit</Text>
                  <Text style={styles.statValue}>{selectedPool?.minDeposit} {selectedPool?.token}</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statLabel}>Risk Level</Text>
                  <Text style={styles.statValue}>{selectedPool?.riskLevel.toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleDeposit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Deposit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
