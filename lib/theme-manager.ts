/**
 * Theme Manager Service
 * Manage dark mode and theme switching
 */

export type Theme = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  light: {
    background: string;
    foreground: string;
    primary: string;
    surface: string;
    border: string;
  };
  dark: {
    background: string;
    foreground: string;
    primary: string;
    surface: string;
    border: string;
  };
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  light: {
    background: '#ffffff',
    foreground: '#11181C',
    primary: '#0a7ea4',
    surface: '#f5f5f5',
    border: '#E5E7EB',
  },
  dark: {
    background: '#151718',
    foreground: '#ECEDEE',
    primary: '#0a7ea4',
    surface: '#1e2022',
    border: '#334155',
  },
};

class ThemeManager {
  private currentTheme: Theme = 'auto';
  private themeConfig: ThemeConfig = DEFAULT_THEME_CONFIG;
  private listeners: Map<string, (theme: Theme) => void> = new Map();
  private storageKey = 'agentpay_theme_preference';

  constructor() {
    this.loadThemePreference();
  }

  /**
   * Load theme preference from storage
   */
  private loadThemePreference(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(this.storageKey);
        if (saved && ['light', 'dark', 'auto'].includes(saved)) {
          this.currentTheme = saved as Theme;
        }
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  }

  /**
   * Save theme preference to storage
   */
  private saveThemePreference(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.storageKey, this.currentTheme);
      }
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }

  /**
   * Get current theme
   */
  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Set theme
   */
  setTheme(theme: Theme): void {
    if (this.currentTheme !== theme) {
      this.currentTheme = theme;
      this.saveThemePreference();
      this.applyTheme();
      this.emit('theme_changed', theme);
    }
  }

  /**
   * Toggle between light and dark
   */
  toggleTheme(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  /**
   * Get effective theme (resolves 'auto' to actual theme)
   */
  getEffectiveTheme(): 'light' | 'dark' {
    if (this.currentTheme === 'auto') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return this.currentTheme;
  }

  /**
   * Apply theme to DOM
   */
  private applyTheme(): void {
    try {
      const effectiveTheme = this.getEffectiveTheme();

      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        root.setAttribute('data-theme', effectiveTheme);

        // Apply CSS variables
        const themeColors = this.themeConfig[effectiveTheme];
        Object.entries(themeColors).forEach(([key, value]) => {
          root.style.setProperty(`--color-${key}`, value);
        });
      }
    } catch (error) {
      console.warn('Failed to apply theme:', error);
    }
  }

  /**
   * Get theme colors
   */
  getColors(): ThemeConfig['light'] | ThemeConfig['dark'] {
    const effectiveTheme = this.getEffectiveTheme();
    return this.themeConfig[effectiveTheme];
  }

  /**
   * Set custom theme config
   */
  setThemeConfig(config: Partial<ThemeConfig>): void {
    this.themeConfig = {
      ...this.themeConfig,
      ...config,
    };
    this.applyTheme();
  }

  /**
   * Listen to theme changes
   */
  on(event: string, callback: (theme: Theme) => void): void {
    this.listeners.set(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Emit event
   */
  private emit(event: string, theme: Theme): void {
    const callback = this.listeners.get(event);
    if (callback) {
      callback(theme);
    }
  }

  /**
   * Initialize theme manager
   */
  initialize(): void {
    this.applyTheme();

    // Listen to system theme changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.currentTheme === 'auto') {
          this.applyTheme();
          this.emit('theme_changed', 'auto');
        }
      });
    }
  }
}

// Singleton instance
let themeManager: ThemeManager | null = null;

export function getThemeManager(): ThemeManager {
  if (!themeManager) {
    themeManager = new ThemeManager();
  }
  return themeManager;
}

export function initializeThemeManager(): ThemeManager {
  if (!themeManager) {
    themeManager = new ThemeManager();
    themeManager.initialize();
  }
  return themeManager;
}
