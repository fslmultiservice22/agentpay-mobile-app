import { useState, useCallback } from 'react';
import {
  getERC20Info,
  getERC20Balance,
  getContractEvents,
  getContractTransactions,
  validateContract,
  getContractExplorerUrl,
  type SmartContract,
  type ContractEvent,
  type BlockchainType,
} from '@/lib/smart-contract/contract-service';

export interface UseSmartContractReturn {
  contract: SmartContract | null;
  balance: string | null;
  events: ContractEvent[];
  transactions: any[];
  loading: boolean;
  error: string | null;
  loadContract: (contractAddress: string, blockchain: BlockchainType) => Promise<boolean>;
  loadBalance: (contractAddress: string, walletAddress: string, blockchain: BlockchainType) => Promise<void>;
  loadEvents: (contractAddress: string, blockchain: BlockchainType, eventName?: string) => Promise<void>;
  loadTransactions: (contractAddress: string, blockchain: BlockchainType) => Promise<void>;
  getExplorerUrl: (contractAddress: string, blockchain: BlockchainType) => string;
}

/**
 * Hook per gestire smart contract
 */
export function useSmartContract(): UseSmartContractReturn {
  const [contract, setContract] = useState<SmartContract | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carica le informazioni del contratto
   */
  const loadContract = useCallback(
    async (contractAddress: string, blockchain: BlockchainType): Promise<boolean> => {
      try {
        setError(null);
        setLoading(true);

        const isValid = await validateContract(contractAddress, blockchain);
        if (!isValid) {
          setError('Invalid contract address');
          return false;
        }

        const contractInfo = await getERC20Info(contractAddress, blockchain);
        if (!contractInfo) {
          setError('Failed to load contract info');
          return false;
        }

        setContract(contractInfo);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load contract';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Carica il balance di un token
   */
  const loadBalance = useCallback(
    async (contractAddress: string, walletAddress: string, blockchain: BlockchainType) => {
      try {
        setError(null);
        setLoading(true);

        const bal = await getERC20Balance(contractAddress, walletAddress, blockchain);
        if (bal !== null) {
          setBalance(bal);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load balance';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Carica gli eventi del contratto
   */
  const loadEvents = useCallback(
    async (contractAddress: string, blockchain: BlockchainType, eventName?: string) => {
      try {
        setError(null);
        setLoading(true);

        const evts = await getContractEvents(contractAddress, blockchain, eventName);
        setEvents(evts);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load events';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Carica le transazioni del contratto
   */
  const loadTransactions = useCallback(
    async (contractAddress: string, blockchain: BlockchainType) => {
      try {
        setError(null);
        setLoading(true);

        const txs = await getContractTransactions(contractAddress, blockchain);
        setTransactions(txs);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load transactions';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Ottiene l'URL dell'explorer
   */
  const getExplorerUrl = useCallback(
    (contractAddress: string, blockchain: BlockchainType): string => {
      return getContractExplorerUrl(contractAddress, blockchain);
    },
    []
  );

  return {
    contract,
    balance,
    events,
    transactions,
    loading,
    error,
    loadContract,
    loadBalance,
    loadEvents,
    loadTransactions,
    getExplorerUrl,
  };
}
