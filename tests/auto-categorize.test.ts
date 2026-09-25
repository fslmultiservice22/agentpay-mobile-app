import { describe, it, expect } from 'vitest';
import { autoCategorize } from '../lib/auto-categorize';

describe('Auto-Categorize Service', () => {
  it('should categorize supermarket purchases as Alimentari', () => {
    const result = autoCategorize('Esselunga S.p.A.', 'Spesa settimanale');
    expect(result.category).toBe('Alimentari');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should categorize fuel as Trasporti', () => {
    const result = autoCategorize('ENI Station', 'Rifornimento benzina');
    expect(result.category).toBe('Trasporti');
  });

  it('should categorize Netflix as Abbonamenti', () => {
    const result = autoCategorize('Netflix', 'Abbonamento mensile');
    expect(result.category).toBe('Abbonamenti');
  });

  it('should categorize restaurant as Ristorazione', () => {
    const result = autoCategorize('Ristorante Da Mario', 'Cena');
    expect(result.category).toBe('Ristorazione');
  });

  it('should categorize pharmacy as Salute', () => {
    const result = autoCategorize('Farmacia Comunale', 'Medicinali');
    expect(result.category).toBe('Salute');
  });

  it('should categorize utility bills as Utenze', () => {
    const result = autoCategorize('ENEL Energia', 'Bolletta luce');
    expect(result.category).toBe('Utenze');
  });

  it('should return Altro for unknown recipients', () => {
    const result = autoCategorize('Mario Rossi', 'Trasferimento');
    expect(result.category).toBe('Altro');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should be case insensitive', () => {
    const result = autoCategorize('LIDL ITALIA', '');
    expect(result.category).toBe('Alimentari');
  });

  it('should match on description too', () => {
    const result = autoCategorize('Pagamento', 'parcheggio centro');
    expect(result.category).toBe('Trasporti');
  });

  it('should categorize insurance as Assicurazioni', () => {
    const result = autoCategorize('Generali Italia', 'Polizza auto');
    expect(result.category).toBe('Assicurazioni');
  });
});
