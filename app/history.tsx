import { useState } from 'react';
import { Text, View, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  address: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'failed';
  timestamp: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'sent', address: '0x1234...5678', amount: '0.5', status: 'confirmed', timestamp: '2 hours ago' },
  { id: '2', type: 'received', address: '0x8765...4321', amount: '1.2', status: 'confirmed', timestamp: '5 hours ago' },
  { id: '3', type: 'sent', address: '0x9999...0000', amount: '0.3', status: 'pending', timestamp: '10 minutes ago' },
];

export default function HistoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  const filteredTransactions = MOCK_TRANSACTIONS.filter(tx => filter === 'all' || tx.type === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity className="bg-surface border border-border rounded-lg p-4 mb-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 gap-3">
          <Text className="text-2xl">{item.type === 'sent' ? '📤' : '📥'}</Text>
          <View className="flex-1">
            <Text className="text-foreground font-semibold">{item.type === 'sent' ? 'Sent to' : 'Received from'}</Text>
            <Text className="text-muted text-sm">{item.address}</Text>
            <Text className="text-muted text-xs mt-1">{item.timestamp}</Text>
          </View>
        </View>
        <View className="items-end gap-1">
          <Text className="text-foreground font-bold">{item.amount} ETH</Text>
          <Text className={`text-xs font-semibold ${getStatusColor(item.status)}`}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="p-4">
      <View className="gap-4 flex-1">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Transaction History</Text>
          <Text className="text-base text-muted">Visualizza tutte le transazioni</Text>
        </View>

        <View className="flex-row gap-2">
          {(['all', 'sent', 'received'] as const).map(filterType => (
            <TouchableOpacity
              key={filterType}
              className={`flex-1 py-2 px-3 rounded-lg border ${filter === filterType ? 'bg-primary border-primary' : 'bg-surface border-border'}`}
              onPress={() => setFilter(filterType)}
            >
              <Text className={`text-center font-semibold text-sm ${filter === filterType ? 'text-white' : 'text-foreground'}`}>
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList data={filteredTransactions} renderItem={renderTransaction} keyExtractor={item => item.id} scrollEnabled={false} />

        <TouchableOpacity className="rounded-lg p-4 items-center justify-center border border-border" onPress={() => router.back()}>
          <Text className="text-foreground font-semibold text-base">Indietro</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}