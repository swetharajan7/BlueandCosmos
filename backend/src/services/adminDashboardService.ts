import { Pool } from 'pg';
import { pool } from '../config/database';

export interface SystemOverview {
  totalUsers: number;
  totalApplications: number;
  totalRecommendations: number;
  totalSubmissions: number;
  activeUsers: number;
  systemUptime: number;
  databaseHealth: string;
  redisHealth: string;
  externalApiHealth: {
    openai: string;
    googleDocs: string;
    sendgrid: string;
  };
}

export interface Analytics {
  userRegistrations: Array<{ date: string; count: number }>;
  applicationSubmissions: Array<{ date: string; count: number }>;
  recommendationCompletions: Array<{ date: string; count: number }>;
  universityDistribution: Array<{ university: string; count: number }>;
  programTypeDistribution: Array<{ program: string; count: number }>;
  submissionSuccessRate: number;
  averageProcessingTime: number;
}

export interface BusinessMetrics {
  conversionRate: number;
  userRetention: number;
  averageApplicationsPerUser: number;
  averageRecommendationsPerApplication: number;
  topUniversities: Array<{ name: string; applications: number }>;
  monthlyGrowth: number;
  systemUsage: {
    peakHours: Array<{ hour: number; usage: number }>;
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
}

export class AdminDashboardService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  async getSystemOverview(): Promise<SystemOverview> {
    try {
      // Get basic counts
      const userCountQuery = 'SELECT COUNT(*) as count FROM users';
      const applicationCountQuery = 'SELECT COUNT(*) as count FROM applications';
      const recommendationCountQuery = 'SELECT COUNT(*) as count FROM recommendations';
      const submissionCountQuery = 'SELECT COUNT(*) as count FROM submissions';
      
      // Get active users (logged in within last 24 hours)
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_sessions 
        WHERE last_activity > NOW() - INTERVAL '24 hours'
      `;

      const [
        userCount,
        applicationCount,
        recommendationCount,
        submissionCount,
        activeUsers
      ] = await Promise.all([
        this.db.query(userCountQuery),
        this.db.query(applicationCountQuery),
        this.db.query(recommendationCountQuery),
        this.db.query(submissionCountQuery),
        this.db.query(activeUsersQuery)
      ]);

      // Check system health
      const systemHealth = await this.getSystemHealth();

      return {
        totalUsers: parseInt(userCount.rows[0].count),
        totalApplications: parseInt(applicationCount.rows[0].count),
        totalRecommendations: parseInt(recommendationCount.rows[0].count),
        totalSubmissions: parseInt(submissionCount.rows[0].count),
        activeUsers: parseInt(activeUsers.rows[0].count),
        systemUptime: process.uptime(),
        databaseHealth: systemHealth.database,
        redisHealth: systemHealth.redis,
        externalApiHealth: systemHealth.externalApis
      };
    } catch (error) {
      console.error('Error getting system overview:', error);
      throw error;
    }
  }

  async getAnalytics(timeRange: string): Promise<Analytics> {
    try {
      const days = this.getTimeRangeDays(timeRange);
      
      // User registrations over time
      const userRegistrationsQuery = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      // Application submissions over time
      const applicationSubmissionsQuery = `
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM applications
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      // Recommendation completions over time
      const recommendationCompletionsQuery = `
        SELECT DATE(submitted_at) as date, COUNT(*) as count
        FROM recommendations
        WHERE submitted_at >= NOW() - INTERVAL '${days} days'
        AND status = 'submitted'
        GROUP BY DATE(submitted_at)
        ORDER BY date
      `;

      // University distribution
      const universityDistributionQuery = `
        SELECT u.name as university, COUNT(au.application_id) as count
        FROM universities u
        JOIN application_universities au ON u.id = au.university_id
        JOIN applications a ON au.application_id = a.id
        WHERE a.created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY u.name
        ORDER BY count DESC
        LIMIT 10
      `;

      // Program type distribution
      const programTypeDistributionQuery = `
        SELECT program_type as program, COUNT(*) as count
        FROM applications
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY program_type
        ORDER BY count DESC
      `;

      // Submission success rate
      const submissionSuccessQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as successful,
          COUNT(*) as total
        FROM submissions
        WHERE created_at >= NOW() - INTERVAL '${days} days'
      `;

      const [
        userRegistrations,
        applicationSubmissions,
        recommendationCompletions,
        universityDistribution,
        programTypeDistribution,
        submissionSuccess
      ] = await Promise.all([
        this.db.query(userRegistrationsQuery),
        this.db.query(applicationSubmissionsQuery),
        this.db.query(recommendationCompletionsQuery),
        this.db.query(universityDistributionQuery),
        this.db.query(programTypeDistributionQuery),
        this.db.query(submissionSuccessQuery)
      ]);

      const successRate = submissionSuccess.rows[0].total > 0 
        ? (submissionSuccess.rows[0].successful / submissionSuccess.rows[0].total) * 100 
        : 0;

      return {
        userRegistrations: userRegistrations.rows,
        applicationSubmissions: applicationSubmissions.rows,
        recommendationCompletions: recommendationCompletions.rows,
        universityDistribution: universityDistribution.rows,
        programTypeDistribution: programTypeDistribution.rows,
        submissionSuccessRate: successRate,
        averageProcessingTime: await this.getAverageProcessingTime(days)
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  async getBusinessMetrics(startDate?: string, endDate?: string): Promise<BusinessMetrics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      // Conversion rate (users who created applications / total users)
      const conversionQuery = `
        SELECT 
          COUNT(DISTINCT a.student_id) as converted_users,
          (SELECT COUNT(*) FROM users WHERE role = 'student' ${dateFilter}) as total_users
        FROM applications a
        WHERE 1=1 ${dateFilter.replace('created_at', 'a.created_at')}
      `;

      // User retention (users active in last 30 days / users registered 30+ days ago)
      const retentionQuery = `
        SELECT 
          COUNT(DISTINCT us.user_id) as active_users,
          (SELECT COUNT(*) FROM users WHERE created_at <= NOW() - INTERVAL '30 days') as eligible_users
        FROM user_sessions us
        WHERE us.last_activity >= NOW() - INTERVAL '30 days'
      `;

      // Average applications per user
      const avgApplicationsQuery = `
        SELECT AVG(app_count) as average
        FROM (
          SELECT COUNT(*) as app_count
          FROM applications
          WHERE 1=1 ${dateFilter}
          GROUP BY student_id
        ) subq
      `;

      // Average recommendations per application
      const avgRecommendationsQuery = `
        SELECT AVG(rec_count) as average
        FROM (
          SELECT COUNT(*) as rec_count
          FROM recommendations r
          JOIN applications a ON r.application_id = a.id
          WHERE 1=1 ${dateFilter.replace('created_at', 'a.created_at')}
          GROUP BY r.application_id
        ) subq
      `;

      // Top universities
      const topUniversitiesQuery = `
        SELECT u.name, COUNT(au.application_id) as applications
        FROM universities u
        JOIN application_universities au ON u.id = au.university_id
        JOIN applications a ON au.application_id = a.id
        WHERE 1=1 ${dateFilter.replace('created_at', 'a.created_at')}
        GROUP BY u.name
        ORDER BY applications DESC
        LIMIT 10
      `;

      const [
        conversion,
        retention,
        avgApplications,
        avgRecommendations,
        topUniversities
      ] = await Promise.all([
        this.db.query(conversionQuery),
        this.db.query(retentionQuery),
        this.db.query(avgApplicationsQuery),
        this.db.query(avgRecommendationsQuery),
        this.db.query(topUniversitiesQuery)
      ]);

      const conversionRate = conversion.rows[0].total_users > 0 
        ? (conversion.rows[0].converted_users / conversion.rows[0].total_users) * 100 
        : 0;

      const retentionRate = retention.rows[0].eligible_users > 0 
        ? (retention.rows[0].active_users / retention.rows[0].eligible_users) * 100 
        : 0;

      const systemUsage = await this.getSystemUsage();
      const monthlyGrowth = await this.getMonthlyGrowth();

      return {
        conversionRate,
        userRetention: retentionRate,
        averageApplicationsPerUser: parseFloat(avgApplications.rows[0].average || '0'),
        averageRecommendationsPerApplication: parseFloat(avgRecommendations.rows[0].average || '0'),
        topUniversities: topUniversities.rows,
        monthlyGrowth,
        systemUsage
      };
    } catch (error) {
      console.error('Error getting business metrics:', error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<any> {
    try {
      // Check database health
      let databaseHealth = 'healthy';
      try {
        await this.db.query('SELECT 1');
      } catch (error) {
        databaseHealth = 'unhealthy';
      }

      // Check Redis health (if available)
      let redisHealth = 'healthy';
      // Redis health check would go here

      // Check external API health
      const externalApiHealth = {
        openai: 'healthy', // Would implement actual health checks
        googleDocs: 'healthy',
        sendgrid: 'healthy'
      };

      return {
        database: databaseHealth,
        redis: redisHealth,
        externalApis: externalApiHealth
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      throw error;
    }
  }

  async getApplications(filters: any): Promise<any> {
    try {
      const { page, limit, status, university } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (status) {
        whereClause += ` AND a.status = $${params.length + 1}`;
        params.push(status);
      }

      if (university) {
        whereClause += ` AND EXISTS (
          SELECT 1 FROM application_universities au 
          JOIN universities u ON au.university_id = u.id 
          WHERE au.application_id = a.id AND u.name ILIKE $${params.length + 1}
        )`;
        params.push(`%${university}%`);
      }

      const query = `
        SELECT 
          a.id,
          a.legal_name,
          a.program_type,
          a.application_term,
          a.status,
          a.created_at,
          u.first_name || ' ' || u.last_name as student_name,
          u.email as student_email,
          COUNT(r.id) as recommendation_count,
          COUNT(s.id) as submission_count
        FROM applications a
        JOIN users u ON a.student_id = u.id
        LEFT JOIN recommendations r ON a.id = r.application_id
        LEFT JOIN submissions s ON r.id = s.recommendation_id
        ${whereClause}
        GROUP BY a.id, u.first_name, u.last_name, u.email
        ORDER BY a.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;

      params.push(limit, offset);

      const countQuery = `
        SELECT COUNT(DISTINCT a.id) as total
        FROM applications a
        JOIN users u ON a.student_id = u.id
        ${whereClause}
      `;

      const [applications, count] = await Promise.all([
        this.db.query(query, params),
        this.db.query(countQuery, params.slice(0, -2))
      ]);

      return {
        applications: applications.rows,
        total: parseInt(count.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(parseInt(count.rows[0].total) / limit)
      };
    } catch (error) {
      console.error('Error getting applications:', error);
      throw error;
    }
  }

