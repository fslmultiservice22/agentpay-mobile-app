/**
 * Ambient declarations for optional peer modules.
 *
 * These packages are loaded lazily at runtime (or only present in certain
 * native builds) and therefore are not listed as hard dependencies in
 * package.json. Declaring them here keeps `tsc --noEmit` clean without
 * forcing an install that would bloat the Expo bundle.
 */

declare module '@react-native-community/netinfo' {
  export type NetInfoStateType =
    | 'none'
    | 'unknown'
    | 'cellular'
    | 'wifi'
    | 'bluetooth'
    | 'ethernet'
    | 'wimax'
    | 'vpn'
    | 'other';

  export interface NetInfoState {
    type: NetInfoStateType;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    details: Record<string, any> | null;
  }

  export type NetInfoSubscription = () => void;

  export interface NetInfoModule {
    addEventListener(listener: (state: NetInfoState) => void): NetInfoSubscription;
    fetch(requestedInterface?: string): Promise<NetInfoState>;
    refresh(): Promise<NetInfoState>;
    configure(options: Record<string, any>): void;
  }

  const NetInfo: NetInfoModule;
  export default NetInfo;
}

declare module 'expo-crypto' {
  export enum CryptoDigestAlgorithm {
    SHA1 = 'SHA-1',
    SHA256 = 'SHA-256',
    SHA384 = 'SHA-384',
    SHA512 = 'SHA-512',
    MD5 = 'MD5',
  }

  export enum CryptoEncoding {
    HEX = 'hex',
    BASE64 = 'base64',
  }

  export function getRandomBytes(byteCount?: number): Uint8Array;
  export function getRandomBytesAsync(byteCount: number): Promise<Uint8Array>;
  export function getRandomValues<T extends ArrayBufferView>(typedArray: T): T;
  export function randomUUID(): string;
  export function digestStringAsync(
    algorithm: CryptoDigestAlgorithm,
    data: string,
    options?: { encoding?: CryptoEncoding }
  ): Promise<string>;
}

declare module 'ethers' {
  export class JsonRpcProvider {
    constructor(url?: string, network?: any, options?: any);
    getBalance(address: string, blockTag?: any): Promise<bigint>;
    getTransactionCount(address: string, blockTag?: any): Promise<number>;
    getTransaction(hash: string): Promise<any>;
    getTransactionReceipt(hash: string): Promise<any>;
    estimateGas(tx: any): Promise<bigint>;
    getFeeData(): Promise<any>;
    getGasPrice(): Promise<bigint>;
    getSigner(address?: string | number): Promise<any>;
    send(method: string, params: any[]): Promise<any>;
  }

  export class BrowserProvider extends JsonRpcProvider {
    constructor(ethereum: any, network?: any, options?: any);
  }

  export class Contract {
    constructor(address: string, abi: any, runner?: any);
    [key: string]: any;
  }

  export function formatEther(value: bigint | string | number): string;
  export function parseEther(value: string): bigint;
  export function formatUnits(value: bigint | string | number, unit?: string | number): string;
  export function parseUnits(value: string, unit?: string | number): bigint;
  export function isAddress(value: string): boolean;
  export function getAddress(value: string): string;
}
