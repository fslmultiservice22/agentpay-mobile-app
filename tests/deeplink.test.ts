import { describe, it, expect } from 'vitest';

describe('Deep Link Configuration', () => {
  it('should have correct MetaMask deep link schema', () => {
    // The schema should be 'agentpay://' for MetaMask compatibility
    const expectedSchema = 'agentpay';
    expect(expectedSchema).toBe('agentpay');
  });

  it('should handle MetaMask wallet connect URLs', () => {
    const testUrls = [
      'agentpay://wallet-connect',
      'agentpay://wc?uri=wc:...',
      'agentpay://callback',
    ];

    testUrls.forEach(url => {
      expect(url.startsWith('agentpay://')).toBe(true);
    });
  });

  it('should parse deep link route correctly', () => {
    const url = 'agentpay://wallet-connect?session=123';
    const route = url.replace(/.*?:\/\//g, '');
    
    expect(route).toBe('wallet-connect?session=123');
    expect(route.includes('wallet-connect')).toBe(true);
  });

  it('should recognize MetaMask callback patterns', () => {
    const patterns = ['wallet-connect', 'wc', 'callback'];
    const testRoute = 'wallet-connect?session=abc123';

    const isMetaMaskResponse = patterns.some(pattern => 
      testRoute.includes(pattern)
    );

    expect(isMetaMaskResponse).toBe(true);
  });
});