  async getApplicationDetails(applicationId: string): Promise<any> {
    try {
      const query = `
        SELECT 
          a.*,
          u.first_name || ' ' || u.last_name as student_name,
          u.email as student_email,
          u.phone as student_phone,
          array_agg(
            json_build_object(
              'id', univ.id,
              'name', univ.name,
              'code', univ.code
            )
          ) as universities
        FROM applications a
        JOIN users u ON a.student_id = u.id
        LEFT JOIN application_universities au ON a.id = au.application_id
        LEFT JOIN universities univ ON au.university_id = univ.id
        WHERE a.id = $1
        GROUP BY a.id, u.first_name, u.last_name, u.email, u.phone
      `;

      const recommendationsQuery = `
        SELECT 
          r.*,
          rec_user.first_name || ' ' || rec_user.last_name as recommender_name,
          rec_user.email as recommender_email,
          rec.title,
          rec.organization
        FROM recommendations r
        JOIN recommenders rec ON r.recommender_id = rec.id
        JOIN users rec_user ON rec.user_id = rec_user.id
        WHERE r.application_id = $1
      `;

      const submissionsQuery = `
        SELECT 
          s.*,
          u.name as university_name
        FROM submissions s
        JOIN recommendations r ON s.recommendation_id = r.id
        JOIN universities u ON s.university_id = u.id
        WHERE r.application_id = $1
      `;

      const [application, recommendations, submissions] = await Promise.all([
        this.db.query(query, [applicationId]),
        this.db.query(recommendationsQuery, [applicationId]),
        this.db.query(submissionsQuery, [applicationId])
      ]);

      if (application.rows.length === 0) {
        throw new Error('Application not found');
      }

      return {
        ...application.rows[0],
        recommendations: recommendations.rows,
        submissions: submissions.rows
      };
    } catch (error) {
      console.error('Error getting application details:', error);
      throw error;
    }
  }

