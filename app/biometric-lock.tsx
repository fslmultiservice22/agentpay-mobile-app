import { useState, useEffect, useCallback, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { authenticateWithBiometrics, getBiometricEnabledStatus } from '@/lib/biometric-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

export default function BiometricLockScreen() {
  const router = useRouter();
  const colors = useColors();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'faceid' | 'iris' | null>(null);
  const authenticatingRef = useRef(false);

  const authenticate = useCallback(async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setIsAuthenticating(true);
    setError(null);

    try {
      const result = await authenticateWithBiometrics();

      if (result.success) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      } else {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAttempts((prev) => prev + 1);
        setError('Autenticazione fallita. Riprova.');
      }
    } catch {
      setError('Errore durante l\'autenticazione.');
    } finally {
      authenticatingRef.current = false;
      setIsAuthenticating(false);
    }
  }, [router]);

  const initBiometric = useCallback(async () => {
    const status = await getBiometricEnabledStatus();
    if (status.enrolled && status.available) {
      setBiometricType(status.type === 'face' ? 'faceid' : status.type === 'fingerprint' ? 'fingerprint' : null);
      // Auto-trigger on mount
      setTimeout(() => authenticate(), 500);
    } else {
      // No biometric available, skip lock
      router.replace('/(tabs)');
    }
  }, [authenticate, router]);

  useEffect(() => {
    initBiometric();
  }, [initBiometric]);

  const handleSkipBiometric = async () => {
    // Disable biometric lock for future sessions using the canonical key
    await AsyncStorage.setItem('agentpay_biometric_enabled', 'false');
    router.replace('/(tabs)');
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'faceid': return '🪪';
      case 'iris': return '👁️';
      default: return '🔏';
    }
  };

  const getBiometricLabel = () => {
    switch (biometricType) {
      case 'faceid': return 'Face ID';
      case 'iris': return 'Iris';
      default: return 'Impronta Digitale';
    }
  };

  return (
    <ScreenContainer containerClassName="flex-1" style={{ backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        {/* Logo area */}
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 24,
          backgroundColor: colors.primary + '15',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
          borderWidth: 2,
          borderColor: colors.primary + '30',
        }}>
          <MaterialIcons name="credit-card" size={48} color={colors.muted} />
        </View>

        <Text style={{ fontSize: 26, fontWeight: '800', color: colors.foreground, marginBottom: 8, textAlign: 'center' }}>AgentPay Wallet</Text>
        <Text style={{ fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 48, lineHeight: 22 }}>
          Usa {getBiometricLabel()} per sbloccare l&apos;app
        </Text>

        {/* Biometric button */}
        <TouchableOpacity
          onPress={authenticate}
          disabled={isAuthenticating}
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isAuthenticating ? colors.primary + '40' : colors.primary + '15',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2.5,
            borderColor: isAuthenticating ? colors.primary + '60' : colors.primary,
            marginBottom: 24,
          }}
        >
          {isAuthenticating ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={{ fontSize: 48 }}>{getBiometricIcon()}</Text>
          )}
        </TouchableOpacity>

        <Text style={{ fontSize: 14, color: colors.muted, marginBottom: 8 }}>
          {isAuthenticating ? 'Autenticazione in corso...' : `Tocca per usare ${getBiometricLabel()}`}
        </Text>

        {/* Error message */}
        {error && (
          <View style={{
            backgroundColor: colors.error + '15',
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 10,
            marginTop: 16,
            borderWidth: 1,
            borderColor: colors.error + '30',
          }}>
            <Text style={{ color: colors.error, fontSize: 14, textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        {/* Retry button after failed attempts */}
        {attempts > 0 && !isAuthenticating && (
          <TouchableOpacity
            onPress={authenticate}
            style={{
              marginTop: 20,
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingHorizontal: 32,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Riprova</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Skip option */}
      {attempts >= 3 && (
        <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <TouchableOpacity
            onPress={handleSkipBiometric}
            style={{
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 14 }}>
              Disabilita blocco biometrico
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}
