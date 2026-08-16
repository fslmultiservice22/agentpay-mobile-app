import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBlockchainAPIService, initializeBlockchainAPI } from '../lib/blockchain-api';
import { getQRWalletConnectService, initializeQRWalletConnect } from '../lib/qr-walletconnect';
import { getThemeManager, initializeThemeManager } from '../lib/theme-manager';

describe('Blockchain API Service', () => {
  beforeEach(() => {
    initializeBlockchainAPI({
      provider: 'alchemy',
      alchemyApiKey: 'test-key',
    });
  });

  it('should validate Ethereum address', async () => {
    const service = getBlockchainAPIService();
    const validAddress = '0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4';
    const result = await service.validateAddress(validAddress);
    expect(result).toBe(true);
  });

  it('should reject invalid Ethereum address', async () => {
    const service = getBlockchainAPIService();
    const invalidAddress = 'not-an-address';
    const result = await service.validateAddress(invalidAddress);
    expect(result).toBe(false);
  });

  // The two checks below hit a public RPC endpoint. Network latency or rate
  // limiting made them flaky in CI, so the transport is stubbed and the test now
  // verifies the shape returned by the service rather than the remote node.
  it('should get network info', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x112a880' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const service = getBlockchainAPIService();
      const networkInfo = await service.getNetworkInfo();
      expect(networkInfo).toHaveProperty('chainId');
      expect(networkInfo).toHaveProperty('blockNumber');
    } finally {
      vi.unstubAllGlobals();
    }
  }, 15000);

  it('should get gas price', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x3b9aca00' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const service = getBlockchainAPIService();
      const gasPrice = await service.getGasPrice();
      expect(gasPrice).toHaveProperty('standard');
      expect(gasPrice).toHaveProperty('fast');
      expect(gasPrice).toHaveProperty('fastest');
    } finally {
      vi.unstubAllGlobals();
    }
  }, 15000);
});

describe('QR WalletConnect Service', () => {
  beforeEach(() => {
    initializeQRWalletConnect({
      projectId: 'test-project-id',
      appName: 'AgentPay Wallet',
    });
  });

  it('should parse WalletConnect QR code', () => {
    const service = getQRWalletConnectService();
    const qrData = 'wc:a1b2c3d4@1?bridge=https://bridge.walletconnect.org&key=test-key';
    const parsed = service.parseQRCode(qrData);
    expect(parsed.type).toBe('walletconnect');
    expect(parsed.metadata).toHaveProperty('topic');
    expect(parsed.metadata?.version).toBe(1);
  });

  it('should parse Ethereum address QR code', () => {
    const service = getQRWalletConnectService();
    const address = '0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4';
    const parsed = service.parseQRCode(address);
    expect(parsed.type).toBe('ethereum');
    expect(parsed.data).toBe(address);
  });

  it('should parse custom JSON QR code', () => {
    const service = getQRWalletConnectService();
    const jsonData = JSON.stringify({ type: 'payment', amount: 100 });
    const parsed = service.parseQRCode(jsonData);
    expect(parsed.type).toBe('other');
    expect(parsed.metadata).toEqual({ type: 'payment', amount: 100 });
  });

  it('should check if wallet is connected', () => {
    const service = getQRWalletConnectService();
    expect(service.isConnected()).toBe(false);
  });
});

describe('Theme Manager Service', () => {
  beforeEach(() => {
    initializeThemeManager();
  });

  it('should get current theme', () => {
    const manager = getThemeManager();
    const theme = manager.getCurrentTheme();
    expect(['light', 'dark', 'auto']).toContain(theme);
  });

  it('should set theme', () => {
    const manager = getThemeManager();
    manager.setTheme('dark');
    expect(manager.getCurrentTheme()).toBe('dark');
  });

  it('should toggle theme', () => {
    const manager = getThemeManager();
    const initialTheme = manager.getCurrentTheme();
    manager.toggleTheme();
    const newTheme = manager.getCurrentTheme();
    expect(newTheme).not.toBe(initialTheme);
  });

  it('should get effective theme', () => {
    const manager = getThemeManager();
    manager.setTheme('light');
    const effectiveTheme = manager.getEffectiveTheme();
    expect(effectiveTheme).toBe('light');
  });

  it('should get theme colors', () => {
    const manager = getThemeManager();
    manager.setTheme('light');
    const colors = manager.getColors();
    expect(colors).toHaveProperty('background');
    expect(colors).toHaveProperty('foreground');
    expect(colors).toHaveProperty('primary');
  });

  it('should emit theme_changed event', () => {
    return new Promise<void>((resolve) => {
      const manager = getThemeManager();
      manager.on('theme_changed', (theme) => {
        expect(theme).toBe('dark');
        resolve();
      });
      manager.setTheme('dark');
    });
  });
});

describe('Integration Tests', () => {
  it('should initialize all services', () => {
    initializeBlockchainAPI({
      provider: 'alchemy',
      alchemyApiKey: 'test-key',
    });

    initializeQRWalletConnect({
      projectId: 'test-project-id',
      appName: 'AgentPay Wallet',
    });

    initializeThemeManager();

    const blockchainService = getBlockchainAPIService();
    const qrService = getQRWalletConnectService();
    const themeManager = getThemeManager();

    expect(blockchainService).toBeDefined();
    expect(qrService).toBeDefined();
    expect(themeManager).toBeDefined();
  });

  it('should handle multiple QR code types', () => {
    const service = getQRWalletConnectService();

    const walletConnectQR = 'wc:a1b2c3d4@1?bridge=https://bridge.walletconnect.org&key=test-key';
    const ethereumQR = '0xeae7380dd4cef6fbd1144f49e4d1e6964258a4f4';
    const jsonQR = JSON.stringify({ data: 'test' });

    const parsed1 = service.parseQRCode(walletConnectQR);
    const parsed2 = service.parseQRCode(ethereumQR);
    const parsed3 = service.parseQRCode(jsonQR);

    expect(parsed1.type).toBe('walletconnect');
    expect(parsed2.type).toBe('ethereum');
    expect(parsed3.type).toBe('other');
  });
});
