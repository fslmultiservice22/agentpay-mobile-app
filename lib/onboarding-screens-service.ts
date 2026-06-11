/**
 * Mobile App Onboarding Screens Service
 * Interactive tutorials for new users
 */

export interface OnboardingScreen {
  id: string;
  step: number;
  title: string;
  description: string;
  image?: string;
  actionText: string;
  skipText?: string;
  highlights?: OnboardingHighlight[];
  videoUrl?: string;
}

export interface OnboardingHighlight {
  element: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface OnboardingTutorial {
  id: string;
  name: string;
  description: string;
  screens: OnboardingScreen[];
  isCompleted: boolean;
  completedAt?: number;
  createdAt: number;
}

export interface UserOnboardingProgress {
  userId: string;
  currentStep: number;
  completedTutorials: string[];
  skippedTutorials: string[];
  totalTimeSpent: number;
  lastAccessedAt: number;
  isOnboardingComplete: boolean;
}

export interface OnboardingEvent {
  id: string;
  userId: string;
  tutorialId: string;
  eventType: 'screen_viewed' | 'action_completed' | 'tutorial_completed' | 'tutorial_skipped';
  screenId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class OnboardingScreensService {
  private tutorials: Map<string, OnboardingTutorial> = new Map();
  private userProgress: Map<string, UserOnboardingProgress> = new Map();
  private events: Map<string, OnboardingEvent> = new Map();

  constructor() {
    this.initializeDefaultTutorials();
  }

  /**
   * Initialize default onboarding tutorials
   */
  private initializeDefaultTutorials(): void {
    // Wallet Connection Tutorial
    this.tutorials.set('wallet_connection', {
      id: 'wallet_connection',
      name: 'Connect Your Wallet',
      description: 'Learn how to connect your Ethereum wallet to AgentPay',
      screens: [
        {
          id: 'wallet_1',
          step: 1,
          title: 'Welcome to AgentPay',
          description: 'Connect your Ethereum wallet to view your assets and manage your portfolio across multiple chains.',
          image: 'wallet_intro',
          actionText: 'Next',
          skipText: 'Skip Tutorial',
          highlights: [
            {
              element: 'wallet_button',
              title: 'Wallet Connection',
              description: 'Tap here to connect your wallet',
              position: 'bottom',
            },
          ],
        },
        {
          id: 'wallet_2',
          step: 2,
          title: 'Choose Your Wallet',
          description: 'Select your preferred wallet provider (MetaMask, WalletConnect, Ledger, etc.)',
          image: 'wallet_providers',
          actionText: 'Connect',
          highlights: [
            {
              element: 'metamask_button',
              title: 'MetaMask',
              description: 'Most popular Ethereum wallet',
              position: 'bottom',
            },
          ],
        },
        {
          id: 'wallet_3',
          step: 3,
          title: 'Approve Connection',
          description: 'Confirm the connection in your wallet app',
          image: 'wallet_approval',
          actionText: 'Done',
        },
        {
          id: 'wallet_4',
          step: 4,
          title: 'Portfolio Ready',
          description: 'Your portfolio is now synced! View your assets in the Portfolio tab.',
          image: 'wallet_success',
          actionText: 'View Portfolio',
        },
      ],
      isCompleted: false,
      createdAt: Date.now(),
    });

    // Bank Connection Tutorial
    this.tutorials.set('bank_connection', {
      id: 'bank_connection',
      name: 'Connect Your Bank',
      description: 'Learn how to connect your bank account for fiat transfers',
      screens: [
        {
          id: 'bank_1',
          step: 1,
          title: 'Add Bank Account',
          description: 'Connect your bank account to transfer funds directly to your IBAN.',
          image: 'bank_intro',
          actionText: 'Next',
          skipText: 'Skip Tutorial',
        },
        {
          id: 'bank_2',
          step: 2,
          title: 'Verify Your Identity',
          description: 'We need to verify your identity for security and compliance.',
          image: 'bank_verification',
          actionText: 'Verify',
        },
        {
          id: 'bank_3',
          step: 3,
          title: 'Enter Bank Details',
          description: 'Provide your IBAN and bank account information.',
          image: 'bank_details',
          actionText: 'Continue',
        },
        {
          id: 'bank_4',
          step: 4,
          title: 'Bank Connected',
          description: 'Your bank account is now connected. You can now transfer funds.',
          image: 'bank_success',
          actionText: 'Start Trading',
        },
      ],
      isCompleted: false,
      createdAt: Date.now(),
    });

    // Send Payment Tutorial
    this.tutorials.set('send_payment', {
      id: 'send_payment',
      name: 'Send Your First Payment',
      description: 'Learn how to send crypto payments',
      screens: [
        {
          id: 'payment_1',
          step: 1,
          title: 'Send Crypto',
          description: 'Send cryptocurrency to any wallet address.',
          image: 'payment_intro',
          actionText: 'Next',
          skipText: 'Skip Tutorial',
          highlights: [
            {
              element: 'send_button',
              title: 'Send Button',
              description: 'Tap to send crypto',
              position: 'bottom',
            },
          ],
        },
        {
          id: 'payment_2',
          step: 2,
          title: 'Select Asset',
          description: 'Choose which cryptocurrency you want to send.',
          image: 'payment_asset',
          actionText: 'Next',
        },
        {
          id: 'payment_3',
          step: 3,
          title: 'Enter Recipient',
          description: 'Enter the recipient wallet address or scan QR code.',
          image: 'payment_recipient',
          actionText: 'Next',
        },
        {
          id: 'payment_4',
          step: 4,
          title: 'Review & Confirm',
          description: 'Review the transaction details and confirm to send.',
          image: 'payment_review',
          actionText: 'Send',
        },
        {
          id: 'payment_5',
          step: 5,
          title: 'Payment Sent',
          description: 'Your payment has been sent successfully!',
          image: 'payment_success',
          actionText: 'Done',
        },
      ],
      isCompleted: false,
      createdAt: Date.now(),
    });

    // Portfolio View Tutorial
    this.tutorials.set('portfolio_view', {
      id: 'portfolio_view',
      name: 'Explore Your Portfolio',
      description: 'Learn about portfolio analytics and insights',
      screens: [
        {
          id: 'portfolio_1',
          step: 1,
          title: 'Portfolio Dashboard',
          description: 'View your complete portfolio with real-time prices and performance.',
          image: 'portfolio_intro',
          actionText: 'Next',
          skipText: 'Skip Tutorial',
          highlights: [
            {
              element: 'portfolio_tab',
              title: 'Portfolio Tab',
              description: 'Access your portfolio here',
              position: 'bottom',
            },
          ],
        },
        {
          id: 'portfolio_2',
          step: 2,
          title: 'Asset Details',
          description: 'Tap on any asset to see detailed information and charts.',
          image: 'portfolio_details',
          actionText: 'Next',
        },
        {
          id: 'portfolio_3',
          step: 3,
          title: 'Performance Metrics',
          description: 'View your returns, gains/losses, and performance over different time periods.',
          image: 'portfolio_metrics',
          actionText: 'Next',
        },
        {
          id: 'portfolio_4',
          step: 4,
          title: 'Ready to Explore',
          description: 'You\'re all set! Start exploring your portfolio.',
          image: 'portfolio_success',
          actionText: 'Explore',
        },
      ],
      isCompleted: false,
      createdAt: Date.now(),
    });
  }

  /**
   * Get tutorial
   */
  getTutorial(tutorialId: string): OnboardingTutorial | undefined {
    return this.tutorials.get(tutorialId);
  }

  /**
   * Get all tutorials
   */
  getAllTutorials(): OnboardingTutorial[] {
    return Array.from(this.tutorials.values());
  }

  /**
   * Get tutorial screen
   */
  getTutorialScreen(tutorialId: string, screenId: string): OnboardingScreen | undefined {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) return undefined;

    return tutorial.screens.find(s => s.id === screenId);
  }

