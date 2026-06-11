import { useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export function useBiometric() {
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricAvailable(compatible);

      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        }
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const authenticate = async (): Promise<boolean> => {
    try {
      if (!isBiometricAvailable) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
      });

      setIsAuthenticated(result.success);
      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  return {
    isBiometricAvailable,
    biometricType,
    isAuthenticated,
    authenticate,
  };
}