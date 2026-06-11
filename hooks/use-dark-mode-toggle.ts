import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from './use-color-scheme';

export interface DarkModeState {
  isDarkMode: boolean;
  systemPreference: 'light' | 'dark' | null;
  useSystemPreference: boolean;
}

export function useDarkModeToggle() {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [useSystemPreference, setUseSystemPreference] = useState(true);

  // Load dark mode preference from storage
  const loadDarkModePreference = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_dark_mode_preference');
      if (stored) {
        const preference = JSON.parse(stored);
        setIsDarkMode(preference.isDarkMode);
        setUseSystemPreference(preference.useSystemPreference);
      } else {
        // Default to system preference
        setUseSystemPreference(true);
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Failed to load dark mode preference:', error);
      setUseSystemPreference(true);
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme]);

  // Save dark mode preference to storage
  const saveDarkModePreference = useCallback(
    async (dark: boolean, useSystem: boolean) => {
      try {
        const preference = {
          isDarkMode: dark,
          useSystemPreference: useSystem,
        };
        await AsyncStorage.setItem('agentpay_dark_mode_preference', JSON.stringify(preference));
      } catch (error) {
        console.error('Failed to save dark mode preference:', error);
      }
    },
    []
  );

  // Toggle dark mode
  const toggleDarkMode = useCallback(async () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    setUseSystemPreference(false);
    await saveDarkModePreference(newDarkMode, false);
    
    // Apply theme to document
    if (typeof document !== 'undefined') {
      if (newDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }, [isDarkMode, saveDarkModePreference]);

  // Use system preference
  const useSystemDarkMode = useCallback(async () => {
    const systemDark = systemColorScheme === 'dark';
    setIsDarkMode(systemDark);
    setUseSystemPreference(true);
    await saveDarkModePreference(systemDark, true);
    
    // Apply theme based on system
    if (typeof document !== 'undefined') {
      if (systemDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }, [systemColorScheme, saveDarkModePreference]);

  // Set specific dark mode
  const setDarkMode = useCallback(
    async (dark: boolean) => {
      setIsDarkMode(dark);
      setUseSystemPreference(false);
      await saveDarkModePreference(dark, false);
      
      // Apply theme
      if (typeof document !== 'undefined') {
        if (dark) {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }
    },
    [saveDarkModePreference]
  );

  // Initialize on mount
  useEffect(() => {
    loadDarkModePreference();
  }, [loadDarkModePreference]);

  return {
    isDarkMode,
    useSystemPreference,
    systemPreference: systemColorScheme,
    toggleDarkMode,
    useSystemDarkMode,
    setDarkMode,
  };
}
