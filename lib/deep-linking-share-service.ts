/**
 * Mobile App Deep Linking & Share Sheets Service
 * Universal deep links and social media sharing
 */

export interface DeepLink {
  id: string;
  url: string;
  scheme: string;
  path: string;
  params: Record<string, any>;
  targetScreen: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
  analytics: {
    clicks: number;
    shares: number;
    conversions: number;
  };
}

export interface ShareSheet {
  id: string;
  contentId: string;
  contentType: 'portfolio' | 'signal' | 'stream' | 'post' | 'room';
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  channels: ShareChannel[];
  createdAt: number;
}

export interface ShareChannel {
  name: 'twitter' | 'telegram' | 'whatsapp' | 'facebook' | 'linkedin' | 'email' | 'copy';
  icon: string;
  shareUrl: string;
  isAvailable: boolean;
}

export interface ShareAnalytics {
  shareId: string;
  totalShares: number;
  sharesByChannel: Record<string, number>;
  clicksFromShares: number;
  conversionRate: number;
  lastSharedAt: number;
}

export interface PreviewCard {
  id: string;
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  domain: string;
  type: 'portfolio' | 'signal' | 'stream' | 'post' | 'room' | 'website';
}

class DeepLinkingShareService {
  private deepLinks: Map<string, DeepLink> = new Map();
  private shareSheets: Map<string, ShareSheet> = new Map();
  private shareAnalytics: Map<string, ShareAnalytics> = new Map();
  private previewCards: Map<string, PreviewCard> = new Map();
  private linkClicks: Map<string, number> = new Map();

  private baseScheme = 'agentpay://';
  private baseUrl = 'https://agentpay.io/';

