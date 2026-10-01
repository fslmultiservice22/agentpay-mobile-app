/**
 * Servizio OTA inattivo nella beta tecnica.
 * Le interfacce restano per compatibilità, ma nessun endpoint o binario è verificato.
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

export class OTAUpdateService {
  private currentVersion: string;

  // Un URL passato dal chiamante non abilita l'OTA senza una release approvata.
  constructor(_apiUrl: string = '', currentVersion: string = '1.0.0') {
    this.currentVersion = currentVersion;
  }

  async checkForUpdates(): Promise<UpdateCheckResult> {
    return {
      updateAvailable: false,
      currentVersion: this.currentVersion,
      latestVersion: this.currentVersion,
    };
  }

  async downloadUpdate(_versionInfo: AppVersion): Promise<boolean> {
    return false;
  }

  async installUpdate(): Promise<boolean> {
    return false;
  }

  async getPendingUpdate(): Promise<AppVersion | null> {
    return null;
  }

  async clearPendingUpdate(): Promise<void> {
    // Elimina soltanto vecchie informazioni locali; non tocca versioni installate.
    await AsyncStorage.removeItem(OTA_CONFIG_KEY);
  }

  async resetCheckTimer(): Promise<void> {
    await AsyncStorage.removeItem(LAST_CHECK_KEY);
  }
}

export const otaUpdateService = new OTAUpdateService();
