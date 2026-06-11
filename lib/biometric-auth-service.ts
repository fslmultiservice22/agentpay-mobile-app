/**
 * Biometric Authentication Service
 * Face ID / Fingerprint login with PIN fallback
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricCredentials {
  userId: string;
  biometricEnabled: boolean;
  pinCode?: string;
  lastAuthTime?: number;
  authAttempts: number;
  locked: boolean;
  lockUntil?: number;
}

export interface BiometricAuthResult {
  success: boolean;
  message: string;
  userId?: string;
  token?: string;
}

class BiometricAuthService {
  private credentials: Map<string, BiometricCredentials> = new Map();
  private currentSession?: { userId: string; token: string; expiresAt: number };
  private readonly CREDENTIALS_STORAGE_KEY = 'biometric_credentials';
  private readonly SESSION_STORAGE_KEY = 'biometric_session';
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCK_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.loadCredentials();
    this.loadSession();
  }

  /**
   * Enable biometric authentication
   */
  async enableBiometric(userId: string, pinCode: string): Promise<boolean> {
    try {
      let cred = this.credentials.get(userId);

      if (!cred) {
        cred = {
          userId,
          biometricEnabled: true,
          pinCode,
          authAttempts: 0,
          locked: false,
        };
      } else {
        cred.biometricEnabled = true;
        cred.pinCode = pinCode;
      }

      this.credentials.set(userId, cred);
      await this.persistCredentials();

      return true;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(userId: string): Promise<boolean> {
    try {
      const cred = this.credentials.get(userId);
      if (cred) {
        cred.biometricEnabled = false;
        await this.persistCredentials();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometric
   */
  async authenticateWithBiometric(userId: string): Promise<BiometricAuthResult> {
    try {
      const cred = this.credentials.get(userId);

      if (!cred) {
        return { success: false, message: 'User not found' };
      }

      if (cred.locked) {
        const now = Date.now();
        if (cred.lockUntil && now < cred.lockUntil) {
          const remainingTime = Math.ceil((cred.lockUntil - now) / 1000);
          return {
            success: false,
            message: `Account locked. Try again in ${remainingTime} seconds`,
          };
        } else {
          cred.locked = false;
          cred.authAttempts = 0;
          cred.lockUntil = undefined;
        }
      }

      if (!cred.biometricEnabled) {
        return { success: false, message: 'Biometric not enabled' };
      }

      // Simulate biometric authentication success
      const token = this.generateToken(userId);
      cred.lastAuthTime = Date.now();
      cred.authAttempts = 0;

      this.currentSession = {
        userId,
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      await this.persistCredentials();
      await this.persistSession();

      return {
        success: true,
        message: 'Authentication successful',
        userId,
        token,
      };
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Authenticate with PIN
   */
  async authenticateWithPIN(userId: string, pinCode: string): Promise<BiometricAuthResult> {
    try {
      const cred = this.credentials.get(userId);

      if (!cred) {
        return { success: false, message: 'User not found' };
      }

      if (cred.locked) {
        const now = Date.now();
        if (cred.lockUntil && now < cred.lockUntil) {
          const remainingTime = Math.ceil((cred.lockUntil - now) / 1000);
          return {
            success: false,
            message: `Account locked. Try again in ${remainingTime} seconds`,
          };
        } else {
          cred.locked = false;
          cred.authAttempts = 0;
          cred.lockUntil = undefined;
        }
      }

      if (cred.pinCode !== pinCode) {
        cred.authAttempts++;

        if (cred.authAttempts >= this.MAX_ATTEMPTS) {
          cred.locked = true;
          cred.lockUntil = Date.now() + this.LOCK_DURATION;
          await this.persistCredentials();

          return {
            success: false,
            message: `Too many attempts. Account locked for ${this.LOCK_DURATION / 60000} minutes`,
          };
        }

        await this.persistCredentials();

        return {
          success: false,
          message: `Invalid PIN. ${this.MAX_ATTEMPTS - cred.authAttempts} attempts remaining`,
        };
      }

      const token = this.generateToken(userId);
      cred.lastAuthTime = Date.now();
      cred.authAttempts = 0;

      this.currentSession = {
        userId,
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      await this.persistCredentials();
      await this.persistSession();

      return {
        success: true,
        message: 'Authentication successful',
        userId,
        token,
      };
    } catch (error) {
      console.error('PIN authentication failed:', error);
      return { success: false, message: 'Authentication failed' };
    }
  }

  /**
   * Verify session
   */
  verifySession(token: string): boolean {
    if (!this.currentSession) return false;

    if (Date.now() > this.currentSession.expiresAt) {
      this.currentSession = undefined;
      return false;
    }

    return this.currentSession.token === token;
  }

  /**
   * Get current session
   */
  getCurrentSession(): { userId: string; token: string } | undefined {
    if (!this.currentSession) return undefined;

    if (Date.now() > this.currentSession.expiresAt) {
      this.currentSession = undefined;
      return undefined;
    }

    return {
      userId: this.currentSession.userId,
      token: this.currentSession.token,
    };
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    this.currentSession = undefined;
    try {
      await AsyncStorage.removeItem(this.SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  /**
   * Check if biometric is enabled
   */
  isBiometricEnabled(userId: string): boolean {
    const cred = this.credentials.get(userId);
    return cred ? cred.biometricEnabled : false;
  }

  /**
   * Get last auth time
   */
  getLastAuthTime(userId: string): number | undefined {
    const cred = this.credentials.get(userId);
    return cred?.lastAuthTime;
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(userId: string): boolean {
    const cred = this.credentials.get(userId);
    if (!cred || !cred.locked) return false;

    const now = Date.now();
    if (cred.lockUntil && now >= cred.lockUntil) {
      cred.locked = false;
      cred.lockUntil = undefined;
      return false;
    }

    return true;
  }

  /**
   * Generate authentication token
   */
  private generateToken(userId: string): string {
    return `token_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Persist credentials
   */
  private async persistCredentials(): Promise<void> {
    try {
      const data = Object.fromEntries(this.credentials);
      await AsyncStorage.setItem(this.CREDENTIALS_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist credentials:', error);
    }
  }

  /**
   * Persist session
   */
  private async persistSession(): Promise<void> {
    try {
      if (this.currentSession) {
        await AsyncStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(this.currentSession));
      }
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  /**
   * Load credentials
   */
  private async loadCredentials(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.CREDENTIALS_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.credentials = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  }

  /**
   * Load session
   */
  private async loadSession(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.SESSION_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        if (Date.now() < session.expiresAt) {
          this.currentSession = session;
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }
}

export const biometricAuthService = new BiometricAuthService();
