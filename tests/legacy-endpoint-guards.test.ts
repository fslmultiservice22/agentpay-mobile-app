import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appUpdateChecker } from '../lib/app-update-checker';
import { OTAUpdateService } from '../lib/ota-update-service';

afterEach(() => vi.unstubAllGlobals());

describe('beta tecnica: endpoint e funzioni non verificate', () => {
  it('non incorpora più host AgentPay omonimi nei generatori di link o negli updater', () => {
    const protectedFiles = [
      'hooks/use-payment-links.ts',
      'hooks/use-referral-program.ts',
      'lib/app-update-checker.ts',
      'lib/ota-update-service.ts',
    ];
    for (const file of protectedFiles) {
      const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
      expect(source, file).not.toMatch(/(?:https?:\/\/|wss?:\/\/)(?:api\.)?agentpay\.(?:app|com|io)/i);
    }
  });

  it('non genera un link di pagamento né un link referral se il modulo viene importato', () => {
    const payment = readFileSync(new URL('../hooks/use-payment-links.ts', import.meta.url), 'utf8');
    const referral = readFileSync(new URL('../hooks/use-referral-program.ts', import.meta.url), 'utf8');
    expect(payment).toContain('Promise<never>');
    expect(payment).not.toContain('Share.share(');
    expect(referral).toContain("referralLink: ''");
    expect(referral).toContain('return false;');
  });

  it('non contatta la rete per verificare aggiornamenti non configurati', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(appUpdateChecker.checkForUpdates()).resolves.toMatchObject({ updateAvailable: false });
    const ota = new OTAUpdateService('https://example.invalid');
    await expect(ota.checkForUpdates()).resolves.toMatchObject({ updateAvailable: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('non dichiara di aver scaricato o installato un aggiornamento fittizio', async () => {
    const ota = new OTAUpdateService();
    const sample = {
      version: '2.0.0', buildNumber: 2, releaseDate: '2026-10-01', changelog: [],
      downloadUrl: 'https://example.invalid/update', isRequired: false,
    };
    await expect(ota.downloadUpdate(sample)).resolves.toBe(false);
    await expect(ota.installUpdate()).resolves.toBe(false);
    await expect(ota.getPendingUpdate()).resolves.toBeNull();
    await expect(appUpdateChecker.downloadAndInstallUpdate(sample.downloadUrl)).resolves.toBe(false);
  });
});
