/**
 * Transaction History Import Service
 * Imports and manages blockchain transaction history
 */

export interface BlockchainTransaction {
  id: string;
  accountAddress: string;
  transactionHash: string;
  fromAddress: string;
  toAddress: string;
  value: string;
  valueUsd: string;
  gas: string;
  gasUsed: string;
  gasPrice: string;
  gasFeeEth: string;
  gasFeeUsd: string;
  nonce: number;
  blockNumber: string;
  blockHash: string;
  timestamp: number;
  chainId: string;
  methodId: string;
  transactionType: 'ERC_20_TRANSFER' | 'ERC_20_APPROVE' | 'ETH_TRANSFER' | 'CONTRACT_CALL';
  transactionCategory: 'TRANSFER' | 'APPROVE' | 'SWAP' | 'STAKE' | 'CLAIM';
  status: 'success' | 'failed' | 'pending';
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  isError: boolean;
  isFromTransfer: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TransactionImportResult {
  imported: number;
  failed: number;
  duplicates: number;
  totalProcessed: number;
}

class TransactionHistoryImportService {
  private transactions: Map<string, BlockchainTransaction> = new Map();
  private addressTransactions: Map<string, string[]> = new Map();

  constructor() {
    this.initializeMockTransactions();
  }

  /**
   * Initialize mock transactions from CSV data
   */
  private initializeMockTransactions(): void {
    const mockTransactions: BlockchainTransaction[] = [
      {
        id: 'tx_1',
        accountAddress: '0x58edf78281334335effa23101bbe3371b6a36a51',
        transactionHash: '0x6fd101fa38c37a8274627be7039f40d0ee72150d7142e889f476942e1b8f34bd',
        fromAddress: '0x58edf78281334335effa23101bbe3371b6a36a51',
        toAddress: '0x3a4cab3dcfab144fe7eb2b5a3e288cc03dc07659',
        value: '0',
        valueUsd: '0',
        gas: '100000',
        gasUsed: '51715',
        gasPrice: '40268130476',
        gasFeeEth: '0.00208246636756634',
        gasFeeUsd: '5.21',
        nonce: 230738,
        blockNumber: '19438691',
        blockHash: '0x029638e18c651ca7072027f470c848c6d1da3e726020856fab6714a7268a8ba7',
        timestamp: 1710485675,
        chainId: '1',
        methodId: '0xa9059cbb',
        transactionType: 'ERC_20_TRANSFER',
        transactionCategory: 'TRANSFER',
        status: 'success',
        isError: false,
        isFromTransfer: true,
        createdAt: 1710485675,
        updatedAt: 1710485675,
      },
      {
        id: 'tx_2',
        accountAddress: '0x58edf78281334335effa23101bbe3371b6a36a51',
        transactionHash: '0x205ad0fd3a44021c37338b829ed5e85b91be43a1c44a5b8594e33e63581962be',
        fromAddress: '0x58edf78281334335effa23101bbe3371b6a36a51',
        toAddress: '0x9fa69536d1cda4a04cfb50688294de75b505a9ae',
        value: '0',
        valueUsd: '0',
        gas: '100000',
        gasUsed: '36614',
        gasPrice: '42795231447',
        gasFeeEth: '0.001566904604200458',
        gasFeeUsd: '3.92',
        nonce: 230737,
        blockNumber: '19438678',
        blockHash: '0x02ebcf2e145263704b0b285dfdb1981c771b1553bb5ea7b59fac54be08057b27',
        timestamp: 1710485519,
        chainId: '1',
        methodId: '0xa9059cbb',
        transactionType: 'ERC_20_TRANSFER',
        transactionCategory: 'TRANSFER',
        status: 'success',
        isError: false,
        isFromTransfer: true,
        createdAt: 1710485519,
        updatedAt: 1710485519,
      },
    ];

    mockTransactions.forEach(tx => {
      this.transactions.set(tx.id, tx);
      
      // Index by address
      if (!this.addressTransactions.has(tx.accountAddress)) {
        this.addressTransactions.set(tx.accountAddress, []);
      }
      this.addressTransactions.get(tx.accountAddress)?.push(tx.id);
    });
  }

