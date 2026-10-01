/**
 * Social Sharing Service
 * Handles sharing of portfolio, trades, and achievements on social media
 */

// import * as Sharing from 'expo-sharing';
// import * as Clipboard from 'expo-clipboard';
// import { Platform, Alert } from 'react-native';

const OFFICIAL_SITE_URL = 'https://agentpay.fslditta.com/';

// Mock for testing
const Sharing = { isAvailableAsync: () => Promise.resolve(false), shareAsync: (_url: string, _opts?: Record<string, unknown>) => Promise.resolve() };
const Clipboard = { setStringAsync: (_text: string) => Promise.resolve(), getStringAsync: () => Promise.resolve('') };
const Platform = { OS: 'ios' };

export interface ShareContent {
  title: string;
  message: string;
  url?: string;
  image?: string;
}

export interface PortfolioShareData {
  totalValue: number;
  changePercent: number;
  topHolding?: string;
  holdingCount: number;
  timeframe?: '24h' | '7d' | '30d' | '1y' | 'all';
}

export interface TradeShareData {
  tokenSymbol: string;
  action: 'buy' | 'sell';
  amount: number;
  price: number;
  profit?: number;
}

class SocialSharingService {
  /**
   * Share content via system share sheet
   */
  public async shareContent(content: ShareContent): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        console.warn('[Sharing] Sharing not available on this platform');
        return false;
      }

      await Sharing.shareAsync(content.url || '', {
        mimeType: 'text/plain',
        dialogTitle: content.title,
        UTI: 'public.plain-text',
      });

      return true;
    } catch (error) {
      console.error('[Sharing] Error sharing content:', error);
      return false;
    }
  }

  /**
   * Share portfolio performance
   */
  public async sharePortfolio(data: PortfolioShareData): Promise<boolean> {
    const emoji = data.changePercent >= 0 ? '📈' : '📉';
    const changeText = data.changePercent >= 0 ? '+' : '';

    const message = `
🚀 AgentPay Portfolio Update ${emoji}

💰 Total Value: $${data.totalValue.toFixed(2)}
📊 Change: ${changeText}${data.changePercent.toFixed(2)}%
${data.topHolding ? `🏆 Top Holding: ${data.topHolding}` : ''}
📦 Holdings: ${data.holdingCount} assets
⏱️ Timeframe: ${data.timeframe || '24h'}

Dati illustrativi: la beta AgentPay non gestisce wallet operativi, saldi o investimenti.
🔗 Stato del progetto: ${OFFICIAL_SITE_URL}

#AgentPay #BetaTecnica
    `.trim();

    return this.shareContent({
      title: 'Share Portfolio',
      message,
      url: message,
    });
  }

  /**
   * Share trade execution
   */
  public async shareTrade(data: TradeShareData): Promise<boolean> {
    const emoji = data.action === 'buy' ? '🟢' : '🔴';
    const actionText = data.action === 'buy' ? 'acquisto' : 'vendita';
    const profitText = data.profit ? `\n💰 Profit: $${data.profit.toFixed(2)}` : '';

    const message = `
${emoji} Esempio di ${actionText}: ${data.amount} ${data.tokenSymbol}

💵 Price: $${data.price.toFixed(2)}
📍 Total: $${(data.amount * data.price).toFixed(2)}${profitText}

Simulazione tecnica: nessun ordine è stato eseguito da AgentPay.
🔗 Stato del progetto: ${OFFICIAL_SITE_URL}

#AgentPay #BetaTecnica
    `.trim();

    return this.shareContent({
      title: 'Share Trade',
      message,
      url: message,
    });
  }

  /**
   * Share achievement
   */
  public async shareAchievement(_achievement: string, _description: string): Promise<boolean> {
    // Traguardi e ricompense non sono funzioni pubbliche della beta tecnica.
    return false;
  }

  /**
   * Share referral link
   */
  public async shareReferral(_referralCode: string): Promise<boolean> {
    // Il programma referral e gli inviti con ricompense non sono attivi.
    return false;
  }

  /**
   * Copy text to clipboard
   */
  public async copyToClipboard(text: string): Promise<boolean> {
    try {
      await Clipboard.setStringAsync(text);
      return true;
    } catch (error) {
      console.error('[Sharing] Error copying to clipboard:', error);
      return false;
    }
  }

  /**
   * Get text from clipboard
   */
  public async getFromClipboard(): Promise<string | null> {
    try {
      const text = await Clipboard.getStringAsync();
      return text;
    } catch (error) {
      console.error('[Sharing] Error getting clipboard text:', error);
      return null;
    }
  }

  /**
   * Share to specific social media (if available)
   */
  public async shareToSocialMedia(
    platform: 'twitter' | 'facebook' | 'instagram' | 'telegram' | 'whatsapp',
    content: ShareContent
  ): Promise<boolean> {
    try {
      const urls: Record<string, string> = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(content.message)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(content.url || '')}`,
        instagram: '', // Instagram doesn't support direct sharing via URL
        telegram: `https://t.me/share/url?url=${encodeURIComponent(content.url || '')}&text=${encodeURIComponent(content.message)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(content.message)}`,
      };

      const url = urls[platform];
      if (!url) {
        console.warn(`[Sharing] Platform ${platform} not supported`);
        return false;
      }

      // For web, open the URL
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return true;
      }

      // For native, use the system share sheet
      return this.shareContent(content);
    } catch (error) {
      console.error('[Sharing] Error sharing to social media:', error);
      return false;
    }
  }

  /**
   * Generate shareable portfolio report
   */
  public generatePortfolioReport(data: PortfolioShareData): string {
    const emoji = data.changePercent >= 0 ? '📈' : '📉';
    const changeText = data.changePercent >= 0 ? '+' : '';

    return `
═══════════════════════════════════════
        AGENTPAY PORTFOLIO REPORT
═══════════════════════════════════════

${emoji} PERFORMANCE
Total Value: $${data.totalValue.toFixed(2)}
Change: ${changeText}${data.changePercent.toFixed(2)}%
Timeframe: ${data.timeframe || '24h'}

📊 HOLDINGS
Total Assets: ${data.holdingCount}
${data.topHolding ? `Top Holding: ${data.topHolding}` : ''}

═══════════════════════════════════════
Dati illustrativi, nessun saldo custodito da AgentPay
${OFFICIAL_SITE_URL}
═══════════════════════════════════════
    `.trim();
  }

  /**
   * Generate shareable trade report
   */
  public generateTradeReport(data: TradeShareData): string {
    const emoji = data.action === 'buy' ? '🟢' : '🔴';
    const actionText = data.action === 'buy' ? 'BUY' : 'SELL';
    const profitText = data.profit ? `\nProfit: $${data.profit.toFixed(2)}` : '';

    return `
═══════════════════════════════════════
        AGENTPAY TRADE REPORT
═══════════════════════════════════════

${emoji} ${actionText} ORDER

Token: ${data.tokenSymbol}
Amount: ${data.amount}
Price: $${data.price.toFixed(2)}
Total: $${(data.amount * data.price).toFixed(2)}${profitText}

═══════════════════════════════════════
Esempio tecnico, nessun trade eseguito da AgentPay
${OFFICIAL_SITE_URL}
═══════════════════════════════════════
    `.trim();
  }
}

// Export singleton instance
export const socialSharing = new SocialSharingService();

/**
 * Hook to use social sharing in components
 */
export function useSocialSharing() {
  return socialSharing;
}
