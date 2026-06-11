import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface InAppMessage {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'promotion' | 'update' | 'warning' | 'success';
  imageUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  expiresAt: number;
  targetAudience?: string[]; // user segments
  shown: boolean;
  clicked: boolean;
  dismissed: boolean;
}

export interface MessageCampaign {
  id: string;
  name: string;
  messages: InAppMessage[];
  startDate: number;
  endDate: number;
  active: boolean;
}

export function useInAppMessaging() {
  const [messages, setMessages] = useState<InAppMessage[]>([]);
  const [campaigns, setCampaigns] = useState<MessageCampaign[]>([]);
  const [currentMessage, setCurrentMessage] = useState<InAppMessage | null>(null);

  // Load messages from storage
  const loadMessages = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_inapp_messages');
      if (stored) {
        const loaded = JSON.parse(stored);
        setMessages(loaded);
        filterAndShowMessage(loaded);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  // Filter and show next message
  const filterAndShowMessage = useCallback((messageList: InAppMessage[]) => {
    const now = Date.now();
    const active = messageList.filter(
      (m) =>
        m.expiresAt > now &&
        !m.shown &&
        !m.dismissed &&
        m.createdAt <= now
    );

    if (active.length > 0) {
      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      active.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      setCurrentMessage(active[0]);
    } else {
      setCurrentMessage(null);
    }
  }, []);

  // Add message
  const addMessage = useCallback(
    async (message: Omit<InAppMessage, 'id' | 'shown' | 'clicked' | 'dismissed'>) => {
      try {
        const newMessage: InAppMessage = {
          ...message,
          id: `msg_${Date.now()}_${Math.random()}`,
          shown: false,
          clicked: false,
          dismissed: false,
        };

        const updated = [...messages, newMessage];
        setMessages(updated);
        await AsyncStorage.setItem('agentpay_inapp_messages', JSON.stringify(updated));
        filterAndShowMessage(updated);
      } catch (error) {
        console.error('Failed to add message:', error);
      }
    },
    [messages, filterAndShowMessage]
  );

  // Mark message as shown
  const markAsShown = useCallback(
    async (messageId: string) => {
      try {
        const updated = messages.map((m) =>
          m.id === messageId ? { ...m, shown: true } : m
        );
        setMessages(updated);
        await AsyncStorage.setItem('agentpay_inapp_messages', JSON.stringify(updated));
        filterAndShowMessage(updated);
      } catch (error) {
        console.error('Failed to mark message as shown:', error);
      }
    },
    [messages, filterAndShowMessage]
  );

  // Mark message as clicked
  const markAsClicked = useCallback(
    async (messageId: string) => {
      try {
        const updated = messages.map((m) =>
          m.id === messageId ? { ...m, clicked: true, shown: true } : m
        );
        setMessages(updated);
        await AsyncStorage.setItem('agentpay_inapp_messages', JSON.stringify(updated));
        filterAndShowMessage(updated);
      } catch (error) {
        console.error('Failed to mark message as clicked:', error);
      }
    },
    [messages, filterAndShowMessage]
  );

  // Dismiss message
  const dismissMessage = useCallback(
    async (messageId: string) => {
      try {
        const updated = messages.map((m) =>
          m.id === messageId ? { ...m, dismissed: true } : m
        );
        setMessages(updated);
        await AsyncStorage.setItem('agentpay_inapp_messages', JSON.stringify(updated));
        filterAndShowMessage(updated);
      } catch (error) {
        console.error('Failed to dismiss message:', error);
      }
    },
    [messages, filterAndShowMessage]
  );

  // Create campaign
  const createCampaign = useCallback(
    async (
      name: string,
      messages: Omit<InAppMessage, 'id' | 'shown' | 'clicked' | 'dismissed'>[],
      startDate: number,
      endDate: number
    ) => {
      try {
        const campaign: MessageCampaign = {
          id: `campaign_${Date.now()}`,
          name,
          messages: messages.map((m) => ({
            ...m,
            id: `msg_${Date.now()}_${Math.random()}`,
            shown: false,
            clicked: false,
            dismissed: false,
          })),
          startDate,
          endDate,
          active: true,
        };

        const updated = [...campaigns, campaign];
        setCampaigns(updated);
        await AsyncStorage.setItem('agentpay_inapp_campaigns', JSON.stringify(updated));

        // Add messages to active messages
        const allMessages = [...(messages as InAppMessage[]), ...campaign.messages];
        setMessages(allMessages);
        await AsyncStorage.setItem('agentpay_inapp_messages', JSON.stringify(allMessages));
      } catch (error) {
        console.error('Failed to create campaign:', error);
      }
    },
    [campaigns]
  );

  // Get message stats
  const getMessageStats = useCallback(() => {
    const total = messages.length;
    const shown = messages.filter((m) => m.shown).length;
    const clicked = messages.filter((m) => m.clicked).length;
    const dismissed = messages.filter((m) => m.dismissed).length;

    return {
      total,
      shown,
      clicked,
      dismissed,
      impressionRate: total > 0 ? (shown / total) * 100 : 0,
      clickRate: shown > 0 ? (clicked / shown) * 100 : 0,
      dismissRate: total > 0 ? (dismissed / total) * 100 : 0,
    };
  }, [messages]);

  // Initialize on mount
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    campaigns,
    currentMessage,
    addMessage,
    markAsShown,
    markAsClicked,
    dismissMessage,
    createCampaign,
    getMessageStats,
    loadMessages,
  };
}
