import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  grantIntegrationOptIn,
  isIntegrationOptedIn,
  revokeIntegrationOptIn,
} from '@/lib/integration-opt-in';

export interface TelegramConfig {
  chatId: number;
  username: string;
  isConnected: boolean;
  optInGranted: boolean;
  notificationsEnabled: boolean;
  priceAlertsEnabled: boolean;
}

const TELEGRAM_CONFIG_KEY = 'agentpay_telegram_config';
const TELEGRAM_BOT_USERNAME = 'tradingT23_bot';

function telegramOptInState(config: TelegramConfig | null) {
  return { telegram: config?.optInGranted === true, wallester: false };
}

/**
 * Hook per gestire l'integrazione Telegram
 */
export function useTelegramIntegration() {
  const [config, setConfig] = useState<TelegramConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carica la configurazione Telegram dal storage
   */
  const loadConfig = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(TELEGRAM_CONFIG_KEY);
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        setConfig({
          ...parsedConfig,
          optInGranted: isIntegrationOptedIn(parsedConfig, 'telegram'),
          isConnected:
            isIntegrationOptedIn(parsedConfig, 'telegram') && parsedConfig.isConnected === true,
        });
      }
    } catch (err) {
      console.error('Error loading Telegram config:', err);
    }
  }, []);

  /**
   * Salva la configurazione Telegram nel storage
   */
  const saveConfig = useCallback(async (newConfig: TelegramConfig) => {
    try {
      await AsyncStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (err) {
      console.error('Error saving Telegram config:', err);
      throw err;
    }
  }, []);

  /**
   * Concede soltanto l’opt-in locale. Non abilita rete o provider.
   */
  const enableTelegramOptIn = useCallback(async () => {
    const nextState = grantIntegrationOptIn(telegramOptInState(config), 'telegram');
    await AsyncStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify({
      ...(config ?? {}),
      optInGranted: nextState.telegram,
      isConnected: false,
      notificationsEnabled: false,
      priceAlertsEnabled: false,
    }));
    setConfig({
      chatId: 0,
      username: TELEGRAM_BOT_USERNAME,
      optInGranted: nextState.telegram,
      isConnected: false,
      notificationsEnabled: false,
      priceAlertsEnabled: false,
    });
  }, [config]);

  /**
   * Collega il bot Telegram solo dopo un opt-in esplicito.
   */
  const connectTelegram = useCallback(async (chatId: number) => {
    if (!isIntegrationOptedIn(telegramOptInState(config), 'telegram')) {
      throw new Error('Telegram opt-in required before connecting');
    }
    if (!Number.isSafeInteger(chatId) || chatId === 0) {
      throw new Error('A verified Telegram chat ID is required');
    }
    setLoading(true);
    setError(null);

    try {
      const newConfig: TelegramConfig = {
        chatId,
        username: TELEGRAM_BOT_USERNAME,
        isConnected: true,
        optInGranted: true,
        notificationsEnabled: false,
        priceAlertsEnabled: false,
      };

      await saveConfig(newConfig);

      return newConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Telegram';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [config, saveConfig]);

  /**
   * Disconnette il bot Telegram
   */
  const disconnectTelegram = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TELEGRAM_CONFIG_KEY);
      revokeIntegrationOptIn(telegramOptInState(config), 'telegram');
      setConfig(null);
    } catch (err) {
      console.error('Error disconnecting Telegram:', err);
      throw err;
    }
  }, [config]);

  /**
   * Abilita/disabilita le notifiche
   */
  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!config || !config.optInGranted) return;

      const updatedConfig = { ...config, notificationsEnabled: enabled };
      await saveConfig(updatedConfig);
    },
    [config, saveConfig]
  );

  /**
   * Abilita/disabilita gli alert di prezzo
   */
  const setPriceAlertsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!config || !config.optInGranted) return;

      const updatedConfig = { ...config, priceAlertsEnabled: enabled };
      await saveConfig(updatedConfig);
    },
    [config, saveConfig]
  );

  /**
   * Invia una notifica di transazione
   */
  const sendTransactionNotification = useCallback(
    async (type: 'swap' | 'transfer' | 'deposit', data: any) => {
      if (!config || !config.optInGranted || !config.isConnected || !config.notificationsEnabled) {
        return;
      }

      try {
        await fetch('/api/telegram/notify/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: config.chatId,
            type,
            data,
          }),
        });
      } catch (err) {
        console.error('Error sending transaction notification:', err);
      }
    },
    [config]
  );

  /**
   * Invia un alert di prezzo
   */
  const sendPriceAlert = useCallback(
    async (token: string, price: number, change: number) => {
      if (!config || !config.optInGranted || !config.isConnected || !config.priceAlertsEnabled) {
        return;
      }

      try {
        await fetch('/api/telegram/notify/price-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: config.chatId,
            token,
            price,
            change,
          }),
        });
      } catch (err) {
        console.error('Error sending price alert:', err);
      }
    },
    [config]
  );

  /**
   * Ottiene l'URL del bot Telegram
   */
  const getBotUrl = useCallback(() => {
    return `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  }, []);

  return {
    config,
    loading,
    error,
    loadConfig,
    connectTelegram,
    disconnectTelegram,
    setNotificationsEnabled,
    setPriceAlertsEnabled,
    sendTransactionNotification,
    sendPriceAlert,
    getBotUrl,
    enableTelegramOptIn,
  };
}
