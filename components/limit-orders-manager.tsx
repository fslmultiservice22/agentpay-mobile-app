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
import { limitOrdersService, LimitOrder } from '@/lib/limit-orders';

interface LimitOrdersManagerProps {
  onOrderCreated?: (order: LimitOrder) => void;
}

const POPULAR_TOKENS = ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE', 'USDC', 'USDT', 'DAI'];

export function LimitOrdersManager({ onOrderCreated }: LimitOrdersManagerProps) {
  const colors = useColors();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [triggerPrice, setTriggerPrice] = useState('2500');
  const [amount, setAmount] = useState('1');
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [isLoading, setIsLoading] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [selectedTokenField, setSelectedTokenField] = useState<'from' | 'to'>('from');
  const [orders, setOrders] = useState<LimitOrder[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    executedOrders: 0,
  });

  useEffect(() => {
    limitOrdersService.init();

    // Subscribe to order events
    const unsubscribe = limitOrdersService.addListener((order) => {
      setOrders((prev) => {
        const updated = prev.filter((o) => o.id !== order.id);
        return [order, ...updated];
      });
      updateStats();
      if (order.status === 'executed') {
        onOrderCreated?.(order);
      }
    });

    // Load initial orders
    setOrders(limitOrdersService.getAllOrders());
    updateStats();

    return () => unsubscribe();
  }, [onOrderCreated]);

  const updateStats = () => {
    const stats = limitOrdersService.getStatistics();
    setStats({
      totalOrders: stats.totalOrders,
      activeOrders: stats.activeOrders,
      executedOrders: stats.executedOrders,
    });
  };

  const handleCreateOrder = async () => {
    if (!triggerPrice || parseFloat(triggerPrice) <= 0 || !amount || parseFloat(amount) <= 0) {
      return;
    }

    setIsLoading(true);
    try {
      const order = await limitOrdersService.createLimitOrder(
        fromToken,
        toToken,
        parseFloat(triggerPrice),
        parseFloat(amount),
        orderType
      );

      if (order) {
        setTriggerPrice('');
        setAmount('');
        onOrderCreated?.(order);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    limitOrdersService.cancelLimitOrder(orderId);
    updateStats();
  };

  const handleSelectToken = (token: string) => {
    if (selectedTokenField === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }
    setShowTokenModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#F59E0B';
      case 'executed':
        return '#22C55E';
      case 'cancelled':
        return '#EF4444';
      case 'expired':
        return '#6B7280';
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.muted,
      marginTop: 4,
    },
    formBox: {
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
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
    typeSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    typeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    typeButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    typeButtonTextActive: {
      color: colors.background,
    },
    createButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      marginBottom: 16,
    },
    createButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.background,
    },
    ordersContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    ordersTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
    },
    orderItem: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    orderHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    orderPair: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
    },
    orderStatus: {
      fontSize: 11,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      color: colors.background,
    },
    orderDetails: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    orderDetail: {
      fontSize: 12,
      color: colors.muted,
    },
    orderDetailValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.foreground,
    },
    cancelButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: '#EF444420',
      borderRadius: 6,
      alignItems: 'center',
    },
    cancelButtonText: {
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

  const renderOrderItem: ListRenderItem<LimitOrder> = ({ item }) => (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderPair}>
          {item.fromToken} → {item.toToken}
        </Text>
        <Text style={[styles.orderStatus, { backgroundColor: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>

      <View style={styles.orderDetails}>
        <View>
          <Text style={styles.orderDetail}>Amount</Text>
          <Text style={styles.orderDetailValue}>{item.amount.toFixed(4)} {item.fromToken}</Text>
        </View>
        <View>
          <Text style={styles.orderDetail}>Trigger Price</Text>
          <Text style={styles.orderDetailValue}>${item.triggerPrice.toFixed(2)}</Text>
        </View>
        <View>
          <Text style={styles.orderDetail}>Type</Text>
          <Text style={styles.orderDetailValue}>{item.orderType.toUpperCase()}</Text>
        </View>
      </View>

      {item.status === 'active' && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelOrder(item.id)}
        >
          <Text style={styles.cancelButtonText}>Cancel Order</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Limit Orders</Text>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.activeOrders}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.executedOrders}</Text>
            <Text style={styles.statLabel}>Executed</Text>
          </View>
        </View>

        {/* Order Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, orderType === 'buy' && styles.typeButtonActive]}
            onPress={() => setOrderType('buy')}
          >
            <Text
              style={[
                styles.typeButtonText,
                orderType === 'buy' && styles.typeButtonTextActive,
              ]}
            >
              Buy Order
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, orderType === 'sell' && styles.typeButtonActive]}
            onPress={() => setOrderType('sell')}
          >
            <Text
              style={[
                styles.typeButtonText,
                orderType === 'sell' && styles.typeButtonTextActive,
              ]}
            >
              Sell Order
            </Text>
          </TouchableOpacity>
        </View>

        {/* From Token */}
        <View style={styles.formBox}>
          <Text style={styles.label}>From Token</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
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

        {/* To Token */}
        <View style={styles.formBox}>
          <Text style={styles.label}>To Token</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={colors.muted}
              value={toToken}
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

        {/* Trigger Price */}
        <View style={styles.formBox}>
          <Text style={styles.label}>Trigger Price (USD)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            value={triggerPrice}
            onChangeText={setTriggerPrice}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Create Order Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateOrder}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.createButtonText}>Create Limit Order</Text>
          )}
        </TouchableOpacity>

        {/* Orders List */}
        {orders.length > 0 && (
          <View style={styles.ordersContainer}>
            <Text style={styles.ordersTitle}>Your Orders</Text>
            <FlatList
              data={orders}
              renderItem={renderOrderItem}
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
