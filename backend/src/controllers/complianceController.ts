import { Request, Response } from 'express';
import { Pool } from 'pg';
import { AppError } from '../utils/AppError';
import { UserConsentModel } from '../models/UserConsent';
import { DataRetentionService } from '../services/dataRetentionService';
import { DataDeletionService } from '../services/dataDeletionService';
import { ComplianceReportingService } from '../services/complianceReportingService';
import { EncryptionService } from '../services/encryptionService';

export class ComplianceController {
  private db: Pool;
  private consentModel: UserConsentModel;
  private retentionService: DataRetentionService;
  private deletionService: DataDeletionService;
  private reportingService: ComplianceReportingService;

  constructor(db: Pool) {
    this.db = db;
    this.consentModel = new UserConsentModel(db);
    this.retentionService = new DataRetentionService(db);
    this.deletionService = new DataDeletionService(db);
    this.reportingService = new ComplianceReportingService(db);
  }

  /**
   * Record user consent
   */
  recordConsent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { consent_type, consent_given, legal_basis, purpose, data_categories, retention_period } = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.get('User-Agent') || '';

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const consent = await this.consentModel.recordConsent({
        user_id: userId,
        consent_type,
        consent_given,
        consent_version: '1.0',
        ip_address: ipAddress,
        user_agent: userAgent,
        legal_basis,
        purpose,
        data_categories,
        retention_period
      });

