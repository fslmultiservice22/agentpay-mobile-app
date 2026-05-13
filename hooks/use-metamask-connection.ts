import { useState, useCallback, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

interface MetaMaskConnectionResult {
  success: boolean;
  address?: string;
  error?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useMetaMaskConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);

  const checkMetaMaskInstalled = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        // Prova a controllare se MetaMask è installato
        const canOpen = await Linking.canOpenURL('metamask://');
        return canOpen;
      } else if (Platform.OS === 'ios') {
        const canOpen = await Linking.canOpenURL('metamask://');
        return canOpen;
      }
      return false;
    } catch (err) {
      console.error('Error checking MetaMask installation:', err);
      return false;
    }
  }, []);

  const openMetaMaskApp = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        // Deep link per Android
        const deepLink = 'metamask://';
        const canOpen = await Linking.canOpenURL(deepLink);
        
        if (canOpen) {
          await Linking.openURL(deepLink);
          return true;
        }

        // Fallback: apri il Play Store
        await Linking.openURL('https://play.google.com/store/apps/details?id=io.metamask');
        return false;
      } else if (Platform.OS === 'ios') {
        // Deep link per iOS
        const deepLink = 'metamask://';
        const canOpen = await Linking.canOpenURL(deepLink);
        
        if (canOpen) {
          await Linking.openURL(deepLink);
          return true;
        }

        // Fallback: apri l'App Store
        await Linking.openURL('https://apps.apple.com/app/metamask/id1438144202');
        return false;
      }
      
      return false;
    } catch (err) {
      console.error('Error opening MetaMask:', err);
      return false;
    }
  }, []);

  const connectWithRetry = useCallback(async (retryCount = 0): Promise<MetaMaskConnectionResult> => {
    try {
      setError(null);
      setIsConnecting(true);

      // Verifica se MetaMask è installato
      const isInstalled = await checkMetaMaskInstalled();
      
      if (!isInstalled) {
        const opened = await openMetaMaskApp();
        if (!opened) {
          return {
            success: false,
            error: 'MetaMask not installed. Please install MetaMask from the app store.',
          };
        }
        return {
          success: false,
          error: 'Please complete MetaMask installation and try again.',
        };
      }

      // Genera un session ID univoco
      const sessionId = `agentpay_${Date.now()}`;
      await SecureStore.setItemAsync('metamask_session_id', sessionId);

      // Apri MetaMask
      const deepLink = Platform.OS === 'android' 
        ? `metamask://dapp?url=agentpay://wallet-connect&sessionId=${sessionId}`
        : `metamask://dapp?url=agentpay://wallet-connect&sessionId=${sessionId}`;

      const canOpen = await Linking.canOpenURL(deepLink);
      
      if (!canOpen) {
        // Retry con delay
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return connectWithRetry(retryCount + 1);
        }
        
        return {
          success: false,
          error: 'Failed to connect to MetaMask. Please try again.',
        };
      }

      await Linking.openURL(deepLink);

      // Simula la connessione (in produzione, questo verrebbe dal callback)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            success: true,
            address: '0x' + 'a'.repeat(40),
          });
        }, 2000);

        // Cleanup
        return () => clearTimeout(timeout);
      });
    } catch (err) {
      console.error('MetaMask connection error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      // Retry con delay
      if (retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return connectWithRetry(retryCount + 1);
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsConnecting(false);
      retryCountRef.current = 0;
    }
  }, [checkMetaMaskInstalled, openMetaMaskApp]);

  const connect = useCallback(async (): Promise<MetaMaskConnectionResult> => {
    retryCountRef.current = 0;
    return connectWithRetry(0);
  }, [connectWithRetry]);

  return {
    connect,
    isConnecting,
    error,
    checkMetaMaskInstalled,
  };
}
