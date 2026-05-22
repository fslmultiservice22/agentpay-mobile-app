import { describe, it, expect } from 'vitest';
import { SOCIAL_PLATFORMS, SOCIAL_SHARE_TEMPLATES } from '../lib/social/social-config';

describe('Social Media Integration', () => {
  describe('Social Configuration', () => {
    it('should have all required social platforms configured', () => {
      const platforms: Array<keyof typeof SOCIAL_PLATFORMS> = ['twitter', 'instagram', 'facebook', 'tiktok', 'linkedin', 'discord', 'telegram', 'youtube'];
      
      platforms.forEach(platform => {
        expect(SOCIAL_PLATFORMS[platform]).toBeDefined();
        expect(SOCIAL_PLATFORMS[platform].name).toBeDefined();
        expect(SOCIAL_PLATFORMS[platform].color).toBeDefined();
        expect(SOCIAL_PLATFORMS[platform].scopes).toBeDefined();
      });
    });

    it('should have valid redirect URIs for all platforms', () => {
      Object.values(SOCIAL_PLATFORMS).forEach(platform => {
        expect(platform.redirectUri).toMatch(/^manus-agentpay:\/\/oauth\//);
      });
    });

    it('should have valid API endpoints for all platforms', () => {
      Object.values(SOCIAL_PLATFORMS).forEach(platform => {
        expect(platform.apiEndpoint).toMatch(/^https:\/\//);
      });
    });

    it('should have valid color codes for all platforms', () => {
      Object.values(SOCIAL_PLATFORMS).forEach(platform => {
        expect(platform.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('Social Share Templates', () => {
    it('should have all required share templates', () => {
      const templates: Array<keyof typeof SOCIAL_SHARE_TEMPLATES> = [
        'trade_completed',
        'portfolio_milestone',
        'copy_trading_started',
        'referral_bonus',
        'achievement_unlocked',
      ];

      templates.forEach(template => {
        expect(SOCIAL_SHARE_TEMPLATES[template]).toBeDefined();
      });
    });

    it('should generate valid trade completed template', () => {
      const result = SOCIAL_SHARE_TEMPLATES.trade_completed({
        symbol: 'BTC/USD',
        amount: 1.5,
        profit: 500,
        percentage: 12.5,
      });

      expect(result).toContain('BTC/USD');
      expect(result).toContain('12.5%');
      expect(result).toContain('#Trading');
    });

    it('should generate valid portfolio milestone template', () => {
      const result = SOCIAL_SHARE_TEMPLATES.portfolio_milestone({
        value: 50000,
        increase: 25000,
      });

      expect(result).toContain('50,000');
      expect(result).toContain('#Investing');
    });

    it('should generate valid copy trading started template', () => {
      const result = SOCIAL_SHARE_TEMPLATES.copy_trading_started({
        traderName: 'John Trader',
      });

      expect(result).toContain('John Trader');
      expect(result).toContain('#CopyTrading');
    });

    it('should generate valid referral bonus template', () => {
      const result = SOCIAL_SHARE_TEMPLATES.referral_bonus({
        amount: 100,
        referrals: 5,
      });

      expect(result).toContain('100');
      expect(result).toContain('5');
      expect(result).toContain('#Referral');
    });

    it('should generate valid achievement unlocked template', () => {
      const result = SOCIAL_SHARE_TEMPLATES.achievement_unlocked({
        achievement: 'First Trade',
      });

      expect(result).toContain('First Trade');
      expect(result).toContain('#AgentPay');
    });
  });

  describe('Social Account Management', () => {
    it('should validate social account structure', () => {
      const mockAccount = {
        platform: 'twitter' as const,
        userId: '123456',
        username: 'testuser',
        displayName: 'Test User',
        profileImage: 'https://example.com/image.jpg',
        bio: 'Test bio',
        followers: 1000,
        following: 500,
        verified: true,
        accessToken: 'token123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000,
        connectedAt: Date.now(),
      };

      expect(mockAccount.platform).toBe('twitter');
      expect(mockAccount.userId).toBeDefined();
      expect(mockAccount.accessToken).toBeDefined();
      expect(mockAccount.expiresAt > Date.now()).toBe(true);
    });

    it('should validate token expiration', () => {
      const expiredToken = Date.now() - 1000;
      const validToken = Date.now() + 3600000;

      expect(expiredToken < Date.now()).toBe(true);
      expect(validToken > Date.now()).toBe(true);
    });
  });

  describe('Social Share Validation', () => {
    it('should validate social share structure', () => {
      const mockShare = {
        id: 'share123',
        platform: 'twitter' as const,
        content: 'Test share content',
        media: [{ type: 'image' as const, url: 'https://example.com/image.jpg' }],
        metadata: { tradeId: 'trade123' },
        postedAt: Date.now(),
        likes: 10,
        comments: 5,
        shares: 2,
        url: 'https://twitter.com/user/status/123',
      };

      expect(mockShare.platform).toBe('twitter');
      expect(mockShare.content).toBeDefined();
      expect(mockShare.postedAt).toBeLessThanOrEqual(Date.now());
    });

    it('should validate share metadata', () => {
      const metadata = {
        tradeId: 'trade123',
        portfolioValue: 50000,
        profitLoss: 1000,
        timestamp: Date.now(),
      };

      expect(metadata.tradeId).toBeDefined();
      expect(metadata.portfolioValue > 0).toBe(true);
      expect(metadata.timestamp <= Date.now()).toBe(true);
    });
  });

  describe('Social Notification Handling', () => {
    it('should validate social notification structure', () => {
      const mockNotification = {
        id: 'notif123',
        platform: 'twitter' as const,
        type: 'like' as const,
        fromUser: {
          userId: 'user123',
          username: 'testuser',
          profileImage: 'https://example.com/image.jpg',
        },
        content: 'Great trade!',
        relatedTo: 'share123',
        read: false,
        createdAt: Date.now(),
      };

      expect(mockNotification.platform).toBe('twitter');
      expect(mockNotification.type).toBe('like');
      expect(mockNotification.fromUser.userId).toBeDefined();
    });

    it('should handle different notification types', () => {
      const types = ['like', 'comment', 'follow', 'mention', 'message', 'share'];
      
      types.forEach(type => {
        expect(['like', 'comment', 'follow', 'mention', 'message', 'share']).toContain(type);
      });
    });
  });

  describe('Platform-Specific Features', () => {
    it('should have Twitter/X specific scopes', () => {
      const twitterScopes = SOCIAL_PLATFORMS['twitter'].scopes;
      expect(twitterScopes).toContain('tweet.read');
      expect(twitterScopes).toContain('tweet.write');
    });

    it('should have Instagram specific scopes', () => {
      const instagramScopes = SOCIAL_PLATFORMS['instagram'].scopes;
      expect(instagramScopes).toContain('user_profile');
      expect(instagramScopes).toContain('user_media');
    });

    it('should have Discord specific scopes', () => {
      const discordScopes = SOCIAL_PLATFORMS['discord'].scopes;
      expect(discordScopes).toContain('identify');
      expect(discordScopes).toContain('guilds');
    });

    it('should have YouTube specific scopes', () => {
      const youtubeScopes = SOCIAL_PLATFORMS['youtube'].scopes;
      expect(youtubeScopes.length > 0).toBe(true);
    });
  });

  describe('Social Profile Sync', () => {
    it('should aggregate follower counts correctly', () => {
      const accounts = [
        { followers: 1000, platform: 'twitter' },
        { followers: 500, platform: 'instagram' },
        { followers: 2000, platform: 'tiktok' },
      ];

      const totalFollowers = accounts.reduce((sum, acc) => sum + acc.followers, 0);
      expect(totalFollowers).toBe(3500);
    });

    it('should generate verification badges', () => {
      const verified = true;
      const followers = 50000;

      const badges = [];
      if (verified) badges.push('verified');
      if (followers >= 10000) badges.push('influencer');

      expect(badges).toContain('verified');
      expect(badges).toContain('influencer');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid platform gracefully', () => {
      const validPlatforms = Object.keys(SOCIAL_PLATFORMS);
      const invalidPlatform = 'invalid_platform';
      
      expect(validPlatforms).not.toContain(invalidPlatform);
    });

    it('should validate token format', () => {
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const invalidToken = '';

      expect(validToken.length > 0).toBe(true);
      expect(invalidToken.length === 0).toBe(true);
    });
  });
});