  /**
   * Initialize user onboarding
   */
  initializeUserOnboarding(userId: string): UserOnboardingProgress {
    const progress: UserOnboardingProgress = {
      userId,
      currentStep: 0,
      completedTutorials: [],
      skippedTutorials: [],
      totalTimeSpent: 0,
      lastAccessedAt: Date.now(),
      isOnboardingComplete: false,
    };

    this.userProgress.set(userId, progress);

    return progress;
  }

  /**
   * Get user onboarding progress
   */
  getUserProgress(userId: string): UserOnboardingProgress | undefined {
    return this.userProgress.get(userId);
  }

  /**
   * Start tutorial
   */
  startTutorial(userId: string, tutorialId: string): boolean {
    const progress = this.userProgress.get(userId);
    if (!progress) return false;

    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) return false;

    // Record event
    this.recordEvent(userId, tutorialId, 'screen_viewed', tutorial.screens[0].id);

    return true;
  }

  /**
   * Complete tutorial screen
   */
  completeScreen(userId: string, tutorialId: string, screenId: string): boolean {
    const progress = this.userProgress.get(userId);
    if (!progress) return false;

    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) return false;

    const screen = tutorial.screens.find(s => s.id === screenId);
    if (!screen) return false;

    // Record event
    this.recordEvent(userId, tutorialId, 'screen_viewed', screenId);

