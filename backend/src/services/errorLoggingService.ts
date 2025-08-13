import { Pool } from 'pg';
import { Request } from 'express';

export interface ErrorLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  category: 'submission' | 'authentication' | 'validation' | 'integration' | 'system' | 'user';
  message: string;
  details?: any;
  stackTrace?: string;
  userId?: string;
  submissionId?: string;
  universityId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  tags?: string[];
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByCategory: Record<string, number>;
  errorsByEndpoint: Array<{
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }>;
  topErrors: Array<{
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
  errorTrends: Array<{
    hour: string;
    count: number;
    level: string;
  }>;
}

export class ErrorLoggingService {
  private db: Pool;
  private requestIdCounter: number = 0;

  constructor(db: Pool) {
    this.db = db;
  }

  generateRequestId(): string {
    this.requestIdCounter = (this.requestIdCounter + 1) % 1000000;
    return `req_${Date.now()}_${this.requestIdCounter.toString().padStart(6, '0')}`;
  }

  async logError(errorData: {
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    category: 'submission' | 'authentication' | 'validation' | 'integration' | 'system' | 'user';
    message: string;
    details?: any;
    error?: Error;
    userId?: string;
    submissionId?: string;
    universityId?: string;
    request?: Request;
    requestId?: string;
    statusCode?: number;
    responseTime?: number;
    tags?: string[];
  }): Promise<ErrorLog> {
    const query = `
      INSERT INTO error_logs (
        level, category, message, details, stack_trace, user_id, submission_id, 
        university_id, request_id, user_agent, ip_address, endpoint, method, 
        status_code, response_time, tags
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const stackTrace = errorData.error?.stack || null;
    const userAgent = errorData.request?.get('User-Agent') || null;
    const ipAddress = this.getClientIpAddress(errorData.request) || null;
    const endpoint = errorData.request?.originalUrl || errorData.request?.url || null;
    const method = errorData.request?.method || null;

    const values = [
      errorData.level,
      errorData.category,
      errorData.message,
      errorData.details ? JSON.stringify(errorData.details) : null,
      stackTrace,
      errorData.userId || null,
      errorData.submissionId || null,
      errorData.universityId || null,
      errorData.requestId || null,
      userAgent,
      ipAddress,
      endpoint,
      method,
      errorData.statusCode || null,
      errorData.responseTime || null,
      errorData.tags || null
    ];

    const result = await this.db.query(query, values);
    const savedLog = result.rows[0];

    // Parse JSON fields back
    const errorLog: ErrorLog = {
      ...savedLog,
      details: savedLog.details ? JSON.parse(savedLog.details) : null,
      tags: savedLog.tags || []
    };

    // Log to console for immediate visibility
    this.logToConsole(errorLog);

    return errorLog;
  }

  private getClientIpAddress(req?: Request): string | null {
    if (!req) return null;

    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      null
    );
  }

  private logToConsole(errorLog: ErrorLog): void {
    const timestamp = errorLog.timestamp.toISOString();
    const level = errorLog.level.toUpperCase();
    const category = errorLog.category.toUpperCase();
    
    let logMessage = `[${timestamp}] ${level} [${category}] ${errorLog.message}`;
    
    if (errorLog.requestId) {
      logMessage += ` (Request: ${errorLog.requestId})`;
    }
    
    if (errorLog.submissionId) {
      logMessage += ` (Submission: ${errorLog.submissionId})`;
    }

    switch (errorLog.level) {
      case 'fatal':
      case 'error':
        console.error(logMessage);
        if (errorLog.stackTrace) {
          console.error(errorLog.stackTrace);
        }
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }

    if (errorLog.details) {
      console.log('Details:', errorLog.details);
    }
  }

  async logSubmissionError(
    submissionId: string,
    universityId: string,
    error: Error,
    details?: any,
    requestId?: string
  ): Promise<ErrorLog> {
    return this.logError({
      level: 'error',
      category: 'submission',
      message: `Submission failed: ${error.message}`,
      error,
      details: {
        submissionId,
        universityId,
        ...details
      },
      submissionId,
      universityId,
      requestId,
      tags: ['submission_failure']
    });
  }

  async logIntegrationError(
    universityId: string,
    integrationMethod: string,
    error: Error,
    details?: any,
    requestId?: string
  ): Promise<ErrorLog> {
    return this.logError({
      level: 'error',
      category: 'integration',
      message: `University integration failed (${integrationMethod}): ${error.message}`,
      error,
      details: {
        universityId,
        integrationMethod,
        ...details
      },
      universityId,
      requestId,
      tags: ['integration_failure', integrationMethod]
    });
  }

  async logValidationError(
    message: string,
    details?: any,
    userId?: string,
    requestId?: string
  ): Promise<ErrorLog> {
    return this.logError({
      level: 'warn',
      category: 'validation',
      message: `Validation error: ${message}`,
      details,
      userId,
      requestId,
      tags: ['validation_error']
    });
  }

  async logAuthenticationError(
    message: string,
    userId?: string,
    request?: Request,
    requestId?: string
  ): Promise<ErrorLog> {
    return this.logError({
      level: 'warn',
      category: 'authentication',
      message: `Authentication error: ${message}`,
      userId,
      request,
      requestId,
      tags: ['auth_failure']
    });
  }

  async logSystemError(
    error: Error,
    details?: any,
    requestId?: string
  ): Promise<ErrorLog> {
    return this.logError({
      level: 'fatal',
      category: 'system',
      message: `System error: ${error.message}`,
      error,
      details,
      requestId,
      tags: ['system_error']
    });
  }

  async getErrorLogs(
    filters: {
      level?: string;
      category?: string;
      userId?: string;
      submissionId?: string;
      universityId?: string;
      startDate?: Date;
      endDate?: Date;
      resolved?: boolean;
      tags?: string[];
    } = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    logs: ErrorLog[];
    total: number;
  }> {
    const conditions = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.level) {
      conditions.push(`level = $${paramIndex}`);
      values.push(filters.level);
      paramIndex++;
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(filters.category);
      paramIndex++;
    }

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(filters.userId);
      paramIndex++;
    }

    if (filters.submissionId) {
      conditions.push(`submission_id = $${paramIndex}`);
      values.push(filters.submissionId);
      paramIndex++;
    }

    if (filters.universityId) {
      conditions.push(`university_id = $${paramIndex}`);
      values.push(filters.universityId);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`timestamp >= $${paramIndex}`);
      values.push(filters.startDate.toISOString());
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`timestamp <= $${paramIndex}`);
      values.push(filters.endDate.toISOString());
      paramIndex++;
    }

    if (filters.resolved !== undefined) {
      conditions.push(`resolved = $${paramIndex}`);
      values.push(filters.resolved);
      paramIndex++;
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      values.push(filters.tags);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM error_logs ${whereClause}`;
    const logsQuery = `
      SELECT * FROM error_logs 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const [countResult, logsResult] = await Promise.all([
      this.db.query(countQuery, values.slice(0, -2)),
      this.db.query(logsQuery, values)
    ]);

    const total = parseInt(countResult.rows[0].total);
    const logs = logsResult.rows.map(row => ({
      ...row,
      details: row.details ? JSON.parse(row.details) : null,
      tags: row.tags || []
    }));

    return { logs, total };
  }

  async getErrorMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ErrorMetrics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    const [
      totalErrors,
      errorsByLevel,
      errorsByCategory,
      errorsByEndpoint,
      topErrors,
      errorTrends
    ] = await Promise.all([
      this.getTotalErrors(dateFilter),
      this.getErrorsByLevel(dateFilter),
      this.getErrorsByCategory(dateFilter),
      this.getErrorsByEndpoint(dateFilter),
      this.getTopErrors(dateFilter),
      this.getErrorTrends(dateFilter)
    ]);

    return {
      totalErrors,
      errorsByLevel,
      errorsByCategory,
      errorsByEndpoint,
      topErrors,
      errorTrends
    };
  }

  private buildDateFilter(startDate?: Date, endDate?: Date): string {
    const conditions = [];
    
    if (startDate) {
      conditions.push(`timestamp >= '${startDate.toISOString()}'`);
    }
    
    if (endDate) {
      conditions.push(`timestamp <= '${endDate.toISOString()}'`);
    }
    
    return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  }

  private async getTotalErrors(dateFilter: string): Promise<number> {
    const query = `SELECT COUNT(*) as total FROM error_logs ${dateFilter}`;
    const result = await this.db.query(query);
    return parseInt(result.rows[0].total);
  }

  private async getErrorsByLevel(dateFilter: string): Promise<Record<string, number>> {
    const query = `
      SELECT level, COUNT(*) as count
      FROM error_logs ${dateFilter}
      GROUP BY level
      ORDER BY count DESC
    `;

    const result = await this.db.query(query);
    const errorsByLevel: Record<string, number> = {};
    
    result.rows.forEach(row => {
      errorsByLevel[row.level] = parseInt(row.count);
    });

    return errorsByLevel;
  }

  private async getErrorsByCategory(dateFilter: string): Promise<Record<string, number>> {
    const query = `
      SELECT category, COUNT(*) as count
      FROM error_logs ${dateFilter}
      GROUP BY category
      ORDER BY count DESC
    `;

    const result = await this.db.query(query);
    const errorsByCategory: Record<string, number> = {};
    
    result.rows.forEach(row => {
      errorsByCategory[row.category] = parseInt(row.count);
    });

    return errorsByCategory;
  }

  private async getErrorsByEndpoint(dateFilter: string): Promise<Array<{
    endpoint: string;
    count: number;
    averageResponseTime: number;
  }>> {
    const query = `
      SELECT 
        endpoint,
        COUNT(*) as count,
        AVG(response_time) as avg_response_time
      FROM error_logs 
      ${dateFilter} ${dateFilter ? 'AND' : 'WHERE'} endpoint IS NOT NULL
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => ({
      endpoint: row.endpoint,
      count: parseInt(row.count),
      averageResponseTime: parseFloat(row.avg_response_time) || 0
    }));
  }

  private async getTopErrors(dateFilter: string): Promise<Array<{
    message: string;
    count: number;
    lastOccurred: Date;
  }>> {
    const query = `
      SELECT 
        message,
        COUNT(*) as count,
        MAX(timestamp) as last_occurred
      FROM error_logs ${dateFilter}
      GROUP BY message
      ORDER BY count DESC
      LIMIT 20
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => ({
      message: row.message,
      count: parseInt(row.count),
      lastOccurred: row.last_occurred
    }));
  }

  private async getErrorTrends(dateFilter: string): Promise<Array<{
    hour: string;
    count: number;
    level: string;
  }>> {
    const query = `
      SELECT 
        TO_CHAR(timestamp, 'YYYY-MM-DD HH24:00') as hour,
        level,
        COUNT(*) as count
      FROM error_logs 
      ${dateFilter} ${dateFilter ? 'AND' : 'WHERE'} timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY TO_CHAR(timestamp, 'YYYY-MM-DD HH24:00'), level
      ORDER BY hour DESC, level
    `;

    const result = await this.db.query(query);
    
    return result.rows.map(row => ({
      hour: row.hour,
      level: row.level,
      count: parseInt(row.count)
    }));
  }

  async resolveError(
    errorId: string,
    resolvedBy: string,
    resolution?: string
  ): Promise<void> {
    const query = `
      UPDATE error_logs 
      SET resolved = true, resolved_by = $2, resolved_at = CURRENT_TIMESTAMP,
          details = CASE 
            WHEN details IS NULL THEN jsonb_build_object('resolution', $3)
            ELSE details || jsonb_build_object('resolution', $3)
          END
      WHERE id = $1
    `;

    const result = await this.db.query(query, [errorId, resolvedBy, resolution || 'Resolved']);
    
    if (result.rowCount === 0) {
      throw new Error('Error log not found');
    }
  }

  async bulkResolveErrors(
    filters: {
      level?: string;
      category?: string;
      message?: string;
      startDate?: Date;
      endDate?: Date;
    },
    resolvedBy: string,
    resolution?: string
  ): Promise<number> {
    const conditions = ['resolved = false'];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.level) {
      conditions.push(`level = $${paramIndex}`);
      values.push(filters.level);
      paramIndex++;
    }

    if (filters.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(filters.category);
      paramIndex++;
    }

    if (filters.message) {
      conditions.push(`message ILIKE $${paramIndex}`);
      values.push(`%${filters.message}%`);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`timestamp >= $${paramIndex}`);
      values.push(filters.startDate.toISOString());
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`timestamp <= $${paramIndex}`);
      values.push(filters.endDate.toISOString());
      paramIndex++;
    }

    values.push(resolvedBy, resolution || 'Bulk resolved');

    const query = `
      UPDATE error_logs 
      SET resolved = true, resolved_by = $${paramIndex}, resolved_at = CURRENT_TIMESTAMP,
          details = CASE 
            WHEN details IS NULL THEN jsonb_build_object('resolution', $${paramIndex + 1})
            ELSE details || jsonb_build_object('resolution', $${paramIndex + 1})
          END
      WHERE ${conditions.join(' AND ')}
    `;

    const result = await this.db.query(query, values);
    return result.rowCount || 0;
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const query = `
      DELETE FROM error_logs 
      WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
        AND resolved = true
    `;

    const result = await this.db.query(query);
    return result.rowCount || 0;
  }

  async getErrorById(errorId: string): Promise<ErrorLog | null> {
    const query = 'SELECT * FROM error_logs WHERE id = $1';
    const result = await this.db.query(query, [errorId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      details: row.details ? JSON.parse(row.details) : null,
      tags: row.tags || []
    };
  }
}

// Database table creation function
export async function createErrorLogsTable(db: Pool): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS error_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      level VARCHAR(10) NOT NULL,
      category VARCHAR(50) NOT NULL,
      message TEXT NOT NULL,
      details JSONB,
      stack_trace TEXT,
      user_id UUID,
      submission_id UUID,
      university_id UUID,
      request_id VARCHAR(100),
      user_agent TEXT,
      ip_address INET,
      endpoint VARCHAR(255),
      method VARCHAR(10),
      status_code INTEGER,
      response_time INTEGER,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      resolved BOOLEAN DEFAULT false,
      resolved_by VARCHAR(255),
      resolved_at TIMESTAMP WITH TIME ZONE,
      tags TEXT[]
    );

    CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);
    CREATE INDEX IF NOT EXISTS idx_error_logs_category ON error_logs(category);
    CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
    CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_error_logs_submission_id ON error_logs(submission_id);
    CREATE INDEX IF NOT EXISTS idx_error_logs_university_id ON error_logs(university_id);
    CREATE INDEX IF NOT EXISTS idx_error_logs_request_id ON error_logs(request_id);
    CREATE INDEX IF NOT EXISTS idx_error_logs_tags ON error_logs USING GIN(tags);
    CREATE INDEX IF NOT EXISTS idx_error_logs_endpoint ON error_logs(endpoint);
  `;

  await db.query(query);
}