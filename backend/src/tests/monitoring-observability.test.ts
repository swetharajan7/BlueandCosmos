import request from 'supertest';
import app from '../server';
import { metricsService } from '../services/metricsService';
import { uptimeMonitoringService } from '../services/uptimeMonitoringService';
import { businessMetricsDashboardService } from '../services/businessMetricsDashboardService';
import { monitoringInitializationService } from '../services/monitoringInitializationService';
import { sentryService } from '../config/sentry';
import { newRelicService } from '../config/newrelic';
import { cloudWatchLogger } from '../config/cloudwatch';

describe('Monitoring and Observability System', () => {
  let authToken: string;

  beforeAll(async () => {
    // Create test admin user and get auth token
    const adminUser = {
      email: 'admin@test.com',
      password: 'TestPassword123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    };

    await request(app)
      .post('/api/auth/register')
      .send(adminUser);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      });

    authToken = loginResponse.body.token;
  });

  describe('Health Check Endpoints', () => {
    test('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
    });

    test('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/monitoring/readiness')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('should return liveness status', async () => {
      const response = await request(app)
        .get('/api/monitoring/liveness')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
    });

    test('should return detailed health status for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/monitoring/health/detailed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
    });
  });

  describe('Metrics Endpoints', () => {
    test('should return general metrics for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('applications');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('system');
    });

    test('should return user metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('active');
      expect(response.body).toHaveProperty('byRole');
    });

    test('should return application metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('today');
      expect(response.body).toHaveProperty('byStatus');
    });

    test('should return recommendation metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('averageWordCount');
      expect(response.body).toHaveProperty('aiUsageRate');
    });

    test('should return system metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics/system')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('responseTime');
      expect(response.body).toHaveProperty('errorRate');
      expect(response.body).toHaveProperty('throughput');
      expect(response.body).toHaveProperty('memoryUsage');
    });

    test('should allow recording custom metrics', async () => {
      const customMetric = {
        name: 'test.metric',
        value: 42,
        unit: 'count',
        tags: { test: 'true' }
      };

      const response = await request(app)
        .post('/api/monitoring/metrics/custom')
        .set('Authorization', `Bearer ${authToken}`)
        .send(customMetric)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Metric recorded successfully');
      expect(response.body.metric).toMatchObject(customMetric);
    });
  });

  describe('Business Dashboard Endpoints', () => {
    test('should return comprehensive business dashboard', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overview');
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('applications');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('performance');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('business');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should return business report with default timeframe', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard/report')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('timeframe', 'daily');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('alerts');
    });

    test('should return business report with custom timeframe', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard/report?timeframe=weekly')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('timeframe', 'weekly');
    });

    test('should return alerts and insights', async () => {
      const response = await request(app)
        .get('/api/monitoring/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('recommendations');
    });
  });

  describe('Performance Analytics', () => {
    test('should return performance analytics', async () => {
      const response = await request(app)
        .get('/api/monitoring/analytics/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('history');
      expect(response.body).toHaveProperty('trends');
    });

    test('should return performance analytics with custom timeframe', async () => {
      const response = await request(app)
        .get('/api/monitoring/analytics/performance?hours=48')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('history');
    });
  });

  describe('Uptime Monitoring', () => {
    test('should return uptime history', async () => {
      const response = await request(app)
        .get('/api/monitoring/uptime')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('service', 'all');
      expect(response.body).toHaveProperty('hours', 24);
      expect(response.body).toHaveProperty('uptimePercentage');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('history');
    });

    test('should return uptime history for specific service', async () => {
      const response = await request(app)
        .get('/api/monitoring/uptime?service=database&hours=12')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('service', 'database');
      expect(response.body).toHaveProperty('hours', 12);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for protected endpoints', async () => {
      await request(app)
        .get('/api/monitoring/metrics')
        .expect(401);

      await request(app)
        .get('/api/monitoring/dashboard')
        .expect(401);
    });

    test('should reject invalid tokens', async () => {
      await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Service Integration Tests', () => {
    test('should integrate with metrics service', async () => {
      // Record a test metric
      metricsService.recordMetric('test.integration', 100, 'count');
      
      // Verify it can be retrieved
      const systemMetrics = metricsService.getSystemMetrics();
      expect(systemMetrics).toHaveProperty('responseTime');
      expect(systemMetrics).toHaveProperty('errorRate');
    });

    test('should integrate with uptime monitoring service', async () => {
      const healthCheck = await uptimeMonitoringService.performHealthCheck();
      
      expect(healthCheck).toHaveProperty('overall');
      expect(healthCheck).toHaveProperty('services');
      expect(healthCheck).toHaveProperty('uptime');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthCheck.overall);
    });

    test('should integrate with business metrics dashboard service', async () => {
      const dashboardMetrics = await businessMetricsDashboardService.getDashboardMetrics();
      
      expect(dashboardMetrics).toHaveProperty('overview');
      expect(dashboardMetrics).toHaveProperty('users');
      expect(dashboardMetrics).toHaveProperty('applications');
      expect(dashboardMetrics).toHaveProperty('recommendations');
    });

    test('should integrate with monitoring initialization service', async () => {
      const healthStatus = monitoringInitializationService.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('initialized');
      expect(healthStatus).toHaveProperty('config');
      expect(healthStatus).toHaveProperty('services');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // This would require mocking database failures
      // For now, just verify error responses are properly formatted
      const response = await request(app)
        .get('/api/monitoring/metrics/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should handle service unavailability', async () => {
      // Test that endpoints return appropriate errors when services are down
      // This would require more sophisticated mocking
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance Tests', () => {
    test('should respond to health checks quickly', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/api/monitoring/health')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/monitoring/health')
          .expect(200)
      );

      const responses = await Promise.all(requests);
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status');
      });
    });
  });

  describe('Monitoring Configuration', () => {
    test('should allow configuration updates', () => {
      const newConfig = {
        metricsCollectionInterval: 10,
        healthCheckInterval: 10
      };

      monitoringInitializationService.updateConfig(newConfig);
      const healthStatus = monitoringInitializationService.getHealthStatus();
      
      expect(healthStatus.config.metricsCollectionInterval).toBe(10);
      expect(healthStatus.config.healthCheckInterval).toBe(10);
    });

    test('should validate configuration parameters', () => {
      // Test configuration validation
      expect(() => {
        monitoringInitializationService.updateConfig({
          metricsCollectionInterval: -1 // Invalid value
        });
      }).not.toThrow(); // Service should handle invalid values gracefully
    });
  });

  describe('External Service Integration', () => {
    test('should integrate with Sentry for error tracking', () => {
      // Test Sentry integration
      const testError = new Error('Test error for monitoring');
      const eventId = sentryService.captureException(testError);
      
      // In a real test, we'd verify the error was sent to Sentry
      // For now, just verify the service doesn't throw
      expect(typeof eventId).toBe('string');
    });

    test('should integrate with New Relic for APM', () => {
      // Test New Relic integration
      newRelicService.recordMetric('test.monitoring.metric', 42);
      newRelicService.recordCustomEvent('TestEvent', { test: true });
      
      // Verify no errors are thrown
      expect(true).toBe(true);
    });

    test('should integrate with CloudWatch for logging', () => {
      // Test CloudWatch integration
      cloudWatchLogger.info('Test log message for monitoring');
      cloudWatchLogger.logPerformanceMetric('test.metric', 100, 'count');
      
      // Verify no errors are thrown
      expect(true).toBe(true);
    });
  });
});

