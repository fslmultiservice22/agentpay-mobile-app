import { useCallback, useRef } from 'react';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  expectedResult: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration: number;
  error?: string;
}

export interface TestStep {
  action: string;
  target: string;
  value?: string;
  expectedResult?: string;
}

export interface TestSuite {
  id: string;
  name: string;
  tests: TestCase[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  coverage: number;
  duration: number;
}

export function useAutomatedTesting() {
  const testSuitesRef = useRef<Map<string, TestSuite>>(new Map());
  const testResultsRef = useRef<TestCase[]>([]);

  const createTestSuite = useCallback(
    (name: string): TestSuite => {
      const suite: TestSuite = {
        id: `suite-${Date.now()}`,
        name,
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        coverage: 0,
        duration: 0,
      };
      testSuitesRef.current.set(suite.id, suite);
      return suite;
    },
    []
  );

  const addTestCase = useCallback(
    (suiteId: string, testCase: Omit<TestCase, 'status' | 'duration' | 'error'>): TestCase => {
      const suite = testSuitesRef.current.get(suiteId);
      if (!suite) throw new Error(`Suite ${suiteId} not found`);

      const test: TestCase = {
        ...testCase,
        status: 'pending',
        duration: 0,
      };

      suite.tests.push(test);
      suite.totalTests++;
      return test;
    },
    []
  );

  const runTest = useCallback(async (suiteId: string, testId: string): Promise<TestCase> => {
    const suite = testSuitesRef.current.get(suiteId);
    if (!suite) throw new Error(`Suite ${suiteId} not found`);

    const test = suite.tests.find((t) => t.id === testId);
    if (!test) throw new Error(`Test ${testId} not found`);

    test.status = 'running';
    const startTime = Date.now();

    try {
      // Simulate test execution
      for (const step of test.steps) {
        // Execute each step
        await simulateStep(step);
      }

      test.status = 'passed';
      suite.passedTests++;
    } catch (error) {
      test.status = 'failed';
      test.error = error instanceof Error ? error.message : 'Unknown error';
      suite.failedTests++;
    }

    test.duration = Date.now() - startTime;
    testResultsRef.current.push(test);
    return test;
  }, []);

  const runTestSuite = useCallback(async (suiteId: string): Promise<TestSuite> => {
    const suite = testSuitesRef.current.get(suiteId);
    if (!suite) throw new Error(`Suite ${suiteId} not found`);

    const startTime = Date.now();

    for (const test of suite.tests) {
      await runTest(suiteId, test.id);
    }

    suite.duration = Date.now() - startTime;
    suite.coverage = suite.totalTests > 0 ? (suite.passedTests / suite.totalTests) * 100 : 0;

    return suite;
  }, [runTest]);

  const simulateStep = async (step: TestStep): Promise<void> => {
    // Simulate step execution with random success/failure
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const success = Math.random() > 0.1; // 90% success rate
        if (success) {
          resolve();
        } else {
          reject(new Error(`Step failed: ${step.action} on ${step.target}`));
        }
      }, Math.random() * 500);
    });
  };

  const getTestResults = (): TestCase[] => testResultsRef.current;

  const getTestSuite = (suiteId: string): TestSuite | undefined => testSuitesRef.current.get(suiteId);

  const getAllTestSuites = (): TestSuite[] => Array.from(testSuitesRef.current.values());

  const generateReport = (): string => {
    const suites = getAllTestSuites();
    const totalTests = suites.reduce((sum, s) => sum + s.totalTests, 0);
    const totalPassed = suites.reduce((sum, s) => sum + s.passedTests, 0);
    const totalFailed = suites.reduce((sum, s) => sum + s.failedTests, 0);
    const overallCoverage = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;

    return `
Test Report
===========
Generated: ${new Date().toISOString()}

Summary:
- Total Test Suites: ${suites.length}
- Total Tests: ${totalTests}
- Passed: ${totalPassed}
- Failed: ${totalFailed}
- Overall Coverage: ${overallCoverage.toFixed(2)}%

Test Suites:
${suites
  .map(
    (s) => `
  Suite: ${s.name}
  - Tests: ${s.totalTests}
  - Passed: ${s.passedTests}
  - Failed: ${s.failedTests}
  - Coverage: ${s.coverage.toFixed(2)}%
  - Duration: ${s.duration}ms
`
  )
  .join('\n')}

Failed Tests:
${testResultsRef.current
  .filter((t) => t.status === 'failed')
  .map((t) => `  - ${t.name}: ${t.error}`)
  .join('\n')}
    `;
  };

  return {
    createTestSuite,
    addTestCase,
    runTest,
    runTestSuite,
    getTestResults,
    getTestSuite,
    getAllTestSuites,
    generateReport,
  };
}
