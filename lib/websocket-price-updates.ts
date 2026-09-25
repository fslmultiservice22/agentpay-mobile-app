/**
 * WebSocket Price Updates Service
 * Real-time cryptocurrency price updates via WebSocket
 */

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  timestamp: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts: number;
  reconnectDelay: number;
}

class PriceWebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private listeners: Map<string, (update: PriceUpdate) => void> = new Map();
  private reconnectCount = 0;
  private shouldReconnect = true;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          this.reconnectCount = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handlePriceUpdate(data);
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          if (this.shouldReconnect) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectCount < this.config.reconnectAttempts) {
      this.reconnectCount++;
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectCount - 1);
      
      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('❌ Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  private handlePriceUpdate(data: PriceUpdate): void {
    const listener = this.listeners.get(data.symbol);
    if (listener) {
      listener(data);
    }
  }

  subscribe(symbol: string, callback: (update: PriceUpdate) => void): void {
    this.listeners.set(symbol, callback);
    
    // Send subscription message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        symbol,
      }));
    }
  }

  unsubscribe(symbol: string): void {
    this.listeners.delete(symbol);
    
    // Send unsubscription message
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        symbol,
      }));
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let priceService: PriceWebSocketService | null = null;

export function getPriceWebSocketService(config?: WebSocketConfig): PriceWebSocketService {
  if (!priceService && config) {
    priceService = new PriceWebSocketService(config);
  }
  return priceService!;
}

export function initializePriceWebSocket(config: WebSocketConfig): PriceWebSocketService {
  priceService = new PriceWebSocketService(config);
  return priceService;
}
