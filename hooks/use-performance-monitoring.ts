import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  apiResponseTime: number;
  bundleSize: number;
  loadTime: number;
}

export interface PerformanceAlert {
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

export function usePerformanceMonitoring() {
  const metricsRef = useRef<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    cpuUsage: 0,
    networkLatency: 0,
    apiResponseTime: 0,
    bundleSize: 0,
    loadTime: 0,
  });

  const alertsRef = useRef<PerformanceAlert[]>([]);

  const thresholds = useMemo(() => ({
    fps: 30,
    memoryUsage: 500, // MB
    cpuUsage: 80, // %
    networkLatency: 500, // ms
    apiResponseTime: 2000, // ms
    bundleSize: 5, // MB
    loadTime: 3000, // ms
  }), []);

  const checkThresholds = useCallback(() => {
    const newAlerts: PerformanceAlert[] = [];

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      const value = metricsRef.current[metric as keyof PerformanceMetrics];
      if (value > threshold) {
        newAlerts.push({
          metric: metric as keyof PerformanceMetrics,
          value,
          threshold,
          severity: value > threshold * 1.5 ? 'critical' : 'warning',
        });
      }
    });

    alertsRef.current = newAlerts;
  }, [thresholds]);

  useEffect(() => {
    // Monitor FPS
    let frameCount = 0;
    let lastTime = Date.now();

    const measureFPS = () => {
      frameCount++;
      const now = Date.now();
      if (now - lastTime >= 1000) {
        metricsRef.current.fps = frameCount;
        frameCount = 0;
        lastTime = now;
        checkThresholds();
      }
      requestAnimationFrame(measureFPS);
    };

    if (Platform.OS !== 'web') {
      requestAnimationFrame(measureFPS);
    }

    // Monitor memory usage (native only)
    const memoryInterval = setInterval(() => {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Simulated memory usage
        metricsRef.current.memoryUsage = Math.random() * 600;
      }
    }, 5000);

    return () => {
      clearInterval(memoryInterval);
    };
  }, [checkThresholds]);

  const getMetrics = (): PerformanceMetrics => metricsRef.current;

  const getAlerts = (): PerformanceAlert[] => alertsRef.current;

  const recordAPICall = (duration: number) => {
    metricsRef.current.apiResponseTime = duration;
    checkThresholds();
  };

  const recordNetworkLatency = (latency: number) => {
    metricsRef.current.networkLatency = latency;
    checkThresholds();
  };

  const exportMetrics = (): string => {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        metrics: metricsRef.current,
        alerts: alertsRef.current,
      },
      null,
      2
    );
  };

  return {
    getMetrics,
    getAlerts,
    recordAPICall,
    recordNetworkLatency,
    exportMetrics,
  };
}
