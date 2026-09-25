/**
 * Firebase Crashlytics Service
 * Handles crash reporting and error tracking
 */

export interface CrashReport {
  id: string;
  timestamp: number;
  message: string;
  stack: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: Record<string, any>;
  userId?: string;
  appVersion: string;
  osVersion: string;
  deviceModel: string;
  url?: string;
  userAgent?: string;
}

export interface ErrorMetrics {
  totalCrashes: number;
  criticalCrashes: number;
  highCrashes: number;
  mediumCrashes: number;
  lowCrashes: number;
  uniqueErrors: number;
  affectedUsers: number;
  crashFreeUsers: number;
  crashFreeRate: number;
  topErrors: Array<{ message: string; count: number; lastOccurrence: number }>;
}

export interface SessionInfo {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  crashCount: number;
  errorCount: number;
  warningCount: number;
  events: SessionEvent[];
}

export interface SessionEvent {
  timestamp: number;
  type: 'log' | 'error' | 'warning' | 'crash';
  message: string;
  data?: Record<string, any>;
}

class FirebaseCrashlyticsService {
  private crashes: Map<string, CrashReport> = new Map();
  private sessions: Map<string, SessionInfo> = new Map();
  private currentSession: SessionInfo | null = null;
  private userId: string | null = null;
  private appVersion: string = '1.0.0';
  private osVersion: string = 'unknown';
  private deviceModel: string = 'unknown';
  private isEnabled: boolean = true;

  constructor() {
    this.initializeSession();
  }

  /**
   * Initialize Firebase Crashlytics
   */
  initialize(config: {
    appVersion?: string;
    osVersion?: string;
    deviceModel?: string;
    enabled?: boolean;
  }): void {
    if (config.appVersion) this.appVersion = config.appVersion;
    if (config.osVersion) this.osVersion = config.osVersion;
    if (config.deviceModel) this.deviceModel = config.deviceModel;
    if (config.enabled !== undefined) this.isEnabled = config.enabled;
  }

  /**
   * Set user ID for crash reporting
   */
  setUserId(userId: string): void {
    this.userId = userId;
    if (this.currentSession) {
      this.currentSession.userId = userId;
    }
  }

  /**
   * Record an error/crash
   */
  recordError(error: Error | string, severity: 'low' | 'medium' | 'high' | 'critical' = 'high', context?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack || '' : '';

    const crash: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      message,
      stack,
      severity,
      context: context || {},
      userId: this.userId || undefined,
      appVersion: this.appVersion,
      osVersion: this.osVersion,
      deviceModel: this.deviceModel,
    };

    this.crashes.set(crash.id, crash);

    // Log to current session
    if (this.currentSession) {
      this.currentSession.crashCount++;
      this.currentSession.events.push({
        timestamp: Date.now(),
        type: 'crash',
        message,
        data: context,
      });
    }

