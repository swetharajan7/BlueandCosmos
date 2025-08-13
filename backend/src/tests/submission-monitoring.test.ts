import { Pool } from 'pg';
import { SubmissionMonitoringService } from '../services/submissionMonitoringService';
import { SubmissionAnalyticsService } from '../services/submissionAnalyticsService';
import { AdminNotificationService } from '../services/adminNotificationService';
import { ErrorLoggingService } from '../services/errorLoggingService';
import { EmailService } from '../services/emailService';
import { WebSocketService } from '../services/websocketService';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock dependencies
jest.mock('../services/emailService');
jest.mock('../services/websocketService');

describe('SubmissionMonitoringService', () => {
  let db: Pool;
  let emailService: EmailService;
  let websocketService: WebSocketService;
  let monitoringService: SubmissionMonitoringService;

  beforeAll(async () => {
    // Setup test database connection
    db = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost/stellarrec_test'
    });

    // Initialize mocked services
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(true)
    } as any;
    
    websocketService = {
      broadcast: jest.fn(),
      getConnectedUsersCount: jest.fn().mockReturnValue(0)
    } as any;

    // Create monitoring service
    monitoringService = new SubmissionMonitoringService(db, emailService, websocketService);
  });

  afterAll(async () => {
    await monitoringService.stopMonitoring();
    await db.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM notification_events');
    await db.query('DELETE FROM notification_rules');
    await db.query('DELETE FROM error_logs');
    await db.query('DELETE FROM submission_queue');
  });

  describe('Monitoring Lifecycle', () => {
    test('should start and stop monitoring successfully', async () => {
      expect(monitoringService.isCurrentlyMonitoring()).toBe(false);

      await monitoringService.startMonitoring(0.1); // 0.1 minute intervals for testing
      expect(monitoringService.isCurrentlyMonitoring()).toBe(true);

      await monitoringService.stopMonitoring();
      expect(monitoringService.isCurrentlyMonitoring()).toBe(false);
    });

    test('should not start monitoring if already running', async () => {
      await monitoringService.startMonitoring(0.1);
      expect(monitoringService.isCurrentlyMonitoring()).toBe(true);

      // Try to start again - should not throw error
      await monitoringService.startMonitoring(0.1);
      expect(monitoringService.isCurrentlyMonitoring()).toBe(true);

      await monitoringService.stopMonitoring();
    });

    test('should track uptime correctly', async () => {
      const startTime = Date.now();
      await monitoringService.startMonitoring(0.1);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uptime = monitoringService.getUptime();
      expect(uptime).toBeGreaterThan(0);
      expect(uptime).toBeLessThan(10); // Should be less than 10 seconds

      await monitoringService.stopMonitoring();
    });
  });

  describe('Dashboard Generation', () => {
    test('should generate dashboard with all required sections', async () => {
      const dashboard = await monitoringService.getDashboard();

      expect(dashboard).toHaveProperty('systemHealth');
      expect(dashboard).toHaveProperty('realTimeMetrics');
      expect(dashboard).toHaveProperty('alerts');
      expect(dashboard).toHaveProperty('recentActivity');
      expect(dashboard).toHaveProperty('performanceMetrics');

      expect(dashboard.systemHealth).toHaveProperty('status');
      expect(dashboard.systemHealth).toHaveProperty('uptime');
      expect(dashboard.systemHealth).toHaveProperty('lastCheck');

      expect(dashboard.realTimeMetrics).toHaveProperty('activeSubmissions');
      expect(dashboard.realTimeMetrics).toHaveProperty('queueLength');
      expect(dashboard.realTimeMetrics).toHaveProperty('processingRate');
      expect(dashboard.realTimeMetrics).toHaveProperty('successRate');
      expect(dashboard.realTimeMetrics).toHaveProperty('averageProcessingTime');
    });

    test('should include recent activity in dashboard', async () => {
      // Create some test error logs
      const errorLoggingService = monitoringService.getErrorLoggingService();
      
      await errorLoggingService.logError({
        level: 'error',
        category: 'submission',
        message: 'Test submission error',
        details: { test: true }
      });

      await errorLoggingService.logError({
        level: 'warn',
        category: 'validation',
        message: 'Test validation warning',
        details: { test: true }
      });

      const dashboard = await monitoringService.getDashboard();
      
      expect(dashboard.recentActivity).toBeInstanceOf(Array);
      expect(dashboard.recentActivity.length).toBeGreaterThan(0);
      
      const errorActivity = dashboard.recentActivity.find(
        activity => activity.message === 'Test submission error'
      );
      expect(errorActivity).toBeDefined();
      expect(errorActivity?.type).toBe('error');
      expect(errorActivity?.severity).toBe('error');
    });
  });

  describe('Health Report Generation', () => {
    test('should generate comprehensive health report', async () => {
      const report = await monitoringService.generateHealthReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('recommendations');

      expect(report.summary).toHaveProperty('overallHealth');
      expect(report.summary).toHaveProperty('totalSubmissions24h');
      expect(report.summary).toHaveProperty('successRate24h');
      expect(report.summary).toHaveProperty('averageProcessingTime');
      expect(report.summary).toHaveProperty('activeAlerts');

      expect(report.details).toHaveProperty('systemMetrics');
      expect(report.details).toHaveProperty('universityPerformance');
      expect(report.details).toHaveProperty('recentErrors');
      expect(report.details).toHaveProperty('queueStatus');

      expect(report.recommendations).toBeInstanceOf(Array);
    });

    test('should provide recommendations based on system state', async () => {
      // Create some error conditions to trigger recommendations
      const errorLoggingService = monitoringService.getErrorLoggingService();
      
      // Create multiple errors to trigger recommendations
      for (let i = 0; i < 25; i++) {
        await errorLoggingService.logError({
          level: 'error',
          category: 'submission',
          message: `Test error ${i}`,
          details: { test: true }
        });
      }

      const report = await monitoringService.generateHealthReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      const errorRecommendation = report.recommendations.find(
        rec => rec.includes('error count')
      );
      expect(errorRecommendation).toBeDefined();
    });
  });

  describe('Failed Submission Retry', () => {
    test('should retry failed submissions with filters', async () => {
      // This test would require setting up test submissions
      // For now, test the basic functionality
      const result = await monitoringService.retryFailedSubmissions({
        maxRetries: 3,
        olderThanMinutes: 60
      });

      expect(result).toHaveProperty('retriedCount');
      expect(result).toHaveProperty('skippedCount');
      expect(result).toHaveProperty('errors');
      expect(result.errors).toBeInstanceOf(Array);
    });

    test('should handle retry errors gracefully', async () => {
      const result = await monitoringService.retryFailedSubmissions({
        universityId: 'non-existent-id'
      });

      expect(result.retriedCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.errors).toBeInstanceOf(Array);
    });
  });

  describe('Service Access', () => {
    test('should provide access to individual services', () => {
      const analyticsService = monitoringService.getAnalyticsService();
      const notificationService = monitoringService.getNotificationService();
      const errorLoggingService = monitoringService.getErrorLoggingService();
      const queueService = monitoringService.getQueueService();

      expect(analyticsService).toBeInstanceOf(SubmissionAnalyticsService);
      expect(notificationService).toBeInstanceOf(AdminNotificationService);
      expect(errorLoggingService).toBeInstanceOf(ErrorLoggingService);
      expect(queueService).toBeDefined();
    });
  });
});

