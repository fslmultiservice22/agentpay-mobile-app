import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Switch, Linking, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useTelegramIntegration } from '@/hooks/use-telegram-integration';

export default function TelegramScreen() {
  const colors = useColors();
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
      // Apri il bot Telegram
      Linking.openURL(getBotUrl());
      // Dopo che l'utente ha avviato il bot, salva la configurazione
      setTimeout(async () => {
        const chatId = 123456789; // In produzione, questo dovrebbe venire da Telegram
        await connectTelegram(chatId);
      }, 1000);
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

  return (
    <ScreenContainer className="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground mb-2">📱 Telegram Bot</Text>
          <Text className="text-base text-muted">
            Ricevi notifiche in tempo reale su Telegram per transazioni, swap e alert di prezzo.
          </Text>
        </View>

        {loading && (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        )}

        {!loading && (
          <>
            {/* Connection Status Card */}
            <View
              className="bg-surface rounded-2xl p-6 mb-6 border"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-lg font-semibold text-foreground mb-4">Stato Connessione</Text>

              {config?.isConnected ? (
                <>
                  <View className="flex-row items-center mb-4">
                    <Text className="text-2xl mr-3">✅</Text>
                    <View>
                      <Text className="text-base font-semibold text-success">Connesso</Text>
                      <Text className="text-sm text-muted">Chat ID: {config.chatId}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View className="flex-row items-center mb-4">
                  <Text className="text-2xl mr-3">❌</Text>
                  <Text className="text-base font-semibold text-muted">Non Connesso</Text>
                </View>
              )}
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

            {/* Bot Commands */}
            <View
              className="bg-surface rounded-2xl p-6 mb-6 border"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-lg font-semibold text-foreground mb-4">Comandi Bot</Text>

              <View className="space-y-3">
                <View className="flex-row items-start mb-3">
                  <Text className="text-base font-mono text-primary mr-3">/start</Text>
                  <Text className="text-sm text-muted flex-1">Menu principale</Text>
                </View>

                <View className="flex-row items-start mb-3">
                  <Text className="text-base font-mono text-primary mr-3">/balance</Text>
                  <Text className="text-sm text-muted flex-1">Visualizza saldo wallet</Text>
                </View>

                <View className="flex-row items-start mb-3">
                  <Text className="text-base font-mono text-primary mr-3">/history</Text>
                  <Text className="text-sm text-muted flex-1">Cronologia transazioni</Text>
                </View>

                <View className="flex-row items-start mb-3">
                  <Text className="text-base font-mono text-primary mr-3">/swap</Text>
                  <Text className="text-sm text-muted flex-1">Effettua uno swap</Text>
                </View>

                <View className="flex-row items-start mb-3">
                  <Text className="text-base font-mono text-primary mr-3">/transfer</Text>
                  <Text className="text-sm text-muted flex-1">Trasferimento bancario</Text>
                </View>

                <View className="flex-row items-start mb-3">
                  <Text className="text-base font-mono text-primary mr-3">/settings</Text>
                  <Text className="text-sm text-muted flex-1">Impostazioni bot</Text>
                </View>

                <View className="flex-row items-start">
                  <Text className="text-base font-mono text-primary mr-3">/help</Text>
                  <Text className="text-sm text-muted flex-1">Aiuto e supporto</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View className="gap-3 mb-6">
              {!config?.isConnected ? (
                <TouchableOpacity
                  className="bg-primary rounded-xl py-4 items-center"
                  onPress={handleConnectTelegram}
                >
                  <Text className="text-base font-semibold text-background">
                    🔗 Collega Telegram Bot
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    className="bg-primary rounded-xl py-4 items-center"
                    onPress={handleOpenBot}
                  >
                    <Text className="text-base font-semibold text-background">
                      💬 Apri Chat Telegram
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="border rounded-xl py-4 items-center"
                    style={{ borderColor: colors.error }}
                    onPress={handleDisconnectTelegram}
                  >
                    <Text className="text-base font-semibold" style={{ color: colors.error }}>
                      🔌 Disconnetti Telegram
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
                  <Text className="text-sm font-semibold text-success">✅ Attivo</Text>
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
