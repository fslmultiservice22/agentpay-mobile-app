import { useState, useCallback, useEffect } from 'react';
import { otaUpdateService, AppVersion, UpdateCheckResult } from '@/lib/ota-update-service';

export interface OTAUpdateState {
  checking: boolean;
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  versionInfo?: AppVersion;
  downloading: boolean;
  installing: boolean;
  error: string | null;
}

/**
 * Hook per gestire gli aggiornamenti OTA
 */
export function useOTAUpdate() {
  const [state, setState] = useState<OTAUpdateState>({
    checking: false,
    updateAvailable: false,
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
    downloading: false,
    installing: false,
    error: null,
  });

  /**
   * Controlla se è disponibile un aggiornamento
   */
  const checkForUpdates = useCallback(async () => {
    setState((prev) => ({ ...prev, checking: true, error: null }));

    try {
      const result: UpdateCheckResult = await otaUpdateService.checkForUpdates();

      setState((prev) => ({
        ...prev,
        checking: false,
        updateAvailable: result.updateAvailable,
        currentVersion: result.currentVersion,
        latestVersion: result.latestVersion,
        versionInfo: result.versionInfo,
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check for updates';
      setState((prev) => ({ ...prev, checking: false, error: errorMessage }));
      throw error;
    }
  }, []);

  /**
   * Scarica l'aggiornamento
   */
  const downloadUpdate = useCallback(async () => {
    if (!state.versionInfo) {
      throw new Error('No update available to download');
    }

    setState((prev) => ({ ...prev, downloading: true, error: null }));

    try {
      const success = await otaUpdateService.downloadUpdate(state.versionInfo);

      if (!success) {
        throw new Error('Failed to download update');
      }

      setState((prev) => ({ ...prev, downloading: false }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Download failed';
      setState((prev) => ({ ...prev, downloading: false, error: errorMessage }));
      throw error;
    }
  }, [state.versionInfo]);

  /**
   * Installa l'aggiornamento
   */
  const installUpdate = useCallback(async () => {
    setState((prev) => ({ ...prev, installing: true, error: null }));

    try {
      const success = await otaUpdateService.installUpdate();

      if (!success) {
        throw new Error('Failed to install update');
      }

      setState((prev) => ({
        ...prev,
        installing: false,
        updateAvailable: false,
        currentVersion: state.latestVersion,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Installation failed';
      setState((prev) => ({ ...prev, installing: false, error: errorMessage }));
      throw error;
    }
  }, [state.latestVersion]);

  /**
   * Cancella l'aggiornamento in sospeso
   */
  const clearPendingUpdate = useCallback(async () => {
    try {
      await otaUpdateService.clearPendingUpdate();
      setState((prev) => ({ ...prev, updateAvailable: false }));
    } catch (error) {
      console.error('Error clearing pending update:', error);
    }
  }, []);

  /**
   * Controlla automaticamente gli aggiornamenti al mount
   */
  useEffect(() => {
    void checkForUpdates();
  }, [checkForUpdates]);

  return {
    ...state,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    clearPendingUpdate,
  };
}
