/**
 * In-App Browser Service
 * Handles opening URLs in an in-app browser or system browser
 */

import * as WebBrowser from 'expo-web-browser';
import { Platform, Linking } from 'react-native';

export enum BrowserType {
  IN_APP = 'in-app',
  SYSTEM = 'system',
  CUSTOM_TABS = 'custom-tabs',
}

export interface BrowserConfig {
  preferredBrowserType: BrowserType;
  enableReadingList: boolean;
  enableBarCollapsing: boolean;
  enableControlsCollapsing: boolean;
  showTitle: boolean;
  toolbarColor?: string;
  secondaryToolbarColor?: string;
  navigationBarColor?: string;
  dismissButtonStyle?: 'cancel' | 'close' | 'done';
}

export interface BrowserResult {
  success: boolean;
  url: string;
  browserType: BrowserType;
  error?: string;
  timestamp: number;
}

class InAppBrowserService {
  private config: BrowserConfig = {
    preferredBrowserType: BrowserType.IN_APP,
    enableReadingList: true,
    enableBarCollapsing: true,
    enableControlsCollapsing: true,
    showTitle: true,
    dismissButtonStyle: 'cancel',
  };

  private isWarmingUp = false;
  private openedUrls: string[] = [];

  /**
   * Initialize in-app browser
   */
  public async init(): Promise<void> {
    try {
      // Warm up the browser
      if (Platform.OS !== 'web') {
        await this.warmUpBrowser();
      }
      console.log('[Browser] Service initialized');
    } catch (error) {
      console.error('[Browser] Initialization error:', error);
    }
  }

  /**
   * Warm up the browser for faster loading
   */
  private async warmUpBrowser(): Promise<void> {
    if (this.isWarmingUp) return;

    try {
      this.isWarmingUp = true;
      await WebBrowser.warmUpAsync();
      console.log('[Browser] Browser warmed up');
    } catch (error) {
      console.error('[Browser] Error warming up browser:', error);
    } finally {
      this.isWarmingUp = false;
    }
  }

  /**
   * Open URL in browser
   */
  public async openURL(url: string, browserType?: BrowserType): Promise<BrowserResult> {
    try {
      const type = browserType || this.config.preferredBrowserType;

      console.log('[Browser] Opening URL:', url, 'Type:', type);

      if (type === BrowserType.IN_APP && Platform.OS !== 'web') {
        return await this.openInAppBrowser(url);
      } else if (type === BrowserType.CUSTOM_TABS && Platform.OS === 'android') {
        return await this.openCustomTabs(url);
      } else {
        return await this.openSystemBrowser(url);
      }
    } catch (error) {
      console.error('[Browser] Error opening URL:', error);
      return {
        success: false,
        url,
        browserType: BrowserType.SYSTEM,
        error: String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Open URL in in-app browser
   */
  private async openInAppBrowser(url: string): Promise<BrowserResult> {
    try {
      const result = await WebBrowser.openBrowserAsync(url, {
        displayImmediately: true,
        enableBarCollapsing: this.config.enableBarCollapsing,
        enableControlsCollapsing: this.config.enableControlsCollapsing,
        showTitle: this.config.showTitle,
        toolbarColor: this.config.toolbarColor,
        secondaryToolbarColor: this.config.secondaryToolbarColor,
        dismissButtonStyle: this.config.dismissButtonStyle as any,
      });

      this.openedUrls.push(url);

      return {
        success: result.type === 'opened',
        url,
        browserType: BrowserType.IN_APP,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[Browser] Error opening in-app browser:', error);
      return {
        success: false,
        url,
        browserType: BrowserType.IN_APP,
        error: String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Open URL with custom tabs (Android)
   */
  private async openCustomTabs(url: string): Promise<BrowserResult> {
    try {
      const result = await WebBrowser.openBrowserAsync(url, {
        displayImmediately: true,
        toolbarColor: this.config.toolbarColor,
        secondaryToolbarColor: this.config.secondaryToolbarColor,
        navigationBarColor: this.config.navigationBarColor,
      });

      this.openedUrls.push(url);

      return {
        success: result.type === 'opened',
        url,
        browserType: BrowserType.CUSTOM_TABS,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[Browser] Error opening custom tabs:', error);
      return {
        success: false,
        url,
        browserType: BrowserType.CUSTOM_TABS,
        error: String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Open URL in system browser
   */
  private async openSystemBrowser(url: string): Promise<BrowserResult> {
    try {
      await Linking.openURL(url);
      this.openedUrls.push(url);

      return {
        success: true,
        url,
        browserType: BrowserType.SYSTEM,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('[Browser] Error opening system browser:', error);
      return {
        success: false,
        url,
        browserType: BrowserType.SYSTEM,
        error: String(error),
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Open DeFi dApp
   */
  public async openDeFiApp(dappName: string, dappUrl: string): Promise<BrowserResult> {
    console.log('[Browser] Opening DeFi dApp:', dappName);
    return this.openURL(dappUrl, BrowserType.IN_APP);
  }

  /**
   * Open DEX
   */
  public async openDEX(dexName: string, dexUrl: string, chainId?: number): Promise<BrowserResult> {
    const url = chainId ? `${dexUrl}?chainId=${chainId}` : dexUrl;
    console.log('[Browser] Opening DEX:', dexName);
    return this.openURL(url, BrowserType.IN_APP);
  }

  /**
   * Get configuration
   */
  public getConfig(): BrowserConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<BrowserConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Browser] Config updated:', this.config);
  }

  /**
   * Get opened URLs history
   */
  public getOpenedUrls(): string[] {
    return this.openedUrls;
  }

  /**
   * Clear opened URLs history
   */
  public clearHistory(): void {
    this.openedUrls = [];
    console.log('[Browser] History cleared');
  }

  /**
   * Check if URL is valid
   */
  public isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Add protocol to URL if missing
   */
  public ensureProtocol(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }

  /**
   * Close browser (if supported)
   */
  public async closeBrowser(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await WebBrowser.dismissBrowser();
        console.log('[Browser] Browser closed');
      }
    } catch (error) {
      console.error('[Browser] Error closing browser:', error);
    }
  }

  /**
   * Cleanup
   */
  public async cleanup(): Promise<void> {
    try {
      await this.closeBrowser();
      this.clearHistory();
      console.log('[Browser] Service cleaned up');
    } catch (error) {
      console.error('[Browser] Error during cleanup:', error);
    }
  }

  /**
   * Get popular DeFi dApps
   */
  public getPopularDeFiApps(): Array<{ name: string; url: string; category: string }> {
    return [
      { name: 'Uniswap', url: 'https://app.uniswap.org', category: 'DEX' },
      { name: 'Aave', url: 'https://app.aave.com', category: 'Lending' },
      { name: 'Curve', url: 'https://curve.fi', category: 'DEX' },
      { name: 'Lido', url: 'https://lido.fi', category: 'Staking' },
      { name: 'Yearn', url: 'https://yearn.finance', category: 'Yield' },
      { name: 'OpenSea', url: 'https://opensea.io', category: 'NFT' },
      { name: 'Compound', url: 'https://compound.finance', category: 'Lending' },
      { name: 'PancakeSwap', url: 'https://pancakeswap.finance', category: 'DEX' },
    ];
  }
}

// Export singleton instance
export const inAppBrowser = new InAppBrowserService();

/**
 * Hook to use in-app browser in components
 */
export function useInAppBrowser() {
  return inAppBrowser;
}
