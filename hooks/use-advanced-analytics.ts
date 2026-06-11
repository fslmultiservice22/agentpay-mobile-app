import { useState, useCallback } from 'react';

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit: string;
  trend: number; // percentage change
  timestamp: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
  averageOrderValue: number;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnRate: number;
  retentionRate: number;
  lifetimeValue: number;
}

export interface FeatureAnalytics {
  featureName: string;
  usageCount: number;
  uniqueUsers: number;
  adoptionRate: number;
  averageSessionTime: number;
}

export interface ConversionFunnel {
  step: string;
  users: number;
  conversionRate: number;
}

export interface AnalyticsReport {
  period: string;
  revenue: RevenueData[];
  userMetrics: UserMetrics;
  topFeatures: FeatureAnalytics[];
  conversionFunnel: ConversionFunnel[];
  metrics: AnalyticsMetric[];
  generatedAt: number;
}

export function useAdvancedAnalytics() {
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<Map<string, AnalyticsMetric>>(new Map());

  // Generate analytics report
  const generateReport = useCallback(
    async (period: string = 'monthly'): Promise<AnalyticsReport | null> => {
      try {
        const report: AnalyticsReport = {
          period,
          revenue: generateRevenueData(30),
          userMetrics: generateUserMetrics(),
          topFeatures: generateTopFeatures(),
          conversionFunnel: generateConversionFunnel(),
          metrics: generateMetrics(),
          generatedAt: Date.now(),
        };

        setReports((prev) => [...prev, report]);
        return report;
      } catch (error) {
        console.error('Failed to generate analytics report:', error);
        return null;
      }
    },
    []
  );

  // Get revenue metrics
  const getRevenueMetrics = useCallback(() => {
    const latestReport = reports[reports.length - 1];
    if (!latestReport) return null;

    const totalRevenue = latestReport.revenue.reduce((sum, d) => sum + d.revenue, 0);
    const totalTransactions = latestReport.revenue.reduce((sum, d) => sum + d.transactions, 0);
    const averageOrderValue =
      totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return {
      totalRevenue,
      totalTransactions,
      averageOrderValue,
      trend: calculateTrend(latestReport.revenue),
    };
  }, [reports]);

  // Get user acquisition metrics
  const getUserAcquisitionMetrics = useCallback(() => {
    const latestReport = reports[reports.length - 1];
    if (!latestReport) return null;

    return {
      totalUsers: latestReport.userMetrics.totalUsers,
      newUsers: latestReport.userMetrics.newUsers,
      activeUsers: latestReport.userMetrics.activeUsers,
      userGrowthRate:
        latestReport.userMetrics.totalUsers > 0
          ? (latestReport.userMetrics.newUsers / latestReport.userMetrics.totalUsers) * 100
          : 0,
    };
  }, [reports]);

  // Get feature adoption metrics
  const getFeatureAdoptionMetrics = useCallback(() => {
    const latestReport = reports[reports.length - 1];
    if (!latestReport) return null;

    return latestReport.topFeatures.sort((a, b) => b.adoptionRate - a.adoptionRate);
  }, [reports]);

  // Get conversion funnel
  const getConversionFunnel = useCallback(() => {
    const latestReport = reports[reports.length - 1];
    if (!latestReport) return null;

    return latestReport.conversionFunnel;
  }, [reports]);

  // Get cohort analysis
  const getCohortAnalysis = useCallback(
    (cohortSize: number = 7) => {
      const cohorts: Record<string, { users: number; retention: number[] }> = {};

      reports.forEach((report) => {
        const cohortKey = report.period;
        if (!cohorts[cohortKey]) {
          cohorts[cohortKey] = {
            users: report.userMetrics.newUsers,
            retention: [],
          };
        }

        cohorts[cohortKey].retention.push(report.userMetrics.retentionRate);
      });

      return cohorts;
    },
    [reports]
  );

  // Track real-time metric
  const trackRealTimeMetric = useCallback(
    (name: string, value: number, unit: string = '') => {
      const metric: AnalyticsMetric = {
        name,
        value,
        unit,
        trend: 0,
        timestamp: Date.now(),
      };

      setRealTimeMetrics((prev) => new Map([...prev, [name, metric]]));
    },
    []
  );

  // Get real-time metrics
  const getRealTimeMetrics = useCallback(() => {
    return Array.from(realTimeMetrics.values());
  }, [realTimeMetrics]);

  // Export report as CSV
  const exportReportAsCSV = useCallback(
    (reportIndex: number = -1): string | null => {
      try {
        const report = reports[reportIndex === -1 ? reports.length - 1 : reportIndex];
        if (!report) return null;

        const csv = [
          ['Analytics Report', report.period, new Date(report.generatedAt).toISOString()],
          [],
          ['Revenue Metrics'],
          ['Date', 'Revenue', 'Transactions', 'AOV'].join(','),
          ...report.revenue.map((r) => [r.date, r.revenue, r.transactions, r.averageOrderValue].join(',')),
          [],
          ['User Metrics'],
          ['Total Users', 'Active Users', 'New Users', 'Churn Rate', 'Retention Rate', 'LTV'].join(','),
          [
            report.userMetrics.totalUsers,
            report.userMetrics.activeUsers,
            report.userMetrics.newUsers,
            report.userMetrics.churnRate,
            report.userMetrics.retentionRate,
            report.userMetrics.lifetimeValue,
          ].join(','),
          [],
          ['Top Features'],
          ['Feature', 'Usage Count', 'Unique Users', 'Adoption Rate', 'Avg Session Time'].join(','),
          ...report.topFeatures.map((f) =>
            [f.featureName, f.usageCount, f.uniqueUsers, f.adoptionRate, f.averageSessionTime].join(',')
          ),
        ].join('\n');

        return csv;
      } catch (error) {
        console.error('Failed to export report:', error);
        return null;
      }
    },
    [reports]
  );

  return {
    reports,
    realTimeMetrics: Array.from(realTimeMetrics.values()),
    generateReport,
    getRevenueMetrics,
    getUserAcquisitionMetrics,
    getFeatureAdoptionMetrics,
    getConversionFunnel,
    getCohortAnalysis,
    trackRealTimeMetric,
    getRealTimeMetrics,
    exportReportAsCSV,
  };
}

