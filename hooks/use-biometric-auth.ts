import { useState, useCallback, useRef, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricAuthState {
  isAvailable: boolean;
  isFaceIDAvailable: boolean;
  isTouchIDAvailable: boolean;
  isEnabled: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const BIOMETRIC_ENABLED_KEY = 'agentpay_biometric_enabled';
const BIOMETRIC_VERIFIED_KEY = 'agentpay_biometric_verified';

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isFaceIDAvailable: false,
    isTouchIDAvailable: false,
    isEnabled: false,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Controlla la disponibilità di biometria
  const checkBiometricAvailability = useCallback(async () => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      // Controlla se il dispositivo supporta l'autenticazione biometrica
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isAvailable: false,
            isLoading: false,
            error: 'Device does not support biometric authentication',
          }));
        }
        return;
      }

      // Ottieni i tipi di biometria disponibili
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isFaceIDAvailable = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      const isTouchIDAvailable = supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);

      // Controlla se la biometria è abilitata
      const isEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isAvailable: true,
          isFaceIDAvailable,
          isTouchIDAvailable,
          isEnabled: isEnabled === 'true',
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check biometric availability';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, []);

  // Autentica con biometria
  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!state.isAvailable) {
      return false;
    }

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      // Esegui l'autenticazione biometrica
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        fallbackLabel: 'Authenticate to access your wallet',
      } as any);

      if (result.success) {
        // Salva il timestamp di autenticazione
        await AsyncStorage.setItem(BIOMETRIC_VERIFIED_KEY, Date.now().toString());

        // Imposta il timeout di 5 minuti per la ri-autenticazione
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
        }

        authTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              isAuthenticated: false,
            }));
          }
        }, 5 * 60 * 1000) as unknown as NodeJS.Timeout; // 5 minuti

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            isLoading: false,
          }));
        }

        return true;
      } else {
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Biometric authentication failed',
          }));
        }
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Biometric authentication error';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
      return false;
    }
  }, [state.isAvailable]);

  // Abilita la biometria
  const enableBiometric = useCallback(async (): Promise<boolean> => {
    try {
      // Verifica prima con biometria
      const authenticated = await authenticate();
      if (!authenticated) {
        return false;
      }

      // Salva la preferenza
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isEnabled: true,
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to enable biometric:', err);
      return false;
    }
  }, [authenticate]);

  // Disabilita la biometria
  const disableBiometric = useCallback(async (): Promise<boolean> => {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isEnabled: false,
          isAuthenticated: false,
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to disable biometric:', err);
      return false;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }

    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
      }));
    }
  }, []);

  // Controlla l'autenticazione al mount
  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    checkBiometricAvailability,
    authenticate,
    enableBiometric,
    disableBiometric,
    logout,
  };
}

// Hook per autenticazione biometrica per trasferimenti
export function useBiometricAuthForTransfer(minAmount: number = 500) {
  const biometric = useBiometricAuth();

  const authenticateTransfer = useCallback(async (amount: number): Promise<boolean> => {
    if (amount < minAmount) {
      return true; // No authentication required for small amounts
    }

    if (!biometric.isAvailable || !biometric.isEnabled) {
      return true; // Fallback to password if biometric not available
    }

    return await biometric.authenticate();
  }, [biometric, minAmount]);

  return {
    ...biometric,
    authenticateTransfer,
    minAmount,
  };
}