describe('SubmissionAnalyticsService', () => {
  let db: Pool;
  let analyticsService: SubmissionAnalyticsService;

  beforeAll(async () => {
    db = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost/stellarrec_test'
    });
    analyticsService = new SubmissionAnalyticsService(db);
  });

  afterAll(async () => {
    await db.end();
  });

  describe('System Health Metrics', () => {
    test('should get system health metrics', async () => {
      const metrics = await analyticsService.getSystemHealthMetrics();

      expect(metrics).toHaveProperty('overallHealth');
      expect(metrics).toHaveProperty('metrics');
      expect(metrics).toHaveProperty('alerts');

      expect(['healthy', 'warning', 'critical']).toContain(metrics.overallHealth);
      
      expect(metrics.metrics).toHaveProperty('successRate24h');
      expect(metrics.metrics).toHaveProperty('averageProcessingTime');
      expect(metrics.metrics).toHaveProperty('queueBacklog');
      expect(metrics.metrics).toHaveProperty('failureRate');
      expect(metrics.metrics).toHaveProperty('systemLoad');

      expect(metrics.alerts).toBeInstanceOf(Array);
    });

    test('should generate alerts based on thresholds', async () => {
      const metrics = await analyticsService.getSystemHealthMetrics();
      
      // Check that alerts have proper structure
      metrics.alerts.forEach(alert => {
        expect(alert).toHaveProperty('level');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('timestamp');
        expect(['info', 'warning', 'error']).toContain(alert.level);
      });
    });
  });

  describe('Comprehensive Analytics', () => {
    test('should get comprehensive analytics', async () => {
      const analytics = await analyticsService.getComprehensiveAnalytics();

      expect(analytics).toHaveProperty('totalSubmissions');
      expect(analytics).toHaveProperty('successRate');
      expect(analytics).toHaveProperty('averageProcessingTime');
      expect(analytics).toHaveProperty('failuresByReason');
      expect(analytics).toHaveProperty('submissionsByUniversity');
      expect(analytics).toHaveProperty('submissionsByMethod');
      expect(analytics).toHaveProperty('timeSeriesData');
      expect(analytics).toHaveProperty('recentFailures');

      expect(typeof analytics.totalSubmissions).toBe('number');
      expect(typeof analytics.successRate).toBe('number');
      expect(typeof analytics.averageProcessingTime).toBe('number');
      expect(analytics.failuresByReason).toBeInstanceOf(Object);
      expect(analytics.submissionsByUniversity).toBeInstanceOf(Array);
      expect(analytics.submissionsByMethod).toBeInstanceOf(Array);
      expect(analytics.timeSeriesData).toBeInstanceOf(Array);
      expect(analytics.recentFailures).toBeInstanceOf(Array);
    });

    test('should filter analytics by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = new Date();

      const analytics = await analyticsService.getComprehensiveAnalytics(startDate, endDate);
      
      expect(analytics).toHaveProperty('totalSubmissions');
      expect(analytics).toHaveProperty('successRate');
      
      // Time series data should be within the specified range
      analytics.timeSeriesData.forEach(dataPoint => {
        const pointDate = new Date(dataPoint.date);
        expect(pointDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
        expect(pointDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
      });
    });
  });

  describe('Submission Metrics', () => {
    test('should get submission metrics for different periods', async () => {
      const metrics = await analyticsService.getSubmissionMetrics('daily');

      expect(metrics).toHaveProperty('hourly');
      expect(metrics).toHaveProperty('daily');
      expect(metrics).toHaveProperty('weekly');

      expect(metrics.hourly).toBeInstanceOf(Array);
      expect(metrics.daily).toBeInstanceOf(Array);
      expect(metrics.weekly).toBeInstanceOf(Array);

      // Check structure of daily metrics
      if (metrics.daily.length > 0) {
        const dayMetric = metrics.daily[0];
        expect(dayMetric).toHaveProperty('date');
        expect(dayMetric).toHaveProperty('submissions');
        expect(dayMetric).toHaveProperty('successes');
        expect(dayMetric).toHaveProperty('failures');
      }
    });
  });
});

