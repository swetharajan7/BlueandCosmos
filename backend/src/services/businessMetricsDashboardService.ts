import { metricsService } from './metricsService';
import { uptimeMonitoringService } from './uptimeMonitoringService';
import { cloudWatchLogger } from '../config/cloudwatch';
import { sentryService } from '../config/sentry';
import { newRelicService } from '../config/newrelic';

export interface DashboardMetrics {
  overview: OverviewMetrics;
  users: UserAnalytics;
  applications: ApplicationAnalytics;
  recommendations: RecommendationAnalytics;
  system: SystemAnalytics;
  performance: PerformanceMetrics;
  errors: ErrorAnalytics;
  business: BusinessKPIs;
  timestamp: Date;
}

export interface OverviewMetrics {
  totalUsers: number;
  activeUsers: number;
  totalApplications: number;
  totalRecommendations: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  successRate: number;
}

export interface UserAnalytics {
  total: number;
  active: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  byRole: Record<string, number>;
  retentionRate: number;
  averageSessionDuration: number;
  topActions: Array<{ action: string; count: number }>;
}

export interface ApplicationAnalytics {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: Record<string, number>;
  byProgramType: Record<string, number>;
  averageUniversities: number;
  completionRate: number;
  averageTimeToComplete: number;
  topUniversities: Array<{ university: string; count: number }>;
}

export interface RecommendationAnalytics {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: Record<string, number>;
  averageWordCount: number;
  aiUsageRate: number;
  submissionSuccessRate: number;
  averageTimeToWrite: number;
  qualityScores: {
    average: number;
    distribution: Record<string, number>;
  };
}

export interface SystemAnalytics {
  health: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  services: Array<{
    name: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    uptime: number;
    responseTime: number;
  }>;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  slowestEndpoints: Array<{
    endpoint: string;
    averageTime: number;
    count: number;
  }>;
  errorRate: number;
}

export interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  byType: Record<string, number>;
  byEndpoint: Record<string, number>;
  recentErrors: Array<{
    timestamp: Date;
    error: string;
    endpoint: string;
    userId?: string;
  }>;
  criticalErrors: number;
}

export interface BusinessKPIs {
  conversionRate: number;
  averageApplicationsPerUser: number;
  averageRecommendationsPerApplication: number;
  timeToFirstRecommendation: number;
  userSatisfactionScore: number;
  churnRate: number;
  growthRate: number;
  revenue: {
    total: number;
    monthly: number;
    perUser: number;
  };
}

export class BusinessMetricsDashboardService {
  private static instance: BusinessMetricsDashboardService;

  private constructor() {}