  /**
   * Import transactions from CSV data
   */
  async importTransactionsFromCSV(csvData: string, address: string): Promise<TransactionImportResult> {
    const lines = csvData.split('\n').slice(1); // Skip header
    let imported = 0;
    let failed = 0;
    let duplicates = 0;

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const parts = line.split(',');
        const txHash = parts[18]; // transactionHash column

        // Check for duplicates
        if (Array.from(this.transactions.values()).some(tx => tx.transactionHash === txHash)) {
          duplicates++;
          continue;
        }

        const transaction: BlockchainTransaction = {
          id: `tx_${Date.now()}_${Math.random()}`,
          accountAddress: address,
          transactionHash: txHash,
          fromAddress: parts[17], // fromAddress
          toAddress: parts[16], // toAddress
          value: parts[14], // value
          valueUsd: parts[19], // valueDisplay/valueUsd
          gas: parts[7], // gas
          gasUsed: parts[8], // gasUsed
          gasPrice: parts[9], // gasPrice
          gasFeeEth: parts[21], // gasFeeEth
          gasFeeUsd: '0', // Will calculate
          nonce: parseInt(parts[12]),
          blockNumber: parts[5], // blockNumber
          blockHash: parts[6], // blockHash
          timestamp: parseInt(parts[3]), // timestamp
          chainId: parts[4], // chainId
          methodId: parts[13], // methodId
          transactionType: 'ERC_20_TRANSFER',
          transactionCategory: 'TRANSFER',
          status: parts[15] === 'false' ? 'success' : 'failed',
          isError: parts[15] === 'true',
          isFromTransfer: parts[20] === 'true',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        this.transactions.set(transaction.id, transaction);
        
        // Index by address
        if (!this.addressTransactions.has(address)) {
          this.addressTransactions.set(address, []);
        }
        this.addressTransactions.get(address)?.push(transaction.id);

        imported++;
      } catch (error) {
        console.error('Failed to import transaction:', error);
        failed++;
      }
    }

    return {
      imported,
      failed,
      duplicates,
      totalProcessed: imported + failed + duplicates,
    };
  }

  /**
   * Get all transactions
   */
  getTransactions(): BlockchainTransaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transactions by address
   */
  getTransactionsByAddress(address: string): BlockchainTransaction[] {
    const txIds = this.addressTransactions.get(address) || [];
    return txIds
      .map(id => this.transactions.get(id))
      .filter((tx): tx is BlockchainTransaction => tx !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transaction by hash
   */
  getTransactionByHash(hash: string): BlockchainTransaction | undefined {
    return Array.from(this.transactions.values()).find(tx => tx.transactionHash === hash);
  }

  /**
   * Get transactions by date range
   */
  getTransactionsByDateRange(startTime: number, endTime: number): BlockchainTransaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.timestamp >= startTime && tx.timestamp <= endTime)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transactions by type
   */
  getTransactionsByType(type: string): BlockchainTransaction[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.transactionCategory === type)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(address: string): {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalGasSpent: string;
    totalGasSpentUsd: string;
    averageGasFee: string;
  } {
    const txs = this.getTransactionsByAddress(address);
    const successful = txs.filter(tx => tx.status === 'success').length;
    const failed = txs.filter(tx => tx.status === 'failed').length;
    
    const totalGas = txs.reduce((sum, tx) => sum + parseFloat(tx.gasFeeEth), 0);
    const totalGasUsd = txs.reduce((sum, tx) => sum + parseFloat(tx.gasFeeUsd), 0);
    const avgGas = txs.length > 0 ? totalGas / txs.length : 0;

    return {
      totalTransactions: txs.length,
      successfulTransactions: successful,
      failedTransactions: failed,
      totalGasSpent: totalGas.toString(),
      totalGasSpentUsd: totalGasUsd.toString(),
      averageGasFee: avgGas.toString(),
    };
  }

  /**
   * Export transactions to CSV
   */
  exportToCSV(address: string): string {
    const txs = this.getTransactionsByAddress(address);
    const headers = [
      'Hash',
      'From',
      'To',
      'Value',
      'Gas Fee (ETH)',
      'Gas Fee (USD)',
      'Block',
      'Timestamp',
      'Status',
      'Type',
    ];

    const rows = txs.map(tx => [
      tx.transactionHash,
      tx.fromAddress,
      tx.toAddress,
      tx.value,
      tx.gasFeeEth,
      tx.gasFeeUsd,
      tx.blockNumber,
      new Date(tx.timestamp * 1000).toISOString(),
      tx.status,
      tx.transactionCategory,
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    return csv;
  }
}

export const transactionHistoryImportService = new TransactionHistoryImportService();
