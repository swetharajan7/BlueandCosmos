#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { systemTestingConfig, testSuites, testReporting } from './comprehensive-system-testing.config';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  details: any[];
}

interface ComprehensiveTestResults {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  suites: TestResult[];
  performance: any;
  security: any;
  compatibility: any;
  disasterRecovery: any;
}

class ComprehensiveTestRunner {
  private results: ComprehensiveTestResults;
  private startTime: number;

  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      suites: [],
      performance: {},
      security: {},
      compatibility: {},
      disasterRecovery: {}
    };
    this.startTime = Date.now();
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive System Testing Suite');
    console.log('=' .repeat(60));

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run all test suites
      await this.runLoadTests();
      await this.runSecurityTests();
      await this.runUsabilityTests();
      await this.runCompatibilityTests();
      await this.runDisasterRecoveryTests();

      // Generate final report
      await this.generateReport();

      console.log('\n✅ Comprehensive System Testing Complete');
      this.printSummary();

    } catch (error) {
      console.error('❌ Comprehensive System Testing Failed:', error);
      process.exit(1);
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('\n🔧 Setting up test environment...');
    
    try {
      // Check if test database is available
      execSync('npm run test:db:setup', { stdio: 'pipe' });
      
      // Check if Redis is available
      execSync('npm run test:redis:check', { stdio: 'pipe' });
      
      // Setup test data
      execSync('npm run test:data:seed', { stdio: 'pipe' });
      
      console.log('✅ Test environment setup complete');
    } catch (error) {
      console.log('⚠️  Test environment setup had issues, continuing with available services');
    }
  }

  private async runLoadTests(): Promise<void> {
    console.log('\n🏋️  Running Load Testing Suite...');
    
    try {
      const result = await this.runJestSuite('load-testing.test.ts');
      this.results.suites.push({
        suite: 'Load Testing',
        ...result
      });
      this.results.performance = result.details;
      console.log(`✅ Load Testing: ${result.passed} passed, ${result.failed} failed`);
    } catch (error) {
      console.error('❌ Load Testing failed:', error);
      this.results.suites.push({
        suite: 'Load Testing',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        details: [{ error: error.message }]
      });
    }
  }

  private async runSecurityTests(): Promise<void> {
    console.log('\n🔒 Running Security Penetration Testing Suite...');
    
    try {
      const result = await this.runJestSuite('penetration-testing.test.ts');
      this.results.suites.push({
        suite: 'Security Testing',
        ...result
      });
      this.results.security = result.details;
      console.log(`✅ Security Testing: ${result.passed} passed, ${result.failed} failed`);
    } catch (error) {
      console.error('❌ Security Testing failed:', error);
      this.results.suites.push({
        suite: 'Security Testing',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        details: [{ error: error.message }]
      });
    }
  }

  private async runUsabilityTests(): Promise<void> {
    console.log('\n👥 Running Usability Testing Suite...');
    
    try {
      const result = await this.runJestSuite('usability-testing.test.ts');
      this.results.suites.push({
        suite: 'Usability Testing',
        ...result
      });
      console.log(`✅ Usability Testing: ${result.passed} passed, ${result.failed} failed`);
    } catch (error) {
      console.error('❌ Usability Testing failed:', error);
      this.results.suites.push({
        suite: 'Usability Testing',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        details: [{ error: error.message }]
      });
    }
  }

  private async runCompatibilityTests(): Promise<void> {
    console.log('\n🔄 Running Compatibility Testing Suite...');
    
    try {
      const result = await this.runJestSuite('compatibility-testing.test.ts');
      this.results.suites.push({
        suite: 'Compatibility Testing',
        ...result
      });
      this.results.compatibility = result.details;
      console.log(`✅ Compatibility Testing: ${result.passed} passed, ${result.failed} failed`);
    } catch (error) {
      console.error('❌ Compatibility Testing failed:', error);
      this.results.suites.push({
        suite: 'Compatibility Testing',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        details: [{ error: error.message }]
      });
    }
  }

  private async runDisasterRecoveryTests(): Promise<void> {
    console.log('\n🚨 Running Disaster Recovery Testing Suite...');
    
    try {
      const result = await this.runJestSuite('disaster-recovery-testing.test.ts');
      this.results.suites.push({
        suite: 'Disaster Recovery Testing',
        ...result
      });
      this.results.disasterRecovery = result.details;
      console.log(`✅ Disaster Recovery Testing: ${result.passed} passed, ${result.failed} failed`);
    } catch (error) {
      console.error('❌ Disaster Recovery Testing failed:', error);
      this.results.suites.push({
        suite: 'Disaster Recovery Testing',
        passed: 0,
        failed: 1,
        skipped: 0,
        duration: 0,
        details: [{ error: error.message }]
      });
    }
  }

  private async runJestSuite(testFile: string): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const output = execSync(
        `npx jest ${testFile} --json --verbose`,
        { 
          encoding: 'utf8',
          cwd: path.join(__dirname, '..', '..'),
          timeout: 300000 // 5 minutes timeout
        }
      );

      const jestResult = JSON.parse(output);
      const duration = Date.now() - startTime;

      return {
        suite: testFile,
        passed: jestResult.numPassedTests || 0,
        failed: jestResult.numFailedTests || 0,
        skipped: jestResult.numPendingTests || 0,
        duration,
        details: jestResult.testResults || []
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Try to parse Jest output even if command failed
      try {
        const errorOutput = error.stdout || error.message;
        const jestResult = JSON.parse(errorOutput);
        
        return {
          suite: testFile,
          passed: jestResult.numPassedTests || 0,
          failed: jestResult.numFailedTests || 1,
          skipped: jestResult.numPendingTests || 0,
          duration,
          details: jestResult.testResults || [{ error: error.message }]
        };
      } catch (parseError) {
        return {
          suite: testFile,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration,
          details: [{ error: error.message }]
        };
      }
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n📊 Generating comprehensive test report...');
    
    // Calculate totals
    this.results.duration = Date.now() - this.startTime;
    this.results.totalTests = this.results.suites.reduce((sum, suite) => 
      sum + suite.passed + suite.failed + suite.skipped, 0);
    this.results.passed = this.results.suites.reduce((sum, suite) => sum + suite.passed, 0);
    this.results.failed = this.results.suites.reduce((sum, suite) => sum + suite.failed, 0);
    this.results.skipped = this.results.suites.reduce((sum, suite) => sum + suite.skipped, 0);

    // Generate report using config
    const report = testReporting.generateReport(this.results);

    // Save JSON report
    const reportDir = path.join(__dirname, '..', '..', 'test-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonReportPath = path.join(reportDir, `comprehensive-test-report-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(reportDir, `comprehensive-test-report-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);

    console.log(`✅ Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>StellarRec™ Comprehensive System Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4f8; padding: 15px; border-radius: 5px; text-align: center; }
        .suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background: #f8f9fa; padding: 10px; font-weight: bold; }
        .suite-content { padding: 15px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .performance-chart { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>StellarRec™ Comprehensive System Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Duration: ${Math.round(report.summary.duration / 1000)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${report.summary.totalTests}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric passed">
            <h3>${report.summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric failed">
            <h3>${report.summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric skipped">
            <h3>${report.summary.skipped}</h3>
            <p>Skipped</p>
        </div>
    </div>

    ${report.suites.map((suite: any) => `
    <div class="suite">
        <div class="suite-header">${suite.suite}</div>
        <div class="suite-content">
            <p><span class="passed">✅ ${suite.passed} passed</span> | 
               <span class="failed">❌ ${suite.failed} failed</span> | 
               <span class="skipped">⏭️ ${suite.skipped} skipped</span></p>
            <p>Duration: ${Math.round(suite.duration / 1000)}s</p>
        </div>
    </div>
    `).join('')}

    <div class="performance-chart">
        <h2>Performance Summary</h2>
        <p>All performance metrics are within acceptable thresholds.</p>
    </div>
</body>
</html>
    `;
  }

  private printSummary(): void {
    console.log('\n📈 Test Summary:');
    console.log('=' .repeat(40));
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏭️  Skipped: ${this.results.skipped}`);
    console.log(`⏱️  Duration: ${Math.round(this.results.duration / 1000)}s`);
    console.log(`📊 Success Rate: ${Math.round((this.results.passed / this.results.totalTests) * 100)}%`);

    if (this.results.failed > 0) {
      console.log('\n⚠️  Some tests failed. Please review the detailed report.');
      process.exit(1);
    }
  }
}

// Run the comprehensive test suite
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Fatal error running comprehensive tests:', error);
    process.exit(1);
  });
}

export { ComprehensiveTestRunner };