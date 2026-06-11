/**
 * Subscription & Premium Tiers Service
 * Freemium model with premium features
 */

export type SubscriptionTier = 'free' | 'pro' | 'elite' | 'enterprise';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: SubscriptionFeature[];
  limits: SubscriptionLimits;
  createdAt: number;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  category: 'analytics' | 'trading' | 'community' | 'support' | 'api' | 'advanced';
  isAvailable: boolean;
}

export interface SubscriptionLimits {
  maxPortfolios: number;
  maxWatchlists: number;
  maxAlerts: number;
  maxAPICallsPerDay: number;
  maxSignalsPerMonth: number;
  maxGroupChats: number;
  maxForumPosts: number;
  maxConcurrentConnections: number;
  storageGB: number;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  webhooks: boolean;
  apiAccess: boolean;
}

export interface UserSubscription {
  userId: string;
  tier: SubscriptionTier;
  planId: string;
  startDate: number;
  renewalDate: number;
  billingCycle: 'monthly' | 'annual';
  isActive: boolean;
  autoRenew: boolean;
  paymentMethodId?: string;
  cancelledAt?: number;
  cancelReason?: string;
}

export interface SubscriptionUsage {
  userId: string;
  tier: SubscriptionTier;
  portfolios: number;
  watchlists: number;
  alerts: number;
  apiCallsToday: number;
  signalsThisMonth: number;
  groupChats: number;
  forumPosts: number;
  storageUsedGB: number;
  lastUpdated: number;
}

export interface UpgradeOffer {
  id: string;
  fromTier: SubscriptionTier;
  toTier: SubscriptionTier;
  discountPercent: number;
  validUntil: number;
  description: string;
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  billingPeriodStart: number;
  billingPeriodEnd: number;
  issueDate: number;
  dueDate: number;
  paidAt?: number;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  paymentMethod?: string;
}

class SubscriptionPremiumService {
  private plans: Map<string, SubscriptionPlan> = new Map();
  private subscriptions: Map<string, UserSubscription> = new Map();
  private usage: Map<string, SubscriptionUsage> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private upgradeOffers: Map<string, UpgradeOffer> = new Map();

  constructor() {
    this.initializeDefaultPlans();
  }

  /**
   * Initialize default subscription plans
   */
  private initializeDefaultPlans(): void {
    // Free plan
    this.plans.set('free', {
      tier: 'free',
      name: 'Free',
      description: 'Perfect for beginners',
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        { id: 'f1', name: 'Basic Portfolio Tracking', description: 'Track up to 1 portfolio', category: 'analytics', isAvailable: true },
        { id: 'f2', name: 'Price Alerts', description: 'Create up to 5 alerts', category: 'trading', isAvailable: true },
        { id: 'f3', name: 'Community Access', description: 'Read-only access to forums', category: 'community', isAvailable: true },
        { id: 'f4', name: 'Email Support', description: 'Standard email support', category: 'support', isAvailable: true },
      ],
      limits: {
        maxPortfolios: 1,
        maxWatchlists: 1,
        maxAlerts: 5,
        maxAPICallsPerDay: 100,
        maxSignalsPerMonth: 0,
        maxGroupChats: 0,
        maxForumPosts: 10,
        maxConcurrentConnections: 1,
        storageGB: 1,
        advancedAnalytics: false,
        prioritySupport: false,
        customBranding: false,
        webhooks: false,
        apiAccess: false,
      },
      createdAt: Date.now(),
    });

    // Pro plan
    this.plans.set('pro', {
      tier: 'pro',
      name: 'Pro',
      description: 'For serious traders',
      monthlyPrice: 29,
      annualPrice: 290,
      features: [
        { id: 'p1', name: 'Multiple Portfolios', description: 'Track up to 5 portfolios', category: 'analytics', isAvailable: true },
        { id: 'p2', name: 'Advanced Analytics', description: 'Detailed performance metrics', category: 'analytics', isAvailable: true },
        { id: 'p3', name: 'Unlimited Alerts', description: 'Create unlimited price alerts', category: 'trading', isAvailable: true },
        { id: 'p4', name: 'Trading Signals', description: 'Access to 50 signals/month', category: 'trading', isAvailable: true },
        { id: 'p5', name: 'Community Participation', description: 'Create posts and replies', category: 'community', isAvailable: true },
        { id: 'p6', name: 'Priority Support', description: 'Priority email support', category: 'support', isAvailable: true },
        { id: 'p7', name: 'API Access', description: 'Basic API access', category: 'api', isAvailable: true },
      ],
      limits: {
        maxPortfolios: 5,
        maxWatchlists: 10,
        maxAlerts: 100,
        maxAPICallsPerDay: 1000,
        maxSignalsPerMonth: 50,
        maxGroupChats: 5,
        maxForumPosts: 100,
        maxConcurrentConnections: 3,
        storageGB: 10,
        advancedAnalytics: true,
        prioritySupport: true,
        customBranding: false,
        webhooks: false,
        apiAccess: true,
      },
      createdAt: Date.now(),
    });

