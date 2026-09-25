/**
 * Token Holders Data
 * Dati reali dei principali holder estratti da analisi on-chain
 * Indirizzo principale: 0x000000000000000000000000000000000000dead (burn address)
 */

export interface TokenHolder {
  name: string;
  address: string;
  type: 'holder' | 'exchange' | 'contract';
  isExchange: boolean;
  isContract: boolean;
  isVisible: boolean;
  supplyPercentage: number;
  tokenAmount: number;
  historicTransfersIn: number;
  historicTransfersOut: number;
  clusterId: string;
}

export interface TokenDistributionStats {
  totalHolders: number;
  top10Percentage: number;
  top20Percentage: number;
  giniCoefficient: number;
  whalePercentage: number; // holder con >1% supply
  medianHolding: number;
  averageHolding: number;
}

// Dati reali estratti dal CSV on-chain
export const TOKEN_HOLDERS: TokenHolder[] = [
  {
    name: 'Null 0x00...dead',
    address: '0x0000000000000000000000000000000000000dead',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: false,
    supplyPercentage: 0.1133841583266609,
    tokenAmount: 113384158.32666099,
    historicTransfersIn: 198795540,
    historicTransfersOut: 2044278,
    clusterId: '',
  },
  {
    name: 'MXC',
    address: '0x4982085c9e2f89f2ecb8131eca71afad896e89cb',
    type: 'holder',
    isExchange: true,
    isContract: false,
    isVisible: false,
    supplyPercentage: 0.0679651057034295,
    tokenAmount: 67965105.70734294,
    historicTransfersIn: 10640571,
    historicTransfersOut: 17953546,
    clusterId: '',
  },
  {
    name: 'PancakeSwap V3 (CAPTAINBNB-BNB)',
    address: '0x07f071aa224e2fc2cf03ca2e6558ec6181d66a90',
    type: 'holder',
    isExchange: true,
    isContract: true,
    isVisible: false,
    supplyPercentage: 0.0358190334873505,
    tokenAmount: 35819003.34873505,
    historicTransfersIn: 229685,
    historicTransfersOut: 232761,
    clusterId: '',
  },
  {
    name: '',
    address: '0x597400d9227903a1dc39d519934d1d88513ac398',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0119861360023417,
    tokenAmount: 11986136.600234173,
    historicTransfersIn: 301,
    historicTransfersOut: 117,
    clusterId: 'C-dd43',
  },
  {
    name: '',
    address: '0x5e00278a67a0a93963b580ea6fef354e0b31edd2',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0112312478613540,
    tokenAmount: 11231247.86135403,
    historicTransfersIn: 964,
    historicTransfersOut: 395,
    clusterId: '',
  },
  {
    name: '',
    address: '0x0e552baed60c83af8ffab35a9a6dd224c392d303',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0111916496428079,
    tokenAmount: 11191649.646280793,
    historicTransfersIn: 68,
    historicTransfersOut: 42,
    clusterId: '',
  },
  {
    name: '',
    address: '0x210d2b65837a870f25ea856c36993e25993e43fb',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0100000004247202,
    tokenAmount: 10000000.424720293,
    historicTransfersIn: 15,
    historicTransfersOut: 0,
    clusterId: 'C-3a4b',
  },
  {
    name: '',
    address: '0xbfa740b9fd221a73e3ce9a311c2614d71f357242',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0087987313114713,
    tokenAmount: 8798731.311471395,
    historicTransfersIn: 4803,
    historicTransfersOut: 3803,
    clusterId: '',
  },
  {
    name: '',
    address: '0x504b9f5d7c5d82507b843528a74fe482a81aa223',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0087033656769125,
    tokenAmount: 8703365.76912519,
    historicTransfersIn: 198,
    historicTransfersOut: 98,
    clusterId: 'C-26b9',
  },
  {
    name: '',
    address: '0x947ba15d0c9ec51057b1061297da112ecfd6af25',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0085174255155555,
    tokenAmount: 8517425.51555518,
    historicTransfersIn: 6453,
    historicTransfersOut: 5179,
    clusterId: 'C-e7f4',
  },
  {
    name: '',
    address: '0x6b7f31c5ea22c961dc4769f21f0ad8fdfd69b270',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0084837901936575,
    tokenAmount: 8483790.019365752,
    historicTransfersIn: 777,
    historicTransfersOut: 392,
    clusterId: 'C-01b9',
  },
  {
    name: '',
    address: '0x8542380590f52013586dc50bf11f2378d9aa1fe7',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0080067499491658,
    tokenAmount: 8006749.949165841,
    historicTransfersIn: 416,
    historicTransfersOut: 175,
    clusterId: 'C-7e63',
  },
  {
    name: '',
    address: '0xbbae85e0ea5141e897e5b996b037431b52698272',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0080326995819662,
    tokenAmount: 8032699.581966268,
    historicTransfersIn: 875,
    historicTransfersOut: 740,
    clusterId: 'C-e7f4',
  },
  {
    name: '',
    address: '0x46baf4819686cd48da55f62df5fd2f8b794c2b84',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0078805195284843,
    tokenAmount: 7880519.528484302,
    historicTransfersIn: 1351,
    historicTransfersOut: 819,
    clusterId: 'C-e7f4',
  },
  {
    name: '',
    address: '0x10204a6930f38c05712d6dcd113874dacfccf674',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0072178175890937,
    tokenAmount: 7217817.589093798,
    historicTransfersIn: 932,
    historicTransfersOut: 771,
    clusterId: 'C-f38e',
  },
  {
    name: '',
    address: '0x0f1ab5701a335592222dc943e2c8325a2085c2ad8',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0069514014800000,
    tokenAmount: 6951401.48,
    historicTransfersIn: 29,
    historicTransfersOut: 16,
    clusterId: 'C-ef1c',
  },
  {
    name: '',
    address: '0x651bb5e7fb520e3b44d1f94d2f5cff5cf673e425',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0069000003671104,
    tokenAmount: 6900000.367110499,
    historicTransfersIn: 870,
    historicTransfersOut: 422,
    clusterId: '',
  },
  {
    name: '',
    address: '0x649b56dcd652a3ed6531aa53b7d1ab568ed9aafc',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0067709400938507,
    tokenAmount: 6770940.093850715,
    historicTransfersIn: 178,
    historicTransfersOut: 78,
    clusterId: 'C-ef1c',
  },
  {
    name: '',
    address: '0xc3d9ca74d559709743c0d0611b958a7c98509bc1',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0064747876863915,
    tokenAmount: 6474787.686391589,
    historicTransfersIn: 5648,
    historicTransfersOut: 4901,
    clusterId: 'C-e7f4',
  },
  {
    name: 'OpenSea User DogsOfElonNfts',
    address: '0xacb87b44b709fbbb227da691a4021bc0928f3bf7',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0066572535501092,
    tokenAmount: 6657253.350109233,
    historicTransfersIn: 1415,
    historicTransfersOut: 559,
    clusterId: '',
  },
  {
    name: '',
    address: '0xd3e4cefb84c276ebc5c854d3ce121c0b3bb5294c',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0065587506252389,
    tokenAmount: 6558750.625238969,
    historicTransfersIn: 67,
    historicTransfersOut: 36,
    clusterId: 'C-ef1c',
  },
  {
    name: 'chirac.eth',
    address: '0x08c1fe1d2c15ba4b084eda071baf6404261a0f23',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0063852858373129,
    tokenAmount: 6385285.837312941,
    historicTransfersIn: 14297,
    historicTransfersOut: 4963,
    clusterId: '',
  },
  {
    name: '',
    address: '0x90928af8249fc4709823d86001de307c6badeb1a',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0062842742125554,
    tokenAmount: 6284274.212555489,
    historicTransfersIn: 441,
    historicTransfersOut: 395,
    clusterId: 'C-6abb',
  },
  {
    name: '',
    address: '0x9731b6baa64e8166a37513000514af1b5efce84e',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0061026769242063,
    tokenAmount: 6102676.924206384,
    historicTransfersIn: 377,
    historicTransfersOut: 210,
    clusterId: '',
  },
  {
    name: '',
    address: '0x9f33761d83e8636198cdadd564c49f3873256ae5',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0058934642985793,
    tokenAmount: 5893464.298579326,
    historicTransfersIn: 45,
    historicTransfersOut: 7,
    clusterId: '',
  },
  {
    name: '',
    address: '0x811f17ded9eafd534cfc987f13471499858ff366',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0058337924056173,
    tokenAmount: 5833792.405617328,
    historicTransfersIn: 51,
    historicTransfersOut: 11,
    clusterId: 'C-60d8',
  },
  {
    name: '',
    address: '0xdc83382c7f50c3c89dd18025827a5334b1704da0',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0056599439587691,
    tokenAmount: 5659943.958769168,
    historicTransfersIn: 70,
    historicTransfersOut: 48,
    clusterId: 'C-26b9',
  },
  {
    name: '',
    address: '0x1a07047e76f1f40cee3916ca0d7b216fd1c82ffb',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0053988307614292,
    tokenAmount: 5398830.761429252,
    historicTransfersIn: 104,
    historicTransfersOut: 23,
    clusterId: '',
  },
  {
    name: '',
    address: '0x852325173157848675600e5624e02e18274588f845',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0053353933982429,
    tokenAmount: 5335393.398242927,
    historicTransfersIn: 8761,
    historicTransfersOut: 1028,
    clusterId: 'C-01b9',
  },
  {
    name: '',
    address: '0xe7bb9c61ac9b41822bb2ba703e76b74046f49ae1',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0051441973568990,
    tokenAmount: 5144419.735689907,
    historicTransfersIn: 1654,
    historicTransfersOut: 426,
    clusterId: '',
  },
  {
    name: 'OpenSea User cryptoknob',
    address: '0xe939747ece0fcc9c7a8355379ac6e0bf8feb52f0',
    type: 'holder',
    isExchange: false,
    isContract: false,
    isVisible: true,
    supplyPercentage: 0.0050779025787281,
    tokenAmount: 5077970.257872811,
    historicTransfersIn: 6565,
    historicTransfersOut: 3696,
    clusterId: '',
  },
];

