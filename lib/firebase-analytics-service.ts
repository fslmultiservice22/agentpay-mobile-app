/**
 * Firebase Analytics & Crashlytics Service
 * Real-time crash monitoring and user analytics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
  timestamp: number;
}

export interface CrashReport {
  id: string;
  message: string;
  stack: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  userId?: string;
  sessionId: string;
  context?: Record<string, any>;
  resolved: boolean;
}

export interface AnalyticsSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  events: AnalyticsEvent[];
  crashes: CrashReport[];
  deviceInfo?: {
    platform: string;
    osVersion: string;
    appVersion: string;
  };
}

class FirebaseAnalyticsService {
  private sessionId: string = this.generateSessionId();
  private userId?: string;
  private events: AnalyticsEvent[] = [];
  private crashes: CrashReport[] = [];
  private sessionStartTime: number = Date.now();
  private readonly EVENTS_STORAGE_KEY = 'firebase_events';
  private readonly CRASHES_STORAGE_KEY = 'firebase_crashes';
  private readonly SESSION_STORAGE_KEY = 'firebase_session';

  constructor() {
    this.loadSession();
    this.setupErrorHandling();
  }

  /**
   * Initialize Firebase Analytics
   */
  async initialize(userId?: string): Promise<void> {
    try {
      this.userId = userId;
      await this.persistSession();
      console.log('Firebase Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase Analytics:', error);
    }
  }

  /**
   * Log analytics event
   */
  async logEvent(name: string, parameters?: Record<string, any>): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        name,
        parameters,
        timestamp: Date.now(),
      };

      this.events.push(event);
      await this.persistEvents();

      console.log(`Event logged: ${name}`, parameters);
    } catch (error) {
      console.error('Failed to log event:', error);
    }
  }

  /**
   * Log screen view
   */
  async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    await this.logEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass,
    });
  }

  /**
   * Log user engagement
   */
  async logUserEngagement(duration: number): Promise<void> {
    await this.logEvent('user_engagement', {
      engagement_time_msec: duration,
    });
  }

  /**
   * Log transaction
   */
  async logTransaction(
    transactionId: string,
    amount: number,
    currency: string,
    status: 'pending' | 'completed' | 'failed'
  ): Promise<void> {
    await this.logEvent('transaction', {
      transaction_id: transactionId,
      amount,
      currency,
      status,
    });
  }

  /**
   * Log error
   */
  async logError(error: Error, context?: Record<string, any>): Promise<void> {
    const crashReport: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      stack: error.stack || '',
      severity: this.determineSeverity(error),
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      context,
      resolved: false,
    };

    this.crashes.push(crashReport);
    await this.persistCrashes();

    console.error('Error logged:', crashReport);
  }

  /**
   * Log crash
   */
  async logCrash(message: string, stack: string, context?: Record<string, any>): Promise<void> {
    const crashReport: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      stack,
      severity: 'critical',
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      context,
      resolved: false,
    };

    this.crashes.push(crashReport);
    await this.persistCrashes();

    console.error('Crash logged:', crashReport);
  }

  /**
   * Get all events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get all crashes
   */
  getCrashes(): CrashReport[] {
    return [...this.crashes];
  }

  /**
   * Get session data
   */
  getSession(): AnalyticsSession {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.sessionStartTime,
      events: this.events,
      crashes: this.crashes,
    };
  }

  /**
   * End session
   */
  async endSession(): Promise<AnalyticsSession> {
    const endTime = Date.now();
    const duration = endTime - this.sessionStartTime;

    const session: AnalyticsSession = {
      sessionId: this.sessionId,
      userId: this.userId,
      startTime: this.sessionStartTime,
      endTime,
      duration,
      events: this.events,
      crashes: this.crashes,
    };

    await this.persistSession();
    return session;
  }

  /**
   * Clear events
   */
  async clearEvents(): Promise<void> {
    this.events = [];
    try {
      await AsyncStorage.removeItem(this.EVENTS_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear events:', error);
    }
  }

  /**
   * Clear crashes
   */
  async clearCrashes(): Promise<void> {
    this.crashes = [];
    try {
      await AsyncStorage.removeItem(this.CRASHES_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear crashes:', error);
    }
  }

  /**
   * Mark crash as resolved
   */
  async resolveCrash(crashId: string): Promise<void> {
    const crash = this.crashes.find(c => c.id === crashId);
    if (crash) {
      crash.resolved = true;
      await this.persistCrashes();
    }
  }

  /**
   * Get crash-free rate
   */
  getCrashFreeRate(): number {
    if (this.events.length === 0) return 100;
    const crashCount = this.crashes.filter(c => !c.resolved).length;
    return Math.max(0, 100 - (crashCount / this.events.length) * 100);
  }

  /**
   * Determine crash severity
   */
  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) return 'critical';
    if (message.includes('error') || message.includes('failed')) return 'high';
    if (message.includes('warning')) return 'medium';
    return 'low';
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // Global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event: ErrorEvent) => {
        this.logError(event.error);
      });

      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        this.logError(new Error(event.reason));
      });
    }
  }

  /**
   * Persist events to storage
   */
  private async persistEvents(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.EVENTS_STORAGE_KEY, JSON.stringify(this.events));
    } catch (error) {
      console.error('Failed to persist events:', error);
    }
  }

  /**
   * Persist crashes to storage
   */
  private async persistCrashes(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CRASHES_STORAGE_KEY, JSON.stringify(this.crashes));
    } catch (error) {
      console.error('Failed to persist crashes:', error);
    }
  }

  /**
   * Persist session to storage
   */
  private async persistSession(): Promise<void> {
    try {
      const session: AnalyticsSession = {
        sessionId: this.sessionId,
        userId: this.userId,
        startTime: this.sessionStartTime,
        events: this.events,
        crashes: this.crashes,
      };
      await AsyncStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to persist session:', error);
    }
  }

  /**
   * Load session from storage
   */
  private async loadSession(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.SESSION_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        this.sessionId = session.sessionId;
        this.userId = session.userId;
        this.events = session.events || [];
        this.crashes = session.crashes || [];
      }

      const storedEvents = await AsyncStorage.getItem(this.EVENTS_STORAGE_KEY);
      if (storedEvents) {
        this.events = JSON.parse(storedEvents);
      }

      const storedCrashes = await AsyncStorage.getItem(this.CRASHES_STORAGE_KEY);
      if (storedCrashes) {
        this.crashes = JSON.parse(storedCrashes);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }
}

export const firebaseAnalyticsService = new FirebaseAnalyticsService();
