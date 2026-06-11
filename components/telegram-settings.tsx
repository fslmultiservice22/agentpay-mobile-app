import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { useTelegramIntegration } from '@/hooks/use-telegram-integration';
import { useColors } from '@/hooks/use-colors';
import { useI18n } from '@/hooks/use-i18n';

export function TelegramSettings() {
  const colors = useColors();
  const { t } = useI18n();
  const {
    config,
    loading,
    connectTelegram,
    disconnectTelegram,
    setNotificationsEnabled,
    setPriceAlertsEnabled,
    getBotUrl,
    loadConfig,
  } = useTelegramIntegration();

  const [localNotifications, setLocalNotifications] = useState(config?.notificationsEnabled ?? false);
  const [localPriceAlerts, setLocalPriceAlerts] = useState(config?.priceAlertsEnabled ?? false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      setLocalNotifications(config.notificationsEnabled);
      setLocalPriceAlerts(config.priceAlertsEnabled);
    }
  }, [config]);

  const handleConnectTelegram = async () => {
    try {
      // In produzione, questo dovrebbe ottenere il chatId dall'utente
      // Per ora, usiamo un placeholder
      const chatId = 123456789; // Questo dovrebbe venire da Telegram
      await connectTelegram(chatId);
    } catch (error) {
      console.error('Error connecting Telegram:', error);
    }
  };

  const handleDisconnectTelegram = async () => {
    try {
      await disconnectTelegram();
    } catch (error) {
      console.error('Error disconnecting Telegram:', error);
    }
  };

  const handleOpenBot = () => {
    Linking.openURL(getBotUrl());
  };

  const handleNotificationsToggle = async (value: boolean) => {
    setLocalNotifications(value);
    await setNotificationsEnabled(value);
  };

  const handlePriceAlertsToggle = async (value: boolean) => {
    setLocalPriceAlerts(value);
    await setPriceAlertsEnabled(value);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.foreground,
      marginLeft: 12,
    },
    description: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 16,
      lineHeight: 20,
    },
    section: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.foreground,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    rowLabel: {
      fontSize: 14,
      color: colors.foreground,
    },
    rowDescription: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 4,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: colors.background,
    },
    secondaryButtonText: {
      color: colors.foreground,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.success,
      marginTop: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.background,
      marginLeft: 6,
    },
    errorText: {
      fontSize: 12,
      color: colors.error,
      marginTop: 8,
    },
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 20,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={{ fontSize: 24 }}>📱</Text>
        <Text style={styles.title}>Telegram Integration</Text>
      </View>

      <Text style={styles.description}>
        Ricevi notifiche in tempo reale su Telegram per transazioni, swap e alert di prezzo.
      </Text>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      )}

      {!loading && (
        <>
          {/* Connection Status */}
          {config?.isConnected ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stato Connessione</Text>
              <View style={styles.statusBadge}>
                <Text>✅</Text>
                <Text style={styles.statusText}>Connesso</Text>
              </View>
              <Text style={styles.rowDescription}>
                Chat ID: {config.chatId}
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connessione Telegram</Text>
              <Text style={styles.description}>
                Clicca il pulsante qui sotto per aprire il bot Telegram e collegare il tuo account.
              </Text>
            </View>
          )}

          {/* Notifications Settings */}
          {config?.isConnected && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notifiche</Text>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>Notifiche Transazioni</Text>
                    <Text style={styles.rowDescription}>
                      Ricevi notifiche per swap e trasferimenti
                    </Text>
                  </View>
                  <Switch
                    value={localNotifications}
                    onValueChange={handleNotificationsToggle}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowLabel}>Alert di Prezzo</Text>
                    <Text style={styles.rowDescription}>
                      Ricevi notifiche per variazioni di prezzo
                    </Text>
                  </View>
                  <Switch
                    value={localPriceAlerts}
                    onValueChange={handlePriceAlertsToggle}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View>
            {!config?.isConnected ? (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleOpenBot}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  Apri Bot Telegram
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleOpenBot}
                >
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                    Apri Chat Telegram
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleDisconnectTelegram}
                >
                  <Text style={[styles.buttonText, { color: colors.error }]}>
                    Disconnetti Telegram
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}
