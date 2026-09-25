import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useBiometricAuth } from '@/hooks/use-biometric-auth';

export function BiometricSettings() {
  const colors = useColors();
  const {
    availability,
    isEnabled,
    biometricType,
    transactionThreshold,
    isLoading,
    error,
    checkAvailability,
    enable,
    disable,
    setThreshold,
  } = useBiometricAuth();

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  const handleToggleBiometric = async () => {
    try {
      if (isEnabled) {
        await disable();
        Alert.alert('Success', 'Biometric authentication disabled');
      } else {
        const success = await enable();
        if (success) {
          Alert.alert('Success', 'Biometric authentication enabled');
        } else {
          Alert.alert('Error', 'Failed to enable biometric authentication');
        }
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleThresholdChange = async (value: string) => {
    try {
      await setThreshold(value);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to set threshold');
    }
  };

  const getBiometricTypeLabel = (): string => {
    if (!biometricType) return 'Unknown';
    switch (biometricType) {
      case 'faceid':
        return 'Face ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'iris':
        return 'Iris';
      default:
        return 'Biometric';
    }
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    section: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    lastRow: {
      borderBottomWidth: 0,
    },
    rowLabel: {
      fontSize: 14,
      color: colors.foreground,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: 12,
      color: colors.muted,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.primary + '20',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    disabledText: {
      color: colors.error,
    },
    infoBox: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    infoText: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
    warningBox: {
      backgroundColor: `${colors.warning}20`,
      borderLeftColor: colors.warning,
    },
    warningText: {
      color: colors.warning,
    },
    errorBox: {
      backgroundColor: `${colors.error}20`,
      borderLeftColor: colors.error,
    },
    errorText: {
      color: colors.error,
    },
    thresholdInput: {
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 10,
      color: colors.foreground,
      fontSize: 14,
      borderWidth: 1,
      borderColor: colors.border,
      flex: 1,
      marginRight: 8,
    },
    thresholdUnit: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </View>
    );
  }

  if (!availability.available) {
    return (
      <View style={styles.container}>
        <View style={[styles.infoBox, styles.warningBox]}>
          <Text style={[styles.infoText, styles.warningText]}>
            ⚠️ Biometric authentication is not available on this device
          </Text>
        </View>
      </View>
    );
  }

  if (!availability.enrolled) {
    return (
      <View style={styles.container}>
        <View style={[styles.infoBox, styles.warningBox]}>
          <Text style={[styles.infoText, styles.warningText]}>
            ⚠️ No biometric data enrolled. Please set up Face ID or fingerprint in your device settings.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Availability Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Biometric Authentication</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Available Methods</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {availability.types.map((type) => (
              <View key={type} style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {type === 'faceid' ? '👤' : type === 'fingerprint' ? '👆' : '👁️'} {type}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.row, styles.lastRow]}>
          <Text style={styles.rowLabel}>Enable Biometric Auth</Text>
          <Switch
            value={isEnabled}
            onValueChange={handleToggleBiometric}
            disabled={isLoading}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isEnabled ? colors.background : colors.muted}
          />
        </View>
      </View>

      {/* Status Section */}
      {isEnabled && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Settings</Text>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Authentication Method</Text>
              <Text style={styles.rowValue}>{getBiometricTypeLabel()}</Text>
            </View>

            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.rowLabel}>Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✓ Active</Text>
              </View>
            </View>
          </View>

          {/* Transaction Threshold Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Security</Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Transactions above this amount will require biometric authentication for confirmation.
              </Text>
            </View>

            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.rowLabel}>Threshold Amount</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={styles.thresholdInput}
                  value={transactionThreshold}
                  onChangeText={handleThresholdChange}
                  keyboardType="decimal-pad"
                  placeholder="0.1"
                />
                <Text style={styles.thresholdUnit}>ETH</Text>
              </View>
            </View>
          </View>

          {/* Security Info */}
          <View style={styles.section}>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                🔒 Your biometric data is stored securely on your device and never shared with our servers.
              </Text>
            </View>
          </View>
        </>
      )}

      {/* Error Message */}
      {error && (
        <View style={[styles.infoBox, styles.errorBox]}>
          <Text style={[styles.infoText, styles.errorText]}>Error: {error}</Text>
        </View>
      )}
    </View>
  );
}
