import { Pool } from 'pg';
import { AppError } from '../utils/AppError';

export interface SubmissionAnalytics {
  totalSubmissions: number;
  successRate: number;
  averageProcessingTime: number;
  failuresByReason: Record<string, number>;
  submissionsByUniversity: Array<{
    universityId: string;
    universityName: string;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    successRate: number;
    averageProcessingTime: number;
  }>;
  submissionsByMethod: Array<{
    method: string;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    successRate: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    successRate: number;
  }>;
  recentFailures: Array<{
    submissionId: string;
    universityName: string;
    applicantName: string;
    errorMessage: string;
    failedAt: Date;
    retryCount: number;
  }>;
}

export interface SubmissionMetrics {
  hourly: Array<{
    hour: string;
    submissions: number;
    successes: number;
    failures: number;
  }>;
  daily: Array<{
    date: string;
    submissions: number;
    successes: number;
    failures: number;
  }>;
  weekly: Array<{
    week: string;
    submissions: number;
    successes: number;
    failures: number;
  }>;
}

export class SubmissionAnalyticsService {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  async getComprehensiveAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<SubmissionAnalytics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    const [
      overallStats,
      universityStats,
      methodStats,
      timeSeriesData,
      recentFailures
    ] = await Promise.all([
      this.getOverallStats(dateFilter),
      this.getUniversityStats(dateFilter),
      this.getMethodStats(dateFilter),
      this.getTimeSeriesData(dateFilter),
      this.getRecentFailures(20)
    ]);

