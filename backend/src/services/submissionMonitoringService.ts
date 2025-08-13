import { Pool } from 'pg';
import { SubmissionAnalyticsService } from './submissionAnalyticsService';
import { AdminNotificationService } from './adminNotificationService';
import { ErrorLoggingService } from './errorLoggingService';
import { SubmissionQueueService } from './submissionQueueService';
import { WebSocketService } from './websocketService';
import { EmailService } from './emailService';

export interface MonitoringDashboard {
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    lastCheck: Date;
  };
  realTimeMetrics: {
    activeSubmissions: number;
    queueLength: number;
    processingRate: number;
    successRate: number;
    averageProcessingTime: number;
  };
  alerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
  recentActivity: Array<{
    type: 'submission' | 'error' | 'notification';
    message: string;
    timestamp: Date;
    severity?: string;
  }>;
  performanceMetrics: {
    hourlyThroughput: Array<{
      hour: string;
      submissions: number;
      successes: number;
      failures: number;
    }>;
    universityPerformance: Array<{
      universityName: string;
      successRate: number;
      averageTime: number;
      status: 'healthy' | 'degraded' | 'down';
    }>;
  };
}

export class SubmissionMonitoringService {
  private db: Pool;
  private analyticsService: SubmissionAnalyticsService;
  private notificationService: AdminNotificationService;
  private errorLoggingService: ErrorLoggingService;
  private queueService: SubmissionQueueService;
  private websocketService?: WebSocketService;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private startTime: Date = new Date();

  constructor(
    db: Pool,
    emailService: EmailService,
    websocketService?: WebSocketService
  ) {
    this.db = db;
    this.analyticsService = new SubmissionAnalyticsService(db);
    this.notificationService = new AdminNotificationService(db, emailService, websocketService);
    this.errorLoggingService = new ErrorLoggingService(db);
    this.queueService = new SubmissionQueueService(db);
    this.websocketService = websocketService;
  }

  async startMonitoring(intervalMinutes: number = 1): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.startTime = new Date();
    
    console.log(`Starting comprehensive submission monitoring (${intervalMinutes} minute intervals)...`);

    // Start individual services
    await this.notificationService.startMonitoring(5); // Check notifications every 5 minutes
    await this.queueService.startProcessing(30000); // Process queue every 30 seconds

