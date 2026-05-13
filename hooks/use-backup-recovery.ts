import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { ethers } from 'ethers';

export interface BackupData {
  id: string;
  seedPhrase: string; // Encrypted
  privateKey: string; // Encrypted
  address: string;
  createdAt: number;
  lastBackupAt: number;
  backupMethod: 'local' | 'cloud';
  isVerified: boolean;
}

export interface RecoveryStatus {
  canRecover: boolean;
  backupExists: boolean;
  lastBackupTime: number | null;
  backupMethod: 'local' | 'cloud' | null;
}

interface BackupRecoveryState {
  backupData: BackupData | null;
  recoveryStatus: RecoveryStatus;
  isLoading: boolean;
  error: string | null;
}

const BACKUP_KEY = 'agentpay_backup';
const SEED_PHRASE_KEY = 'agentpay_seed_phrase';
const PRIVATE_KEY_KEY = 'agentpay_private_key';

// Semplice encryption/decryption (in produzione usare una libreria più robusta)
const encryptData = (data: string, password: string): string => {
  const encoded = Buffer.from(data).toString('base64');
  return encoded; // Placeholder - in produzione usare una vera encryption
};

const decryptData = (encrypted: string, password: string): string => {
  const decoded = Buffer.from(encrypted, 'base64').toString('utf-8');
  return decoded; // Placeholder - in produzione usare una vera decryption
};

export function useBackupRecovery(address: string | null) {
  const [state, setState] = useState<BackupRecoveryState>({
    backupData: null,
    recoveryStatus: {
      canRecover: false,
      backupExists: false,
      lastBackupTime: null,
      backupMethod: null,
    },
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);

  // Controlla lo stato di backup
  const checkBackupStatus = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      // Controlla se esiste un backup locale
      const localBackup = await AsyncStorage.getItem(`${BACKUP_KEY}_${address}`);
      const backupExists = !!localBackup;

      let backupData: BackupData | null = null;
      if (localBackup) {
        backupData = JSON.parse(localBackup);
      }

      const recoveryStatus: RecoveryStatus = {
        canRecover: backupExists,
        backupExists,
        lastBackupTime: backupData?.lastBackupAt || null,
        backupMethod: backupData?.backupMethod || null,
      };

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          backupData,
          recoveryStatus,
          isLoading: false,
        }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check backup status';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Crea un backup del seed phrase
  const backupSeedPhrase = useCallback(
    async (seedPhrase: string, password: string, method: 'local' | 'cloud' = 'local'): Promise<boolean> => {
      if (!address) return false;

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida il seed phrase (12 o 24 parole)
        const words = seedPhrase.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
          return false;
        }

        // Crittografa il seed phrase
        const encryptedSeedPhrase = encryptData(seedPhrase, password);

        // Salva il backup
        const backup: BackupData = {
          id: `backup_${Date.now()}`,
          seedPhrase: encryptedSeedPhrase,
          privateKey: '', // Placeholder
          address,
          createdAt: Date.now(),
          lastBackupAt: Date.now(),
          backupMethod: method,
          isVerified: false,
        };

        // Salva localmente
        await AsyncStorage.setItem(`${BACKUP_KEY}_${address}`, JSON.stringify(backup));

        // Salva il seed phrase in SecureStore per accesso rapido
        await SecureStore.setItemAsync(`${SEED_PHRASE_KEY}_${address}`, encryptedSeedPhrase);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            backupData: backup,
            recoveryStatus: {
              ...prev.recoveryStatus,
              backupExists: true,
              lastBackupTime: Date.now(),
              backupMethod: method,
            },
            isLoading: false,
          }));
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to backup seed phrase';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        }
        return false;
      }
    },
    [address],
  );

  // Recupera il seed phrase
  const recoverFromSeedPhrase = useCallback(
    async (seedPhrase: string, password: string): Promise<{ success: boolean; address?: string; error?: string }> => {
      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida il seed phrase
        const words = seedPhrase.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
          return {
            success: false,
            error: 'Invalid seed phrase. Must be 12 or 24 words.',
          };
        }

        // Crea un wallet dal seed phrase
        const mnemonic = ethers.Mnemonic.fromPhrase(seedPhrase);
        const hdNode = ethers.HDNodeWallet.fromMnemonic(mnemonic);
        const wallet = hdNode.deriveChild(0);

        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
          }));
        }

        return {
          success: true,
          address: wallet.address,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to recover from seed phrase';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        }
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [],
  );

  // Verifica il backup
  const verifyBackup = useCallback(
    async (seedPhrase: string): Promise<boolean> => {
      if (!state.backupData) return false;

      try {
        // Decritta il seed phrase salvato
        const decrypted = decryptData(state.backupData.seedPhrase, '');
        const isValid = decrypted === seedPhrase;

        if (isValid && isMountedRef.current) {
          setState(prev => ({
            ...prev,
            backupData: prev.backupData ? { ...prev.backupData, isVerified: true } : null,
          }));
        }

        return isValid;
      } catch (err) {
        console.error('Failed to verify backup:', err);
        return false;
      }
    },
    [state.backupData],
  );

  // Elimina il backup
  const deleteBackup = useCallback(async (): Promise<boolean> => {
    if (!address) return false;

    try {
      await AsyncStorage.removeItem(`${BACKUP_KEY}_${address}`);
      await SecureStore.deleteItemAsync(`${SEED_PHRASE_KEY}_${address}`);

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          backupData: null,
          recoveryStatus: {
            canRecover: false,
            backupExists: false,
            lastBackupTime: null,
            backupMethod: null,
          },
        }));
      }

      return true;
    } catch (err) {
      console.error('Failed to delete backup:', err);
      return false;
    }
  }, [address]);

  // Controlla lo stato di backup al mount
  useEffect(() => {
    checkBackupStatus();
  }, [address, checkBackupStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    backupData: state.backupData,
    recoveryStatus: state.recoveryStatus,
    isLoading: state.isLoading,
    error: state.error,
    checkBackupStatus,
    backupSeedPhrase,
    recoverFromSeedPhrase,
    verifyBackup,
    deleteBackup,
  };
}