    // Log to console in development
    console.error(`[Crashlytics] ${severity.toUpperCase()}: ${message}`, stack, context);
  }

  /**
   * Record a warning
   */
  recordWarning(message: string, context?: Record<string, any>): void {
    if (!this.isEnabled) return;

    if (this.currentSession) {
      this.currentSession.warningCount++;
      this.currentSession.events.push({
        timestamp: Date.now(),
        type: 'warning',
        message,
        data: context,
      });
    }

    console.warn(`[Crashlytics] WARNING: ${message}`, context);
  }

  /**
   * Record a log message
   */
  recordLog(message: string, data?: Record<string, any>): void {
    if (!this.isEnabled) return;

    if (this.currentSession) {
      this.currentSession.events.push({
        timestamp: Date.now(),
        type: 'log',
        message,
        data,
      });
    }

  }

  /**
   * Get all crash reports
   */
  getCrashReports(): CrashReport[] {
    return Array.from(this.crashes.values());
  }

  /**
   * Get crash metrics
   */
  getMetrics(): ErrorMetrics {
    const crashes = Array.from(this.crashes.values());
    const bySeverity = {
      critical: crashes.filter(c => c.severity === 'critical').length,
      high: crashes.filter(c => c.severity === 'high').length,
      medium: crashes.filter(c => c.severity === 'medium').length,
      low: crashes.filter(c => c.severity === 'low').length,
    };

    const uniqueErrors = new Set(crashes.map(c => c.message)).size;
    const affectedUsers = new Set(crashes.map(c => c.userId).filter(Boolean)).size;

    // Group by message to find top errors
    const errorMap = new Map<string, { count: number; lastOccurrence: number }>();
    crashes.forEach(c => {
      const existing = errorMap.get(c.message) || { count: 0, lastOccurrence: 0 };
      errorMap.set(c.message, {
        count: existing.count + 1,
        lastOccurrence: Math.max(existing.lastOccurrence, c.timestamp),
      });
    });

    const topErrors = Array.from(errorMap.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCrashes: crashes.length,
      criticalCrashes: bySeverity.critical,
      highCrashes: bySeverity.high,
      mediumCrashes: bySeverity.medium,
      lowCrashes: bySeverity.low,
      uniqueErrors,
      affectedUsers,
      crashFreeUsers: 0, // Would need user data
      crashFreeRate: 0, // Would need user data
      topErrors,
    };
  }

  /**
   * Initialize a new session
   */
  private initializeSession(): void {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentSession = {
      sessionId,
      userId: this.userId || undefined,
      startTime: Date.now(),
      crashCount: 0,
      errorCount: 0,
      warningCount: 0,
      events: [],
    };
    this.sessions.set(sessionId, this.currentSession);
  }

  /**
   * End current session
   */
  endSession(): SessionInfo | null {
    if (!this.currentSession) return null;

    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

    const session = this.currentSession;
    this.currentSession = null;

    return session;
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  /**
   * Get all sessions
   */
  getSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Clear all crash data
   */
  clearCrashes(): void {
    this.crashes.clear();
  }

  /**
   * Export crash data
   */
  exportCrashData(): {
    crashes: CrashReport[];
    sessions: SessionInfo[];
    metrics: ErrorMetrics;
  } {
    return {
      crashes: this.getCrashReports(),
      sessions: this.getSessions(),
      metrics: this.getMetrics(),
    };
  }

  /**
   * Send crash report to server (mock)
   */
  async sendCrashReport(crash: CrashReport): Promise<{ success: boolean; message: string }> {
    try {
      // In production, this would send to Firebase Crashlytics

      // Simulate network request
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            success: true,
            message: 'Crash report sent successfully',
          });
        }, 100);
      });
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send crash report',
      };
    }
  }

  /**
   * Batch send crash reports
   */
  async sendBatchCrashReports(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const crashes = this.getCrashReports();
      let successCount = 0;

      for (const crash of crashes) {
        const result = await this.sendCrashReport(crash);
        if (result.success) {
          successCount++;
          this.crashes.delete(crash.id);
        }
      }

      return {
        success: successCount === crashes.length,
        count: successCount,
        message: `Sent ${successCount}/${crashes.length} crash reports`,
      };
    } catch (error) {
      return {
        success: false,
        count: 0,
        message: error instanceof Error ? error.message : 'Failed to send batch crash reports',
      };
    }
  }

  /**
   * Get crash-free rate
   */
  getCrashFreeRate(): number {
    const sessions = this.getSessions();
    if (sessions.length === 0) return 100;

    const crashFreeSessions = sessions.filter(s => s.crashCount === 0).length;
    return (crashFreeSessions / sessions.length) * 100;
  }

  /**
   * Format timestamp for display
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  /**
   * Get severity color
   */
  static getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      critical: '#DC2626',
      high: '#EA580C',
      medium: '#F59E0B',
      low: '#10B981',
    };
    return colors[severity] || '#6B7280';
  }
}

export const firebaseCrashlyticsService = new FirebaseCrashlyticsService();
