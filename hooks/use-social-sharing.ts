import { useState, useCallback } from 'react';
import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';

export interface ShareContent {
  title: string;
  message: string;
  url?: string;
  imageUrl?: string;
}

export interface SocialPlatform {
  id: 'whatsapp' | 'twitter' | 'telegram' | 'facebook' | 'email' | 'generic';
  name: string;
  icon: string;
  enabled: boolean;
}

export interface ShareStats {
  totalShares: number;
  sharesByPlatform: Record<string, number>;
  lastSharedAt?: number;
}

export interface SocialSharingState {
  platforms: SocialPlatform[];
  stats: ShareStats;
  isLoading: boolean;
  error: string | null;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: 'whatsapp', name: 'WhatsApp', icon: '💬', enabled: true },
  { id: 'twitter', name: 'Twitter', icon: '𝕏', enabled: true },
  { id: 'telegram', name: 'Telegram', icon: '✈️', enabled: true },
  { id: 'facebook', name: 'Facebook', icon: '👍', enabled: true },
  { id: 'email', name: 'Email', icon: '📧', enabled: true },
  { id: 'generic', name: 'More', icon: '📤', enabled: true },
];

export function useSocialSharing() {
  const [state, setState] = useState<SocialSharingState>({
    platforms: SOCIAL_PLATFORMS,
    stats: {
      totalShares: 0,
      sharesByPlatform: {},
    },
    isLoading: false,
    error: null,
  });

  // Condividi su WhatsApp
  const shareOnWhatsApp = useCallback(async (content: ShareContent): Promise<boolean> => {
    try {
      const message = encodeURIComponent(`${content.message}\n\n${content.url || ''}`);
      const url = `whatsapp://send?text=${message}`;

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error('WhatsApp non è installato');
      }

      await Linking.openURL(url);

      // Aggiorna le statistiche
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalShares: prev.stats.totalShares + 1,
          sharesByPlatform: {
            ...prev.stats.sharesByPlatform,
            whatsapp: (prev.stats.sharesByPlatform.whatsapp || 0) + 1,
          },
          lastSharedAt: Date.now(),
        },
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share on WhatsApp';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  // Condividi su Twitter
  const shareOnTwitter = useCallback(async (content: ShareContent): Promise<boolean> => {
    try {
      const text = encodeURIComponent(`${content.message} ${content.url || ''}`);
      const url = `https://twitter.com/intent/tweet?text=${text}`;

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error('Cannot open Twitter');
      }

      await Linking.openURL(url);

      // Aggiorna le statistiche
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalShares: prev.stats.totalShares + 1,
          sharesByPlatform: {
            ...prev.stats.sharesByPlatform,
            twitter: (prev.stats.sharesByPlatform.twitter || 0) + 1,
          },
          lastSharedAt: Date.now(),
        },
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share on Twitter';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  // Condividi su Telegram
  const shareOnTelegram = useCallback(async (content: ShareContent): Promise<boolean> => {
    try {
      const message = encodeURIComponent(`${content.message}\n\n${content.url || ''}`);
      const url = `https://t.me/share/url?url=${encodeURIComponent(content.url || '')}&text=${message}`;

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error('Telegram non è installato');
      }

      await Linking.openURL(url);

      // Aggiorna le statistiche
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalShares: prev.stats.totalShares + 1,
          sharesByPlatform: {
            ...prev.stats.sharesByPlatform,
            telegram: (prev.stats.sharesByPlatform.telegram || 0) + 1,
          },
          lastSharedAt: Date.now(),
        },
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share on Telegram';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  // Condividi via Email
  const shareViaEmail = useCallback(async (content: ShareContent): Promise<boolean> => {
    try {
      const subject = encodeURIComponent(content.title);
      const body = encodeURIComponent(`${content.message}\n\n${content.url || ''}`);
      const url = `mailto:?subject=${subject}&body=${body}`;

      await Linking.openURL(url);

      // Aggiorna le statistiche
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalShares: prev.stats.totalShares + 1,
          sharesByPlatform: {
            ...prev.stats.sharesByPlatform,
            email: (prev.stats.sharesByPlatform.email || 0) + 1,
          },
          lastSharedAt: Date.now(),
        },
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share via email';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  // Condividi genericamente (usa Share API nativa)
  const shareGeneric = useCallback(async (content: ShareContent): Promise<boolean> => {
    try {
      await Share.share({
        message: `${content.message}\n\n${content.url || ''}`,
        title: content.title,
        url: content.imageUrl,
      });

      // Aggiorna le statistiche
      setState(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalShares: prev.stats.totalShares + 1,
          sharesByPlatform: {
            ...prev.stats.sharesByPlatform,
            generic: (prev.stats.sharesByPlatform.generic || 0) + 1,
          },
          lastSharedAt: Date.now(),
        },
      }));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  // Condividi su una piattaforma specifica
  const shareOnPlatform = useCallback(
    async (platform: string, content: ShareContent): Promise<boolean> => {
      switch (platform) {
        case 'whatsapp':
          return shareOnWhatsApp(content);
        case 'twitter':
          return shareOnTwitter(content);
        case 'telegram':
          return shareOnTelegram(content);
        case 'email':
          return shareViaEmail(content);
        default:
          return shareGeneric(content);
      }
    },
    [shareOnWhatsApp, shareOnTwitter, shareOnTelegram, shareViaEmail, shareGeneric],
  );

  return {
    ...state,
    shareOnWhatsApp,
    shareOnTwitter,
    shareOnTelegram,
    shareViaEmail,
    shareGeneric,
    shareOnPlatform,
  };
}
