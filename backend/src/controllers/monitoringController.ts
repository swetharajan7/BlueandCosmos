import { Request, Response } from 'express';
import { uptimeMonitoringService } from '../services/uptimeMonitoringService';
import { metricsService } from '../services/metricsService';
import { businessMetricsDashboardService } from '../services/businessMetricsDashboardService';
import { cloudWatchLogger } from '../config/cloudwatch';
import { sentryService } from '../config/sentry';

export class MonitoringController {
  public async getHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await uptimeMonitoringService.performHealthCheck();
      
      const statusCode = health.overall === 'healthy' ? 200 : 
                        health.overall === 'degraded' ? 206 : 503;
      
      res.status(statusCode).json({
        status: health.overall,
        timestamp: health.timestamp,
        uptime: health.uptime,
        services: health.services
      });
    } catch (error) {
      cloudWatchLogger.error('Health check failed', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date()
      });
    }
  }

  public async getDetailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await uptimeMonitoringService.getDetailedMetrics();
      res.json(metrics);
    } catch (error) {
      cloudWatchLogger.error('Failed to get detailed health metrics', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get health metrics',
        timestamp: new Date()
      });
    }
  }

  public async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const dashboardData = await metricsService.getDashboardData();
      res.json(dashboardData);
    } catch (error) {
      cloudWatchLogger.error('Failed to get metrics', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get metrics',
        timestamp: new Date()
      });
    }
  }

  public async getUserMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userMetrics = await metricsService.getUserMetrics();
      res.json(userMetrics);
    } catch (error) {
      cloudWatchLogger.error('Failed to get user metrics', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get user metrics',
        timestamp: new Date()
      });
    }
  }

  public async getApplicationMetrics(req: Request, res: Response): Promise<void> {
    try {
      const applicationMetrics = await metricsService.getApplicationMetrics();
      res.json(applicationMetrics);
    } catch (error) {
      cloudWatchLogger.error('Failed to get application metrics', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get application metrics',
        timestamp: new Date()
      });
    }
  }

  public async getRecommendationMetrics(req: Request, res: Response): Promise<void> {
    try {
      const recommendationMetrics = await metricsService.getRecommendationMetrics();
      res.json(recommendationMetrics);
    } catch (error) {
      cloudWatchLogger.error('Failed to get recommendation metrics', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get recommendation metrics',
        timestamp: new Date()
      });
    }
  }

  public async getSystemMetrics(req: Request, res: Response): Promise<void> {
    try {
      const systemMetrics = metricsService.getSystemMetrics();
      res.json(systemMetrics);
    } catch (error) {
      cloudWatchLogger.error('Failed to get system metrics', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get system metrics',
        timestamp: new Date()
      });
    }
  }

  public async getUptimeHistory(req: Request, res: Response): Promise<void> {
    try {
      const { service, hours } = req.query;
      const hoursNum = hours ? parseInt(hours as string) : 24;
      
      const history = uptimeMonitoringService.getHealthHistory(service as string, hoursNum);
      const uptimePercentage = uptimeMonitoringService.getUptimePercentage(service as string, hoursNum);
      const averageResponseTime = uptimeMonitoringService.getAverageResponseTime(service as string, hoursNum);
      
      res.json({
        service: service || 'all',
        hours: hoursNum,
        uptimePercentage,
        averageResponseTime,
        history
      });
    } catch (error) {
      cloudWatchLogger.error('Failed to get uptime history', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get uptime history',
        timestamp: new Date()
      });
    }
  }

  public async recordCustomMetric(req: Request, res: Response): Promise<void> {
    try {
      const { name, value, unit, tags } = req.body;
      
      if (!name || value === undefined || !unit) {
        return res.status(400).json({
          error: 'Missing required fields: name, value, unit'
        });
      }
      
      metricsService.recordMetric(name, value, unit, tags);
      
      res.json({
        message: 'Metric recorded successfully',
        metric: { name, value, unit, tags },
        timestamp: new Date()
      });
    } catch (error) {
      cloudWatchLogger.error('Failed to record custom metric', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to record metric',
        timestamp: new Date()
      });
    }
  }

  public async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      // Simple readiness check - just verify we can respond
      res.json({
        status: 'ready',
        timestamp: new Date(),
        version: process.env.APP_VERSION || '1.0.0'
      });
    } catch (error) {
      res.status(500).json({
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  public async getLiveness(req: Request, res: Response): Promise<void> {
    try {
      // Simple liveness check - verify basic functionality
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      res.json({
        status: 'alive',
        uptime,
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024)
        },
        timestamp: new Date()
      });
    } catch (error) {
      res.status(500).json({
        status: 'not alive',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  public async getBusinessDashboard(req: Request, res: Response): Promise<void> {
    try {
      const dashboardMetrics = await businessMetricsDashboardService.getDashboardMetrics();
      res.json(dashboardMetrics);
    } catch (error) {
      cloudWatchLogger.error('Failed to get business dashboard metrics', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get business dashboard metrics',
        timestamp: new Date()
      });
    }
  }

  public async getBusinessReport(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe } = req.query;
      const validTimeframes = ['daily', 'weekly', 'monthly'];
      const selectedTimeframe = validTimeframes.includes(timeframe as string) 
        ? (timeframe as 'daily' | 'weekly' | 'monthly') 
        : 'daily';

      const report = await businessMetricsDashboardService.generateReport(selectedTimeframe);
      res.json(report);
    } catch (error) {
      cloudWatchLogger.error('Failed to generate business report', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to generate business report',
        timestamp: new Date()
      });
    }
  }

  public async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const dashboardMetrics = await businessMetricsDashboardService.getDashboardMetrics();
      const report = await businessMetricsDashboardService.generateReport();
      
      res.json({
        alerts: report.alerts,
        insights: report.insights,
        recommendations: report.recommendations,
        timestamp: new Date()
      });
    } catch (error) {
      cloudWatchLogger.error('Failed to get alerts', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get alerts',
        timestamp: new Date()
      });
    }
  }

  public async getPerformanceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { hours } = req.query;
      const hoursNum = hours ? parseInt(hours as string) : 24;
      
      const systemMetrics = metricsService.getSystemMetrics();
      const uptimeHistory = uptimeMonitoringService.getHealthHistory(undefined, hoursNum);
      
      const performanceData = {
        current: systemMetrics,
        history: uptimeHistory,
        trends: {
          responseTime: this.calculateTrend(uptimeHistory.map(h => h.responseTime)),
          errorRate: systemMetrics.errorRate,
          throughput: systemMetrics.throughput
        },
        timestamp: new Date()
      };
      
      res.json(performanceData);
    } catch (error) {
      cloudWatchLogger.error('Failed to get performance analytics', error as Error);
      sentryService.captureException(error as Error);
      
      res.status(500).json({
        error: 'Failed to get performance analytics',
        timestamp: new Date()
      });
    }
  }

  private calculateTrend(values: number[]): { direction: 'up' | 'down' | 'stable'; percentage: number } {
    if (values.length < 2) {
      return { direction: 'stable', percentage: 0 };
    }
    
    const recent = values.slice(-Math.min(10, values.length));
    const older = values.slice(0, Math.min(10, values.length));
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      percentage: Math.abs(change)
    };
  }
}

export const monitoringController = new MonitoringController();