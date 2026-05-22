import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations as TRANSLATIONS, type Language } from '@/lib/i18n/translations';

export type { Language };

const LANGUAGE_STORAGE_KEY = 'agentpay_language';
const DEFAULT_LANGUAGE: Language = 'en';

/**
 * Hook for multi-language support
 * Manages language selection, persistence, and translation retrieval
 */
export function useI18n() {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);

  // Load language from AsyncStorage on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage as Language) in TRANSLATIONS) {
          setLanguageState(savedLanguage as Language);
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Set language and persist to AsyncStorage
  const setLanguage = async (newLanguage: Language) => {
    try {
      if (newLanguage in TRANSLATIONS) {
        setLanguageState(newLanguage);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      } else {
        console.warn(`Language ${newLanguage} not supported`);
      }
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  // Get translation for a key
  const t = (key: string, defaultValue?: string): string => {
    const keys = key.split('.');
    let value: any = TRANSLATIONS[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }

    return typeof value === 'string' ? value : defaultValue || key;
  };

  // Get all available languages
  const availableLanguages = Object.keys(TRANSLATIONS) as Language[];

  // Get language name in current language
  const getLanguageName = (lang: Language): string => {
    const languageNames: Record<Language, string> = {
      en: 'English',
      it: 'Italiano',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      pt: 'Português',
      zh: '中文',
      ja: '日本語',
    };
    return languageNames[lang];
  };

  // Get language name in its own language
  const getNativeLanguageName = (lang: Language): string => {
    const nativeNames: Record<Language, string> = {
      en: 'English',
      it: 'Italiano',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      pt: 'Português',
      zh: '中文',
      ja: '日本語',
    };
    return nativeNames[lang];
  };

  return {
    language,
    setLanguage,
    t,
    isLoading,
    availableLanguages,
    getLanguageName,
    getNativeLanguageName,
  };
}

// Legacy function for backward compatibility
export function useI18nLegacy() {
  const { language, setLanguage, t, availableLanguages } = useI18n();

  return {
    language,
    changeLanguage: setLanguage,
    t,
    getAvailableLanguages: () => availableLanguages,
  };
}
