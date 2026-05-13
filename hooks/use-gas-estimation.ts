import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export interface GasEstimate {
  standard: {
    gasPrice: string;
    gasLimit: string;
    totalFee: string;
    estimatedTime: string;
  };
  fast: {
    gasPrice: string;
    gasLimit: string;
    totalFee: string;
    estimatedTime: string;
  };
  slow: {
    gasPrice: string;
    gasLimit: string;
    totalFee: string;
    estimatedTime: string;
  };
}

interface GasEstimationState {
  estimate: GasEstimate | null;
  isLoading: boolean;
  error: string | null;
}

export function useGasEstimation(provider: ethers.Provider | null) {
  const [state, setState] = useState<GasEstimationState>({
    estimate: null,
    isLoading: false,
    error: null,
  });

  const estimateGas = useCallback(
    async (to: string, value: string): Promise<GasEstimate | null> => {
      if (!provider) {
        setState(prev => ({
          ...prev,
          error: 'Provider not available',
        }));
        return null;
      }

      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          error: null,
        }));

        // Valida l'indirizzo
        if (!ethers.isAddress(to)) {
          throw new Error('Invalid recipient address');
        }

        // Ottieni il gas price corrente
        const feeData = await provider.getFeeData();
        if (!feeData.gasPrice) {
          throw new Error('Unable to fetch gas price');
        }

        // Stima il gas limit
        const gasLimit = await provider.estimateGas({
          to,
          value: ethers.parseEther(value),
        });

        // Calcola i gas prices per diverse velocità
        const basePriceGwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
        const basePriceNum = parseFloat(basePriceGwei);

        const slowPrice = ethers.parseUnits((basePriceNum * 0.8).toFixed(2), 'gwei');
        const standardPrice = feeData.gasPrice;
        const fastPrice = ethers.parseUnits((basePriceNum * 1.5).toFixed(2), 'gwei');

        // Calcola le fee totali
        const slowFee = (slowPrice * gasLimit) / BigInt(10 ** 18);
        const standardFee = (standardPrice * gasLimit) / BigInt(10 ** 18);
        const fastFee = (fastPrice * gasLimit) / BigInt(10 ** 18);

        const estimate: GasEstimate = {
          slow: {
            gasPrice: ethers.formatUnits(slowPrice, 'gwei'),
            gasLimit: gasLimit.toString(),
            totalFee: ethers.formatEther(slowFee),
            estimatedTime: '30-60 seconds',
          },
          standard: {
            gasPrice: ethers.formatUnits(standardPrice, 'gwei'),
            gasLimit: gasLimit.toString(),
            totalFee: ethers.formatEther(standardFee),
            estimatedTime: '15-30 seconds',
          },
          fast: {
            gasPrice: ethers.formatUnits(fastPrice, 'gwei'),
            gasLimit: gasLimit.toString(),
            totalFee: ethers.formatEther(fastFee),
            estimatedTime: '5-15 seconds',
          },
        };

        setState({
          estimate,
          isLoading: false,
          error: null,
        });

        return estimate;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gas estimation failed';
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [provider],
  );

  const getGasPrice = useCallback(async (): Promise<string | null> => {
    if (!provider) {
      setState(prev => ({
        ...prev,
        error: 'Provider not available',
      }));
      return null;
    }

    try {
      const feeData = await provider.getFeeData();
      if (!feeData.gasPrice) {
        throw new Error('Unable to fetch gas price');
      }

      return ethers.formatUnits(feeData.gasPrice, 'gwei');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get gas price';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      return null;
    }
  }, [provider]);

  const estimateGasLimit = useCallback(
    async (to: string, value: string): Promise<string | null> => {
      if (!provider) {
        setState(prev => ({
          ...prev,
          error: 'Provider not available',
        }));
        return null;
      }

      try {
        const gasLimit = await provider.estimateGas({
          to,
          value: ethers.parseEther(value),
        });

        return gasLimit.toString();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gas limit estimation failed';
        setState(prev => ({
          ...prev,
          error: errorMessage,
        }));
        return null;
      }
    },
    [provider],
  );

  return {
    estimate: state.estimate,
    isLoading: state.isLoading,
    error: state.error,
    estimateGas,
    getGasPrice,
    estimateGasLimit,
  };
}
