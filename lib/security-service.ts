/**
 * Security Service
 * Gestisce encryption, biometrics, secure storage e compliance
 */

import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SecurityConfig {
  biometricsEnabled: boolean;
  encryptionEnabled: boolean;
  pinEnabled: boolean;
  pin?: string;
  lastSecurityCheck: number;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
}

const SECURITY_CONFIG_KEY = 'agentpay_security_config';
const ENCRYPTION_KEY = 'agentpay_encryption_key';

/**
 * Simple encryption/decryption (in production, use a proper crypto library)
 */
function simpleEncrypt(text: string, key: string): EncryptedData {
  // This is a simplified example. In production, use proper encryption like:
  // - TweetNaCl.js
  // - libsodium
  // - crypto-js

  const iv = Math.random().toString(36).substring(2, 15);
  const salt = Math.random().toString(36).substring(2, 15);

  // Simple XOR encryption (NOT secure, for demo only)
  let encrypted = '';
  for (let i = 0; i < text.length; i++) {
    encrypted += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }

  return {
    encrypted: Buffer.from(encrypted).toString('base64'),
    iv,
    salt,
  };
}

function simpleDecrypt(data: EncryptedData, key: string): string {
  const encrypted = Buffer.from(data.encrypted, 'base64').toString();
  let decrypted = '';

  for (let i = 0; i < encrypted.length; i++) {
    decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }

  return decrypted;
}

export class SecurityService {
  /**
   * Inizializza la configurazione di sicurezza
   */
  async initializeSecurityConfig(): Promise<SecurityConfig> {
    try {
      const stored = await AsyncStorage.getItem(SECURITY_CONFIG_KEY);

      if (stored) {
        return JSON.parse(stored);
      }

      // Crea configurazione predefinita
      const defaultConfig: SecurityConfig = {
        biometricsEnabled: false,
        encryptionEnabled: true,
        pinEnabled: false,
        lastSecurityCheck: Date.now(),
      };

      await AsyncStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(defaultConfig));
      return defaultConfig;
    } catch (error) {
      console.error('Error initializing security config:', error);
      throw error;
    }
  }

  /**
   * Abilita/disabilita biometrics
   */
  async setBiometricsEnabled(enabled: boolean): Promise<boolean> {
    try {
      if (enabled) {
        // Verifica se il dispositivo supporta biometrics
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
          throw new Error('Device does not support biometrics');
        }

        // Verifica se biometrics è configurato
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          throw new Error('No biometric data enrolled on device');
        }
      }

      const config = await this.getSecurityConfig();
      config.biometricsEnabled = enabled;
      await AsyncStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(config));

      return true;
    } catch (error) {
      console.error('Error setting biometrics:', error);
      throw error;
    }
  }

  /**
   * Autentica con biometrics
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      throw error;
    }
  }

  /**
   * Imposta un PIN
   */
  async setPIN(pin: string): Promise<boolean> {
    try {
      if (pin.length < 4 || pin.length > 8) {
        throw new Error('PIN must be between 4 and 8 digits');
      }

      if (!/^\d+$/.test(pin)) {
        throw new Error('PIN must contain only digits');
      }

      // Salva il PIN in secure storage
      await SecureStore.setItemAsync('agentpay_pin', pin);

      const config = await this.getSecurityConfig();
      config.pinEnabled = true;
      await AsyncStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(config));

      return true;
    } catch (error) {
      console.error('Error setting PIN:', error);
      throw error;
    }
  }

  /**
   * Verifica il PIN
   */
  async verifyPIN(pin: string): Promise<boolean> {
    try {
      const storedPin = await SecureStore.getItemAsync('agentpay_pin');

      if (!storedPin) {
        throw new Error('PIN not set');
      }

      return pin === storedPin;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      throw error;
    }
  }

  /**
   * Rimuove il PIN
   */
  async removePIN(): Promise<boolean> {
    try {
      await SecureStore.deleteItemAsync('agentpay_pin');

      const config = await this.getSecurityConfig();
      config.pinEnabled = false;
      await AsyncStorage.setItem(SECURITY_CONFIG_KEY, JSON.stringify(config));

      return true;
    } catch (error) {
      console.error('Error removing PIN:', error);
      throw error;
    }
  }

  /**
   * Cripta i dati sensibili
   */
  async encryptData(data: string): Promise<EncryptedData> {
    try {
      let encryptionKey = await SecureStore.getItemAsync(ENCRYPTION_KEY);

      if (!encryptionKey) {
        encryptionKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await SecureStore.setItemAsync(ENCRYPTION_KEY, encryptionKey);
      }

      return simpleEncrypt(data, encryptionKey);
    } catch (error) {
      console.error('Error encrypting data:', error);
      throw error;
    }
  }

  /**
   * Decripta i dati
   */
  async decryptData(encryptedData: EncryptedData): Promise<string> {
    try {
      const encryptionKey = await SecureStore.getItemAsync(ENCRYPTION_KEY);

      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      return simpleDecrypt(encryptedData, encryptionKey);
    } catch (error) {
      console.error('Error decrypting data:', error);
      throw error;
    }
  }

  /**
   * Salva dati sensibili in secure storage
   */
  async saveSecureData(key: string, data: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, data);
    } catch (error) {
      console.error('Error saving secure data:', error);
      throw error;
    }
  }

  /**
   * Recupera dati sensibili da secure storage
   */
  async getSecureData(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting secure data:', error);
      return null;
    }
  }

  /**
   * Elimina dati sensibili
   */
  async deleteSecureData(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error deleting secure data:', error);
      throw error;
    }
  }

  /**
   * Ottiene la configurazione di sicurezza
   */
  async getSecurityConfig(): Promise<SecurityConfig> {
    try {
      const stored = await AsyncStorage.getItem(SECURITY_CONFIG_KEY);
      if (!stored) {
        return this.initializeSecurityConfig();
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error getting security config:', error);
      throw error;
    }
  }

  /**
   * Esegue un security check
   */
  async performSecurityCheck(): Promise<{
    biometricsAvailable: boolean;
    biometricsEnrolled: boolean;
    pinSet: boolean;
    encryptionEnabled: boolean;
  }> {
    try {
      const biometricsAvailable = await LocalAuthentication.hasHardwareAsync();
      const biometricsEnrolled = await LocalAuthentication.isEnrolledAsync();
      const config = await this.getSecurityConfig();

      return {
        biometricsAvailable,
        biometricsEnrolled,
        pinSet: config.pinEnabled,
        encryptionEnabled: config.encryptionEnabled,
      };
    } catch (error) {
      console.error('Error performing security check:', error);
      throw error;
    }
  }

  /**
   * Wipe all sensitive data (logout)
   */
  async wipeAllData(): Promise<void> {
    try {
      // Elimina tutti i dati sensibili
      const keys = [
        'agentpay_pin',
        ENCRYPTION_KEY,
        'agentpay_wallet_data',
        'agentpay_session_token',
      ];

      for (const key of keys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {
          // Ignora errori se la chiave non esiste
        }
      }

      console.log('All sensitive data wiped');
    } catch (error) {
      console.error('Error wiping data:', error);
      throw error;
    }
  }
}

// Esporta un'istanza singleton
export const securityService = new SecurityService();