describe('ErrorLoggingService', () => {
  let db: Pool;
  let errorLoggingService: ErrorLoggingService;

  beforeAll(async () => {
    db = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost/stellarrec_test'
    });
    errorLoggingService = new ErrorLoggingService(db);
  });

  afterAll(async () => {
    await db.end();
  });

  beforeEach(async () => {
    await db.query('DELETE FROM error_logs');
  });

  describe('Error Logging', () => {
    test('should log errors with all details', async () => {
      const errorLog = await errorLoggingService.logError({
        level: 'error',
        category: 'submission',
        message: 'Test error message',
        details: { testData: 'value' },
        error: new Error('Test error'),
        userId: 'test-user-id',
        submissionId: 'test-submission-id',
        tags: ['test', 'error']
      });

      expect(errorLog).toHaveProperty('id');
      expect(errorLog.level).toBe('error');
      expect(errorLog.category).toBe('submission');
      expect(errorLog.message).toBe('Test error message');
      expect(errorLog.details).toEqual({ testData: 'value' });
      expect(errorLog.stackTrace).toContain('Test error');
      expect(errorLog.userId).toBe('test-user-id');
      expect(errorLog.submissionId).toBe('test-submission-id');
      expect(errorLog.tags).toEqual(['test', 'error']);
      expect(errorLog.resolved).toBe(false);
    });

    test('should log submission errors', async () => {
      const errorLog = await errorLoggingService.logSubmissionError(
        'test-submission-id',
        'test-university-id',
        new Error('Submission failed'),
        { additionalInfo: 'test' },
        'test-request-id'
      );

      expect(errorLog.level).toBe('error');
      expect(errorLog.category).toBe('submission');
      expect(errorLog.message).toContain('Submission failed');
      expect(errorLog.submissionId).toBe('test-submission-id');
      expect(errorLog.universityId).toBe('test-university-id');
      expect(errorLog.requestId).toBe('test-request-id');
      expect(errorLog.tags).toContain('submission_failure');
    });

    test('should log integration errors', async () => {
      const errorLog = await errorLoggingService.logIntegrationError(
        'test-university-id',
        'api',
        new Error('API integration failed'),
        { endpoint: '/api/submit' },
        'test-request-id'
      );

      expect(errorLog.level).toBe('error');
      expect(errorLog.category).toBe('integration');
      expect(errorLog.message).toContain('University integration failed (api)');
      expect(errorLog.universityId).toBe('test-university-id');
      expect(errorLog.tags).toContain('integration_failure');
      expect(errorLog.tags).toContain('api');
    });

    test('should log validation errors', async () => {
      const errorLog = await errorLoggingService.logValidationError(
        'Invalid input data',
        { field: 'email' },
        'test-user-id',
        'test-request-id'
      );

      expect(errorLog.level).toBe('warn');
      expect(errorLog.category).toBe('validation');
      expect(errorLog.message).toContain('Validation error');
      expect(errorLog.userId).toBe('test-user-id');
      expect(errorLog.tags).toContain('validation_error');
    });

    test('should log system errors', async () => {
      const errorLog = await errorLoggingService.logSystemError(
        new Error('Database connection failed'),
        { component: 'database' },
        'test-request-id'
      );

      expect(errorLog.level).toBe('fatal');
      expect(errorLog.category).toBe('system');
      expect(errorLog.message).toContain('System error');
      expect(errorLog.tags).toContain('system_error');
    });
  });

  describe('Error Retrieval', () => {
    beforeEach(async () => {
      // Create test error logs
      await errorLoggingService.logError({
        level: 'error',
        category: 'submission',
        message: 'Error 1',
        tags: ['test']
      });

      await errorLoggingService.logError({
        level: 'warn',
        category: 'validation',
        message: 'Error 2',
        tags: ['test']
      });

      await errorLoggingService.logError({
        level: 'info',
        category: 'system',
        message: 'Error 3',
        tags: ['test']
      });
    });

    test('should get error logs with filters', async () => {
      const result = await errorLoggingService.getErrorLogs({
        level: 'error'
      });

      expect(result.logs.length).toBe(1);
      expect(result.logs[0].level).toBe('error');
      expect(result.total).toBe(1);
    });

    test('should get error logs with pagination', async () => {
      const result = await errorLoggingService.getErrorLogs({}, 2, 0);

      expect(result.logs.length).toBe(2);
      expect(result.total).toBe(3);
    });

    test('should filter by category', async () => {
      const result = await errorLoggingService.getErrorLogs({
        category: 'validation'
      });

      expect(result.logs.length).toBe(1);
      expect(result.logs[0].category).toBe('validation');
    });

    test('should filter by tags', async () => {
      const result = await errorLoggingService.getErrorLogs({
        tags: ['test']
      });

      expect(result.logs.length).toBe(3);
      result.logs.forEach(log => {
        expect(log.tags).toContain('test');
      });
    });
  });

  describe('Error Resolution', () => {
    test('should resolve individual errors', async () => {
      const errorLog = await errorLoggingService.logError({
        level: 'error',
        category: 'submission',
        message: 'Test error'
      });

      await errorLoggingService.resolveError(
        errorLog.id,
        'test-admin',
        'Fixed the issue'
      );

      const resolvedError = await errorLoggingService.getErrorById(errorLog.id);
      expect(resolvedError?.resolved).toBe(true);
      expect(resolvedError?.resolvedBy).toBe('test-admin');
      expect(resolvedError?.details?.resolution).toBe('Fixed the issue');
    });

    test('should bulk resolve errors', async () => {
      // Create multiple errors
      for (let i = 0; i < 5; i++) {
        await errorLoggingService.logError({
          level: 'error',
          category: 'submission',
          message: `Bulk error ${i}`
        });
      }

      const resolvedCount = await errorLoggingService.bulkResolveErrors(
        { category: 'submission' },
        'test-admin',
        'Bulk resolved'
      );

      expect(resolvedCount).toBe(5);

      const result = await errorLoggingService.getErrorLogs({
        category: 'submission',
        resolved: true
      });

      expect(result.total).toBe(5);
    });
  });

  describe('Error Metrics', () => {
    beforeEach(async () => {
      // Create test errors for metrics
      await errorLoggingService.logError({
        level: 'error',
        category: 'submission',
        message: 'Submission error 1'
      });

      await errorLoggingService.logError({
        level: 'error',
        category: 'submission',
        message: 'Submission error 2'
      });

      await errorLoggingService.logError({
        level: 'warn',
        category: 'validation',
        message: 'Validation warning'
      });
    });

    test('should get error metrics', async () => {
      const metrics = await errorLoggingService.getErrorMetrics();

      expect(metrics).toHaveProperty('totalErrors');
      expect(metrics).toHaveProperty('errorsByLevel');
      expect(metrics).toHaveProperty('errorsByCategory');
      expect(metrics).toHaveProperty('errorsByEndpoint');
      expect(metrics).toHaveProperty('topErrors');
      expect(metrics).toHaveProperty('errorTrends');

      expect(metrics.totalErrors).toBe(3);
      expect(metrics.errorsByLevel.error).toBe(2);
      expect(metrics.errorsByLevel.warn).toBe(1);
      expect(metrics.errorsByCategory.submission).toBe(2);
      expect(metrics.errorsByCategory.validation).toBe(1);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup old resolved logs', async () => {
      // Create and resolve an old error
      const errorLog = await errorLoggingService.logError({
        level: 'error',
        category: 'submission',
        message: 'Old error'
      });

      await errorLoggingService.resolveError(errorLog.id, 'test-admin');

      // Manually update timestamp to be old
      await db.query(
        'UPDATE error_logs SET timestamp = $1 WHERE id = $2',
        [new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), errorLog.id] // 100 days ago
      );

      const deletedCount = await errorLoggingService.cleanupOldLogs(90);
      expect(deletedCount).toBe(1);

      const remainingError = await errorLoggingService.getErrorById(errorLog.id);
      expect(remainingError).toBeNull();
    });
  });
});

