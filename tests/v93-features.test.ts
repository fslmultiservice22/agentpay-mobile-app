/**
 * Test v93 — SpendingForecast, PdfReportsWidget, FinancialPlanner History
 */
import { describe, it, expect } from 'vitest';

// ─── Spending Forecast Logic ──────────────────────────────────────────────────

function calcForecast(currentSpend: number, currentDay: number, daysInMonth: number) {
  const daysLeft = daysInMonth - currentDay;
  const dailyAvg = currentDay > 0 ? currentSpend / currentDay : 0;
  return currentSpend + dailyAvg * daysLeft;
}

function forecastStatus(
  forecastEOM: number,
  budget: number,
  avg3m: number
): 'ok' | 'warning' | 'over' {
  if (budget > 0) {
    if (forecastEOM > budget) return 'over';
    if (forecastEOM > budget * 0.8) return 'warning';
    return 'ok';
  }
  if (forecastEOM > avg3m * 1.2) return 'warning';
  return 'ok';
}

describe('SpendingForecast — calcForecast', () => {
  it('proietta correttamente a fine mese con spesa uniforme', () => {
    // Giorno 10, speso 300 → media 30/giorno → proiezione 30 * 30 = 900
    const forecast = calcForecast(300, 10, 30);
    expect(forecast).toBeCloseTo(900, 0);
  });

  it('restituisce la spesa attuale se siamo all\'ultimo giorno', () => {
    const forecast = calcForecast(500, 31, 31);
    expect(forecast).toBeCloseTo(500, 0);
  });

  it('gestisce currentDay = 0 senza divisione per zero', () => {
    const forecast = calcForecast(0, 0, 30);
    expect(forecast).toBe(0);
  });

  it('proiezione cresce con più giorni rimanenti', () => {
    const earlyForecast = calcForecast(100, 5, 30);  // 25 giorni rimanenti
    const lateForecast = calcForecast(100, 25, 30);  // 5 giorni rimanenti
    expect(earlyForecast).toBeGreaterThan(lateForecast);
  });
});

describe('SpendingForecast — forecastStatus', () => {
  it('over quando proiezione supera il budget', () => {
    expect(forecastStatus(1200, 1000, 900)).toBe('over');
  });

  it('warning quando proiezione è tra 80% e 100% del budget', () => {
    expect(forecastStatus(850, 1000, 700)).toBe('warning');
  });

  it('ok quando proiezione è sotto l\'80% del budget', () => {
    expect(forecastStatus(700, 1000, 800)).toBe('ok');
  });

  it('warning senza budget se proiezione > 120% della media storica', () => {
    expect(forecastStatus(1300, 0, 1000)).toBe('warning');
  });

  it('ok senza budget se proiezione <= 120% della media storica', () => {
    expect(forecastStatus(1100, 0, 1000)).toBe('ok');
  });
});

// ─── PDF Reports — formato JSON strutturato ───────────────────────────────────

interface PdfReportPayload {
  month: string;
  savedAt: string;
  content: string;
  income: number;
  recurring: number;
  goalsSavings: number;
  available: number;
  savingsRate: number;
}

function parsePdfReportEntry(raw: string): { title: string; content: string } {
  try {
    const parsed = JSON.parse(raw) as PdfReportPayload;
    if (parsed && typeof parsed === 'object' && parsed.content) {
      return { title: `Piano ${parsed.month ?? 'Mensile'}`, content: parsed.content };
    }
  } catch { /* fallback */ }
  const firstLine = raw.split('\n')[0] || 'Report Finanziario';
  return { title: firstLine.replace(/^[=\s]+/, '').replace(/[=\s]+$/, ''), content: raw };
}

