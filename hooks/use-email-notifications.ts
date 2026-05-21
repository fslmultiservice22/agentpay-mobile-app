import { useState, useCallback } from 'react';

export type EmailTemplate =
  | 'welcome'
  | 'password_reset'
  | 'kyc_verification'
  | 'transaction_confirmation'
  | 'payment_received'
  | 'security_alert'
  | 'promotional'
  | 'newsletter'
  | 'support_response';

export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'bounced' | 'failed';

export interface EmailNotification {
  id: string;
  userId: string;
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
  status: EmailStatus;
  sentAt?: number;
  deliveredAt?: number;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

export interface EmailPreference {
  userId: string;
  transactional: boolean;
  marketing: boolean;
  security: boolean;
  newsletter: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export interface EmailTemplateConfig {
  name: EmailTemplate;
  subject: string;
  htmlContent: string;
  textContent: string;
}

export function useEmailNotifications() {
  const [emails, setEmails] = useState<EmailNotification[]>([]);
  const [preferences, setPreferences] = useState<Map<string, EmailPreference>>(new Map());
  const [templates, setTemplates] = useState<Map<EmailTemplate, EmailTemplateConfig>>(
    new Map([
      [
        'welcome',
        {
          name: 'welcome',
          subject: 'Welcome to AgentPay Wallet',
          htmlContent: '<h1>Welcome!</h1><p>Thank you for joining AgentPay Wallet.</p>',
          textContent: 'Welcome to AgentPay Wallet',
        },
      ],
      [
        'transaction_confirmation',
        {
          name: 'transaction_confirmation',
          subject: 'Transaction Confirmed',
          htmlContent: '<h1>Transaction Confirmed</h1><p>Your transaction has been confirmed.</p>',
          textContent: 'Your transaction has been confirmed',
        },
      ],
      [
        'security_alert',
        {
          name: 'security_alert',
          subject: 'Security Alert',
          htmlContent: '<h1>Security Alert</h1><p>Unusual activity detected on your account.</p>',
          textContent: 'Security alert on your account',
        },
      ],
    ])
  );

  // Send email
  const sendEmail = useCallback(
    async (
      userId: string,
      to: string,
      template: EmailTemplate,
      data: Record<string, any> = {}
    ): Promise<EmailNotification | null> => {
      try {
        // Check user preferences
        const prefs = preferences.get(userId);
        if (!prefs) {
          console.warn(`No email preferences for user ${userId}`);
          return null;
        }

        // Check if user opted out
        if (template === 'promotional' && !prefs.marketing) {
          console.log('User opted out of marketing emails');
          return null;
        }

        if (template === 'security_alert' && !prefs.security) {
          console.log('User opted out of security emails');
          return null;
        }

        // Get template
        const emailTemplate = templates.get(template);
        if (!emailTemplate) {
          console.error(`Email template not found: ${template}`);
          return null;
        }

        const notification: EmailNotification = {
          id: `email_${Date.now()}`,
          userId,
          to,
          subject: emailTemplate.subject,
          template,
          data,
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
        };

        setEmails((prev) => [...prev, notification]);

        // Simulate email sending
        await sendEmailAsync(notification);

        return notification;
      } catch (error) {
        console.error('Failed to send email:', error);
        return null;
      }
    },
    [preferences, templates]
  );

  // Send email async
  const sendEmailAsync = useCallback(async (notification: EmailNotification) => {
    try {
      // Simulate email sending delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update status
      setEmails((prev) =>
        prev.map((e) =>
          e.id === notification.id
            ? {
                ...e,
                status: 'sent',
                sentAt: Date.now(),
              }
            : e
        )
      );

      // Simulate delivery
      setTimeout(() => {
        setEmails((prev) =>
          prev.map((e) =>
            e.id === notification.id
              ? {
                  ...e,
                  status: 'delivered',
                  deliveredAt: Date.now(),
                }
              : e
          )
        );
      }, 2000);
    } catch (error) {
      console.error('Failed to send email async:', error);

      // Retry logic
      if (notification.retryCount < notification.maxRetries) {
        setTimeout(() => {
          setEmails((prev) =>
            prev.map((e) =>
              e.id === notification.id
                ? {
                    ...e,
                    retryCount: e.retryCount + 1,
                    status: 'pending',
                  }
                : e
            )
          );
          sendEmailAsync({
            ...notification,
            retryCount: notification.retryCount + 1,
          });
        }, 5000);
      } else {
        setEmails((prev) =>
          prev.map((e) =>
            e.id === notification.id
              ? {
                  ...e,
                  status: 'failed',
                  errorMessage: error instanceof Error ? error.message : 'Failed to send email',
                }
              : e
          )
        );
      }
    }
  }, []);

  // Set email preferences
  const setEmailPreferences = useCallback(
    async (userId: string, prefs: Partial<EmailPreference>) => {
      try {
        const existing = preferences.get(userId) || {
          userId,
          transactional: true,
          marketing: true,
          security: true,
          newsletter: true,
          frequency: 'immediate' as const,
        };

        const updated = { ...existing, ...prefs };
        setPreferences((prev) => new Map([...prev, [userId, updated]]));

        return updated;
      } catch (error) {
        console.error('Failed to set email preferences:', error);
        return null;
      }
    },
    [preferences]
  );

  // Get email preferences
  const getEmailPreferences = useCallback(
    (userId: string): EmailPreference | null => {
      return preferences.get(userId) || null;
    },
    [preferences]
  );

  // Get email history
  const getEmailHistory = useCallback(
    (userId: string, limit: number = 50): EmailNotification[] => {
      return emails
        .filter((e) => e.userId === userId)
        .slice(-limit)
        .reverse();
    },
    [emails]
  );

  // Get email statistics
  const getStatistics = useCallback(() => {
    const stats = {
      totalEmails: emails.length,
      sentEmails: emails.filter((e) => e.status === 'sent').length,
      deliveredEmails: emails.filter((e) => e.status === 'delivered').length,
      failedEmails: emails.filter((e) => e.status === 'failed').length,
      bouncedEmails: emails.filter((e) => e.status === 'bounced').length,
      deliveryRate:
        emails.length > 0
          ? (emails.filter((e) => e.status === 'delivered').length / emails.length) * 100
          : 0,
      emailsByTemplate: {} as Record<EmailTemplate, number>,
    };

    // Count emails by template
    emails.forEach((e) => {
      stats.emailsByTemplate[e.template] = (stats.emailsByTemplate[e.template] || 0) + 1;
    });

    return stats;
  }, [emails]);

  // Add custom template
  const addTemplate = useCallback(
    (template: EmailTemplateConfig) => {
      setTemplates((prev) => new Map([...prev, [template.name, template]]));
      return true;
    },
    []
  );

  return {
    emails,
    preferences,
    templates,
    sendEmail,
    setEmailPreferences,
    getEmailPreferences,
    getEmailHistory,
    getStatistics,
    addTemplate,
  };
}
