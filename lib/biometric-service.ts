import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Biometric Authentication Service
 * Handles Face ID, Touch ID, and fingerprint authentication
 */

export type BiometricType = 'fingerprint' | 'faceid' | 'iris';

export interface BiometricAvailability {
  available: boolean;
  types: BiometricType[];
  enrolled: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: BiometricType;
}

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
const BIOMETRIC_TYPE_KEY = 'biometric_type';
const TRANSACTION_THRESHOLD_KEY = 'biometric_transaction_threshold';

/**
 * Check biometric availability
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    
    if (!compatible) {
      return {
        available: false,
        types: [],
        enrolled: false,
      };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (!enrolled) {
      return {
        available: true,
        types: [],
        enrolled: false,
      };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    // Map authentication types to our types
    const biometricTypes: BiometricType[] = [];
    
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricTypes.push('fingerprint');
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricTypes.push('faceid');
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricTypes.push('iris');
    }

    return {
      available: true,
      types: biometricTypes,
      enrolled: true,
    };
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return {
      available: false,
      types: [],
      enrolled: false,
    };
  }
}

/**
 * Authenticate with biometric
 */
export async function authenticateWithBiometric(
  reason: string = 'Authenticate to confirm transaction'
): Promise<BiometricAuthResult> {
  try {
    const availability = await checkBiometricAvailability();
    
    if (!availability.available || !availability.enrolled) {
      return {
        success: false,
        error: 'Biometric authentication not available',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      disableDeviceFallback: false,
      // `promptMessage` is the option actually supported by expo-local-authentication
      promptMessage: reason,
      fallbackLabel: 'Use passcode',
    });

    if (result.success) {
      const biometricType = availability.types[0] || 'fingerprint';
      return {
        success: true,
        biometricType: biometricType as BiometricType,
      };
    }

    // `error` only exists on the failure branch of LocalAuthenticationResult
    const failure = result as Extract<
      LocalAuthentication.LocalAuthenticationResult,
      { success: false }
    >;

    return {
      success: false,
      error: failure.error || 'Authentication failed',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Enable biometric authentication
 */
export async function enableBiometricAuth(): Promise<boolean> {
  try {
    const availability = await checkBiometricAvailability();
    
    if (!availability.available || !availability.enrolled) {
      return false;
    }

    // Authenticate once to enable
    const result = await authenticateWithBiometric('Enable biometric authentication');
    
    if (result.success) {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      if (result.biometricType) {
        await AsyncStorage.setItem(BIOMETRIC_TYPE_KEY, result.biometricType);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to enable biometric auth:', error);
    return false;
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometricAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
    await AsyncStorage.removeItem(BIOMETRIC_TYPE_KEY);
  } catch (error) {
    console.error('Failed to disable biometric auth:', error);
  }
}

/**
 * Check if biometric auth is enabled
 */
export async function isBiometricAuthEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Failed to check biometric auth status:', error);
    return false;
  }
}

/**
 * Get enabled biometric type
 */
export async function getEnabledBiometricType(): Promise<BiometricType | null> {
  try {
    const type = await AsyncStorage.getItem(BIOMETRIC_TYPE_KEY);
    return (type as BiometricType) || null;
  } catch (error) {
    console.error('Failed to get biometric type:', error);
    return null;
  }
}

/**
 * Set transaction threshold for biometric auth
 * Transactions above this amount require biometric authentication
 */
export async function setTransactionThreshold(amount: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TRANSACTION_THRESHOLD_KEY, amount);
  } catch (error) {
    console.error('Failed to set transaction threshold:', error);
  }
}

/**
 * Get transaction threshold
 */
export async function getTransactionThreshold(): Promise<string> {
  try {
    const threshold = await AsyncStorage.getItem(TRANSACTION_THRESHOLD_KEY);
    return threshold || '0.1'; // Default: 0.1 ETH
  } catch (error) {
    console.error('Failed to get transaction threshold:', error);
    return '0.1';
  }
}

/**
 * Check if transaction requires biometric auth
 */
export async function requiresBiometricAuth(transactionAmount: string): Promise<boolean> {
  try {
    const enabled = await isBiometricAuthEnabled();
    if (!enabled) return false;

    const threshold = await getTransactionThreshold();
    const amount = parseFloat(transactionAmount);
    const thresholdAmount = parseFloat(threshold);

    return amount > thresholdAmount;
  } catch (error) {
    console.error('Failed to check biometric requirement:', error);
    return false;
  }
}

/**
 * Authenticate transaction
 */
export async function authenticateTransaction(
  amount: string,
  recipient: string
): Promise<BiometricAuthResult> {
  try {
    const requires = await requiresBiometricAuth(amount);
    
    if (!requires) {
      return { success: true };
    }

    const reason = `Confirm transaction of ${amount} ETH to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
    return await authenticateWithBiometric(reason);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get biometric auth status
 */
export async function getBiometricStatus() {
  try {
    const availability = await checkBiometricAvailability();
    const enabled = await isBiometricAuthEnabled();
    const biometricType = await getEnabledBiometricType();
    const threshold = await getTransactionThreshold();

    return {
      available: availability.available,
      enrolled: availability.enrolled,
      types: availability.types,
      enabled,
      biometricType,
      threshold,
    };
  } catch (error) {
    console.error('Failed to get biometric status:', error);
    return {
      available: false,
      enrolled: false,
      types: [],
      enabled: false,
      biometricType: null,
      threshold: '0.1',
    };
  }
}
