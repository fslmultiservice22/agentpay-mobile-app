/**
 * Widget Service
 * Manages home screen widgets for portfolio display
 */

export interface WidgetData {
  totalValue: number;
  changePercent: number;
  changeAmount: number;
  topHolding?: string;
  holdingCount: number;
  lastUpdated: number;
}

export interface WidgetConfig {
  enabled: boolean;
  refreshInterval: number; // in seconds
  showChangePercent: boolean;
  showTopHolding: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
}

class WidgetService {
  private widgetData: WidgetData | null = null;
  private config: WidgetConfig = {
    enabled: true,
    refreshInterval: 300, // 5 minutes
    showChangePercent: true,
    showTopHolding: true,
    colorScheme: 'auto',
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: ((data: WidgetData) => void)[] = [];

  /**
   * Initialize widget service
   */
  public init(): void {
    console.log('[Widget] Service initialized');
    this.startAutoRefresh();
  }

  /**
   * Update widget data
   */
  public updateWidgetData(data: WidgetData): void {
    this.widgetData = {
      ...data,
      lastUpdated: Date.now(),
    };
    console.log('[Widget] Data updated:', data);
    this.notifyListeners();
  }

  /**
   * Get current widget data
   */
  public getWidgetData(): WidgetData | null {
    return this.widgetData;
  }

  /**
   * Get widget configuration
   */
  public getConfig(): WidgetConfig {
    return this.config;
  }

  /**
   * Update widget configuration
   */
  public updateConfig(config: Partial<WidgetConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[Widget] Config updated:', this.config);

    // Restart auto-refresh if interval changed
    if (config.refreshInterval) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }
  }

  /**
   * Generate widget HTML
   */
  public generateWidgetHTML(): string {
    if (!this.widgetData) {
      return '<div>No data available</div>';
    }

    const { totalValue, changePercent, topHolding, holdingCount } = this.widgetData;
    const isPositive = changePercent >= 0;
    const emoji = isPositive ? '📈' : '📉';

    return `
      <div style="padding: 16px; background: #f5f5f5; border-radius: 12px;">
        <div style="font-size: 12px; color: #999; margin-bottom: 8px;">AgentPay Portfolio</div>
        <div style="font-size: 24px; font-weight: bold; color: #000; margin-bottom: 4px;">
          $${totalValue.toFixed(2)}
        </div>
        <div style="font-size: 14px; color: ${isPositive ? '#22C55E' : '#EF4444'};">
          ${emoji} ${isPositive ? '+' : ''}${changePercent.toFixed(2)}%
        </div>
        ${this.config.showTopHolding && topHolding ? `
          <div style="font-size: 12px; color: #666; margin-top: 8px;">
            Top: ${topHolding}
          </div>
        ` : ''}
        <div style="font-size: 12px; color: #999; margin-top: 4px;">
          ${holdingCount} assets
        </div>
      </div>
    `;
  }

  /**
   * Generate widget data JSON
   */
  public generateWidgetJSON(): string {
    return JSON.stringify(this.widgetData, null, 2);
  }

  /**
   * Format widget data for display
   */
  public formatWidgetDisplay(): string {
    if (!this.widgetData) {
      return 'No data';
    }

    const { totalValue, changePercent, topHolding, holdingCount } = this.widgetData;
    const isPositive = changePercent >= 0;

    return `
Portfolio: $${totalValue.toFixed(2)}
Change: ${isPositive ? '+' : ''}${changePercent.toFixed(2)}%
${topHolding ? `Top: ${topHolding}` : ''}
Assets: ${holdingCount}
    `.trim();
  }

  /**
   * Add listener for widget updates
   */
  public addListener(listener: (data: WidgetData) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Start auto-refresh
   */
  private startAutoRefresh(): void {
    if (!this.config.enabled) return;

    this.refreshTimer = setInterval(() => {
      console.log('[Widget] Auto-refresh triggered');
      // In real app, this would fetch data from API
      // For now, just notify listeners
      if (this.widgetData) {
        this.notifyListeners();
      }
    }, this.config.refreshInterval * 1000);
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    if (this.widgetData) {
      this.listeners.forEach((listener) => listener(this.widgetData!));
    }
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    this.stopAutoRefresh();
    this.listeners = [];
    console.log('[Widget] Service cleaned up');
  }

  /**
   * Get widget statistics
   */
  public getStatistics(): {
    isPositive: boolean;
    emoji: string;
    formattedValue: string;
    formattedChange: string;
  } | null {
    if (!this.widgetData) return null;

    const isPositive = this.widgetData.changePercent >= 0;
    const emoji = isPositive ? '📈' : '📉';

    return {
      isPositive,
      emoji,
      formattedValue: `$${this.widgetData.totalValue.toFixed(2)}`,
      formattedChange: `${isPositive ? '+' : ''}${this.widgetData.changePercent.toFixed(2)}%`,
    };
  }
}

// Export singleton instance
export const widgetService = new WidgetService();

/**
 * Hook to use widget service in components
 */
export function useWidgetService() {
  return widgetService;
}
