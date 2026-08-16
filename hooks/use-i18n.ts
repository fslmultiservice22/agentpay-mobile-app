import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations as TRANSLATIONS, type Language } from '@/lib/i18n/translations';

export type { Language };

const LANGUAGE_STORAGE_KEY = 'agentpay_language';
const DEFAULT_LANGUAGE: Language = 'en';
/** Language always used as last resort before showing a human readable fallback. */
const FALLBACK_LANGUAGE: Language = 'en';

/**
 * Resolve a translation key inside a single dictionary.
 *
 * The dictionaries in `lib/i18n/translations.ts` use **flat** keys
 * (e.g. `'wallet.noConfigToExport'`), so the flat lookup is attempted first.
 * A nested lookup (`wallet` -> `noConfigToExport`) is kept as a fallback so that
 * partially nested dictionaries keep working.
 *
 * Returns `undefined` when the key cannot be resolved to a non-empty string.
 */
function resolveKey(dictionary: unknown, key: string): string | undefined {
  if (!dictionary || typeof dictionary !== 'object') return undefined;

  // 1. Flat lookup — the format actually used by the app dictionaries.
  const flat = (dictionary as Record<string, unknown>)[key];
  if (typeof flat === 'string' && flat.length > 0) return flat;

  // 2. Nested lookup — tolerated for backward compatibility.
  if (!key.includes('.')) return undefined;

  let current: unknown = dictionary;
  for (const segment of key.split('.')) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' && current.length > 0 ? current : undefined;
}

/**
 * Turn a translation key into a readable label as an absolute last resort.
 *
 * `'wallet.noConfigToExport'` becomes `'No config to export'`, so the user never
 * sees a raw developer identifier even if a key is missing in every dictionary.
 */
export function humanizeKey(key: string): string {
  const lastSegment = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key;
  const spaced = lastSegment
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/**
 * Translate a key using the given language, then the fallback language, then an
 * explicit default value, then a humanized version of the key itself.
 *
 * Exported so that non-React code (services, tests) can reuse the same logic.
 */
export function translate(language: Language, key: string, defaultValue?: string): string {
  if (!key) return defaultValue ?? '';

  const fromLanguage = resolveKey(TRANSLATIONS[language], key);
  if (fromLanguage !== undefined) return fromLanguage;

  if (language !== FALLBACK_LANGUAGE) {
    const fromFallback = resolveKey(TRANSLATIONS[FALLBACK_LANGUAGE], key);
    if (fromFallback !== undefined) return fromFallback;
  }

  if (defaultValue !== undefined && defaultValue.length > 0) return defaultValue;

  if (__DEV__) {
    console.warn(`[i18n] Missing translation key: "${key}" (language: ${language})`);
  }

  return humanizeKey(key);
}

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
  const t = useCallback(
    (key: string, defaultValue?: string): string => translate(language, key, defaultValue),
    [language]
  );

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
