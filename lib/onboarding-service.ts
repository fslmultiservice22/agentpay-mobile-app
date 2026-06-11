/**
 * In-App Onboarding Service
 * Interactive step-by-step guides for first-time users
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: string;
  icon: string;
  order: number;
  completed: boolean;
  skipped: boolean;
}

export interface OnboardingTutorial {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  completed: boolean;
  startedAt?: number;
  completedAt?: number;
  skippedAt?: number;
}

export interface OnboardingState {
  currentTutorialId?: string;
  currentStepIndex: number;
  tutorials: OnboardingTutorial[];
  completedTutorials: string[];
  skippedTutorials: string[];
}

class OnboardingService {
  private state: OnboardingState = {
    currentStepIndex: 0,
    tutorials: [],
    completedTutorials: [],
    skippedTutorials: [],
  };

  private readonly ONBOARDING_STORAGE_KEY = 'onboarding_state';
  private readonly TUTORIALS: OnboardingTutorial[] = [
    {
      id: 'wallet-connection',
      name: 'Connect Your Wallet',
      description: 'Learn how to connect your Ethereum wallet',
      steps: [
        {
          id: 'wallet-intro',
          title: 'Welcome to AgentPay',
          description: 'Connect your Ethereum wallet to get started',
          action: 'Tap "Connect Wallet"',
          icon: 'wallet',
          order: 1,
          completed: false,
          skipped: false,
        },
        {
          id: 'wallet-select',
          title: 'Select Wallet',
          description: 'Choose your preferred wallet provider',
          action: 'Select MetaMask or WalletConnect',
          icon: 'select',
          order: 2,
          completed: false,
          skipped: false,
        },
        {
          id: 'wallet-confirm',
          title: 'Confirm Connection',
          description: 'Approve the connection in your wallet',
          action: 'Confirm in your wallet app',
          icon: 'check',
          order: 3,
          completed: false,
          skipped: false,
        },
      ],
      completed: false,
    },
    {
      id: 'bank-connection',
      name: 'Connect Your Bank',
      description: 'Link your Qonto bank account',
      steps: [
        {
          id: 'bank-intro',
          title: 'Connect Bank Account',
          description: 'Link your Qonto account for transfers',
          action: 'Tap "Connect Bank"',
          icon: 'bank',
          order: 1,
          completed: false,
          skipped: false,
        },
        {
          id: 'bank-oauth',
          title: 'Authorize Access',
          description: 'Grant permission to access your account',
          action: 'Tap "Authorize"',
          icon: 'lock',
          order: 2,
          completed: false,
          skipped: false,
        },
        {
          id: 'bank-confirm',
          title: 'Account Linked',
          description: 'Your bank account is now connected',
          action: 'Proceed to next step',
          icon: 'check',
          order: 3,
          completed: false,
          skipped: false,
        },
      ],
      completed: false,
    },
    {
      id: 'send-payment',
      name: 'Send Your First Payment',
      description: 'Learn how to send money',
      steps: [
        {
          id: 'send-intro',
          title: 'Send Payment',
          description: 'Transfer money to another account',
          action: 'Tap "Send" button',
          icon: 'send',
          order: 1,
          completed: false,
          skipped: false,
        },
        {
          id: 'send-recipient',
          title: 'Enter Recipient',
          description: 'Add recipient IBAN or address',
          action: 'Enter recipient details',
          icon: 'person',
          order: 2,
          completed: false,
          skipped: false,
        },
        {
          id: 'send-amount',
          title: 'Enter Amount',
          description: 'Specify the amount to send',
          action: 'Enter amount and currency',
          icon: 'money',
          order: 3,
          completed: false,
          skipped: false,
        },
        {
          id: 'send-confirm',
          title: 'Confirm & Send',
          description: 'Review and confirm the transaction',
          action: 'Tap "Confirm" to send',
          icon: 'check',
          order: 4,
          completed: false,
          skipped: false,
        },
      ],
      completed: false,
    },
    {
      id: 'portfolio-view',
      name: 'View Your Portfolio',
      description: 'Monitor your assets and performance',
      steps: [
        {
          id: 'portfolio-intro',
          title: 'Portfolio Dashboard',
          description: 'Track your holdings and performance',
          action: 'Tap "Portfolio" tab',
          icon: 'chart',
          order: 1,
          completed: false,
          skipped: false,
        },
        {
          id: 'portfolio-chart',
          title: 'View Charts',
          description: 'See price history and trends',
          action: 'Swipe to view different time ranges',
          icon: 'chart-line',
          order: 2,
          completed: false,
          skipped: false,
        },
        {
          id: 'portfolio-holdings',
          title: 'Your Holdings',
          description: 'View all your assets',
          action: 'Scroll to see holdings list',
          icon: 'list',
          order: 3,
          completed: false,
          skipped: false,
        },
      ],
      completed: false,
    },
  ];

  constructor() {
    this.loadState();
    this.initializeTutorials();
  }

  /**
   * Get all tutorials
   */
  getTutorials(): OnboardingTutorial[] {
    return [...this.state.tutorials];
  }

  /**
   * Get current tutorial
   */
  getCurrentTutorial(): OnboardingTutorial | undefined {
    if (!this.state.currentTutorialId) return undefined;
    return this.state.tutorials.find(t => t.id === this.state.currentTutorialId);
  }

  /**
   * Get current step
   */
  getCurrentStep(): OnboardingStep | undefined {
    const tutorial = this.getCurrentTutorial();
    if (!tutorial) return undefined;
    return tutorial.steps[this.state.currentStepIndex];
  }

  /**
   * Start tutorial
   */
  async startTutorial(tutorialId: string): Promise<boolean> {
    const tutorial = this.state.tutorials.find(t => t.id === tutorialId);
    if (!tutorial) return false;

    this.state.currentTutorialId = tutorialId;
    this.state.currentStepIndex = 0;
    tutorial.startedAt = Date.now();
    tutorial.skippedAt = undefined;

    await this.persistState();
    return true;
  }

  /**
   * Complete current step
   */
  async completeStep(): Promise<boolean> {
    const tutorial = this.getCurrentTutorial();
    const step = this.getCurrentStep();

    if (!tutorial || !step) return false;

    step.completed = true;

    if (this.state.currentStepIndex < tutorial.steps.length - 1) {
      this.state.currentStepIndex++;
    } else {
      await this.completeTutorial();
    }

    await this.persistState();
    return true;
  }

  /**
   * Skip current step
   */
  async skipStep(): Promise<boolean> {
    const step = this.getCurrentStep();
    if (!step) return false;

    step.skipped = true;
    await this.completeStep();
    return true;
  }

  /**
   * Complete tutorial
   */
  async completeTutorial(): Promise<boolean> {
    const tutorial = this.getCurrentTutorial();
    if (!tutorial) return false;

    tutorial.completed = true;
    tutorial.completedAt = Date.now();
    this.state.completedTutorials.push(tutorial.id);
    this.state.currentTutorialId = undefined;
    this.state.currentStepIndex = 0;

    await this.persistState();
    return true;
  }

  /**
   * Skip tutorial
   */
  async skipTutorial(): Promise<boolean> {
    const tutorial = this.getCurrentTutorial();
    if (!tutorial) return false;

    tutorial.skippedAt = Date.now();
    this.state.skippedTutorials.push(tutorial.id);
    this.state.currentTutorialId = undefined;
    this.state.currentStepIndex = 0;

    await this.persistState();
    return true;
  }

  /**
   * Get progress
   */
  getProgress(): {
    total: number;
    completed: number;
    percentage: number;
  } {
    const total = this.state.tutorials.length;
    const completed = this.state.completedTutorials.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, percentage };
  }

  /**
   * Check if tutorial is completed
   */
  isTutorialCompleted(tutorialId: string): boolean {
    return this.state.completedTutorials.includes(tutorialId);
  }

  /**
   * Check if tutorial is skipped
   */
  isTutorialSkipped(tutorialId: string): boolean {
    return this.state.skippedTutorials.includes(tutorialId);
  }

  /**
   * Reset onboarding
   */
  async resetOnboarding(): Promise<void> {
    this.state = {
      currentStepIndex: 0,
      tutorials: [],
      completedTutorials: [],
      skippedTutorials: [],
    };

    this.initializeTutorials();
    await this.persistState();
  }

  /**
   * Get next tutorial
   */
  getNextTutorial(): OnboardingTutorial | undefined {
    return this.state.tutorials.find(
      t => !this.isTutorialCompleted(t.id) && !this.isTutorialSkipped(t.id)
    );
  }

  /**
   * Initialize tutorials
   */
  private initializeTutorials(): void {
    this.state.tutorials = this.TUTORIALS.map(tutorial => ({
      ...tutorial,
      steps: tutorial.steps.map(step => ({ ...step })),
    }));
  }

  /**
   * Persist state to storage
   */
  private async persistState(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ONBOARDING_STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to persist onboarding state:', error);
    }
  }

  /**
   * Load state from storage
   */
  private async loadState(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.ONBOARDING_STORAGE_KEY);
      if (stored) {
        this.state = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }
  }
}

export const onboardingService = new OnboardingService();
