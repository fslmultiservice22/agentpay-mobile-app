/**
 * Email Notifications Service
 * SendGrid integration for email alerts and notifications
 */

export interface EmailTemplate {
  type: 'portfolio_alert' | 'trade_recommendation' | 'referral_commission' | 'payment_confirmation' | 'security_alert' | 'weekly_report';
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailNotification {
  id: string;
  recipientEmail: string;
  templateType: EmailTemplate['type'];
  subject: string;
  htmlContent: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  createdAt: number;
  sentAt?: number;
  failureReason?: string;
  retryCount: number;
}

export interface EmailPreference {
  userId: string;
  portfolioAlerts: boolean;
  tradeRecommendations: boolean;
  referralCommissions: boolean;
  paymentConfirmations: boolean;
  securityAlerts: boolean;
  weeklyReports: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  unsubscribedAt?: number;
}

class EmailNotificationsService {
  private emailNotifications: Map<string, EmailNotification> = new Map();
  private emailPreferences: Map<string, EmailPreference> = new Map();
  private emailTemplates: Map<string, EmailTemplate> = new Map();

  private readonly SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
  private readonly FROM_EMAIL = 'notifications@agentpay.io';
  private readonly FROM_NAME = 'AgentPay Wallet';

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize email templates
   */
  private initializeTemplates(): void {
    this.emailTemplates.set('portfolio_alert', {
      type: 'portfolio_alert',
      subject: 'Portfolio Alert - Action Required',
      htmlContent: `
        <h2>Portfolio Alert</h2>
        <p>Your portfolio has triggered an alert based on your settings.</p>
        <p>Please review your portfolio and take appropriate action.</p>
        <a href="https://agentpay.io/portfolio">View Portfolio</a>
      `,
      textContent: 'Your portfolio has triggered an alert. Please review your portfolio.',
    });

    this.emailTemplates.set('trade_recommendation', {
      type: 'trade_recommendation',
      subject: 'New Trade Recommendation - {{assetSymbol}}',
      htmlContent: `
        <h2>New Trade Recommendation</h2>
        <p>AI has generated a new trade recommendation for {{assetSymbol}}.</p>
        <p><strong>Action:</strong> {{action}}</p>
        <p><strong>Confidence:</strong> {{confidence}}%</p>
        <a href="https://agentpay.io/recommendations">View Recommendation</a>
      `,
      textContent: 'New trade recommendation for {{assetSymbol}}. Action: {{action}}',
    });

    this.emailTemplates.set('referral_commission', {
      type: 'referral_commission',
      subject: 'Referral Commission Earned - ${{amount}}',
      htmlContent: `
        <h2>Referral Commission Earned</h2>
        <p>You have earned a referral commission!</p>
        <p><strong>Amount:</strong> ${{amount}}</p>
        <p><strong>Referred User:</strong> {{referredUsername}}</p>
        <a href="https://agentpay.io/referrals">View Referrals</a>
      `,
      textContent: 'You earned ${{amount}} from referral commission.',
    });

    this.emailTemplates.set('payment_confirmation', {
      type: 'payment_confirmation',
      subject: 'Payment Confirmation - {{amount}} {{currency}}',
      htmlContent: `
        <h2>Payment Confirmation</h2>
        <p>Your payment has been processed successfully.</p>
        <p><strong>Amount:</strong> {{amount}} {{currency}}</p>
        <p><strong>Recipient:</strong> {{recipientName}}</p>
        <p><strong>Date:</strong> {{date}}</p>
        <a href="https://agentpay.io/transactions">View Transaction</a>
      `,
      textContent: 'Payment of {{amount}} {{currency}} confirmed to {{recipientName}}.',
    });

    this.emailTemplates.set('security_alert', {
      type: 'security_alert',
      subject: 'Security Alert - Unusual Activity Detected',
      htmlContent: `
        <h2>Security Alert</h2>
        <p>We detected unusual activity on your account.</p>
        <p><strong>Activity:</strong> {{activityType}}</p>
        <p><strong>Time:</strong> {{timestamp}}</p>
        <p>If this wasn't you, please secure your account immediately.</p>
        <a href="https://agentpay.io/security">Review Security</a>
      `,
      textContent: 'Security alert: {{activityType}} detected on your account.',
    });

    this.emailTemplates.set('weekly_report', {
      type: 'weekly_report',
      subject: 'Weekly Portfolio Report',
      htmlContent: `
        <h2>Your Weekly Portfolio Report</h2>
        <p><strong>Portfolio Value:</strong> ${{portfolioValue}}</p>
        <p><strong>Weekly Return:</strong> {{weeklyReturn}}%</p>
        <p><strong>Top Performer:</strong> {{topAsset}}</p>
        <p><strong>Trades Executed:</strong> {{tradeCount}}</p>
        <a href="https://agentpay.io/reports">View Full Report</a>
      `,
      textContent: 'Weekly report: Portfolio value ${{portfolioValue}}, Return {{weeklyReturn}}%',
    });
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(
    recipientEmail: string,
    templateType: EmailTemplate['type'],
    variables: Record<string, string>
  ): Promise<EmailNotification | null> {
    const template = this.emailTemplates.get(templateType);
    if (!template) return null;

    // Replace variables in template
    let subject = template.subject;
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
      textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
    }

    const notification: EmailNotification = {
      id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recipientEmail,
      templateType,
      subject,
      htmlContent,
      status: 'pending',
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.emailNotifications.set(notification.id, notification);

    // Simulate SendGrid API call
    try {
      await this.sendViaAPI(recipientEmail, subject, htmlContent, textContent);
      notification.status = 'sent';
      notification.sentAt = Date.now();
    } catch (error) {
      notification.status = 'failed';
      notification.failureReason = (error as Error).message;
    }

    return notification;
  }

  /**
   * Send via API (simulated SendGrid)
   */
  private async sendViaAPI(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<void> {
    // Simulated API call - in production, use actual SendGrid API
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (recipientEmail.includes('@')) {
          resolve();
        } else {
          reject(new Error('Invalid email address'));
        }
      }, 100);
    });
  }

  /**
   * Set email preferences
   */
  setEmailPreferences(userId: string, preferences: Partial<EmailPreference>): EmailPreference {
    const existing = this.emailPreferences.get(userId) || {
      userId,
      portfolioAlerts: true,
      tradeRecommendations: true,
      referralCommissions: true,
      paymentConfirmations: true,
      securityAlerts: true,
      weeklyReports: true,
      frequency: 'immediate',
    };

    const updated = { ...existing, ...preferences };
    this.emailPreferences.set(userId, updated);

    return updated;
  }

  /**
   * Get email preferences
   */
  getEmailPreferences(userId: string): EmailPreference | undefined {
    return this.emailPreferences.get(userId);
  }

  /**
   * Unsubscribe from emails
   */
  unsubscribeFromEmails(userId: string): boolean {
    const prefs = this.emailPreferences.get(userId);
    if (!prefs) return false;

    prefs.unsubscribedAt = Date.now();
    prefs.portfolioAlerts = false;
    prefs.tradeRecommendations = false;
    prefs.referralCommissions = false;
    prefs.paymentConfirmations = false;
    prefs.securityAlerts = false;
    prefs.weeklyReports = false;

    return true;
  }

  /**
   * Get notification history
   */
  getNotificationHistory(recipientEmail?: string, status?: string): EmailNotification[] {
    let notifications = Array.from(this.emailNotifications.values());

    if (recipientEmail) {
      notifications = notifications.filter(n => n.recipientEmail === recipientEmail);
    }

    if (status) {
      notifications = notifications.filter(n => n.status === status);
    }

    return notifications.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(): Promise<number> {
    const failed = Array.from(this.emailNotifications.values()).filter(
      n => n.status === 'failed' && n.retryCount < 3
    );

    for (const notification of failed) {
      try {
        await this.sendViaAPI(
          notification.recipientEmail,
          notification.subject,
          notification.htmlContent,
          notification.htmlContent
        );
        notification.status = 'sent';
        notification.sentAt = Date.now();
      } catch (error) {
        notification.retryCount++;
        notification.failureReason = (error as Error).message;
      }
    }

    return failed.length;
  }

  /**
   * Get email statistics
   */
  getEmailStatistics(): {
    totalSent: number;
    totalFailed: number;
    totalPending: number;
    successRate: number;
    byTemplate: Record<string, number>;
  } {
    const notifications = Array.from(this.emailNotifications.values());

    const sent = notifications.filter(n => n.status === 'sent').length;
    const failed = notifications.filter(n => n.status === 'failed').length;
    const pending = notifications.filter(n => n.status === 'pending').length;

    const byTemplate: Record<string, number> = {};
    for (const notification of notifications) {
      byTemplate[notification.templateType] = (byTemplate[notification.templateType] || 0) + 1;
    }

    return {
      totalSent: sent,
      totalFailed: failed,
      totalPending: pending,
      successRate: notifications.length > 0 ? (sent / notifications.length) * 100 : 0,
      byTemplate,
    };
  }

  /**
   * Send batch emails
   */
  async sendBatchEmails(
    recipients: string[],
    templateType: EmailTemplate['type'],
    variables: Record<string, string>
  ): Promise<EmailNotification[]> {
    const results: EmailNotification[] = [];

    for (const recipient of recipients) {
      const notification = await this.sendEmailNotification(recipient, templateType, variables);
      if (notification) {
        results.push(notification);
      }
    }

    return results;
  }
}

export const emailNotificationsService = new EmailNotificationsService();
