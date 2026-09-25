/**
 * WalletConnect Mobile Integration Service
 * Handles mobile wallet connections via WalletConnect v2
 */

import { Platform } from 'react-native';

export interface WalletConnectSession {
  id: string;
  topic: string;
  pairingTopic: string;
  walletAddress: string;
  chainId: number;
  isConnected: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface WalletConnectProposal {
  id: number;
  proposer: {
    publicKey: string;
    metadata: {
      name: string;
      description: string;
      url: string;
      icons: string[];
    };
  };
  permissions: {
    blockchain: {
      chains: string[];
    };
    jsonrpc: {
      methods: string[];
    };
  };
  relays: Array<{
    protocol: string;
  }>;
}

export interface WalletConnectRequest {
  id: number;
  topic: string;
  method: string;
  params: any[];
  chainId: string;
}

export interface WalletConnectResponse {
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

const WALLETCONNECT_SESSIONS_KEY = 'walletconnect_sessions';
const WALLETCONNECT_PAIRINGS_KEY = 'walletconnect_pairings';

class WalletConnectMobileService {
  private sessions: Map<string, WalletConnectSession> = new Map();
  private pairings: Map<string, any> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.loadSessions();
    this.loadPairings();
  }

  /**
   * Initialize WalletConnect
   */
  async initialize(): Promise<void> {
    if (Platform.OS === 'web') {
      console.warn('WalletConnect Mobile Service is for mobile platforms only');
      return;
    }

    try {
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
    }
  }

  /**
   * Generate pairing URI
   */
  async generatePairingUri(): Promise<string> {
    try {
      // In production, this would use WalletConnect SDK
      const pairingId = `pairing_${Date.now()}`;
      const uri = `wc:${pairingId}@2?relay-protocol=irn&symKey=test`;

      return uri;
    } catch (error) {
      console.error('Failed to generate pairing URI:', error);
      throw error;
    }
  }

  /**
   * Connect wallet via QR code
   */
  async connectWalletViaQR(uri: string): Promise<WalletConnectSession> {
    try {
      // Parse URI
      const parts = uri.split('@');
      if (parts.length < 2) {
        throw new Error('Invalid WalletConnect URI');
      }

      const session: WalletConnectSession = {
        id: `session_${Date.now()}`,
        topic: parts[0].replace('wc:', ''),
        pairingTopic: parts[1].split('?')[0],
        walletAddress: '', // Would be populated after wallet approval
        chainId: 1,
        isConnected: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      this.sessions.set(session.id, session);
      await this.persistSessions();

      this.emit('session_proposed', session);

      return session;
    } catch (error) {
      console.error('Failed to connect wallet via QR:', error);
      throw error;
    }
  }

  /**
   * Approve session
   */
  async approveSession(
    sessionId: string,
    walletAddress: string,
    chainId: number
  ): Promise<WalletConnectSession> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      session.walletAddress = walletAddress;
      session.chainId = chainId;
      session.isConnected = true;

      this.sessions.set(sessionId, session);
      await this.persistSessions();

      this.emit('session_connected', session);

      return session;
    } catch (error) {
      console.error('Failed to approve session:', error);
      throw error;
    }
  }

  /**
   * Reject session
   */
  async rejectSession(sessionId: string): Promise<void> {
    try {
      this.sessions.delete(sessionId);
      await this.persistSessions();

      this.emit('session_rejected', sessionId);
    } catch (error) {
      console.error('Failed to reject session:', error);
      throw error;
    }
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): WalletConnectSession[] {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      s => s.isConnected && s.expiresAt > now
    );
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): WalletConnectSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Send transaction request
   */
  async sendTransactionRequest(
    sessionId: string,
    to: string,
    value: string,
    data?: string
  ): Promise<WalletConnectRequest> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.isConnected) {
        throw new Error('Session not connected');
      }

      const request: WalletConnectRequest = {
        id: Date.now(),
        topic: session.topic,
        method: 'eth_sendTransaction',
        params: [
          {
            from: session.walletAddress,
            to,
            value,
            data,
          },
        ],
        chainId: `eip155:${session.chainId}`,
      };

      this.emit('transaction_request', request);

      return request;
    } catch (error) {
      console.error('Failed to send transaction request:', error);
      throw error;
    }
  }

  /**
   * Send sign message request
   */
  async sendSignMessageRequest(
    sessionId: string,
    message: string
  ): Promise<WalletConnectRequest> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session || !session.isConnected) {
        throw new Error('Session not connected');
      }

      const request: WalletConnectRequest = {
        id: Date.now(),
        topic: session.topic,
        method: 'personal_sign',
        params: [message, session.walletAddress],
        chainId: `eip155:${session.chainId}`,
      };

      this.emit('sign_request', request);

      return request;
    } catch (error) {
      console.error('Failed to send sign message request:', error);
      throw error;
    }
  }

  /**
   * Handle response
   */
  async handleResponse(response: WalletConnectResponse): Promise<void> {
    try {
      if (response.error) {
        this.emit('request_rejected', response);
      } else {
        this.emit('request_approved', response);
      }
    } catch (error) {
      console.error('Failed to handle response:', error);
    }
  }

  /**
   * Disconnect session
   */
  async disconnectSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.isConnected = false;
        this.sessions.set(sessionId, session);
        await this.persistSessions();

        this.emit('session_disconnected', sessionId);
      }
    } catch (error) {
      console.error('Failed to disconnect session:', error);
      throw error;
    }
  }

  /**
   * Get pairing URI
   */
  async getPairingUri(): Promise<string> {
    return this.generatePairingUri();
  }

  /**
   * Event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  /**
   * Persist sessions
   */
  private async persistSessions(): Promise<void> {
    try {
      const data = Array.from(this.sessions.values());
      // In production, use AsyncStorage
      globalThis.walletConnectSessionsCache = data;
    } catch (error) {
      console.error('Failed to persist sessions:', error);
    }
  }

  /**
   * Load sessions
   */
  private async loadSessions(): Promise<void> {
    try {
      const data = (globalThis.walletConnectSessionsCache as WalletConnectSession[]) || [];
      data.forEach(session => {
        this.sessions.set(session.id, session);
      });
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  /**
   * Persist pairings
   */
  private async persistPairings(): Promise<void> {
    try {
      const data = Array.from(this.pairings.values());
      globalThis.walletConnectPairingsCache = data;
    } catch (error) {
      console.error('Failed to persist pairings:', error);
    }
  }

  /**
   * Load pairings
   */
  private async loadPairings(): Promise<void> {
    try {
      const data = (globalThis.walletConnectPairingsCache as any[]) || [];
      data.forEach(pairing => {
        this.pairings.set(pairing.id, pairing);
      });
    } catch (error) {
      console.error('Failed to load pairings:', error);
    }
  }
}

export const walletConnectMobileService = new WalletConnectMobileService();
