/**
 * Servizio valuta predefinita
 *
 * Gestisce la valuta di visualizzazione scelta dall'utente.
 * Tassi di cambio approssimativi (aggiornati manualmente, non real-time).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Currency = 'EUR' | 'USD' | 'GBP' | 'CHF';

export const CURRENCIES: Record<Currency, { label: string; symbol: string; flag: string }> = {
  EUR: { label: 'Euro', symbol: '€', flag: '🇪🇺' },
  USD: { label: 'Dollaro USA', symbol: '$', flag: '🇺🇸' },
  GBP: { label: 'Sterlina', symbol: '£', flag: '🇬🇧' },
  CHF: { label: 'Franco Svizzero', symbol: 'Fr.', flag: '🇨🇭' },
};

// Tassi approssimativi rispetto a EUR (base)
export const APPROX_RATES: Record<Currency, number> = {
  EUR: 1.0,
  USD: 1.08,
  GBP: 0.86,
  CHF: 0.97,
};

const STORAGE_KEY = 'agentpay_preferred_currency';

export async function getPreferredCurrency(): Promise<Currency> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw && raw in CURRENCIES) return raw as Currency;
  } catch {}
  return 'EUR';
}

export async function setPreferredCurrency(currency: Currency): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, currency);
  } catch {}
}

/**
 * Converte un importo da EUR alla valuta preferita.
 * Nota: conversione approssimativa, non real-time.
 */
export function convertFromEur(amountEur: number, targetCurrency: Currency): number {
  return amountEur * APPROX_RATES[targetCurrency];
}

/**
 * Formatta un importo nella valuta target.
 */
export function formatInCurrency(amountEur: number, currency: Currency): string {
  const converted = convertFromEur(amountEur, currency);
  const { symbol } = CURRENCIES[currency];
  return `${symbol}${converted.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
