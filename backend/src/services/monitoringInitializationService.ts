import { Express } from 'express';
import { sentryService } from '../config/sentry';
import { newRelicService } from '../config/newrelic';
import { cloudWatchLogger } from '../config/cloudwatch';
import { metricsService } from './metricsService';
import { uptimeMonitoringService } from './uptimeMonitoringService';
import { businessMetricsDashboardService } from './businessMetricsDashboardService';

export interface MonitoringConfig {
  enableNewRelic: boolean;
  enableSentry: boolean;
  enableCloudWatch: boolean;
  enableUptimeMonitoring: boolean;
  enableBusinessMetrics: boolean;
  metricsCollectionInterval: number; // minutes
  healthCheckInterval: number; // minutes
  alertThresholds: {
    errorRate: number; // percentage
    responseTime: number; // milliseconds
    memoryUsage: number; // percentage
    diskUsage: number; // percentage
  };
}

export const defaultMonitoringConfig: MonitoringConfig = {
  enableNewRelic: process.env.NODE_ENV === 'production',
  enableSentry: process.env.NODE_ENV === 'production',
  enableCloudWatch: process.env.NODE_ENV === 'production',
  enableUptimeMonitoring: true,
  enableBusinessMetrics: true,
  metricsCollectionInterval: 5,
  healthCheckInterval: 5,
  alertThresholds: {
    errorRate: 5,
    responseTime: 1000,
    memoryUsage: 80,
    diskUsage: 85
  }
};

export class MonitoringInitializationService {
  private static instance: MonitoringInitializationService;
  private config: MonitoringConfig;
  private initialized = false;

  private constructor(config: MonitoringConfig = defaultMonitoringConfig) {
    this.config = config;
  }

  public static getInstance(config?: MonitoringConfig): MonitoringInitializationService {
    if (!MonitoringInitializationService.instance) {
      MonitoringInitializationService.instance = new MonitoringInitializationService(config);
    }
    return MonitoringInitializationService.instance;
  }

  public async initialize(app: Express): Promise<void> {
    if (this.initialized) {
      cloudWatchLogger.warn('Monitoring already initialized');
      return;
    }

    try {
      cloudWatchLogger.info('Initializing monitoring and observability system...');

      // Initialize Sentry first (for error tracking)
      if (this.config.enableSentry) {
        await this.initializeSentry(app);
      }

      // Initialize New Relic (for APM)
      if (this.config.enableNewRelic) {
        await this.initializeNewRelic();
      }

      // Initialize CloudWatch logging
      if (this.config.enableCloudWatch) {
        await this.initializeCloudWatch();
      }

      // Initialize uptime monitoring
      if (this.config.enableUptimeMonitoring) {
        await this.initializeUptimeMonitoring();
      }

      // Initialize business metrics collection
      if (this.config.enableBusinessMetrics) {
        await this.initializeBusinessMetrics();
      }

      // Set up periodic tasks
      this.setupPeriodicTasks();

      // Set up error handlers
      this.setupErrorHandlers(app);

      // Set up graceful shutdown
      this.setupGracefulShutdown();

      this.initialized = true;
      cloudWatchLogger.info('Monitoring and observability system initialized successfully');

      // Record initialization event
      newRelicService.recordCustomEvent('MonitoringInitialized', {
        timestamp: new Date().toISOString(),
        config: {
          newRelic: this.config.enableNewRelic,
          sentry: this.config.enableSentry,
          cloudWatch: this.config.enableCloudWatch,
          uptimeMonitoring: this.config.enableUptimeMonitoring,
          businessMetrics: this.config.enableBusinessMetrics
        }
      });

    } catch (error) {
      cloudWatchLogger.error('Failed to initialize monitoring system', error as Error);
      throw error;
    }
  }

  private async initializeSentry(app: Express): Promise<void> {
    try {
      sentryService.initialize(app);
      cloudWatchLogger.info('Sentry error tracking initialized');
    } catch (error) {
      cloudWatchLogger.error('Failed to initialize Sentry', error as Error);
      throw error;
    }
  }

  private async initializeNewRelic(): Promise<void> {
    try {
      // New Relic is initialized via the newrelic.js file at startup
      // Just verify it's working
      newRelicService.recordMetric('monitoring.initialization', 1);
      cloudWatchLogger.info('New Relic APM initialized');
    } catch (error) {
      cloudWatchLogger.error('Failed to initialize New Relic', error as Error);
      throw error;
    }
  }

  private async initializeCloudWatch(): Promise<void> {
    try {
      cloudWatchLogger.info('CloudWatch logging initialized');
    } catch (error) {
      cloudWatchLogger.error('Failed to initialize CloudWatch', error as Error);
      throw error;
    }
  }

  private async initializeUptimeMonitoring(): Promise<void> {
    try {
      // Perform initial health check
      await uptimeMonitoringService.performHealthCheck();
      cloudWatchLogger.info('Uptime monitoring initialized');
    } catch (error) {
      cloudWatchLogger.error('Failed to initialize uptime monitoring', error as Error);
      throw error;
    }
  }

