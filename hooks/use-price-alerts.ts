import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PriceAlert {
  id: string;
  token: string;
  symbol: string;
  targetPrice: string;
  condition: 'above' | 'below';
  currentPrice: string;
  status: 'active' | 'triggered' | 'cancelled';
  createdAt: number;
  triggeredAt?: number;
  notificationSent: boolean;
}

interface PriceAlertState {
  alerts: PriceAlert[];
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'agentpay_price_alerts';
const MAX_ALERTS = 100;

export function usePriceAlerts(address: string | null) {
  const [state, setState] = useState<PriceAlertState>({
    alerts: [],
    isLoading: false,
    error: null,
  });

  const isMountedRef = useRef(true);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carica gli alert dal storage
  const loadAlerts = useCallback(async () => {
    if (!address) return;

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
      const alerts: PriceAlert[] = stored ? JSON.parse(stored) : [];

      if (isMountedRef.current) {
        setState({
          alerts,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load price alerts';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    }
  }, [address]);

  // Carica gli alert al mount
  useEffect(() => {
    loadAlerts();
  }, [address, loadAlerts]);

  // Crea un nuovo price alert
  const createAlert = useCallback(
    async (token: string, symbol: string, targetPrice: string, condition: 'above' | 'below'): Promise<PriceAlert | null> => {
      if (!address) return null;

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida i parametri
        if (parseFloat(targetPrice) <= 0) {
          throw new Error('Invalid target price');
        }

        // Crea il nuovo alert
        const newAlert: PriceAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          token,
          symbol,
          targetPrice,
          condition,
          currentPrice: '0',
          status: 'active',
          createdAt: Date.now(),
          notificationSent: false,
        };

        // Carica gli alert precedenti
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let alerts: PriceAlert[] = stored ? JSON.parse(stored) : [];

        // Aggiungi il nuovo alert
        alerts.unshift(newAlert);

        // Mantieni solo i MAX_ALERTS più recenti
        alerts = alerts.slice(0, MAX_ALERTS);

        // Salva nel storage
        await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(alerts));

        if (isMountedRef.current) {
          setState({
            alerts,
            isLoading: false,
            error: null,
          });
        }

        return newAlert;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create price alert';
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: errorMessage,
          }));
        }
        return null;
      }
    },
    [address],
  );

  // Cancella un price alert
  const cancelAlert = useCallback(
    async (alertId: string): Promise<boolean> => {
      if (!address) return false;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let alerts: PriceAlert[] = stored ? JSON.parse(stored) : [];

        // Trova e cancella l'alert
        const alertIndex = alerts.findIndex(a => a.id === alertId);
        if (alertIndex !== -1) {
          alerts[alertIndex].status = 'cancelled';

          // Salva nel storage
          await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(alerts));

          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              alerts,
            }));
          }

          return true;
        }

        return false;
      } catch (err) {
        console.error('Failed to cancel alert:', err);
        return false;
      }
    },
    [address],
  );

  // Aggiorna il prezzo corrente e controlla se gli alert devono essere triggerati
  const updatePriceAndCheck = useCallback(
    async (token: string, currentPrice: string) => {
      if (!address) return;

      try {
        const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
        let alerts: PriceAlert[] = stored ? JSON.parse(stored) : [];

        let updated = false;
        const triggeredAlerts: PriceAlert[] = [];

        alerts = alerts.map(alert => {
          if (alert.token === token && alert.status === 'active') {
            const currentPriceNum = parseFloat(currentPrice);
            const targetPriceNum = parseFloat(alert.targetPrice);

            // Controlla se il prezzo ha raggiunto il target
            const shouldTrigger =
              (alert.condition === 'above' && currentPriceNum >= targetPriceNum) ||
              (alert.condition === 'below' && currentPriceNum <= targetPriceNum);

            if (shouldTrigger && !alert.notificationSent) {
              updated = true;
              triggeredAlerts.push(alert);
              return {
                ...alert,
                status: 'triggered',
                currentPrice,
                triggeredAt: Date.now(),
                notificationSent: true,
              };
            }

            // Aggiorna il prezzo corrente
            return {
              ...alert,
              currentPrice,
            };
          }

          return alert;
        });

        if (updated) {
          // Salva nel storage
          await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(alerts));

          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              alerts,
            }));
          }

          // Ritorna gli alert triggerati per inviare notifiche
          return triggeredAlerts;
        }

        return [];
      } catch (err) {
        console.error('Failed to update price and check alerts:', err);
        return [];
      }
    },
    [address],
  );

  // Ottieni gli alert attivi
  const getActiveAlerts = useCallback((): PriceAlert[] => {
    return state.alerts.filter(alert => alert.status === 'active');
  }, [state.alerts]);

  // Ottieni gli alert triggerati
  const getTriggeredAlerts = useCallback((): PriceAlert[] => {
    return state.alerts.filter(alert => alert.status === 'triggered');
  }, [state.alerts]);

  // Pulisci gli alert triggerati
  const cleanupTriggeredAlerts = useCallback(async () => {
    if (!address) return;

    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${address}`);
      let alerts: PriceAlert[] = stored ? JSON.parse(stored) : [];

      const beforeCount = alerts.length;

      // Rimuovi gli alert triggerati più vecchi di 7 giorni
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      alerts = alerts.filter(alert => !(alert.status === 'triggered' && alert.triggeredAt && alert.triggeredAt < sevenDaysAgo));

      // Salva nel storage
      await AsyncStorage.setItem(`${STORAGE_KEY}_${address}`, JSON.stringify(alerts));

      if (isMountedRef.current && alerts.length !== beforeCount) {
        setState(prev => ({
          ...prev,
          alerts,
        }));
      }
    } catch (err) {
      console.error('Failed to cleanup triggered alerts:', err);
    }
  }, [address]);

  // Avvia il controllo periodico degli alert
  const startPeriodicCheck = useCallback(() => {
    if (checkIntervalRef.current) return;

    checkIntervalRef.current = setInterval(() => {
      cleanupTriggeredAlerts();
    }, 60000) as unknown as NodeJS.Timeout; // Controlla ogni minuto
  }, [cleanupTriggeredAlerts]);

  // Ferma il controllo periodico
  const stopPeriodicCheck = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopPeriodicCheck();
    };
  }, [stopPeriodicCheck]);

  return {
    alerts: state.alerts,
    isLoading: state.isLoading,
    error: state.error,
    createAlert,
    cancelAlert,
    updatePriceAndCheck,
    getActiveAlerts,
    getTriggeredAlerts,
    cleanupTriggeredAlerts,
    startPeriodicCheck,
    stopPeriodicCheck,
    loadAlerts,
  };
}
