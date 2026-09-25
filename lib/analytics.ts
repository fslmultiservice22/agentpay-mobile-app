/**
 * Analytics Service
 * Tracks user interactions and app events
 */

interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
  timestamp?: number;
}

interface AnalyticsUser {
  id: string;
  email?: string;
  properties?: Record<string, any>;
}

class AnalyticsService {
  private events: AnalyticsEvent[] = [];
  private user: AnalyticsUser | null = null;
  private isEnabled = true;

  /**
   * Initialize analytics service
   */
  public init(): void {
  }

  /**
   * Set user information
   */
  public setUser(user: AnalyticsUser): void {
    if (!this.isEnabled) return;
    this.user = user;
  }

  /**
   * Clear user information
   */
  public clearUser(): void {
    this.user = null;
  }

  /**
   * Track an event
   */
  public trackEvent(name: string, params?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name,
      params,
      timestamp: Date.now(),
    };

    this.events.push(event);
  }

  /**
   * Track drawer menu open
   */
  public trackDrawerMenuOpen(): void {
    this.trackEvent('drawer_menu_open', {
      source: 'home_screen',
    });
  }

  /**
   * Track drawer menu item click
   */
  public trackDrawerMenuItemClick(itemLabel: string, itemRoute: string): void {
    this.trackEvent('drawer_menu_item_click', {
      item_label: itemLabel,
      item_route: itemRoute,
    });
  }

  /**
   * Track onboarding started
   */
  public trackOnboardingStarted(): void {
    this.trackEvent('onboarding_started', {
      timestamp: Date.now(),
    });
  }

  /**
   * Track onboarding completed
   */
  public trackOnboardingCompleted(): void {
    this.trackEvent('onboarding_completed', {
      timestamp: Date.now(),
    });
  }

  /**
   * Track onboarding skipped
   */
  public trackOnboardingSkipped(): void {
    this.trackEvent('onboarding_skipped', {
      timestamp: Date.now(),
    });
  }

  /**
   * Track wallet connected
   */
  public trackWalletConnected(walletType: string): void {
    this.trackEvent('wallet_connected', {
      wallet_type: walletType,
    });
  }

  /**
   * Track wallet disconnected
   */
  public trackWalletDisconnected(): void {
    this.trackEvent('wallet_disconnected');
  }

  /**
   * Track tab navigation
   */
  public trackTabNavigation(tabName: string): void {
    this.trackEvent('tab_navigation', {
      tab_name: tabName,
    });
  }

  /**
   * Track deep link opened
   */
  public trackDeepLinkOpened(url: string, route: string): void {
    this.trackEvent('deep_link_opened', {
      url,
      route,
    });
  }

  /**
   * Track error
   */
  public trackError(errorName: string, errorMessage: string): void {
    this.trackEvent('error_occurred', {
      error_name: errorName,
      error_message: errorMessage,
    });
  }

  /**
   * Get all tracked events
   */
  public getEvents(): AnalyticsEvent[] {
    return this.events;
  }

  /**
   * Clear all events
   */
  public clearEvents(): void {
    this.events = [];
  }

  /**
   * Enable/disable analytics
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get analytics summary
   */
  public getSummary(): {
    totalEvents: number;
    user: AnalyticsUser | null;
    lastEvent: AnalyticsEvent | null;
  } {
    return {
      totalEvents: this.events.length,
      user: this.user,
      lastEvent: this.events[this.events.length - 1] || null,
    };
  }
}

// Export singleton instance
export const analytics = new AnalyticsService();

/**
 * Hook to use analytics in components
 */
export function useAnalytics() {
  return analytics;
}
