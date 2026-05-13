import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export interface DAOProposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'executed';
  startBlock: number;
  endBlock: number;
  createdAt: number;
  executedAt?: number;
}

export interface DAOMember {
  address: string;
  votingPower: string;
  delegatedTo?: string;
  proposalCount: number;
  voteCount: number;
}

export interface DAOTreasury {
  totalBalance: string;
  tokenBalances: Record<string, string>;
  allocations: Array<{
    name: string;
    amount: string;
    percentage: number;
  }>;
}

interface DAOGovernanceState {
  proposals: DAOProposal[];
  members: DAOMember[];
  treasury: DAOTreasury | null;
  isLoading: boolean;
  error: string | null;
}

// Proposte di test
const SAMPLE_PROPOSALS: DAOProposal[] = [
  {
    id: 'prop_1',
    title: 'Increase Staking Rewards to 15%',
    description: 'Proposal to increase APY for staking pools from 12% to 15% to attract more liquidity',
    proposer: '0x742d35Cc6634C0532925a3b844Bc9e7595f42bE',
    votesFor: '1250000',
    votesAgainst: '350000',
    votesAbstain: '150000',
    status: 'active',
    startBlock: 18500000,
    endBlock: 18510000,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'prop_2',
    title: 'Launch New NFT Marketplace',
    description: 'Proposal to allocate 500k AGNT tokens for developing a new NFT marketplace',
    proposer: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
    votesFor: '2100000',
    votesAgainst: '450000',
    votesAbstain: '200000',
    status: 'succeeded',
    startBlock: 18400000,
    endBlock: 18410000,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'prop_3',
    title: 'Treasury Diversification Strategy',
    description: 'Proposal to diversify treasury holdings into stable coins and blue-chip tokens',
    proposer: '0x3cD751E6b0078Be393132286c08EE91EA2CF3eA3',
    votesFor: '1800000',
    votesAgainst: '600000',
    votesAbstain: '350000',
    status: 'pending',
    startBlock: 18600000,
    endBlock: 18610000,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
  },
];

export function useDAOGovernance(signer: ethers.Signer | null) {
  const [state, setState] = useState<DAOGovernanceState>({
    proposals: SAMPLE_PROPOSALS,
    members: [],
    treasury: {
      totalBalance: '50000000',
      tokenBalances: {
        AGNT: '30000000',
        ETH: '500',
        USDC: '5000000',
        DAI: '3000000',
      },
      allocations: [
        { name: 'Development', amount: '15000000', percentage: 30 },
        { name: 'Marketing', amount: '10000000', percentage: 20 },
        { name: 'Liquidity', amount: '12500000', percentage: 25 },
        { name: 'Reserves', amount: '12500000', percentage: 25 },
      ],
    },
    isLoading: false,
    error: null,
  });

  const createProposal = useCallback(
    async (title: string, description: string): Promise<{ success: boolean; proposalId?: string; error?: string }> => {
      if (!signer) {
        return {
          success: false,
          error: 'Signer not available',
        };
      }

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida i parametri
        if (!title.trim() || !description.trim()) {
          return {
            success: false,
            error: 'Title and description are required',
          };
        }

        // Simula la creazione della proposta
        await new Promise(resolve => setTimeout(resolve, 2000));

        const proposalId = `prop_${Date.now()}`;
        const newProposal: DAOProposal = {
          id: proposalId,
          title,
          description,
          proposer: '0x' + Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
          votesFor: '0',
          votesAgainst: '0',
          votesAbstain: '0',
          status: 'pending',
          startBlock: 18700000,
          endBlock: 18710000,
          createdAt: Date.now(),
        };

        setState(prev => ({
          ...prev,
          proposals: [newProposal, ...prev.proposals],
          isLoading: false,
        }));

        return {
          success: true,
          proposalId,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create proposal';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [signer],
  );

  const castVote = useCallback(
    async (proposalId: string, support: 0 | 1 | 2): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
      if (!signer) {
        return {
          success: false,
          error: 'Signer not available',
        };
      }

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida il voto (0=against, 1=for, 2=abstain)
        if (![0, 1, 2].includes(support)) {
          return {
            success: false,
            error: 'Invalid vote option',
          };
        }

        // Simula il voto
        await new Promise(resolve => setTimeout(resolve, 1500));

        const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        // Aggiorna la proposta
        setState(prev => ({
          ...prev,
          proposals: prev.proposals.map(p => {
            if (p.id === proposalId) {
              const votePower = '100000'; // Simula il potere di voto
              if (support === 1) {
                return { ...p, votesFor: (parseFloat(p.votesFor) + parseFloat(votePower)).toString() };
              } else if (support === 0) {
                return { ...p, votesAgainst: (parseFloat(p.votesAgainst) + parseFloat(votePower)).toString() };
              } else {
                return { ...p, votesAbstain: (parseFloat(p.votesAbstain) + parseFloat(votePower)).toString() };
              }
            }
            return p;
          }),
          isLoading: false,
        }));

        return {
          success: true,
          transactionHash: txHash,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cast vote';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [signer],
  );

  const delegateVotes = useCallback(
    async (delegatee: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
      if (!signer) {
        return {
          success: false,
          error: 'Signer not available',
        };
      }

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida l'indirizzo
        if (!ethers.isAddress(delegatee)) {
          return {
            success: false,
            error: 'Invalid delegatee address',
          };
        }

        // Simula la delega
        await new Promise(resolve => setTimeout(resolve, 1500));

        const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        setState(prev => ({
          ...prev,
          isLoading: false,
        }));

        return {
          success: true,
          transactionHash: txHash,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delegate votes';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [signer],
  );

  const executeProposal = useCallback(
    async (proposalId: string): Promise<{ success: boolean; transactionHash?: string; error?: string }> => {
      if (!signer) {
        return {
          success: false,
          error: 'Signer not available',
        };
      }

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Trova la proposta
        const proposal = state.proposals.find(p => p.id === proposalId);
        if (!proposal) {
          return {
            success: false,
            error: 'Proposal not found',
          };
        }

        // Simula l'esecuzione
        await new Promise(resolve => setTimeout(resolve, 2000));

        const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        // Aggiorna la proposta
        setState(prev => ({
          ...prev,
          proposals: prev.proposals.map(p =>
            p.id === proposalId
              ? {
                  ...p,
                  status: 'executed',
                  executedAt: Date.now(),
                }
              : p,
          ),
          isLoading: false,
        }));

        return {
          success: true,
          transactionHash: txHash,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to execute proposal';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [signer, state.proposals],
  );

  const getProposalStats = useCallback(() => {
    const total = state.proposals.length;
    const active = state.proposals.filter(p => p.status === 'active').length;
    const succeeded = state.proposals.filter(p => p.status === 'succeeded').length;
    const defeated = state.proposals.filter(p => p.status === 'defeated').length;

    return {
      total,
      active,
      succeeded,
      defeated,
      executionRate: total > 0 ? ((succeeded / total) * 100).toFixed(1) : '0',
    };
  }, [state.proposals]);

  return {
    proposals: state.proposals,
    members: state.members,
    treasury: state.treasury,
    isLoading: state.isLoading,
    error: state.error,
    createProposal,
    castVote,
    delegateVotes,
    executeProposal,
    getProposalStats,
  };
}
