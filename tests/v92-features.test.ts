/**
 * Tests v92: /pdf-reports, /social-profile improvements (edit name/bio, share), /budget-vs-actual
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const pdfReports = readFileSync(new URL('../app/pdf-reports.tsx', import.meta.url), 'utf-8');
const socialProfile = readFileSync(new URL('../app/social-profile.tsx', import.meta.url), 'utf-8');
const settings = readFileSync(new URL('../app/(tabs)/settings.tsx', import.meta.url), 'utf-8');
const layout = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf-8');
const budgetVsActual = readFileSync(new URL('../app/budget-vs-actual.tsx', import.meta.url), 'utf-8');

describe('v92 — /pdf-reports', () => {
  it('file exists and exports default component', () => {
    expect(pdfReports).toContain('export default function PdfReportsScreen');
  });
  it('è protetta dalla guardia tecnica senza archivio, condivisione o export', () => {
    expect(pdfReports).toContain('FinancialRouteGuard');
    expect(pdfReports).toContain('pathname="/pdf-reports"');
    expect(pdfReports).not.toContain('AsyncStorage');
    expect(pdfReports).not.toContain('Share.share');
    expect(pdfReports).not.toContain('printToFileAsync');
  });
  it('is registered in _layout.tsx', () => {
    expect(layout).toContain('name="pdf-reports"');
  });
  it('is not linked from the technical settings tab', () => {
    expect(settings).not.toContain('/pdf-reports');
    expect(settings).toContain('Impostazioni tecniche');
  });
});

describe('v92 — /social-profile improvements', () => {
  it('has edit modal for name and bio', () => {
    expect(socialProfile).toContain('editModalVisible');
    expect(socialProfile).toContain('Modal');
  });
  it('saves profile to AsyncStorage', () => {
    expect(socialProfile).toContain('agentpay_social_user_profile');
    expect(socialProfile).toContain('AsyncStorage.setItem');
  });
  it('loads saved profile on focus', () => {
    expect(socialProfile).toContain('USER_PROFILE');
    expect(socialProfile).toContain('profileRaw');
  });
  it('displays user bio', () => {
    expect(socialProfile).toContain('userBio');
    expect(socialProfile).toContain('userProfile.bio');
  });
  it('has edit button to open modal', () => {
    expect(socialProfile).toContain('openEditModal');
    expect(socialProfile).toContain('Modifica profilo');
  });
  it('share profile includes name and bio', () => {
    expect(socialProfile).toContain('userProfile.displayName');
    expect(socialProfile).toContain('Share.share');
  });
  it('has char count for bio', () => {
    expect(socialProfile).toContain('charCount');
    expect(socialProfile).toContain('editBio.length');
  });
});

describe('v92 — /budget-vs-actual', () => {
  it('file exists and exports default component', () => {
    expect(budgetVsActual).toContain('export default function BudgetVsActualScreen');
  });
  it('è protetta dalla guardia tecnica senza calcoli legacy', () => {
    expect(budgetVsActual).toContain('FinancialRouteGuard');
    expect(budgetVsActual).toContain('pathname="/budget-vs-actual"');
    expect(budgetVsActual).not.toContain('useBankAccounts');
  });
  it('is registered in _layout.tsx', () => {
    expect(layout).toContain('name="budget-vs-actual"');
  });
});
