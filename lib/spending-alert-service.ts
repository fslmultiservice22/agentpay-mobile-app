/**
 * Spending Alert Service
 * Sends proactive push notifications when spending forecast exceeds 80% of budget
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotificationsService } from './push-notifications-service';

const ALERT_HISTORY_KEY = 'agentpay_spending_alerts';
const BUDGET_KEY = 'agentpay_budget_categories';
const TRANSACTIONS_KEY = 'agentpay_transactions';

interface SpendingAlert {
  id: string;
  category: string;
  percentage: number;
  projected: number;
  budget: number;
  sentAt: string;
  month: string;
}

interface BudgetCategory {
  id: string;
  name: string;
  limit: number;
  color: string;
}

interface Transaction {
  id: string;
  amount: number;
  category: string;
  date: string;
}

class SpendingAlertService {
  private alertsSent: Map<string, SpendingAlert> = new Map();

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(ALERT_HISTORY_KEY);
      if (stored) {
        const alerts: SpendingAlert[] = JSON.parse(stored);
        alerts.forEach(a => this.alertsSent.set(a.id, a));
      }
    } catch {}
  }

  /**
   * Check spending forecast and send alerts for categories exceeding 80% of budget
   */
  async checkAndAlert(): Promise<SpendingAlert[]> {
    try {
      const budgets = await this.loadBudgets();
      const transactions = await this.loadTransactions();

      if (budgets.length === 0 || transactions.length === 0) return [];

      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const progressRatio = dayOfMonth / daysInMonth;

      // Filter transactions for current month
      const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));

      const newAlerts: SpendingAlert[] = [];

      for (const budget of budgets) {
        if (budget.limit <= 0) continue;

        // Sum spending in this category
        const spent = monthTransactions
          .filter(t => t.category === budget.name || t.category === budget.id)
          .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Project end-of-month spending
        const projected = progressRatio > 0 ? spent / progressRatio : 0;
        const percentage = (projected / budget.limit) * 100;

        // Alert if projected > 80% of budget
        if (percentage >= 80) {
          const alertId = `${currentMonth}_${budget.id || budget.name}`;

          // Don't send duplicate alerts for same category/month
          if (this.alertsSent.has(alertId)) continue;

          const alert: SpendingAlert = {
            id: alertId,
            category: budget.name,
            percentage: Math.round(percentage),
            projected: Math.round(projected),
            budget: budget.limit,
            sentAt: new Date().toISOString(),
            month: currentMonth,
          };

          // Send push notification
          try {
            const severity = percentage >= 100 ? 'SUPERAMENTO' : 'ATTENZIONE';
            const emoji = percentage >= 100 ? '🚨' : '⚠️';

            await pushNotificationsService.sendLocalNotification({
              title: `${emoji} ${severity}: ${budget.name}`,
              body: `Proiezione: €${projected.toFixed(0)} su budget €${budget.limit.toFixed(0)} (${Math.round(percentage)}%). ${percentage >= 100 ? 'Stai superando il budget!' : 'Rischi di superare il budget.'}`,
              type: 'general',
              data: { screen: '/spending-forecast', category: budget.name },
            });

            this.alertsSent.set(alertId, alert);
            newAlerts.push(alert);
          } catch {
            // Notification failed, skip
          }
        }
      }

      // Persist alert history
      if (newAlerts.length > 0) {
        await this.persistAlerts();
      }

      return newAlerts;
    } catch (err) {
      console.error('SpendingAlertService.checkAndAlert failed:', err);
      return [];
    }
  }

  /**
   * Get all alerts sent this month
   */
  getMonthlyAlerts(): SpendingAlert[] {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return Array.from(this.alertsSent.values()).filter(a => a.month === currentMonth);
  }

  /**
   * Clear all alerts (for testing)
   */
  async clearAlerts(): Promise<void> {
    this.alertsSent.clear();
    await AsyncStorage.removeItem(ALERT_HISTORY_KEY);
  }

  private async loadBudgets(): Promise<BudgetCategory[]> {
    try {
      const stored = await AsyncStorage.getItem(BUDGET_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async loadTransactions(): Promise<Transaction[]> {
    try {
      const stored = await AsyncStorage.getItem(TRANSACTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async persistAlerts(): Promise<void> {
    try {
      const alerts = Array.from(this.alertsSent.values());
      await AsyncStorage.setItem(ALERT_HISTORY_KEY, JSON.stringify(alerts));
    } catch {}
  }
}

export const spendingAlertService = new SpendingAlertService();
