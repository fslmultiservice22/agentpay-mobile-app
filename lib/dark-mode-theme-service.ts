/**
 * Dark Mode Theme Toggle Service
 * System-wide dark mode support with persistence
 */

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  mode: ThemeMode;
  colors: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  transitions: {
    enabled: boolean;
    duration: number; // ms
  };
}

export interface ThemePreference {
  userId: string;
  mode: ThemeMode;
  autoSwitchEnabled: boolean;
  lightModeStartTime?: string; // HH:mm
  darkModeStartTime?: string; // HH:mm
  lastUpdated: number;
}

export interface ThemeChangeEvent {
  id: string;
  userId: string;
  oldMode: ThemeMode;
  newMode: ThemeMode;
  source: 'user' | 'system' | 'schedule';
  timestamp: number;
}

class DarkModeThemeService {
  private currentMode: ThemeMode = 'auto';
  private userPreferences: Map<string, ThemePreference> = new Map();
  private themeChangeEvents: Map<string, ThemeChangeEvent> = new Map();
  private themeConfig: ThemeConfig;
  private systemDarkModeListener?: (event: MediaQueryListEvent | MediaQueryList) => void;
  private autoSwitchInterval?: NodeJS.Timeout;

  constructor() {
    this.themeConfig = this.initializeThemeConfig();
    this.detectSystemTheme();
  }

  /**
   * Initialize theme configuration
   */
  private initializeThemeConfig(): ThemeConfig {
    return {
      mode: 'auto',
      colors: {
        light: {
          background: '#ffffff',
          foreground: '#11181C',
          surface: '#f5f5f5',
          primary: '#0a7ea4',
          muted: '#687076',
          border: '#E5E7EB',
          success: '#22C55E',
          warning: '#F59E0B',
          error: '#EF4444',
        },
        dark: {
          background: '#151718',
          foreground: '#ECEDEE',
          surface: '#1e2022',
          primary: '#0a7ea4',
          muted: '#9BA1A6',
          border: '#334155',
          success: '#4ADE80',
          warning: '#FBBF24',
          error: '#F87171',
        },
      },
      transitions: {
        enabled: true,
        duration: 300,
      },
    };
  }

