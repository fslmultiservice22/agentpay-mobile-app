import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnalyticsMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  retentionRate: number; // percentage
  churnRate: number; // percentage
  averageSessionDuration: number; // in seconds
  featureUsage: Record<string, number>; // feature name -> usage count
  userJourneys: Array<{
    path: string[];
    count: number;
    conversionRate: number;
  }>;
  crashRate: number; // percentage
  errorRate: number; // percentage
}

export interface AnalyticsEvent {
  id: string;
  timestamp: number;
  eventType: string;
  userId?: string;
  metadata: Record<string, any>;
}

export function useAnalyticsScreen() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    retentionRate: 0,
    churnRate: 0,
    averageSessionDuration: 0,
    featureUsage: {},
    userJourneys: [],
    crashRate: 0,
    errorRate: 0,
  });

  const [events, setEvents] = useState<AnalyticsEvent[]>([]);

  // Calculate metrics from events
  const calculateMetrics = useCallback((eventList: AnalyticsEvent[]) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Count unique users
    const dailyUsers = new Set(
      eventList.filter((e) => e.timestamp > oneDayAgo).map((e) => e.userId)
    ).size;
    const weeklyUsers = new Set(
      eventList.filter((e) => e.timestamp > oneWeekAgo).map((e) => e.userId)
    ).size;
    const monthlyUsers = new Set(
      eventList.filter((e) => e.timestamp > oneMonthAgo).map((e) => e.userId)
    ).size;

    // Feature usage
    const featureUsage: Record<string, number> = {};
    eventList.forEach((event) => {
      if (event.eventType === 'feature_used') {
        const feature = event.metadata.feature || 'unknown';
        featureUsage[feature] = (featureUsage[feature] || 0) + 1;
      }
    });

    // Calculate retention (simplified)
    const retentionRate = monthlyUsers > 0 ? (weeklyUsers / monthlyUsers) * 100 : 0;
    const churnRate = 100 - retentionRate;

    // Average session duration
    const sessionEvents = eventList.filter((e) => e.eventType === 'session');
    const avgSessionDuration =
      sessionEvents.length > 0
        ? sessionEvents.reduce((sum, e) => sum + (e.metadata.duration || 0), 0) /
          sessionEvents.length
        : 0;

    // Crash and error rates
    const crashEvents = eventList.filter((e) => e.eventType === 'crash');
    const errorEvents = eventList.filter((e) => e.eventType === 'error');
    const crashRate = eventList.length > 0 ? (crashEvents.length / eventList.length) * 100 : 0;
    const errorRate = eventList.length > 0 ? (errorEvents.length / eventList.length) * 100 : 0;

    setMetrics({
      dailyActiveUsers: dailyUsers,
      weeklyActiveUsers: weeklyUsers,
      monthlyActiveUsers: monthlyUsers,
      retentionRate: Math.round(retentionRate * 100) / 100,
      churnRate: Math.round(churnRate * 100) / 100,
      averageSessionDuration: Math.round(avgSessionDuration),
      featureUsage,
      userJourneys: [],
      crashRate: Math.round(crashRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
    });
  }, []);

  // Load analytics from storage
  const loadAnalytics = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_analytics_events');
      if (stored) {
        const loadedEvents = JSON.parse(stored);
        setEvents(loadedEvents);
        calculateMetrics(loadedEvents);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  }, [calculateMetrics]);

  // Track event
  const trackEvent = useCallback(
    async (eventType: string, userId?: string, metadata?: Record<string, any>) => {
      try {
        const event: AnalyticsEvent = {
          id: `event_${Date.now()}_${Math.random()}`,
          timestamp: Date.now(),
          eventType,
          userId,
          metadata: metadata || {},
        };

        const updated = [...events, event];
        setEvents(updated);
        await AsyncStorage.setItem('agentpay_analytics_events', JSON.stringify(updated));
        calculateMetrics(updated);
      } catch (error) {
        console.error('Failed to track event:', error);
      }
    },
    [events, calculateMetrics]
  );

  // Get feature usage stats
  const getFeatureUsageStats = useCallback(() => {
    const sorted = Object.entries(metrics.featureUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    return sorted;
  }, [metrics.featureUsage]);

  // Get top user journeys
  const getTopUserJourneys = useCallback(() => {
    return metrics.userJourneys.slice(0, 5);
  }, [metrics.userJourneys]);

  // Export analytics report
  const exportAnalyticsReport = useCallback(async () => {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        metrics,
        totalEvents: events.length,
        events: events.slice(-100), // Last 100 events
      };
      return JSON.stringify(report, null, 2);
    } catch (error) {
      console.error('Failed to export analytics report:', error);
      return null;
    }
  }, [metrics, events]);

  // Initialize on mount
  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  return {
    metrics,
    events,
    trackEvent,
    getFeatureUsageStats,
    getTopUserJourneys,
    exportAnalyticsReport,
    loadAnalytics,
  };
}