    // Elite plan
    this.plans.set('elite', {
      tier: 'elite',
      name: 'Elite',
      description: 'For professional traders',
      monthlyPrice: 99,
      annualPrice: 990,
      features: [
        { id: 'e1', name: 'Unlimited Portfolios', description: 'Unlimited portfolio tracking', category: 'analytics', isAvailable: true },
        { id: 'e2', name: 'Advanced Analytics', description: 'All analytics features', category: 'analytics', isAvailable: true },
        { id: 'e3', name: 'Unlimited Alerts', description: 'Unlimited price alerts', category: 'trading', isAvailable: true },
        { id: 'e4', name: 'Unlimited Signals', description: 'Unlimited trading signals', category: 'trading', isAvailable: true },
        { id: 'e5', name: 'Advanced Community', description: 'Create groups and channels', category: 'community', isAvailable: true },
        { id: 'e6', name: '24/7 Priority Support', description: '24/7 priority support', category: 'support', isAvailable: true },
        { id: 'e7', name: 'Full API Access', description: 'Full API with webhooks', category: 'api', isAvailable: true },
        { id: 'e8', name: 'Advanced Features', description: 'Backtesting, automation', category: 'advanced', isAvailable: true },
      ],
      limits: {
        maxPortfolios: 999,
        maxWatchlists: 999,
        maxAlerts: 999,
        maxAPICallsPerDay: 10000,
        maxSignalsPerMonth: 999,
        maxGroupChats: 50,
        maxForumPosts: 999,
        maxConcurrentConnections: 10,
        storageGB: 100,
        advancedAnalytics: true,
        prioritySupport: true,
        customBranding: false,
        webhooks: true,
        apiAccess: true,
      },
      createdAt: Date.now(),
    });

