import { useState, useCallback, useEffect } from 'react';
import { liquidityPoolService, type LiquidityPool, type LiquidityPosition, type LiquidityTransaction } from '@/lib/liquidity-pool-service';

export interface UseLiquidityPoolReturn {
  pools: LiquidityPool[];
  positions: LiquidityPosition[];
  transactions: LiquidityTransaction[];
  isLoading: boolean;
  error: string | null;
  
  getPools: () => LiquidityPool[];
  getPoolsByChain: (chainId: string) => LiquidityPool[];
  getPool: (poolId: string) => LiquidityPool | undefined;
  addLiquidity: (poolId: string, userAddress: string, token0Amount: string, token1Amount: string) => Promise<LiquidityTransaction | null>;
  removeLiquidity: (positionId: string, lpTokenAmount: string) => Promise<LiquidityTransaction | null>;
  claimFees: (positionId: string) => Promise<LiquidityTransaction | null>;
  getPoolStats: () => any;
  refresh: () => void;
}

/**
 * Hook for Liquidity Pool management
 */
export function useLiquidityPool(): UseLiquidityPoolReturn {
  const [pools, setPools] = useState<LiquidityPool[]>([]);
  const [positions, setPositions] = useState<LiquidityPosition[]>([]);
  const [transactions, setTransactions] = useState<LiquidityTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetPools = useCallback((): LiquidityPool[] => {
    return liquidityPoolService.getPools();
  }, []);

  const handleGetPoolsByChain = useCallback((chainId: string): LiquidityPool[] => {
    return liquidityPoolService.getPoolsByChain(chainId);
  }, []);

  const handleGetPool = useCallback((poolId: string): LiquidityPool | undefined => {
    return liquidityPoolService.getPool(poolId);
  }, []);

  const handleAddLiquidity = useCallback(
    async (poolId: string, userAddress: string, token0Amount: string, token1Amount: string): Promise<LiquidityTransaction | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const tx = await liquidityPoolService.addLiquidity(poolId, userAddress, token0Amount, token1Amount);
        if (tx) {
          setTransactions(liquidityPoolService.getTransactions());
        }
        return tx;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add liquidity';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleRemoveLiquidity = useCallback(
    async (positionId: string, lpTokenAmount: string): Promise<LiquidityTransaction | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const tx = await liquidityPoolService.removeLiquidity(positionId, lpTokenAmount);
        if (tx) {
          setTransactions(liquidityPoolService.getTransactions());
        }
        return tx;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove liquidity';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleClaimFees = useCallback(
    async (positionId: string): Promise<LiquidityTransaction | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const tx = await liquidityPoolService.claimFees(positionId);
        if (tx) {
          setTransactions(liquidityPoolService.getTransactions());
        }
        return tx;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to claim fees';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleGetPoolStats = useCallback(() => {
    return liquidityPoolService.getPoolStats();
  }, []);

  const handleRefresh = useCallback(() => {
    setPools(liquidityPoolService.getPools());
    setTransactions(liquidityPoolService.getTransactions());
  }, []);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return {
    pools,
    positions,
    transactions,
    isLoading,
    error,
    getPools: handleGetPools,
    getPoolsByChain: handleGetPoolsByChain,
    getPool: handleGetPool,
    addLiquidity: handleAddLiquidity,
    removeLiquidity: handleRemoveLiquidity,
    claimFees: handleClaimFees,
    getPoolStats: handleGetPoolStats,
    refresh: handleRefresh,
  };
}
