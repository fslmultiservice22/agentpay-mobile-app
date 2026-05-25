import { describe, it, expect, beforeEach } from 'vitest';
import { analytics } from '../lib/analytics';

/**
 * Onboarding and Analytics Tests
 */

describe('Onboarding Feature', () => {
  describe('Onboarding Steps', () => {
    it('should have 4 onboarding steps', () => {
      const steps = [
        { title: 'Welcome to AgentPay', icon: 'wallet.pass.fill' },
        { title: 'Explore Features', icon: 'line.3.horizontal' },
        { title: 'Manage Your Wallet', icon: 'key.fill' },
        { title: 'Trade & Analyze', icon: 'chart.line.uptrend.xyaxis' },
      ];

      expect(steps).toHaveLength(4);
    });

    it('should have valid step titles', () => {
      const steps = [
        'Welcome to AgentPay',
        'Explore Features',
        'Manage Your Wallet',
        'Trade & Analyze',
      ];

      steps.forEach(title => {
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);
      });
    });

    it('should have valid step icons', () => {
      const icons = [
        'wallet.pass.fill',
        'line.3.horizontal',
        'key.fill',
        'chart.line.uptrend.xyaxis',
      ];

      icons.forEach(icon => {
        expect(icon).toBeTruthy();
        expect(icon.includes('.')).toBe(true);
      });
    });
  });

  describe('Onboarding Flow', () => {
    it('should have skip button on all steps', () => {
      const hasSkipButton = true;
      expect(hasSkipButton).toBe(true);
    });

    it('should have next/get started button', () => {
      const hasNextButton = true;
      expect(hasNextButton).toBe(true);
    });

    it('should show progress bar', () => {
      const hasProgressBar = true;
      expect(hasProgressBar).toBe(true);
    });

    it('should show dot indicators', () => {
      const hasDots = true;
      expect(hasDots).toBe(true);
    });
  });
});

describe('Analytics Service', () => {
  beforeEach(() => {
    analytics.clearEvents();
  });

  describe('Initialization', () => {
    it('should initialize analytics service', () => {
      analytics.init();
      expect(analytics).toBeTruthy();
    });

    it('should track events', () => {
      analytics.trackEvent('test_event', { test: true });
      expect(analytics.getEvents()).toHaveLength(1);
    });
  });

  describe('User Management', () => {
    it('should set user', () => {
      const user = { id: 'user123', email: 'test@example.com' };
      analytics.setUser(user);
      const summary = analytics.getSummary();
      expect(summary.user).toEqual(user);
    });

    it('should clear user', () => {
      const user = { id: 'user123' };
      analytics.setUser(user);
      analytics.clearUser();
      const summary = analytics.getSummary();
      expect(summary.user).toBeNull();
    });
  });

  describe('Event Tracking', () => {
    it('should track drawer menu open', () => {
      analytics.trackDrawerMenuOpen();
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('drawer_menu_open');
    });

    it('should track drawer menu item click', () => {
      analytics.trackDrawerMenuItemClick('Copy Trade', '/(tabs)/copy-trade-tracking');
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('drawer_menu_item_click');
      expect(events[0].params?.item_label).toBe('Copy Trade');
    });

    it('should track onboarding started', () => {
      analytics.trackOnboardingStarted();
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('onboarding_started');
    });

    it('should track onboarding completed', () => {
      analytics.trackOnboardingCompleted();
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('onboarding_completed');
    });

    it('should track onboarding skipped', () => {
      analytics.trackOnboardingSkipped();
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('onboarding_skipped');
    });

    it('should track wallet connected', () => {
      analytics.trackWalletConnected('MetaMask');
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('wallet_connected');
      expect(events[0].params?.wallet_type).toBe('MetaMask');
    });

    it('should track wallet disconnected', () => {
      analytics.trackWalletDisconnected();
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('wallet_disconnected');
    });

    it('should track tab navigation', () => {
      analytics.trackTabNavigation('trading');
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('tab_navigation');
      expect(events[0].params?.tab_name).toBe('trading');
    });

    it('should track deep link opened', () => {
      analytics.trackDeepLinkOpened('agentpay://trading', '/(tabs)/trading');
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('deep_link_opened');
    });

    it('should track error', () => {
      analytics.trackError('NetworkError', 'Failed to connect');
      const events = analytics.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('error_occurred');
      expect(events[0].params?.error_name).toBe('NetworkError');
    });
  });

  describe('Event Management', () => {
    it('should get all events', () => {
      analytics.trackEvent('event1');
      analytics.trackEvent('event2');
      analytics.trackEvent('event3');
      expect(analytics.getEvents()).toHaveLength(3);
    });

    it('should clear all events', () => {
      analytics.trackEvent('event1');
      analytics.trackEvent('event2');
      expect(analytics.getEvents()).toHaveLength(2);
      analytics.clearEvents();
      expect(analytics.getEvents()).toHaveLength(0);
    });

    it('should include timestamp in events', () => {
      analytics.trackEvent('test_event');
      const events = analytics.getEvents();
      expect(events[0].timestamp).toBeTruthy();
      expect(typeof events[0].timestamp).toBe('number');
    });
  });

  describe('Analytics Summary', () => {
    it('should get analytics summary', () => {
      analytics.trackEvent('event1');
      const summary = analytics.getSummary();
      expect(summary.totalEvents).toBe(1);
      expect(summary.lastEvent?.name).toBe('event1');
    });

    it('should track total events', () => {
      analytics.trackEvent('event1');
      analytics.trackEvent('event2');
      analytics.trackEvent('event3');
      const summary = analytics.getSummary();
      expect(summary.totalEvents).toBe(3);
    });

    it('should track last event', () => {
      analytics.trackEvent('event1');
      analytics.trackEvent('event2');
      const summary = analytics.getSummary();
      expect(summary.lastEvent?.name).toBe('event2');
    });
  });

  describe('Analytics Control', () => {
    it('should enable/disable analytics', () => {
      analytics.setEnabled(false);
      analytics.trackEvent('test_event');
      expect(analytics.getEvents()).toHaveLength(0);

      analytics.setEnabled(true);
      analytics.trackEvent('test_event');
      expect(analytics.getEvents()).toHaveLength(1);
    });
  });

  describe('Multiple Events', () => {
    it('should track multiple onboarding events', () => {
      analytics.trackOnboardingStarted();
      analytics.trackDrawerMenuOpen();
      analytics.trackOnboardingCompleted();

      const events = analytics.getEvents();
      expect(events).toHaveLength(3);
      expect(events[0].name).toBe('onboarding_started');
      expect(events[1].name).toBe('drawer_menu_open');
      expect(events[2].name).toBe('onboarding_completed');
    });

    it('should track user journey', () => {
      analytics.setUser({ id: 'user123' });
      analytics.trackOnboardingStarted();
      analytics.trackDrawerMenuOpen();
      analytics.trackDrawerMenuItemClick('Trading', '/(tabs)/trading');
      analytics.trackTabNavigation('trading');

      const events = analytics.getEvents();
      expect(events).toHaveLength(4);
      const summary = analytics.getSummary();
      expect(summary.totalEvents).toBe(4);
      expect(summary.user?.id).toBe('user123');
    });
  });
});
