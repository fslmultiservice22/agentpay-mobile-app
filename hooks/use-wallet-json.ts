import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  parseWalletJSON,
  extractBlockchains,
  extractTokens,
  extractContacts,
  extractSettings,
  createWalletJSON,
  exportWalletJSON,
  type WalletJSON,
  type BlockchainConfig,
  type TokenConfig,
  type ContactConfig,
  type WalletSettings,
} from '@/lib/wallet-json-parser';

const WALLET_CONFIG_KEY = 'agentpay_wallet_config';

export interface WalletConfig {
  blockchains: BlockchainConfig[];
  tokens: TokenConfig[];
  contacts: ContactConfig[];
  settings: WalletSettings;
  walletAddress?: string;
  lastImportedAt?: number;
}

/**
 * Hook for managing wallet JSON import/export
 */
export function useWalletJSON() {
  const [config, setConfig] = useState<WalletConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load wallet config from storage
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(WALLET_CONFIG_KEY);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet config');
    } finally {
      setLoading(false);
    }
  }, []);

  // Save wallet config to storage
  const saveConfig = useCallback(async (newConfig: WalletConfig) => {
    try {
      setLoading(true);
      await AsyncStorage.setItem(WALLET_CONFIG_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save wallet config');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Import wallet JSON
  const importJSON = useCallback(
    async (jsonString: string, walletAddress?: string) => {
      try {
        setLoading(true);
        setError(null);

        // Parse and validate JSON
        const result = parseWalletJSON(jsonString);
        if (!result.isValid || !result.data) {
          setError(result.errors.join(', '));
          return { success: false, errors: result.errors };
        }

        // Extract data from JSON
        const blockchains = extractBlockchains(result.data);
        const tokens = extractTokens(result.data);
        const contacts = extractContacts(result.data);
        const settings = extractSettings(result.data);

        // Create new config
        const newConfig: WalletConfig = {
          blockchains,
          tokens,
          contacts,
          settings,
          walletAddress: walletAddress || result.data.walletAddress,
          lastImportedAt: Date.now(),
        };

        // Save config
        await saveConfig(newConfig);

        return {
          success: true,
          config: newConfig,
          warnings: result.warnings,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to import wallet JSON';
        setError(errorMsg);
        return { success: false, errors: [errorMsg] };
      } finally {
        setLoading(false);
      }
    },
    [saveConfig]
  );

  // Export wallet JSON
  const exportJSON = useCallback(() => {
    try {
      if (!config) {
        throw new Error('No wallet config to export');
      }

      const walletJSON = createWalletJSON(
        config.blockchains,
        config.tokens,
        config.contacts,
        config.settings,
        config.walletAddress
      );

      return {
        success: true,
        json: exportWalletJSON(walletJSON),
        data: walletJSON,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to export wallet JSON';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [config]);

  // Add blockchain
  const addBlockchain = useCallback(
    async (blockchain: BlockchainConfig) => {
      if (!config) return false;

      const updated = {
        ...config,
        blockchains: [...config.blockchains, blockchain],
      };

      return saveConfig(updated);
    },
    [config, saveConfig]
  );

  // Add token
  const addToken = useCallback(
    async (token: TokenConfig) => {
      if (!config) return false;

      const updated = {
        ...config,
        tokens: [...config.tokens, token],
      };

      return saveConfig(updated);
    },
    [config, saveConfig]
  );

  // Add contact
  const addContact = useCallback(
    async (contact: ContactConfig) => {
      if (!config) return false;

      const updated = {
        ...config,
        contacts: [...config.contacts, contact],
      };

      return saveConfig(updated);
    },
    [config, saveConfig]
  );

  // Update settings
  const updateSettings = useCallback(
    async (newSettings: Partial<WalletSettings>) => {
      if (!config) return false;

      const updated = {
        ...config,
        settings: { ...config.settings, ...newSettings },
      };

      return saveConfig(updated);
    },
    [config, saveConfig]
  );

  // Clear config
  const clearConfig = useCallback(async () => {
    try {
      setLoading(true);
      await AsyncStorage.removeItem(WALLET_CONFIG_KEY);
      setConfig(null);
      setError(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear wallet config');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    config,
    loading,
    error,
    loadConfig,
    saveConfig,
    importJSON,
    exportJSON,
    addBlockchain,
    addToken,
    addContact,
    updateSettings,
    clearConfig,
  };
}
