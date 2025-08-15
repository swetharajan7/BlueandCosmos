module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        compilerOptions: {
          module: 'commonjs',
          target: 'es2018',
          lib: ['es2018'],
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true
        }
      }
    }
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
      testMatch: ['<rootDir>/src/tests/*integration*.test.ts', '<rootDir>/src/tests/monitoring-observability.test.ts']
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
    },
    {
      displayName: 'system-load',
      testMatch: ['<rootDir>/src/tests/load-testing.test.ts'],
      testTimeout: 120000
    },
    {
      displayName: 'system-security',
      testMatch: ['<rootDir>/src/tests/penetration-testing.test.ts'],
      testTimeout: 90000
    },
    {
      displayName: 'system-usability',
      testMatch: ['<rootDir>/src/tests/usability-testing.test.ts'],
      testTimeout: 60000
    },
    {
      displayName: 'system-compatibility',
      testMatch: ['<rootDir>/src/tests/compatibility-testing.test.ts'],
      testTimeout: 60000
    },
    {
      displayName: 'system-disaster-recovery',
      testMatch: ['<rootDir>/src/tests/disaster-recovery-testing.test.ts'],
      testTimeout: 120000
    }
  ]
};