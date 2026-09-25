import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { ScreenContainer } from './screen-container';
import { useColors } from '@/hooks/use-colors';
import { useTransactionCache } from '@/hooks/use-transaction-cache';
import type { CachedTransaction } from '@/lib/transaction-cache-service';

export interface TransactionHistoryUIProps {
  chainId?: number;
  onTransactionPress?: (transaction: CachedTransaction) => void;
}

/**
 * Transaction History UI Component
 * Displays cached transaction history with filtering and export options
 */
export function TransactionHistoryUI({
  chainId,
  onTransactionPress,
}: TransactionHistoryUIProps) {
  const colors = useColors();
  const { transactions, stats, exportTransactions } = useTransactionCache();
  const [filter, setFilter] = useState<'all' | 'send' | 'receive' | 'swap'>('all');
  const [showStats, setShowStats] = useState(false);

  const filteredTransactions = transactions.filter(tx => {
    if (chainId && tx.chainId !== chainId) return false;
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      default:
        return colors.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'pending':
        return '⏳';
      case 'failed':
        return '✕';
      default:
        return '•';
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransaction = ({ item }: { item: CachedTransaction }) => (
    <TouchableOpacity
      onPress={() => onTransactionPress?.(item)}
      style={{
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-center justify-between">
        {/* Left side - Type and address */}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-2">
            <Text className="text-sm font-semibold text-foreground capitalize">{item.type}</Text>
            <Text
              style={{
                color: getStatusColor(item.status),
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {getStatusIcon(item.status)} {item.status}
            </Text>
          </View>
          <Text className="text-xs text-muted">{formatAddress(item.to)}</Text>
          <Text className="text-xs text-muted mt-1">{formatDate(item.timestamp)}</Text>
        </View>

        {/* Right side - Amount */}
        <View className="items-end">
          <Text className="text-sm font-bold text-foreground">
            {item.type === 'receive' ? '+' : '-'}{item.value} ETH
          </Text>
          {item.gasPrice && (
            <Text className="text-xs text-muted mt-1">Gas: {item.gasPrice} Gwei</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="bg-background">
      <View className="flex-1">
        {/* Header */}
        <View className="p-4 border-b border-border">
          <Text className="text-2xl font-bold text-foreground">Transactions</Text>
          <Text className="text-sm text-muted mt-1">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Stats Card */}
        {showStats && stats && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              padding: 12,
              marginHorizontal: 16,
              marginVertical: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-muted">Total Volume</Text>
              <Text className="text-sm font-bold text-foreground">{stats.totalVolume} ETH</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-muted">Successful</Text>
              <Text className="text-sm font-bold text-success">{stats.successfulTransactions}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-xs text-muted">Pending</Text>
              <Text className="text-sm font-bold text-warning">{stats.pendingTransactions}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted">Failed</Text>
              <Text className="text-sm font-bold text-error">{stats.failedTransactions}</Text>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View className="flex-row gap-2 px-4 py-3 border-b border-border">
          {(['all', 'send', 'receive', 'swap'] as const).map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setFilter(type)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
                backgroundColor: filter === type ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: filter === type ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  color: filter === type ? 'white' : colors.foreground,
                  fontSize: 12,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction List */}
        {filteredTransactions.length > 0 ? (
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransaction}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16 }}
            scrollEnabled={false}
          />
        ) : (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-lg font-semibold text-foreground mb-2">No Transactions</Text>
            <Text className="text-sm text-muted text-center">
              {filter === 'all'
                ? 'Your transaction history will appear here'
                : `No ${filter} transactions found`}
            </Text>
          </View>
        )}

        {/* Bottom Actions */}
        <View className="p-4 border-t border-border gap-2">
          <TouchableOpacity
            onPress={() => setShowStats(!showStats)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text className="text-foreground font-semibold text-center text-sm">
              {showStats ? 'Hide' : 'Show'} Statistics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const json = exportTransactions('json');
              console.log('Exported transactions:', json);
              // In production, would share or download the file
            }}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingVertical: 10,
            }}
          >
            <Text className="text-white font-semibold text-center text-sm">Export as JSON</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
