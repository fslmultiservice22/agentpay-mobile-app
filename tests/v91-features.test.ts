/**
 * Tests v91: social-profile, exportPDF, social-profile route, social-settings improvements
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const socialProfile = readFileSync(new URL('../app/social-profile.tsx', import.meta.url), 'utf-8');
const financialPlanner = readFileSync(new URL('../app/financial-planner.tsx', import.meta.url), 'utf-8');
const socialSettings = readFileSync(new URL('../app/social-settings.tsx', import.meta.url), 'utf-8');
const layout = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf-8');

describe('v91 — /social-profile', () => {
  it('file exists and exports default component', () => {
    expect(socialProfile).toContain('export default function SocialProfileScreen');
  });
  it('loads social accounts from AsyncStorage', () => {
    expect(socialProfile).toContain('STORAGE_KEYS');
    expect(socialProfile).toContain('AsyncStorage.getItem');
  });
  it('shows statistics section', () => {
    expect(socialProfile).toContain('piattaforme');
  });
  it('shows milestones section', () => {
    expect(socialProfile).toContain('ilestone');
  });
  it('has useFocusEffect for data refresh', () => {
    expect(socialProfile).toContain('useFocusEffect');
  });
  it('navigates back correctly', () => {
    expect(socialProfile).toContain('router.back');
  });
});

describe('v91 — /financial-planner protetto', () => {
  it('rende esclusivamente la guardia tecnica per il percorso legacy', () => {
    expect(financialPlanner).toContain('FinancialRouteGuard');
    expect(financialPlanner).toContain('pathname="/financial-planner"');
  });
  it('non genera PDF, report o archivi', () => {
    expect(financialPlanner).not.toContain('AsyncStorage');
    expect(financialPlanner).not.toContain('exportPDF');
    expect(financialPlanner).not.toContain('picture-as-pdf');
  });
});

describe('v91 — social-settings improvements', () => {
  it('has Profilo button in header', () => {
    expect(socialSettings).toContain('/social-profile');
  });
  it('Profilo button uses success color', () => {
    expect(socialSettings).toContain('colors.success');
  });
  it('Feed button still present', () => {
    expect(socialSettings).toContain('/social-feed');
  });
});

describe('v91 — layout registration', () => {
  it('social-profile is registered in _layout.tsx', () => {
    expect(layout).toContain('name="social-profile"');
  });
});
