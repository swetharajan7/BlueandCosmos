module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ],
  moduleNameMapper: {
    '^axios$': require.resolve('axios'),
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**',
    '!src/server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: '50%',
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  // Performance and memory settings
  maxConcurrency: 5,
  // Test categorization
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/tests/(models|services|middleware|auth).test.ts']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/tests/*integration*.test.ts']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/src/tests/e2e.test.ts'],
      testTimeout: 120000
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/src/tests/performance.test.ts'],
      testTimeout: 180000
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/src/tests/security*.test.ts'],
      testTimeout: 90000
    }
  ]
};