    // Enterprise plan
    this.plans.set('enterprise', {
      tier: 'enterprise',
      name: 'Enterprise',
      description: 'For institutions',
      monthlyPrice: 0, // Custom pricing
      annualPrice: 0,
      features: [
        { id: 'ent1', name: 'Everything in Elite', description: 'All Elite features', category: 'analytics', isAvailable: true },
        { id: 'ent2', name: 'Custom Branding', description: 'White-label solution', category: 'advanced', isAvailable: true },
        { id: 'ent3', name: 'Dedicated Account Manager', description: 'Dedicated support', category: 'support', isAvailable: true },
        { id: 'ent4', name: 'Custom Integration', description: 'Custom API integration', category: 'api', isAvailable: true },
        { id: 'ent5', name: 'SLA Guarantee', description: '99.9% uptime SLA', category: 'support', isAvailable: true },
      ],
      limits: {
        maxPortfolios: 999999,
        maxWatchlists: 999999,
        maxAlerts: 999999,
        maxAPICallsPerDay: 999999,
        maxSignalsPerMonth: 999999,
        maxGroupChats: 999,
        maxForumPosts: 999999,
        maxConcurrentConnections: 100,
        storageGB: 1000,
        advancedAnalytics: true,
        prioritySupport: true,
        customBranding: true,
        webhooks: true,
        apiAccess: true,
      },
      createdAt: Date.now(),
    });
  }

  /**
   * Subscribe user to plan
   */
  subscribeUserToPlan(
    userId: string,
    tier: SubscriptionTier,
    billingCycle: 'monthly' | 'annual' = 'monthly',
    paymentMethodId?: string
  ): UserSubscription | null {
    const plan = this.plans.get(tier);
    if (!plan) return null;

    const subscriptionId = `sub_${Date.now()}`;

    const now = Date.now();
    const renewalDate = billingCycle === 'monthly' ? now + 30 * 24 * 60 * 60 * 1000 : now + 365 * 24 * 60 * 60 * 1000;

    const subscription: UserSubscription = {
      userId,
      tier,
      planId: tier,
      startDate: now,
      renewalDate,
      billingCycle,
      isActive: true,
      autoRenew: true,
      paymentMethodId,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Initialize usage
    this.usage.set(userId, {
      userId,
      tier,
      portfolios: 0,
      watchlists: 0,
      alerts: 0,
      apiCallsToday: 0,
      signalsThisMonth: 0,
      groupChats: 0,
      forumPosts: 0,
      storageUsedGB: 0,
      lastUpdated: now,
    });

    // Create invoice
    const invoiceId = `inv_${Date.now()}`;
    const amount = billingCycle === 'monthly' ? plan.monthlyPrice : plan.annualPrice;

    const invoice: Invoice = {
      id: invoiceId,
      userId,
      subscriptionId,
      amount,
      currency: 'USD',
      billingPeriodStart: now,
      billingPeriodEnd: renewalDate,
      issueDate: now,
      dueDate: now + 7 * 24 * 60 * 60 * 1000,
      status: 'pending',
      paymentMethod: paymentMethodId,
    };

    this.invoices.set(invoiceId, invoice);

    return subscription;
  }

  /**
   * Upgrade subscription
   */
  upgradeSubscription(userId: string, newTier: SubscriptionTier): UserSubscription | null {
    const currentSubscription = Array.from(this.subscriptions.values()).find(s => s.userId === userId && s.isActive);

    if (!currentSubscription) return null;

    // Cancel current subscription
    currentSubscription.isActive = false;
    currentSubscription.cancelledAt = Date.now();
    currentSubscription.cancelReason = 'Upgraded to ' + newTier;

    // Create new subscription
    return this.subscribeUserToPlan(userId, newTier, currentSubscription.billingCycle, currentSubscription.paymentMethodId);
  }

  /**
   * Cancel subscription
   */
  cancelSubscription(userId: string, reason?: string): boolean {
    const subscription = Array.from(this.subscriptions.values()).find(s => s.userId === userId && s.isActive);

    if (!subscription) return false;

    subscription.isActive = false;
    subscription.autoRenew = false;
    subscription.cancelledAt = Date.now();
    subscription.cancelReason = reason;

    return true;
  }

  /**
   * Get user subscription
   */
  getUserSubscription(userId: string): UserSubscription | undefined {
    return Array.from(this.subscriptions.values()).find(s => s.userId === userId && s.isActive);
  }

  /**
   * Get subscription plan
   */
  getSubscriptionPlan(tier: SubscriptionTier): SubscriptionPlan | undefined {
    return this.plans.get(tier);
  }

  /**
   * Get all plans
   */
  getAllPlans(): SubscriptionPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get user usage
   */
  getUserUsage(userId: string): SubscriptionUsage | undefined {
    return this.usage.get(userId);
  }

  /**
   * Update user usage
   */
  updateUserUsage(userId: string, updates: Partial<SubscriptionUsage>): SubscriptionUsage | undefined {
    const userUsage = this.usage.get(userId);
    if (!userUsage) return undefined;

    Object.assign(userUsage, updates);
    userUsage.lastUpdated = Date.now();

    return userUsage;
  }

  /**
   * Check if user has feature
   */
  hasFeature(userId: string, featureName: string): boolean {
    const subscription = this.getUserSubscription(userId);
    if (!subscription) return false;

    const plan = this.plans.get(subscription.tier);
    if (!plan) return false;

    return plan.features.some(f => f.name === featureName && f.isAvailable);
  }

  /**
   * Check usage limits
   */
  checkUsageLimit(userId: string, limitType: keyof SubscriptionLimits): boolean {
    const subscription = this.getUserSubscription(userId);
    if (!subscription) return false;

    const plan = this.plans.get(subscription.tier);
    if (!plan) return false;

    const usage = this.usage.get(userId);
    if (!usage) return false;

    const limit = plan.limits[limitType] as number;

    switch (limitType) {
      case 'maxPortfolios':
        return usage.portfolios < limit;
      case 'maxWatchlists':
        return usage.watchlists < limit;
      case 'maxAlerts':
        return usage.alerts < limit;
      case 'maxAPICallsPerDay':
        return usage.apiCallsToday < limit;
      case 'maxSignalsPerMonth':
        return usage.signalsThisMonth < limit;
      case 'maxGroupChats':
        return usage.groupChats < limit;
      case 'maxForumPosts':
        return usage.forumPosts < limit;
      case 'storageGB':
        return usage.storageUsedGB < limit;
      default:
        return true;
    }
  }

  /**
   * Get upgrade offers
   */
  getUpgradeOffers(currentTier: SubscriptionTier): UpgradeOffer[] {
    return Array.from(this.upgradeOffers.values()).filter(offer => offer.fromTier === currentTier);
  }

  /**
   * Create upgrade offer
   */
  createUpgradeOffer(
    fromTier: SubscriptionTier,
    toTier: SubscriptionTier,
    discountPercent: number,
    validDays: number,
    description: string
  ): UpgradeOffer {
    const offerId = `offer_${Date.now()}`;

    const offer: UpgradeOffer = {
      id: offerId,
      fromTier,
      toTier,
      discountPercent,
      validUntil: Date.now() + validDays * 24 * 60 * 60 * 1000,
      description,
    };

    this.upgradeOffers.set(offerId, offer);

    return offer;
  }

  /**
   * Get user invoices
   */
  getUserInvoices(userId: string, limit: number = 20): Invoice[] {
    const invoices = Array.from(this.invoices.values()).filter(inv => inv.userId === userId);

    invoices.sort((a, b) => b.issueDate - a.issueDate);

    return invoices.slice(0, limit);
  }

  /**
   * Mark invoice as paid
   */
  markInvoiceAsPaid(invoiceId: string): boolean {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) return false;

    invoice.status = 'paid';
    invoice.paidAt = Date.now();

    return true;
  }
}

export const subscriptionPremiumService = new SubscriptionPremiumService();
