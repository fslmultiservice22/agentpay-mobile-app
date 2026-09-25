/**
 * Test v90: compatibilità delle route legacy e isolamento della Home tecnica.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('v90 — Home tecnica: nessun widget social o finanziario attivo', () => {
  const indexContent = fs.readFileSync(path.join(ROOT, 'app/(tabs)/index.tsx'), 'utf-8');

  it('presenta la dashboard tecnica e il relativo messaggio di indisponibilità', () => {
    expect(indexContent).toContain('Dashboard tecnica');
    expect(indexContent).toContain('Connessione finanziaria non disponibile');
  });

  it('collega esclusivamente gli strumenti tecnici consentiti', () => {
    expect(indexContent).toContain('router.push("/dashboard")');
    expect(indexContent).toContain('router.push("/monitor-log")');
  });

  it('non reintroduce feed, trasferimenti o provider wallet', () => {
    expect(indexContent).not.toContain('/social-feed');
    expect(indexContent).not.toContain('useEthereumWallet');
    expect(indexContent).not.toContain('useBankAccounts');
  });

  it('esplicita che i dati finanziari non sono disponibili', () => {
    expect(indexContent).toContain('Dati di conto disattivati');
  });
});

describe('v90 — FinancialPlannerScreen: perimetro tecnico', () => {
  const plannerContent = fs.readFileSync(path.join(ROOT, 'app/financial-planner.tsx'), 'utf-8');

  it('mantiene il percorso ma usa la guardia tecnica comune', () => {
    expect(plannerContent).toContain('FinancialRouteGuard');
    expect(plannerContent).toContain('pathname="/financial-planner"');
  });

  it('non esporta né condivide dati legacy', () => {
    expect(plannerContent).not.toContain('AsyncStorage');
    expect(plannerContent).not.toContain('agentpay_social_feed');
    expect(plannerContent).not.toContain('exportPDF');
  });
});

describe('v90 — SocialSettingsScreen: link rapido a /social-feed', () => {
  const settingsContent = fs.readFileSync(path.join(ROOT, 'app/social-settings.tsx'), 'utf-8');

  it('social-settings.tsx ha il pulsante Feed nel header', () => {
    expect(settingsContent).toContain('Feed');
  });

  it('social-settings.tsx naviga a /social-feed', () => {
    expect(settingsContent).toContain('/social-feed');
  });
});

describe('v90 — Route registrations', () => {
  const layoutContent = fs.readFileSync(path.join(ROOT, 'app/_layout.tsx'), 'utf-8');

  it('_layout.tsx ha social-feed registrata', () => {
    expect(layoutContent).toContain('social-feed');
  });

  it('_layout.tsx ha financial-planner registrata', () => {
    expect(layoutContent).toContain('financial-planner');
  });

  it('_layout.tsx ha social-login registrata', () => {
    expect(layoutContent).toContain('social-login');
  });

  it('_layout.tsx ha social-settings registrata', () => {
    expect(layoutContent).toContain('social-settings');
  });
});

describe('v90 — Widget order', () => {
  const widgetOrder = fs.readFileSync(path.join(ROOT, 'lib/widget-order.ts'), 'utf-8');

  it('widget-order.ts mantiene il catalogo inattivo', () => {
    expect(widgetOrder).toContain('export const ALL_WIDGETS: WidgetDef[] = []');
  });

  it('widget-order.ts filtra le preferenze legacy non supportate', () => {
    expect(widgetOrder).toContain('const supportedOrder = order.filter');
  });

  it('widget-order.ts non reinserisce widget finanziari nelle preferenze', () => {
    expect(widgetOrder).toContain('hidden.filter((id) => allIds.includes(id))');
  });
});
