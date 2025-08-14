#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
  name: string;
  pattern: string;
  timeout?: number;
  parallel?: boolean;
}

interface TestResults {
  suite: string;
  passed: number;
  failed: number;
  duration: number;
  coverage?: number;
}

class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests - Models',
      pattern: 'models.test.ts',
      timeout: 30000
    },
    {
      name: 'Unit Tests - Services',
      pattern: 'services.test.ts',
      timeout: 30000
    },
    {
      name: 'Unit Tests - Middleware',
      pattern: 'middleware.test.ts',
      timeout: 30000
    },
    {
      name: 'Unit Tests - Authentication',
      pattern: 'auth.test.ts',
      timeout: 30000
    },
    {
      name: 'Integration Tests - Database',
      pattern: 'database.integration.test.ts',
      timeout: 60000
    },
    {
      name: 'Integration Tests - External APIs',
      pattern: 'external-apis.integration.test.ts',
      timeout: 60000
    },
    {
      name: 'End-to-End Tests',
      pattern: 'e2e.test.ts',
      timeout: 120000
    },
    {
      name: 'Performance Tests',
      pattern: 'performance.test.ts',
      timeout: 180000
    },
    {
      name: 'Security Tests',
      pattern: 'security.comprehensive.test.ts',
      timeout: 90000
    },
    {
      name: 'Existing Feature Tests',
      pattern: '*.test.ts',
      timeout: 60000
    }
  ];

  private results: TestResults[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log('=====================================\n');

    const startTime = Date.now();

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    const totalTime = Date.now() - startTime;
    this.generateReport(totalTime);
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`📋 Running: ${suite.name}`);
    console.log(`   Pattern: ${suite.pattern}`);
    console.log(`   Timeout: ${suite.timeout || 30000}ms\n`);

    const startTime = Date.now();

    try {
      const command = this.buildJestCommand(suite);
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: suite.timeout || 30000,
        stdio: 'pipe'
      });

      const duration = Date.now() - startTime;
      const result = this.parseJestOutput(output, suite.name, duration);
      this.results.push(result);

      console.log(`✅ ${suite.name} completed in ${duration}ms`);
      console.log(`   Passed: ${result.passed}, Failed: ${result.failed}\n`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${suite.name} failed after ${duration}ms`);
      console.log(`   Error: ${error.message}\n`);

      this.results.push({
        suite: suite.name,
        passed: 0,
        failed: 1,
        duration
      });
    }
  }

  private buildJestCommand(suite: TestSuite): string {
    const baseCommand = 'npx jest';
    const options = [
      `--testPathPattern="${suite.pattern}"`,
      '--verbose',
      '--coverage',
      '--coverageReporters=text-summary',
      '--forceExit',
      '--detectOpenHandles'
    ];

    if (suite.timeout) {
      options.push(`--testTimeout=${suite.timeout}`);
    }

    return `${baseCommand} ${options.join(' ')}`;
  }

  private parseJestOutput(output: string, suiteName: string, duration: number): TestResults {
    const lines = output.split('\n');
    let passed = 0;
    let failed = 0;
    let coverage = 0;

    for (const line of lines) {
      // Parse test results
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed/);
        if (match) passed = parseInt(match[1]);
        
        const failMatch = line.match(/(\d+) failed/);
        if (failMatch) failed = parseInt(failMatch[1]);
      }

      // Parse coverage
      if (line.includes('All files')) {
        const coverageMatch = line.match(/(\d+\.?\d*)%/);
        if (coverageMatch) coverage = parseFloat(coverageMatch[1]);
      }
    }

    return {
      suite: suiteName,
      passed,
      failed,
      duration,
      coverage: coverage || undefined
    };
  }

  private generateReport(totalTime: number): void {
    console.log('\n📊 Test Suite Summary');
    console.log('=====================\n');

    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
    const totalTests = totalPassed + totalFailed;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s\n`);

    // Detailed results
    console.log('📋 Detailed Results:');
    console.log('--------------------');
    
    this.results.forEach(result => {
      const status = result.failed === 0 ? '✅' : '❌';
      const coverage = result.coverage ? ` (${result.coverage.toFixed(1)}% coverage)` : '';
      
      console.log(`${status} ${result.suite}`);
      console.log(`   Tests: ${result.passed} passed, ${result.failed} failed`);
      console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s${coverage}\n`);
    });

    // Coverage summary
    const coverageResults = this.results.filter(r => r.coverage !== undefined);
    if (coverageResults.length > 0) {
      const avgCoverage = coverageResults.reduce((sum, r) => sum + (r.coverage || 0), 0) / coverageResults.length;
      console.log(`📈 Average Coverage: ${avgCoverage.toFixed(1)}%\n`);
    }

    // Generate JSON report
    this.generateJSONReport();

    // Final status
    if (totalFailed === 0) {
      console.log('🎉 All tests passed successfully!');
    } else {
      console.log(`⚠️  ${totalFailed} test(s) failed. Please review the results above.`);
      process.exit(1);
    }
  }

  private generateJSONReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: this.results.reduce((sum, r) => sum + r.passed + r.failed, 0),
        passed: this.results.reduce((sum, r) => sum + r.passed, 0),
        failed: this.results.reduce((sum, r) => sum + r.failed, 0),
        duration: this.results.reduce((sum, r) => sum + r.duration, 0)
      },
      suites: this.results
    };

    const reportPath = path.join(__dirname, '../../test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report saved to: ${reportPath}`);
  }
}

// Performance monitoring
class PerformanceMonitor {
  private metrics: { [key: string]: number } = {};

  startTimer(name: string): void {
    this.metrics[`${name}_start`] = Date.now();
  }

  endTimer(name: string): number {
    const startTime = this.metrics[`${name}_start`];
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.metrics[name] = duration;
    return duration;
  }

  getMetrics(): { [key: string]: number } {
    return { ...this.metrics };
  }
}

// Test environment setup
class TestEnvironmentSetup {
  async setup(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'stellarrec_test';
    process.env.REDIS_DB = '1';
    
    // Create test directories if they don't exist
    const testDirs = ['coverage', 'test-results'];
    testDirs.forEach(dir => {
      const dirPath = path.join(__dirname, '../../', dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    console.log('✅ Test environment setup complete\n');
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test environment...');
    
    // Reset environment variables
    delete process.env.DB_NAME;
    delete process.env.REDIS_DB;
    
    console.log('✅ Cleanup complete');
  }
}

// Main execution
async function main(): Promise<void> {
  const setup = new TestEnvironmentSetup();
  const runner = new ComprehensiveTestRunner();
  const monitor = new PerformanceMonitor();

  try {
    await setup.setup();
    
    monitor.startTimer('total_execution');
    await runner.runAllTests();
    const totalTime = monitor.endTimer('total_execution');

    console.log(`\n⏱️  Total execution time: ${(totalTime / 1000).toFixed(2)}s`);
    
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  } finally {
    await setup.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { ComprehensiveTestRunner, PerformanceMonitor, TestEnvironmentSetup };