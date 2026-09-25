import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Social Login Screen (v88)', () => {
  const content = readFileSync(path.join(ROOT, 'app/social-login.tsx'), 'utf-8');

  it('exports a default component', () => {
    expect(content).toContain('export default function SocialLoginScreen');
  });

  it('uses SOCIAL_ACCOUNTS_KEY constant', () => {
    expect(content).toContain("SOCIAL_ACCOUNTS_KEY = 'social_accounts'");
  });

  it('has all 8 social platforms in PLATFORM_ORDER', () => {
    expect(content).toContain("'twitter'");
    expect(content).toContain("'instagram'");
    expect(content).toContain("'facebook'");
    expect(content).toContain("'discord'");
    expect(content).toContain("'telegram'");
    expect(content).toContain("'linkedin'");
    expect(content).toContain("'tiktok'");
    expect(content).toContain("'youtube'");
  });

  it('has DEMO_ACCOUNTS for all platforms', () => {
    expect(content).toContain('DEMO_ACCOUNTS');
    expect(content).toContain('demo_token_twitter');
    expect(content).toContain('demo_token_discord');
    expect(content).toContain('demo_token_telegram');
  });

  it('has handleConnect and handleDisconnect', () => {
    expect(content).toContain('handleConnect');
    expect(content).toContain('handleDisconnect');
  });

  it('saves accounts to AsyncStorage', () => {
    expect(content).toContain('AsyncStorage.setItem');
    expect(content).toContain('AsyncStorage.getItem');
  });

  it('uses Platform check for haptics', () => {
    expect(content).toContain("Platform.OS !== 'web'");
  });

  it('has back navigation', () => {
    expect(content).toContain('router.back()');
  });
});

describe('Social Settings Screen (v88)', () => {
  const content = readFileSync(path.join(ROOT, 'app/social-settings.tsx'), 'utf-8');

  it('exports a default component', () => {
    expect(content).toContain('export default function SocialSettingsScreen');
  });

  it('has SocialPrefs interface with all fields', () => {
    expect(content).toContain('autoShareTrades');
    expect(content).toContain('autoShareMilestones');
    expect(content).toContain('autoShareAchievements');
    expect(content).toContain('enabledPlatforms');
    expect(content).toContain('sharePortfolioValue');
    expect(content).toContain('shareUsername');
  });

  it('uses SOCIAL_PREFS_KEY for persistence', () => {
    expect(content).toContain("SOCIAL_PREFS_KEY = 'social_share_prefs'");
  });

  it('has useFocusEffect for data reload', () => {
    expect(content).toContain('useFocusEffect');
  });

  it('has togglePref and togglePlatform', () => {
    expect(content).toContain('togglePref');
    expect(content).toContain('togglePlatform');
  });

  it('has disconnect all functionality', () => {
    expect(content).toContain('handleDisconnectAll');
    expect(content).toContain('Disconnetti tutti');
  });

  it('links to social-login screen', () => {
    expect(content).toContain("router.push('/social-login')");
  });

  it('uses Switch component for toggles', () => {
    expect(content).toContain('Switch');
  });
});

describe('Layout registration (v88)', () => {
  const layout = readFileSync(path.join(ROOT, 'app/_layout.tsx'), 'utf-8');

  it('registers social-login route', () => {
    expect(layout).toContain('name="social-login"');
  });

  it('registers social-settings route', () => {
    expect(layout).toContain('name="social-settings"');
  });
});

describe('Settings screen isolation (v88)', () => {
  const settings = readFileSync(path.join(ROOT, 'app/(tabs)/settings.tsx'), 'utf-8');

  it('does not reopen legacy social connection from the technical settings tab', () => {
    expect(settings).not.toContain("router.push('/social-login')");
    expect(settings).not.toContain("router.push('/social-settings')");
  });

  it('keeps only technical navigation in the active settings tab', () => {
    expect(settings).toContain('Impostazioni tecniche');
    expect(settings).toContain('Monitor tecnico');
    expect(settings).toContain('Registro tecnico');
  });
});
