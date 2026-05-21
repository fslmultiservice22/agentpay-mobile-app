import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

interface BalanceSyncState {
  balance: string;
  lastUpdated: number;
  isLoading: boolean;
  error: string | null;
}

interface BalanceSyncOptions {
  address: string;
  provider: ethers.Provider | null;
  interval?: number; // milliseconds, default 10000 (10 seconds)
  enabled?: boolean;
}

export function useBalanceSync({
  address,
  provider,
  interval = 10000,
  enabled = true,
}: BalanceSyncOptions) {
  const [state, setState] = useState<BalanceSyncState>({
    balance: '0',
    lastUpdated: 0,
    isLoading: false,
    error: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Funzione per aggiornare il balance
  const updateBalance = useCallback(async () => {
    if (!provider || !address || !ethers.isAddress(address)) {
      setState(prev => ({
        ...prev,
        error: 'Invalid provider or address',
      }));
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      const balanceWei = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balanceWei);

      if (isMountedRef.current) {
        setState({
          balance: balanceEth,
          lastUpdated: Date.now(),
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
      console.error('Balance sync error:', err);
    }
  }, [provider, address]);

  // Setup interval per aggiornamenti periodici
  useEffect(() => {
    if (!enabled || !provider || !address) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Aggiorna immediatamente
    updateBalance();

    // Configura l'intervallo
    intervalRef.current = setInterval(() => {
      updateBalance();
    }, interval) as unknown as NodeJS.Timeout;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, provider, address, interval, updateBalance]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Funzione per forzare un aggiornamento manuale
  const refresh = useCallback(async () => {
    await updateBalance();
  }, [updateBalance]);

  // Funzione per cambiare l'intervallo
  const setInterval_ = useCallback((newInterval: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (enabled && provider && address) {
      intervalRef.current = setInterval(() => {
        updateBalance();
      }, newInterval) as unknown as NodeJS.Timeout;
    }
  }, [enabled, provider, address, updateBalance]);

  return {
    balance: state.balance,
    lastUpdated: state.lastUpdated,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    setInterval: setInterval_,
  };
}