  private async initializeBusinessMetrics(): Promise<void> {
    try {
      // Perform initial metrics collection
      await businessMetricsDashboardService.getDashboardMetrics();
      cloudWatchLogger.info('Business metrics dashboard initialized');
    } catch (error) {
      cloudWatchLogger.error('Failed to initialize business metrics', error as Error);
      throw error;
    }
  }

  private setupPeriodicTasks(): void {
    // Start metrics collection
    if (this.config.enableBusinessMetrics) {
      metricsService.startMetricsCollection(this.config.metricsCollectionInterval);
    }

    // Start periodic health checks
    if (this.config.enableUptimeMonitoring) {
      uptimeMonitoringService.startPeriodicHealthChecks(this.config.healthCheckInterval);
    }

    // Set up alert monitoring
    this.setupAlertMonitoring();

    cloudWatchLogger.info('Periodic monitoring tasks started');
  }

  private setupAlertMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkAlertThresholds();
      } catch (error) {
        cloudWatchLogger.error('Failed to check alert thresholds', error as Error);
      }
    }, 60000); // Check every minute
  }

  private async checkAlertThresholds(): Promise<void> {
    const systemMetrics = metricsService.getSystemMetrics();
    const systemHealth = await uptimeMonitoringService.performHealthCheck();

    // Check error rate threshold
    if (systemMetrics.errorRate > this.config.alertThresholds.errorRate) {
      const message = `High error rate detected: ${systemMetrics.errorRate}%`;
      cloudWatchLogger.error(message);
      sentryService.captureMessage(message, 'error');
      newRelicService.recordCustomEvent('AlertTriggered', {
        type: 'high_error_rate',
        value: systemMetrics.errorRate,
        threshold: this.config.alertThresholds.errorRate,
        timestamp: new Date().toISOString()
      });
    }

    // Check response time threshold
    if (systemMetrics.responseTime > this.config.alertThresholds.responseTime) {
      const message = `High response time detected: ${systemMetrics.responseTime}ms`;
      cloudWatchLogger.warn(message);
      sentryService.captureMessage(message, 'warning');
    }

    // Check memory usage threshold
    if (systemMetrics.memoryUsage > this.config.alertThresholds.memoryUsage) {
      const message = `High memory usage detected: ${systemMetrics.memoryUsage}%`;
      cloudWatchLogger.warn(message);
      sentryService.captureMessage(message, 'warning');
    }

    // Check system health
    if (systemHealth.overall === 'unhealthy') {
      const message = 'System health is unhealthy';
      cloudWatchLogger.error(message);
      sentryService.captureMessage(message, 'error');
      newRelicService.recordCustomEvent('AlertTriggered', {
        type: 'system_unhealthy',
        services: systemHealth.services.filter(s => s.status === 'unhealthy').map(s => s.service),
        timestamp: new Date().toISOString()
      });
    }
  }

  private setupErrorHandlers(app: Express): void {
    // Add Sentry error handler (must be after all other middleware)
    if (this.config.enableSentry) {
      app.use(sentryService.getErrorHandler());
    }

    // Global error handler
    app.use((error: Error, req: any, res: any, next: any) => {
      cloudWatchLogger.error('Unhandled application error', error);
      sentryService.captureException(error);
      newRelicService.noticeError(error);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal server error',
          requestId: req.requestId,
          timestamp: new Date()
        });
      }
    });

    cloudWatchLogger.info('Error handlers configured');
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      cloudWatchLogger.info(`Received ${signal}, starting graceful shutdown...`);
      
      // Record shutdown event
      newRelicService.recordCustomEvent('ApplicationShutdown', {
        signal,
        timestamp: new Date().toISOString()
      });

      // Give time for final logs to be sent
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      cloudWatchLogger.error('Uncaught exception', error);
      sentryService.captureException(error);
      newRelicService.noticeError(error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      cloudWatchLogger.error('Unhandled promise rejection', error);
      sentryService.captureException(error);
      newRelicService.noticeError(error);
    });

    cloudWatchLogger.info('Graceful shutdown handlers configured');
  }

  public getHealthStatus(): any {
    return {
      initialized: this.initialized,
      config: this.config,
      services: {
        newRelic: this.config.enableNewRelic,
        sentry: this.config.enableSentry,
        cloudWatch: this.config.enableCloudWatch,
        uptimeMonitoring: this.config.enableUptimeMonitoring,
        businessMetrics: this.config.enableBusinessMetrics
      },
      timestamp: new Date()
    };
  }

  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    cloudWatchLogger.info('Monitoring configuration updated', { newConfig });
  }

  public async performHealthCheck(): Promise<any> {
    const systemHealth = await uptimeMonitoringService.performHealthCheck();
    const businessMetrics = await businessMetricsDashboardService.getDashboardMetrics();
    
    return {
      monitoring: this.getHealthStatus(),
      system: systemHealth,
      business: {
        totalUsers: businessMetrics.users.total,
        activeUsers: businessMetrics.users.active,
        systemHealth: businessMetrics.system.health,
        successRate: businessMetrics.overview.successRate
      },
      timestamp: new Date()
    };
  }
}

export const monitoringInitializationService = MonitoringInitializationService.getInstance();