  private getTimeRangeDays(timeRange: string): number {
    switch (timeRange) {
      case '1d': return 1;
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 7;
    }
  }

  private buildDateFilter(startDate?: string, endDate?: string): string {
    if (!startDate && !endDate) {
      return '';
    }

    let filter = '';
    if (startDate) {
      filter += ` AND created_at >= '${startDate}'`;
    }
    if (endDate) {
      filter += ` AND created_at <= '${endDate}'`;
    }
    return filter;
  }

  private async getAverageProcessingTime(days: number): Promise<number> {
    try {
      const query = `
        SELECT AVG(EXTRACT(EPOCH FROM (submitted_at - created_at))/3600) as avg_hours
        FROM recommendations
        WHERE submitted_at IS NOT NULL
        AND created_at >= NOW() - INTERVAL '${days} days'
      `;

      const result = await this.db.query(query);
      return parseFloat(result.rows[0].avg_hours || '0');
    } catch (error) {
      console.error('Error getting average processing time:', error);
      return 0;
    }
  }

  private async getSystemUsage(): Promise<any> {
    try {
      // Peak hours analysis
      const peakHoursQuery = `
        SELECT 
          EXTRACT(HOUR FROM last_activity) as hour,
          COUNT(*) as usage
        FROM user_sessions
        WHERE last_activity >= NOW() - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM last_activity)
        ORDER BY hour
      `;

      // Active users
      const activeUsersQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN last_activity >= NOW() - INTERVAL '1 day' THEN user_id END) as daily,
          COUNT(DISTINCT CASE WHEN last_activity >= NOW() - INTERVAL '7 days' THEN user_id END) as weekly,
          COUNT(DISTINCT CASE WHEN last_activity >= NOW() - INTERVAL '30 days' THEN user_id END) as monthly
        FROM user_sessions
      `;

      const [peakHours, activeUsers] = await Promise.all([
        this.db.query(peakHoursQuery),
        this.db.query(activeUsersQuery)
      ]);

      return {
        peakHours: peakHours.rows,
        dailyActiveUsers: parseInt(activeUsers.rows[0].daily || '0'),
        weeklyActiveUsers: parseInt(activeUsers.rows[0].weekly || '0'),
        monthlyActiveUsers: parseInt(activeUsers.rows[0].monthly || '0')
      };
    } catch (error) {
      console.error('Error getting system usage:', error);
      return {
        peakHours: [],
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0
      };
    }
  }

  private async getMonthlyGrowth(): Promise<number> {
    try {
      const query = `
        SELECT 
          COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as current_month,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') 
                     AND created_at < DATE_TRUNC('month', NOW()) THEN 1 END) as previous_month
        FROM users
        WHERE role = 'student'
      `;

      const result = await this.db.query(query);
      const current = parseInt(result.rows[0].current_month || '0');
      const previous = parseInt(result.rows[0].previous_month || '0');

      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    } catch (error) {
      console.error('Error getting monthly growth:', error);
      return 0;
    }
  }
}