  public static getInstance(): BusinessMetricsDashboardService {
    if (!BusinessMetricsDashboardService.instance) {
      BusinessMetricsDashboardService.instance = new BusinessMetricsDashboardService();
    }
    return BusinessMetricsDashboardService.instance;
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const [
        overview,
        users,
        applications,
        recommendations,
        system,
        performance,
        errors,
        business
      ] = await Promise.all([
        this.getOverviewMetrics(),
        this.getUserAnalytics(),
        this.getApplicationAnalytics(),
        this.getRecommendationAnalytics(),
        this.getSystemAnalytics(),
        this.getPerformanceMetrics(),
        this.getErrorAnalytics(),
        this.getBusinessKPIs()
      ]);

      const dashboardMetrics: DashboardMetrics = {
        overview,
        users,
        applications,
        recommendations,
        system,
        performance,
        errors,
        business,
        timestamp: new Date()
      };

      // Record dashboard access
      newRelicService.recordCustomEvent('DashboardAccess', {
        timestamp: new Date().toISOString(),
        metricsCount: Object.keys(dashboardMetrics).length
      });

      return dashboardMetrics;
    } catch (error) {
      cloudWatchLogger.error('Failed to get dashboard metrics', error as Error);
      sentryService.captureException(error as Error);
      throw error;
    }
  }

  private async getOverviewMetrics(): Promise<OverviewMetrics> {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const [usersResult, activeUsersResult, appsResult, recsResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'30 days\''),
        pool.query('SELECT COUNT(*) as count FROM applications'),
        pool.query('SELECT COUNT(*) as count FROM recommendations')
      ]);

      const systemHealth = await uptimeMonitoringService.performHealthCheck();
      const uptime = Date.now() - new Date().getTime();

      // Calculate success rate based on successful submissions
      const successResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN s.status = 'confirmed' THEN 1 END) as successful,
          COUNT(*) as total
        FROM submissions s
        WHERE s.created_at > NOW() - INTERVAL '24 hours'
      `);

      const successRate = successResult.rows[0].total > 0 
        ? (successResult.rows[0].successful / successResult.rows[0].total) * 100 
        : 100;

      return {
        totalUsers: parseInt(usersResult.rows[0].count),
        activeUsers: parseInt(activeUsersResult.rows[0].count),
        totalApplications: parseInt(appsResult.rows[0].count),
        totalRecommendations: parseInt(recsResult.rows[0].count),
        systemHealth: systemHealth.overall,
        uptime,
        successRate
      };
    } finally {
      await pool.end();
    }
  }

  private async getUserAnalytics(): Promise<UserAnalytics> {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const [
        totalResult,
        activeResult,
        todayResult,
        weekResult,
        monthResult,
        roleResult,
        retentionResult,
        actionsResult
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM users WHERE last_login > NOW() - INTERVAL \'30 days\''),
        pool.query('SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'1 day\''),
        pool.query('SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'7 days\''),
        pool.query('SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL \'30 days\''),
        pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role'),
        pool.query(`
          SELECT 
            COUNT(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active,
            COUNT(*) as total
          FROM users 
          WHERE created_at < NOW() - INTERVAL '30 days'
        `),
        pool.query(`
          SELECT action, COUNT(*) as count 
          FROM user_actions 
          WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY action 
          ORDER BY count DESC 
          LIMIT 10
        `)
      ]);

      const byRole: Record<string, number> = {};
      roleResult.rows.forEach((row: any) => {
        byRole[row.role] = parseInt(row.count);
      });

      const retentionData = retentionResult.rows[0];
      const retentionRate = retentionData.total > 0 
        ? (retentionData.active / retentionData.total) * 100 
        : 0;

      const topActions = actionsResult.rows.map((row: any) => ({
        action: row.action,
        count: parseInt(row.count)
      }));

      return {
        total: parseInt(totalResult.rows[0].count),
        active: parseInt(activeResult.rows[0].count),
        newToday: parseInt(todayResult.rows[0].count),
        newThisWeek: parseInt(weekResult.rows[0].count),
        newThisMonth: parseInt(monthResult.rows[0].count),
        byRole,
        retentionRate,
        averageSessionDuration: 0, // Would need session tracking
        topActions
      };
    } finally {
      await pool.end();
    }
  }

  private async getApplicationAnalytics(): Promise<ApplicationAnalytics> {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const [
        totalResult,
        todayResult,
        weekResult,
        monthResult,
        statusResult,
        programResult,
        avgUniversitiesResult,
        completionResult,
        universityResult
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM applications'),
        pool.query('SELECT COUNT(*) as count FROM applications WHERE created_at > NOW() - INTERVAL \'1 day\''),
        pool.query('SELECT COUNT(*) as count FROM applications WHERE created_at > NOW() - INTERVAL \'7 days\''),
        pool.query('SELECT COUNT(*) as count FROM applications WHERE created_at > NOW() - INTERVAL \'30 days\''),
        pool.query('SELECT status, COUNT(*) as count FROM applications GROUP BY status'),
        pool.query('SELECT program_type, COUNT(*) as count FROM applications GROUP BY program_type'),
        pool.query('SELECT AVG(array_length(universities, 1)) as avg FROM applications WHERE universities IS NOT NULL'),
        pool.query(`
          SELECT 
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(*) as total
          FROM applications
        `),
        pool.query(`
          SELECT university, COUNT(*) as count
          FROM (
            SELECT unnest(universities) as university
            FROM applications
            WHERE universities IS NOT NULL
          ) t
          GROUP BY university
          ORDER BY count DESC
          LIMIT 10
        `)
      ]);

      const byStatus: Record<string, number> = {};
      statusResult.rows.forEach((row: any) => {
        byStatus[row.status] = parseInt(row.count);
      });

      const byProgramType: Record<string, number> = {};
      programResult.rows.forEach((row: any) => {
        byProgramType[row.program_type] = parseInt(row.count);
      });

      const completionData = completionResult.rows[0];
      const completionRate = completionData.total > 0 
        ? (completionData.completed / completionData.total) * 100 
        : 0;

      const topUniversities = universityResult.rows.map((row: any) => ({
        university: row.university,
        count: parseInt(row.count)
      }));

      return {
        total: parseInt(totalResult.rows[0].count),
        today: parseInt(todayResult.rows[0].count),
        thisWeek: parseInt(weekResult.rows[0].count),
        thisMonth: parseInt(monthResult.rows[0].count),
        byStatus,
        byProgramType,
        averageUniversities: parseFloat(avgUniversitiesResult.rows[0].avg || '0'),
        completionRate,
        averageTimeToComplete: 0, // Would need time tracking
        topUniversities
      };
    } finally {
      await pool.end();
    }
  }

  private async getRecommendationAnalytics(): Promise<RecommendationAnalytics> {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const [
        totalResult,
        todayResult,
        weekResult,
        monthResult,
        statusResult,
        avgWordCountResult,
        aiUsageResult,
        successRateResult,
        qualityResult
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM recommendations'),
        pool.query('SELECT COUNT(*) as count FROM recommendations WHERE created_at > NOW() - INTERVAL \'1 day\''),
        pool.query('SELECT COUNT(*) as count FROM recommendations WHERE created_at > NOW() - INTERVAL \'7 days\''),
        pool.query('SELECT COUNT(*) as count FROM recommendations WHERE created_at > NOW() - INTERVAL \'30 days\''),
        pool.query('SELECT status, COUNT(*) as count FROM recommendations GROUP BY status'),
        pool.query('SELECT AVG(word_count) as avg FROM recommendations WHERE word_count > 0'),
        pool.query(`
          SELECT 
            COUNT(CASE WHEN ai_assistance_used = true THEN 1 END) as ai_used,
            COUNT(*) as total
          FROM recommendations
        `),
        pool.query(`
          SELECT 
            COUNT(CASE WHEN s.status = 'confirmed' THEN 1 END) as successful,
            COUNT(*) as total
          FROM recommendations r
          LEFT JOIN submissions s ON r.id = s.recommendation_id
          WHERE r.status = 'submitted'
        `),
        pool.query(`
          SELECT 
            AVG(quality_score) as avg_score,
            COUNT(CASE WHEN quality_score >= 90 THEN 1 END) as excellent,
            COUNT(CASE WHEN quality_score >= 70 AND quality_score < 90 THEN 1 END) as good,
            COUNT(CASE WHEN quality_score >= 50 AND quality_score < 70 THEN 1 END) as fair,
            COUNT(CASE WHEN quality_score < 50 THEN 1 END) as poor,
            COUNT(*) as total
          FROM recommendations 
          WHERE quality_score IS NOT NULL
        `)
      ]);

      const byStatus: Record<string, number> = {};
      statusResult.rows.forEach((row: any) => {
        byStatus[row.status] = parseInt(row.count);
      });

      const aiUsageData = aiUsageResult.rows[0];
      const aiUsageRate = aiUsageData.total > 0 
        ? (aiUsageData.ai_used / aiUsageData.total) * 100 
        : 0;

      const successData = successRateResult.rows[0];
      const submissionSuccessRate = successData.total > 0 
        ? (successData.successful / successData.total) * 100 
        : 0;

      const qualityData = qualityResult.rows[0];
      const qualityDistribution: Record<string, number> = {
        excellent: parseInt(qualityData.excellent || '0'),
        good: parseInt(qualityData.good || '0'),
        fair: parseInt(qualityData.fair || '0'),
        poor: parseInt(qualityData.poor || '0')
      };

      return {
        total: parseInt(totalResult.rows[0].count),
        today: parseInt(todayResult.rows[0].count),
        thisWeek: parseInt(weekResult.rows[0].count),
        thisMonth: parseInt(monthResult.rows[0].count),
        byStatus,
        averageWordCount: parseFloat(avgWordCountResult.rows[0].avg || '0'),
        aiUsageRate,
        submissionSuccessRate,
        averageTimeToWrite: 0, // Would need time tracking
        qualityScores: {
          average: parseFloat(qualityData.avg_score || '0'),
          distribution: qualityDistribution
        }
      };
    } finally {
      await pool.end();
    }
  }

  private async getSystemAnalytics(): Promise<SystemAnalytics> {
    const systemHealth = await uptimeMonitoringService.performHealthCheck();
    const detailedMetrics = await uptimeMonitoringService.getDetailedMetrics();

    const process = require('process');
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      health: systemHealth.overall,
      uptime: systemHealth.uptime,
      services: systemHealth.services.map(service => ({
        name: service.service,
        status: service.status,
        uptime: uptimeMonitoringService.getUptimePercentage(service.service),
        responseTime: service.responseTime
      })),
      resources: {
        cpu: (cpuUsage.user + cpuUsage.system) / 1000000,
        memory: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        disk: 0 // Would need disk usage monitoring
      }
    };
  }

  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // This would typically come from stored metrics
    const systemMetrics = metricsService.getSystemMetrics();

    return {
      averageResponseTime: systemMetrics.responseTime,
      p95ResponseTime: systemMetrics.responseTime * 1.5, // Approximation
      p99ResponseTime: systemMetrics.responseTime * 2, // Approximation
      throughput: systemMetrics.throughput,
      slowestEndpoints: [], // Would need endpoint-specific tracking
      errorRate: systemMetrics.errorRate
    };
  }

  private async getErrorAnalytics(): Promise<ErrorAnalytics> {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const [errorCountResult, errorTypeResult, recentErrorsResult] = await Promise.all([
        pool.query(`
          SELECT COUNT(*) as total_errors
          FROM error_logs 
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `),
        pool.query(`
          SELECT error_type, COUNT(*) as count
          FROM error_logs 
          WHERE created_at > NOW() - INTERVAL '24 hours'
          GROUP BY error_type
          ORDER BY count DESC
        `),
        pool.query(`
          SELECT created_at, error_message, endpoint, user_id
          FROM error_logs 
          WHERE created_at > NOW() - INTERVAL '1 hour'
          ORDER BY created_at DESC
          LIMIT 20
        `)
      ]);

      const totalErrors = parseInt(errorCountResult.rows[0]?.total_errors || '0');
      const systemMetrics = metricsService.getSystemMetrics();

      const byType: Record<string, number> = {};
      errorTypeResult.rows.forEach((row: any) => {
        byType[row.error_type] = parseInt(row.count);
      });

      const recentErrors = recentErrorsResult.rows.map((row: any) => ({
        timestamp: row.created_at,
        error: row.error_message,
        endpoint: row.endpoint,
        userId: row.user_id
      }));

      return {
        totalErrors,
        errorRate: systemMetrics.errorRate,
        byType,
        byEndpoint: {}, // Would need endpoint-specific error tracking
        recentErrors,
        criticalErrors: Object.values(byType).reduce((sum, count) => sum + count, 0)
      };
    } finally {
      await pool.end();
    }
  }

  private async getBusinessKPIs(): Promise<BusinessKPIs> {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const [
        conversionResult,
        avgAppsResult,
        avgRecsResult,
        churnResult,
        growthResult
      ] = await Promise.all([
        pool.query(`
          SELECT 
            COUNT(CASE WHEN a.id IS NOT NULL THEN 1 END) as converted,
            COUNT(u.id) as total_users
          FROM users u
          LEFT JOIN applications a ON u.id = a.student_id
          WHERE u.created_at > NOW() - INTERVAL '30 days'
        `),
        pool.query(`
          SELECT AVG(app_count) as avg_apps
          FROM (
            SELECT student_id, COUNT(*) as app_count
            FROM applications
            GROUP BY student_id
          ) t
        `),
        pool.query(`
          SELECT AVG(rec_count) as avg_recs
          FROM (
            SELECT application_id, COUNT(*) as rec_count
            FROM recommendations
            GROUP BY application_id
          ) t
        `),
        pool.query(`
          SELECT 
            COUNT(CASE WHEN last_login < NOW() - INTERVAL '60 days' THEN 1 END) as churned,
            COUNT(*) as total
          FROM users
          WHERE created_at < NOW() - INTERVAL '60 days'
        `),
        pool.query(`
          SELECT 
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as this_month,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '60 days' AND created_at <= NOW() - INTERVAL '30 days' THEN 1 END) as last_month
          FROM users
        `)
      ]);

      const conversionData = conversionResult.rows[0];
      const conversionRate = conversionData.total_users > 0 
        ? (conversionData.converted / conversionData.total_users) * 100 
        : 0;

      const churnData = churnResult.rows[0];
      const churnRate = churnData.total > 0 
        ? (churnData.churned / churnData.total) * 100 
        : 0;

      const growthData = growthResult.rows[0];
      const growthRate = growthData.last_month > 0 
        ? ((growthData.this_month - growthData.last_month) / growthData.last_month) * 100 
        : 0;

      return {
        conversionRate,
        averageApplicationsPerUser: parseFloat(avgAppsResult.rows[0]?.avg_apps || '0'),
        averageRecommendationsPerApplication: parseFloat(avgRecsResult.rows[0]?.avg_recs || '0'),
        timeToFirstRecommendation: 0, // Would need time tracking
        userSatisfactionScore: 0, // Would need satisfaction surveys
        churnRate,
        growthRate,
        revenue: {
          total: 0, // Would need revenue tracking
          monthly: 0,
          perUser: 0
        }
      };
    } finally {
      await pool.end();
    }
  }

  public async generateReport(timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<any> {
    try {
      const metrics = await this.getDashboardMetrics();
      
      const report = {
        timeframe,
        generatedAt: new Date(),
        summary: {
          totalUsers: metrics.users.total,
          activeUsers: metrics.users.active,
          totalApplications: metrics.applications.total,
          totalRecommendations: metrics.recommendations.total,
          systemHealth: metrics.system.health,
          successRate: metrics.overview.successRate
        },
        insights: this.generateInsights(metrics),
        recommendations: this.generateRecommendations(metrics),
        alerts: this.generateAlerts(metrics)
      };

      // Log report generation
      cloudWatchLogger.info('Business metrics report generated', {
        timeframe,
        metricsIncluded: Object.keys(metrics).length
      });

      newRelicService.recordCustomEvent('ReportGenerated', {
        type: 'business_metrics',
        timeframe,
        timestamp: new Date().toISOString()
      });

      return report;
    } catch (error) {
      cloudWatchLogger.error('Failed to generate business metrics report', error as Error);
      sentryService.captureException(error as Error);
      throw error;
    }
  }

  private generateInsights(metrics: DashboardMetrics): string[] {
    const insights: string[] = [];

    // User insights
    if (metrics.users.newToday > metrics.users.newThisWeek / 7) {
      insights.push('User registration is above average today');
    }

    // Application insights
    if (metrics.applications.completionRate < 50) {
      insights.push('Application completion rate is below 50% - consider UX improvements');
    }

    // Recommendation insights
    if (metrics.recommendations.aiUsageRate > 80) {
      insights.push('High AI assistance usage indicates strong feature adoption');
    }

    // System insights
    if (metrics.system.health !== 'healthy') {
      insights.push('System health requires attention');
    }

    return insights;
  }

  private generateRecommendations(metrics: DashboardMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.performance.errorRate > 5) {
      recommendations.push('Consider investigating high error rate');
    }

    if (metrics.business.churnRate > 20) {
      recommendations.push('Implement user retention strategies');
    }

    if (metrics.recommendations.submissionSuccessRate < 90) {
      recommendations.push('Review university integration reliability');
    }

    return recommendations;
  }

  private generateAlerts(metrics: DashboardMetrics): Array<{ level: 'info' | 'warning' | 'critical'; message: string }> {
    const alerts: Array<{ level: 'info' | 'warning' | 'critical'; message: string }> = [];

    if (metrics.system.health === 'unhealthy') {
      alerts.push({ level: 'critical', message: 'System health is critical' });
    }

    if (metrics.performance.errorRate > 10) {
      alerts.push({ level: 'critical', message: 'Error rate is critically high' });
    }

    if (metrics.business.churnRate > 30) {
      alerts.push({ level: 'warning', message: 'Churn rate is concerning' });
    }

    return alerts;
  }
}

export const businessMetricsDashboardService = BusinessMetricsDashboardService.getInstance();