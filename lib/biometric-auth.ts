/**
 * Biometric Authentication Service
 * Face ID / Fingerprint authentication for secure transfers
 */

import * as LocalAuthentication from 'expo-local-authentication';

export enum BiometricType {
  FACE_ID = 'faceId',
  FINGERPRINT = 'fingerprint',
  IRIS = 'iris',
  NONE = 'none',
}

export interface BiometricAuthOptions {
  reason?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: BiometricType;
}

class BiometricAuthService {
  private supportedBiometrics: BiometricType[] = [];
  private isAvailable = false;

  async initialize(): Promise<void> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      this.isAvailable = compatible;

      if (compatible) {
        const biometrics = await LocalAuthentication.supportedAuthenticationTypesAsync();
        this.supportedBiometrics = this.mapBiometrics(biometrics);
      }
    } catch (error) {
      console.error('❌ Failed to initialize biometric auth:', error);
      this.isAvailable = false;
    }
  }

  private mapBiometrics(biometrics: LocalAuthentication.AuthenticationType[]): BiometricType[] {
    const mapped: BiometricType[] = [];

    biometrics.forEach((bio) => {
      switch (bio) {
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          mapped.push(BiometricType.FACE_ID);
          break;
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          mapped.push(BiometricType.FINGERPRINT);
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          mapped.push(BiometricType.IRIS);
          break;
      }
    });

    return mapped;
  }

  async authenticate(options: BiometricAuthOptions): Promise<BiometricAuthResult> {
    if (!this.isAvailable) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    if (this.supportedBiometrics.length === 0) {
      return {
        success: false,
        error: 'No biometric authentication method is configured',
      };
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: options.disableDeviceFallback || false,
      } as any);

      if (result.success) {
        return {
          success: true,
          biometricType: this.supportedBiometrics[0],
        };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  isAvailableAsync(): boolean {
    return this.isAvailable;
  }

  getSupportedBiometrics(): BiometricType[] {
    return this.supportedBiometrics;
  }

  getPrimaryBiometricType(): BiometricType {
    return this.supportedBiometrics.length > 0 ? this.supportedBiometrics[0] : BiometricType.NONE;
  }

  async isBiometricEnrolledAsync(): Promise<boolean> {
    try {
      return await LocalAuthentication.isEnrolledAsync();
    } catch (error) {
      console.error('❌ Failed to check biometric enrollment:', error);
      return false;
    }
  }
}

// Singleton instance
let biometricService: BiometricAuthService | null = null;

export function getBiometricAuthService(): BiometricAuthService {
  if (!biometricService) {
    biometricService = new BiometricAuthService();
  }
  return biometricService;
}

export async function initializeBiometricAuth(): Promise<BiometricAuthService> {
  const service = getBiometricAuthService();
  await service.initialize();
  return service;
}
