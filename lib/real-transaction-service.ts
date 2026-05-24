import { ethers, BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import { CHAIN_CONFIG, type SupportedChain } from './web3-provider-service';

/**
 * Real Transaction Service
 * Handles actual blockchain transactions using ethers.js
 */

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
 */
export function getProvider(chainId: number): BrowserProvider | null {
  if (!window.ethereum) {
    console.error('MetaMask not installed');
    return null;
  }

  return new BrowserProvider(window.ethereum);
}

/**
 * Get signer for transaction signing
 */
export async function getSigner(provider: BrowserProvider) {
  try {
    return await provider.getSigner();
  } catch (error) {
    console.error('Failed to get signer:', error);
    throw error;
  }
}

/**
 * Send ETH transfer transaction
 */
export async function sendEthTransfer(
  to: string,
  amountInEth: string,
  chainId: number = 1
): Promise<TransactionResponse> {
  try {
    const provider = getProvider(chainId);
    if (!provider) throw new Error('Provider not available');

    const signer = await getSigner(provider);
    
    // Validate recipient address
    if (!ethers.isAddress(to)) {
      throw new Error('Invalid recipient address');
    }

    // Create transaction
    const tx = await signer.sendTransaction({
      to,
      value: parseEther(amountInEth),
    });

    console.log('Transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    return {
      hash: tx.hash,
      from: await signer.getAddress(),
      to,
      value: amountInEth,
      status: receipt?.status === 1 ? 'success' : 'failed',
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Send ERC20 token transfer
 */
export async function sendTokenTransfer(
  tokenAddress: string,
  to: string,
  amount: string,
  decimals: number = 18,
  chainId: number = 1
): Promise<TransactionResponse> {
  try {
    const provider = getProvider(chainId);
    if (!provider) throw new Error('Provider not available');

    const signer = await getSigner(provider);

    // ERC20 ABI (minimal)
    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];

    const contract = new Contract(tokenAddress, erc20Abi, signer);
    
    // Convert amount to token decimals
    const amountInTokens = ethers.parseUnits(amount, decimals);

    // Send transaction
    const tx = await contract.transfer(to, amountInTokens);
    console.log('Token transfer sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    return {
      hash: tx.hash,
      from: await signer.getAddress(),
      to,
      value: amount,
      status: receipt?.status === 1 ? 'success' : 'failed',
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Token transfer failed:', error);
    throw error;
  }
}

/**
 * Estimate gas for transaction
 */
export async function estimateGas(
  to: string,
  value: string,
  chainId: number = 1
): Promise<GasEstimate> {
  try {
    const provider = getProvider(chainId);
    if (!provider) throw new Error('Provider not available');

    const signer = await getSigner(provider);
    const from = await signer.getAddress();

    // Get current gas price
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

    // Estimate gas limit
    const gasLimit = await provider.estimateGas({
      from,
      to,
      value: parseEther(value),
    });

    // Calculate estimated cost
    const estimatedCost = formatEther(gasLimit * gasPrice);

    return {
      gasPrice: formatEther(gasPrice),
      gasLimit: gasLimit.toString(),
      maxFeePerGas: feeData.maxFeePerGas ? formatEther(feeData.maxFeePerGas) : undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? formatEther(feeData.maxPriorityFeePerGas) : undefined,
      estimatedCost,
    };
  } catch (error) {
    console.error('Gas estimation failed:', error);
    throw error;
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(
  address: string,
  chainId: number = 1
): Promise<string> {
  try {
    const provider = getProvider(chainId);
    if (!provider) throw new Error('Provider not available');

    if (!ethers.isAddress(address)) {
      throw new Error('Invalid address');
    }

    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (error) {
    console.error('Failed to get balance:', error);
    throw error;
  }
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(
  txHash: string,
  chainId: number = 1
): Promise<TransactionResponse | null> {
  try {
    const provider = getProvider(chainId);
    if (!provider) throw new Error('Provider not available');

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return null;

    const tx = await provider.getTransaction(txHash);
    if (!tx) return null;

    return {
      hash: tx.hash,
      from: tx.from,
      to: tx.to || '',
      value: formatEther(tx.value),
      status: receipt.status === 1 ? 'success' : 'failed',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Failed to get transaction status:', error);
    throw error;
  }
}

/**
 * Get transaction history for address
 */
export async function getTransactionHistory(
  address: string,
  chainId: number = 1,
  limit: number = 10
): Promise<TransactionResponse[]> {
  try {
    const provider = getProvider(chainId);
    if (!provider) throw new Error('Provider not available');

    if (!ethers.isAddress(address)) {
      throw new Error('Invalid address');
    }

    // Note: This is a simplified version. For production, use Etherscan API or similar
    const blockNumber = await provider.getBlockNumber();
    const transactions: TransactionResponse[] = [];

    // Scan recent blocks for transactions involving this address
    for (let i = 0; i < Math.min(limit, 100); i++) {
      const block = await provider.getBlock(blockNumber - i);
      if (!block) continue;

      for (const txHash of block.transactions) {
        const tx = await provider.getTransaction(txHash);
        if (!tx) continue;

        if (tx.from?.toLowerCase() === address.toLowerCase() || 
            tx.to?.toLowerCase() === address.toLowerCase()) {
          const receipt = await provider.getTransactionReceipt(txHash);
          
          transactions.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to || '',
            value: formatEther(tx.value),
            status: receipt?.status === 1 ? 'success' : 'failed',
            blockNumber: receipt?.blockNumber,
            gasUsed: receipt?.gasUsed?.toString(),
            timestamp: Date.now(),
          });

          if (transactions.length >= limit) break;
        }
      }

      if (transactions.length >= limit) break;
    }

    return transactions;
  } catch (error) {
    console.error('Failed to get transaction history:', error);
    throw error;
  }
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Format address (checksum)
 */
export function formatAddress(address: string): string {
  return ethers.getAddress(address);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  const formatted = formatAddress(address);
  return `${formatted.slice(0, chars + 2)}...${formatted.slice(-chars)}`;
}