describe('AdminNotificationService', () => {
  let db: Pool;
  let emailService: EmailService;
  let notificationService: AdminNotificationService;

  beforeAll(async () => {
    db = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost/stellarrec_test'
    });
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(true)
    } as any;
    notificationService = new AdminNotificationService(db, emailService);
  });

  afterAll(async () => {
    await notificationService.stopMonitoring();
    await db.end();
  });

  beforeEach(async () => {
    await db.query('DELETE FROM notification_events');
    await db.query('DELETE FROM notification_rules');
  });

  describe('Notification Rules', () => {
    test('should create notification rules', async () => {
      const rule = await notificationService.createNotificationRule({
        name: 'Test Rule',
        type: 'submission_failure',
        enabled: true,
        conditions: { threshold: 5 },
        actions: {
          email: {
            recipients: ['admin@test.com'],
            template: 'alert'
          }
        },
        cooldownMinutes: 30
      });

      expect(rule).toHaveProperty('id');
      expect(rule.name).toBe('Test Rule');
      expect(rule.type).toBe('submission_failure');
      expect(rule.enabled).toBe(true);
      expect(rule.conditions.threshold).toBe(5);
      expect(rule.cooldownMinutes).toBe(30);
    });

    test('should get notification rules', async () => {
      await notificationService.createNotificationRule({
        name: 'Test Rule 1',
        type: 'submission_failure',
        enabled: true,
        conditions: { threshold: 5 },
        actions: { email: { recipients: ['admin@test.com'], template: 'alert' } },
        cooldownMinutes: 30
      });

      await notificationService.createNotificationRule({
        name: 'Test Rule 2',
        type: 'high_failure_rate',
        enabled: false,
        conditions: { threshold: 80 },
        actions: { email: { recipients: ['admin@test.com'], template: 'alert' } },
        cooldownMinutes: 60
      });

      const rules = await notificationService.getNotificationRules();
      expect(rules.length).toBe(2);
      expect(rules[0].name).toBe('Test Rule 2'); // Should be ordered by created_at DESC
      expect(rules[1].name).toBe('Test Rule 1');
    });

    test('should update notification rules', async () => {
      const rule = await notificationService.createNotificationRule({
        name: 'Test Rule',
        type: 'submission_failure',
        enabled: true,
        conditions: { threshold: 5 },
        actions: { email: { recipients: ['admin@test.com'], template: 'alert' } },
        cooldownMinutes: 30
      });

      const updatedRule = await notificationService.updateNotificationRule(rule.id, {
        name: 'Updated Rule',
        enabled: false,
        cooldownMinutes: 60
      });

      expect(updatedRule.name).toBe('Updated Rule');
      expect(updatedRule.enabled).toBe(false);
      expect(updatedRule.cooldownMinutes).toBe(60);
      expect(updatedRule.type).toBe('submission_failure'); // Should remain unchanged
    });

    test('should delete notification rules', async () => {
      const rule = await notificationService.createNotificationRule({
        name: 'Test Rule',
        type: 'submission_failure',
        enabled: true,
        conditions: { threshold: 5 },
        actions: { email: { recipients: ['admin@test.com'], template: 'alert' } },
        cooldownMinutes: 30
      });

      await notificationService.deleteNotificationRule(rule.id);

      const rules = await notificationService.getNotificationRules();
      expect(rules.length).toBe(0);
    });
  });

  describe('Notification Events', () => {
    test('should get notification events', async () => {
      const result = await notificationService.getNotificationEvents(10, 0);
      
      expect(result).toHaveProperty('events');
      expect(result).toHaveProperty('total');
      expect(result.events).toBeInstanceOf(Array);
      expect(typeof result.total).toBe('number');
    });

    test('should filter notification events by severity', async () => {
      const result = await notificationService.getNotificationEvents(10, 0, 'critical');
      
      expect(result.events).toBeInstanceOf(Array);
      result.events.forEach(event => {
        expect(event.severity).toBe('critical');
      });
    });
  });

  describe('Default Rules', () => {
    test('should provide default notification rules', async () => {
      const defaultRules = await notificationService.getDefaultNotificationRules();
      
      expect(defaultRules).toBeInstanceOf(Array);
      expect(defaultRules.length).toBeGreaterThan(0);
      
      defaultRules.forEach(rule => {
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('type');
        expect(rule).toHaveProperty('enabled');
        expect(rule).toHaveProperty('conditions');
        expect(rule).toHaveProperty('actions');
        expect(rule).toHaveProperty('cooldownMinutes');
      });
    });
  });
});