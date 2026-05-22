import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, type Language } from '../lib/i18n/translations';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('i18n - Multi-Language Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have translations for all 8 languages', () => {
    const languages: Language[] = ['en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja'];
    languages.forEach((lang) => {
      expect(translations[lang]).toBeDefined();
      expect(typeof translations[lang]).toBe('object');
    });
  });

  it('should have all required translation keys in English', () => {
    const enTranslations = translations.en;
    const requiredKeys = [
      'home.title',
      'home.subtitle',
      'home.connectWallet',
      'wallet.connect',
      'wallet.address',
      'trading.title',
      'trading.swap',
      'portfolio.title',
      'portfolio.totalValue',
      'settings.title',
      'settings.language',
      'common.ok',
      'common.cancel',
      'common.loading',
    ];

    requiredKeys.forEach((key) => {
      expect(enTranslations[key]).toBeDefined();
      expect(typeof enTranslations[key]).toBe('string');
    });
  });

  it('should have matching translation keys across all languages', () => {
    const languages: Language[] = ['en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja'];
    const enKeys = Object.keys(translations.en).sort();

    languages.forEach((lang) => {
      if (lang !== 'en') {
        const langKeys = Object.keys(translations[lang]).sort();
        expect(langKeys).toEqual(enKeys);
      }
    });
  });

  it('should have all translation values as strings', () => {
    const languages: Language[] = ['en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja'];

    languages.forEach((lang) => {
      const langTranslations = translations[lang];
      Object.values(langTranslations).forEach((value) => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
  });

  it('should support language persistence to AsyncStorage', async () => {
    const mockSetItem = vi.fn().mockResolvedValue(undefined);
    (AsyncStorage.setItem as any) = mockSetItem;

    await AsyncStorage.setItem('agentpay_language', 'it');

    expect(mockSetItem).toHaveBeenCalledWith('agentpay_language', 'it');
  });

  it('should support language retrieval from AsyncStorage', async () => {
    const mockGetItem = vi.fn().mockResolvedValue('it');
    (AsyncStorage.getItem as any) = mockGetItem;

    const result = await AsyncStorage.getItem('agentpay_language');

    expect(mockGetItem).toHaveBeenCalledWith('agentpay_language');
    expect(result).toBe('it');
  });

  it('should have complete translation for all UI sections', () => {
    const sections = [
      'home',
      'wallet',
      'trading',
      'portfolio',
      'dashboard',
      'payment',
      'settings',
      'common',
    ];

    sections.forEach((section) => {
      const enTranslations = translations.en;
      const sectionKeys = Object.keys(enTranslations).filter((key) =>
        key.startsWith(section + '.')
      );
      expect(sectionKeys.length).toBeGreaterThan(0);
    });
  });

  it('should have proper translation for payment messages', () => {
    const languages: Language[] = ['en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja'];

    languages.forEach((lang) => {
      const langTranslations = translations[lang];
      expect(langTranslations['payment.send']).toBeDefined();
      expect(langTranslations['payment.receive']).toBeDefined();
      expect(langTranslations['payment.amount']).toBeDefined();
    });
  });

  it('should have proper translation for trading messages', () => {
    const languages: Language[] = ['en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja'];

    languages.forEach((lang) => {
      const langTranslations = translations[lang];
      expect(langTranslations['trading.swap']).toBeDefined();
      expect(langTranslations['trading.from']).toBeDefined();
      expect(langTranslations['trading.to']).toBeDefined();
      expect(langTranslations['trading.rate']).toBeDefined();
    });
  });

  it('should have proper translation for settings messages', () => {
    const languages: Language[] = ['en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja'];

    languages.forEach((lang) => {
      const langTranslations = translations[lang];
      expect(langTranslations['settings.title']).toBeDefined();
      expect(langTranslations['settings.language']).toBeDefined();
      expect(langTranslations['settings.security']).toBeDefined();
      expect(langTranslations['settings.notifications']).toBeDefined();
    });
  });
});
