/**
 * Configurazione reti EOSIO/Antelope supportate.
 * Basata sul backup Anchor dell'utente (account tradig23).
 */

export interface EosioNetwork {
  id: string;
  name: string;
  chainId: string;
  node: string;
  symbol: string;
  tokenPrecision: number;
  testnet: boolean;
  explorerUrl?: string;
}

export const EOSIO_NETWORKS: EosioNetwork[] = [
  {
    id: 'beos-mainnet',
    name: 'BEOS',
    chainId: 'cbef47b0b26d2b8407ec6a6f91284100ec32d288a39d4b4bbd49655f7c484112',
    node: 'https://api.beos.world',
    symbol: 'BEOS',
    tokenPrecision: 4,
    testnet: false,
    explorerUrl: 'https://explore.beos.world',
  },
  {
    id: 'eos-mainnet',
    name: 'EOS',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    node: 'https://eos.greymass.com',
    symbol: 'EOS',
    tokenPrecision: 4,
    testnet: false,
    explorerUrl: 'https://bloks.io',
  },
  {
    id: 'wax-mainnet',
    name: 'WAX',
    chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4',
    node: 'https://wax.greymass.com',
    symbol: 'WAX',
    tokenPrecision: 8,
    testnet: false,
    explorerUrl: 'https://wax.bloks.io',
  },
  {
    id: 'telos-mainnet',
    name: 'Telos',
    chainId: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11',
    node: 'https://telos.greymass.com',
    symbol: 'TLOS',
    tokenPrecision: 4,
    testnet: false,
    explorerUrl: 'https://telos.bloks.io',
  },
  {
    id: 'proton-mainnet',
    name: 'Proton',
    chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0',
    node: 'https://proton.greymass.com',
    symbol: 'XPR',
    tokenPrecision: 4,
    testnet: false,
    explorerUrl: 'https://proton.bloks.io',
  },
  {
    id: 'fio-mainnet',
    name: 'FIO',
    chainId: '21dcae42c0182200e93f954a074011f9048a7624c6fe81d3c9541a614a88bd1c',
    node: 'https://fio.greymass.com',
    symbol: 'FIO',
    tokenPrecision: 8,
    testnet: false,
  },
  {
    id: 'libre-mainnet',
    name: 'Libre',
    chainId: '38b1d7815474d0c60683ecbea321d723e83f5da6ae5f1c1f9fecc69d9ba96465',
    node: 'https://lb.libre.org',
    symbol: 'LIBRE',
    tokenPrecision: 4,
    testnet: false,
  },
];

/** Account EOSIO pre-configurato dall'utente */
export interface EosioAccount {
  accountName: string;
  authority: string;
  networkId: string;
  pubkey?: string;
}

export const DEFAULT_EOSIO_ACCOUNT: EosioAccount = {
  accountName: 'tradig23',
  authority: 'Trading23',
  networkId: 'beos-mainnet',
  pubkey: 'EOS6oCpm6EiHrwiHqUNGUmZXhKimVNf9Qpo3Xtfvxy2L1fLJHP8Do',
};
