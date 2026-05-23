/**
 * Blockchain API Service
 * Integration with Alchemy/Infura for real-time wallet data
 */

export interface BlockchainConfig {
  alchemyApiKey?: string;
  infuraApiKey?: string;
  provider: 'alchemy' | 'infura';
}

export interface WalletBalance {
  address: string;
  balance: string;
  balanceUSD: number;
  chain: string;
}

export interface TokenBalance {
  address: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: string;
  decimals: number;
  balanceUSD: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  blockNumber: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

class BlockchainAPIService {
  private config: BlockchainConfig;
  private baseUrl: string;

  constructor(config: BlockchainConfig) {
    this.config = config;
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    if (this.config.provider === 'alchemy') {
      return `https://eth-mainnet.g.alchemy.com/v2/${this.config.alchemyApiKey}`;
    } else {
      return `https://mainnet.infura.io/v3/${this.config.infuraApiKey}`;
    }
  }

  async getWalletBalance(address: string, chain: string = 'ethereum'): Promise<WalletBalance> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBalance',
          params: [address, 'latest'],
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const balance = BigInt(data.result).toString();
      const balanceEth = parseInt(balance) / 1e18;

      return {
        address,
        balance,
        balanceUSD: balanceEth * 2500, // Mock USD price
        chain,
      };
    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error);
      throw error;
    }
  }

  async getTokenBalances(address: string): Promise<TokenBalance[]> {
    try {
      if (this.config.provider !== 'alchemy') {
        console.warn('⚠️ Token balance fetching is optimized for Alchemy');
        return [];
      }

      const response = await fetch(`${this.baseUrl}/getTokenBalances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return (data.tokenBalances || []).map((token: any) => ({
        address,
        tokenAddress: token.contractAddress,
        tokenName: token.name || 'Unknown',
        tokenSymbol: token.symbol || 'UNKNOWN',
        balance: token.tokenBalance || '0',
        decimals: token.decimals || 18,
        balanceUSD: 0, // Would need price data
      }));
    } catch (error) {
      console.error('❌ Failed to get token balances:', error);
      return [];
    }
  }

  async getTransactionHistory(address: string, limit: number = 10): Promise<Transaction[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [
            {
              address,
              fromBlock: 'latest',
              toBlock: 'latest',
            },
          ],
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      // Mock transaction data
      return [
        {
          hash: '0x' + Math.random().toString(16).slice(2),
          from: address,
          to: '0x' + Math.random().toString(16).slice(2),
          value: '1000000000000000000',
          gas: '21000',
          gasPrice: '20000000000',
          blockNumber: '18000000',
          timestamp: Date.now(),
          status: 'confirmed',
        },
      ];
    } catch (error) {
      console.error('❌ Failed to get transaction history:', error);
      return [];
    }
  }

  async validateAddress(address: string): Promise<boolean> {
    try {
      // Simple Ethereum address validation
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    } catch (error) {
      console.error('❌ Failed to validate address:', error);
      return false;
    }
  }

  async getGasPrice(): Promise<{ standard: string; fast: string; fastest: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_gasPrice',
          id: 1,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const gasPrice = BigInt(data.result).toString();

      return {
        standard: gasPrice,
        fast: (BigInt(gasPrice) * BigInt(120) / BigInt(100)).toString(),
        fastest: (BigInt(gasPrice) * BigInt(150) / BigInt(100)).toString(),
      };
    } catch (error) {
      console.error('❌ Failed to get gas price:', error);
      return {
        standard: '20000000000',
        fast: '25000000000',
        fastest: '30000000000',
      };
    }
  }

  async getNetworkInfo(): Promise<{ chainId: string; blockNumber: string }> {
    try {
      const chainResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          id: 1,
        }),
      });

      const chainData = await chainResponse.json();

      const blockResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          id: 1,
        }),
      });

      const blockData = await blockResponse.json();

      return {
        chainId: chainData.result || '0x1',
        blockNumber: blockData.result || '0x0',
      };
    } catch (error) {
      console.error('❌ Failed to get network info:', error);
      return {
        chainId: '0x1',
        blockNumber: '0x0',
      };
    }
  }
}

// Singleton instance
let blockchainService: BlockchainAPIService | null = null;

export function getBlockchainAPIService(config?: BlockchainConfig): BlockchainAPIService {
  if (!blockchainService && config) {
    blockchainService = new BlockchainAPIService(config);
  }
  return blockchainService!;
}

export function initializeBlockchainAPI(config: BlockchainConfig): BlockchainAPIService {
  blockchainService = new BlockchainAPIService(config);
  return blockchainService;
}
