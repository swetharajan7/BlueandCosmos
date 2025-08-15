import { cloudWatchLogger } from '../config/cloudwatch';
import { newRelicService } from '../config/newrelic';
import { sentryService } from '../config/sentry';

export interface BusinessMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newRegistrations: number;
  usersByRole: Record<string, number>;
}

export interface ApplicationMetrics {
  totalApplications: number;
  applicationsToday: number;
  applicationsByStatus: Record<string, number>;
  averageUniversitiesPerApplication: number;
}

export interface RecommendationMetrics {
  totalRecommendations: number;
  recommendationsToday: number;
  averageWordCount: number;
  aiAssistanceUsage: number;
  submissionSuccessRate: number;
}

export interface SystemMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class MetricsService {
  private static instance: MetricsService;
  private metrics: BusinessMetric[] = [];
  private maxMetricsHistory = 10000;

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  public recordMetric(name: string, value: number, unit: string, tags?: Record<string, string>): void {
    const metric: BusinessMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    this.metrics.push(metric);
    
    // Keep metrics history manageable
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Send to monitoring services
    cloudWatchLogger.logPerformanceMetric(name, value, unit, tags);
    newRelicService.recordMetric(name, value);
    
    // Add custom attributes to New Relic
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        newRelicService.addCustomAttribute(`metric.${key}`, value);
      });
    }
  }

  public recordUserAction(action: string, userId?: string, metadata?: any): void {
    this.recordMetric('user.action', 1, 'count', {
      action,
      userId: userId || 'anonymous'
    });

    newRelicService.recordCustomEvent('UserAction', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...metadata
    });

    cloudWatchLogger.logUserAction(userId || 'anonymous', action, 'system', metadata);
  }

  public recordApplicationEvent(event: string, applicationId: string, metadata?: any): void {
    this.recordMetric('application.event', 1, 'count', {
      event,
      applicationId
    });

    newRelicService.recordCustomEvent('ApplicationEvent', {
      event,
      applicationId,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  public recordRecommendationEvent(event: string, recommendationId: string, metadata?: any): void {
    this.recordMetric('recommendation.event', 1, 'count', {
      event,
      recommendationId
    });

    newRelicService.recordCustomEvent('RecommendationEvent', {
      event,
      recommendationId,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  public recordPerformanceMetric(operation: string, duration: number, success: boolean): void {
    this.recordMetric(`performance.${operation}.duration`, duration, 'milliseconds');
    this.recordMetric(`performance.${operation}.success`, success ? 1 : 0, 'count');

    if (duration > 1000) { // Log slow operations
      cloudWatchLogger.warn(`Slow operation detected: ${operation} took ${duration}ms`);
      sentryService.capturePerformanceIssue(operation, duration, 1000);
    }
  }

  public async getUserMetrics(): Promise<UserMetrics> {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      const [totalUsersResult, activeUsersResult, newRegistrationsResult, usersByRoleResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'30 days\''),
        pool.query('SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'1 day\''),
        pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role')
      ]);

      await pool.end();

      const usersByRole: Record<string, number> = {};
      usersByRoleResult.rows.forEach((row: any) => {
        usersByRole[row.role] = parseInt(row.count);
      });

      const metrics: UserMetrics = {
        totalUsers: parseInt(totalUsersResult.rows[0].count),
        activeUsers: parseInt(activeUsersResult.rows[0].count),
        newRegistrations: parseInt(newRegistrationsResult.rows[0].count),
        usersByRole
      };

      // Record metrics
      this.recordMetric('users.total', metrics.totalUsers, 'count');
      this.recordMetric('users.active', metrics.activeUsers, 'count');
      this.recordMetric('users.new_registrations', metrics.newRegistrations, 'count');

      return metrics;
    } catch (error) {
      cloudWatchLogger.error('Failed to get user metrics', error as Error);
      sentryService.captureException(error as Error);
      throw error;
    }
  }

  public async getApplicationMetrics(): Promise<ApplicationMetrics> {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      const [totalAppsResult, todayAppsResult, statusResult, avgUniversitiesResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM applications'),
        pool.query('SELECT COUNT(*) as count FROM applications WHERE created_at > NOW() - INTERVAL \'1 day\''),
        pool.query('SELECT status, COUNT(*) as count FROM applications GROUP BY status'),
        pool.query('SELECT AVG(array_length(universities, 1)) as avg FROM applications WHERE universities IS NOT NULL')
      ]);

      await pool.end();

      const applicationsByStatus: Record<string, number> = {};
      statusResult.rows.forEach((row: any) => {
        applicationsByStatus[row.status] = parseInt(row.count);
      });

      const metrics: ApplicationMetrics = {
        totalApplications: parseInt(totalAppsResult.rows[0].count),
        applicationsToday: parseInt(todayAppsResult.rows[0].count),
        applicationsByStatus,
        averageUniversitiesPerApplication: parseFloat(avgUniversitiesResult.rows[0].avg || '0')
      };

      // Record metrics
      this.recordMetric('applications.total', metrics.totalApplications, 'count');
      this.recordMetric('applications.today', metrics.applicationsToday, 'count');
      this.recordMetric('applications.avg_universities', metrics.averageUniversitiesPerApplication, 'count');

      return metrics;
    } catch (error) {
      cloudWatchLogger.error('Failed to get application metrics', error as Error);
      sentryService.captureException(error as Error);
      throw error;
    }
  }

  public async getRecommendationMetrics(): Promise<RecommendationMetrics> {
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });

      const [totalRecsResult, todayRecsResult, avgWordCountResult, aiUsageResult, successRateResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM recommendations'),
        pool.query('SELECT COUNT(*) as count FROM recommendations WHERE created_at > NOW() - INTERVAL \'1 day\''),
        pool.query('SELECT AVG(word_count) as avg FROM recommendations WHERE word_count > 0'),
        pool.query('SELECT COUNT(*) as count FROM recommendations WHERE ai_assistance_used = true'),
        pool.query(`
          SELECT 
            COUNT(CASE WHEN s.status = 'confirmed' THEN 1 END) as successful,
            COUNT(*) as total
          FROM recommendations r
          LEFT JOIN submissions s ON r.id = s.recommendation_id
          WHERE r.status = 'submitted'
        `)
      ]);

      await pool.end();

      const successData = successRateResult.rows[0];
      const successRate = successData.total > 0 ? (successData.successful / successData.total) * 100 : 0;

      const metrics: RecommendationMetrics = {
        totalRecommendations: parseInt(totalRecsResult.rows[0].count),
        recommendationsToday: parseInt(todayRecsResult.rows[0].count),
        averageWordCount: parseFloat(avgWordCountResult.rows[0].avg || '0'),
        aiAssistanceUsage: parseInt(aiUsageResult.rows[0].count),
        submissionSuccessRate: successRate
      };

      // Record metrics
      this.recordMetric('recommendations.total', metrics.totalRecommendations, 'count');
      this.recordMetric('recommendations.today', metrics.recommendationsToday, 'count');
      this.recordMetric('recommendations.avg_word_count', metrics.averageWordCount, 'count');
      this.recordMetric('recommendations.ai_usage', metrics.aiAssistanceUsage, 'count');
      this.recordMetric('recommendations.success_rate', metrics.submissionSuccessRate, 'percentage');

      return metrics;
    } catch (error) {
      cloudWatchLogger.error('Failed to get recommendation metrics', error as Error);
      sentryService.captureException(error as Error);
      throw error;
    }
  }

  public getSystemMetrics(): SystemMetrics {
    const process = require('process');
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics: SystemMetrics = {
      responseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate(),
      throughput: this.getThroughput(),
      memoryUsage: memUsage.heapUsed / 1024 / 1024, // MB
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to seconds
    };

    // Record system metrics
    this.recordMetric('system.response_time', metrics.responseTime, 'milliseconds');
    this.recordMetric('system.error_rate', metrics.errorRate, 'percentage');
    this.recordMetric('system.throughput', metrics.throughput, 'requests_per_minute');
    this.recordMetric('system.memory_usage', metrics.memoryUsage, 'megabytes');
    this.recordMetric('system.cpu_usage', metrics.cpuUsage, 'seconds');

    return metrics;
  }

  private getAverageResponseTime(): number {
    const responseTimeMetrics = this.metrics.filter(m => m.name.includes('response_time'));
    if (responseTimeMetrics.length === 0) return 0;
    
    const total = responseTimeMetrics.reduce((sum, metric) => sum + metric.value, 0);
    return total / responseTimeMetrics.length;
  }

  private getErrorRate(): number {
    const errorMetrics = this.metrics.filter(m => m.name.includes('error'));
    const totalMetrics = this.metrics.filter(m => m.name.includes('request'));
    
    if (totalMetrics.length === 0) return 0;
    
    return (errorMetrics.length / totalMetrics.length) * 100;
  }

  private getThroughput(): number {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    const recentRequests = this.metrics.filter(m => 
      m.name.includes('request') && m.timestamp >= oneMinuteAgo
    );
    
    return recentRequests.length;
  }

  public async getDashboardData(): Promise<any> {
    try {
      const [userMetrics, applicationMetrics, recommendationMetrics, systemMetrics] = await Promise.all([
        this.getUserMetrics(),
        this.getApplicationMetrics(),
        this.getRecommendationMetrics(),
        Promise.resolve(this.getSystemMetrics())
      ]);

      return {
        users: userMetrics,
        applications: applicationMetrics,
        recommendations: recommendationMetrics,
        system: systemMetrics,
        timestamp: new Date()
      };
    } catch (error) {
      cloudWatchLogger.error('Failed to get dashboard data', error as Error);
      sentryService.captureException(error as Error);
      throw error;
    }
  }

  public startMetricsCollection(intervalMinutes: number = 5): void {
    const interval = intervalMinutes * 60 * 1000;
    
    setInterval(async () => {
      try {
        await this.getDashboardData();
        cloudWatchLogger.info('Metrics collection completed');
      } catch (error) {
        cloudWatchLogger.error('Failed to collect metrics', error as Error);
        sentryService.captureException(error as Error);
      }
    }, interval);

    cloudWatchLogger.info(`Started metrics collection every ${intervalMinutes} minutes`);
  }
}

export const metricsService = MetricsService.getInstance();