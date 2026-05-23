/**
 * OTA (Over-The-Air) Update Service
 * Gestisce gli aggiornamenti automatici dell'app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppVersion {
  version: string;
  buildNumber: number;
  releaseDate: string;
  changelog: string[];
  downloadUrl: string;
  minSdkVersion?: number;
  minOsVersion?: string;
  isRequired: boolean;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  versionInfo?: AppVersion;
}

const OTA_CONFIG_KEY = 'agentpay_ota_config';
const LAST_CHECK_KEY = 'agentpay_last_update_check';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class OTAUpdateService {
  private apiUrl: string;
  private currentVersion: string;

  constructor(apiUrl: string = 'https://api.agentpay.app', currentVersion: string = '1.0.0') {
    this.apiUrl = apiUrl;
    this.currentVersion = currentVersion;
  }

  /**
   * Controlla se è disponibile un aggiornamento
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      // Verifica se è passato abbastanza tempo dall'ultimo controllo
      const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
      const now = Date.now();

      if (lastCheck) {
        const lastCheckTime = parseInt(lastCheck, 10);
        if (now - lastCheckTime < CHECK_INTERVAL_MS) {
          console.log('OTA: Skipping check, already checked recently');
          return {
            updateAvailable: false,
            currentVersion: this.currentVersion,
            latestVersion: this.currentVersion,
          };
        }
      }

      // Effettua la richiesta al server
      const response = await fetch(`${this.apiUrl}/api/ota/check-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentVersion: this.currentVersion }),
      });

      if (!response.ok) {
        throw new Error(`OTA check failed: ${response.statusText}`);
      }

      const data: AppVersion = await response.json();

      // Salva il timestamp dell'ultimo controllo
      await AsyncStorage.setItem(LAST_CHECK_KEY, now.toString());

      const updateAvailable = this.compareVersions(data.version, this.currentVersion) > 0;

      return {
        updateAvailable,
        currentVersion: this.currentVersion,
        latestVersion: data.version,
        versionInfo: updateAvailable ? data : undefined,
      };
    } catch (error) {
      console.error('OTA check error:', error);
      return {
        updateAvailable: false,
        currentVersion: this.currentVersion,
        latestVersion: this.currentVersion,
      };
    }
  }

  /**
   * Scarica l'aggiornamento
   */
  async downloadUpdate(versionInfo: AppVersion): Promise<boolean> {
    try {
      console.log(`OTA: Downloading update to version ${versionInfo.version}`);

      // Salva le informazioni di aggiornamento nel storage
      await AsyncStorage.setItem(OTA_CONFIG_KEY, JSON.stringify(versionInfo));

      // In una app reale, qui scaricheremmo il file
      // Per ora, simuliamo il download
      return true;
    } catch (error) {
      console.error('OTA download error:', error);
      return false;
    }
  }

  /**
   * Installa l'aggiornamento (richiede restart dell'app)
   */
  async installUpdate(): Promise<boolean> {
    try {
      const updateData = await AsyncStorage.getItem(OTA_CONFIG_KEY);
      if (!updateData) {
        throw new Error('No update available to install');
      }

      const versionInfo: AppVersion = JSON.parse(updateData);

      console.log(`OTA: Installing update to version ${versionInfo.version}`);

      // In una app reale, qui installeremmo l'aggiornamento
      // Per ora, simuliamo l'installazione
      this.currentVersion = versionInfo.version;

      // Pulisci il storage
      await AsyncStorage.removeItem(OTA_CONFIG_KEY);

      return true;
    } catch (error) {
      console.error('OTA install error:', error);
      return false;
    }
  }

  /**
   * Confronta due versioni (semver)
   * Ritorna: 1 se v1 > v2, -1 se v1 < v2, 0 se v1 == v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Ottiene le informazioni dell'aggiornamento in sospeso
   */
  async getPendingUpdate(): Promise<AppVersion | null> {
    try {
      const updateData = await AsyncStorage.getItem(OTA_CONFIG_KEY);
      return updateData ? JSON.parse(updateData) : null;
    } catch (error) {
      console.error('Error getting pending update:', error);
      return null;
    }
  }

  /**
   * Cancella l'aggiornamento in sospeso
   */
  async clearPendingUpdate(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OTA_CONFIG_KEY);
    } catch (error) {
      console.error('Error clearing pending update:', error);
    }
  }

  /**
   * Resetta il timer di controllo (per testing)
   */
  async resetCheckTimer(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LAST_CHECK_KEY);
    } catch (error) {
      console.error('Error resetting check timer:', error);
    }
  }
}

// Esporta un'istanza singleton
export const otaUpdateService = new OTAUpdateService();
