import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: 'user' | 'agent' | 'bot';
  message: string;
  timestamp: number;
  read: boolean;
  attachments?: string[];
}

export interface SupportConversation {
  id: string;
  userId: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'billing' | 'technical' | 'account' | 'general' | 'other';
  messages: ChatMessage[];
  assignedAgent?: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

export interface SupportAgent {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'busy';
  specialties: string[];
  rating: number;
  responseTime: number; // minutes
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

export function useSupportChat() {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<SupportConversation | null>(
    null
  );
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [faqItems, setFAQItems] = useState<FAQItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const MOCK_AGENTS: SupportAgent[] = [
    {
      id: 'agent_1',
      name: 'John Support',
      email: 'john@support.com',
      status: 'online',
      specialties: ['billing', 'technical'],
      rating: 4.8,
      responseTime: 2,
    },
    {
      id: 'agent_2',
      name: 'Sarah Help',
      email: 'sarah@support.com',
      status: 'online',
      specialties: ['account', 'general'],
      rating: 4.9,
      responseTime: 1,
    },
  ];

  const MOCK_FAQ: FAQItem[] = [
    {
      id: 'faq_1',
      question: 'How do I connect my wallet?',
      answer: 'Go to Settings and click Connect Wallet. Choose MetaMask or WalletConnect.',
      category: 'account',
      helpful: 150,
      notHelpful: 5,
    },
    {
      id: 'faq_2',
      question: 'What are the transaction fees?',
      answer: 'Transaction fees vary based on network congestion. Check the fee estimate before confirming.',
      category: 'billing',
      helpful: 200,
      notHelpful: 10,
    },
    {
      id: 'faq_3',
      question: 'How do I enable 2FA?',
      answer: 'Go to Settings > Security > Two-Factor Authentication and follow the setup instructions.',
      category: 'technical',
      helpful: 180,
      notHelpful: 3,
    },
  ];

  // Load conversations
  const loadConversations = useCallback(async (userId: string) => {
    try {
      const stored = await AsyncStorage.getItem(`agentpay_conversations_${userId}`);
      if (stored) {
        setConversations(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  // Create conversation
  const createConversation = useCallback(
    async (
      userId: string,
      subject: string,
      category: SupportConversation['category'],
      priority: SupportConversation['priority'] = 'medium'
    ) => {
      try {
        const conversation: SupportConversation = {
          id: `conv_${Date.now()}`,
          userId,
          subject,
          status: 'open',
          priority,
          category,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const updated = [...conversations, conversation];
        setConversations(updated);
        setCurrentConversation(conversation);

        await AsyncStorage.setItem(
          `agentpay_conversations_${userId}`,
          JSON.stringify(updated)
        );

        return conversation;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        return null;
      }
    },
    [conversations]
  );

  // Send message
  const sendMessage = useCallback(
    async (conversationId: string, message: string, attachments?: string[]) => {
      try {
        if (!currentConversation) return null;

        const chatMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          conversationId,
          sender: 'user',
          message,
          timestamp: Date.now(),
          read: false,
          attachments,
        };

        const updatedConversation = {
          ...currentConversation,
          messages: [...currentConversation.messages, chatMessage],
          updatedAt: Date.now(),
        };

        setCurrentConversation(updatedConversation);

        // Simulate bot response
        setIsTyping(true);
        setTimeout(() => {
          const botResponse: ChatMessage = {
            id: `msg_${Date.now()}`,
            conversationId,
            sender: 'bot',
            message: 'Thank you for your message. An agent will respond shortly.',
            timestamp: Date.now(),
            read: false,
          };

          setCurrentConversation((prev) =>
            prev
              ? {
                  ...prev,
                  messages: [...prev.messages, botResponse],
                }
              : null
          );
          setIsTyping(false);
        }, 1000);

        return chatMessage;
      } catch (error) {
        console.error('Failed to send message:', error);
        return null;
      }
    },
    [currentConversation]
  );

  // Assign agent
  const assignAgent = useCallback(
    async (conversationId: string, agentId: string) => {
      try {
        const updated = conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                assignedAgent: agentId,
                status: 'in_progress' as const,
                updatedAt: Date.now(),
              }
            : c
        );

        setConversations(updated);

        if (currentConversation?.id === conversationId) {
          setCurrentConversation(updated.find((c) => c.id === conversationId) || null);
        }

        return updated.find((c) => c.id === conversationId);
      } catch (error) {
        console.error('Failed to assign agent:', error);
        return null;
      }
    },
    [conversations, currentConversation]
  );

  // Close conversation
  const closeConversation = useCallback(
    async (conversationId: string) => {
      try {
        const updated = conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                status: 'closed' as const,
                resolvedAt: Date.now(),
                updatedAt: Date.now(),
              }
            : c
        );

        setConversations(updated);

        if (currentConversation?.id === conversationId) {
          setCurrentConversation(updated.find((c) => c.id === conversationId) || null);
        }

        return updated.find((c) => c.id === conversationId);
      } catch (error) {
        console.error('Failed to close conversation:', error);
        return null;
      }
    },
    [conversations, currentConversation]
  );

  // Search FAQ
  const searchFAQ = useCallback((query: string) => {
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(query.toLowerCase()) ||
        item.answer.toLowerCase().includes(query.toLowerCase())
    );
  }, [faqItems]);

  // Mark message as read
  const markAsRead = useCallback(
    async (messageId: string) => {
      try {
        if (!currentConversation) return;

        const updatedConversation = {
          ...currentConversation,
          messages: currentConversation.messages.map((m) =>
            m.id === messageId ? { ...m, read: true } : m
          ),
        };

        setCurrentConversation(updatedConversation);
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    },
    [currentConversation]
  );

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return conversations.reduce(
      (count, conv) =>
        count + conv.messages.filter((m) => !m.read && m.sender !== 'user').length,
      0
    );
  }, [conversations]);

  // Initialize
  useEffect(() => {
    setAgents(MOCK_AGENTS);
    setFAQItems(MOCK_FAQ);
  }, [MOCK_AGENTS, MOCK_FAQ]);

  return {
    conversations,
    currentConversation,
    agents,
    faqItems,
    isTyping,
    loadConversations,
    createConversation,
    sendMessage,
    assignAgent,
    closeConversation,
    searchFAQ,
    markAsRead,
    getUnreadCount,
    setCurrentConversation,
  };
}
