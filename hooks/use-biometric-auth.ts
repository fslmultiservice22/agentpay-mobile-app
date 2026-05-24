import { useState, useCallback, useEffect } from 'react';
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
  enableBiometricAuth,
  disableBiometricAuth,
  isBiometricAuthEnabled,
  getEnabledBiometricType,
  setTransactionThreshold,
  getTransactionThreshold,
  requiresBiometricAuth,
  authenticateTransaction,
  getBiometricStatus,
  type BiometricAvailability,
  type BiometricAuthResult,
  type BiometricType,
} from '@/lib/biometric-service';

export interface UseBiometricAuthReturn {
  // State
  availability: BiometricAvailability;
  isEnabled: boolean;
  biometricType: BiometricType | null;
  transactionThreshold: string;
  isLoading: boolean;
  error: string | null;
  
  // Methods
  checkAvailability: () => Promise<void>;
  authenticate: (reason?: string) => Promise<BiometricAuthResult>;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  setThreshold: (amount: string) => Promise<void>;
  checkTransactionRequirement: (amount: string) => Promise<boolean>;
  authenticateTransaction: (amount: string, recipient: string) => Promise<BiometricAuthResult>;
  getStatus: () => Promise<void>;
}

/**
 * Hook for biometric authentication with advanced features
 */
export function useBiometricAuth(): UseBiometricAuthReturn {
  const [availability, setAvailability] = useState<BiometricAvailability>({
    available: false,
    types: [],
    enrolled: false,
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType | null>(null);
  const [transactionThreshold, setTransactionThreshold] = useState<string>('0.1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  /**
   * Check biometric availability
   */
  const checkAvailability = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const avail = await checkBiometricAvailability();
      setAvailability(avail);

      const enabled = await isBiometricAuthEnabled();
      setIsEnabled(enabled);

      const type = await getEnabledBiometricType();
      setBiometricType(type);

      const threshold = await getTransactionThreshold();
      setTransactionThreshold(threshold);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check availability';
      setError(errorMessage);
      console.error('Check availability error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Authenticate with biometric
   */
  const authenticate = useCallback(async (reason?: string): Promise<BiometricAuthResult> => {
    setError(null);

    try {
      const result = await authenticateWithBiometric(reason);
      
      if (!result.success) {
        setError(result.error);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('Authenticate error:', err);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, []);

  /**
   * Enable biometric auth
   */
  const enable = useCallback(async (): Promise<boolean> => {
    setError(null);

    try {
      const result = await enableBiometricAuth();
      
      if (result) {
        setIsEnabled(true);
        const type = await getEnabledBiometricType();
        setBiometricType(type);
      } else {
        setError('Failed to enable biometric authentication');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable';
      setError(errorMessage);
      console.error('Enable error:', err);
      return false;
    }
  }, []);

  /**
   * Disable biometric auth
   */
  const disable = useCallback(async () => {
    setError(null);

    try {
      await disableBiometricAuth();
      setIsEnabled(false);
      setBiometricType(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable';
      setError(errorMessage);
      console.error('Disable error:', err);
    }
  }, []);

  /**
   * Set transaction threshold
   */
  const setThreshold = useCallback(async (amount: string) => {
    setError(null);

    try {
      await setTransactionThreshold(amount);
      setTransactionThreshold(amount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set threshold';
      setError(errorMessage);
      console.error('Set threshold error:', err);
    }
  }, []);

  /**
   * Check if transaction requires biometric auth
   */
  const checkTransactionRequirement = useCallback(async (amount: string): Promise<boolean> => {
    try {
      setError(null);
      return await requiresBiometricAuth(amount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check requirement';
      setError(errorMessage);
      console.error('Check requirement error:', err);
      return false;
    }
  }, []);

  /**
   * Authenticate transaction
   */
  const handleAuthenticateTransaction = useCallback(
    async (amount: string, recipient: string): Promise<BiometricAuthResult> => {
      setError(null);

      try {
        const result = await authenticateTransaction(amount, recipient);
        
        if (!result.success) {
          setError(result.error);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transaction authentication failed';
        setError(errorMessage);
        console.error('Authenticate transaction error:', err);
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    []
  );

  /**
   * Get full status
   */
  const getStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await getBiometricStatus();
      setAvailability({
        available: status.available,
        enrolled: status.enrolled,
        types: status.types,
      });
      setIsEnabled(status.enabled);
      setBiometricType(status.biometricType);
      setTransactionThreshold(status.threshold);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get status';
      setError(errorMessage);
      console.error('Get status error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    availability,
    isEnabled,
    biometricType,
    transactionThreshold,
    isLoading,
    error,
    checkAvailability,
    authenticate,
    enable,
    disable,
    setThreshold,
    checkTransactionRequirement,
    authenticateTransaction: handleAuthenticateTransaction,
    getStatus,
  };
}
