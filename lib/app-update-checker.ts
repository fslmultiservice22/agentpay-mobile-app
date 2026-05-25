import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

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

class AppUpdateChecker {
  private currentVersion = '1.0.83';
  private checkInterval = 24 * 60 * 60 * 1000; // 24 hours
  private lastCheckTime = 0;

  async checkForUpdates(): Promise<UpdateCheckResult> {
    try {
      // Check if we should skip check (within 24 hours)
      const now = Date.now();
      if (now - this.lastCheckTime < this.checkInterval) {
        return {
          updateAvailable: false,
          currentVersion: this.currentVersion,
        };
      }

      this.lastCheckTime = now;

      // Fetch latest version from server
      const response = await fetch('https://api.agentpay.com/app/latest-version', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Platform': Platform.OS,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch latest version');
      }

      const data = await response.json();

      // Compare versions
      const updateAvailable = this.isNewerVersion(data.version, this.currentVersion);

      if (updateAvailable) {
        return {
          updateAvailable: true,
          update: {
            version: data.version,
            releaseDate: data.releaseDate,
            changelog: data.changelog,
            downloadUrl: data.downloadUrl,
            isRequired: data.isRequired,
          },
          currentVersion: this.currentVersion,
        };
      }

      return {
        updateAvailable: false,
        currentVersion: this.currentVersion,
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return {
        updateAvailable: false,
        currentVersion: this.currentVersion,
      };
    }
  }

  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (newPart > currentPart) return true;
      if (newPart < currentPart) return false;
    }

    return false;
  }

  async downloadAndInstallUpdate(downloadUrl: string): Promise<boolean> {
    try {
      // For Expo apps, use OTA updates
      if (Updates.isEnabled) {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
          return true;
        }
      }

      // Fallback: open download URL
      return false;
    } catch (error) {
      console.error('Error downloading update:', error);
      return false;
    }
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  setCurrentVersion(version: string): void {
    this.currentVersion = version;
  }
}

export const appUpdateChecker = new AppUpdateChecker();
