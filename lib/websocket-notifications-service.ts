/**
 * WebSocket Real-Time Notifications Service
 * Live alerts, transaction confirmations, and price updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WebSocketMessage {
  type: 'transaction' | 'price_update' | 'payment' | 'alert' | 'connection';
  data: Record<string, any>;
  timestamp: number;
}

export interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  lastConnectTime?: number;
  reconnectAttempts: number;
  error?: string;
}

class WebSocketNotificationsService {
  private ws?: WebSocket;
  private connectionState: ConnectionState = {
    connected: false,
    connecting: false,
    reconnectAttempts: 0,
  };

  private messageQueue: WebSocketMessage[] = [];
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer?: NodeJS.Timeout | number;
  private heartbeatTimer?: NodeJS.Timeout | number;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 3000; // 3 seconds
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly WS_URL = 'wss://api.agentpay.com/ws';
  private readonly MESSAGES_STORAGE_KEY = 'ws_messages';

  constructor() {
    this.loadMessages();
  }

  /**
   * Connect to WebSocket
   */
  async connect(userId: string, token: string): Promise<boolean> {
    if (this.connectionState.connected || this.connectionState.connecting) {
      return this.connectionState.connected;
    }

    this.connectionState.connecting = true;

    try {
      const url = `${this.WS_URL}?userId=${userId}&token=${token}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event: MessageEvent) => this.handleMessage(event);
      this.ws.onerror = (event: Event) => this.handleError(event);
      this.ws.onclose = () => this.handleClose();

      return true;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.connectionState.connecting = false;
      this.connectionState.error = String(error);
      this.attemptReconnect();
      return false;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }

    this.connectionState.connected = false;
    this.connectionState.connecting = false;
  }

  /**
   * Send message
   */
  async send(type: string, data: Record<string, any>): Promise<boolean> {
    const message: WebSocketMessage = {
      type: type as any,
      data,
      timestamp: Date.now(),
    };

    if (!this.connectionState.connected) {
      this.messageQueue.push(message);
      await this.persistMessages();
      return false;
    }

    try {
      if (this.ws) {
        this.ws.send(JSON.stringify(message));
        return true;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      await this.persistMessages();
    }

    return false;
  }

  /**
   * Subscribe to message type
   */
  subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(callback);

    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Get queued messages
   */
  getQueuedMessages(): WebSocketMessage[] {
    return [...this.messageQueue];
  }

  /**
   * Clear queued messages
   */
  async clearQueuedMessages(): Promise<void> {
    this.messageQueue = [];
    try {
      await AsyncStorage.removeItem(this.MESSAGES_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear queued messages:', error);
    }
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.connectionState.connected = true;
    this.connectionState.connecting = false;
    this.connectionState.lastConnectTime = Date.now();
    this.connectionState.reconnectAttempts = 0;
    this.connectionState.error = undefined;

    this.startHeartbeat();
    this.flushMessageQueue();

    this.emit('connection', { connected: true });
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.emit(message.type, message.data);

      // Store message for history
      this.messageQueue.push(message);
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift();
      }
      this.persistMessages();
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.connectionState.error = 'WebSocket error occurred';
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(): void {
    console.log('WebSocket disconnected');
    this.connectionState.connected = false;
    this.connectionState.connecting = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.emit('connection', { connected: false });
    this.attemptReconnect();
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.connectionState.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.connectionState.reconnectAttempts++;
    const delay = this.RECONNECT_DELAY * this.connectionState.reconnectAttempts;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.connectionState.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      // Reconnection would be triggered by the application
    }, delay);
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState.connected && this.ws) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (error) {
          console.error('Failed to send heartbeat:', error);
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Flush message queue
   */
  private async flushMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0 && this.connectionState.connected) {
      const message = this.messageQueue.shift();
      if (message && this.ws) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send queued message:', error);
          this.messageQueue.unshift(message);
          break;
        }
      }
    }

    await this.persistMessages();
  }

  /**
   * Emit event to listeners
   */
  private emit(type: string, data: any): void {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in listener callback:', error);
        }
      });
    }
  }

  /**
   * Persist messages to storage
   */
  private async persistMessages(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.MESSAGES_STORAGE_KEY, JSON.stringify(this.messageQueue));
    } catch (error) {
      console.error('Failed to persist messages:', error);
    }
  }

  /**
   * Load messages from storage
   */
  private async loadMessages(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.MESSAGES_STORAGE_KEY);
      if (stored) {
        this.messageQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }
}

export const webSocketNotificationsService = new WebSocketNotificationsService();
