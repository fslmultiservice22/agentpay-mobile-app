/**
 * Global ambient augmentations for the AgentPay Wallet app.
 */

export interface EthereumProvider {
  isMetaMask?: boolean;
  chainId?: string;
  selectedAddress?: string | null;
  request(args: { method: string; params?: unknown[] | object }): Promise<any>;
  on(event: string, handler: (...args: any[]) => void): void;
  removeListener(event: string, handler: (...args: any[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