      // Log the consent action
      await this.reportingService.logAuditEvent(
        userId,
        'consent_recorded',
        'user_consent',
        consent.id,
        { consent_type, consent_given, legal_basis },
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        data: consent,
        message: 'Consent recorded successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'CONSENT_RECORDING_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Withdraw user consent
   */
  withdrawConsent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { consent_type } = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.get('User-Agent') || '';

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const withdrawal = await this.consentModel.withdrawConsent(
        userId,
        consent_type,
        ipAddress,
        userAgent
      );

      // Log the withdrawal action
      await this.reportingService.logAuditEvent(
        userId,
        'consent_withdrawn',
        'user_consent',
        withdrawal.id,
        { consent_type },
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: withdrawal,
        message: 'Consent withdrawn successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'CONSENT_WITHDRAWAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get user's consent history
   */
  getUserConsents = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const consents = await this.consentModel.getUserConsents(userId);

      res.json({
        success: true,
        data: consents,
        message: 'User consents retrieved successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'CONSENT_RETRIEVAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Submit data deletion request
   */
  submitDeletionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { request_type, data_categories, reason } = req.body;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.get('User-Agent') || '';

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const deletionRequest = await this.deletionService.submitDeletionRequest(
        userId,
        request_type,
        data_categories,
        reason,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        data: deletionRequest,
        message: 'Deletion request submitted successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'DELETION_REQUEST_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Verify deletion request
   */
  verifyDeletionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { request_id, verification_token, verification_method, verification_data } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.get('User-Agent') || '';

      const verified = await this.deletionService.verifyDeletionRequest(
        request_id,
        verification_token,
        verification_method,
        verification_data,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: { verified },
        message: 'Deletion request verified successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'DELETION_VERIFICATION_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get user's deletion requests
   */
  getUserDeletionRequests = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const requests = await this.deletionService.getUserDeletionRequests(userId);

      res.json({
        success: true,
        data: requests,
        message: 'Deletion requests retrieved successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'DELETION_REQUESTS_RETRIEVAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get data retention report
   */
  getDataRetentionReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const report = await this.retentionService.getDataRetentionReport();

      res.json({
        success: true,
        data: report,
        message: 'Data retention report generated successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'RETENTION_REPORT_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Generate compliance report (Admin only)
   */
  generateComplianceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { report_type, start_date, end_date } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (req.user?.role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      let report;
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      switch (report_type) {
        case 'ferpa':
          report = await this.reportingService.generateFERPAReport(startDate, endDate, userId);
          break;
        case 'gdpr':
          report = await this.reportingService.generateGDPRReport(startDate, endDate, userId);
          break;
        case 'data_inventory':
          report = await this.reportingService.generateDataInventoryReport(userId);
          break;
        case 'consent_audit':
          report = await this.reportingService.generateConsentAuditReport(startDate, endDate, userId);
          break;
        default:
          throw new AppError('Invalid report type', 400);
      }

      res.json({
        success: true,
        data: report,
        message: 'Compliance report generated successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'COMPLIANCE_REPORT_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get audit logs (Admin only)
   */
  getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      const {
        user_id,
        action,
        resource_type,
        start_date,
        end_date,
        limit = 50,
        offset = 0
      } = req.query;

      const filters: any = {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      if (user_id) filters.userId = user_id as string;
      if (action) filters.action = action as string;
      if (resource_type) filters.resourceType = resource_type as string;
      if (start_date) filters.startDate = new Date(start_date as string);
      if (end_date) filters.endDate = new Date(end_date as string);

      const result = await this.reportingService.getAuditLogs(filters);

      res.json({
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
          pages: Math.ceil(result.total / filters.limit)
        },
        message: 'Audit logs retrieved successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'AUDIT_LOGS_RETRIEVAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Process deletion request (Admin only)
   */
  processDeletionRequest = async (req: Request, res: Response): Promise<void> => {
    try {
      const { request_id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (req.user?.role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      await this.deletionService.processDeletionRequest(request_id, userId);

      res.json({
        success: true,
        message: 'Deletion request processed successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'DELETION_PROCESSING_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Perform automatic data cleanup (Admin only)
   */
  performAutomaticCleanup = async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      const deletionLogs = await this.retentionService.performAutomaticCleanup();

      res.json({
        success: true,
        data: {
          cleanup_performed: deletionLogs.length > 0,
          deletion_logs: deletionLogs
        },
        message: 'Automatic cleanup completed successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'AUTOMATIC_CLEANUP_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Get compliance dashboard data (Admin only)
   */
  getComplianceDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user?.role !== 'admin') {
        throw new AppError('Insufficient permissions', 403);
      }

      // Get dashboard data from database view
      const dashboardQuery = 'SELECT * FROM compliance_dashboard';
      const retentionQuery = 'SELECT * FROM data_retention_compliance';
      const deletionStatsQuery = await this.deletionService.getDeletionStatistics();

      const [dashboardResult, retentionResult] = await Promise.all([
        this.db.query(dashboardQuery),
        this.db.query(retentionQuery)
      ]);

      const dashboardData = {
        compliance_overview: dashboardResult.rows,
        retention_compliance: retentionResult.rows,
        deletion_statistics: deletionStatsQuery,
        last_updated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: dashboardData,
        message: 'Compliance dashboard data retrieved successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'DASHBOARD_RETRIEVAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Export user data (GDPR Article 20 - Data Portability)
   */
  exportUserData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Collect all user data from various tables
      const userData = await this.collectUserData(userId);

      // Log the data export
      await this.reportingService.logAuditEvent(
        userId,
        'data_exported',
        'user_data',
        userId,
        { export_date: new Date().toISOString() },
        req.ip,
        req.get('User-Agent')
      );

      res.json({
        success: true,
        data: userData,
        message: 'User data exported successfully'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        error: {
          code: error.code || 'DATA_EXPORT_FAILED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string): Promise<any> {
    const queries = {
      profile: 'SELECT id, email, first_name, last_name, phone, role, is_verified, created_at FROM users WHERE id = $1',
      applications: 'SELECT * FROM applications WHERE student_id = $1',
      recommendations: 'SELECT r.* FROM recommendations r JOIN applications a ON r.application_id = a.id WHERE a.student_id = $1',
      consents: 'SELECT * FROM user_consents WHERE user_id = $1',
      sessions: 'SELECT id, login_time, logout_time, ip_address FROM user_sessions WHERE user_id = $1',
      deletion_requests: 'SELECT * FROM deletion_requests WHERE user_id = $1'
    };

    const userData: any = {};

    for (const [key, query] of Object.entries(queries)) {
      try {
        const result = await this.db.query(query, [userId]);
        userData[key] = result.rows;
      } catch (error) {
        console.error(`Error collecting ${key} data:`, error);
        userData[key] = [];
      }
    }

    return {
      export_date: new Date().toISOString(),
      user_id: userId,
      data: userData
    };
  }
}