  /**
   * Create deep link
   */
  createDeepLink(
    targetScreen: string,
    params: Record<string, any> = {},
    expiresIn?: number
  ): DeepLink {
    const linkId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const path = targetScreen.replace(/\//g, '_');

    const deepLink: DeepLink = {
      id: linkId,
      url: `${this.baseScheme}${path}?id=${linkId}`,
      scheme: this.baseScheme,
      path,
      params,
      targetScreen,
      createdAt: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      isActive: true,
      analytics: {
        clicks: 0,
        shares: 0,
        conversions: 0,
      },
    };

    this.deepLinks.set(linkId, deepLink);

    return deepLink;
  }

  /**
   * Get deep link
   */
  getDeepLink(linkId: string): DeepLink | undefined {
    const link = this.deepLinks.get(linkId);

    if (!link) return undefined;

    // Check expiration
    if (link.expiresAt && Date.now() > link.expiresAt) {
      link.isActive = false;
      return undefined;
    }

    return link;
  }

  /**
   * Track deep link click
   */
  trackDeepLinkClick(linkId: string): boolean {
    const link = this.deepLinks.get(linkId);
    if (!link || !link.isActive) return false;

    link.analytics.clicks += 1;
    this.linkClicks.set(linkId, (this.linkClicks.get(linkId) || 0) + 1);

    return true;
  }

  /**
   * Create share sheet
   */
  createShareSheet(
    contentId: string,
    contentType: ShareSheet['contentType'],
    title: string,
    description: string,
    imageUrl?: string
  ): ShareSheet {
    const sheetId = `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create deep link for shared content
    const deepLink = this.createDeepLink(`view/${contentType}/${contentId}`, { contentId });

    const shareSheet: ShareSheet = {
      id: sheetId,
      contentId,
      contentType,
      title,
      description,
      imageUrl,
      url: deepLink.url,
      channels: this.generateShareChannels(deepLink.url, title, description),
      createdAt: Date.now(),
    };

    this.shareSheets.set(sheetId, shareSheet);

    // Initialize analytics
    this.shareAnalytics.set(sheetId, {
      shareId: sheetId,
      totalShares: 0,
      sharesByChannel: {},
      clicksFromShares: 0,
      conversionRate: 0,
      lastSharedAt: Date.now(),
    });

    // Create preview card
    this.createPreviewCard(deepLink.url, title, description, imageUrl, contentType);

    return shareSheet;
  }

  /**
   * Generate share channels
   */
  private generateShareChannels(url: string, title: string, description: string): ShareChannel[] {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);

    return [
      {
        name: 'twitter',
        icon: 'twitter',
        shareUrl: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        isAvailable: true,
      },
      {
        name: 'telegram',
        icon: 'telegram',
        shareUrl: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
        isAvailable: true,
      },
      {
        name: 'whatsapp',
        icon: 'whatsapp',
        shareUrl: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        isAvailable: true,
      },
      {
        name: 'facebook',
        icon: 'facebook',
        shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        isAvailable: true,
      },
      {
        name: 'linkedin',
        icon: 'linkedin',
        shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        isAvailable: true,
      },
      {
        name: 'email',
        icon: 'mail',
        shareUrl: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A${encodedUrl}`,
        isAvailable: true,
      },
      {
        name: 'copy',
        icon: 'copy',
        shareUrl: url,
        isAvailable: true,
      },
    ];
  }

  /**
   * Track share
   */
  trackShare(sheetId: string, channel: string): boolean {
    const sheet = this.shareSheets.get(sheetId);
    if (!sheet) return false;

    const analytics = this.shareAnalytics.get(sheetId);
    if (!analytics) return false;

    analytics.totalShares += 1;
    analytics.sharesByChannel[channel] = (analytics.sharesByChannel[channel] || 0) + 1;
    analytics.lastSharedAt = Date.now();

    // Update deep link analytics
    const deepLink = this.deepLinks.get(sheet.id);
    if (deepLink) {
      deepLink.analytics.shares += 1;
    }

    return true;
  }

  /**
   * Create preview card
   */
  private createPreviewCard(
    url: string,
    title: string,
    description: string,
    imageUrl?: string,
    type: PreviewCard['type'] = 'website'
  ): PreviewCard {
    const cardId = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const card: PreviewCard = {
      id: cardId,
      url,
      title,
      description,
      imageUrl: imageUrl || 'https://api.placeholder.com/400x300?text=AgentPay',
      domain: 'agentpay.io',
      type,
    };

    this.previewCards.set(cardId, card);

    return card;
  }

  /**
   * Get preview card
   */
  getPreviewCard(url: string): PreviewCard | undefined {
    for (const card of this.previewCards.values()) {
      if (card.url === url) {
        return card;
      }
    }

    return undefined;
  }

  /**
   * Get share sheet
   */
  getShareSheet(sheetId: string): ShareSheet | undefined {
    return this.shareSheets.get(sheetId);
  }

  /**
   * Get share analytics
   */
  getShareAnalytics(sheetId: string): ShareAnalytics | undefined {
    return this.shareAnalytics.get(sheetId);
  }

  /**
   * Get deep link analytics
   */
  getDeepLinkAnalytics(linkId: string): DeepLink['analytics'] | undefined {
    const link = this.deepLinks.get(linkId);
    return link?.analytics;
  }

  /**
   * Generate universal link
   */
  generateUniversalLink(targetScreen: string, params: Record<string, any> = {}): string {
    const queryString = new URLSearchParams(params).toString();
    return `${this.baseUrl}${targetScreen}?${queryString}`;
  }

  /**
   * Handle deep link
   */
  handleDeepLink(url: string): { screen: string; params: Record<string, any> } | null {
    if (!url.startsWith(this.baseScheme)) {
      return null;
    }

    const path = url.replace(this.baseScheme, '').split('?')[0];
    const queryString = url.split('?')[1] || '';
    const params = Object.fromEntries(new URLSearchParams(queryString));

    const screen = path.replace(/_/g, '/');

    return { screen, params };
  }

  /**
   * Get top shared content
   */
  getTopSharedContent(limit: number = 10): ShareSheet[] {
    const sorted = Array.from(this.shareSheets.values()).sort((a, b) => {
      const analyticsA = this.shareAnalytics.get(a.id);
      const analyticsB = this.shareAnalytics.get(b.id);

      const sharesA = analyticsA?.totalShares || 0;
      const sharesB = analyticsB?.totalShares || 0;

      return sharesB - sharesA;
    });

    return sorted.slice(0, limit);
  }

  /**
   * Get share statistics
   */
  getShareStatistics(): {
    totalShares: number;
    topChannels: Array<{ channel: string; count: number }>;
    averageSharesPerContent: number;
    conversionRate: number;
  } {
    let totalShares = 0;
    const channelCounts: Record<string, number> = {};
    let totalConversions = 0;

    for (const analytics of this.shareAnalytics.values()) {
      totalShares += analytics.totalShares;
      totalConversions += analytics.clicksFromShares;

      for (const [channel, count] of Object.entries(analytics.sharesByChannel)) {
        channelCounts[channel] = (channelCounts[channel] || 0) + count;
      }
    }

    const topChannels = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([channel, count]) => ({ channel, count }));

    return {
      totalShares,
      topChannels,
      averageSharesPerContent: this.shareSheets.size > 0 ? totalShares / this.shareSheets.size : 0,
      conversionRate: totalShares > 0 ? (totalConversions / totalShares) * 100 : 0,
    };
  }

  /**
   * Create shareable link
   */
  createShareableLink(
    contentId: string,
    contentType: string,
    customTitle?: string
  ): { deepLink: string; universalLink: string; shareUrl: string } {
    const deepLink = this.createDeepLink(`view/${contentType}/${contentId}`);
    const universalLink = this.generateUniversalLink(`view/${contentType}/${contentId}`, {
      id: contentId,
    });

    return {
      deepLink: deepLink.url,
      universalLink,
      shareUrl: `${this.baseUrl}share/${deepLink.id}`,
    };
  }
}

export const deepLinkingShareService = new DeepLinkingShareService();
