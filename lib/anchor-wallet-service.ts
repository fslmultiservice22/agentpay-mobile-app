/**
 * Anchor Wallet Integration Service
 * Handles multi-chain blockchain interactions via Anchor Wallet
 */

import { Platform } from 'react-native';
import anchorNetworks from '@/config/anchor-networks.json';

export interface AnchorNetwork {
  keyPrefix: string;
  testnet: boolean;
  _id: string;
  chainId: string;
  name: string;
  node: string;
  symbol: string;
  tokenPrecision?: number;
  votePrecision?: number;
  voteDecay?: boolean;
  stakedResources?: boolean;
  systemContract?: string;
  tokenContract?: string;
  supportedContracts?: string[];
}

export interface AnchorTransaction {
  id: string;
  chainId: string;
  from: string;
  to: string;
  amount: string;
  symbol: string;
  memo?: string;
  status: 'pending' | 'success' | 'failed';
  hash?: string;
  timestamp: number;
}

export interface AnchorAccount {
  account: string;
  authority: string;
  chainId: string;
  pubkey: string;
}

class AnchorWalletService {
  private networks: Map<string, AnchorNetwork> = new Map();
  private currentNetwork: AnchorNetwork | null = null;
  private currentAccount: AnchorAccount | null = null;
  private transactions: Map<string, AnchorTransaction> = new Map();

  constructor() {
    this.initializeNetworks();
  }

  /**
   * Initialize networks from config
   */
  private initializeNetworks(): void {
    try {
      anchorNetworks.networks.forEach((net: any) => {
        const network = net.data as AnchorNetwork;
        this.networks.set(network._id, network);
      });

      console.log(`Initialized ${this.networks.size} blockchain networks`);
    } catch (error) {
      console.error('Failed to initialize networks:', error);
    }
  }

  /**
   * Get all networks
   */
  getNetworks(): AnchorNetwork[] {
    return Array.from(this.networks.values());
  }

  /**
   * Get mainnet networks only
   */
  getMainnetNetworks(): AnchorNetwork[] {
    return Array.from(this.networks.values()).filter(n => !n.testnet);
  }

  /**
   * Get testnet networks only
   */
  getTestnetNetworks(): AnchorNetwork[] {
    return Array.from(this.networks.values()).filter(n => n.testnet);
  }

  /**
   * Get network by ID
   */
  getNetwork(networkId: string): AnchorNetwork | undefined {
    return this.networks.get(networkId);
  }

  /**
   * Get network by chain ID
   */
  getNetworkByChainId(chainId: string): AnchorNetwork | undefined {
    return Array.from(this.networks.values()).find(n => n.chainId === chainId);
  }

  /**
   * Get network by symbol
   */
  getNetworkBySymbol(symbol: string): AnchorNetwork | undefined {
    return Array.from(this.networks.values()).find(n => n.symbol === symbol);
  }

  /**
   * Set current network
   */
  setCurrentNetwork(networkId: string): boolean {
    const network = this.networks.get(networkId);
    if (!network) {
      console.error(`Network ${networkId} not found`);
      return false;
    }

    this.currentNetwork = network;
    return true;
  }

  /**
   * Get current network
   */
  getCurrentNetwork(): AnchorNetwork | null {
    return this.currentNetwork;
  }

  /**
   * Set current account
   */
  setCurrentAccount(account: AnchorAccount): void {
    this.currentAccount = account;
  }

  /**
   * Get current account
   */
  getCurrentAccount(): AnchorAccount | null {
    return this.currentAccount;
  }

  /**
   * Connect to network
   */
  async connectToNetwork(networkId: string, account: string, authority: string): Promise<boolean> {
    try {
      if (!this.setCurrentNetwork(networkId)) {
        return false;
      }

      const network = this.currentNetwork!;
      const chainId = network.chainId;

      this.currentAccount = {
        account,
        authority,
        chainId,
        pubkey: '', // Would be populated from wallet
      };

      console.log(`Connected to ${network.name} with account ${account}`);
      return true;
    } catch (error) {
      console.error('Failed to connect to network:', error);
      return false;
    }
  }

  /**
   * Disconnect from network
   */
  disconnect(): void {
    this.currentNetwork = null;
    this.currentAccount = null;
  }

  /**
   * Send transaction
   */
  async sendTransaction(
    to: string,
    amount: string,
    memo?: string
  ): Promise<AnchorTransaction | null> {
    try {
      if (!this.currentNetwork || !this.currentAccount) {
        throw new Error('Not connected to network');
      }

      const transaction: AnchorTransaction = {
        id: `tx_${Date.now()}`,
        chainId: this.currentNetwork.chainId,
        from: this.currentAccount.account,
        to,
        amount,
        symbol: this.currentNetwork.symbol,
        memo,
        status: 'pending',
        timestamp: Date.now(),
      };

      this.transactions.set(transaction.id, transaction);

      // Simulate transaction processing
      setTimeout(() => {
        const tx = this.transactions.get(transaction.id);
        if (tx) {
          tx.status = 'success';
          tx.hash = `0x${Math.random().toString(16).slice(2)}`;
        }
      }, 2000);

      return transaction;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      return null;
    }
  }

  /**
   * Get transaction
   */
  getTransaction(id: string): AnchorTransaction | undefined {
    return this.transactions.get(id);
  }

  /**
   * Get all transactions
   */
  getTransactions(): AnchorTransaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transactions for account
   */
  getAccountTransactions(account: string): AnchorTransaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.from === account || t.to === account)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transactions for network
   */
  getNetworkTransactions(chainId: string): AnchorTransaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.chainId === chainId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get account balance (mock)
   */
  async getAccountBalance(account: string): Promise<string> {
    try {
      if (!this.currentNetwork) {
        throw new Error('Not connected to network');
      }

      // In production, would fetch from blockchain
      return '1000.0000';
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return '0';
    }
  }

  /**
   * Get network info
   */
  async getNetworkInfo(networkId: string): Promise<any> {
    try {
      const network = this.networks.get(networkId);
      if (!network) {
        throw new Error(`Network ${networkId} not found`);
      }

      return {
        name: network.name,
        symbol: network.symbol,
        chainId: network.chainId,
        node: network.node,
        testnet: network.testnet,
        tokenPrecision: network.tokenPrecision || 4,
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }

  /**
   * Get supported contracts for network
   */
  getSupportedContracts(networkId: string): string[] {
    const network = this.networks.get(networkId);
    return network?.supportedContracts || [];
  }

  /**
   * Check if contract is supported
   */
  isContractSupported(networkId: string, contract: string): boolean {
    const contracts = this.getSupportedContracts(networkId);
    return contracts.includes(contract);
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): {
    totalNetworks: number;
    mainnets: number;
    testnets: number;
    totalTransactions: number;
  } {
    return {
      totalNetworks: this.networks.size,
      mainnets: Array.from(this.networks.values()).filter(n => !n.testnet).length,
      testnets: Array.from(this.networks.values()).filter(n => n.testnet).length,
      totalTransactions: this.transactions.size,
    };
  }
}

export const anchorWalletService = new AnchorWalletService();
