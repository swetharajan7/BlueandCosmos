import { Request, Response } from 'express';
import { Pool } from 'pg';
import { SubmissionMonitoringService } from '../services/submissionMonitoringService';
import { EmailService } from '../services/emailService';
import { WebSocketService } from '../services/websocketService';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../utils/AppError';

export class AdminController {
  private monitoringService: SubmissionMonitoringService;

  constructor(db: Pool, emailService: EmailService, websocketService?: WebSocketService) {
    this.monitoringService = new SubmissionMonitoringService(db, emailService, websocketService);
  }

  // Dashboard and Monitoring
  async getDashboard(req: Request, res: Response): Promise<Response> {
    try {
      const dashboard = await this.monitoringService.getDashboard();

      return res.status(200).json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error getting admin dashboard:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_ERROR',
          message: 'Failed to load dashboard data'
        }
      });
    }
  }

  async getHealthReport(req: Request, res: Response): Promise<Response> {
    try {
      const report = await this.monitoringService.generateHealthReport();

      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating health report:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_REPORT_ERROR',
          message: 'Failed to generate health report'
        }
      });
    }
  }

  async startMonitoring(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { intervalMinutes } = req.body;
      
      await this.monitoringService.startMonitoring(intervalMinutes || 1);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Monitoring started successfully',
          intervalMinutes: intervalMinutes || 1
        }
      });
    } catch (error) {
      console.error('Error starting monitoring:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'MONITORING_START_ERROR',
          message: 'Failed to start monitoring'
        }
      });
    }
  }

  async stopMonitoring(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      await this.monitoringService.stopMonitoring();

      return res.status(200).json({
        success: true,
        data: {
          message: 'Monitoring stopped successfully'
        }
      });
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'MONITORING_STOP_ERROR',
          message: 'Failed to stop monitoring'
        }
      });
    }
  }

  // Analytics
  async getAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const analytics = await this.monitoringService
        .getAnalyticsService()
        .getComprehensiveAnalytics(start, end);

      return res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_ERROR',
          message: 'Failed to get analytics data'
        }
      });
    }
  }

  async getSubmissionMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const { period } = req.query;
      
      const metrics = await this.monitoringService
        .getAnalyticsService()
        .getSubmissionMetrics(period as 'hourly' | 'daily' | 'weekly');

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting submission metrics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to get submission metrics'
        }
      });
    }
  }

  async getUniversityPerformance(req: Request, res: Response): Promise<Response> {
    try {
      const { universityId } = req.params;

      const performance = await this.monitoringService
        .getAnalyticsService()
        .getUniversityPerformanceReport(universityId);

      return res.status(200).json({
        success: true,
        data: performance
      });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'UNIVERSITY_NOT_FOUND',
            message: 'University not found'
          }
        });
      }

      console.error('Error getting university performance:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_ERROR',
          message: 'Failed to get university performance data'
        }
      });
    }
  }

  // Error Management
  async getErrorLogs(req: Request, res: Response): Promise<Response> {
    try {
      const {
        level,
        category,
        userId,
        submissionId,
        universityId,
        startDate,
        endDate,
        resolved,
        tags,
        limit = '50',
        offset = '0'
      } = req.query;

      const filters: any = {};
      
      if (level) filters.level = level;
      if (category) filters.category = category;
      if (userId) filters.userId = userId;
      if (submissionId) filters.submissionId = submissionId;
      if (universityId) filters.universityId = universityId;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (resolved !== undefined) filters.resolved = resolved === 'true';
      if (tags) filters.tags = (tags as string).split(',');

      const result = await this.monitoringService
        .getErrorLoggingService()
        .getErrorLogs(filters, parseInt(limit as string), parseInt(offset as string));

      return res.status(200).json({
        success: true,
        data: result.logs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Error getting error logs:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ERROR_LOGS_ERROR',
          message: 'Failed to get error logs'
        }
      });
    }
  }

  async getErrorMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const metrics = await this.monitoringService
        .getErrorLoggingService()
        .getErrorMetrics(start, end);

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting error metrics:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ERROR_METRICS_ERROR',
          message: 'Failed to get error metrics'
        }
      });
    }
  }

  async resolveError(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { errorId } = req.params;
      const { resolution } = req.body;
      const resolvedBy = req.user?.email || 'admin';

      await this.monitoringService
        .getErrorLoggingService()
        .resolveError(errorId, resolvedBy, resolution);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Error resolved successfully'
        }
      });
    } catch (error) {
      console.error('Error resolving error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'RESOLVE_ERROR_ERROR',
          message: 'Failed to resolve error'
        }
      });
    }
  }

  async bulkResolveErrors(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { filters, resolution } = req.body;
      const resolvedBy = req.user?.email || 'admin';

      const resolvedCount = await this.monitoringService
        .getErrorLoggingService()
        .bulkResolveErrors(filters, resolvedBy, resolution);

      return res.status(200).json({
        success: true,
        data: {
          message: `${resolvedCount} errors resolved successfully`,
          resolvedCount
        }
      });
    } catch (error) {
      console.error('Error bulk resolving errors:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'BULK_RESOLVE_ERROR',
          message: 'Failed to bulk resolve errors'
        }
      });
    }
  }

  // Notification Management
  async getNotificationRules(req: Request, res: Response): Promise<Response> {
    try {
      const rules = await this.monitoringService
        .getNotificationService()
        .getNotificationRules();

      return res.status(200).json({
        success: true,
        data: rules
      });
    } catch (error) {
      console.error('Error getting notification rules:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_RULES_ERROR',
          message: 'Failed to get notification rules'
        }
      });
    }
  }

  async createNotificationRule(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const ruleData = req.body;

      const rule = await this.monitoringService
        .getNotificationService()
        .createNotificationRule(ruleData);

      return res.status(201).json({
        success: true,
        data: rule
      });
    } catch (error) {
      console.error('Error creating notification rule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_RULE_ERROR',
          message: 'Failed to create notification rule'
        }
      });
    }
  }

  async updateNotificationRule(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { ruleId } = req.params;
      const updates = req.body;

      const rule = await this.monitoringService
        .getNotificationService()
        .updateNotificationRule(ruleId, updates);

      return res.status(200).json({
        success: true,
        data: rule
      });
    } catch (error) {
      console.error('Error updating notification rule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_RULE_ERROR',
          message: 'Failed to update notification rule'
        }
      });
    }
  }

  async deleteNotificationRule(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { ruleId } = req.params;

      await this.monitoringService
        .getNotificationService()
        .deleteNotificationRule(ruleId);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Notification rule deleted successfully'
        }
      });
    } catch (error) {
      console.error('Error deleting notification rule:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_RULE_ERROR',
          message: 'Failed to delete notification rule'
        }
      });
    }
  }

  async getNotificationEvents(req: Request, res: Response): Promise<Response> {
    try {
      const { limit = '50', offset = '0', severity } = req.query;

      const result = await this.monitoringService
        .getNotificationService()
        .getNotificationEvents(
          parseInt(limit as string),
          parseInt(offset as string),
          severity as string
        );

      return res.status(200).json({
        success: true,
        data: result.events,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Error getting notification events:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_EVENTS_ERROR',
          message: 'Failed to get notification events'
        }
      });
    }
  }

  async acknowledgeNotification(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { eventId } = req.params;
      const acknowledgedBy = req.user?.email || 'admin';

      await this.monitoringService
        .getNotificationService()
        .acknowledgeEvent(eventId, acknowledgedBy);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Notification acknowledged successfully'
        }
      });
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'ACKNOWLEDGE_ERROR',
          message: 'Failed to acknowledge notification'
        }
      });
    }
  }

  // Submission Management
  async retryFailedSubmissions(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { universityId, maxRetries, olderThanMinutes } = req.body;

      const result = await this.monitoringService.retryFailedSubmissions({
        universityId,
        maxRetries,
        olderThanMinutes
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error retrying failed submissions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'RETRY_FAILED_ERROR',
          message: 'Failed to retry failed submissions'
        }
      });
    }
  }

  async getQueueStatus(req: Request, res: Response): Promise<Response> {
    try {
      const status = await this.monitoringService
        .getQueueService()
        .getQueueStatus();

      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting queue status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_STATUS_ERROR',
          message: 'Failed to get queue status'
        }
      });
    }
  }

  async getQueueItems(req: Request, res: Response): Promise<Response> {
    try {
      const { limit = '50', offset = '0' } = req.query;

      const result = await this.monitoringService
        .getQueueService()
        .getQueueItems(parseInt(limit as string), parseInt(offset as string));

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: result.total,
          totalPages: Math.ceil(result.total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Error getting queue items:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_ITEMS_ERROR',
          message: 'Failed to get queue items'
        }
      });
    }
  }

  // System Management
  async getSystemStatus(req: Request, res: Response): Promise<Response> {
    try {
      const status = {
        monitoring: this.monitoringService.isCurrentlyMonitoring(),
        uptime: this.monitoringService.getUptime(),
        timestamp: new Date().toISOString()
      };

      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting system status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_STATUS_ERROR',
          message: 'Failed to get system status'
        }
      });
    }
  }

  async cleanupOldLogs(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { daysToKeep = 90 } = req.body;

      const deletedCount = await this.monitoringService
        .getErrorLoggingService()
        .cleanupOldLogs(daysToKeep);

      return res.status(200).json({
        success: true,
        data: {
          message: `${deletedCount} old log entries cleaned up`,
          deletedCount
        }
      });
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: 'Failed to cleanup old logs'
        }
      });
    }
  }
}