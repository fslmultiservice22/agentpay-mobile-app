import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialPlatform, SocialAccount } from '@/lib/social/social-config';
import { useSocialAuth } from './use-social-auth';

interface SocialProfile {
  userId: string;
  username: string;
  displayName: string;
  bio: string;
  profileImage: string;
  followers: number;
  following: number;
  verified: boolean;
  socialLinks: Record<SocialPlatform, string>;
  badges: string[];
  lastSyncedAt: number;
}

interface UseSocialSyncState {
  profile: SocialProfile | null;
  syncing: boolean;
  error: string | null;
  lastSync: number;
}

export function useSocialSync() {
  const [state, setState] = useState<UseSocialSyncState>({
    profile: null,
    syncing: false,
    error: null,
    lastSync: 0,
  });

  const { accounts, getAccessToken } = useSocialAuth();

  // Load saved profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('social_profile');
      if (saved) {
        setState(prev => ({ ...prev, profile: JSON.parse(saved) }));
      }
    } catch (error) {
      console.error('Error loading social profile:', error);
    }
  }, []);

  const syncProfile = useCallback(async () => {
    setState(prev => ({ ...prev, syncing: true, error: null }));

    try {
      const socialLinks: Record<SocialPlatform, string> = {} as any;
      let totalFollowers = 0;
      let totalFollowing = 0;
      const badges: string[] = [];

      // Sync data from all connected accounts
      for (const account of accounts) {
        const token = await getAccessToken(account.platform);
        if (!token) continue;

        try {
          const profileData = await fetchSocialProfileData(account.platform, token);
          
          if (profileData) {
            socialLinks[account.platform] = profileData.profileUrl;
            totalFollowers += profileData.followers || 0;
            totalFollowing += profileData.following || 0;

            // Add verification badge if verified
            if (account.verified) {
              badges.push(`verified_${account.platform}`);
            }

            // Add follower badges
            if ((profileData.followers || 0) >= 10000) {
              badges.push(`influencer_${account.platform}`);
            }
          }
        } catch (error) {
          console.error(`Error syncing ${account.platform} profile:`, error);
        }
      }

      // Get primary account info (use first connected account)
      const primaryAccount = accounts[0];
      if (!primaryAccount) {
        setState(prev => ({ ...prev, syncing: false }));
        return;
      }

      const updatedProfile: SocialProfile = {
        userId: primaryAccount.userId,
        username: primaryAccount.username,
        displayName: primaryAccount.displayName,
        bio: primaryAccount.bio || '',
        profileImage: primaryAccount.profileImage,
        followers: totalFollowers,
        following: totalFollowing,
        verified: primaryAccount.verified,
        socialLinks,
        badges,
        lastSyncedAt: Date.now(),
      };

      // Save profile
      await AsyncStorage.setItem('social_profile', JSON.stringify(updatedProfile));
      setState(prev => ({
        ...prev,
        profile: updatedProfile,
        syncing: false,
        lastSync: Date.now(),
      }));

      return updatedProfile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setState(prev => ({ ...prev, syncing: false, error: errorMessage }));
    }
  }, [accounts, getAccessToken]);

  const updateProfileBio = useCallback(
    async (newBio: string) => {
      try {
        setState(prev => ({ ...prev, syncing: true }));

        // Update bio on all connected platforms
        for (const account of accounts) {
          const token = await getAccessToken(account.platform);
          if (!token) continue;

          try {
            await updateSocialBio(account.platform, token, newBio);
          } catch (error) {
            console.error(`Error updating bio on ${account.platform}:`, error);
          }
        }

        // Update local profile
        if (state.profile) {
          const updatedProfile = { ...state.profile, bio: newBio };
          await AsyncStorage.setItem('social_profile', JSON.stringify(updatedProfile));
          setState(prev => ({ ...prev, profile: updatedProfile, syncing: false }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Update failed';
        setState(prev => ({ ...prev, syncing: false, error: errorMessage }));
      }
    },
    [accounts, state.profile, getAccessToken]
  );

  const addSocialLink = useCallback(
    async (platform: SocialPlatform, profileUrl: string) => {
      try {
        if (state.profile) {
          const updatedProfile = {
            ...state.profile,
            socialLinks: {
              ...state.profile.socialLinks,
              [platform]: profileUrl,
            },
          };
          await AsyncStorage.setItem('social_profile', JSON.stringify(updatedProfile));
          setState(prev => ({ ...prev, profile: updatedProfile }));
        }
      } catch (error) {
        console.error('Error adding social link:', error);
      }
    },
    [state.profile]
  );

  const getBadges = useCallback(() => {
    return state.profile?.badges || [];
  }, [state.profile]);

  const getAggregatedStats = useCallback(() => {
    return {
      totalFollowers: state.profile?.followers || 0,
      totalFollowing: state.profile?.following || 0,
      connectedPlatforms: accounts.length,
      verified: state.profile?.verified || false,
      badges: state.profile?.badges || [],
    };
  }, [state.profile, accounts]);

  return {
    ...state,
    loadProfile,
    syncProfile,
    updateProfileBio,
    addSocialLink,
    getBadges,
    getAggregatedStats,
  };
}

// Helper functions
async function fetchSocialProfileData(platform: SocialPlatform, token: string) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/social/profile/${platform}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.error(`Error fetching ${platform} profile data:`, error);
  }
  return null;
}

async function updateSocialBio(platform: SocialPlatform, token: string, bio: string) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/social/profile/${platform}/bio`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ bio }),
    });

    return response.ok;
  } catch (error) {
    console.error(`Error updating ${platform} bio:`, error);
  }
  return false;
}
