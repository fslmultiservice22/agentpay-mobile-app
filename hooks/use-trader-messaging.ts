import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TraderMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  attachments?: string[];
  reactions?: Record<string, number>;
}

export interface TraderConversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage: TraderMessage | null;
  lastMessageTime: number;
  unreadCount: number;
  createdAt: number;
  isBlocked: boolean;
}

export interface MessagingStats {
  totalConversations: number;
  unreadConversations: number;
  totalMessages: number;
  unreadMessages: number;
  averageResponseTime: number;
}

const MESSAGES_STORAGE_KEY = 'trader_messages';
const CONVERSATIONS_STORAGE_KEY = 'trader_conversations';

export function useTraderMessaging(userId: string) {
  const [conversations, setConversations] = useState<TraderConversation[]>([]);
  const [messages, setMessages] = useState<TraderMessage[]>([]);
  const [stats, setStats] = useState<MessagingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load conversations and messages
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [conversationsData, messagesData] = await Promise.all([
        AsyncStorage.getItem(CONVERSATIONS_STORAGE_KEY),
        AsyncStorage.getItem(MESSAGES_STORAGE_KEY),
      ]);

      const loadedConversations = conversationsData ? JSON.parse(conversationsData) : [];
      const loadedMessages = messagesData ? JSON.parse(messagesData) : [];

      setConversations(loadedConversations);
      setMessages(loadedMessages);
      calculateStats(loadedConversations, loadedMessages);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Calculate messaging stats
  const calculateStats = useCallback((convs: TraderConversation[], msgs: TraderMessage[]) => {
    const unreadConvs = convs.filter((c) => c.unreadCount > 0).length;
    const unreadMsgs = msgs.filter((m) => !m.isRead && m.recipientId === userId).length;

    // Calculate average response time
    const userMessages = msgs.filter((m) => m.senderId === userId);
    let totalResponseTime = 0;
    let responseCount = 0;

    userMessages.forEach((msg) => {
      const nextMessage = msgs.find(
        (m) =>
          m.conversationId === msg.conversationId &&
          m.senderId !== msg.senderId &&
          m.timestamp > msg.timestamp
      );

      if (nextMessage) {
        totalResponseTime += nextMessage.timestamp - msg.timestamp;
        responseCount += 1;
      }
    });

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    const calculatedStats: MessagingStats = {
      totalConversations: convs.length,
      unreadConversations: unreadConvs,
      totalMessages: msgs.length,
      unreadMessages: unreadMsgs,
      averageResponseTime,
    };

    setStats(calculatedStats);
  }, [userId]);

  // Send message
  const sendMessage = useCallback(
    async (recipientId: string, recipientName: string, content: string) => {
      try {
        const conversationId = [userId, recipientId].sort().join('_');

        const newMessage: TraderMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          conversationId,
          senderId: userId,
          senderName: 'CurrentUser',
          recipientId,
          recipientName,
          content,
          timestamp: Date.now(),
          isRead: false,
        };

        const updatedMessages = [...messages, newMessage];
        await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updatedMessages));

        // Update or create conversation
        let updatedConversations = conversations;
        const existingConv = conversations.find((c) => c.id === conversationId);

        if (existingConv) {
          updatedConversations = conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: newMessage,
                  lastMessageTime: newMessage.timestamp,
                }
              : c
          );
        } else {
          const newConversation: TraderConversation = {
            id: conversationId,
            participantIds: [userId, recipientId],
            participantNames: ['CurrentUser', recipientName],
            lastMessage: newMessage,
            lastMessageTime: newMessage.timestamp,
            unreadCount: 0,
            createdAt: Date.now(),
            isBlocked: false,
          };
          updatedConversations = [newConversation, ...conversations];
        }

        await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(updatedConversations));

        setMessages(updatedMessages);
        setConversations(updatedConversations);
        calculateStats(updatedConversations, updatedMessages);
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [userId, messages, conversations, calculateStats]
  );

  // Mark message as read
  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        const updatedMessages = messages.map((m) =>
          m.id === messageId ? { ...m, isRead: true } : m
        );

        await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
        calculateStats(conversations, updatedMessages);
      } catch (err) {
        console.error('Failed to mark message as read:', err);
      }
    },
    [messages, conversations, calculateStats]
  );

  // Mark conversation as read
  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      try {
        const updatedMessages = messages.map((m) =>
          m.conversationId === conversationId ? { ...m, isRead: true } : m
        );

        const updatedConversations = conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );

        await Promise.all([
          AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updatedMessages)),
          AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(updatedConversations)),
        ]);

        setMessages(updatedMessages);
        setConversations(updatedConversations);
        calculateStats(updatedConversations, updatedMessages);
      } catch (err) {
        console.error('Failed to mark conversation as read:', err);
      }
    },
    [messages, conversations, calculateStats]
  );

  // Get conversation messages
  const getConversationMessages = useCallback(
    (conversationId: string) => {
      return messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.timestamp - b.timestamp);
    },
    [messages]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        const updatedMessages = messages.filter((m) => m.id !== messageId);
        await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
        calculateStats(conversations, updatedMessages);
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    },
    [messages, conversations, calculateStats]
  );

  // Block user
  const blockUser = useCallback(
    async (conversationId: string) => {
      try {
        const updatedConversations = conversations.map((c) =>
          c.id === conversationId ? { ...c, isBlocked: true } : c
        );

        await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(updatedConversations));
        setConversations(updatedConversations);
      } catch (err) {
        console.error('Failed to block user:', err);
      }
    },
    [conversations]
  );

  // Unblock user
  const unblockUser = useCallback(
    async (conversationId: string) => {
      try {
        const updatedConversations = conversations.map((c) =>
          c.id === conversationId ? { ...c, isBlocked: false } : c
        );

        await AsyncStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(updatedConversations));
        setConversations(updatedConversations);
      } catch (err) {
        console.error('Failed to unblock user:', err);
      }
    },
    [conversations]
  );

  // Get unread conversations
  const getUnreadConversations = useCallback(() => {
    return conversations.filter((c) => c.unreadCount > 0);
  }, [conversations]);

  // Add reaction to message
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        const updatedMessages = messages.map((m) => {
          if (m.id === messageId) {
            const reactions = m.reactions || {};
            reactions[emoji] = (reactions[emoji] || 0) + 1;
            return { ...m, reactions };
          }
          return m;
        });

        await AsyncStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
      } catch (err) {
        console.error('Failed to add reaction:', err);
      }
    },
    [messages]
  );

  // Initialize
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    conversations,
    messages,
    stats,
    isLoading,
    error,
    sendMessage,
    markAsRead,
    markConversationAsRead,
    getConversationMessages,
    deleteMessage,
    blockUser,
    unblockUser,
    getUnreadConversations,
    addReaction,
    refetch: loadData,
  };
}