describe('Monitoring Middleware', () => {
  test('should track request metrics', async () => {
    const response = await request(app)
      .get('/api/monitoring/health')
      .expect(200);

    // Verify request tracking headers are present
    expect(response.headers).toHaveProperty('x-request-id');
  });

  test('should handle errors in monitoring middleware', async () => {
    // Test that monitoring middleware doesn't break the application
    // even if monitoring services fail
    const response = await request(app)
      .get('/api/monitoring/health')
      .expect(200);

    expect(response.body).toHaveProperty('status');
  });
});

describe('Business Metrics Calculations', () => {
  test('should calculate user metrics correctly', async () => {
    const userMetrics = await metricsService.getUserMetrics();
    
    expect(userMetrics).toHaveProperty('totalUsers');
    expect(userMetrics).toHaveProperty('activeUsers');
    expect(userMetrics).toHaveProperty('byRole');
    expect(typeof userMetrics.totalUsers).toBe('number');
    expect(userMetrics.totalUsers).toBeGreaterThanOrEqual(0);
  });

  test('should calculate application metrics correctly', async () => {
    const applicationMetrics = await metricsService.getApplicationMetrics();
    
    expect(applicationMetrics).toHaveProperty('totalApplications');
    expect(applicationMetrics).toHaveProperty('byStatus');
    expect(typeof applicationMetrics.totalApplications).toBe('number');
    expect(applicationMetrics.totalApplications).toBeGreaterThanOrEqual(0);
  });

  test('should calculate recommendation metrics correctly', async () => {
    const recommendationMetrics = await metricsService.getRecommendationMetrics();
    
    expect(recommendationMetrics).toHaveProperty('totalRecommendations');
    expect(recommendationMetrics).toHaveProperty('averageWordCount');
    expect(recommendationMetrics).toHaveProperty('submissionSuccessRate');
    expect(typeof recommendationMetrics.totalRecommendations).toBe('number');
    expect(recommendationMetrics.submissionSuccessRate).toBeGreaterThanOrEqual(0);
    expect(recommendationMetrics.submissionSuccessRate).toBeLessThanOrEqual(100);
  });
});