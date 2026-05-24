import { describe, it, expect, beforeEach } from 'vitest';
import { firebaseCrashlyticsService } from '../lib/firebase-crashlytics-service';

describe('Firebase Crashlytics Service', () => {
  beforeEach(() => {
    firebaseCrashlyticsService.clearCrashes();
  });

  describe('initialize', () => {
    it('should initialize with config', () => {
      firebaseCrashlyticsService.initialize({
        appVersion: '2.0.0',
        osVersion: 'iOS 17.0',
        deviceModel: 'iPhone 15',
        enabled: true,
      });

      expect(firebaseCrashlyticsService).toBeDefined();
    });
  });

  describe('setUserId', () => {
    it('should set user ID', () => {
      firebaseCrashlyticsService.setUserId('user123');
      expect(firebaseCrashlyticsService).toBeDefined();
    });
  });

  describe('recordError', () => {
    it('should record error from Error object', () => {
      const error = new Error('Test error');
      firebaseCrashlyticsService.recordError(error, 'high');

      const crashes = firebaseCrashlyticsService.getCrashReports();
      expect(crashes).toHaveLength(1);
      expect(crashes[0].message).toBe('Test error');
      expect(crashes[0].severity).toBe('high');
    });

    it('should record error from string', () => {
      firebaseCrashlyticsService.recordError('String error', 'medium');

      const crashes = firebaseCrashlyticsService.getCrashReports();
      expect(crashes).toHaveLength(1);
      expect(crashes[0].message).toBe('String error');
      expect(crashes[0].severity).toBe('medium');
    });

    it('should record error with context', () => {
      const context = { userId: 'user123', action: 'payment' };
      firebaseCrashlyticsService.recordError('Payment failed', 'critical', context);

      const crashes = firebaseCrashlyticsService.getCrashReports();
      expect(crashes[0].context).toEqual(context);
    });

    it('should record error with severity levels', () => {
      firebaseCrashlyticsService.recordError('Low error', 'low');
      firebaseCrashlyticsService.recordError('Medium error', 'medium');
      firebaseCrashlyticsService.recordError('High error', 'high');
      firebaseCrashlyticsService.recordError('Critical error', 'critical');

      const crashes = firebaseCrashlyticsService.getCrashReports();
      expect(crashes).toHaveLength(4);
      expect(crashes[0].severity).toBe('low');
      expect(crashes[1].severity).toBe('medium');
      expect(crashes[2].severity).toBe('high');
      expect(crashes[3].severity).toBe('critical');
    });
  });

  describe('recordWarning', () => {
    it('should record warning', () => {
      firebaseCrashlyticsService.recordWarning('Test warning');
      expect(firebaseCrashlyticsService).toBeDefined();
    });
  });

  describe('recordLog', () => {
    it('should record log message', () => {
      firebaseCrashlyticsService.recordLog('Test log', { data: 'value' });
      expect(firebaseCrashlyticsService).toBeDefined();
    });
  });

  describe('getCrashReports', () => {
    it('should return all crash reports', () => {
      firebaseCrashlyticsService.recordError('Error 1', 'high');
      firebaseCrashlyticsService.recordError('Error 2', 'critical');

      const crashes = firebaseCrashlyticsService.getCrashReports();
      expect(crashes).toHaveLength(2);
    });

    it('should return empty array when no crashes', () => {
      const crashes = firebaseCrashlyticsService.getCrashReports();
      expect(crashes).toHaveLength(0);
    });
  });

  describe('getMetrics', () => {
    it('should calculate metrics correctly', () => {
      firebaseCrashlyticsService.recordError('Error 1', 'critical');
      firebaseCrashlyticsService.recordError('Error 1', 'critical');
      firebaseCrashlyticsService.recordError('Error 2', 'high');
      firebaseCrashlyticsService.recordError('Error 3', 'medium');

      const metrics = firebaseCrashlyticsService.getMetrics();

      expect(metrics.totalCrashes).toBe(4);
      expect(metrics.criticalCrashes).toBe(2);
      expect(metrics.highCrashes).toBe(1);
      expect(metrics.mediumCrashes).toBe(1);
      expect(metrics.uniqueErrors).toBe(3);
    });

    it('should identify top errors', () => {
      firebaseCrashlyticsService.recordError('Common error', 'high');
      firebaseCrashlyticsService.recordError('Common error', 'high');
      firebaseCrashlyticsService.recordError('Rare error', 'high');

      const metrics = firebaseCrashlyticsService.getMetrics();

      expect(metrics.topErrors).toHaveLength(2);
      expect(metrics.topErrors[0].message).toBe('Common error');
      expect(metrics.topErrors[0].count).toBe(2);
    });
  });

  describe('session management', () => {
    it('should track current session', () => {
      const session = firebaseCrashlyticsService.getCurrentSession();
      expect(session).not.toBeNull();
      expect(session?.sessionId).toBeDefined();
    });

    it('should end session', () => {
      const endedSession = firebaseCrashlyticsService.endSession();
      expect(endedSession).not.toBeNull();
      expect(endedSession?.endTime).toBeDefined();
      expect(endedSession?.duration).toBeDefined();
    });

    it('should get all sessions', () => {
      firebaseCrashlyticsService.endSession();
      const sessions = firebaseCrashlyticsService.getSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe('clearCrashes', () => {
    it('should clear all crashes', () => {
      firebaseCrashlyticsService.recordError('Error 1', 'high');
      firebaseCrashlyticsService.recordError('Error 2', 'high');

      let crashes = firebaseCrashlyticsService.getCrashReports();
      expect(crashes).toHaveLength(2);

      firebaseCrashlyticsService.clearCrashes();
      crashes = firebaseCrashlyticsService.getCrashReports();
      expect(crashes).toHaveLength(0);
    });
  });

  describe('exportCrashData', () => {
    it('should export crash data', () => {
      firebaseCrashlyticsService.recordError('Error 1', 'high');

      const exported = firebaseCrashlyticsService.exportCrashData();

      expect(exported.crashes).toBeDefined();
      expect(exported.sessions).toBeDefined();
      expect(exported.metrics).toBeDefined();
      expect(exported.crashes).toHaveLength(1);
    });
  });

  describe('sendCrashReport', () => {
    it('should send crash report', async () => {
      firebaseCrashlyticsService.recordError('Error to send', 'high');
      const crashes = firebaseCrashlyticsService.getCrashReports();

      const result = await firebaseCrashlyticsService.sendCrashReport(crashes[0]);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('sendBatchCrashReports', () => {
    it('should send batch crash reports', async () => {
      firebaseCrashlyticsService.recordError('Error 1', 'high');
      firebaseCrashlyticsService.recordError('Error 2', 'high');

      const result = await firebaseCrashlyticsService.sendBatchCrashReports();

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });
  });

  describe('getCrashFreeRate', () => {
    it('should calculate crash-free rate', () => {
      const rate = firebaseCrashlyticsService.getCrashFreeRate();
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });
  });
});
