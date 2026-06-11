import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { StoredTransaction } from '@/lib/transaction-history-service';

interface TransactionHistoryListProps {
  transactions: StoredTransaction[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onTransactionPress?: (transaction: StoredTransaction) => void;
  onDeleteTransaction?: (hash: string) => Promise<void>;
}

export function TransactionHistoryList({
  transactions,
  isLoading = false,
  onRefresh,
  onTransactionPress,
  onDeleteTransaction,
}: TransactionHistoryListProps) {
  const colors = useColors();
  const [refreshing, setRefreshing] = useState(false);
  const [deletingHash, setDeletingHash] = useState<string | null>(null);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (hash: string) => {
    if (!onDeleteTransaction) return;
    setDeletingHash(hash);
    try {
      await onDeleteTransaction(hash);
    } finally {
      setDeletingHash(null);
    }
  };

  const handleOpenExplorer = (url: string) => {
    Linking.openURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'pending':
        return colors.warning;
      default:
        return colors.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✗';
      case 'pending':
        return '⏳';
      default:
        return '•';
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('it-IT', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
    },
    transactionItem: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    transactionContent: {
      flex: 1,
      marginRight: 8,
    },
    transactionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    transactionType: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.foreground,
    },
    transactionAmount: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.foreground,
    },
    transactionDetails: {
      fontSize: 11,
      color: colors.muted,
      marginBottom: 4,
    },
    transactionDate: {
      fontSize: 10,
      color: colors.muted,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      backgroundColor: `${colors.primary}20`,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.primary,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    actionButtonSmall: {
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    deleteButton: {
      backgroundColor: colors.error,
    },
    buttonText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  const renderTransaction = ({ item }: { item: StoredTransaction }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => onTransactionPress?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionContent}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionType}>
            {item.type === 'send' ? '📤 Sent' : item.type === 'receive' ? '📥 Received' : '🔄 Swap'}
          </Text>
          <Text style={styles.transactionAmount}>
            {item.type === 'send' ? '-' : '+'}{item.value} {item.token || 'ETH'}
          </Text>
        </View>

        <Text style={styles.transactionDetails}>
          {item.type === 'send' ? 'To: ' : 'From: '}{formatAddress(item.type === 'send' ? item.to : item.from)}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusIcon(item.status)} {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSmall]}
          onPress={() => handleOpenExplorer(item.explorerUrl)}
        >
          <Text style={styles.buttonText}>View</Text>
        </TouchableOpacity>

        {onDeleteTransaction && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSmall, styles.deleteButton]}
            onPress={() => handleDelete(item.hash)}
            disabled={deletingHash === item.hash}
          >
            {deletingHash === item.hash ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.buttonText}>Delete</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No transactions yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.hash}
      contentContainerStyle={{ padding: 12 }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        ) : undefined
      }
    />
  );
}
