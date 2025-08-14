import { Pool } from 'pg';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing';
  process.env.DB_NAME = 'stellarrec_test';
  process.env.REDIS_DB = '1';
  
  // Suppress console logs during testing unless explicitly needed
  if (!process.env.VERBOSE_TESTS) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

// Global test cleanup
afterAll(async () => {
  // Close any open database connections
  if (global.testDb) {
    await (global.testDb as Pool).end();
  }
  
  // Clear any timers
  jest.clearAllTimers();
  
  // Restore console methods
  if (!process.env.VERBOSE_TESTS) {
    (console.log as jest.Mock).mockRestore?.();
    (console.warn as jest.Mock).mockRestore?.();
    (console.error as jest.Mock).mockRestore?.();
  }
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Extend Jest matchers for better assertions
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeWithinTimeRange(received: Date, expected: Date, rangeMs: number = 1000) {
    const diff = Math.abs(received.getTime() - expected.getTime());
    const pass = diff <= rangeMs;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be within ${rangeMs}ms of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within ${rangeMs}ms of ${expected}, but was ${diff}ms away`,
        pass: false,
      };
    }
  }
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeWithinTimeRange(expected: Date, rangeMs?: number): R;
    }
  }
}