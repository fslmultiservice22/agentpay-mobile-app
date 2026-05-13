import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export interface StakingPool {
  id: string;
  name: string;
  token: string;
  apy: number;
  tvl: string;
  minStake: string;
  maxStake: string;
  lockupPeriod: number; // in days
  riskLevel: 'low' | 'medium' | 'high';
}

export interface StakingPosition {
  poolId: string;
  amount: string;
  stakedAt: number;
  unlocksAt: number;
  rewards: string;
  status: 'active' | 'locked' | 'unlocked';
}

export interface StakingResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

interface StakingState {
  pools: StakingPool[];
  positions: StakingPosition[];
  isLoading: boolean;
  error: string | null;
}

// Pool di staking di test
const STAKING_POOLS: StakingPool[] = [
  {
    id: 'eth-staking-1',
    name: 'Ethereum Staking',
    token: 'ETH',
    apy: 4.5,
    tvl: '2,500,000',
    minStake: '0.1',
    maxStake: '1000',
    lockupPeriod: 0,
    riskLevel: 'low',
  },
  {
    id: 'usdc-staking-1',
    name: 'USDC Yield',
    token: 'USDC',
    apy: 8.2,
    tvl: '50,000,000',
    minStake: '100',
    maxStake: '1000000',
    lockupPeriod: 30,
    riskLevel: 'low',
  },
  {
    id: 'dai-staking-1',
    name: 'DAI Compound',
    token: 'DAI',
    apy: 6.8,
    tvl: '30,000,000',
    minStake: '50',
    maxStake: '500000',
    lockupPeriod: 7,
    riskLevel: 'medium',
  },
  {
    id: 'lp-staking-1',
    name: 'LP Token Farming',
    token: 'LP-ETH/USDC',
    apy: 25.0,
    tvl: '5,000,000',
    minStake: '1',
    maxStake: '100000',
    lockupPeriod: 14,
    riskLevel: 'high',
  },
];

export function useStaking(signer: ethers.Signer | null) {
  const [state, setState] = useState<StakingState>({
    pools: STAKING_POOLS,
    positions: [],
    isLoading: false,
    error: null,
  });

  const stake = useCallback(
    async (poolId: string, amount: string): Promise<StakingResult> => {
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

        // Valida l'importo
        const amountNum = parseFloat(amount);
        if (amountNum <= 0) {
          return {
            success: false,
            error: 'Invalid staking amount',
          };
        }

        // Trova il pool
        const pool = state.pools.find(p => p.id === poolId);
        if (!pool) {
          return {
            success: false,
            error: 'Pool not found',
          };
        }

        // Valida i limiti
        const minStake = parseFloat(pool.minStake);
        const maxStake = parseFloat(pool.maxStake);

        if (amountNum < minStake || amountNum > maxStake) {
          return {
            success: false,
            error: `Amount must be between ${minStake} and ${maxStake}`,
          };
        }

        // Simula lo staking
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Genera un hash di transazione simulato
        const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        // Crea una nuova posizione di staking
        const now = Date.now();
        const unlocksAt = now + pool.lockupPeriod * 24 * 60 * 60 * 1000;

        const newPosition: StakingPosition = {
          poolId,
          amount,
          stakedAt: now,
          unlocksAt,
          rewards: '0',
          status: pool.lockupPeriod > 0 ? 'locked' : 'active',
        };

        setState(prev => ({
          ...prev,
          positions: [...prev.positions, newPosition],
          isLoading: false,
        }));

        return {
          success: true,
          transactionHash: txHash,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Staking failed';
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
    [signer, state.pools],
  );

  const unstake = useCallback(
    async (poolId: string, amount: string): Promise<StakingResult> => {
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

        // Trova la posizione
        const position = state.positions.find(p => p.poolId === poolId);
        if (!position) {
          return {
            success: false,
            error: 'Staking position not found',
          };
        }

        // Verifica se è sbloccata
        if (position.status === 'locked' && Date.now() < position.unlocksAt) {
          return {
            success: false,
            error: 'Staking position is still locked',
          };
        }

        // Simula l'unstaking
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Genera un hash di transazione simulato
        const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        // Rimuovi la posizione
        setState(prev => ({
          ...prev,
          positions: prev.positions.filter(p => p.poolId !== poolId),
          isLoading: false,
        }));

        return {
          success: true,
          transactionHash: txHash,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unstaking failed';
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
    [signer, state.positions],
  );

  const claimRewards = useCallback(
    async (poolId: string): Promise<StakingResult> => {
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

        // Trova la posizione
        const position = state.positions.find(p => p.poolId === poolId);
        if (!position) {
          return {
            success: false,
            error: 'Staking position not found',
          };
        }

        // Simula il claim dei rewards
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Genera un hash di transazione simulato
        const txHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');

        // Aggiorna la posizione
        setState(prev => ({
          ...prev,
          positions: prev.positions.map(p =>
            p.poolId === poolId
              ? {
                  ...p,
                  rewards: '0',
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
        const errorMessage = err instanceof Error ? err.message : 'Claim rewards failed';
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
    [signer, state.positions],
  );

  const calculateRewards = useCallback(
    (poolId: string, days: number = 1): string => {
      const position = state.positions.find(p => p.poolId === poolId);
      if (!position) return '0';

      const pool = state.pools.find(p => p.id === poolId);
      if (!pool) return '0';

      const amount = parseFloat(position.amount);
      const apy = pool.apy / 100;
      const dailyRate = apy / 365;
      const rewards = amount * dailyRate * days;

      return rewards.toFixed(6);
    },
    [state.positions, state.pools],
  );

  return {
    pools: state.pools,
    positions: state.positions,
    isLoading: state.isLoading,
    error: state.error,
    stake,
    unstake,
    claimRewards,
    calculateRewards,
  };
}
