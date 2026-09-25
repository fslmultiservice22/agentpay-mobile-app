import { View, Text, TouchableOpacity, ActivityIndicator , Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useColors } from '@/hooks/use-colors';
import { authenticateWithBiometrics, getBiometricEnabledStatus } from '@/lib/biometric-auth';
import * as Haptics from 'expo-haptics';

interface BiometricLockScreenProps {
  onUnlocked: () => void;
}

export function BiometricLockScreen({ onUnlocked }: BiometricLockScreenProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'none'>('none');

  const handleAuthenticate = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await authenticateWithBiometrics();
    setLoading(false);
    if (result.success) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlocked();
    } else if (result.error && result.error !== 'Autenticazione annullata') {
      setError(result.error);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [onUnlocked]);

  useEffect(() => {
    getBiometricEnabledStatus().then((s) => setBiometricType(s.type));
    // Auto-trigger on mount
    handleAuthenticate();
  }, [handleAuthenticate]);

  const icon = biometricType === 'face' ? '🔒' : biometricType === 'fingerprint' ? '👆' : '🔐';
  const label = biometricType === 'face' ? 'Face ID' : biometricType === 'fingerprint' ? 'Impronta digitale' : 'Biometria';

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    }}>
      {/* Logo */}
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
      }}>
        <Text style={{ fontSize: 40 }}>💳</Text>
      </View>

      <Text style={{ fontSize: 26, fontWeight: '800', color: colors.foreground, marginBottom: 8 }}>
        AgentPay Wallet
      </Text>
      <Text style={{ fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 48 }}>
        Sblocca l&apos;app per continuare
      </Text>

      {/* Biometric button */}
      <TouchableOpacity
        onPress={handleAuthenticate}
        disabled={loading}
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: loading ? colors.border : colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : (
          <Text style={{ fontSize: 44 }}>{icon}</Text>
        )}
      </TouchableOpacity>

      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 }}>
        {loading ? 'Autenticazione...' : `Usa ${label}`}
      </Text>

      {error && (
        <Text style={{ fontSize: 13, color: colors.error, textAlign: 'center', marginTop: 8, marginBottom: 16 }}>
          {error}
        </Text>
      )}

      {!loading && (
        <TouchableOpacity onPress={handleAuthenticate} style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 14, color: colors.muted }}>Riprova</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
