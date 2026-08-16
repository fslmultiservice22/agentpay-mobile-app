import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { translations, type Language } from '../lib/i18n/translations';

// Mock AsyncStorage: the module under test imports it at module scope.
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// `__DEV__` is a React Native global; define it for the Node test runtime.
(globalThis as Record<string, unknown>).__DEV__ = false;

const LANGUAGES: Language[] = ['en', 'it', 'es', 'fr', 'de', 'pt', 'zh', 'ja'];
const REPO_ROOT = join(__dirname, '..');

/**
 * Regression suite for the i18n lookup bug: `t()` used a nested lookup while the
 * dictionaries are flat, so every call returned the raw technical key
 * (e.g. `wallet.noConfigToExport` shown to the user in the export screen).
 */
describe('i18n lookup - flat dictionaries', () => {
  it('resolves flat dot-notation keys instead of returning the key itself', async () => {
    const { translate } = await import('../hooks/use-i18n');

    expect(translate('en', 'wallet.connect')).toBe(translations.en['wallet.connect']);
    expect(translate('it', 'wallet.connect')).toBe(translations.it['wallet.connect']);
    expect(translate('en', 'wallet.connect')).not.toBe('wallet.connect');
  });

  it('never returns a raw technical key for the wallet export empty state', async () => {
    const { translate } = await import('../hooks/use-i18n');

    for (const language of LANGUAGES) {
      const message = translate(language, 'wallet.noConfigToExport');
      expect(message).not.toBe('wallet.noConfigToExport');
      expect(message).not.toMatch(/^[a-z]+\.[a-zA-Z]+$/);
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('falls back to English when a key is missing in the active language', async () => {
    const { translate } = await import('../hooks/use-i18n');

    // Every language currently has the same keys, so simulate the gap explicitly.
    const original = translations.it['wallet.goBack'];
    delete (translations.it as Record<string, string>)['wallet.goBack'];
    try {
      expect(translate('it', 'wallet.goBack')).toBe(translations.en['wallet.goBack']);
    } finally {
      (translations.it as Record<string, string>)['wallet.goBack'] = original;
    }
  });

  it('honours the explicit default value before humanizing', async () => {
    const { translate } = await import('../hooks/use-i18n');

    expect(translate('en', 'does.not.exist', 'Fallback label')).toBe('Fallback label');
  });

  it('humanizes unknown keys so no developer identifier reaches the UI', async () => {
    const { translate, humanizeKey } = await import('../hooks/use-i18n');

    expect(humanizeKey('wallet.noConfigToExport')).toBe('No config to export');
    expect(translate('en', 'wallet.totallyUnknownKey')).toBe('Totally unknown key');
    expect(translate('en', 'wallet.totallyUnknownKey')).not.toContain('.');
  });

  it('still resolves nested dictionaries for backward compatibility', async () => {
    const { translate } = await import('../hooks/use-i18n');
    const nested = { legacy: { greeting: 'Hello' } } as unknown as Record<string, string>;

    (translations as Record<string, Record<string, string>>).__test_nested__ = nested;
    try {
      expect(translate('__test_nested__' as Language, 'legacy.greeting')).toBe('Hello');
    } finally {
      delete (translations as Record<string, Record<string, string>>).__test_nested__;
    }
  });
});

describe('i18n coverage - every key used in the app is defined', () => {
  const SOURCE_DIRS = ['app', 'components', 'hooks', 'lib'];

  function collectSourceFiles(): string[] {
    const { execSync } = require('node:child_process') as typeof import('node:child_process');
    const output = execSync(
      `find ${SOURCE_DIRS.join(' ')} -type f \\( -name '*.ts' -o -name '*.tsx' \\)`,
      { cwd: REPO_ROOT, encoding: 'utf-8' }
    );
    return output.split('\n').filter(Boolean);
  }

  it('has no t() call pointing to an undefined dot-notation key', () => {
    const defined = new Set(Object.keys(translations.en));
    const undefinedKeys = new Set<string>();

    for (const file of collectSourceFiles()) {
      const content = readFileSync(join(REPO_ROOT, file), 'utf-8');
      // Match t('section.key') / t("section.key") with a lowercase section prefix.
      const matches = content.matchAll(/\bt\(\s*['"]([a-z][a-zA-Z0-9]*\.[a-zA-Z0-9_.]+)['"]/g);
      for (const match of matches) {
        const key = match[1];
        if (!defined.has(key)) undefinedKeys.add(`${key} (${file})`);
      }
    }

    expect(Array.from(undefinedKeys).sort()).toEqual([]);
  });

  it('keeps every language dictionary aligned with English', () => {
    const englishKeys = Object.keys(translations.en).sort();
    for (const language of LANGUAGES) {
      expect(Object.keys(translations[language]).sort()).toEqual(englishKeys);
    }
  });
});
