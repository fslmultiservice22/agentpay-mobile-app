import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { useTelegramIntegration } from '@/hooks/use-telegram-integration';
import { useColors } from '@/hooks/use-colors';

export function TelegramSettings() {
  const colors = useColors();
  const {
    config,
    loading,
    disconnectTelegram,
    setNotificationsEnabled,
    setPriceAlertsEnabled,
    getBotUrl,
    loadConfig,
  } = useTelegramIntegration();

  const [localNotifications, setLocalNotifications] = useState(config?.notificationsEnabled ?? false);
  const [localPriceAlerts, setLocalPriceAlerts] = useState(config?.priceAlertsEnabled ?? false);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (config) {
      setLocalNotifications(config.notificationsEnabled);
      setLocalPriceAlerts(config.priceAlertsEnabled);
    }
  }, [config]);


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
        Gestisci un consenso locale separato per eventuali notifiche tecniche. Nessun dato viene inviato automaticamente.
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
                Attiva prima l’opt-in locale nelle impostazioni, quindi apri il bot solo se desideri proseguire manualmente.
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
                    <Text style={styles.rowLabel}>Notifiche tecniche</Text>
                    <Text style={styles.rowDescription}>
                      Ricevi aggiornamenti tecnici autorizzati
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
                    <Text style={styles.rowLabel}>Avvisi di stato tecnico</Text>
                    <Text style={styles.rowDescription}>
                      Ricevi aggiornamenti tecnici autorizzati
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
