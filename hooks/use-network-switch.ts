import { useCallback, useState } from 'react';
import { useBlockchain } from '@/lib/blockchain/blockchain-context';
import { useEthereumWallet as useWallet } from '@/hooks/use-ethereum-wallet';
import { BLOCKCHAINS, type BlockchainId } from '@/lib/blockchain/blockchain-config';

export interface NetworkSwitchResult {
  success: boolean;
  error?: string;
  previousBlockchain?: BlockchainId;
  newBlockchain?: BlockchainId;
}

/**
 * Hook for managing automatic network switching
 * Handles blockchain changes, wallet updates, and balance refresh
 */
export function useNetworkSwitch() {
  const { selectedBlockchain, setSelectedBlockchain } = useBlockchain();
  const { address, getBalance } = useWallet();
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchNetwork = useCallback(
    async (targetBlockchain: BlockchainId): Promise<NetworkSwitchResult> => {
      try {
        setIsSwitching(true);
        setError(null);

        // If already on target blockchain, return early
        if (selectedBlockchain === targetBlockchain) {
          return {
            success: true,
            previousBlockchain: selectedBlockchain,
            newBlockchain: targetBlockchain,
          };
        }

        const previousBlockchain = selectedBlockchain;
        const targetConfig = BLOCKCHAINS[targetBlockchain];

        // Update blockchain selection
        await setSelectedBlockchain(targetBlockchain);

        // Refresh balance for new network
        if (address) {
          await refreshBalance(targetBlockchain);
        }

        setIsSwitching(false);

        return {
          success: true,
          previousBlockchain,
          newBlockchain: targetBlockchain,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Network switch failed';
        setError(errorMessage);
        setIsSwitching(false);

        return {
          success: false,
          error: errorMessage,
          previousBlockchain: selectedBlockchain,
        };
      }
    },
    [selectedBlockchain, setSelectedBlockchain, address, getBalance]
  );

  const refreshBalance = useCallback(
    async (blockchain: BlockchainId) => {
      if (!address || !getBalance) return;

      try {
        // Fetch balance from wallet
        const balance = await getBalance();
        // Balance is already updated in wallet context
      } catch (err) {
        console.error('Failed to refresh balance:', err);
      }
    },
    [address, getBalance]
  );

  const getNetworkInfo = useCallback(() => {
    return {
      currentBlockchain: selectedBlockchain,
      chainId: BLOCKCHAINS[selectedBlockchain].chainId,
      chainName: BLOCKCHAINS[selectedBlockchain].name,
      rpcUrl: BLOCKCHAINS[selectedBlockchain].rpcUrl,
      blockExplorer: BLOCKCHAINS[selectedBlockchain].blockExplorer,
      nativeCurrency: BLOCKCHAINS[selectedBlockchain].nativeCurrency,
      color: BLOCKCHAINS[selectedBlockchain].color,
      icon: BLOCKCHAINS[selectedBlockchain].icon,
    };
  }, [selectedBlockchain]);

  return {
    switchNetwork,
    isSwitching,
    error,
    currentBlockchain: selectedBlockchain,
    networkInfo: getNetworkInfo(),
    refreshBalance: () => {
      if (address) {
        return refreshBalance(selectedBlockchain);
      }
      return Promise.resolve();
    },
  };
}
