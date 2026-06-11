/**
 * Social Media Configuration
 * Configurazione per l'integrazione con i social media principali
 */

export type SocialPlatform = 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'discord' | 'telegram' | 'youtube';

export interface SocialConfig {
  id: SocialPlatform;
  name: string;
  icon: string;
  color: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  apiEndpoint: string;
  enabled: boolean;
}

export interface SocialAccount {
  platform: SocialPlatform;
  userId: string;
  username: string;
  displayName: string;
  profileImage: string;
  bio?: string;
  followers: number;
  following: number;
  verified: boolean;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  connectedAt: number;
}

export interface SocialShare {
  id: string;
  platform: SocialPlatform;
  content: string;
  media?: {
    type: 'image' | 'video';
    url: string;
  }[];
  metadata?: {
    tradeId?: string;
    portfolioValue?: number;
    profitLoss?: number;
    timestamp?: number;
  };
  postedAt: number;
  likes: number;
  comments: number;
  shares: number;
  url: string;
}

export interface SocialNotification {
  id: string;
  platform: SocialPlatform;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'share';
  fromUser: {
    userId: string;
    username: string;
    profileImage: string;
  };
  content?: string;
  relatedTo?: string;
  read: boolean;
  createdAt: number;
}

export const SOCIAL_PLATFORMS: Record<SocialPlatform, Omit<SocialConfig, 'clientId' | 'clientSecret'>> = {
  twitter: {
    id: 'twitter',
    name: 'Twitter/X',
    icon: 'twitter',
    color: '#1DA1F2',
    redirectUri: 'manus-agentpay://oauth/twitter',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'follows.read', 'follows.write', 'offline.access'],
    apiEndpoint: 'https://api.twitter.com/2',
    enabled: true,
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    redirectUri: 'manus-agentpay://oauth/instagram',
    scopes: ['user_profile', 'user_media'],
    apiEndpoint: 'https://graph.instagram.com/v18.0',
    enabled: true,
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    redirectUri: 'manus-agentpay://oauth/facebook',
    scopes: ['public_profile', 'email', 'user_friends'],
    apiEndpoint: 'https://graph.facebook.com/v18.0',
    enabled: true,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    redirectUri: 'manus-agentpay://oauth/tiktok',
    scopes: ['user.info.basic', 'video.list', 'video.upload'],
    apiEndpoint: 'https://open.tiktokapis.com/v1',
    enabled: true,
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    redirectUri: 'manus-agentpay://oauth/linkedin',
    scopes: ['profile', 'email', 'openid'],
    apiEndpoint: 'https://api.linkedin.com/v2',
    enabled: true,
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    icon: 'discord',
    color: '#5865F2',
    redirectUri: 'manus-agentpay://oauth/discord',
    scopes: ['identify', 'email', 'guilds', 'guilds.join'],
    apiEndpoint: 'https://discord.com/api/v10',
    enabled: true,
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: 'telegram',
    color: '#0088cc',
    redirectUri: 'manus-agentpay://oauth/telegram',
    scopes: [],
    apiEndpoint: 'https://api.telegram.org',
    enabled: true,
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    redirectUri: 'manus-agentpay://oauth/youtube',
    scopes: ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.upload'],
    apiEndpoint: 'https://www.googleapis.com/youtube/v3',
    enabled: true,
  },
};

export const SOCIAL_SHARE_TEMPLATES = {
  trade_completed: (data: { symbol: string; amount: number; profit: number; percentage: number }) =>
    `🎯 Just completed a trade! ${data.symbol} +${data.percentage}% profit 📈 #Trading #Crypto #AgentPay`,
  
  portfolio_milestone: (data: { value: number; increase: number }) =>
    `🚀 Portfolio milestone reached! Now at $${data.value.toLocaleString()} (+${data.increase}%) 💰 #Investing #Crypto`,
  
  copy_trading_started: (data: { traderName: string }) =>
    `👥 Started copy trading with ${data.traderName}! Let's grow together 🤝 #CopyTrading #AgentPay`,
  
  referral_bonus: (data: { amount: number; referrals: number }) =>
    `💸 Earned $${data.amount} from ${data.referrals} referrals! Join me on AgentPay 🎁 #Referral`,
  
  achievement_unlocked: (data: { achievement: string }) =>
    `🏆 Achievement Unlocked: ${data.achievement}! #AgentPay #Trading`,
};
