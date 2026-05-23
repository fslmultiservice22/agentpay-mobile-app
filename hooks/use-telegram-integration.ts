import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TelegramConfig {
  chatId: number;
  username: string;
  isConnected: boolean;
  notificationsEnabled: boolean;
  priceAlertsEnabled: boolean;
}

const TELEGRAM_CONFIG_KEY = 'agentpay_telegram_config';
const TELEGRAM_BOT_USERNAME = 'tradingT23_bot';

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
        setConfig(parsedConfig);
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
   * Collega il bot Telegram
   */
  const connectTelegram = useCallback(async (chatId: number) => {
    setLoading(true);
    setError(null);

    try {
      const newConfig: TelegramConfig = {
        chatId,
        username: TELEGRAM_BOT_USERNAME,
        isConnected: true,
        notificationsEnabled: true,
        priceAlertsEnabled: false,
      };

      await saveConfig(newConfig);

      // Invia un messaggio di benvenuto
      await fetch('/api/telegram/send/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          walletData: {
            totalValue: 0,
            totalChangePercent: 0,
            assets: [],
          },
        }),
      });

      return newConfig;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Telegram';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [saveConfig]);

  /**
   * Disconnette il bot Telegram
   */
  const disconnectTelegram = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(TELEGRAM_CONFIG_KEY);
      setConfig(null);
    } catch (err) {
      console.error('Error disconnecting Telegram:', err);
      throw err;
    }
  }, []);

  /**
   * Abilita/disabilita le notifiche
   */
  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!config) return;

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
      if (!config) return;

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
      if (!config || !config.isConnected || !config.notificationsEnabled) {
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
      if (!config || !config.isConnected || !config.priceAlertsEnabled) {
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
  };
}
