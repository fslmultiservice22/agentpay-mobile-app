/**
 * Wallet Transaction Monitor
 * Monitora le transazioni in arrivo su un wallet EVM connesso
 * e invia notifiche push quando ne rileva di nuove.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const LAST_TX_KEY = 'agentpay_wallet_last_tx_hash';
const MONITOR_ENABLED_KEY = 'agentpay_wallet_monitor_enabled';
const ALERT_THRESHOLD_KEY = 'agentpay_wallet_alert_threshold';
const MONITOR_INTERVAL_MS = 60 * 1000; // Polling ogni 60 secondi

// Soglie alert predefinite (in ETH/token nativo)
export const ALERT_THRESHOLD_OPTIONS = [
  { label: 'Tutte le transazioni', value: 0 },
  { label: '> 0.01 ETH', value: 0.01 },
  { label: '> 0.1 ETH', value: 0.1 },
  { label: '> 0.5 ETH', value: 0.5 },
  { label: '> 1 ETH', value: 1 },
  { label: '> 5 ETH', value: 5 },
];

// Etherscan-compatible API endpoints per chain
const EXPLORER_APIS: Record<number, { url: string; apiKey?: string }> = {
  1: { url: 'https://api.etherscan.io/api' },
  137: { url: 'https://api.polygonscan.com/api' },
  56: { url: 'https://api.bscscan.com/api' },
  42161: { url: 'https://api.arbiscan.io/api' },
  10: { url: 'https://api-optimistic.etherscan.io/api' },
};

export interface WalletTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  chainId: number;
  tokenSymbol?: string;
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;

export async function isWalletMonitorEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(MONITOR_ENABLED_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function setWalletMonitorEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(MONITOR_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Soglia minima per ricevere notifiche (in ETH/token nativo)
 */
export async function getAlertThreshold(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(ALERT_THRESHOLD_KEY);
    return raw ? parseFloat(raw) : 0;
  } catch {
    return 0;
  }
}

export async function setAlertThreshold(threshold: number): Promise<void> {
  await AsyncStorage.setItem(ALERT_THRESHOLD_KEY, threshold.toString());
}

/**
 * Recupera le ultime transazioni in arrivo per un indirizzo su una chain
 */
async function fetchIncomingTransactions(
  address: string,
  chainId: number,
  limit: number = 5
): Promise<WalletTransaction[]> {
  const explorer = EXPLORER_APIS[chainId];
  if (!explorer) return [];

  try {
    const params = new URLSearchParams({
      module: 'account',
      action: 'txlist',
      address,
      page: '1',
      offset: limit.toString(),
      sort: 'desc',
    });
    if (explorer.apiKey) params.set('apikey', explorer.apiKey);

    const response = await fetch(`${explorer.url}?${params.toString()}`);
    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== '1' || !Array.isArray(data.result)) return [];

    // Filtra solo le transazioni IN ARRIVO (to === address)
    return data.result
      .filter((tx: any) => tx.to?.toLowerCase() === address.toLowerCase() && tx.value !== '0')
      .map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        timeStamp: tx.timeStamp,
        chainId,
      }));
  } catch {
    return [];
  }
}

/**
 * Formatta il valore da wei a ETH/MATIC/etc.
 */
function formatWeiValue(weiValue: string): string {
  try {
    const eth = parseFloat(weiValue) / 1e18;
    if (eth >= 1) return eth.toFixed(4);
    if (eth >= 0.001) return eth.toFixed(6);
    return eth.toExponential(2);
  } catch {
    return '0';
  }
}

function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    56: 'BSC',
    42161: 'Arbitrum',
    10: 'Optimism',
  };
  return names[chainId] || `Chain ${chainId}`;
}

function getChainSymbol(chainId: number): string {
  const symbols: Record<number, string> = {
    1: 'ETH',
    137: 'MATIC',
    56: 'BNB',
    42161: 'ETH',
    10: 'ETH',
  };
  return symbols[chainId] || 'TOKEN';
}

/**
 * Controlla nuove transazioni e invia notifica se ce ne sono di nuove
 */
export async function checkForNewTransactions(
  address: string,
  chainIds: number[] = [1, 137, 56, 42161, 10]
): Promise<WalletTransaction | null> {
  if (Platform.OS === 'web') return null;

  const enabled = await isWalletMonitorEnabled();
  if (!enabled) return null;

  const lastTxHash = await AsyncStorage.getItem(LAST_TX_KEY);

  for (const chainId of chainIds) {
    const txs = await fetchIncomingTransactions(address, chainId, 3);
    if (txs.length === 0) continue;

    const latestTx = txs[0];
    if (latestTx.hash === lastTxHash) continue;

    // Nuova transazione trovata!
    await AsyncStorage.setItem(LAST_TX_KEY, latestTx.hash);

    // Controlla soglia minima
    const threshold = await getAlertThreshold();
    const ethValue = parseFloat(latestTx.value) / 1e18;
    if (threshold > 0 && ethValue < threshold) {
      // Sotto la soglia, non inviare notifica ma registrare comunque
      return latestTx;
    }

    // Invia notifica push
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      const amount = formatWeiValue(latestTx.value);
      const chain = getChainName(chainId);
      const symbol = getChainSymbol(chainId);
      const fromShort = `${latestTx.from.slice(0, 6)}...${latestTx.from.slice(-4)}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `\u{1F4B0} Transazione ricevuta su ${chain}`,
          body: `Hai ricevuto ${amount} ${symbol} da ${fromShort}`,
          sound: true,
          data: { type: 'wallet_tx', hash: latestTx.hash, chainId },
        },
        trigger: null,
      });
    }

    return latestTx;
  }

  return null;
}

/**
 * Avvia il monitoraggio periodico delle transazioni
 */
export function startWalletMonitor(address: string, chainIds?: number[]): void {
  if (Platform.OS === 'web') return;
  stopWalletMonitor();

  // Check immediato
  checkForNewTransactions(address, chainIds).catch(() => {});

  // Polling periodico
  monitorInterval = setInterval(() => {
    checkForNewTransactions(address, chainIds).catch(() => {});
  }, MONITOR_INTERVAL_MS);
}

/**
 * Ferma il monitoraggio
 */
export function stopWalletMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
