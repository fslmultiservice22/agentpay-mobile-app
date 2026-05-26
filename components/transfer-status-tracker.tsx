import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';

export interface TransactionEvent {
  id: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  description: string;
  amount?: string;
}

export interface TransferStatusProps {
  transactionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: string;
  events: TransactionEvent[];
  onCancel?: () => void;
}

export function TransferStatusTracker({
  transactionId,
  status,
  amount,
  events,
  onCancel,
}: TransferStatusProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'completed':
        return '#22C55E';
      case 'failed':
        return '#EF4444';
      case 'processing':
        return '#F59E0B';
      default:
        return '#0a7ea4';
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'completed':
        return 'Completato';
      case 'failed':
        return 'Fallito';
      case 'processing':
        return 'In Elaborazione';
      default:
        return 'In Sospeso';
    }
  };

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        {/* Header */}
        <View className="bg-gradient-to-b from-primary to-primary/80 px-6 py-8 gap-4">
          <Text className="text-3xl font-bold text-white">Trasferimento</Text>
          <Text className="text-base text-white/80">ID: {transactionId}</Text>
        </View>

        {/* Status Card */}
        <View className="px-6 py-6 gap-4">
          <View className="bg-surface rounded-2xl p-6 border border-border gap-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-semibold text-foreground">Stato</Text>
              <View
                style={{ backgroundColor: getStatusColor(status) }}
                className="px-4 py-2 rounded-full"
              >
                <Text className="text-white text-sm font-semibold">
                  {getStatusLabel(status)}
                </Text>
              </View>
            </View>

            <View className="bg-background rounded-lg p-4 gap-2">
              <Text className="text-xs text-muted">Importo</Text>
              <Text className="text-3xl font-bold text-foreground">{amount}</Text>
            </View>
          </View>

          {/* Timeline */}
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Timeline</Text>

            {events.map((event, index) => (
              <View key={event.id} className="flex-row gap-4">
                {/* Timeline Dot */}
                <View className="items-center gap-2">
                  <View
                    style={{ backgroundColor: getStatusColor(event.status) }}
                    className="w-4 h-4 rounded-full"
                  />
                  {index < events.length - 1 && (
                    <View className="w-0.5 h-12 bg-border" />
                  )}
                </View>

                {/* Event Content */}
                <View className="flex-1 pb-4">
                  <Text className="text-sm font-semibold text-foreground">
                    {event.description}
                  </Text>
                  <Text className="text-xs text-muted mt-1">
                    {new Date(event.timestamp).toLocaleTimeString('it-IT')}
                  </Text>
                  {event.amount && (
                    <Text className="text-xs text-primary font-semibold mt-2">
                      {event.amount}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Cancel Button */}
          {status === 'pending' && onCancel && (
            <View className="mt-4">
              <Text
                onPress={onCancel}
                className="text-center text-error font-semibold py-3"
              >
                Annulla Trasferimento
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
