/**
 * OTA (Over-The-Air) Update Service
 */

export interface AppUpdate {
  version: string;
  buildNumber: number;
  releaseDate: number;
  changelog: string;
  downloadUrl: string;
  isRequired: boolean;
}

export interface UpdateStatus {
  isUpdateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadProgress: number;
  isDownloading: boolean;
  update?: AppUpdate;
}

class OTAUpdateService {
  private currentVersion = '1.0.90';
  private currentBuildNumber = 90;
  private updates: Map<string, AppUpdate> = new Map();
  private updateStatus: UpdateStatus = {
    isUpdateAvailable: false,
    currentVersion: this.currentVersion,
    latestVersion: this.currentVersion,
    downloadProgress: 0,
    isDownloading: false,
  };
  private listeners: Set<(status: UpdateStatus) => void> = new Set();
  private updateServer = 'https://api.agentpay.com/updates';

  async checkForUpdates(): Promise<UpdateStatus> {
    try {
      console.log('Checking for updates...');
      return this.updateStatus;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return this.updateStatus;
    }
  }

  async downloadUpdate(update: AppUpdate): Promise<boolean> {
    try {
      this.updateStatus.isDownloading = true;
      this.notifyListeners();

      for (let i = 0; i <= 100; i += 10) {
        this.updateStatus.downloadProgress = i;
        this.notifyListeners();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.updateStatus.isDownloading = false;
      this.updateStatus.downloadProgress = 0;
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error('Error downloading update:', error);
      this.updateStatus.isDownloading = false;
      this.notifyListeners();
      return false;
    }
  }

  async installUpdate(update: AppUpdate): Promise<boolean> {
    try {
      this.currentVersion = update.version;
      this.currentBuildNumber = update.buildNumber;
      this.updateStatus.isUpdateAvailable = false;
      this.updateStatus.latestVersion = this.currentVersion;
      this.updateStatus.update = undefined;
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Error installing update:', error);
      return false;
    }
  }

  subscribe(listener: (status: UpdateStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.updateStatus);
      } catch (error) {
        console.error('Error in update listener:', error);
      }
    });
  }

  getStatus(): UpdateStatus {
    return { ...this.updateStatus };
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }
}

export const otaUpdate = new OTAUpdateService();