  /**
   * Detect system theme preference
   */
  private detectSystemTheme(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

      this.systemDarkModeListener = (e: MediaQueryListEvent | MediaQueryList) => {
        if (this.currentMode === 'auto') {
          this.applyTheme(e.matches ? 'dark' : 'light');
        }
      };

      darkModeQuery.addEventListener('change', this.systemDarkModeListener);

      // Apply the current system preference immediately on startup
      this.systemDarkModeListener(darkModeQuery);
    }
  }

  /**
   * Set user theme preference
   */
  setUserThemePreference(userId: string, mode: ThemeMode, autoSwitch: boolean = false): ThemePreference {
    const preference: ThemePreference = {
      userId,
      mode,
      autoSwitchEnabled: autoSwitch,
      lastUpdated: Date.now(),
    };

    this.userPreferences.set(userId, preference);

    // Record event
    this.recordThemeChangeEvent(userId, this.currentMode, mode, 'user');

    // Apply theme
    this.applyTheme(mode);

    // Setup auto-switch if enabled
    if (autoSwitch) {
      this.setupAutoSwitch(userId);
    }

    return preference;
  }

  /**
   * Get user theme preference
   */
  getUserThemePreference(userId: string): ThemePreference | undefined {
    return this.userPreferences.get(userId);
  }

  /**
   * Apply theme
   */
  applyTheme(mode: ThemeMode): void {
    let themeToApply: 'light' | 'dark';

    if (mode === 'auto') {
      themeToApply = this.getSystemTheme();
    } else {
      themeToApply = mode;
    }

    this.currentMode = mode;

    // Apply CSS variables
    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // Set theme attribute
      root.setAttribute('data-theme', themeToApply);

      // Apply color variables
      const colors = this.themeConfig.colors[themeToApply];
      Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
      });

      // Add transition class if enabled
      if (this.themeConfig.transitions.enabled) {
        root.classList.add('theme-transition');
        setTimeout(() => {
          root.classList.remove('theme-transition');
        }, this.themeConfig.transitions.duration);
      }
    }
  }

  /**
   * Get system theme
   */
  private getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return 'light';
  }

  /**
   * Setup auto-switch based on time
   */
  private setupAutoSwitch(userId: string): void {
    if (this.autoSwitchInterval) {
      clearInterval(this.autoSwitchInterval);
    }

    const preference = this.userPreferences.get(userId);
    if (!preference || !preference.autoSwitchEnabled) return;

    // Check every minute
    this.autoSwitchInterval = setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      let shouldBeDark = false;

      if (preference.darkModeStartTime && preference.lightModeStartTime) {
        const darkStart = preference.darkModeStartTime;
        const lightStart = preference.lightModeStartTime;

        if (darkStart < lightStart) {
          // Dark mode is at night (e.g., 20:00 to 08:00)
          shouldBeDark = currentTime >= darkStart || currentTime < lightStart;
        } else {
          // Dark mode is during day (e.g., 08:00 to 20:00)
          shouldBeDark = currentTime >= darkStart && currentTime < lightStart;
        }
      }

      const newMode = shouldBeDark ? 'dark' : 'light';
      if (newMode !== this.currentMode) {
        this.applyTheme(newMode);
        this.recordThemeChangeEvent(userId, this.currentMode, newMode, 'schedule');
      }
    }, 60 * 1000); // Every minute
  }

  /**
   * Record theme change event
   */
  private recordThemeChangeEvent(userId: string, oldMode: ThemeMode, newMode: ThemeMode, source: 'user' | 'system' | 'schedule'): void {
    const eventId = `theme_${Date.now()}`;

    const event: ThemeChangeEvent = {
      id: eventId,
      userId,
      oldMode,
      newMode,
      source,
      timestamp: Date.now(),
    };

    this.themeChangeEvents.set(eventId, event);
  }

  /**
   * Get theme change history
   */
  getThemeChangeHistory(userId: string, limit: number = 50): ThemeChangeEvent[] {
    const events = Array.from(this.themeChangeEvents.values()).filter(e => e.userId === userId);

    events.sort((a, b) => b.timestamp - a.timestamp);

    return events.slice(0, limit);
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): ThemeMode {
    return this.currentMode;
  }

  /**
   * Get effective theme (resolved from auto)
   */
  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentMode === 'auto') {
      return this.getSystemTheme();
    }

    return this.currentMode;
  }

  /**
   * Get theme colors
   */
  getThemeColors(theme?: 'light' | 'dark'): Record<string, string> {
    const effectiveTheme = theme || this.getEffectiveTheme();

    return this.themeConfig.colors[effectiveTheme];
  }

  /**
   * Get specific color
   */
  getColor(colorName: string, theme?: 'light' | 'dark'): string {
    const colors = this.getThemeColors(theme);

    return colors[colorName] || '#000000';
  }

  /**
   * Update theme colors
   */
  updateThemeColors(theme: 'light' | 'dark', colors: Record<string, string>): void {
    this.themeConfig.colors[theme] = { ...this.themeConfig.colors[theme], ...colors };

    // Reapply current theme
    this.applyTheme(this.currentMode);
  }

  /**
   * Set transition duration
   */
  setTransitionDuration(duration: number): void {
    this.themeConfig.transitions.duration = duration;
  }

  /**
   * Enable/disable transitions
   */
  setTransitionsEnabled(enabled: boolean): void {
    this.themeConfig.transitions.enabled = enabled;
  }

  /**
   * Get all user preferences
   */
  getAllUserPreferences(): ThemePreference[] {
    return Array.from(this.userPreferences.values());
  }

  /**
   * Get theme statistics
   */
  getThemeStatistics(): {
    totalUsers: number;
    lightModeUsers: number;
    darkModeUsers: number;
    autoModeUsers: number;
    autoSwitchEnabled: number;
  } {
    const preferences = Array.from(this.userPreferences.values());

    return {
      totalUsers: preferences.length,
      lightModeUsers: preferences.filter(p => p.mode === 'light').length,
      darkModeUsers: preferences.filter(p => p.mode === 'dark').length,
      autoModeUsers: preferences.filter(p => p.mode === 'auto').length,
      autoSwitchEnabled: preferences.filter(p => p.autoSwitchEnabled).length,
    };
  }

  /**
   * Cleanup old events
   */
  cleanupOldEvents(daysOld: number = 30): number {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    this.themeChangeEvents.forEach((event, key) => {
      if (event.timestamp < cutoffTime) {
        this.themeChangeEvents.delete(key);
        deletedCount++;
      }
    });

    return deletedCount;
  }

  /**
   * Destroy service
   */
  destroy(): void {
    if (this.autoSwitchInterval) {
      clearInterval(this.autoSwitchInterval);
    }

    if (typeof window !== 'undefined' && window.matchMedia && this.systemDarkModeListener) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      darkModeQuery.removeEventListener('change', this.systemDarkModeListener);
    }
  }
}

export const darkModeThemeService = new DarkModeThemeService();
