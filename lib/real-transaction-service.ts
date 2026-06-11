/**
 * Real Transaction Service
 * Handles actual blockchain transactions using ethers.js
 * React Native compatible - no window.ethereum access on mobile
 */

import { Platform } from 'react-native';
import { CHAIN_CONFIG, type SupportedChain } from './web3-provider-service';

export interface TransactionRequest {
  to: string;
  value: string; // in ETH
  data?: string;
  gasLimit?: string;
}

export interface TransactionResponse {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: 'pending' | 'success' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  timestamp: number;
}

export interface GasEstimate {
  gasPrice: string;
  gasLimit: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string;
}

/**
 * Get provider for a specific chain
 * On mobile (Android/iOS), use JsonRpcProvider with RPC URL
 * On web, use BrowserProvider with window.ethereum
 */
export async function getProvider(chainId: number) {
  try {
    if (Platform.OS === 'web') {
      // Web: Use window.ethereum if available
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const { BrowserProvider } = await import('ethers');
        return new BrowserProvider((window as any).ethereum);
      }
    }

    // Mobile or web without MetaMask: Use JsonRpcProvider with RPC URL
    const { JsonRpcProvider } = await import('ethers');
    const chain = Object.values(CHAIN_CONFIG).find(c => c.chainId === chainId);
    
    if (!chain) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    return new JsonRpcProvider(chain.rpcUrl);
  } catch (error) {
    console.error('Failed to get provider:', error);
    return null;
  }
}

/**
 * Get signer for transaction signing
 * On mobile, requires WalletConnect or similar
 * On web, uses MetaMask
 */
export async function getSigner(provider: any) {
  try {
    if (Platform.OS === 'web') {
      // Web: Get signer from MetaMask
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        return await provider.getSigner();
      }
    }

    // Mobile: Would need WalletConnect integration
    console.warn('Signer not available on mobile without WalletConnect');
    return null;
  } catch (error) {
    console.error('Failed to get signer:', error);
    return null;
  }
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  provider: any,
  transaction: TransactionRequest
): Promise<GasEstimate> {
  try {
    const gasPrice = await provider.getGasPrice();
    const gasEstimate = await provider.estimateGas({
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
    });

    const estimatedCost = (
      Number(gasEstimate) * Number(gasPrice) / 1e18
    ).toFixed(6);

    return {
      gasPrice: (Number(gasPrice) / 1e9).toFixed(2),
      gasLimit: gasEstimate.toString(),
      estimatedCost,
    };
  } catch (error) {
    console.error('Failed to estimate gas:', error);
    throw error;
  }
}

/**
 * Send transaction
 * On mobile, this would be called after signing via WalletConnect
 */
export async function sendTransaction(
  signer: any,
  transaction: TransactionRequest
): Promise<TransactionResponse> {
  try {
    if (!signer) {
      throw new Error('Signer not available');
    }

    const tx = await signer.sendTransaction({
      to: transaction.to,
      value: transaction.value,
      data: transaction.data,
      gasLimit: transaction.gasLimit,
    });

    const receipt = await tx.wait();

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: transaction.value,
      status: receipt?.status === 1 ? 'success' : 'failed',
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Failed to send transaction:', error);
    throw error;
  }
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(
  provider: any,
  hash: string
): Promise<TransactionResponse | null> {
  try {
    const receipt = await provider.getTransactionReceipt(hash);

    if (!receipt) {
      return null;
    }

    const tx = await provider.getTransaction(hash);

    return {
      hash,
      from: receipt.from,
      to: receipt.to || '',
      value: tx?.value?.toString() || '0',
      status: receipt.status === 1 ? 'success' : 'failed',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Failed to get transaction receipt:', error);
    return null;
  }
}

/**
 * Get account balance
 */
export async function getBalance(provider: any, address: string): Promise<string> {
  try {
    const balance = await provider.getBalance(address);
    return (Number(balance) / 1e18).toFixed(6);
  } catch (error) {
    console.error('Failed to get balance:', error);
    return '0';
  }
}

/**
 * Get account nonce
 */
export async function getNonce(provider: any, address: string): Promise<number> {
  try {
    return await provider.getTransactionCount(address);
  } catch (error) {
    console.error('Failed to get nonce:', error);
    return 0;
  }
}

/**
 * Validate address
 */
export function validateAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Shorten address for display (alias for formatAddress)
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
