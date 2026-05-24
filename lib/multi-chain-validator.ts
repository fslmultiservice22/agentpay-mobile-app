/**
 * Multi-Chain Validator
 * Supporta validazione e gestione di indirizzi su multiple blockchain:
 * - Ethereum (0x...)
 * - NEAR Protocol (.near)
 * - Orderly Network
 * - Smart Contracts
 */

export type BlockchainType = 'ethereum' | 'near' | 'orderly' | 'polygon' | 'arbitrum' | 'optimism';

export interface ValidatedAddress {
  address: string;
  blockchain: BlockchainType;
  type: 'wallet' | 'contract' | 'account';
  isValid: boolean;
  normalized: string;
  metadata?: {
    name?: string;
    description?: string;
    verified?: boolean;
  };
}

export interface MultiChainWallet {
  addresses: Map<BlockchainType, string>;
  primaryBlockchain: BlockchainType;
  isMultiChain: boolean;
}

/**
 * Valida un indirizzo Ethereum (0x...)
 */
export function isValidEthereumAddress(address: string): boolean {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Valida un account NEAR Protocol (.near)
 */
export function isValidNearAddress(address: string): boolean {
  if (!address) return false;
  // NEAR account names: 2-64 characters, lowercase letters, numbers, underscores, hyphens, dots
  const nearRegex = /^[a-z0-9._-]{2,64}$/i;
  return nearRegex.test(address);
}

/**
 * Valida un indirizzo Orderly Network
 * Può essere un indirizzo Ethereum o un account NEAR
 */
export function isValidOrderlyAddress(address: string): boolean {
  return isValidEthereumAddress(address) || isValidNearAddress(address);
}

/**
 * Valida un indirizzo su Polygon (compatibile con Ethereum)
 */
export function isValidPolygonAddress(address: string): boolean {
  return isValidEthereumAddress(address);
}

/**
 * Valida un indirizzo su Arbitrum (compatibile con Ethereum)
 */
export function isValidArbitrumAddress(address: string): boolean {
  return isValidEthereumAddress(address);
}

/**
 * Valida un indirizzo su Optimism (compatibile con Ethereum)
 */
export function isValidOptimismAddress(address: string): boolean {
  return isValidEthereumAddress(address);
}

/**
 * Normalizza un indirizzo in base alla blockchain
 */
export function normalizeAddress(address: string, blockchain: BlockchainType): string {
  switch (blockchain) {
    case 'ethereum':
    case 'polygon':
    case 'arbitrum':
    case 'optimism':
      return address.toLowerCase();
    case 'near':
    case 'orderly':
      return address.toLowerCase();
    default:
      return address;
  }
}

/**
 * Rileva automaticamente il tipo di blockchain da un indirizzo
 */
export function detectBlockchain(address: string): BlockchainType | null {
  if (isValidEthereumAddress(address)) {
    return 'ethereum';
  }
  if (isValidNearAddress(address)) {
    return 'near';
  }
  if (isValidOrderlyAddress(address)) {
    return 'orderly';
  }
  return null;
}

/**
 * Valida un indirizzo su una blockchain specifica
 */
export function validateAddress(address: string, blockchain: BlockchainType): ValidatedAddress {
  let isValid = false;
  let type: 'wallet' | 'contract' | 'account' = 'wallet';

  switch (blockchain) {
    case 'ethereum':
    case 'polygon':
    case 'arbitrum':
    case 'optimism':
      isValid = isValidEthereumAddress(address);
      // Indirizzi che iniziano con 0x sono wallet/contract
      type = 'contract';
      break;
    case 'near':
      isValid = isValidNearAddress(address);
      type = 'account';
      break;
    case 'orderly':
      isValid = isValidOrderlyAddress(address);
      type = detectBlockchain(address) === 'near' ? 'account' : 'contract';
      break;
  }

  return {
    address,
    blockchain,
    type,
    isValid,
    normalized: isValid ? normalizeAddress(address, blockchain) : address,
  };
}

/**
 * Valida un indirizzo su qualsiasi blockchain supportata
 */
export function validateAddressAuto(address: string): ValidatedAddress | null {
  const blockchain = detectBlockchain(address);
  if (!blockchain) {
    return null;
  }
  return validateAddress(address, blockchain);
}

/**
 * Crea un wallet multi-chain
 */
export function createMultiChainWallet(addresses: Partial<Record<BlockchainType, string>>): MultiChainWallet {
  const map = new Map<BlockchainType, string>();
  
  for (const [blockchain, address] of Object.entries(addresses) as Array<[BlockchainType, string]>) {
    if (address && validateAddress(address, blockchain).isValid) {
      map.set(blockchain, address);
    }
  }

  const blockchains = Array.from(map.keys());
  const primaryBlockchain = blockchains.includes('ethereum') ? 'ethereum' : blockchains[0] || 'ethereum';

  return {
    addresses: map,
    primaryBlockchain: primaryBlockchain as BlockchainType,
    isMultiChain: map.size > 1,
  };
}

/**
 * Converte un indirizzo tra blockchain (se compatibile)
 */
export function convertAddress(address: string, fromBlockchain: BlockchainType, toBlockchain: BlockchainType): string | null {
  // Se entrambe sono EVM-compatibili, l'indirizzo rimane lo stesso
  const evmChains: BlockchainType[] = ['ethereum', 'polygon', 'arbitrum', 'optimism'];
  
  if (evmChains.includes(fromBlockchain) && evmChains.includes(toBlockchain)) {
    return address;
  }

  // Conversione NEAR <-> Orderly
  if ((fromBlockchain === 'near' || fromBlockchain === 'orderly') && 
      (toBlockchain === 'near' || toBlockchain === 'orderly')) {
    return address;
  }

  return null;
}

/**
 * Ottiene informazioni sulla blockchain
 */
export function getBlockchainInfo(blockchain: BlockchainType) {
  const info: Record<string, {
    name: string;
    symbol: string;
    rpcUrl?: string;
    explorer?: string;
    chainId?: number;
  }> = {
    ethereum: {
      name: 'Ethereum',
      symbol: 'ETH',
      rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo',
      explorer: 'https://etherscan.io',
      chainId: 1,
    },
    polygon: {
      name: 'Polygon',
      symbol: 'MATIC',
      rpcUrl: 'https://polygon-rpc.com',
      explorer: 'https://polygonscan.com',
      chainId: 137,
    },
    arbitrum: {
      name: 'Arbitrum',
      symbol: 'ARB',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      explorer: 'https://arbiscan.io',
      chainId: 42161,
    },
    optimism: {
      name: 'Optimism',
      symbol: 'OP',
      rpcUrl: 'https://mainnet.optimism.io',
      explorer: 'https://optimistic.etherscan.io',
      chainId: 10,
    },
    near: {
      name: 'NEAR Protocol',
      symbol: 'NEAR',
      rpcUrl: 'https://rpc.mainnet.near.org',
      explorer: 'https://explorer.near.org',
    },
    orderly: {
      name: 'Orderly Network',
      symbol: 'ORD',
      explorer: 'https://explorer.orderly.network',
    },
  };

  return info[blockchain];
}

/**
 * Maschera un indirizzo per la visualizzazione
 */
export function maskAddress(address: string, blockchain: BlockchainType): string {
  if (address.length <= 10) {
    return address;
  }

  const start = address.substring(0, 6);
  const end = address.substring(address.length - 4);
  return `${start}...${end}`;
}

/**
 * Valida un indirizzo smart contract
 */
export function isSmartContract(address: string, blockchain: BlockchainType): boolean {
  // Per Ethereum e compatibili, i contratti sono indirizzi 0x validi
  if (['ethereum', 'polygon', 'arbitrum', 'optimism'].includes(blockchain)) {
    return isValidEthereumAddress(address);
  }
  
  // Per NEAR, i contratti hanno un formato specifico
  if (blockchain === 'near') {
    return isValidNearAddress(address);
  }

  return false;
}

/**
 * Ottiene il tipo di indirizzo
 */
export function getAddressType(address: string, blockchain: BlockchainType): 'wallet' | 'contract' | 'account' | 'unknown' {
  const validated = validateAddress(address, blockchain);
  if (!validated.isValid) {
    return 'unknown';
  }
  return validated.type;
}

/**
 * Valida un batch di indirizzi
 */
export function validateAddressBatch(addresses: string[], blockchain: BlockchainType): ValidatedAddress[] {
  return addresses.map(address => validateAddress(address, blockchain));
}

/**
 * Esporta tutte le funzioni di validazione
 */
export const MultiChainValidator = {
  isValidEthereumAddress,
  isValidNearAddress,
  isValidOrderlyAddress,
  isValidPolygonAddress,
  isValidArbitrumAddress,
  isValidOptimismAddress,
  normalizeAddress,
  detectBlockchain,
  validateAddress,
  validateAddressAuto,
  createMultiChainWallet,
  convertAddress,
  getBlockchainInfo,
  maskAddress,
  isSmartContract,
  getAddressType,
  validateAddressBatch,
};
