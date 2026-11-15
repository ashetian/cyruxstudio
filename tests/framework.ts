/**
 * cyrux studio - Zero-Dependency Autonomous E2E Test Framework
 *
 * Provides a Jest/Vitest-compatible API (describe, it, expect, beforeAll, afterAll)
 * with robust ANSI color reporting, duration timers, error formatting, and tier organization.
 */

export interface TestResult {
  name: string;
  suite: string;
  tier: number;
  featureId?: number;
  durationMs: number;
  passed: boolean;
  error?: Error;
}

export interface SuiteResult {
  name: string;
  tier: number;
  featureId?: number;
  tests: TestResult[];
  passed: boolean;
  durationMs: number;
}

export interface RunnerSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  suites: SuiteResult[];
}

type TestFn = () => void | Promise<void>;
type HookFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
}

interface TestSuite {
  name: string;
  tier: number;
  featureId?: number;
  beforeAllHooks: HookFn[];
  afterAllHooks: HookFn[];
  tests: TestCase[];
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

export function describe(name: string, fn: () => void, metadata?: { tier?: number; featureId?: number }) {
  const suite: TestSuite = {
    name,
    tier: metadata?.tier ?? (currentSuite?.tier ?? 1),
    featureId: metadata?.featureId ?? currentSuite?.featureId,
    beforeAllHooks: [],
    afterAllHooks: [],
    tests: [],
  };

  const parent = currentSuite;
  currentSuite = suite;
  suites.push(suite);

  try {
    fn();
  } finally {
    currentSuite = parent;
  }
}

export function it(name: string, fn: TestFn) {
  if (!currentSuite) {
    throw new Error(`Test "${name}" must be placed inside a describe block`);
  }
  currentSuite.tests.push({ name, fn });
}

export const test = it;

export function beforeAll(fn: HookFn) {
  if (!currentSuite) throw new Error("beforeAll must be inside describe");
  currentSuite.beforeAllHooks.push(fn);
}

export function afterAll(fn: HookFn) {
  if (!currentSuite) throw new Error("afterAll must be inside describe");
  currentSuite.afterAllHooks.push(fn);
}

// Custom Matcher / Expectation Engine
class Expectation<T = any> {
  private isNot: boolean;

  constructor(private actual: T, isNot = false) {
    this.isNot = isNot;
  }

  get not(): Expectation<T> {
    return new Expectation(this.actual, !this.isNot);
  }

  private assert(condition: boolean, message: string, expected?: any) {
    const passed = this.isNot ? !condition : condition;
    if (!passed) {
      const err = new Error(
        this.isNot
          ? `Expected NOT ${message}. Actual: ${this.formatVal(this.actual)}`
          : `Expected ${message}. Actual: ${this.formatVal(this.actual)}, Expected: ${this.formatVal(expected)}`
      );
      Error.captureStackTrace(err, this.assert);
      throw err;
    }
  }

  private formatVal(val: any): string {
    if (typeof val === 'string') return `"${val}"`;
    if (typeof val === 'object' && val !== null) {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  toBe(expected: any) {
    this.assert(Object.is(this.actual, expected), `to be identical`, expected);
  }

  toEqual(expected: any) {
    this.assert(this.deepEqual(this.actual, expected), `to deeply equal`, expected);
  }

  toBeTruthy() {
    this.assert(Boolean(this.actual), `to be truthy`);
  }

  toBeFalsy() {
    this.assert(!this.actual, `to be falsy`);
  }

  toBeNull() {
    this.assert(this.actual === null, `to be null`);
  }

  toBeUndefined() {
    this.assert(this.actual === undefined, `to be undefined`);
  }

  toBeDefined() {
    this.assert(this.actual !== undefined, `to be defined`);
  }

  toBeGreaterThan(expected: number) {
    this.assert(typeof this.actual === 'number' && this.actual > expected, `to be greater than ${expected}`, expected);
  }

  toBeGreaterThanOrEqual(expected: number) {
    this.assert(typeof this.actual === 'number' && this.actual >= expected, `to be >= ${expected}`, expected);
  }

  toBeLessThan(expected: number) {
    this.assert(typeof this.actual === 'number' && this.actual < expected, `to be less than ${expected}`, expected);
  }

  toBeLessThanOrEqual(expected: number) {
    this.assert(typeof this.actual === 'number' && this.actual <= expected, `to be <= ${expected}`, expected);
  }

  toContain(item: any) {
    if (typeof this.actual === 'string') {
      this.assert(this.actual.includes(item), `to contain substring "${item}"`, item);
    } else if (Array.isArray(this.actual)) {
      this.assert(this.actual.includes(item), `to contain element`, item);
    } else if (this.actual instanceof Set) {
      this.assert(this.actual.has(item), `set to contain item`, item);
    } else {
      this.assert(false, `toContain target must be string, array or set`);
    }
  }

  toMatch(pattern: RegExp | string) {
    const reg = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    this.assert(typeof this.actual === 'string' && reg.test(this.actual), `to match regex ${reg}`);
  }

  toHaveLength(length: number) {
    const actualLen = (this.actual as any)?.length;
    this.assert(actualLen === length, `to have length ${length}, found ${actualLen}`, length);
  }

  toHaveProperty(prop: string, value?: any) {
    const hasProp = this.actual !== null && typeof this.actual === 'object' && prop in this.actual;
    if (value !== undefined) {
      this.assert(hasProp && this.deepEqual(this.actual[prop], value), `to have property "${prop}" equal to`, value);
    } else {
      this.assert(hasProp, `to have property "${prop}"`);
    }
  }

  toThrow(expectedError?: string | RegExp | ErrorConstructor) {
    let thrownError: any = null;
    let didThrow = false;

    if (typeof this.actual !== 'function') {
      throw new Error("toThrow target must be a function");
    }

    try {
      this.actual();
    } catch (err) {
      didThrow = true;
      thrownError = err;
    }

    if (!didThrow) {
      this.assert(false, `function to throw an error`);
      return;
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        this.assert(
          thrownError?.message?.includes(expectedError),
          `error message to contain "${expectedError}"`,
          thrownError?.message
        );
      } else if (expectedError instanceof RegExp) {
        this.assert(
          expectedError.test(thrownError?.message || ''),
          `error message to match regex ${expectedError}`,
          thrownError?.message
        );
      } else if (typeof expectedError === 'function') {
        this.assert(
          thrownError instanceof expectedError,
          `thrown error to be instance of ${expectedError.name}`
        );
      }
    } else {
      this.assert(true, `function to throw`);
    }
  }

  async toThrowAsync(expectedError?: string | RegExp | ErrorConstructor) {
    let thrownError: any = null;
    let didThrow = false;

    if (typeof this.actual !== 'function') {
      throw new Error("toThrowAsync target must be a function");
    }

    try {
      await this.actual();
    } catch (err) {
      didThrow = true;
      thrownError = err;
    }

    if (!didThrow) {
      this.assert(false, `async function to throw an error`);
      return;
    }

    if (expectedError) {
      if (typeof expectedError === 'string') {
        this.assert(
          thrownError?.message?.includes(expectedError),
          `async error message to contain "${expectedError}"`,
          thrownError?.message
        );
      } else if (expectedError instanceof RegExp) {
        this.assert(
          expectedError.test(thrownError?.message || ''),
          `async error message to match regex ${expectedError}`,
          thrownError?.message
        );
      } else if (typeof expectedError === 'function') {
        this.assert(
          thrownError instanceof expectedError,
          `async error to be instance of ${expectedError.name}`
        );
      }
    } else {
      this.assert(true, `async function to throw`);
    }
  }

  private deepEqual(a: any, b: any): boolean {
    if (Object.is(a, b)) return true;
    if (a === null || typeof a !== 'object' || b === null || typeof b !== 'object') return false;

    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!this.deepEqual(a[key], b[key])) return false;
    }

