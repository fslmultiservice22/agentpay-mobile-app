/**
 * Hook: useUnreadNotificationsCount
 *
 * Restituisce il numero di notifiche non lette dal log locale.
 * Si aggiorna ogni volta che l'app torna in foreground e ogni 30 secondi.
 * Ascolta anche l'evento 'agentpay:newNotification' per aggiornamenti in tempo reale.
 */
import { useState, useEffect, useCallback } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { getUnreadCount } from '@/lib/notification-log';

export function useUnreadNotificationsCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const n = await getUnreadCount();
      setCount(n);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    refresh();

    // Aggiorna quando l'app torna in foreground
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    // Aggiorna ogni 30 secondi
    const interval = setInterval(refresh, 30_000);

    // Aggiorna in tempo reale quando arriva una nuova notifica
    const eventSub = DeviceEventEmitter.addListener('agentpay:newNotification', refresh);

    return () => {
      appStateSub.remove();
      clearInterval(interval);
      eventSub.remove();
    };
  }, [refresh]);

  return count;
}
