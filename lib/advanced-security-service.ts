/**
 * Advanced Security Features Service
 * Rate limiting, fraud detection, session management
 */

export interface RateLimitRule {
  id: string;
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

export interface RateLimitEntry {
  key: string;
  count: number;
  resetAt: number;
  isBlocked: boolean;
  blockedUntil?: number;
}

export interface FraudDetectionRule {
  id: string;
  name: string;
  type: 'transaction' | 'login' | 'payment' | 'withdrawal';
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'alert' | 'block' | 'verify';
  isEnabled: boolean;
}

export interface FraudAlert {
  id: string;
  userId: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metadata: Record<string, any>;
  timestamp: number;
  isResolved: boolean;
  resolvedAt?: number;
}

export interface SecurityLog {
  id: string;
  userId: string;
  action: string;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface DeviceTrust {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  isTrusted: boolean;
  trustedAt?: number;
  lastSeenAt: number;
  ipAddress?: string;
  userAgent?: string;
}

class AdvancedSecurityService {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private rateLimitRules: Map<string, RateLimitRule> = new Map();
  private fraudRules: Map<string, FraudDetectionRule> = new Map();
  private fraudAlerts: Map<string, FraudAlert> = new Map();
  private securityLogs: Map<string, SecurityLog> = new Map();
  private trustedDevices: Map<string, DeviceTrust[]> = new Map();
  private failedLoginAttempts: Map<string, number> = new Map();
  private suspiciousActivities: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default security rules
   */
  private initializeDefaultRules(): void {
    // Rate limit rules
    this.rateLimitRules.set('api_general', {
      id: 'api_general',
      endpoint: '/api/*',
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 5 * 60 * 1000, // 5 minutes
    });

    this.rateLimitRules.set('api_auth', {
      id: 'api_auth',
      endpoint: '/api/auth/*',
      maxRequests: 5,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 15 * 60 * 1000, // 15 minutes
    });

    this.rateLimitRules.set('api_payment', {
      id: 'api_payment',
      endpoint: '/api/payment/*',
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
      blockDurationMs: 10 * 60 * 1000, // 10 minutes
    });

    // Fraud detection rules
    this.fraudRules.set('high_value_transaction', {
      id: 'high_value_transaction',
      name: 'High Value Transaction',
      type: 'transaction',
      condition: 'amount > 10000',
      severity: 'high',
      action: 'verify',
      isEnabled: true,
    });

    this.fraudRules.set('rapid_transactions', {
      id: 'rapid_transactions',
      name: 'Rapid Transactions',
      type: 'transaction',
      condition: '3 transactions in 5 minutes',
      severity: 'medium',
      action: 'alert',
      isEnabled: true,
    });

    this.fraudRules.set('unusual_location', {
      id: 'unusual_location',
      name: 'Unusual Location',
      type: 'login',
      condition: 'login from new country',
      severity: 'high',
      action: 'verify',
      isEnabled: true,
    });

    this.fraudRules.set('multiple_failed_logins', {
      id: 'multiple_failed_logins',
      name: 'Multiple Failed Logins',
      type: 'login',
      condition: '5 failed attempts in 10 minutes',
      severity: 'critical',
      action: 'block',
      isEnabled: true,
    });

    this.fraudRules.set('large_withdrawal', {
      id: 'large_withdrawal',
      name: 'Large Withdrawal',
      type: 'withdrawal',
      condition: 'amount > 50000',
      severity: 'critical',
      action: 'verify',
      isEnabled: true,
    });
  }

  /**
   * Check rate limit
   */
  checkRateLimit(endpoint: string, key: string): boolean {
    const rule = Array.from(this.rateLimitRules.values()).find(r => this.matchEndpoint(endpoint, r.endpoint));

    if (!rule) return true;

    const limitKey = `${rule.id}:${key}`;
    const entry = this.rateLimits.get(limitKey);
    const now = Date.now();

    if (!entry) {
      this.rateLimits.set(limitKey, {
        key: limitKey,
        count: 1,
        resetAt: now + rule.windowMs,
        isBlocked: false,
      });

      return true;
    }

    if (entry.isBlocked && entry.blockedUntil && entry.blockedUntil > now) {
      return false;
    }

    if (entry.resetAt < now) {
      entry.count = 1;
      entry.resetAt = now + rule.windowMs;
      entry.isBlocked = false;

      return true;
    }

    entry.count++;

    if (entry.count > rule.maxRequests) {
      entry.isBlocked = true;
      entry.blockedUntil = now + rule.blockDurationMs;

      return false;
    }

    return true;
  }

  /**
   * Match endpoint pattern
   */
  private matchEndpoint(endpoint: string, pattern: string): boolean {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);

    return regex.test(endpoint);
  }

  /**
   * Record failed login attempt
   */
  recordFailedLoginAttempt(userId: string): number {
    const attempts = (this.failedLoginAttempts.get(userId) || 0) + 1;
    this.failedLoginAttempts.set(userId, attempts);

    if (attempts >= 5) {
      this.createFraudAlert(userId, 'multiple_failed_logins', 'critical', 'Multiple failed login attempts detected');
    }

    return attempts;
  }

  /**
   * Reset failed login attempts
   */
  resetFailedLoginAttempts(userId: string): void {
    this.failedLoginAttempts.delete(userId);
  }

  /**
   * Get failed login attempts
   */
  getFailedLoginAttempts(userId: string): number {
    return this.failedLoginAttempts.get(userId) || 0;
  }