    return {
      totalSubmissions: overallStats.totalSubmissions,
      successRate: overallStats.successRate,
      averageProcessingTime: overallStats.averageProcessingTime,
      failuresByReason: overallStats.failuresByReason,
      submissionsByUniversity: universityStats,
      submissionsByMethod: methodStats,
      timeSeriesData,
      recentFailures
    };
  }

  private buildDateFilter(startDate?: Date, endDate?: Date): string {
    const conditions = [];
    
    if (startDate) {
      conditions.push(`s.created_at >= '${startDate.toISOString()}'`);
    }
    
    if (endDate) {
      conditions.push(`s.created_at <= '${endDate.toISOString()}'`);
    }
    
    return conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
  }

  private async getOverallStats(dateFilter: string): Promise<{
    totalSubmissions: number;
    successRate: number;
    averageProcessingTime: number;
    failuresByReason: Record<string, number>;
  }> {
    // Overall statistics
    const overallQuery = `
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'confirmed') as successful_submissions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_submissions,
        AVG(
          CASE 
            WHEN confirmed_at IS NOT NULL AND submitted_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (confirmed_at - submitted_at))
            ELSE NULL
          END
        ) as avg_processing_time_seconds
      FROM submissions s
      WHERE 1=1 ${dateFilter}
    `;

    const overallResult = await this.db.query(overallQuery);
    const overallStats = overallResult.rows[0];

    const totalSubmissions = parseInt(overallStats.total_submissions) || 0;
    const successfulSubmissions = parseInt(overallStats.successful_submissions) || 0;
    const successRate = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 0;
    const averageProcessingTime = parseFloat(overallStats.avg_processing_time_seconds) || 0;

    // Failure reasons
    const failureQuery = `
      SELECT 
        COALESCE(
          CASE 
            WHEN error_message ILIKE '%timeout%' THEN 'Timeout'
            WHEN error_message ILIKE '%authentication%' OR error_message ILIKE '%unauthorized%' THEN 'Authentication'
            WHEN error_message ILIKE '%network%' OR error_message ILIKE '%connection%' THEN 'Network'
            WHEN error_message ILIKE '%validation%' OR error_message ILIKE '%invalid%' THEN 'Validation'
            WHEN error_message ILIKE '%rate limit%' OR error_message ILIKE '%throttle%' THEN 'Rate Limit'
            WHEN error_message ILIKE '%server error%' OR error_message ILIKE '%500%' THEN 'Server Error'
            ELSE 'Other'
          END,
          'Unknown'
        ) as failure_reason,
        COUNT(*) as count
      FROM submissions s
      WHERE status = 'failed' AND error_message IS NOT NULL ${dateFilter}
      GROUP BY failure_reason
      ORDER BY count DESC
    `;

    const failureResult = await this.db.query(failureQuery);
    const failuresByReason: Record<string, number> = {};
    
    failureResult.rows.forEach(row => {
      failuresByReason[row.failure_reason] = parseInt(row.count);
    });

    return {
      totalSubmissions,
      successRate,
      averageProcessingTime,
      failuresByReason
    };
  }

  private async getUniversityStats(dateFilter: string): Promise<Array<{
    universityId: string;
    universityName: string;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    successRate: number;
    averageProcessingTime: number;
  }>> {
    const query = `
      SELECT 
        u.id as university_id,
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
      WHERE 1=1 ${dateFilter}
      GROUP BY u.id, u.name
      ORDER BY total_submissions DESC
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => {
      const totalSubmissions = parseInt(row.total_submissions);
      const successfulSubmissions = parseInt(row.successful_submissions);
      const failedSubmissions = parseInt(row.failed_submissions);
      const successRate = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 0;
      const averageProcessingTime = parseFloat(row.avg_processing_time_seconds) || 0;

      return {
        universityId: row.university_id,
        universityName: row.university_name,
        totalSubmissions,
        successfulSubmissions,
        failedSubmissions,
        successRate,
        averageProcessingTime
      };
    });
  }

  private async getMethodStats(dateFilter: string): Promise<Array<{
    method: string;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    successRate: number;
  }>> {
    const query = `
      SELECT 
        submission_method as method,
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'confirmed') as successful_submissions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_submissions
      FROM submissions s
      WHERE 1=1 ${dateFilter}
      GROUP BY submission_method
      ORDER BY total_submissions DESC
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => {
      const totalSubmissions = parseInt(row.total_submissions);
      const successfulSubmissions = parseInt(row.successful_submissions);
      const failedSubmissions = parseInt(row.failed_submissions);
      const successRate = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 0;

      return {
        method: row.method,
        totalSubmissions,
        successfulSubmissions,
        failedSubmissions,
        successRate
      };
    });
  }

  private async getTimeSeriesData(dateFilter: string): Promise<Array<{
    date: string;
    totalSubmissions: number;
    successfulSubmissions: number;
    failedSubmissions: number;
    successRate: number;
  }>> {
    const query = `
      SELECT 
        DATE(s.created_at) as date,
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE s.status = 'confirmed') as successful_submissions,
        COUNT(*) FILTER (WHERE s.status = 'failed') as failed_submissions
      FROM submissions s
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE(s.created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => {
      const totalSubmissions = parseInt(row.total_submissions);
      const successfulSubmissions = parseInt(row.successful_submissions);
      const failedSubmissions = parseInt(row.failed_submissions);
      const successRate = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 0;

      return {
        date: row.date,
        totalSubmissions,
        successfulSubmissions,
        failedSubmissions,
        successRate
      };
    });
  }

  private async getRecentFailures(limit: number = 20): Promise<Array<{
    submissionId: string;
    universityName: string;
    applicantName: string;
    errorMessage: string;
    failedAt: Date;
    retryCount: number;
  }>> {
    const query = `
      SELECT 
        s.id as submission_id,
        u.name as university_name,
        COALESCE(app.legal_name, 'Unknown') as applicant_name,
        s.error_message,
        s.updated_at as failed_at,
        s.retry_count
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      LEFT JOIN recommendations r ON s.recommendation_id = r.id
      LEFT JOIN applications app ON r.application_id = app.id
      WHERE s.status = 'failed' AND s.error_message IS NOT NULL
      ORDER BY s.updated_at DESC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    
    return result.rows.map(row => ({
      submissionId: row.submission_id,
      universityName: row.university_name,
      applicantName: row.applicant_name,
      errorMessage: row.error_message || 'Unknown error',
      failedAt: row.failed_at,
      retryCount: parseInt(row.retry_count) || 0
    }));
  }

  async getSubmissionMetrics(period: 'hourly' | 'daily' | 'weekly' = 'daily'): Promise<SubmissionMetrics> {
    const [hourly, daily, weekly] = await Promise.all([
      this.getHourlyMetrics(),
      this.getDailyMetrics(),
      this.getWeeklyMetrics()
    ]);

    return { hourly, daily, weekly };
  }

  private async getHourlyMetrics(): Promise<Array<{
    hour: string;
    submissions: number;
    successes: number;
    failures: number;
  }>> {
    const query = `
      SELECT 
        TO_CHAR(s.created_at, 'YYYY-MM-DD HH24:00') as hour,
        COUNT(*) as submissions,
        COUNT(*) FILTER (WHERE s.status = 'confirmed') as successes,
        COUNT(*) FILTER (WHERE s.status = 'failed') as failures
      FROM submissions s
      WHERE s.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY TO_CHAR(s.created_at, 'YYYY-MM-DD HH24:00')
      ORDER BY hour DESC
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => ({
      hour: row.hour,
      submissions: parseInt(row.submissions),
      successes: parseInt(row.successes),
      failures: parseInt(row.failures)
    }));
  }

  private async getDailyMetrics(): Promise<Array<{
    date: string;
    submissions: number;
    successes: number;
    failures: number;
  }>> {
    const query = `
      SELECT 
        DATE(s.created_at) as date,
        COUNT(*) as submissions,
        COUNT(*) FILTER (WHERE s.status = 'confirmed') as successes,
        COUNT(*) FILTER (WHERE s.status = 'failed') as failures
      FROM submissions s
      WHERE s.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(s.created_at)
      ORDER BY date DESC
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => ({
      date: row.date,
      submissions: parseInt(row.submissions),
      successes: parseInt(row.successes),
      failures: parseInt(row.failures)
    }));
  }

  private async getWeeklyMetrics(): Promise<Array<{
    week: string;
    submissions: number;
    successes: number;
    failures: number;
  }>> {
    const query = `
      SELECT 
        TO_CHAR(s.created_at, 'YYYY-"W"WW') as week,
        COUNT(*) as submissions,
        COUNT(*) FILTER (WHERE s.status = 'confirmed') as successes,
        COUNT(*) FILTER (WHERE s.status = 'failed') as failures
      FROM submissions s
      WHERE s.created_at >= NOW() - INTERVAL '12 weeks'
      GROUP BY TO_CHAR(s.created_at, 'YYYY-"W"WW')
      ORDER BY week DESC
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => ({
      week: row.week,
      submissions: parseInt(row.submissions),
      successes: parseInt(row.successes),
      failures: parseInt(row.failures)
    }));
  }

  async getUniversityPerformanceReport(universityId: string): Promise<{
    universityName: string;
    totalSubmissions: number;
    successRate: number;
    averageProcessingTime: number;
    commonErrors: Array<{ error: string; count: number }>;
    recentTrends: Array<{
      date: string;
      submissions: number;
      successRate: number;
    }>;
  }> {
    // University basic info and stats
    const statsQuery = `
      SELECT 
        u.name as university_name,
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE s.status = 'confirmed') as successful_submissions,
        AVG(
          CASE 
            WHEN s.confirmed_at IS NOT NULL AND s.submitted_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (s.confirmed_at - s.submitted_at))
            ELSE NULL
          END
        ) as avg_processing_time_seconds
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.name
    `;

    const statsResult = await this.db.query(statsQuery, [universityId]);
    
    if (statsResult.rows.length === 0) {
      throw new AppError('University not found', 404);
    }

    const stats = statsResult.rows[0];
    const totalSubmissions = parseInt(stats.total_submissions);
    const successfulSubmissions = parseInt(stats.successful_submissions);
    const successRate = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 0;

    // Common errors
    const errorsQuery = `
      SELECT 
        COALESCE(
          CASE 
            WHEN error_message ILIKE '%timeout%' THEN 'Timeout'
            WHEN error_message ILIKE '%authentication%' THEN 'Authentication'
            WHEN error_message ILIKE '%network%' THEN 'Network'
            WHEN error_message ILIKE '%validation%' THEN 'Validation'
            WHEN error_message ILIKE '%rate limit%' THEN 'Rate Limit'
            ELSE 'Other'
          END,
          'Unknown'
        ) as error,
        COUNT(*) as count
      FROM submissions s
      WHERE s.university_id = $1 AND s.status = 'failed' AND s.error_message IS NOT NULL
      GROUP BY error
      ORDER BY count DESC
      LIMIT 10
    `;

    const errorsResult = await this.db.query(errorsQuery, [universityId]);
    const commonErrors = errorsResult.rows.map(row => ({
      error: row.error,
      count: parseInt(row.count)
    }));

    // Recent trends
    const trendsQuery = `
      SELECT 
        DATE(s.created_at) as date,
        COUNT(*) as submissions,
        COUNT(*) FILTER (WHERE s.status = 'confirmed') as successes
      FROM submissions s
      WHERE s.university_id = $1 AND s.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(s.created_at)
      ORDER BY date DESC
    `;

    const trendsResult = await this.db.query(trendsQuery, [universityId]);
    const recentTrends = trendsResult.rows.map(row => {
      const submissions = parseInt(row.submissions);
      const successes = parseInt(row.successes);
      const successRate = submissions > 0 ? (successes / submissions) * 100 : 0;

      return {
        date: row.date,
        submissions,
        successRate
      };
    });

    return {
      universityName: stats.university_name,
      totalSubmissions,
      successRate,
      averageProcessingTime: parseFloat(stats.avg_processing_time_seconds) || 0,
      commonErrors,
      recentTrends
    };
  }

  async getSystemHealthMetrics(): Promise<{
    overallHealth: 'healthy' | 'warning' | 'critical';
    metrics: {
      successRate24h: number;
      averageProcessingTime: number;
      queueBacklog: number;
      failureRate: number;
      systemLoad: number;
    };
    alerts: Array<{
      level: 'info' | 'warning' | 'error';
      message: string;
      timestamp: Date;
    }>;
  }> {
    // Get 24-hour metrics
    const metricsQuery = `
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(*) FILTER (WHERE status = 'confirmed') as successful_submissions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_submissions,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_submissions,
        AVG(
          CASE 
            WHEN confirmed_at IS NOT NULL AND submitted_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (confirmed_at - submitted_at))
            ELSE NULL
          END
        ) as avg_processing_time_seconds
      FROM submissions
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `;

    const metricsResult = await this.db.query(metricsQuery);
    const metrics = metricsResult.rows[0];

    const totalSubmissions = parseInt(metrics.total_submissions) || 0;
    const successfulSubmissions = parseInt(metrics.successful_submissions) || 0;
    const failedSubmissions = parseInt(metrics.failed_submissions) || 0;
    const pendingSubmissions = parseInt(metrics.pending_submissions) || 0;
    
    const successRate24h = totalSubmissions > 0 ? (successfulSubmissions / totalSubmissions) * 100 : 100;
    const failureRate = totalSubmissions > 0 ? (failedSubmissions / totalSubmissions) * 100 : 0;
    const averageProcessingTime = parseFloat(metrics.avg_processing_time_seconds) || 0;

    // Calculate system load (simplified metric based on queue backlog)
    const systemLoad = Math.min(100, (pendingSubmissions / 100) * 100);

    // Generate alerts based on thresholds
    const alerts: Array<{
      level: 'info' | 'warning' | 'error';
      message: string;
      timestamp: Date;
    }> = [];

    const now = new Date();

    if (successRate24h < 80) {
      alerts.push({
        level: 'error',
        message: `Low success rate: ${successRate24h.toFixed(1)}% in the last 24 hours`,
        timestamp: now
      });
    } else if (successRate24h < 90) {
      alerts.push({
        level: 'warning',
        message: `Success rate below target: ${successRate24h.toFixed(1)}% in the last 24 hours`,
        timestamp: now
      });
    }

    if (averageProcessingTime > 300) { // 5 minutes
      alerts.push({
        level: 'warning',
        message: `High processing time: ${Math.round(averageProcessingTime)} seconds average`,
        timestamp: now
      });
    }

    if (pendingSubmissions > 100) {
      alerts.push({
        level: 'error',
        message: `High queue backlog: ${pendingSubmissions} pending submissions`,
        timestamp: now
      });
    } else if (pendingSubmissions > 50) {
      alerts.push({
        level: 'warning',
        message: `Queue backlog building: ${pendingSubmissions} pending submissions`,
        timestamp: now
      });
    }

    // Determine overall health
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (alerts.some(alert => alert.level === 'error')) {
      overallHealth = 'critical';
    } else if (alerts.some(alert => alert.level === 'warning')) {
      overallHealth = 'warning';
    }

    return {
      overallHealth,
      metrics: {
        successRate24h,
        averageProcessingTime,
        queueBacklog: pendingSubmissions,
        failureRate,
        systemLoad
      },
      alerts
    };
  }
}