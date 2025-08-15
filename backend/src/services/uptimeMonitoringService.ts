import axios from 'axios';
import { cloudWatchLogger } from '../config/cloudwatch';
import { sentryService } from '../config/sentry';

export interface HealthCheck {
  name: string;
  url?: string;
  check: () => Promise<boolean>;
  timeout: number;
  critical: boolean;
}

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  timestamp: Date;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthStatus[];
  uptime: number;
  timestamp: Date;
}

export class UptimeMonitoringService {
  private static instance: UptimeMonitoringService;
  private healthChecks: HealthCheck[] = [];
  private startTime: Date;
  private healthHistory: HealthStatus[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    this.startTime = new Date();
    this.initializeHealthChecks();
  }

  public static getInstance(): UptimeMonitoringService {
    if (!UptimeMonitoringService.instance) {
      UptimeMonitoringService.instance = new UptimeMonitoringService();
    }
    return UptimeMonitoringService.instance;
  }

  private initializeHealthChecks(): void {
    // Database health check
    this.healthChecks.push({
      name: 'database',
      check: async () => {
        try {
          const { Pool } = require('pg');
          const pool = new Pool({
            connectionString: process.env.DATABASE_URL
          });
          const result = await pool.query('SELECT 1');
          await pool.end();
          return result.rows.length > 0;
        } catch (error) {
          return false;
        }
      },
      timeout: 5000,
      critical: true
    });

    // Redis health check
    this.healthChecks.push({
      name: 'redis',
      check: async () => {
        try {
          const redis = require('redis');
          const client = redis.createClient({
            url: process.env.REDIS_URL
          });
          await client.connect();
          await client.ping();
          await client.disconnect();
          return true;
        } catch (error) {
          return false;
        }
      },
      timeout: 3000,
      critical: true
    });

    // OpenAI API health check
    this.healthChecks.push({
      name: 'openai',
      check: async () => {
        try {
          const response = await axios.get('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            timeout: 10000
          });
          return response.status === 200;
        } catch (error) {
          return false;
        }
      },
      timeout: 10000,
      critical: false
    });

    // Google Docs API health check
    this.healthChecks.push({
      name: 'google-docs',
      check: async () => {
        try {
          // Simple check to see if we can access Google APIs
          const response = await axios.get('https://www.googleapis.com/discovery/v1/apis/docs/v1/rest', {
            timeout: 5000
          });
          return response.status === 200;
        } catch (error) {
          return false;
        }
      },
      timeout: 5000,
      critical: false
    });

    // SendGrid API health check
    this.healthChecks.push({
      name: 'sendgrid',
      check: async () => {
        try {
          const response = await axios.get('https://api.sendgrid.com/v3/user/profile', {
            headers: {
              'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`
            },
            timeout: 5000
          });
          return response.status === 200;
        } catch (error) {
          return false;
        }
      },
      timeout: 5000,
      critical: false
    });
  }

  public async performHealthCheck(): Promise<SystemHealth> {
    const serviceStatuses: HealthStatus[] = [];
    let criticalFailures = 0;
    let totalFailures = 0;

    for (const healthCheck of this.healthChecks) {
      const startTime = Date.now();
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let error: string | undefined;

      try {
        const isHealthy = await Promise.race([
          healthCheck.check(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), healthCheck.timeout)
          )
        ]);

        if (!isHealthy) {
          status = 'unhealthy';
          totalFailures++;
          if (healthCheck.critical) {
            criticalFailures++;
          }
        }
      } catch (err) {
        status = 'unhealthy';
        error = err instanceof Error ? err.message : 'Unknown error';
        totalFailures++;
        if (healthCheck.critical) {
          criticalFailures++;
        }
      }

      const responseTime = Date.now() - startTime;
      const healthStatus: HealthStatus = {
        service: healthCheck.name,
        status,
        responseTime,
        timestamp: new Date(),
        error
      };

      serviceStatuses.push(healthStatus);
      this.addToHistory(healthStatus);

      // Log unhealthy services
      if (status === 'unhealthy') {
        cloudWatchLogger.error(`Health check failed for ${healthCheck.name}`, new Error(error || 'Health check failed'), {
          service: healthCheck.name,
          responseTime,
          critical: healthCheck.critical
        });

        sentryService.captureMessage(
          `Health check failed: ${healthCheck.name}`,
          healthCheck.critical ? 'error' : 'warning'
        );
      }
    }

    // Determine overall system health
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (criticalFailures > 0) {
      overallStatus = 'unhealthy';
    } else if (totalFailures > 0) {
      overallStatus = 'degraded';
    }

    const uptime = Date.now() - this.startTime.getTime();

    const systemHealth: SystemHealth = {
      overall: overallStatus,
      services: serviceStatuses,
      uptime,
      timestamp: new Date()
    };

    // Log system health metrics
    cloudWatchLogger.logPerformanceMetric('system.health.overall', overallStatus === 'healthy' ? 1 : 0, 'count');
    cloudWatchLogger.logPerformanceMetric('system.health.critical_failures', criticalFailures, 'count');
    cloudWatchLogger.logPerformanceMetric('system.health.total_failures', totalFailures, 'count');
    cloudWatchLogger.logPerformanceMetric('system.uptime', uptime, 'milliseconds');

    return systemHealth;
  }

  private addToHistory(status: HealthStatus): void {
    this.healthHistory.push(status);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  public getHealthHistory(service?: string, hours: number = 24): HealthStatus[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    let history = this.healthHistory.filter(status => status.timestamp >= cutoff);
    
    if (service) {
      history = history.filter(status => status.service === service);
    }
    
    return history;
  }

  public getUptimePercentage(service?: string, hours: number = 24): number {
    const history = this.getHealthHistory(service, hours);
    if (history.length === 0) return 100;

    const healthyCount = history.filter(status => status.status === 'healthy').length;
    return (healthyCount / history.length) * 100;
  }

  public getAverageResponseTime(service?: string, hours: number = 24): number {
    const history = this.getHealthHistory(service, hours);
    if (history.length === 0) return 0;

    const totalResponseTime = history.reduce((sum, status) => sum + status.responseTime, 0);
    return totalResponseTime / history.length;
  }

  public startPeriodicHealthChecks(intervalMinutes: number = 5): void {
    const interval = intervalMinutes * 60 * 1000;
    
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        cloudWatchLogger.error('Failed to perform periodic health check', error as Error);
        sentryService.captureException(error as Error);
      }
    }, interval);

    cloudWatchLogger.info(`Started periodic health checks every ${intervalMinutes} minutes`);
  }

  public async getDetailedMetrics(): Promise<any> {
    const systemHealth = await this.performHealthCheck();
    
    return {
      system: systemHealth,
      uptime: {
        total: Date.now() - this.startTime.getTime(),
        percentage: this.getUptimePercentage(),
        startTime: this.startTime
      },
      services: this.healthChecks.map(check => ({
        name: check.name,
        critical: check.critical,
        uptime: this.getUptimePercentage(check.name),
        averageResponseTime: this.getAverageResponseTime(check.name)
      }))
    };
  }
}

export const uptimeMonitoringService = UptimeMonitoringService.getInstance();