  /**
   * Is account locked
   */
  isAccountLocked(userId: string): boolean {
    const attempts = this.getFailedLoginAttempts(userId);

    return attempts >= 5;
  }

  /**
   * Detect fraud
   */
  detectFraud(userId: string, eventType: string, metadata: Record<string, any>): FraudAlert | null {
    const rule = Array.from(this.fraudRules.values()).find(r => r.type === eventType && r.isEnabled);

    if (!rule) return null;

    // Simple fraud detection based on metadata
    if (eventType === 'transaction' && metadata.amount > 10000) {
      return this.createFraudAlert(userId, rule.id, rule.severity, `High value transaction detected: $${metadata.amount}`);
    }

    if (eventType === 'withdrawal' && metadata.amount > 50000) {
      return this.createFraudAlert(userId, rule.id, rule.severity, `Large withdrawal detected: $${metadata.amount}`);
    }

    if (eventType === 'login' && metadata.isNewLocation) {
      return this.createFraudAlert(userId, rule.id, rule.severity, `Login from unusual location: ${metadata.location}`);
    }

    return null;
  }

  /**
   * Create fraud alert
   */
  private createFraudAlert(
    userId: string,
    ruleId: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string
  ): FraudAlert {
    const alertId = `fraud_${Date.now()}`;
    const rule = this.fraudRules.get(ruleId);

    const alert: FraudAlert = {
      id: alertId,
      userId,
      ruleId,
      ruleName: rule?.name || 'Unknown Rule',
      severity,
      description,
      metadata: {},
      timestamp: Date.now(),
      isResolved: false,
    };

    this.fraudAlerts.set(alertId, alert);

    return alert;
  }

  /**
   * Get fraud alerts
   */
  getFraudAlerts(userId: string, unresolved: boolean = true): FraudAlert[] {
    const alerts = Array.from(this.fraudAlerts.values()).filter(
      a => a.userId === userId && (!unresolved || !a.isResolved)
    );

    alerts.sort((a, b) => b.timestamp - a.timestamp);

    return alerts;
  }

  /**
   * Resolve fraud alert
   */
  resolveFraudAlert(alertId: string): boolean {
    const alert = this.fraudAlerts.get(alertId);
    if (!alert) return false;

    alert.isResolved = true;
    alert.resolvedAt = Date.now();

    return true;
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    userId: string,
    action: string,
    status: 'success' | 'failure',
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): SecurityLog {
    const logId = `log_${Date.now()}`;

    const log: SecurityLog = {
      id: logId,
      userId,
      action,
      status,
      ipAddress,
      userAgent,
      metadata,
      timestamp: Date.now(),
    };

    this.securityLogs.set(logId, log);

    return log;
  }

  /**
   * Get security logs
   */
  getSecurityLogs(userId: string, limit: number = 100): SecurityLog[] {
    const logs = Array.from(this.securityLogs.values()).filter(l => l.userId === userId);

    logs.sort((a, b) => b.timestamp - a.timestamp);

    return logs.slice(0, limit);
  }

  /**
   * Add trusted device
   */
  addTrustedDevice(userId: string, deviceId: string, deviceName: string, ipAddress?: string, userAgent?: string): DeviceTrust {
    const trustId = `trust_${Date.now()}`;

    const trust: DeviceTrust = {
      id: trustId,
      userId,
      deviceId,
      deviceName,
      isTrusted: true,
      trustedAt: Date.now(),
      lastSeenAt: Date.now(),
      ipAddress,
      userAgent,
    };

    const devices = this.trustedDevices.get(userId) || [];
    devices.push(trust);
    this.trustedDevices.set(userId, devices);

    return trust;
  }

  /**
   * Get trusted devices
   */
  getTrustedDevices(userId: string): DeviceTrust[] {
    return this.trustedDevices.get(userId) || [];
  }

  /**
   * Is device trusted
   */
  isDeviceTrusted(userId: string, deviceId: string): boolean {
    const devices = this.trustedDevices.get(userId) || [];

    return devices.some(d => d.deviceId === deviceId && d.isTrusted);
  }

  /**
   * Remove trusted device
   */
  removeTrustedDevice(userId: string, deviceId: string): boolean {
    const devices = this.trustedDevices.get(userId) || [];
    const index = devices.findIndex(d => d.deviceId === deviceId);

    if (index === -1) return false;

    devices.splice(index, 1);

    return true;
  }

  /**
   * Update last seen
   */
  updateLastSeen(userId: string, deviceId: string): boolean {
    const devices = this.trustedDevices.get(userId) || [];
    const device = devices.find(d => d.deviceId === deviceId);

    if (!device) return false;

    device.lastSeenAt = Date.now();

    return true;
  }

  /**
   * Get security score
   */
  getSecurityScore(userId: string): number {
    let score = 100;

    // Deduct for failed logins
    const failedAttempts = this.getFailedLoginAttempts(userId);
    score -= failedAttempts * 5;

    // Deduct for fraud alerts
    const fraudAlerts = this.getFraudAlerts(userId, false);
    score -= fraudAlerts.length * 10;

    // Bonus for trusted devices
    const trustedDevices = this.getTrustedDevices(userId);
    score += trustedDevices.length * 5;

    return Math.max(0, Math.min(100, score));
  }
}

export const advancedSecurityService = new AdvancedSecurityService();