    return true;
  }
}

export function expect<T = any>(actual: T): Expectation<T> {
  return new Expectation(actual);
}

// ANSI Formatting Utilities
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

export interface RunnerOptions {
  tier?: number;
  filter?: string;
  verbose?: boolean;
}

export async function executeSuites(options: RunnerOptions = {}): Promise<RunnerSummary> {
  const startTime = Date.now();
  const summary: RunnerSummary = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    suites: [],
  };

  const regexFilter = options.filter ? new RegExp(options.filter, 'i') : null;

  for (const suite of suites) {
    if (options.tier !== undefined && suite.tier !== options.tier) {
      continue;
    }

    const filteredTests = regexFilter
      ? suite.tests.filter((t) => regexFilter.test(suite.name) || regexFilter.test(t.name))
      : suite.tests;

    if (filteredTests.length === 0) continue;

    console.log(`\n${c.bold}${c.cyan}● ${suite.name}${c.reset} ${c.dim}(Tier ${suite.tier}${suite.featureId ? ` / Feature ${suite.featureId}` : ''})${c.reset}`);

    const suiteStartTime = Date.now();
    const suiteResult: SuiteResult = {
      name: suite.name,
      tier: suite.tier,
      featureId: suite.featureId,
      tests: [],
      passed: true,
      durationMs: 0,
    };

    // Run beforeAll hooks
    try {
      for (const hook of suite.beforeAllHooks) {
        await hook();
      }
    } catch (err: any) {
      console.log(`  ${c.red}✖ beforeAll hook failed: ${err.message}${c.reset}`);
      suiteResult.passed = false;
      summary.failed += filteredTests.length;
      summary.total += filteredTests.length;
      continue;
    }

    // Run tests
    for (const testCase of filteredTests) {
      const testStartTime = Date.now();
      summary.total++;
      let testPassed = true;
      let testError: Error | undefined;

      try {
        await testCase.fn();
      } catch (err: any) {
        testPassed = false;
        testError = err;
        suiteResult.passed = false;
      }

      const durationMs = Date.now() - testStartTime;

      if (testPassed) {
        summary.passed++;
        console.log(`  ${c.green}✔${c.reset} ${c.white}${testCase.name}${c.reset} ${c.dim}(${durationMs}ms)${c.reset}`);
      } else {
        summary.failed++;
        console.log(`  ${c.red}✖${c.reset} ${c.bold}${c.red}${testCase.name}${c.reset} ${c.dim}(${durationMs}ms)${c.reset}`);
        if (testError) {
          const indented = (testError.stack || testError.message)
            .split('\n')
            .map((line) => `      ${line}`)
            .slice(0, 4)
            .join('\n');
          console.log(`${c.red}${indented}${c.reset}`);
        }
      }

      suiteResult.tests.push({
        name: testCase.name,
        suite: suite.name,
        tier: suite.tier,
        featureId: suite.featureId,
        durationMs,
        passed: testPassed,
        error: testError,
      });
    }

    // Run afterAll hooks
    try {
      for (const hook of suite.afterAllHooks) {
        await hook();
      }
    } catch (err: any) {
      console.log(`  ${c.red}✖ afterAll hook failed: ${err.message}${c.reset}`);
    }

    suiteResult.durationMs = Date.now() - suiteStartTime;
    summary.suites.push(suiteResult);
  }

  summary.durationMs = Date.now() - startTime;
  return summary;
}
