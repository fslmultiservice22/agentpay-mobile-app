/**
 * QR Code Scanner & WalletConnect Service
 * Scan QR codes and connect wallets via WalletConnect
 */

export interface WalletConnectConfig {
  projectId: string;
  appName: string;
  appDescription?: string;
  appUrl?: string;
  appIcon?: string;
}

export interface WalletConnectSession {
  topic: string;
  peer: {
    metadata: {
      name: string;
      description: string;
      url: string;
      icons: string[];
    };
  };
  namespaces: Record<string, any>;
  requiredNamespaces: Record<string, any>;
}

export interface QRCodeData {
  type: 'walletconnect' | 'ethereum' | 'other';
  data: string;
  metadata?: Record<string, any>;
}

class QRWalletConnectService {
  private config: WalletConnectConfig;
  private session: WalletConnectSession | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();

  constructor(config: WalletConnectConfig) {
    this.config = config;
  }

  /**
   * Parse QR code data
   */
  parseQRCode(qrData: string): QRCodeData {
    try {
      // Check if it's a WalletConnect URI
      if (qrData.startsWith('wc:')) {
        return {
          type: 'walletconnect',
          data: qrData,
          metadata: this.parseWalletConnectURI(qrData),
        };
      }

      // Check if it's an Ethereum address
      if (qrData.startsWith('0x') && qrData.length === 42) {
        return {
          type: 'ethereum',
          data: qrData,
        };
      }

      // Try to parse as JSON (for custom data)
      try {
        const parsed = JSON.parse(qrData);
        return {
          type: 'other',
          data: qrData,
          metadata: parsed,
        };
      } catch {
        return {
          type: 'other',
          data: qrData,
        };
      }
    } catch (error) {
      console.error('❌ Failed to parse QR code:', error);
      throw new Error('Invalid QR code format');
    }
  }

  /**
   * Parse WalletConnect URI
   */
  private parseWalletConnectURI(uri: string): Record<string, any> {
    try {
      // Format: wc:a1b2c3d4@1?bridge=...&key=...
      const [protocol, rest] = uri.split(':');
      const [topicAndVersion, params] = rest.split('?');
      const [topic, version] = topicAndVersion.split('@');

      const metadata: Record<string, any> = {
        topic,
        version: parseInt(version),
      };

      if (params) {
        const searchParams = new URLSearchParams(params);
        searchParams.forEach((value, key) => {
          metadata[key] = value;
        });
      }

      return metadata;
    } catch (error) {
      console.error('❌ Failed to parse WalletConnect URI:', error);
      return {};
    }
  }

  /**
   * Connect wallet via WalletConnect
   */
  async connectWallet(qrData: string): Promise<WalletConnectSession> {
    try {
      const parsed = this.parseQRCode(qrData);

      if (parsed.type !== 'walletconnect') {
        throw new Error('QR code is not a valid WalletConnect URI');
      }

      // Mock WalletConnect session
      this.session = {
        topic: parsed.metadata?.topic || 'mock-topic-' + Date.now(),
        peer: {
          metadata: {
            name: 'Connected Wallet',
            description: 'Your connected wallet',
            url: this.config.appUrl || 'https://agentpay.wallet',
            icons: [this.config.appIcon || ''],
          },
        },
        namespaces: {
          eip155: {
            chains: ['eip155:1', 'eip155:137', 'eip155:42161', 'eip155:10'],
            methods: ['eth_sendTransaction', 'eth_signTransaction', 'eth_sign', 'personal_sign'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
        requiredNamespaces: {
          eip155: {
            chains: ['eip155:1'],
            methods: ['eth_sendTransaction', 'eth_sign'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
      };

      this.emit('session_connected', this.session);

      return this.session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      console.error('❌ Wallet connection failed:', errorMessage);
      this.emit('session_error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    try {
      if (this.session) {
        this.emit('session_disconnected', { topic: this.session.topic });
        this.session = null;
      }
    } catch (error) {
      console.error('❌ Failed to disconnect wallet:', error);
      throw error;
    }
  }

  /**
   * Get current session
   */
  getSession(): WalletConnectSession | null {
    return this.session;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.session !== null;
  }

  /**
   * Send transaction via WalletConnect
   */
  async sendTransaction(tx: {
    from: string;
    to: string;
    value: string;
    data?: string;
    gas?: string;
    gasPrice?: string;
  }): Promise<string> {
    try {
      if (!this.session) {
        throw new Error('Wallet not connected');
      }

      // Mock transaction
      const txHash = '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      this.emit('transaction_sent', { hash: txHash, tx });

      return txHash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send transaction';
      console.error('❌ Transaction failed:', errorMessage);
      this.emit('transaction_error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Sign message via WalletConnect
   */
  async signMessage(message: string, address: string): Promise<string> {
    try {
      if (!this.session) {
        throw new Error('Wallet not connected');
      }

      // Mock signature
      const signature = '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
      this.emit('message_signed', { signature, message, address });

      return signature;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign message';
      console.error('❌ Message signing failed:', errorMessage);
      this.emit('sign_error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Listen to events
   */
  on(event: string, callback: (data: any) => void): void {
    this.listeners.set(event, callback);
  }

  /**
   * Remove event listener
   */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const callback = this.listeners.get(event);
    if (callback) {
      callback(data);
    }
  }
}

// Singleton instance
let qrWalletConnectService: QRWalletConnectService | null = null;

export function getQRWalletConnectService(config?: WalletConnectConfig): QRWalletConnectService {
  if (!qrWalletConnectService && config) {
    qrWalletConnectService = new QRWalletConnectService(config);
  }
  return qrWalletConnectService!;
}

export function initializeQRWalletConnect(config: WalletConnectConfig): QRWalletConnectService {
  qrWalletConnectService = new QRWalletConnectService(config);
  return qrWalletConnectService;
}
