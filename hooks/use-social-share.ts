import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialPlatform, SocialShare, SOCIAL_SHARE_TEMPLATES } from '@/lib/social/social-config';
import { useSocialAuth } from './use-social-auth';

interface UseSocialShareState {
  shares: SocialShare[];
  loading: boolean;
  error: string | null;
}

export function useSocialShare() {
  const [state, setState] = useState<UseSocialShareState>({
    shares: [],
    loading: false,
    error: null,
  });

  const { getAccessToken } = useSocialAuth();

  const loadShares = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('social_shares');
      if (saved) {
        setState(prev => ({ ...prev, shares: JSON.parse(saved) }));
      }
    } catch (error) {
      console.error('Error loading social shares:', error);
    }
  }, []);

  const shareToSocial = useCallback(
    async (
      platforms: SocialPlatform[],
      content: string,
      media?: { type: 'image' | 'video'; url: string }[],
      metadata?: any
    ) => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const shares: SocialShare[] = [];

        for (const platform of platforms) {
          const token = await getAccessToken(platform);
          if (!token) {
            console.warn(`No token available for ${platform}`);
            continue;
          }

          try {
            const response = await postToSocial(platform, token, {
              content,
              media,
              metadata,
            });

            if (response) {
              const share: SocialShare = {
                id: response.id || `${platform}_${Date.now()}`,
                platform,
                content,
                media,
                metadata,
                postedAt: Date.now(),
                likes: 0,
                comments: 0,
                shares: 0,
                url: response.url || '',
              };

              shares.push(share);
            }
          } catch (error) {
            console.error(`Error sharing to ${platform}:`, error);
          }
        }

        // Save shares
        const allShares = [...state.shares, ...shares];
        await AsyncStorage.setItem('social_shares', JSON.stringify(allShares));
        setState(prev => ({ ...prev, shares: allShares, loading: false }));

        return shares;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sharing failed';
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
        return [];
      }
    },
    [state.shares, getAccessToken]
  );

  const shareTemplate = useCallback(
    async (
      platforms: SocialPlatform[],
      templateKey: keyof typeof SOCIAL_SHARE_TEMPLATES,
      data: any,
      media?: { type: 'image' | 'video'; url: string }[]
    ) => {
      const template = SOCIAL_SHARE_TEMPLATES[templateKey];
      const content = template(data);
      return shareToSocial(platforms, content, media, { template: templateKey, ...data });
    },
    [shareToSocial]
  );

  const getShareStats = useCallback(
    async (shareId: string) => {
      try {
        const share = state.shares.find(s => s.id === shareId);
        if (!share) return null;

        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/social/share/${shareId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const stats = await response.json();
          const updatedShare = { ...share, ...stats };
          
          const updatedShares = state.shares.map(s => (s.id === shareId ? updatedShare : s));
          await AsyncStorage.setItem('social_shares', JSON.stringify(updatedShares));
          setState(prev => ({ ...prev, shares: updatedShares }));

          return updatedShare;
        }
      } catch (error) {
        console.error('Error fetching share stats:', error);
      }
    },
    [state.shares]
  );

  const deleteShare = useCallback(
    async (shareId: string) => {
      try {
        const share = state.shares.find(s => s.id === shareId);
        if (!share) return;

        const token = await getAccessToken(share.platform);
        if (!token) return;

        await deleteFromSocial(share.platform, token, shareId);

        const updatedShares = state.shares.filter(s => s.id !== shareId);
        await AsyncStorage.setItem('social_shares', JSON.stringify(updatedShares));
        setState(prev => ({ ...prev, shares: updatedShares }));
      } catch (error) {
        console.error('Error deleting share:', error);
      }
    },
    [state.shares, getAccessToken]
  );

  return {
    ...state,
    loadShares,
    shareToSocial,
    shareTemplate,
    getShareStats,
    deleteShare,
  };
}

// Helper functions
async function postToSocial(
  platform: SocialPlatform,
  token: string,
  data: { content: string; media?: any; metadata?: any }
) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/social/post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ platform, ...data }),
    });

    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.error(`Error posting to ${platform}:`, error);
  }
  return null;
}

async function deleteFromSocial(platform: SocialPlatform, token: string, postId: string) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/social/post/${postId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ platform }),
    });

    return response.ok;
  } catch (error) {
    console.error(`Error deleting from ${platform}:`, error);
  }
  return false;
}
