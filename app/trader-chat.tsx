import { View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable, FlatList } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useTraderMessaging } from '@/hooks/use-trader-messaging';
import { useI18n } from '@/hooks/use-i18n';
import { useColors } from '@/hooks/use-colors';
import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

interface TraderChatProps {
  conversationId: string;
  recipientId: string;
  recipientName: string;
}

export default function TraderChatScreen({ conversationId, recipientId, recipientName }: TraderChatProps) {
  const { t } = useI18n();
  const colors = useColors();
  const userId = 'current_user'; // Should come from auth context
  const {
    messages,
    getConversationMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    blockUser,
    unblockUser,
  } = useTraderMessaging(userId);

  const [messageText, setMessageText] = useState('');
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  const [isBlocked, setIsBlocked] = useState(false);

  // Update conversation messages
  useEffect(() => {
    const msgs = getConversationMessages(conversationId);
    setConversationMessages(msgs);

    // Mark all messages as read
    msgs.forEach((msg) => {
      if (!msg.isRead && msg.recipientId === userId) {
        markAsRead(msg.id);
      }
    });
  }, [messages, conversationId, getConversationMessages, markAsRead, userId]);

  const handleSendMessage = async () => {
    if (messageText.trim()) {
      await sendMessage(recipientId, recipientName, messageText);
      setMessageText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    await deleteMessage(messageId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleBlockUser = async () => {
    await blockUser(conversationId);
    setIsBlocked(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleUnblockUser = async () => {
    await unblockUser(conversationId);
    setIsBlocked(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScreenContainer className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4 pb-4 border-b border-border">
          <View>
            <Text className="text-xl font-bold text-foreground">{recipientName}</Text>
            <Text className="text-sm text-muted">{t('common.online')}</Text>
          </View>

          <Pressable
            onPress={isBlocked ? handleUnblockUser : handleBlockUser}
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            className={`px-4 py-2 rounded-lg ${isBlocked ? 'bg-success' : 'bg-error'}`}
          >
            <Text className="text-sm font-semibold text-background">
              {isBlocked ? t('common.unblock') : t('common.block')}
            </Text>
          </Pressable>
        </View>

        {/* Messages */}
        <FlatList
          data={conversationMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              className={`mb-3 flex-row ${item.senderId === userId ? 'justify-end' : 'justify-start'}`}
            >
              <Pressable
                onLongPress={() => handleDeleteMessage(item.id)}
                className={`max-w-xs px-4 py-2 rounded-2xl ${
                  item.senderId === userId ? 'bg-primary' : 'bg-surface'
                }`}
              >
                <Text
                  className={`text-base ${
                    item.senderId === userId ? 'text-background' : 'text-foreground'
                  }`}
                >
                  {item.content}
                </Text>
                <Text
                  className={`text-xs mt-1 ${
                    item.senderId === userId ? 'text-background opacity-70' : 'text-muted'
                  }`}
                >
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>

                {/* Reactions */}
                {item.reactions && Object.keys(item.reactions).length > 0 && (
                  <View className="flex-row gap-1 mt-2">
                    {Object.entries(item.reactions).map(([emoji, count]: [string, any]) => (
                      <View key={emoji} className="bg-background px-2 py-1 rounded-full">
                        <Text className="text-xs">
                          {emoji} {String(count)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            </View>
          )}
          scrollEnabled={true}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
          className="flex-1 mb-4"
        />

        {/* Input Area */}
        <View className="flex-row gap-2 items-end">
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={t('common.typeMessage')}
            placeholderTextColor={colors.muted}
            className="flex-1 bg-surface text-foreground px-4 py-3 rounded-2xl"
            multiline
            maxLength={500}
          />

          <Pressable
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
            style={({ pressed }) => [
              { opacity: pressed ? 0.8 : messageText.trim() ? 1 : 0.5 },
            ]}
            className="bg-primary px-4 py-3 rounded-2xl items-center justify-center"
          >
            <Text className="text-background font-bold">{t('common.send')}</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
