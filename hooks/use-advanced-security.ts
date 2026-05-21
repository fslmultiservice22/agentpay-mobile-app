import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  deviceFingerprintingEnabled: boolean;
  fraudDetectionEnabled: boolean;
  sessionTimeout: number; // minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // minutes
}

export interface DeviceFingerprint {
  id: string;
  deviceId: string;
  deviceName: string;
  osVersion: string;
  appVersion: string;
  createdAt: number;
  lastUsedAt: number;
  trusted: boolean;
}

export interface LoginAttempt {
  timestamp: number;
  success: boolean;
  ipAddress?: string;
  deviceId?: string;
  reason?: string;
}

export interface FraudAlert {
  id: string;
  type: 'unusual_location' | 'unusual_time' | 'unusual_amount' | 'new_device';
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: number;
  resolved: boolean;
}

export function useAdvancedSecurity() {
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorEnabled: true,
    biometricEnabled: true,
    deviceFingerprintingEnabled: true,
    fraudDetectionEnabled: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
  });

  const [devices, setDevices] = useState<DeviceFingerprint[]>([]);
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  // Load security settings
  const loadSettings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_security_settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  }, []);

  // Save security settings
  const saveSettings = useCallback(async (newSettings: SecuritySettings) => {
    try {
      await AsyncStorage.setItem('agentpay_security_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save security settings:', error);
    }
  }, []);

  // Register device
  const registerDevice = useCallback(async (deviceInfo: Partial<DeviceFingerprint>) => {
    try {
      const device: DeviceFingerprint = {
        id: `device_${Date.now()}`,
        deviceId: deviceInfo.deviceId || 'unknown',
        deviceName: deviceInfo.deviceName || 'Unknown Device',
        osVersion: deviceInfo.osVersion || 'unknown',
        appVersion: deviceInfo.appVersion || '1.0.0',
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        trusted: false,
      };

      const updated = [...devices, device];
      setDevices(updated);
      await AsyncStorage.setItem('agentpay_devices', JSON.stringify(updated));

      return device;
    } catch (error) {
      console.error('Failed to register device:', error);
      return null;
    }
  }, [devices]);

  // Trust device
  const trustDevice = useCallback(
    async (deviceId: string) => {
      try {
        const updated = devices.map((d) =>
          d.id === deviceId ? { ...d, trusted: true } : d
        );
        setDevices(updated);
        await AsyncStorage.setItem('agentpay_devices', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to trust device:', error);
      }
    },
    [devices]
  );

  // Record login attempt
  const recordLoginAttempt = useCallback(
    async (success: boolean, reason?: string) => {
      try {
        const attempt: LoginAttempt = {
          timestamp: Date.now(),
          success,
          reason,
        };

        const updated = [...loginAttempts, attempt];
        setLoginAttempts(updated);

        // Check for lockout
        const recentFailures = updated
          .filter((a) => !a.success && a.timestamp > Date.now() - 15 * 60 * 1000)
          .length;

        if (recentFailures >= settings.maxLoginAttempts) {
          setIsLocked(true);
          setLockoutTime(Date.now() + settings.lockoutDuration * 60 * 1000);

          // Create fraud alert
          const alert: FraudAlert = {
            id: `alert_${Date.now()}`,
            type: 'unusual_time',
            severity: 'high',
            description: 'Multiple failed login attempts detected',
            timestamp: Date.now(),
            resolved: false,
          };
          setFraudAlerts((prev) => [...prev, alert]);
        }

        await AsyncStorage.setItem('agentpay_login_attempts', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to record login attempt:', error);
      }
    },
    [loginAttempts, settings]
  );

  // Check if account is locked
  const checkLockout = useCallback(() => {
    if (!isLocked || !lockoutTime) return false;

    if (Date.now() > lockoutTime) {
      setIsLocked(false);
      setLockoutTime(null);
      return false;
    }

    return true;
  }, [isLocked, lockoutTime]);

  // Detect fraud
  const detectFraud = useCallback(
    async (
      location?: string,
      amount?: number,
      deviceId?: string
    ): Promise<FraudAlert | null> => {
      try {
        if (!settings.fraudDetectionEnabled) return null;

        // Check for unusual patterns
        let fraudType: FraudAlert['type'] | null = null;
        let severity: FraudAlert['severity'] = 'low';

        if (amount && amount > 50000) {
          fraudType = 'unusual_amount';
          severity = 'high';
        }

        if (deviceId) {
          const device = devices.find((d) => d.id === deviceId);
          if (device && !device.trusted) {
            fraudType = 'new_device';
            severity = 'medium';
          }
        }

        if (fraudType) {
          const alert: FraudAlert = {
            id: `alert_${Date.now()}`,
            type: fraudType,
            severity,
            description: `Fraud detection: ${fraudType}`,
            timestamp: Date.now(),
            resolved: false,
          };

          setFraudAlerts((prev) => [...prev, alert]);
          return alert;
        }

        return null;
      } catch (error) {
        console.error('Failed to detect fraud:', error);
        return null;
      }
    },
    [settings, devices]
  );

  // Resolve fraud alert
  const resolveFraudAlert = useCallback(
    async (alertId: string) => {
      try {
        const updated = fraudAlerts.map((a) =>
          a.id === alertId ? { ...a, resolved: true } : a
        );
        setFraudAlerts(updated);
        await AsyncStorage.setItem('agentpay_fraud_alerts', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to resolve fraud alert:', error);
      }
    },
    [fraudAlerts]
  );

  // Get security score
  const getSecurityScore = useCallback(() => {
    let score = 50; // Base score

    if (settings.twoFactorEnabled) score += 20;
    if (settings.biometricEnabled) score += 15;
    if (settings.deviceFingerprintingEnabled) score += 10;
    if (settings.fraudDetectionEnabled) score += 5;

    return Math.min(score, 100);
  }, [settings]);

  // Initialize on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    devices,
    loginAttempts,
    fraudAlerts,
    isLocked,
    saveSettings,
    registerDevice,
    trustDevice,
    recordLoginAttempt,
    checkLockout,
    detectFraud,
    resolveFraudAlert,
    getSecurityScore,
  };
}
