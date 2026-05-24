/**
 * Multi-Signature Wallet Security Service
 * Multi-sig transactions with time-lock escrow and approval workflows
 */

export interface MultiSigWallet {
  id: string;
  name: string;
  owners: string[];
  requiredSignatures: number;
  totalBalance: number;
  createdAt: number;
  updatedAt: number;
}

export interface MultiSigTransaction {
  id: string;
  walletId: string;
  initiator: string;
  recipient: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  approvals: Map<string, { signer: string; timestamp: number; signature: string }>;
  requiredApprovals: number;
  createdAt: number;
  expiresAt: number;
  timeLockUntil?: number;
  executedAt?: number;
  rejectionReason?: string;
}

export interface EscrowTransaction {
  id: string;
  multisigTxId: string;
  escrowAgent: string;
  releaseConditions: string[];
  releasedAt?: number;
  status: 'locked' | 'released' | 'refunded';
  amount: number;
}

export interface ApprovalRequest {
  id: string;
  transactionId: string;
  requestedFrom: string;
  requestedAt: number;
  respondedAt?: number;
  approved?: boolean;
  signature?: string;
}

class MultiSigWalletService {
  private wallets: Map<string, MultiSigWallet> = new Map();
  private transactions: Map<string, MultiSigTransaction> = new Map();
  private escrows: Map<string, EscrowTransaction> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();

  /**
   * Create multi-sig wallet
   */
  createMultiSigWallet(
    name: string,
    owners: string[],
    requiredSignatures: number
  ): MultiSigWallet {
    if (requiredSignatures > owners.length) {
      throw new Error('Required signatures cannot exceed number of owners');
    }

    const wallet: MultiSigWallet = {
      id: `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      owners,
      requiredSignatures,
      totalBalance: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.wallets.set(wallet.id, wallet);
    return wallet;
  }

  /**
   * Get multi-sig wallet
   */
  getWallet(walletId: string): MultiSigWallet | undefined {
    return this.wallets.get(walletId);
  }

  /**
   * Propose multi-sig transaction
   */
  proposeTransaction(
    walletId: string,
    initiator: string,
    recipient: string,
    amount: number,
    currency: string,
    description: string,
    timeLockDays: number = 0
  ): MultiSigTransaction {
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');
    if (!wallet.owners.includes(initiator)) throw new Error('Initiator not wallet owner');
    if (amount > wallet.totalBalance) throw new Error('Insufficient balance');

    const transaction: MultiSigTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      walletId,
      initiator,
      recipient,
      amount,
      currency,
      description,
      status: 'pending',
      approvals: new Map(),
      requiredApprovals: wallet.requiredSignatures,
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      timeLockUntil: timeLockDays > 0 ? Date.now() + (timeLockDays * 24 * 60 * 60 * 1000) : undefined,
    };

    this.transactions.set(transaction.id, transaction);

    // Create approval requests
    for (const owner of wallet.owners) {
      if (owner !== initiator) {
        this.createApprovalRequest(transaction.id, owner);
      }
    }

    return transaction;
  }

  /**
   * Create approval request
   */
  private createApprovalRequest(transactionId: string, requestedFrom: string): void {
    const request: ApprovalRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId,
      requestedFrom,
      requestedAt: Date.now(),
    };

    this.approvalRequests.set(request.id, request);
  }

  /**
   * Approve transaction
   */
  approveTransaction(transactionId: string, signer: string, signature: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return false;
    if (transaction.status !== 'pending') return false;

    const wallet = this.wallets.get(transaction.walletId);
    if (!wallet || !wallet.owners.includes(signer)) return false;

    transaction.approvals.set(signer, {
      signer,
      timestamp: Date.now(),
      signature,
    });

    // Check if enough approvals
    if (transaction.approvals.size >= transaction.requiredApprovals) {
      transaction.status = 'approved';
    }

    return true;
  }

  /**
   * Reject transaction
   */
  rejectTransaction(transactionId: string, signer: string, reason: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return false;
    if (transaction.status !== 'pending') return false;

    const wallet = this.wallets.get(transaction.walletId);
    if (!wallet || !wallet.owners.includes(signer)) return false;

    transaction.status = 'rejected';
    transaction.rejectionReason = reason;

    return true;
  }

  /**
   * Execute approved transaction
   */
  executeTransaction(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return false;
    if (transaction.status !== 'approved') return false;

    // Check time lock
    if (transaction.timeLockUntil && Date.now() < transaction.timeLockUntil) {
      return false; // Time lock not expired
    }

    const wallet = this.wallets.get(transaction.walletId);
    if (!wallet) return false;

    // Execute transaction
    wallet.totalBalance -= transaction.amount;
    wallet.updatedAt = Date.now();
    transaction.status = 'executed';
    transaction.executedAt = Date.now();

    return true;
  }

  /**
   * Create escrow for transaction
   */
  createEscrow(
    transactionId: string,
    escrowAgent: string,
    releaseConditions: string[]
  ): EscrowTransaction {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) throw new Error('Transaction not found');

    const escrow: EscrowTransaction = {
      id: `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      multisigTxId: transactionId,
      escrowAgent,
      releaseConditions,
      status: 'locked',
      amount: transaction.amount,
    };

    this.escrows.set(escrow.id, escrow);
    return escrow;
  }