    // Start main monitoring loop
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performMonitoringCheck();
      } catch (error) {
        console.error('Error in monitoring check:', error);
        await this.errorLoggingService.logSystemError(
          error instanceof Error ? error : new Error('Unknown monitoring error'),
          { component: 'SubmissionMonitoringService' }
        );
      }
    }, intervalMinutes * 60 * 1000);

    // Perform initial check
    await this.performMonitoringCheck();

    // Setup default notification rules if none exist
    await this.setupDefaultNotificationRules();
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Stop individual services
    await this.notificationService.stopMonitoring();
    await this.queueService.stopProcessing();

    console.log('Stopped comprehensive submission monitoring');
  }

  private async performMonitoringCheck(): Promise<void> {
    try {
      // Get current system metrics
      const healthMetrics = await this.analyticsService.getSystemHealthMetrics();
      
      // Broadcast real-time updates via WebSocket
      if (this.websocketService) {
        const dashboard = await this.getDashboard();
        this.websocketService.broadcastSystemNotification({
          type: 'info',
          title: 'Dashboard Update',
          message: 'Submission monitoring dashboard has been updated',
          timestamp: new Date()
        });
      }

      // Log system health status
      if (healthMetrics.overallHealth === 'critical') {
        await this.errorLoggingService.logError({
          level: 'error',
          category: 'system',
          message: 'System health is critical',
          details: {
            metrics: healthMetrics.metrics,
            alerts: healthMetrics.alerts
          },
          tags: ['system_health', 'critical']
        });
      } else if (healthMetrics.overallHealth === 'warning') {
        await this.errorLoggingService.logError({
          level: 'warn',
          category: 'system',
          message: 'System health warning detected',
          details: {
            metrics: healthMetrics.metrics,
            alerts: healthMetrics.alerts
          },
          tags: ['system_health', 'warning']
        });
      }

    } catch (error) {
      console.error('Error in monitoring check:', error);
    }
  }

  async getDashboard(): Promise<MonitoringDashboard> {
    const [
      healthMetrics,
      queueStatus,
      recentErrors,
      recentNotifications,
      submissionMetrics,
      universityPerformance
    ] = await Promise.all([
      this.analyticsService.getSystemHealthMetrics(),
      this.queueService.getQueueStatus(),
      this.getRecentActivity(),
      this.notificationService.getNotificationEvents(10, 0),
      this.analyticsService.getSubmissionMetrics('hourly'),
      this.getUniversityPerformance()
    ]);

    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);

    return {
      systemHealth: {
        status: healthMetrics.overallHealth,
        uptime,
        lastCheck: new Date()
      },
      realTimeMetrics: {
        activeSubmissions: queueStatus.pending,
        queueLength: queueStatus.pending + queueStatus.scheduled,
        processingRate: await this.calculateProcessingRate(),
        successRate: healthMetrics.metrics.successRate24h,
        averageProcessingTime: healthMetrics.metrics.averageProcessingTime
      },
      alerts: [
        ...healthMetrics.alerts.map(alert => ({
          id: `health_${Date.now()}`,
          level: alert.level as 'info' | 'warning' | 'error' | 'critical',
          message: alert.message,
          timestamp: alert.timestamp,
          acknowledged: false
        })),
        ...recentNotifications.events.slice(0, 5).map(event => ({
          id: event.id,
          level: event.severity as 'info' | 'warning' | 'error' | 'critical',
          message: event.title,
          timestamp: event.triggeredAt,
          acknowledged: event.acknowledged
        }))
      ],
      recentActivity: recentErrors,
      performanceMetrics: {
        hourlyThroughput: submissionMetrics.hourly,
        universityPerformance
      }
    };
  }

  private async getRecentActivity(): Promise<Array<{
    type: 'submission' | 'error' | 'notification';
    message: string;
    timestamp: Date;
    severity?: string;
  }>> {
    const [recentErrors, recentSubmissions] = await Promise.all([
      this.errorLoggingService.getErrorLogs({}, 10, 0),
      this.getRecentSubmissions(10)
    ]);

    const activities: Array<{
      type: 'submission' | 'error' | 'notification';
      message: string;
      timestamp: Date;
      severity?: string;
    }> = [];

    // Add recent errors
    recentErrors.logs.forEach(error => {
      activities.push({
        type: 'error',
        message: error.message,
        timestamp: error.timestamp,
        severity: error.level
      });
    });

    // Add recent submissions
    recentSubmissions.forEach(submission => {
      activities.push({
        type: 'submission',
        message: `Submission ${submission.status}: ${submission.university_name}`,
        timestamp: submission.updated_at,
        severity: submission.status === 'failed' ? 'error' : 'info'
      });
    });

    // Sort by timestamp (most recent first)
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);
  }

  private async getRecentSubmissions(limit: number): Promise<Array<{
    id: string;
    status: string;
    university_name: string;
    updated_at: Date;
  }>> {
    const query = `
      SELECT s.id, s.status, u.name as university_name, s.updated_at
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      ORDER BY s.updated_at DESC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows;
  }

  private async calculateProcessingRate(): Promise<number> {
    const query = `
      SELECT COUNT(*) as processed_count
      FROM submissions
      WHERE updated_at >= NOW() - INTERVAL '1 hour'
        AND status IN ('confirmed', 'failed')
    `;

    const result = await this.db.query(query);
    return parseInt(result.rows[0].processed_count) || 0;
  }

  private async getUniversityPerformance(): Promise<Array<{
    universityName: string;
    successRate: number;
    averageTime: number;
    status: 'healthy' | 'degraded' | 'down';
  }>> {
    const query = `
      SELECT 
        u.name as university_name,
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE s.status = 'confirmed') as successful_submissions,
        COUNT(*) FILTER (WHERE s.status = 'failed') as failed_submissions,
        AVG(
          CASE 
            WHEN s.confirmed_at IS NOT NULL AND s.submitted_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (s.confirmed_at - s.submitted_at))
            ELSE NULL
          END
        ) as avg_processing_time_seconds
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      WHERE s.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY u.id, u.name
      HAVING COUNT(*) >= 5  -- Only include universities with significant activity
      ORDER BY successful_submissions DESC
      LIMIT 20
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => {
      const totalSubmissions = parseInt(row.total_submissions);
      const successfulSubmissions = parseInt(row.successful_submissions);
      const failedSubmissions = parseInt(row.failed_submissions);
      const successRate = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 0;
      const averageTime = parseFloat(row.avg_processing_time_seconds) || 0;

      let status: 'healthy' | 'degraded' | 'down' = 'healthy';
      if (successRate < 50 || failedSubmissions >= 10) {
        status = 'down';
      } else if (successRate < 80 || averageTime > 300) {
        status = 'degraded';
      }

      return {
        universityName: row.university_name,
        successRate,
        averageTime,
        status
      };
    });
  }

  async retryFailedSubmissions(
    filters: {
      universityId?: string;
      maxRetries?: number;
      olderThanMinutes?: number;
    } = {}
  ): Promise<{
    retriedCount: number;
    skippedCount: number;
    errors: string[];
  }> {
    const conditions = ['s.status = \'failed\''];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.universityId) {
      conditions.push(`s.university_id = $${paramIndex}`);
      values.push(filters.universityId);
      paramIndex++;
    }

    if (filters.maxRetries !== undefined) {
      conditions.push(`s.retry_count < $${paramIndex}`);
      values.push(filters.maxRetries);
      paramIndex++;
    }

    if (filters.olderThanMinutes) {
      conditions.push(`s.updated_at < NOW() - INTERVAL '${filters.olderThanMinutes} minutes'`);
    }

    const query = `
      SELECT s.id, s.retry_count, u.name as university_name
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.updated_at ASC
      LIMIT 100
    `;

    const result = await this.db.query(query, values);
    const failedSubmissions = result.rows;

    let retriedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const submission of failedSubmissions) {
      try {
        await this.queueService.retrySubmission(submission.id, 2); // High priority
        retriedCount++;
        
        await this.errorLoggingService.logError({
          level: 'info',
          category: 'submission',
          message: `Retrying failed submission for ${submission.university_name}`,
          details: {
            submissionId: submission.id,
            retryCount: submission.retry_count + 1
          },
          submissionId: submission.id,
          tags: ['retry', 'manual_retry']
        });
      } catch (error) {
        skippedCount++;
        const errorMessage = `Failed to retry submission ${submission.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMessage);
        
        await this.errorLoggingService.logError({
          level: 'error',
          category: 'submission',
          message: errorMessage,
          error: error instanceof Error ? error : new Error(errorMessage),
          submissionId: submission.id,
          tags: ['retry_failed']
        });
      }
    }

    return {
      retriedCount,
      skippedCount,
      errors
    };
  }

  async generateHealthReport(): Promise<{
    summary: {
      overallHealth: string;
      totalSubmissions24h: number;
      successRate24h: number;
      averageProcessingTime: number;
      activeAlerts: number;
    };
    details: {
      systemMetrics: any;
      universityPerformance: any[];
      recentErrors: any[];
      queueStatus: any;
    };
    recommendations: string[];
  }> {
    const [
      healthMetrics,
      analytics,
      universityPerformance,
      recentErrors,
      queueStatus
    ] = await Promise.all([
      this.analyticsService.getSystemHealthMetrics(),
      this.analyticsService.getComprehensiveAnalytics(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        new Date()
      ),
      this.getUniversityPerformance(),
      this.errorLoggingService.getErrorLogs({ resolved: false }, 20, 0),
      this.queueService.getQueueStatus()
    ]);

    const recommendations: string[] = [];

    // Generate recommendations based on metrics
    if (healthMetrics.metrics.successRate24h < 90) {
      recommendations.push(`Success rate is ${healthMetrics.metrics.successRate24h.toFixed(1)}%. Consider investigating common failure patterns.`);
    }

    if (healthMetrics.metrics.queueBacklog > 50) {
      recommendations.push(`Queue backlog is high (${healthMetrics.metrics.queueBacklog} items). Consider scaling processing capacity.`);
    }

    if (healthMetrics.metrics.averageProcessingTime > 300) {
      recommendations.push(`Average processing time is ${Math.round(healthMetrics.metrics.averageProcessingTime)} seconds. Review university integration performance.`);
    }

    const downUniversities = universityPerformance.filter(u => u.status === 'down');
    if (downUniversities.length > 0) {
      recommendations.push(`${downUniversities.length} universities appear to be down: ${downUniversities.map(u => u.universityName).join(', ')}`);
    }

    if (recentErrors.total > 20) {
      recommendations.push(`High error count (${recentErrors.total} unresolved errors). Review error logs for patterns.`);
    }

    return {
      summary: {
        overallHealth: healthMetrics.overallHealth,
        totalSubmissions24h: analytics.totalSubmissions,
        successRate24h: healthMetrics.metrics.successRate24h,
        averageProcessingTime: healthMetrics.metrics.averageProcessingTime,
        activeAlerts: healthMetrics.alerts.length
      },
      details: {
        systemMetrics: healthMetrics.metrics,
        universityPerformance,
        recentErrors: recentErrors.logs,
        queueStatus
      },
      recommendations
    };
  }

  private async setupDefaultNotificationRules(): Promise<void> {
    try {
      const existingRules = await this.notificationService.getNotificationRules();
      
      if (existingRules.length === 0) {
        console.log('Setting up default notification rules...');
        
        const defaultRules = await this.notificationService.getDefaultNotificationRules();
        
        for (const rule of defaultRules) {
          await this.notificationService.createNotificationRule(rule);
        }
        
        console.log(`Created ${defaultRules.length} default notification rules`);
      }
    } catch (error) {
      console.error('Error setting up default notification rules:', error);
    }
  }

  // Utility methods for external access
  getAnalyticsService(): SubmissionAnalyticsService {
    return this.analyticsService;
  }

  getNotificationService(): AdminNotificationService {
    return this.notificationService;
  }

  getErrorLoggingService(): ErrorLoggingService {
    return this.errorLoggingService;
  }

  getQueueService(): SubmissionQueueService {
    return this.queueService;
  }

  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }
}