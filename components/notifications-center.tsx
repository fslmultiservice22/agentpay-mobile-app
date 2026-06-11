import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';

export interface Notification {
  id: string;
  type: 'transfer' | 'reward' | 'alert' | 'achievement';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: Record<string, any>;
}

export interface NotificationsCenterProps {
  notifications: Notification[];
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onNotificationPress?: (notification: Notification) => void;
}

export function NotificationsCenter({
  notifications,
  onMarkAsRead,
  onDelete,
  onNotificationPress,
}: NotificationsCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return 'arrow.left.arrow.right';
      case 'reward':
        return 'star.fill';
      case 'alert':
        return 'exclamationmark.circle';
      case 'achievement':
        return 'checkmark.circle.fill';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'transfer':
        return '#0a7ea4';
      case 'reward':
        return '#F59E0B';
      case 'alert':
        return '#EF4444';
      case 'achievement':
        return '#22C55E';
      default:
        return '#687076';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => {
        onMarkAsRead?.(item.id);
        onNotificationPress?.(item);
      }}
      className="flex-row gap-4 px-6 py-4 border-b border-border bg-surface"
    >
      {/* Icon */}
      <View
        style={{ backgroundColor: getNotificationColor(item.type) }}
        className="w-12 h-12 rounded-full items-center justify-center"
      >
        <IconSymbol
          size={20}
          name={getNotificationIcon(item.type) as any}
          color="white"
        />
      </View>

      {/* Content */}
      <View className="flex-1 gap-2">
        <View className="flex-row justify-between items-start">
          <Text
            className={`text-sm font-semibold flex-1 ${
              item.read ? 'text-muted' : 'text-foreground'
            }`}
          >
            {item.title}
          </Text>
          {!item.read && (
            <View className="w-2 h-2 bg-primary rounded-full ml-2" />
          )}
        </View>
        <Text className="text-xs text-muted">{item.message}</Text>
        <Text className="text-xs text-muted/60">
          {new Date(item.timestamp).toLocaleTimeString('it-IT')}
        </Text>
      </View>

      {/* Delete Button */}
      <TouchableOpacity
        onPress={() => onDelete?.(item.id)}
        className="justify-center"
      >
        <IconSymbol size={20} name="xmark" color="#687076" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ScreenContainer className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-gradient-to-b from-primary to-primary/80 px-6 py-8 gap-4">
        <View className="flex-row justify-between items-center">
          <Text className="text-3xl font-bold text-white">Notifiche</Text>
          {unreadCount > 0 && (
            <View className="bg-error px-3 py-1 rounded-full">
              <Text className="text-white text-sm font-semibold">
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row gap-4 px-6 py-4 border-b border-border">
        <TouchableOpacity
          onPress={() => setFilter('all')}
          className={`px-4 py-2 rounded-full ${
            filter === 'all' ? 'bg-primary' : 'bg-surface border border-border'
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              filter === 'all' ? 'text-white' : 'text-foreground'
            }`}
          >
            Tutte
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter('unread')}
          className={`px-4 py-2 rounded-full ${
            filter === 'unread' ? 'bg-primary' : 'bg-surface border border-border'
          }`}
        >
          <Text
            className={`text-sm font-semibold ${
              filter === 'unread' ? 'text-white' : 'text-foreground'
            }`}
          >
            Non Lette
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {filteredNotifications.length > 0 ? (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      ) : (
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <IconSymbol size={48} name="bell.slash" color="#687076" />
          <Text className="text-lg font-semibold text-foreground">
            Nessuna Notifica
          </Text>
          <Text className="text-sm text-muted text-center">
            {filter === 'unread'
              ? 'Tutte le notifiche sono state lette'
              : 'Non hai notifiche al momento'}
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}
