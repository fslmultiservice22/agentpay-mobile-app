/**
 * Hook per la valuta predefinita
 *
 * Legge la valuta preferita da AsyncStorage e la espone
 * insieme alla funzione di formattazione.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  type Currency,
  CURRENCIES,
  getPreferredCurrency,
  formatInCurrency,
  convertFromEur,
} from '@/lib/currency-service';

export function useCurrency() {
  const [currency, setCurrency] = useState<Currency>('EUR');

  useFocusEffect(
    useCallback(() => {
      getPreferredCurrency().then(setCurrency);
    }, [])
  );

  const format = useCallback(
    (amountEur: number) => formatInCurrency(amountEur, currency),
    [currency]
  );

  const convert = useCallback(
    (amountEur: number) => convertFromEur(amountEur, currency),
    [currency]
  );

  return {
    currency,
    currencyInfo: CURRENCIES[currency],
    format,
    convert,
  };
}