    return true;
  }

  /**
   * Complete tutorial
   */
  completeTutorial(userId: string, tutorialId: string): boolean {
    const progress = this.userProgress.get(userId);
    if (!progress) return false;

    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) return false;

    if (!progress.completedTutorials.includes(tutorialId)) {
      progress.completedTutorials.push(tutorialId);
    }

    tutorial.isCompleted = true;
    tutorial.completedAt = Date.now();

    // Record event
    this.recordEvent(userId, tutorialId, 'tutorial_completed');

    // Check if all tutorials completed
    if (progress.completedTutorials.length === this.tutorials.size) {
      progress.isOnboardingComplete = true;
    }

    return true;
  }

  /**
   * Skip tutorial
   */
  skipTutorial(userId: string, tutorialId: string): boolean {
    const progress = this.userProgress.get(userId);
    if (!progress) return false;

    if (!progress.skippedTutorials.includes(tutorialId)) {
      progress.skippedTutorials.push(tutorialId);
    }

    // Record event
    this.recordEvent(userId, tutorialId, 'tutorial_skipped');

    return true;
  }

  /**
   * Record onboarding event
   */
  private recordEvent(
    userId: string,
    tutorialId: string,
    eventType: OnboardingEvent['eventType'],
    screenId?: string,
    metadata?: Record<string, any>
  ): void {
    const eventId = `evt_${Date.now()}`;

    const event: OnboardingEvent = {
      id: eventId,
      userId,
      tutorialId,
      eventType,
      screenId,
      timestamp: Date.now(),
      metadata,
    };

    this.events.set(eventId, event);
  }

  /**
   * Get user onboarding events
   */
  getUserEvents(userId: string, limit: number = 100): OnboardingEvent[] {
    const events = Array.from(this.events.values()).filter(e => e.userId === userId);

    events.sort((a, b) => b.timestamp - a.timestamp);

    return events.slice(0, limit);
  }

  /**
   * Get onboarding completion rate
   */
  getCompletionRate(): number {
    const totalUsers = this.userProgress.size;
    if (totalUsers === 0) return 0;

    const completedUsers = Array.from(this.userProgress.values()).filter(p => p.isOnboardingComplete).length;

    return (completedUsers / totalUsers) * 100;
  }

  /**
   * Get tutorial completion rate
   */
  getTutorialCompletionRate(tutorialId: string): number {
    const users = Array.from(this.userProgress.values());
    if (users.length === 0) return 0;

    const completedUsers = users.filter(p => p.completedTutorials.includes(tutorialId)).length;

    return (completedUsers / users.length) * 100;
  }

  /**
   * Get average time spent
   */
  getAverageTimeSpent(): number {
    const users = Array.from(this.userProgress.values());
    if (users.length === 0) return 0;

    const totalTime = users.reduce((sum, u) => sum + u.totalTimeSpent, 0);

    return totalTime / users.length;
  }
}

export const onboardingScreensService = new OnboardingScreensService();
