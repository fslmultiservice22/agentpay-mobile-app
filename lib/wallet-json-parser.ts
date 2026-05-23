/**
 * Wallet JSON Parser - Parse and validate wallet configuration JSON
 * Supports blockchains, tokens, contacts, and wallet settings
 */

export interface WalletJSON {
  version: string;
  chainId?: number;
  walletAddress?: string;
  blockchains?: BlockchainConfig[];
  tokens?: TokenConfig[];
  contacts?: ContactConfig[];
  settings?: WalletSettings;
  customTokens?: TokenConfig[];
  authorization?: AuthorizationConfig;
  tradingSettings?: TradingSettings;
  sidebarCollapsed?: boolean;
  skipImport?: boolean;
}

export interface BlockchainConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl?: string;
  explorerUrl?: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface TokenConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoUrl?: string;
  balance?: string;
  value?: number;
}

export interface ContactConfig {
  id: string;
  name: string;
  address: string;
  chainId?: number;
  type?: 'wallet' | 'contract' | 'exchange';
}

export interface WalletSettings {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  currency?: string;
  notifications?: boolean;
  autoLock?: number;
  biometricAuth?: boolean;
}

export interface AuthorizationConfig {
  Trading23?: {
    mode?: string;
    backgroundMode?: string;
  };
  [key: string]: any;
}

export interface TradingSettings {
  mode?: string;
  slippage?: number;
  gasPrice?: string;
  [key: string]: any;
}

export interface ParseResult {
  isValid: boolean;
  data?: WalletJSON;
  errors: string[];
  warnings: string[];
}

/**
 * Parse and validate wallet JSON
 */
export function parseWalletJSON(jsonString: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Parse JSON
    const data = JSON.parse(jsonString);

    // Validate required fields
    if (!data.version) {
      warnings.push('Missing version field');
    }

    // Validate blockchains
    if (data.blockchains && !Array.isArray(data.blockchains)) {
      errors.push('blockchains must be an array');
    }

    if (data.blockchains) {
      data.blockchains.forEach((bc: any, index: number) => {
        if (!bc.id || !bc.name || !bc.chainId) {
          errors.push(`Blockchain ${index}: missing required fields (id, name, chainId)`);
        }
      });
    }

    // Validate tokens
    if (data.tokens && !Array.isArray(data.tokens)) {
      errors.push('tokens must be an array');
    }

    if (data.tokens) {
      data.tokens.forEach((token: any, index: number) => {
        if (!token.address || !token.symbol || !token.name || token.decimals === undefined) {
          errors.push(`Token ${index}: missing required fields (address, symbol, name, decimals)`);
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(token.address)) {
          errors.push(`Token ${index}: invalid Ethereum address format`);
        }
      });
    }

    // Validate contacts
    if (data.contacts && !Array.isArray(data.contacts)) {
      errors.push('contacts must be an array');
    }

    if (data.contacts) {
      data.contacts.forEach((contact: any, index: number) => {
        if (!contact.id || !contact.name || !contact.address) {
          errors.push(`Contact ${index}: missing required fields (id, name, address)`);
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(contact.address)) {
          errors.push(`Contact ${index}: invalid Ethereum address format`);
        }
      });
    }

    // Validate settings
    if (data.settings && typeof data.settings !== 'object') {
      errors.push('settings must be an object');
    }

    if (data.settings?.language && typeof data.settings.language !== 'string') {
      errors.push('settings.language must be a string');
    }

    if (data.settings?.theme && !['light', 'dark', 'auto'].includes(data.settings.theme)) {
      errors.push('settings.theme must be one of: light, dark, auto');
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      isValid: false,
      errors,
      warnings,
    };
  }
}

/**
 * Validate wallet JSON structure
 */
export function validateWalletJSON(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid JSON structure');
    return { isValid: false, errors };
  }

  // Check for at least one of: blockchains, tokens, contacts
  if (!data.blockchains && !data.tokens && !data.contacts && !data.settings) {
    errors.push('JSON must contain at least one of: blockchains, tokens, contacts, or settings');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract blockchains from wallet JSON
 */
export function extractBlockchains(walletJSON: WalletJSON): BlockchainConfig[] {
  return walletJSON.blockchains || [];
}

/**
 * Extract tokens from wallet JSON
 */
export function extractTokens(walletJSON: WalletJSON): TokenConfig[] {
  const tokens = [...(walletJSON.tokens || [])];
  
  // Add custom tokens if present
  if (walletJSON.customTokens) {
    tokens.push(...walletJSON.customTokens);
  }

  return tokens;
}

/**
 * Extract contacts from wallet JSON
 */
export function extractContacts(walletJSON: WalletJSON): ContactConfig[] {
  return walletJSON.contacts || [];
}

/**
 * Extract settings from wallet JSON
 */
export function extractSettings(walletJSON: WalletJSON): WalletSettings {
  return walletJSON.settings || {};
}

/**
 * Create wallet JSON export
 */
export function createWalletJSON(
  blockchains: BlockchainConfig[],
  tokens: TokenConfig[],
  contacts: ContactConfig[],
  settings: WalletSettings,
  walletAddress?: string
): WalletJSON {
  return {
    version: '1.0.0',
    walletAddress,
    blockchains,
    tokens,
    contacts,
    settings,
    authorization: {
      Trading23: {
        mode: 'both',
        backgroundMode: 'both',
      },
    },
  };
}

/**
 * Export wallet JSON as string
 */
export function exportWalletJSON(walletJSON: WalletJSON): string {
  return JSON.stringify(walletJSON, null, 2);
}
