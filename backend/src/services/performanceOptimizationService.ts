import { metricsService } from './metricsService';
// import { emailService } from './emailService';
import { AppError } from '../utils/AppError';

interface PerformanceMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  databaseResponseTime: number;
  cacheHitRate: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
}

interface OptimizationRecommendation {
  id: string;
  category: 'database' | 'cache' | 'network' | 'application' | 'infrastructure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedImprovement: string;
  status: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  createdAt: Date;
  completedAt?: Date;
}

interface PerformanceAlert {
  id: string;
  type: 'cpu_high' | 'memory_high' | 'disk_full' | 'slow_response' | 'high_error_rate';
  severity: 'warning' | 'critical';
  message: string;
  metrics: any;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

class PerformanceOptimizationService {
  private metricsHistory: PerformanceMetrics[] = [];
  private recommendations: OptimizationRecommendation[] = [];
  private alerts: PerformanceAlert[] = [];
  private isMonitoring = false;

  async startPerformanceMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('Starting performance monitoring...');

    // Collect metrics every 30 seconds
    setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.analyzePerformance();
        await this.generateRecommendations();
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, 30000);
  }

  async stopPerformanceMonitoring(): Promise<void> {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        cpuUsage: 65, // Simulate CPU usage
        memoryUsage: 72, // Simulate memory usage
        diskUsage: 45, // Simulate disk usage
        networkLatency: await this.measureNetworkLatency(),
        databaseResponseTime: await this.measureDatabaseResponseTime(),
        cacheHitRate: await this.measureCacheHitRate(),
        activeConnections: await this.getActiveConnections(),
        requestsPerSecond: await this.getRequestsPerSecond(),
        errorRate: await this.getErrorRate()
      };

      // Keep only last 1000 metrics (about 8 hours at 30-second intervals)
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory.shift();
      }

      return metrics;
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
      throw new AppError('Metrics collection failed', 500);
    }
  }

  async analyzePerformance(): Promise<void> {
    if (this.metricsHistory.length === 0) {
      return;
    }

    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const alerts: PerformanceAlert[] = [];

    // CPU usage alerts
    if (latestMetrics.cpuUsage > 90) {
      alerts.push({
        id: this.generateId(),
        type: 'cpu_high',
        severity: 'critical',
        message: `Critical CPU usage: ${latestMetrics.cpuUsage}%`,
        metrics: { cpuUsage: latestMetrics.cpuUsage },
        timestamp: new Date(),
        acknowledged: false
      });
    } else if (latestMetrics.cpuUsage > 80) {
      alerts.push({
        id: this.generateId(),
        type: 'cpu_high',
        severity: 'warning',
        message: `High CPU usage: ${latestMetrics.cpuUsage}%`,
        metrics: { cpuUsage: latestMetrics.cpuUsage },
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Memory usage alerts
    if (latestMetrics.memoryUsage > 95) {
      alerts.push({
        id: this.generateId(),
        type: 'memory_high',
        severity: 'critical',
        message: `Critical memory usage: ${latestMetrics.memoryUsage}%`,
        metrics: { memoryUsage: latestMetrics.memoryUsage },
        timestamp: new Date(),
        acknowledged: false
      });
    } else if (latestMetrics.memoryUsage > 85) {
      alerts.push({
        id: this.generateId(),
        type: 'memory_high',
        severity: 'warning',
        message: `High memory usage: ${latestMetrics.memoryUsage}%`,
        metrics: { memoryUsage: latestMetrics.memoryUsage },
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Disk usage alerts
    if (latestMetrics.diskUsage > 95) {
      alerts.push({
        id: this.generateId(),
        type: 'disk_full',
        severity: 'critical',
        message: `Critical disk usage: ${latestMetrics.diskUsage}%`,
        metrics: { diskUsage: latestMetrics.diskUsage },
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Response time alerts
    if (latestMetrics.databaseResponseTime > 5000) {
      alerts.push({
        id: this.generateId(),
        type: 'slow_response',
        severity: 'critical',
        message: `Slow database response: ${latestMetrics.databaseResponseTime}ms`,
        metrics: { databaseResponseTime: latestMetrics.databaseResponseTime },
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Error rate alerts
    if (latestMetrics.errorRate > 0.1) {
      alerts.push({
        id: this.generateId(),
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate: ${(latestMetrics.errorRate * 100).toFixed(2)}%`,
        metrics: { errorRate: latestMetrics.errorRate },
        timestamp: new Date(),
        acknowledged: false
      });
    }

    // Add new alerts and send notifications
    for (const alert of alerts) {
      this.alerts.push(alert);
      await this.sendAlertNotification(alert);
    }
  }

  async generateRecommendations(): Promise<void> {
    if (this.metricsHistory.length < 10) {
      return; // Need at least 10 data points for analysis
    }

    const recentMetrics = this.metricsHistory.slice(-10);
    const avgMetrics = this.calculateAverageMetrics(recentMetrics);
    const newRecommendations: OptimizationRecommendation[] = [];

    // Database optimization recommendations
    if (avgMetrics.databaseResponseTime > 1000) {
      newRecommendations.push({
        id: this.generateId(),
        category: 'database',
        priority: avgMetrics.databaseResponseTime > 3000 ? 'high' : 'medium',
        title: 'Optimize Database Queries',
        description: 'Database response times are consistently high, indicating potential query optimization opportunities.',
        impact: 'Improved response times and reduced server load',
        implementation: 'Review slow query logs, add database indexes, optimize complex queries',
        estimatedImprovement: '30-50% reduction in response time',
        status: 'pending',
        createdAt: new Date()
      });
    }

    // Cache optimization recommendations
    if (avgMetrics.cacheHitRate < 0.8) {
      newRecommendations.push({
        id: this.generateId(),
        category: 'cache',
        priority: 'medium',
        title: 'Improve Cache Hit Rate',
        description: `Cache hit rate is ${(avgMetrics.cacheHitRate * 100).toFixed(1)}%, which is below optimal levels.`,
        impact: 'Reduced database load and faster response times',
        implementation: 'Review caching strategy, increase cache TTL for stable data, implement cache warming',
        estimatedImprovement: '20-30% improvement in response time',
        status: 'pending',
        createdAt: new Date()
      });
    }

    // Memory optimization recommendations
    if (avgMetrics.memoryUsage > 80) {
      newRecommendations.push({
        id: this.generateId(),
        category: 'application',
        priority: avgMetrics.memoryUsage > 90 ? 'high' : 'medium',
        title: 'Optimize Memory Usage',
        description: `Memory usage is consistently high at ${avgMetrics.memoryUsage.toFixed(1)}%.`,
        impact: 'Improved system stability and performance',
        implementation: 'Profile application for memory leaks, optimize data structures, implement garbage collection tuning',
        estimatedImprovement: '15-25% reduction in memory usage',
        status: 'pending',
        createdAt: new Date()
      });
    }

    // CPU optimization recommendations
    if (avgMetrics.cpuUsage > 75) {
      newRecommendations.push({
        id: this.generateId(),
        category: 'application',
        priority: avgMetrics.cpuUsage > 85 ? 'high' : 'medium',
        title: 'Optimize CPU Usage',
        description: `CPU usage is consistently high at ${avgMetrics.cpuUsage.toFixed(1)}%.`,
        impact: 'Better system responsiveness and capacity for more users',
        implementation: 'Profile CPU-intensive operations, optimize algorithms, implement async processing',
        estimatedImprovement: '20-30% reduction in CPU usage',
        status: 'pending',
        createdAt: new Date()
      });
    }

    // Infrastructure scaling recommendations
    if (avgMetrics.requestsPerSecond > 100 && (avgMetrics.cpuUsage > 70 || avgMetrics.memoryUsage > 70)) {
      newRecommendations.push({
        id: this.generateId(),
        category: 'infrastructure',
        priority: 'high',
        title: 'Scale Infrastructure',
        description: 'High request volume with elevated resource usage indicates need for scaling.',
        impact: 'Improved performance and user experience under load',
        implementation: 'Add more server instances, implement load balancing, consider auto-scaling',
        estimatedImprovement: '40-60% improvement in response time under load',
        status: 'pending',
        createdAt: new Date()
      });
    }

    // Add new recommendations (avoid duplicates)
    for (const newRec of newRecommendations) {
      const exists = this.recommendations.some(rec => 
        rec.title === newRec.title && rec.status === 'pending'
      );
      if (!exists) {
        this.recommendations.push(newRec);
      }
    }
  }

  async getPerformanceReport(): Promise<{
    summary: string;
    currentMetrics: PerformanceMetrics | null;
    trends: any;
    recommendations: OptimizationRecommendation[];
    alerts: PerformanceAlert[];
  }> {
    const currentMetrics = this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1] 
      : null;

    const trends = this.calculateTrends();
    const activeAlerts = this.alerts.filter(a => !a.acknowledged);
    const pendingRecommendations = this.recommendations.filter(r => r.status === 'pending');

    const summary = this.generatePerformanceSummary(currentMetrics, trends, activeAlerts);

    return {
      summary,
      currentMetrics,
      trends,
      recommendations: pendingRecommendations,
      alerts: activeAlerts
    };
  }

  async implementRecommendation(recommendationId: string): Promise<void> {
    const recommendation = this.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) {
      throw new AppError('Recommendation not found', 404);
    }

    recommendation.status = 'in_progress';
    
    // In a real implementation, this would trigger actual optimization tasks
    console.log(`Implementing recommendation: ${recommendation.title}`);
    
    // Simulate implementation time
    setTimeout(() => {
      recommendation.status = 'completed';
      recommendation.completedAt = new Date();
      console.log(`Completed recommendation: ${recommendation.title}`);
    }, 5000);
  }

  async dismissRecommendation(recommendationId: string): Promise<void> {
    const recommendation = this.recommendations.find(r => r.id === recommendationId);
    if (!recommendation) {
      throw new AppError('Recommendation not found', 404);
    }

    recommendation.status = 'dismissed';
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    alert.acknowledged = true;
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      throw new AppError('Alert not found', 404);
    }

    alert.acknowledged = true;
    alert.resolvedAt = new Date();
  }

  private async measureNetworkLatency(): Promise<number> {
    // Simulate network latency measurement
    return Math.random() * 100 + 10; // 10-110ms
  }

  private async measureDatabaseResponseTime(): Promise<number> {
    // Simulate database response time measurement
    return Math.random() * 500 + 50; // 50-550ms
  }

  private async measureCacheHitRate(): Promise<number> {
    // Simulate cache hit rate measurement
    return Math.random() * 0.3 + 0.7; // 70-100%
  }

  private async getActiveConnections(): Promise<number> {
    // Simulate active connections count
    return Math.floor(Math.random() * 100) + 10; // 10-110 connections
  }

  private async getRequestsPerSecond(): Promise<number> {
    // Simulate requests per second
    return Math.floor(Math.random() * 200) + 20; // 20-220 RPS
  }

  private async getErrorRate(): Promise<number> {
    // Simulate error rate
    return Math.random() * 0.05; // 0-5%
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const avg = metrics.reduce((acc, m) => ({
      timestamp: new Date(),
      cpuUsage: acc.cpuUsage + m.cpuUsage,
      memoryUsage: acc.memoryUsage + m.memoryUsage,
      diskUsage: acc.diskUsage + m.diskUsage,
      networkLatency: acc.networkLatency + m.networkLatency,
      databaseResponseTime: acc.databaseResponseTime + m.databaseResponseTime,
      cacheHitRate: acc.cacheHitRate + m.cacheHitRate,
      activeConnections: acc.activeConnections + m.activeConnections,
      requestsPerSecond: acc.requestsPerSecond + m.requestsPerSecond,
      errorRate: acc.errorRate + m.errorRate
    }), {
      timestamp: new Date(),
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkLatency: 0,
      databaseResponseTime: 0,
      cacheHitRate: 0,
      activeConnections: 0,
      requestsPerSecond: 0,
      errorRate: 0
    });

    const count = metrics.length;
    return {
      timestamp: new Date(),
      cpuUsage: avg.cpuUsage / count,
      memoryUsage: avg.memoryUsage / count,
      diskUsage: avg.diskUsage / count,
      networkLatency: avg.networkLatency / count,
      databaseResponseTime: avg.databaseResponseTime / count,
      cacheHitRate: avg.cacheHitRate / count,
      activeConnections: avg.activeConnections / count,
      requestsPerSecond: avg.requestsPerSecond / count,
      errorRate: avg.errorRate / count
    };
  }

  private calculateTrends(): any {
    if (this.metricsHistory.length < 20) {
      return null;
    }

    const recent = this.metricsHistory.slice(-10);
    const previous = this.metricsHistory.slice(-20, -10);

    const recentAvg = this.calculateAverageMetrics(recent);
    const previousAvg = this.calculateAverageMetrics(previous);

    return {
      cpuUsage: {
        current: recentAvg.cpuUsage,
        change: recentAvg.cpuUsage - previousAvg.cpuUsage,
        trend: recentAvg.cpuUsage > previousAvg.cpuUsage ? 'increasing' : 'decreasing'
      },
      memoryUsage: {
        current: recentAvg.memoryUsage,
        change: recentAvg.memoryUsage - previousAvg.memoryUsage,
        trend: recentAvg.memoryUsage > previousAvg.memoryUsage ? 'increasing' : 'decreasing'
      },
      responseTime: {
        current: recentAvg.databaseResponseTime,
        change: recentAvg.databaseResponseTime - previousAvg.databaseResponseTime,
        trend: recentAvg.databaseResponseTime > previousAvg.databaseResponseTime ? 'increasing' : 'decreasing'
      }
    };
  }

  private generatePerformanceSummary(
    currentMetrics: PerformanceMetrics | null,
    trends: any,
    alerts: PerformanceAlert[]
  ): string {
    if (!currentMetrics) {
      return 'No performance data available';
    }

    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = alerts.filter(a => a.severity === 'warning').length;

    let summary = `System performance: CPU ${currentMetrics.cpuUsage.toFixed(1)}%, Memory ${currentMetrics.memoryUsage.toFixed(1)}%, Response time ${currentMetrics.databaseResponseTime.toFixed(0)}ms`;

    if (criticalAlerts > 0) {
      summary += `. ${criticalAlerts} critical alert${criticalAlerts > 1 ? 's' : ''} active`;
    }

    if (warningAlerts > 0) {
      summary += `. ${warningAlerts} warning${warningAlerts > 1 ? 's' : ''} active`;
    }

    return summary;
  }

  private async sendAlertNotification(alert: PerformanceAlert): Promise<void> {
    try {
      const subject = `Performance Alert: ${alert.type.replace('_', ' ').toUpperCase()}`;
      const message = `${alert.message}\n\nTimestamp: ${alert.timestamp.toISOString()}\nSeverity: ${alert.severity}`;

      // Simulate email notification
      console.log('Performance alert notification:', subject, message);
    } catch (error) {
      console.error('Failed to send alert notification:', error);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

export const performanceOptimizationService = new PerformanceOptimizationService();