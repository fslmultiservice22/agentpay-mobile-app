import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { walletSeedPhraseService, type SeedPhraseBackup, type RecoveryCode, type SeedPhraseValidation } from '@/lib/wallet-seed-phrase-service';

const STORAGE_KEY = 'agentpay_seed_phrase_backups';

interface UseWalletSeedPhraseState {
  backups: SeedPhraseBackup[];
  currentBackup: SeedPhraseBackup | null;
  loading: boolean;
  error: string | null;
}

export function useWalletSeedPhrase() {
  const [state, setState] = useState<UseWalletSeedPhraseState>({
    backups: [],
    currentBackup: null,
    loading: true,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Load backups from storage
  const loadBackups = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const backups: SeedPhraseBackup[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          backups,
          loading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load backups';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    }
  }, []);

  // Load backups on mount
  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  // Save backups to storage
  const saveBackups = useCallback(async (backups: SeedPhraseBackup[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(backups));
    } catch (err) {
      console.error('Failed to save backups:', err);
    }
  }, []);

  // Generate a new seed phrase
  const generateSeedPhrase = useCallback(async (wordCount: 12 | 24 = 12): Promise<string> => {
    try {
      return await walletSeedPhraseService.generateSeedPhrase(wordCount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate seed phrase';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
      }
      throw err;
    }
  }, []);

  // Validate seed phrase
  const validateSeedPhrase = useCallback((seedPhrase: string): SeedPhraseValidation => {
    return walletSeedPhraseService.validateSeedPhrase(seedPhrase);
  }, []);

  // Create a backup
  const createBackup = useCallback(
    async (seedPhrase: string, password: string, walletAddress: string, walletName: string, backupMethod: 'manual' | 'cloud' | 'local' = 'local') => {
      try {
        const backup = await walletSeedPhraseService.createBackup(seedPhrase, password, walletAddress, walletName, backupMethod);

        const updatedBackups = [...state.backups, backup];
        await saveBackups(updatedBackups);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            backups: updatedBackups,
            currentBackup: backup,
          }));
        }

        return backup;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create backup';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.backups, saveBackups]
  );

  // Verify backup
  const verifyBackup = useCallback(
    async (backupId: string, password: string) => {
      try {
        const isVerified = await walletSeedPhraseService.verifyBackup(backupId, password);

        if (isVerified) {
          const updatedBackups = state.backups.map(b => (b.id === backupId ? { ...b, isVerified: true } : b));
          await saveBackups(updatedBackups);

          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              backups: updatedBackups,
            }));
          }
        }

        return isVerified;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to verify backup';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.backups, saveBackups]
  );

  // Generate recovery codes
  const generateRecoveryCodes = useCallback(async (backupId: string, count: number = 10): Promise<RecoveryCode[]> => {
    try {
      return await walletSeedPhraseService.generateRecoveryCodes(backupId, count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate recovery codes';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
      }
      throw err;
    }
  }, []);

  // Use a recovery code
  const useRecoveryCode = useCallback((backupId: string, code: string): boolean => {
    return walletSeedPhraseService.useRecoveryCode(backupId, code);
  }, []);

  // Delete backup
  const deleteBackup = useCallback(
    async (backupId: string) => {
      try {
        walletSeedPhraseService.deleteBackup(backupId);

        const updatedBackups = state.backups.filter(b => b.id !== backupId);
        await saveBackups(updatedBackups);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            backups: updatedBackups,
            currentBackup: prev.currentBackup?.id === backupId ? null : prev.currentBackup,
          }));
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete backup';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.backups, saveBackups]
  );

  // Export backup
  const exportBackup = useCallback((backupId: string): string => {
    return walletSeedPhraseService.exportBackup(backupId);
  }, []);

  // Import backup
  const importBackup = useCallback(
    async (backupData: string) => {
      try {
        const backup = walletSeedPhraseService.importBackup(backupData);

        const updatedBackups = [...state.backups, backup];
        await saveBackups(updatedBackups);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            backups: updatedBackups,
          }));
        }

        return backup;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to import backup';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        throw err;
      }
    },
    [state.backups, saveBackups]
  );

  // Get recovery codes
  const getRecoveryCodes = useCallback((backupId: string): RecoveryCode[] => {
    return walletSeedPhraseService.getRecoveryCodes(backupId);
  }, []);

  // Get unused recovery codes count
  const getUnusedRecoveryCodesCount = useCallback((backupId: string): number => {
    return walletSeedPhraseService.getUnusedRecoveryCodesCount(backupId);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    backups: state.backups,
    currentBackup: state.currentBackup,
    loading: state.loading,
    error: state.error,
    generateSeedPhrase,
    validateSeedPhrase,
    createBackup,
    verifyBackup,
    generateRecoveryCodes,
    useRecoveryCode,
    deleteBackup,
    exportBackup,
    importBackup,
    getRecoveryCodes,
    getUnusedRecoveryCodesCount,
    loadBackups,
  };
}
