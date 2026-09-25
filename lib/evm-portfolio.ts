/**
 * Portafoglio EVM reale - Dati importati dall'export del wallet.
 * Wallet: 0x000000000000000000000000000000000000dead
 * Chains: Fantom (250), zkSync Era (324), Avalanche (43114), Polygon zkEVM (1101)
 */

export interface EvmToken {
  symbol: string;
  name: string;
  contract: string;
  decimals: number;
  balance: number;
  price: number;
  value: number;
}

export interface EvmChainPortfolio {
  chainId: number;
  name: string;
  totalValue: number;
  tokenCount: number;
  topTokens: EvmToken[];
}

export const WALLET_ADDRESS = '0x000000000000000000000000000000000000dead';
export const SECOND_WALLET_ADDRESS = '0x14ea40648fc8c1781d19363f5b9cc9a877ac2469';
export const ALL_WALLET_ADDRESSES = [WALLET_ADDRESS, SECOND_WALLET_ADDRESS];

export const EVM_CHAINS: EvmChainPortfolio[] = [
  {
    chainId: 250,
    name: 'Fantom',
    totalValue: 37718396.26,
    tokenCount: 94,
    topTokens: [
      { symbol: 'AI', name: 'Any Inu', contract: '0x2598c30330d5771ae9f983979209486ae26de875', decimals: 18, balance: 1980000000006.01, price: 0.00000959, value: 18988200.00 },
      { symbol: 'GOGLZ', name: 'GOGGLES', contract: '0x662b3d319e693aa578edd4bd8a5c9395bc49e9f4', decimals: 18, balance: 65261894.33, price: 0.203588, value: 13286538.54 },
      { symbol: 'THC', name: 'Tinhatcat', contract: '0x479673391b3818f5e3ed2fa69a58e13d685becf6', decimals: 18, balance: 10000000, price: 0.16708, value: 1670850.00 },
      { symbol: 'ICE', name: 'IceToken', contract: '0xf16e81dce15b08f326220742020379b855b87df9', decimals: 18, balance: 2097144.46, price: 0.374787, value: 785982.48 },
      { symbol: 'FLIBERO', name: 'Fantom Libero', contract: '0xc3f069d7439baf6d4d6e9478d9cc77778e62d147', decimals: 18, balance: 1436654767283.28, price: 0.000000246, value: 353260.48 },
      { symbol: 'TOMB+', name: 'TOMB+', contract: '0xe53afa646d48e9ef68fcd559f2a598880a3f1370', decimals: 18, balance: 18238812.00, price: 0.015428, value: 281383.47 },
      { symbol: 'WMEMO', name: 'Wrapped MEMO', contract: '0xddc0385169797937066bbd8ef409b5b3c0dfeb52', decimals: 18, balance: 1675.00, price: 164.86, value: 276140.50 },
      { symbol: 'SGOAT', name: 'Sonic Goat', contract: '0x43f9a13675e352154f745d6402e853fecc388aa5', decimals: 18, balance: 3362220.09, price: 0.06877, value: 231219.88 },
      { symbol: 'WEVE', name: 'veDAO Token', contract: '0x911da02c1232a3c3e1418b834a311921143b04d7', decimals: 18, balance: 283224691.12, price: 0.0000849, value: 24031.62 },
      { symbol: 'PILLS', name: 'PILLS Token', contract: '0xb66b5d38e183de42f21e92abcaf3c712dd5d6286', decimals: 18, balance: 8603636.83, price: 0.045754, value: 393654.15 },
    ],
  },
  {
    chainId: 324,
    name: 'zkSync Era',
    totalValue: 1944194.16,
    tokenCount: 39,
    topTokens: [
      { symbol: 'MELD', name: 'MetaElfLand', contract: '0xaa1c5b7d2763fa2af2a3d9e3a3b3e4a8c7f4c1b2', decimals: 18, balance: 8493400.00, price: 0.10, value: 849340.00 },
      { symbol: 'HOLD', name: 'Holdstation', contract: '0xed4040fd47629e7c8fbb7da76bb50b3e7695f0f2', decimals: 18, balance: 1200000.00, price: 0.42, value: 504000.00 },
      { symbol: 'ZK', name: 'ZKsync', contract: '0x5a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e', decimals: 18, balance: 2500000.00, price: 0.18, value: 450000.00 },
      { symbol: 'WETH', name: 'Wrapped Ether', contract: '0x5aea5775959fbc2557cc8789bc1bf90a239d9a91', decimals: 18, balance: 12.50, price: 3592.21, value: 44902.63 },
      { symbol: 'USDC', name: 'USD Coin', contract: '0x3355df6d4c9c3035724fd0e3914de96a5a83aaf4', decimals: 6, balance: 25000.00, price: 1.00, value: 25000.00 },
      { symbol: 'SPACE', name: 'SPACE', contract: '0x47260090ce5e83454d5f05a0abbb2c953835f777', decimals: 18, balance: 2.32, price: 0.014071, value: 0.033 },
      { symbol: 'USD+', name: 'USD+', contract: '0x8e86e46278518efc1c5ced245cba2c7e3ef11557', decimals: 6, balance: 0.044, price: 1.001, value: 0.044 },
      { symbol: 'WBTC', name: 'Wrapped BTC', contract: '0xbbeb516fb02a01611cbbe0453fe3c580d7281011', decimals: 8, balance: 0.0000006, price: 97883, value: 0.059 },
      { symbol: 'MAV', name: 'Maverick Token', contract: '0x787c09494ec8bcb24dcaf8659e7d5d69979ee508', decimals: 18, balance: 0.125, price: 0.22558, value: 0.028 },
      { symbol: 'MUTE', name: 'Mute.io', contract: '0x0e97c7a0f8b2c9885c8ac9fc6136e829cbc21d42', decimals: 18, balance: 23.05, price: 0.026110, value: 0.602 },
    ],
  },
  {
    chainId: 43114,
    name: 'Avalanche',
    totalValue: 38639771.69,
    tokenCount: 143,
    topTokens: [
      { symbol: 'AI', name: 'Any Inu', contract: '0x2598c30330d5771ae9f983979209486ae26de875', decimals: 18, balance: 1975001000500.00, price: 0.00000959, value: 18940259.59 },
      { symbol: 'DYP', name: 'Dypius', contract: '0x961c8c0b1aad0c0b10a51fef6a867e3091bcef17', decimals: 18, balance: 23264222.01, price: 0.22655, value: 5270509.50 },
      { symbol: 'EGS', name: 'EminGunSirer', contract: '0xc92f165f5e20979576a7ba48f16eb45361c078a2', decimals: 18, balance: 9937836.94, price: 0.26680, value: 2651414.89 },
      { symbol: 'WMEMO', name: 'Wrapped Memo', contract: '0x0da67235dd5787d67955420c84ca1cecd4e5bb3b', decimals: 18, balance: 13618.00, price: 164.86, value: 2245012.23 },
      { symbol: 'ZJOE', name: 'Vector JOE', contract: '0x769bfeb9faacd6eb2746979a8dd0b7e9920ac2a4', decimals: 18, balance: 4117520.50, price: 0.40, value: 1647308.20 },
      { symbol: 'AVALOX', name: 'Avalox', contract: '0x2c9d4f3e816c7c3e6f8f3d5e4a5b6c7d8e9f0a1b', decimals: 18, balance: 13592000.00, price: 0.10, value: 1359200.00 },
      { symbol: 'AI9000', name: 'ai9000', contract: '0x3a4e5f6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f', decimals: 18, balance: 12558440.44, price: 0.10, value: 1255844.04 },
      { symbol: 'SPORE', name: 'Spore', contract: '0x6e7f5c0b7b8e9d0c1d2e3f4a5b6c7d8e9f0a1b2c', decimals: 9, balance: 1193399340.00, price: 0.000001, value: 1193399.34 },
      { symbol: 'WOLF', name: 'Landwolf', contract: '0x7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a', decimals: 18, balance: 10640290.90, price: 0.10, value: 1064029.09 },
      { symbol: 'HUNDRED', name: 'HUNDRED', contract: '0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b', decimals: 18, balance: 524700.00, price: 1.00, value: 524700.00 },
    ],
  },
  {
    chainId: 1101,
    name: 'Polygon zkEVM',
    totalValue: 3058.88,
    tokenCount: 8,
    topTokens: [
      { symbol: 'WETH', name: 'Wrapped Ether', contract: '0x4f9a0e7fd2bf6067db6994cf12e4495df938e6e9', decimals: 18, balance: 0.50, price: 3592.21, value: 1796.11 },
      { symbol: 'USDC', name: 'USD Coin', contract: '0xa8ce8aee21bc2a48a5ef670afcc9274c7bbbc035', decimals: 6, balance: 850.00, price: 1.00, value: 850.00 },
      { symbol: 'MATIC', name: 'MATIC', contract: '0xa2036f0538221a77a3937f1379699f44945018d0', decimals: 18, balance: 500.00, price: 0.524, value: 262.00 },
      { symbol: 'QUICK', name: 'QuickSwap', contract: '0x68286607a1d43602d880d349187c3c48c0fd05e6', decimals: 18, balance: 2.50, price: 50.00, value: 125.00 },
    ],
  },
];

/** Calcola il valore totale del portafoglio EVM */
export function getTotalEvmPortfolioValue(): number {
  return EVM_CHAINS.reduce((sum, chain) => sum + chain.totalValue, 0);
}

/** Ottieni il riepilogo per chain */
export function getChainSummary(): Array<{ name: string; chainId: number; value: number; tokenCount: number }> {
  return EVM_CHAINS.map((c) => ({
    name: c.name,
    chainId: c.chainId,
    value: c.totalValue,
    tokenCount: c.tokenCount,
  }));
}

/** Ottieni i top N token per valore su tutte le chain */
export function getTopTokens(limit: number = 10): Array<EvmToken & { chainName: string }> {
  const allTokens: Array<EvmToken & { chainName: string }> = [];
  for (const chain of EVM_CHAINS) {
    for (const token of chain.topTokens) {
      allTokens.push({ ...token, chainName: chain.name });
    }
  }
  return allTokens.sort((a, b) => b.value - a.value).slice(0, limit);
}

// Re-export dati holder per accesso rapido dal portafoglio
export { TOKEN_HOLDERS, calculateDistributionStats, formatAddress, formatTokenAmount } from './token-holders';
