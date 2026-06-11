import { useEffect, useState, useCallback } from 'react';
import { getPriceWebSocketService, initializePriceWebSocket, PriceUpdate, WebSocketConfig } from '@/lib/websocket-price-updates';

export interface UsePriceUpdatesOptions {
  symbols: string[];
  config?: WebSocketConfig;
  enabled?: boolean;
}

export function usePriceUpdates(options: UsePriceUpdatesOptions) {
  const { symbols, config, enabled = true } = options;
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    const initializeWebSocket = async () => {
      try {
        let service = getPriceWebSocketService();
        
        if (!service) {
          if (!config) {
            throw new Error('WebSocket config is required for initialization');
          }
          service = initializePriceWebSocket(config);
        }

        if (!service.isConnected()) {
          await service.connect();
        }

        setIsConnected(true);
        setError(null);

        // Subscribe to all symbols
        symbols.forEach((symbol) => {
          service!.subscribe(symbol, (update: PriceUpdate) => {
            setPrices((prev) => ({
              ...prev,
              [symbol]: update,
            }));
          });
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to WebSocket';
        setError(errorMessage);
        setIsConnected(false);
      }
    };

    initializeWebSocket();

    return () => {
      // Cleanup: unsubscribe from symbols
      const service = getPriceWebSocketService();
      if (service) {
        symbols.forEach((symbol) => {
          service.unsubscribe(symbol);
        });
      }
    };
  }, [symbols, config, enabled]);

  const updatePrice = useCallback((symbol: string, update: PriceUpdate) => {
    setPrices((prev) => ({
      ...prev,
      [symbol]: update,
    }));
  }, []);

  return {
    prices,
    isConnected,
    error,
    updatePrice,
  };
}

export function useSinglePrice(symbol: string, config?: WebSocketConfig) {
  const { prices, isConnected, error } = usePriceUpdates({
    symbols: [symbol],
    config,
  });

  return {
    price: prices[symbol] || null,
    isConnected,
    error,
  };
}
