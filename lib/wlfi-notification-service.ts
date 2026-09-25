import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export interface WLFINotification {
  id: string;
  type: 'transfer_pending' | 'policy_threshold' | 'collateral_warning' | 'swap_complete' | 'transfer_complete';
  title: string;
  body: string;
  data?: Record<string, string>;
  timestamp: number;
  read: boolean;
}

export interface WLFIPolicyUsage {
  dailyUsed: number;
  dailyLimit: number;
  weeklyUsed: number;
  weeklyLimit: number;
}

const NOTIFICATIONS_KEY = 'wlfi_notifications_history';
const COOLDOWN_KEY = 'wlfi_notification_cooldowns';
const COOLDOWN_MS = 30 * 60 * 1000;
const POLICY_THRESHOLD = 0.80;

class WLFINotificationService {
  private history: WLFINotification[] = [];
  private cooldowns: Record<string, number> = {};
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      const [histRaw, coolRaw] = await Promise.all([
        AsyncStorage.getItem(NOTIFICATIONS_KEY),
        AsyncStorage.getItem(COOLDOWN_KEY),
      ]);
      if (histRaw) this.history = JSON.parse(histRaw);
      if (coolRaw) this.cooldowns = JSON.parse(coolRaw);
    } catch {}
    this.initialized = true;
  }

  async notifyTransferPendingApproval(params: { amount: number; recipient: string; transferId: string }): Promise<void> {
    await this.init();
    if (this.isOnCooldown('transfer_pending_' + params.transferId)) return;
    const n: WLFINotification = {
      id: `wlfi_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'transfer_pending',
      title: 'Trasferimento in Attesa',
      body: `${params.amount.toFixed(2)} USD1 verso ${this.shorten(params.recipient)} richiede approvazione.`,
      data: { screen: 'wlfi-transfer', transferId: params.transferId },
      timestamp: Date.now(), read: false,
    };
    await this.push(n);
    this.setCooldown('transfer_pending_' + params.transferId);
  }

  async notifyTransferComplete(params: { amount: number; recipient: string; txHash?: string }): Promise<void> {
    await this.init();
    await this.push({
      id: `wlfi_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'transfer_complete',
      title: 'Trasferimento Completato',
      body: `${params.amount.toFixed(2)} USD1 inviati a ${this.shorten(params.recipient)}.`,
      data: { screen: 'wlfi-dashboard', txHash: params.txHash || '' },
      timestamp: Date.now(), read: false,
    });
  }

  async checkPolicyThreshold(usage: WLFIPolicyUsage): Promise<void> {
    await this.init();
    if (usage.dailyLimit > 0 && usage.dailyUsed >= usage.dailyLimit * POLICY_THRESHOLD && !this.isOnCooldown('policy_daily')) {
      const pct = Math.round((usage.dailyUsed / usage.dailyLimit) * 100);
      await this.push({
        id: `wlfi_${Date.now()}_daily`, type: 'policy_threshold',
        title: 'Limite Giornaliero',
        body: `Hai utilizzato ${pct}% del limite giornaliero (${usage.dailyUsed.toFixed(0)}/${usage.dailyLimit.toFixed(0)} USD1).`,
        data: { screen: 'wlfi-policy' }, timestamp: Date.now(), read: false,
      });
      this.setCooldown('policy_daily');
    }
    if (usage.weeklyLimit > 0 && usage.weeklyUsed >= usage.weeklyLimit * POLICY_THRESHOLD && !this.isOnCooldown('policy_weekly')) {
      const pct = Math.round((usage.weeklyUsed / usage.weeklyLimit) * 100);
      await this.push({
        id: `wlfi_${Date.now()}_weekly`, type: 'policy_threshold',
        title: 'Limite Settimanale',
        body: `Hai utilizzato ${pct}% del limite settimanale (${usage.weeklyUsed.toFixed(0)}/${usage.weeklyLimit.toFixed(0)} USD1).`,
        data: { screen: 'wlfi-policy' }, timestamp: Date.now(), read: false,
      });
      this.setCooldown('policy_weekly');
    }
  }

  async notifyCollateralWarning(params: { ltvRatio: number; healthFactor: number; collateralAmount: number }): Promise<void> {
    await this.init();
    if (this.isOnCooldown('collateral_warning')) return;
    if (params.ltvRatio < 75) return;
    const severity = params.ltvRatio >= 90 ? 'LIQUIDAZIONE IMMINENTE' : params.ltvRatio >= 85 ? 'CRITICO' : 'ATTENZIONE';
    await this.push({
      id: `wlfi_${Date.now()}_coll`, type: 'collateral_warning',
      title: `${severity}: LTV al ${params.ltvRatio.toFixed(1)}%`,
      body: `Health Factor: ${(params.healthFactor || 0).toFixed(2)}. Collaterale: ${(params.collateralAmount || 0).toFixed(0)} USD1.`,
      data: { screen: 'wlfi-dashboard' }, timestamp: Date.now(), read: false,
    });
    this.setCooldown('collateral_warning');
  }

  async notifySwapComplete(params: { fromToken: string; toToken: string; fromAmount: number; toAmount: number }): Promise<void> {
    await this.init();
    await this.push({
      id: `wlfi_${Date.now()}_swap`, type: 'swap_complete',
      title: 'Swap Completato',
      body: `${params.fromAmount.toFixed(2)} ${params.fromToken} -> ${params.toAmount.toFixed(2)} ${params.toToken}`,
      data: { screen: 'wlfi-swap' }, timestamp: Date.now(), read: false,
    });
  }

  async getHistory(): Promise<WLFINotification[]> {
    await this.init();
    return [...this.history].sort((a, b) => b.timestamp - a.timestamp);
  }

  async markAsRead(id: string): Promise<void> {
    const n = this.history.find(x => x.id === id);
    if (n) { n.read = true; await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.history)); }
  }

  async getUnreadCount(): Promise<number> {
    await this.init();
    return this.history.filter(n => !n.read).length;
  }

  private async push(n: WLFINotification): Promise<void> {
    this.history.push(n);
    if (this.history.length > 100) this.history = this.history.slice(-100);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(this.history));
    if (Platform.OS !== 'web') {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          await Notifications.scheduleNotificationAsync({ content: { title: n.title, body: n.body, data: n.data || {}, sound: 'default' }, trigger: null });
        }
      } catch {}
    }
  }

  private isOnCooldown(key: string): boolean {
    const last = this.cooldowns[key];
    return !!last && Date.now() - last < COOLDOWN_MS;
  }

  private setCooldown(key: string): void {
    this.cooldowns[key] = Date.now();
    AsyncStorage.setItem(COOLDOWN_KEY, JSON.stringify(this.cooldowns)).catch(() => {});
  }

  private shorten(addr: string): string {
    return addr.length <= 12 ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }
}

export const wlfiNotificationService = new WLFINotificationService();
