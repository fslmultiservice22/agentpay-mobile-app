import { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Switch, Linking, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useTelegramIntegration } from '@/hooks/use-telegram-integration';

export default function TelegramScreen() {
  const colors = useColors();
  const {
    config,
    loading,
    enableTelegramOptIn,
    disconnectTelegram,
    setNotificationsEnabled,
    setPriceAlertsEnabled,
    getBotUrl,
    loadConfig,
  } = useTelegramIntegration();

  const [localNotifications, setLocalNotifications] = useState(config?.notificationsEnabled ?? false);
  const [localPriceAlerts, setLocalPriceAlerts] = useState(config?.priceAlertsEnabled ?? false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (config) {
      setLocalNotifications(config.notificationsEnabled);
      setLocalPriceAlerts(config.priceAlertsEnabled);
    }
  }, [config]);

  const handleEnableTelegramOptIn = async () => {
    try {
      await enableTelegramOptIn();
      setStatusMessage('Opt-in locale attivato. Nessun collegamento o invio automatico è stato eseguito.');
    } catch (error) {
      setStatusMessage('Non è stato possibile salvare l’opt-in locale. Riprova.');
      console.error('Error enabling Telegram opt-in:', error);
    }
  };

  const handleDisconnectTelegram = async () => {
    try {
      await disconnectTelegram();
      setStatusMessage('Opt-in Telegram revocato.');
    } catch (error) {
      setStatusMessage('Non è stato possibile revocare l’opt-in. Riprova.');
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

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">📱 Telegram Bot</Text>
          <Text className="text-base text-muted">
            Telegram è separato dal flusso principale. L’attivazione è locale e non invia dati automaticamente.
          </Text>
        </View>

        {loading && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {!loading && (
          <>
            {statusMessage ? (
              <View accessibilityLiveRegion="polite" className="bg-surface rounded-xl p-4 mb-6 border" style={{ borderColor: colors.primary }}>
                <Text className="text-sm text-foreground">{statusMessage}</Text>
              </View>
            ) : null}

            {!config?.optInGranted ? (
              <View accessibilityLiveRegion="polite" className="bg-surface rounded-xl p-4 mb-6 border" style={{ borderColor: colors.warning }}>
                <Text className="text-sm font-semibold text-foreground">Opt-in richiesto per le funzioni Telegram</Text>
                <Text className="text-sm text-muted mt-1">Attiva l’opt-in locale prima di usare notifiche o alert. Il consenso non collega il provider e non invia dati.</Text>
              </View>
            ) : null}

            {/* Connection Status Card */}
            <View
              className="bg-surface rounded-2xl p-6 mb-6 border"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-lg font-semibold text-foreground mb-4">Stato Connessione</Text>

              <View className="flex-row items-center mb-4">
                <Text className="text-2xl mr-3">{config?.optInGranted ? '🟡' : '⚪'}</Text>
                <View>
                  <Text className="text-base font-semibold" style={{ color: config?.optInGranted ? colors.warning : colors.muted }}>
                    {config?.optInGranted ? 'Opt-in locale attivo' : 'Provider separato'}
                  </Text>
                  <Text className="text-sm text-muted">
                    Nessun collegamento o invio automatico
                  </Text>
                </View>
              </View>
            </View>

            {/* Notifications Settings */}
            {config?.isConnected && (
              <View
                className="bg-surface rounded-2xl p-6 mb-6 border"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-lg font-semibold text-foreground mb-4">Notifiche</Text>

                {/* Transaction Notifications */}
                <View className="flex-row items-center justify-between mb-6 pb-6 border-b" style={{ borderColor: colors.border }}>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-foreground">Notifiche Transazioni</Text>
                    <Text className="text-sm text-muted mt-1">
                      Ricevi notifiche per swap e trasferimenti
                    </Text>
                  </View>
                  <Switch
                    value={localNotifications}
                    onValueChange={handleNotificationsToggle}
                    trackColor={{ false: colors.border, true: colors.primary }}
                  />
                </View>

                {/* Price Alerts */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-medium text-foreground">Alert di Prezzo</Text>
                    <Text className="text-sm text-muted mt-1">
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
            )}

            {/* Action Buttons */}
            <View className="gap-3 mb-6">
              {!config?.optInGranted ? (
                <TouchableOpacity
                  className="bg-primary rounded-xl py-4 items-center"
                  onPress={handleEnableTelegramOptIn}
                >
                  <Text className="text-base font-semibold text-background">
                    Attiva opt-in locale e apri Telegram
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    className="bg-primary rounded-xl py-4 items-center"
                    onPress={handleOpenBot}
                  >
                    <Text className="text-base font-semibold text-background">
                      Apri Telegram (senza collegamento automatico)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="border rounded-xl py-4 items-center"
                    style={{ borderColor: colors.error }}
                    onPress={handleDisconnectTelegram}
                  >
                    <Text className="text-base font-semibold" style={{ color: colors.error }}>
                      Revoca opt-in Telegram
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Bot Info */}
            <View
              className="bg-surface rounded-2xl p-6 border"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-lg font-semibold text-foreground mb-4">Info Bot</Text>

              <View className="space-y-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted">Bot Username</Text>
                  <Text className="text-sm font-mono text-foreground">@tradingT23_bot</Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted">Stato</Text>
                  <Text className="text-sm font-semibold text-warning">Separato / non attivo</Text>
                </View>

                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-muted">Versione</Text>
                  <Text className="text-sm font-mono text-foreground">1.0.0</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
