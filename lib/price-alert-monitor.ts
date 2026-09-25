/**
 * Price Alert Monitor Service
 * Monitora i prezzi dei token del portafoglio e invia notifiche push
 * quando la variazione supera una soglia configurabile.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotificationsService } from './push-notifications-service';

const PRICE_ALERTS_KEY = 'agentpay_price_alerts';
const PRICE_CACHE_KEY = 'agentpay_price_cache';

export interface PriceAlertRule {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  chain: string;
  /** Soglia variazione % (es. 5 = ±5%) */
  thresholdPercent: number;
  /** Direzione: 'up' | 'down' | 'both' */
  direction: 'up' | 'down' | 'both';
  /** Prezzo di riferimento al momento della creazione */
  referencePrice: number;
  /** Se l'alert è attivo */
  enabled: boolean;
  /** Timestamp creazione */
  createdAt: number;
  /** Ultimo trigger */
  lastTriggeredAt?: number;
  /** Quante volte è scattato */
  triggerCount: number;
}

export interface PriceSnapshot {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: number;
}

export interface PriceAlertEvent {
  rule: PriceAlertRule;
  currentPrice: number;
  changePercent: number;
  direction: 'up' | 'down';
  timestamp: number;
}

class PriceAlertMonitor {
  private rules: PriceAlertRule[] = [];
  private priceCache: Map<string, PriceSnapshot> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.loadRules();
    await this.loadPriceCache();
    this.initialized = true;
  }

  private async loadRules(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(PRICE_ALERTS_KEY);
      this.rules = raw ? JSON.parse(raw) : [];
    } catch {
      this.rules = [];
    }
  }

  private async saveRules(): Promise<void> {
    await AsyncStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(this.rules));
  }

  private async loadPriceCache(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(PRICE_CACHE_KEY);
      if (raw) {
        const entries: [string, PriceSnapshot][] = JSON.parse(raw);
        this.priceCache = new Map(entries);
      }
    } catch {
      this.priceCache = new Map();
    }
  }

  private async savePriceCache(): Promise<void> {
    const entries = Array.from(this.priceCache.entries());
    await AsyncStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(entries));
  }

  /**
   * Crea un nuovo alert di prezzo
   */
  async createAlert(params: {
    tokenSymbol: string;
    tokenName: string;
    chain: string;
    thresholdPercent: number;
    direction: 'up' | 'down' | 'both';
    referencePrice: number;
  }): Promise<PriceAlertRule> {
    await this.initialize();
    const rule: PriceAlertRule = {
      id: `pa_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      tokenSymbol: params.tokenSymbol,
      tokenName: params.tokenName,
      chain: params.chain,
      thresholdPercent: params.thresholdPercent,
      direction: params.direction,
      referencePrice: params.referencePrice,
      enabled: true,
      createdAt: Date.now(),
      triggerCount: 0,
    };
    this.rules.push(rule);
    await this.saveRules();
    return rule;
  }

  /**
   * Rimuovi un alert
   */
  async removeAlert(id: string): Promise<void> {
    await this.initialize();
    this.rules = this.rules.filter(r => r.id !== id);
    await this.saveRules();
  }

  /**
   * Attiva/disattiva un alert
   */
  async toggleAlert(id: string): Promise<void> {
    await this.initialize();
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.enabled = !rule.enabled;
      await this.saveRules();
    }
  }

  /**
   * Aggiorna la soglia di un alert
   */
  async updateThreshold(id: string, newThreshold: number): Promise<void> {
    await this.initialize();
    const rule = this.rules.find(r => r.id === id);
    if (rule) {
      rule.thresholdPercent = newThreshold;
      await this.saveRules();
    }
  }

  /**
   * Ottieni tutti gli alert
   */
  async getAlerts(): Promise<PriceAlertRule[]> {
    await this.initialize();
    return [...this.rules];
  }

  /**
   * Ottieni alert attivi
   */
  async getActiveAlerts(): Promise<PriceAlertRule[]> {
    await this.initialize();
    return this.rules.filter(r => r.enabled);
  }

  /**
   * Aggiorna i prezzi e controlla se qualche alert deve scattare
   * Ritorna gli eventi triggered
   */
  async checkPrices(currentPrices: Map<string, number>): Promise<PriceAlertEvent[]> {
    await this.initialize();
    const events: PriceAlertEvent[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const currentPrice = currentPrices.get(rule.tokenSymbol.toUpperCase());
      if (currentPrice === undefined || currentPrice <= 0) continue;

      const changePercent = ((currentPrice - rule.referencePrice) / rule.referencePrice) * 100;
      const absChange = Math.abs(changePercent);

      // Controlla se la soglia è superata
      if (absChange < rule.thresholdPercent) continue;

      const direction: 'up' | 'down' = changePercent > 0 ? 'up' : 'down';

      // Controlla la direzione configurata
      if (rule.direction !== 'both' && rule.direction !== direction) continue;

      // Cooldown: non triggerare più di una volta ogni 30 minuti
      if (rule.lastTriggeredAt && Date.now() - rule.lastTriggeredAt < 30 * 60 * 1000) continue;

      // Trigger!
      rule.lastTriggeredAt = Date.now();
      rule.triggerCount++;

      const event: PriceAlertEvent = {
        rule,
        currentPrice,
        changePercent,
        direction,
        timestamp: Date.now(),
      };
      events.push(event);

      // Invia notifica push
      await this.sendPriceNotification(event);
    }

    if (events.length > 0) {
      await this.saveRules();
    }

    // Aggiorna cache prezzi
    currentPrices.forEach((price, symbol) => {
      this.priceCache.set(symbol, {
        symbol,
        price,
        change24h: 0,
        timestamp: Date.now(),
      });
    });
    await this.savePriceCache();

    return events;
  }

  /**
   * Invia notifica push per un alert di prezzo
   */
  private async sendPriceNotification(event: PriceAlertEvent): Promise<void> {
    const { rule, currentPrice, changePercent, direction } = event;
    const arrow = direction === 'up' ? '📈' : '📉';
    const sign = direction === 'up' ? '+' : '';

    const title = `${arrow} ${rule.tokenSymbol} ${sign}${changePercent.toFixed(1)}%`;
    const body = `${rule.tokenName} su ${rule.chain}: $${currentPrice.toFixed(4)} (soglia: ±${rule.thresholdPercent}%)`;

    await pushNotificationsService.sendLocalNotification({
      title,
      body,
      type: 'price_alert',
      data: {
        alertId: rule.id,
        tokenSymbol: rule.tokenSymbol,
        chain: rule.chain,
        currentPrice,
        changePercent,
      },
    });
  }

  /**
   * Ottieni statistiche degli alert
   */
  async getStatistics(): Promise<{
    totalAlerts: number;
    activeAlerts: number;
    totalTriggers: number;
    topTriggered: PriceAlertRule | null;
  }> {
    await this.initialize();
    const active = this.rules.filter(r => r.enabled);
    const totalTriggers = this.rules.reduce((sum, r) => sum + r.triggerCount, 0);
    const sorted = [...this.rules].sort((a, b) => b.triggerCount - a.triggerCount);

    return {
      totalAlerts: this.rules.length,
      activeAlerts: active.length,
      totalTriggers,
      topTriggered: sorted[0] ?? null,
    };
  }

  /**
   * Crea alert predefiniti per i token principali del portafoglio
   */
  async createDefaultAlerts(tokens: Array<{ symbol: string; name: string; chain: string; price: number }>): Promise<number> {
    await this.initialize();
    let created = 0;

    for (const token of tokens) {
      // Non creare duplicati
      const exists = this.rules.some(r => r.tokenSymbol === token.symbol && r.chain === token.chain);
      if (exists) continue;

      await this.createAlert({
        tokenSymbol: token.symbol,
        tokenName: token.name,
        chain: token.chain,
        thresholdPercent: 10, // Default: ±10%
        direction: 'both',
        referencePrice: token.price,
      });
      created++;
    }

    return created;
  }
}

export const priceAlertMonitor = new PriceAlertMonitor();
