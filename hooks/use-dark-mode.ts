import { useEffect, useState, useCallback } from 'react';
import { getThemeManager, initializeThemeManager, Theme } from '@/lib/theme-manager';

export function useDarkMode() {
  const [theme, setTheme] = useState<Theme>('auto');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const manager = initializeThemeManager();
    setTheme(manager.getCurrentTheme());
    setEffectiveTheme(manager.getEffectiveTheme());
    setIsInitialized(true);

    const handleThemeChange = (newTheme: Theme) => {
      setTheme(newTheme);
      setEffectiveTheme(manager.getEffectiveTheme());
    };

    manager.on('theme_changed', handleThemeChange);

    return () => {
      manager.off('theme_changed');
    };
  }, []);

  const setCurrentTheme = useCallback((newTheme: Theme) => {
    const manager = getThemeManager();
    manager.setTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const manager = getThemeManager();
    manager.toggleTheme();
  }, []);

  const isDark = effectiveTheme === 'dark';

  return {
    theme,
    effectiveTheme,
    isDark,
    isInitialized,
    setTheme: setCurrentTheme,
    toggleTheme,
  };
}

export function useThemeColors() {
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const manager = getThemeManager();
    const themeColors = manager.getColors();
    setColors(themeColors);

    const handleThemeChange = () => {
      const newColors = manager.getColors();
      setColors(newColors);
    };

    manager.on('theme_changed', handleThemeChange);

    return () => {
      manager.off('theme_changed');
    };
  }, []);

  return colors;
}

export function useThemeConfig() {
  const updateThemeConfig = useCallback((config: any) => {
    const manager = getThemeManager();
    manager.setThemeConfig(config);
  }, []);

  return {
    updateThemeConfig,
  };
}