  /**
   * Release escrow
   */
  releaseEscrow(escrowId: string, verifiedConditions: string[]): boolean {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) return false;
    if (escrow.status !== 'locked') return false;

    // Verify all conditions met
    const allConditionsMet = escrow.releaseConditions.every(c => verifiedConditions.includes(c));
    if (!allConditionsMet) return false;

    escrow.status = 'released';
    escrow.releasedAt = Date.now();

    return true;
  }

  /**
   * Get pending transactions for owner
   */
  getPendingTransactions(walletId: string, owner: string): MultiSigTransaction[] {
    return Array.from(this.transactions.values()).filter(
      t => t.walletId === walletId && t.status === 'pending' && !t.approvals.has(owner)
    );
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(walletId: string, limit: number = 50): MultiSigTransaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.walletId === walletId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get approval status
   */
  getApprovalStatus(transactionId: string): {
    approved: number;
    required: number;
    approvers: string[];
    pendingApprovers: string[];
  } {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) throw new Error('Transaction not found');

    const wallet = this.wallets.get(transaction.walletId);
    if (!wallet) throw new Error('Wallet not found');

    const approvers = Array.from(transaction.approvals.keys());
    const pendingApprovers = wallet.owners.filter(o => !approvers.includes(o) && o !== transaction.initiator);

    return {
      approved: transaction.approvals.size,
      required: transaction.requiredApprovals,
      approvers,
      pendingApprovers,
    };
  }

  /**
   * Add funds to wallet
   */
  addFunds(walletId: string, amount: number): boolean {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return false;

    wallet.totalBalance += amount;
    wallet.updatedAt = Date.now();

    return true;
  }

  /**
   * Get wallet statistics
   */
  getWalletStats(walletId: string): {
    totalTransactions: number;
    executedTransactions: number;
    pendingTransactions: number;
    totalExecutedAmount: number;
    averageApprovalTime: number;
  } {
    const transactions = Array.from(this.transactions.values()).filter(t => t.walletId === walletId);

    const executed = transactions.filter(t => t.status === 'executed');
    const pending = transactions.filter(t => t.status === 'pending');

    const totalExecutedAmount = executed.reduce((sum, t) => sum + t.amount, 0);

    const approvalTimes = executed
      .map(t => (t.executedAt || 0) - t.createdAt)
      .filter(t => t > 0);

    const averageApprovalTime = approvalTimes.length > 0
      ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
      : 0;

    return {
      totalTransactions: transactions.length,
      executedTransactions: executed.length,
      pendingTransactions: pending.length,
      totalExecutedAmount,
      averageApprovalTime,
    };
  }

  /**
   * Revoke approval
   */
  revokeApproval(transactionId: string, signer: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return false;
    if (transaction.status !== 'pending') return false;

    return transaction.approvals.delete(signer);
  }

  /**
   * Get all wallets
   */
  getAllWallets(): MultiSigWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Update wallet settings
   */
  updateWalletSettings(
    walletId: string,
    requiredSignatures?: number,
    owners?: string[]
  ): boolean {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return false;

    if (requiredSignatures && requiredSignatures > (owners?.length || wallet.owners.length)) {
      return false;
    }

    if (requiredSignatures) {
      wallet.requiredSignatures = requiredSignatures;
    }

    if (owners) {
      wallet.owners = owners;
    }

    wallet.updatedAt = Date.now();
    return true;
  }
}

export const multiSigWalletService = new MultiSigWalletService();
