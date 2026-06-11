import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Variant {
  id: string;
  name: string;
  config: Record<string, any>;
  weight: number; // percentage 0-100
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  variants: Variant[];
  startDate: number;
  endDate: number;
  active: boolean;
  metrics: {
    impressions: number;
    conversions: number;
    conversionRate: number;
    revenue?: number;
  };
}

export interface UserVariantAssignment {
  userId: string;
  testId: string;
  variantId: string;
  assignedAt: number;
}

export function useABTesting() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [assignments, setAssignments] = useState<UserVariantAssignment[]>([]);
  const [userVariants, setUserVariants] = useState<Record<string, string>>({});

  // Load tests from storage
  const loadTests = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('agentpay_ab_tests');
      if (stored) {
        setTests(JSON.parse(stored));
      }
      const storedAssignments = await AsyncStorage.getItem('agentpay_ab_assignments');
      if (storedAssignments) {
        const parsed = JSON.parse(storedAssignments);
        setAssignments(parsed);
        // Build user variants map
        const map: Record<string, string> = {};
        parsed.forEach((a: UserVariantAssignment) => {
          map[`${a.userId}_${a.testId}`] = a.variantId;
        });
        setUserVariants(map);
      }
    } catch (error) {
      console.error('Failed to load AB tests:', error);
    }
  }, []);

  // Create test
  const createTest = useCallback(
    async (
      name: string,
      description: string,
      variants: Variant[],
      startDate: number,
      endDate: number
    ) => {
      try {
        const test: ABTest = {
          id: `test_${Date.now()}`,
          name,
          description,
          variants,
          startDate,
          endDate,
          active: true,
          metrics: {
            impressions: 0,
            conversions: 0,
            conversionRate: 0,
          },
        };

        const updated = [...tests, test];
        setTests(updated);
        await AsyncStorage.setItem('agentpay_ab_tests', JSON.stringify(updated));
        return test;
      } catch (error) {
        console.error('Failed to create test:', error);
        return null;
      }
    },
    [tests]
  );

  // Assign variant to user
  const assignVariant = useCallback(
    async (userId: string, testId: string): Promise<string | null> => {
      try {
        const key = `${userId}_${testId}`;

        // Check if already assigned
        if (userVariants[key]) {
          return userVariants[key];
        }

        // Find test
        const test = tests.find((t) => t.id === testId);
        if (!test) return null;

        // Weighted random selection
        const rand = Math.random() * 100;
        let cumulative = 0;
        let selectedVariant: Variant | null = null;

        for (const variant of test.variants) {
          cumulative += variant.weight;
          if (rand <= cumulative) {
            selectedVariant = variant;
            break;
          }
        }

        if (!selectedVariant) {
          selectedVariant = test.variants[0];
        }

        // Save assignment
        const assignment: UserVariantAssignment = {
          userId,
          testId,
          variantId: selectedVariant.id,
          assignedAt: Date.now(),
        };

        const updated = [...assignments, assignment];
        setAssignments(updated);
        await AsyncStorage.setItem('agentpay_ab_assignments', JSON.stringify(updated));

        const newMap = { ...userVariants, [key]: selectedVariant.id };
        setUserVariants(newMap);

        return selectedVariant.id;
      } catch (error) {
        console.error('Failed to assign variant:', error);
        return null;
      }
    },
    [tests, assignments, userVariants]
  );

  // Get user variant
  const getUserVariant = useCallback(
    (userId: string, testId: string): Variant | null => {
      const key = `${userId}_${testId}`;
      const variantId = userVariants[key];

      if (!variantId) return null;

      const test = tests.find((t) => t.id === testId);
      if (!test) return null;

      return test.variants.find((v) => v.id === variantId) || null;
    },
    [tests, userVariants]
  );

  // Track impression
  const trackImpression = useCallback(
    async (testId: string) => {
      try {
        const updated = tests.map((t) =>
          t.id === testId
            ? {
                ...t,
                metrics: {
                  ...t.metrics,
                  impressions: t.metrics.impressions + 1,
                },
              }
            : t
        );
        setTests(updated);
        await AsyncStorage.setItem('agentpay_ab_tests', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to track impression:', error);
      }
    },
    [tests]
  );

  // Track conversion
  const trackConversion = useCallback(
    async (testId: string, revenue?: number) => {
      try {
        const updated = tests.map((t) => {
          if (t.id === testId) {
            const conversions = t.metrics.conversions + 1;
            const conversionRate = (conversions / t.metrics.impressions) * 100;
            return {
              ...t,
              metrics: {
                ...t.metrics,
                conversions,
                conversionRate,
                revenue: (t.metrics.revenue || 0) + (revenue || 0),
              },
            };
          }
          return t;
        });
        setTests(updated);
        await AsyncStorage.setItem('agentpay_ab_tests', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to track conversion:', error);
      }
    },
    [tests]
  );

  // Get test results
  const getTestResults = useCallback(
    (testId: string) => {
      const test = tests.find((t) => t.id === testId);
      if (!test) return null;

      return {
        test,
        variants: test.variants.map((v) => {
          const variantAssignments = assignments.filter(
            (a) => a.testId === testId && a.variantId === v.id
          );
          return {
            ...v,
            assignedUsers: variantAssignments.length,
          };
        }),
        totalAssignments: assignments.filter((a) => a.testId === testId).length,
      };
    },
    [tests, assignments]
  );

  // End test
  const endTest = useCallback(
    async (testId: string) => {
      try {
        const updated = tests.map((t) =>
          t.id === testId ? { ...t, active: false } : t
        );
        setTests(updated);
        await AsyncStorage.setItem('agentpay_ab_tests', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to end test:', error);
      }
    },
    [tests]
  );

  // Get active tests
  const getActiveTests = useCallback(() => {
    const now = Date.now();
    return tests.filter((t) => t.active && t.startDate <= now && t.endDate > now);
  }, [tests]);

  // Initialize on mount
  useEffect(() => {
    loadTests();
  }, [loadTests]);

  return {
    tests,
    assignments,
    userVariants,
    createTest,
    assignVariant,
    getUserVariant,
    trackImpression,
    trackConversion,
    getTestResults,
    endTest,
    getActiveTests,
    loadTests,
  };
}
