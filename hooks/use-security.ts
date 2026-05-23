import { useState, useCallback, useEffect } from 'react';
import { securityService, SecurityConfig } from '@/lib/security-service';

export interface UseSecurityState {
  config: SecurityConfig | null;
  loading: boolean;
  error: string | null;
  biometricsAvailable: boolean;
  biometricsEnrolled: boolean;
}

/**
 * Hook per gestire la sicurezza dell'app
 */
export function useSecurity() {
  const [state, setState] = useState<UseSecurityState>({
    config: null,
    loading: true,
    error: null,
    biometricsAvailable: false,
    biometricsEnrolled: false,
  });

  /**
   * Inizializza la configurazione di sicurezza
   */
  useEffect(() => {
    const initialize = async () => {
      try {
        const config = await securityService.initializeSecurityConfig();
        const securityCheck = await securityService.performSecurityCheck();

        setState((prev) => ({
          ...prev,
          config,
          loading: false,
          biometricsAvailable: securityCheck.biometricsAvailable,
          biometricsEnrolled: securityCheck.biometricsEnrolled,
        }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Security initialization failed';
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
      }
    };

    initialize();
  }, []);

  /**
   * Abilita/disabilita biometrics
   */
  const setBiometricsEnabled = useCallback(async (enabled: boolean) => {
    try {
      await securityService.setBiometricsEnabled(enabled);
      const config = await securityService.getSecurityConfig();
      setState((prev) => ({ ...prev, config }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set biometrics';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Autentica con biometrics
   */
  const authenticateWithBiometrics = useCallback(async () => {
    try {
      const success = await securityService.authenticateWithBiometrics();
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Biometric authentication failed';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Imposta un PIN
   */
  const setPIN = useCallback(async (pin: string) => {
    try {
      await securityService.setPIN(pin);
      const config = await securityService.getSecurityConfig();
      setState((prev) => ({ ...prev, config }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to set PIN';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Verifica il PIN
   */
  const verifyPIN = useCallback(async (pin: string) => {
    try {
      return await securityService.verifyPIN(pin);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PIN verification failed';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Rimuove il PIN
   */
  const removePIN = useCallback(async () => {
    try {
      await securityService.removePIN();
      const config = await securityService.getSecurityConfig();
      setState((prev) => ({ ...prev, config }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove PIN';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Cripta i dati
   */
  const encryptData = useCallback(async (data: string) => {
    try {
      return await securityService.encryptData(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Encryption failed';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Decripta i dati
   */
  const decryptData = useCallback(async (encryptedData: any) => {
    try {
      return await securityService.decryptData(encryptedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Decryption failed';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Salva dati sensibili
   */
  const saveSecureData = useCallback(async (key: string, data: string) => {
    try {
      await securityService.saveSecureData(key, data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save secure data';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Recupera dati sensibili
   */
  const getSecureData = useCallback(async (key: string) => {
    try {
      return await securityService.getSecureData(key);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get secure data';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Wipe all data
   */
  const wipeAllData = useCallback(async () => {
    try {
      await securityService.wipeAllData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to wipe data';
      setState((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  return {
    ...state,
    setBiometricsEnabled,
    authenticateWithBiometrics,
    setPIN,
    verifyPIN,
    removePIN,
    encryptData,
    decryptData,
    saveSecureData,
    getSecureData,
    wipeAllData,
  };
}
