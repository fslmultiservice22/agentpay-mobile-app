import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityType =
  | 'login'
  | 'logout'
  | 'send_transaction'
  | 'receive_transaction'
  | 'swap'
  | 'stake'
  | 'unstake'
  | 'vote_dao'
  | 'kyc_verification'
  | 'security_update'
  | 'settings_change'
  | 'error'
  | 'other';

export interface ActivityLog {
  id: string;
  userId: string;
  type: ActivityType;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  deviceId?: string;
  userAgent?: string;
  timestamp: number;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
}

export interface AuditTrail {
  userId: string;
  totalActivities: number;
  activities: ActivityLog[];
  lastActivity?: ActivityLog;
}

export function useActivityLogging() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [auditTrails, setAuditTrails] = useState<Map<string, AuditTrail>>(new Map());

  // Load activity logs
  const loadLogs = useCallback(async (userId: string) => {
    try {
      const stored = await AsyncStorage.getItem(`agentpay_activity_logs_${userId}`);
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        setLogs(parsedLogs);

        // Build audit trail
        const trail: AuditTrail = {
          userId,
          totalActivities: parsedLogs.length,
          activities: parsedLogs,
          lastActivity: parsedLogs[parsedLogs.length - 1],
        };
        setAuditTrails((prev) => new Map([...prev, [userId, trail]]));
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    }
  }, []);

  // Log activity
  const logActivity = useCallback(
    async (
      userId: string,
      type: ActivityType,
      action: string,
      details: Record<string, any> = {},
      status: 'success' | 'failed' | 'pending' = 'success',
      errorMessage?: string
    ) => {
      try {
        const log: ActivityLog = {
          id: `log_${Date.now()}`,
          userId,
          type,
          action,
          details,
          timestamp: Date.now(),
          status,
          errorMessage,
        };

        const updated = [...logs, log];
        setLogs(updated);

        // Update audit trail
        const trail = auditTrails.get(userId) || {
          userId,
          totalActivities: 0,
          activities: [],
        };

        const updatedTrail: AuditTrail = {
          userId,
          totalActivities: trail.totalActivities + 1,
          activities: [...trail.activities, log],
          lastActivity: log,
        };

        setAuditTrails((prev) => new Map([...prev, [userId, updatedTrail]]));

        // Persist logs
        await AsyncStorage.setItem(`agentpay_activity_logs_${userId}`, JSON.stringify(updated));

        return log;
      } catch (error) {
        console.error('Failed to log activity:', error);
        return null;
      }
    },
    [logs, auditTrails]
  );

  // Get activity logs for user
  const getActivityLogs = useCallback(
    (userId: string, limit: number = 100): ActivityLog[] => {
      const trail = auditTrails.get(userId);
      if (!trail) return [];

      return trail.activities.slice(-limit).reverse();
    },
    [auditTrails]
  );

  // Get activity logs by type
  const getActivitiesByType = useCallback(
    (userId: string, type: ActivityType): ActivityLog[] => {
      const trail = auditTrails.get(userId);
      if (!trail) return [];

      return trail.activities.filter((a) => a.type === type);
    },
    [auditTrails]
  );

  // Get activity logs in date range
  const getActivitiesInDateRange = useCallback(
    (userId: string, startTime: number, endTime: number): ActivityLog[] => {
      const trail = auditTrails.get(userId);
      if (!trail) return [];

      return trail.activities.filter((a) => a.timestamp >= startTime && a.timestamp <= endTime);
    },
    [auditTrails]
  );

  // Get audit trail
  const getAuditTrail = useCallback(
    (userId: string): AuditTrail | null => {
      return auditTrails.get(userId) || null;
    },
    [auditTrails]
  );

  // Export audit trail
  const exportAuditTrail = useCallback(
    async (userId: string): Promise<string | null> => {
      try {
        const trail = auditTrails.get(userId);
        if (!trail) return null;

        const csv = [
          ['ID', 'Type', 'Action', 'Status', 'Timestamp', 'Details'].join(','),
          ...trail.activities.map((a) =>
            [
              a.id,
              a.type,
              a.action,
              a.status,
              new Date(a.timestamp).toISOString(),
              JSON.stringify(a.details),
            ].join(',')
          ),
        ].join('\n');

        return csv;
      } catch (error) {
        console.error('Failed to export audit trail:', error);
        return null;
      }
    },
    [auditTrails]
  );

  // Get activity statistics
  const getStatistics = useCallback(
    (userId: string) => {
      const trail = auditTrails.get(userId);
      if (!trail) return null;

      const stats = {
        totalActivities: trail.totalActivities,
        successfulActivities: trail.activities.filter((a) => a.status === 'success').length,
        failedActivities: trail.activities.filter((a) => a.status === 'failed').length,
        activitiesByType: {} as Record<ActivityType, number>,
        lastActivity: trail.lastActivity,
        activityTrend: {
          today: trail.activities.filter(
            (a) => a.timestamp > Date.now() - 24 * 60 * 60 * 1000
          ).length,
          thisWeek: trail.activities.filter(
            (a) => a.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000
          ).length,
          thisMonth: trail.activities.filter(
            (a) => a.timestamp > Date.now() - 30 * 24 * 60 * 60 * 1000
          ).length,
        },
      };

      // Count activities by type
      trail.activities.forEach((a) => {
        stats.activitiesByType[a.type] = (stats.activitiesByType[a.type] || 0) + 1;
      });

      return stats;
    },
    [auditTrails]
  );

  // Clear old logs (older than 90 days)
  const clearOldLogs = useCallback(
    async (userId: string) => {
      try {
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const updated = logs.filter((l) => l.timestamp > ninetyDaysAgo);

        setLogs(updated);

        const trail = auditTrails.get(userId);
        if (trail) {
          const updatedTrail: AuditTrail = {
            userId,
            totalActivities: updated.length,
            activities: updated,
            lastActivity: updated[updated.length - 1],
          };
          setAuditTrails((prev) => new Map([...prev, [userId, updatedTrail]]));
        }

        await AsyncStorage.setItem(`agentpay_activity_logs_${userId}`, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to clear old logs:', error);
      }
    },
    [logs, auditTrails]
  );

  return {
    logs,
    auditTrails,
    loadLogs,
    logActivity,
    getActivityLogs,
    getActivitiesByType,
    getActivitiesInDateRange,
    getAuditTrail,
    exportAuditTrail,
    getStatistics,
    clearOldLogs,
  };
}
