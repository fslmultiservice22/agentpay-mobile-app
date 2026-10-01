export interface AppUpdate {
  version: string;
  releaseDate: number;
  changelog: string;
  downloadUrl: string;
  isRequired: boolean;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  update?: AppUpdate;
  currentVersion: string;
}

/**
 * Il servizio remoto di aggiornamento non è configurato nella beta tecnica.
 * Non interrogare endpoint non verificati e non indicare download/installazioni disponibili.
 */
class AppUpdateChecker {
  private currentVersion = '1.0.83';

  async checkForUpdates(): Promise<UpdateCheckResult> {
    return {
      updateAvailable: false,
      currentVersion: this.currentVersion,
    };
  }

  async downloadAndInstallUpdate(_downloadUrl: string): Promise<boolean> {
    return false;
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  setCurrentVersion(version: string): void {
    this.currentVersion = version;
  }
}

export const appUpdateChecker = new AppUpdateChecker();