describe('PdfReports — parsePdfReportEntry', () => {
  it('legge correttamente il nuovo formato JSON strutturato', () => {
    const payload: PdfReportPayload = {
      month: 'giugno 2026',
      savedAt: new Date().toISOString(),
      content: 'PIANO FINANZIARIO MENSILE — GIUGNO 2026\nReddito: €3.000',
      income: 3000,
      recurring: 800,
      goalsSavings: 200,
      available: 2000,
      savingsRate: 6.7,
    };
    const result = parsePdfReportEntry(JSON.stringify(payload));
    expect(result.title).toBe('Piano giugno 2026');
    expect(result.content).toContain('PIANO FINANZIARIO');
  });

  it('gestisce il formato legacy (testo semplice)', () => {
    const legacy = 'PIANO FINANZIARIO MENSILE — MAGGIO 2026\nReddito: €2.500';
    const result = parsePdfReportEntry(legacy);
    expect(result.title).toContain('PIANO FINANZIARIO');
    expect(result.content).toBe(legacy);
  });

  it('usa titolo di fallback per JSON malformato', () => {
    const result = parsePdfReportEntry('{invalid json}');
    expect(result.title).toBe('{invalid json}');
  });

  it('usa titolo di fallback per JSON senza campo content', () => {
    const result = parsePdfReportEntry(JSON.stringify({ month: 'aprile' }));
    expect(result.title).toBe('{"month":"aprile"}');
  });
});

// ─── Financial Planner History ────────────────────────────────────────────────

interface PlanHistoryEntry {
  month: string;
  savedAt: string;
  income: number;
  recurring: number;
  goalsSavings: number;
  available: number;
  savingsRate: number;
}

function addToHistory(
  history: PlanHistoryEntry[],
  entry: PlanHistoryEntry,
  maxEntries = 6
): PlanHistoryEntry[] {
  return [entry, ...history].slice(0, maxEntries);
}

describe('FinancialPlanner — storico piani', () => {
  it('aggiunge un nuovo piano in cima allo storico', () => {
    const existing: PlanHistoryEntry[] = [
      { month: 'maggio 2026', savedAt: '2026-05-31T12:00:00Z', income: 3000, recurring: 800, goalsSavings: 200, available: 2000, savingsRate: 6.7 },
    ];
    const newEntry: PlanHistoryEntry = {
      month: 'giugno 2026', savedAt: '2026-06-30T12:00:00Z', income: 3200, recurring: 850, goalsSavings: 250, available: 2100, savingsRate: 7.8,
    };
    const result = addToHistory(existing, newEntry);
    expect(result[0].month).toBe('giugno 2026');
    expect(result[1].month).toBe('maggio 2026');
  });

  it('limita lo storico a 6 voci', () => {
    const history: PlanHistoryEntry[] = Array.from({ length: 6 }, (_, i) => ({
      month: `mese ${i + 1}`, savedAt: new Date().toISOString(),
      income: 3000, recurring: 800, goalsSavings: 200, available: 2000, savingsRate: 6.7,
    }));
    const newEntry: PlanHistoryEntry = {
      month: 'mese 7', savedAt: new Date().toISOString(),
      income: 3100, recurring: 820, goalsSavings: 210, available: 2070, savingsRate: 6.8,
    };
    const result = addToHistory(history, newEntry);
    expect(result.length).toBe(6);
    expect(result[0].month).toBe('mese 7');
  });

  it('calcola correttamente il tasso di risparmio', () => {
    const income = 3000;
    const goalsSavings = 300;
    const savingsRate = income > 0 ? (goalsSavings / income) * 100 : 0;
    expect(savingsRate).toBeCloseTo(10, 1);
  });

  it('gestisce storico vuoto', () => {
    const entry: PlanHistoryEntry = {
      month: 'giugno 2026', savedAt: new Date().toISOString(),
      income: 3000, recurring: 800, goalsSavings: 200, available: 2000, savingsRate: 6.7,
    };
    const result = addToHistory([], entry);
    expect(result.length).toBe(1);
    expect(result[0].month).toBe('giugno 2026');
  });
});
