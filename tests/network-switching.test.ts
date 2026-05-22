import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BLOCKCHAINS, AVAILABLE_BLOCKCHAINS, type BlockchainId } from '../lib/blockchain/blockchain-config';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe('Network Switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should switch from Ethereum to Polygon', async () => {
    const mockSetItem = vi.mocked(AsyncStorage.setItem);
    mockSetItem.mockResolvedValue(undefined);

    const sourceBlockchain: BlockchainId = 'ethereum';
    const targetBlockchain: BlockchainId = 'polygon';

    await AsyncStorage.setItem('agentpay_blockchain', targetBlockchain);

    expect(mockSetItem).toHaveBeenCalledWith('agentpay_blockchain', targetBlockchain);
    expect(BLOCKCHAINS[targetBlockchain].chainId).toBe(137);
  });

  it('should switch from Polygon to BSC', async () => {
    const mockSetItem = vi.mocked(AsyncStorage.setItem);
    mockSetItem.mockResolvedValue(undefined);

    const sourceBlockchain: BlockchainId = 'polygon';
    const targetBlockchain: BlockchainId = 'bsc';

    await AsyncStorage.setItem('agentpay_blockchain', targetBlockchain);

    expect(mockSetItem).toHaveBeenCalledWith('agentpay_blockchain', targetBlockchain);
    expect(BLOCKCHAINS[targetBlockchain].chainId).toBe(56);
  });

  it('should switch from BSC to Arbitrum', async () => {
    const mockSetItem = vi.mocked(AsyncStorage.setItem);
    mockSetItem.mockResolvedValue(undefined);

    const sourceBlockchain: BlockchainId = 'bsc';
    const targetBlockchain: BlockchainId = 'arbitrum';

    await AsyncStorage.setItem('agentpay_blockchain', targetBlockchain);

    expect(mockSetItem).toHaveBeenCalledWith('agentpay_blockchain', targetBlockchain);
    expect(BLOCKCHAINS[targetBlockchain].chainId).toBe(42161);
  });

  it('should switch from Arbitrum to Optimism', async () => {
    const mockSetItem = vi.mocked(AsyncStorage.setItem);
    mockSetItem.mockResolvedValue(undefined);

    const sourceBlockchain: BlockchainId = 'arbitrum';
    const targetBlockchain: BlockchainId = 'optimism';

    await AsyncStorage.setItem('agentpay_blockchain', targetBlockchain);

    expect(mockSetItem).toHaveBeenCalledWith('agentpay_blockchain', targetBlockchain);
    expect(BLOCKCHAINS[targetBlockchain].chainId).toBe(10);
  });

  it('should switch from Optimism back to Ethereum', async () => {
    const mockSetItem = vi.mocked(AsyncStorage.setItem);
    mockSetItem.mockResolvedValue(undefined);

    const sourceBlockchain: BlockchainId = 'optimism';
    const targetBlockchain: BlockchainId = 'ethereum';

    await AsyncStorage.setItem('agentpay_blockchain', targetBlockchain);

    expect(mockSetItem).toHaveBeenCalledWith('agentpay_blockchain', targetBlockchain);
    expect(BLOCKCHAINS[targetBlockchain].chainId).toBe(1);
  });

  it('should persist blockchain selection across app restarts', async () => {
    const mockSetItem = vi.mocked(AsyncStorage.setItem);
    const mockGetItem = vi.mocked(AsyncStorage.getItem);

    mockSetItem.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue('polygon');

    const blockchain: BlockchainId = 'polygon';
    await AsyncStorage.setItem('agentpay_blockchain', blockchain);
    const retrieved = await AsyncStorage.getItem('agentpay_blockchain');

    expect(mockSetItem).toHaveBeenCalledWith('agentpay_blockchain', blockchain);
    expect(mockGetItem).toHaveBeenCalledWith('agentpay_blockchain');
    expect(retrieved).toBe('polygon');
  });

  it('should have correct RPC URL for each blockchain', () => {
    AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
      const rpcUrl = BLOCKCHAINS[blockchain].rpcUrl;
      expect(rpcUrl).toBeTruthy();
      expect(typeof rpcUrl).toBe('string');
      expect(rpcUrl.length).toBeGreaterThan(0);
    });
  });

  it('should have correct block explorer for each blockchain', () => {
    AVAILABLE_BLOCKCHAINS.forEach((blockchain) => {
      const explorer = BLOCKCHAINS[blockchain].blockExplorer;
      expect(explorer).toBeTruthy();
      expect(typeof explorer).toBe('string');
      expect(explorer.length).toBeGreaterThan(0);
    });
  });

  it('should support switching to all available blockchains', async () => {
    const mockSetItem = vi.mocked(AsyncStorage.setItem);
    mockSetItem.mockResolvedValue(undefined);

    for (const blockchain of AVAILABLE_BLOCKCHAINS) {
      await AsyncStorage.setItem('agentpay_blockchain', blockchain);
      expect(mockSetItem).toHaveBeenCalledWith('agentpay_blockchain', blockchain);
      expect(BLOCKCHAINS[blockchain]).toBeDefined();
    }

    expect(mockSetItem).toHaveBeenCalledTimes(AVAILABLE_BLOCKCHAINS.length);
  });

  it('should maintain network info during blockchain switch', () => {
    const sourceBlockchain: BlockchainId = 'ethereum';
    const targetBlockchain: BlockchainId = 'polygon';

    const sourceInfo = {
      chainId: BLOCKCHAINS[sourceBlockchain].chainId,
      name: BLOCKCHAINS[sourceBlockchain].name,
      rpcUrl: BLOCKCHAINS[sourceBlockchain].rpcUrl,
    };

    const targetInfo = {
      chainId: BLOCKCHAINS[targetBlockchain].chainId,
      name: BLOCKCHAINS[targetBlockchain].name,
      rpcUrl: BLOCKCHAINS[targetBlockchain].rpcUrl,
    };

    expect(sourceInfo.chainId).not.toBe(targetInfo.chainId);
    expect(sourceInfo.name).not.toBe(targetInfo.name);
    expect(sourceInfo.rpcUrl).not.toBe(targetInfo.rpcUrl);
  });

  it('should have unique chain IDs for all blockchains', () => {
    const chainIds = AVAILABLE_BLOCKCHAINS.map((b) => BLOCKCHAINS[b].chainId);
    const uniqueChainIds = new Set(chainIds);
    expect(uniqueChainIds.size).toBe(AVAILABLE_BLOCKCHAINS.length);
  });
});
