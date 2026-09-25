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
          error: (result as any).error || 'Authentication failed',
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

// ─── Funzioni per abilitazione e timeout app lock ───────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'agentpay_biometric_enabled';
const BIOMETRIC_LAST_AUTH_KEY = 'agentpay_biometric_last_auth';
const BIOMETRIC_TIMEOUT_KEY = 'agentpay_biometric_timeout';
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minuti

// Opzioni timeout disponibili (in millisecondi)
export const BIOMETRIC_TIMEOUT_OPTIONS = [
  { label: '1 minuto', value: 1 * 60 * 1000 },
  { label: '5 minuti', value: 5 * 60 * 1000 },
  { label: '15 minuti', value: 15 * 60 * 1000 },
  { label: '30 minuti', value: 30 * 60 * 1000 },
  { label: 'Mai (sempre richiesto)', value: 0 },
] as const;

export type BiometricTimeoutValue = typeof BIOMETRIC_TIMEOUT_OPTIONS[number]['value'];

export async function getBiometricTimeout(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(BIOMETRIC_TIMEOUT_KEY);
    if (raw !== null) return parseInt(raw, 10);
  } catch {}
  return DEFAULT_TIMEOUT_MS;
}

export async function setBiometricTimeout(ms: number): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_TIMEOUT_KEY, ms.toString());
}

export async function getBiometricEnabledStatus(): Promise<{ available: boolean; enrolled: boolean; type: 'face' | 'fingerprint' | 'none'; enabled: boolean }> {
  if (Platform.OS === 'web') return { available: false, enrolled: false, type: 'none', enabled: false };
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  let type: 'face' | 'fingerprint' | 'none' = 'none';
  if (hasHardware && isEnrolled) {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) type = 'face';
    else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) type = 'fingerprint';
  }
  const enabledRaw = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  return { available: hasHardware, enrolled: isEnrolled, type, enabled: enabledRaw === 'true' };
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function isBiometricEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const raw = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
  return raw === 'true';
}

export async function shouldRequireAuth(): Promise<boolean> {
  const enabled = await isBiometricEnabled();
  if (!enabled) return false;
  const timeout = await getBiometricTimeout();
  if (timeout === 0) return true;
  const lastAuthRaw = await AsyncStorage.getItem(BIOMETRIC_LAST_AUTH_KEY);
  if (!lastAuthRaw) return true;
  return Date.now() - parseInt(lastAuthRaw, 10) > timeout;
}

export async function markAuthenticated(): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_LAST_AUTH_KEY, Date.now().toString());
}

export async function authenticateWithBiometrics(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') return { success: true };
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return { success: false, error: 'Biometria non disponibile' };
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Accedi ad AgentPay',
      cancelLabel: 'Annulla',
      disableDeviceFallback: false,
      fallbackLabel: 'Usa PIN',
    });
    if (result.success) { await markAuthenticated(); return { success: true }; }
    const failResult = result as { success: false; error: string; warning?: string };
    if (failResult.error === 'user_cancel' || failResult.error === 'app_cancel') return { success: false, error: 'Autenticazione annullata' };
    return { success: false, error: 'Autenticazione fallita' };
  } catch { return { success: false, error: 'Errore durante l\'autenticazione' }; }
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