/**
 * Calcola statistiche di distribuzione token
 */
export function calculateDistributionStats(holders: TokenHolder[]): TokenDistributionStats {
  if (holders.length === 0) {
    return {
      totalHolders: 0,
      top10Percentage: 0,
      top20Percentage: 0,
      giniCoefficient: 0,
      whalePercentage: 0,
      medianHolding: 0,
      averageHolding: 0,
    };
  }

  const sorted = [...holders].sort((a, b) => b.supplyPercentage - a.supplyPercentage);
  const totalSupply = sorted.reduce((sum, h) => sum + h.supplyPercentage, 0);

  // Top 10 e Top 20
  const top10 = sorted.slice(0, 10).reduce((sum, h) => sum + h.supplyPercentage, 0);
  const top20 = sorted.slice(0, 20).reduce((sum, h) => sum + h.supplyPercentage, 0);

  // Whale (>1% supply)
  const whales = sorted.filter(h => h.supplyPercentage > 0.01);
  const whaleTotal = whales.reduce((sum, h) => sum + h.supplyPercentage, 0);

  // Media e mediana
  const amounts = sorted.map(h => h.tokenAmount);
  const average = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const mid = Math.floor(amounts.length / 2);
  const median = amounts.length % 2 === 0
    ? (amounts[mid - 1] + amounts[mid]) / 2
    : amounts[mid];

  // Coefficiente di Gini
  const n = amounts.length;
  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(amounts[i] - amounts[j]);
    }
  }
  const gini = sumDiff / (2 * n * amounts.reduce((s, v) => s + v, 0));

  return {
    totalHolders: holders.length,
    top10Percentage: top10 / totalSupply * 100,
    top20Percentage: top20 / totalSupply * 100,
    giniCoefficient: Math.min(gini, 1),
    whalePercentage: whaleTotal / totalSupply * 100,
    medianHolding: median,
    averageHolding: average,
  };
}

/**
 * Raggruppa holder per cluster
 */
export function getHoldersByCluster(holders: TokenHolder[]): Record<string, TokenHolder[]> {
  const clusters: Record<string, TokenHolder[]> = {};
  for (const h of holders) {
    const key = h.clusterId || 'Senza cluster';
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(h);
  }
  return clusters;
}

/**
 * Formatta indirizzo abbreviato
 */
export function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formatta numero grande
 */
export function formatTokenAmount(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(2)}K`;
  return amount.toFixed(2);
}