// Helper functions
function generateRevenueData(days: number): RevenueData[] {
  const data: RevenueData[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      revenue: Math.random() * 10000 + 5000,
      transactions: Math.floor(Math.random() * 100 + 50),
      averageOrderValue: Math.random() * 500 + 100,
    });
  }

  return data;
}

function generateUserMetrics(): UserMetrics {
  return {
    totalUsers: Math.floor(Math.random() * 50000 + 10000),
    activeUsers: Math.floor(Math.random() * 30000 + 5000),
    newUsers: Math.floor(Math.random() * 5000 + 500),
    churnRate: Math.random() * 10 + 2,
    retentionRate: Math.random() * 40 + 60,
    lifetimeValue: Math.random() * 5000 + 1000,
  };
}

function generateTopFeatures(): FeatureAnalytics[] {
  const features = [
    'Token Swap',
    'Staking',
    'Portfolio Dashboard',
    'Price Alerts',
    'DAO Voting',
    'NFT Gallery',
  ];

  return features.map((name) => ({
    featureName: name,
    usageCount: Math.floor(Math.random() * 10000 + 1000),
    uniqueUsers: Math.floor(Math.random() * 5000 + 500),
    adoptionRate: Math.random() * 80 + 20,
    averageSessionTime: Math.random() * 600 + 60,
  }));
}

function generateConversionFunnel(): ConversionFunnel[] {
  const steps = [
    { step: 'App Install', users: 100000 },
    { step: 'Wallet Connect', users: 75000 },
    { step: 'First Transaction', users: 45000 },
    { step: 'Second Transaction', users: 25000 },
    { step: 'Premium Features', users: 10000 },
  ];

  return steps.map((step) => ({
    step: step.step,
    users: step.users,
    conversionRate: (step.users / 100000) * 100,
  }));
}

function generateMetrics(): AnalyticsMetric[] {
  return [
    {
      name: 'Daily Active Users',
      value: Math.floor(Math.random() * 50000 + 10000),
      unit: 'users',
      trend: Math.random() * 20 - 10,
      timestamp: Date.now(),
    },
    {
      name: 'Transaction Volume',
      value: Math.random() * 1000000 + 500000,
      unit: 'USD',
      trend: Math.random() * 30 - 10,
      timestamp: Date.now(),
    },
    {
      name: 'Average Session Duration',
      value: Math.random() * 600 + 300,
      unit: 'seconds',
      trend: Math.random() * 15 - 5,
      timestamp: Date.now(),
    },
  ];
}

function calculateTrend(data: RevenueData[]): number {
  if (data.length < 2) return 0;

  const recent = data.slice(-7).reduce((sum, d) => sum + d.revenue, 0) / 7;
  const previous = data.slice(-14, -7).reduce((sum, d) => sum + d.revenue, 0) / 7;

  return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
}
