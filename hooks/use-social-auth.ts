import { useState, useCallback, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SocialAccount, SocialPlatform, SOCIAL_PLATFORMS } from '@/lib/social/social-config';

interface UseSocialAuthState {
  accounts: SocialAccount[];
  loading: boolean;
  error: string | null;
}

export function useSocialAuth() {
  const [state, setState] = useState<UseSocialAuthState>({
    accounts: [],
    loading: false,
    error: null,
  });

  const loadSavedAccounts = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem('social_accounts');
      if (saved) {
        setState(prev => ({ ...prev, accounts: JSON.parse(saved) }));
      }
    } catch (error) {
      console.error('Error loading social accounts:', error);
    }
  }, []);

  // Load saved accounts on mount
  useEffect(() => {
    void loadSavedAccounts();
  }, [loadSavedAccounts]);

  const saveAccounts = useCallback(async (accounts: SocialAccount[]) => {
    try {
      await AsyncStorage.setItem('social_accounts', JSON.stringify(accounts));
      setState(prev => ({ ...prev, accounts }));
    } catch (error) {
      console.error('Error saving social accounts:', error);
    }
  }, []);

  const authenticate = useCallback(
    async (platform: SocialPlatform) => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const config = SOCIAL_PLATFORMS[platform];
        
        // Build OAuth URL
        const params = new URLSearchParams({
          client_id: process.env.EXPO_PUBLIC_SOCIAL_CLIENT_ID || '',
          redirect_uri: config.redirectUri,
          response_type: 'code',
          scope: config.scopes.join(' '),
          state: Math.random().toString(36).substring(7),
        });

        const authUrl = `${config.apiEndpoint}/oauth/authorize?${params.toString()}`;

        // Open browser for OAuth
        const result = await WebBrowser.openAuthSessionAsync(authUrl, config.redirectUri);

        if (result.type === 'success') {
          const url = new URL(result.url);
          const code = url.searchParams.get('code');

          if (code) {
            // Exchange code for token
            const tokenResponse = await exchangeCodeForToken(platform, code);
            
            if (tokenResponse) {
              const newAccount: SocialAccount = {
                platform,
                userId: tokenResponse.userId,
                username: tokenResponse.username,
                displayName: tokenResponse.displayName,
                profileImage: tokenResponse.profileImage,
                bio: tokenResponse.bio,
                followers: tokenResponse.followers || 0,
                following: tokenResponse.following || 0,
                verified: tokenResponse.verified || false,
                accessToken: tokenResponse.accessToken,
                refreshToken: tokenResponse.refreshToken,
                expiresAt: tokenResponse.expiresAt,
                connectedAt: Date.now(),
              };

              // Save token securely
              await SecureStore.setItemAsync(
                `social_token_${platform}`,
                JSON.stringify({
                  accessToken: newAccount.accessToken,
                  refreshToken: newAccount.refreshToken,
                })
              );

              // Update accounts list
              const updatedAccounts = [
                ...state.accounts.filter(a => a.platform !== platform),
                newAccount,
              ];
              await saveAccounts(updatedAccounts);

              setState(prev => ({ ...prev, loading: false }));
              return newAccount;
            }
          }
        } else if (result.type === 'cancel') {
          setState(prev => ({ ...prev, loading: false, error: 'Authentication cancelled' }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      }
    },
    [state.accounts, saveAccounts]
  );

  const disconnectAccount = useCallback(
    async (platform: SocialPlatform) => {
      try {
        // Remove from secure store
        await SecureStore.deleteItemAsync(`social_token_${platform}`);

        // Update accounts list
        const updatedAccounts = state.accounts.filter(a => a.platform !== platform);
        await saveAccounts(updatedAccounts);

        setState(prev => ({ ...prev, error: null }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Disconnection failed';
        setState(prev => ({ ...prev, error: errorMessage }));
      }
    },
    [state.accounts, saveAccounts]
  );

  const refreshToken = useCallback(
    async (platform: SocialPlatform) => {
      try {
        const account = state.accounts.find(a => a.platform === platform);
        if (!account || !account.refreshToken) return;

        const tokenData = await SecureStore.getItemAsync(`social_token_${platform}`);
        if (!tokenData) return;

        const { refreshToken } = JSON.parse(tokenData);
        const newTokenResponse = await refreshAccessToken(platform, refreshToken);

        if (newTokenResponse) {
          const updatedAccount = {
            ...account,
            accessToken: newTokenResponse.accessToken,
            refreshToken: newTokenResponse.refreshToken || account.refreshToken,
            expiresAt: newTokenResponse.expiresAt,
          };

          await SecureStore.setItemAsync(
            `social_token_${platform}`,
            JSON.stringify({
              accessToken: updatedAccount.accessToken,
              refreshToken: updatedAccount.refreshToken,
            })
          );

          const updatedAccounts = state.accounts.map(a =>
            a.platform === platform ? updatedAccount : a
          );
          await saveAccounts(updatedAccounts);

          return updatedAccount;
        }
      } catch (error) {
        console.error(`Error refreshing ${platform} token:`, error);
      }
    },
    [state.accounts, saveAccounts]
  );

  const getAccessToken = useCallback(
    async (platform: SocialPlatform): Promise<string | null> => {
      try {
        const account = state.accounts.find(a => a.platform === platform);
        if (!account) return null;

        // Check if token is expired
        if (Date.now() > account.expiresAt - 60000) {
          // Token expires in less than 1 minute, refresh it
          const refreshed = await refreshToken(platform);
          return refreshed?.accessToken || null;
        }

        return account.accessToken;
      } catch (error) {
        console.error(`Error getting ${platform} token:`, error);
        return null;
      }
    },
    [state.accounts, refreshToken]
  );

  return {
    ...state,
    authenticate,
    disconnectAccount,
    refreshToken,
    getAccessToken,
    getAccount: (platform: SocialPlatform) => state.accounts.find(a => a.platform === platform),
  };
}

// Helper functions (would be implemented in a backend service)
async function exchangeCodeForToken(platform: SocialPlatform, code: string) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/social/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, code }),
    });
    return response.json();
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    return null;
  }
}

async function refreshAccessToken(platform: SocialPlatform, refreshToken: string) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/social/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, refreshToken }),
    });
    return response.json();
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}
