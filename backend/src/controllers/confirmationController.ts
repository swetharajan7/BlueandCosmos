import { Request, Response } from 'express';
import { Pool } from 'pg';
import { SubmissionConfirmationService } from '../services/submissionConfirmationService';
import { WebSocketService } from '../services/websocketService';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types';

export class ConfirmationController {
  private confirmationService: SubmissionConfirmationService;

  constructor(db: Pool, websocketService?: WebSocketService) {
    this.confirmationService = new SubmissionConfirmationService(db, websocketService);
  }

  /**
   * Send comprehensive confirmation summary email
   */
  async sendConfirmationSummary(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { recommendationId } = req.params;

      if (!recommendationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_RECOMMENDATION_ID',
            message: 'Recommendation ID is required'
          }
        });
      }

      await this.confirmationService.sendConfirmationSummaryEmail(recommendationId);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Confirmation summary emails sent successfully'
        }
      });
    } catch (error) {
      console.error('Error sending confirmation summary:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIRMATION_SUMMARY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to send confirmation summary'
        }
      });
    }
  }

  /**
   * Generate comprehensive status report
   */
  async generateStatusReport(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role as 'student' | 'recommender';

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
      }

      if (userRole !== 'student' && userRole !== 'recommender') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INVALID_ROLE',
            message: 'Only students and recommenders can generate status reports'
          }
        });
      }

      const report = await this.confirmationService.generateStatusReport(userId, userRole);

      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating status report:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_REPORT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate status report'
        }
      });
    }
  }

  /**
   * Create support ticket for submission issues
   */
  async createSupportTicket(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const userEmail = req.user?.email;
      const userName = `${req.user?.first_name || ''} ${req.user?.last_name || ''}`.trim() || 'User';

      if (!userId || !userEmail) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
      }

      const { submissionId, issueType, subject, description, priority } = req.body;

      if (!issueType || !subject || !description) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Issue type, subject, and description are required'
          }
        });
      }

      const validIssueTypes = ['submission_failed', 'confirmation_missing', 'university_error', 'other'];
      if (!validIssueTypes.includes(issueType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ISSUE_TYPE',
            message: 'Invalid issue type'
          }
        });
      }

      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      const ticketPriority = validPriorities.includes(priority) ? priority : 'medium';

      const ticketId = await this.confirmationService.createSupportTicket({
        userId,
        userEmail,
        userName,
        submissionId,
        issueType,
        subject,
        description,
        priority: ticketPriority
      });

      return res.status(201).json({
        success: true,
        data: {
          ticketId,
          message: 'Support ticket created successfully'
        }
      });
    } catch (error) {
      console.error('Error creating support ticket:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUPPORT_TICKET_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create support ticket'
        }
      });
    }
  }

  /**
   * Get audit trail for submissions
   */
  async getAuditTrail(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { submissionId, recommendationId, action, startDate, endDate } = req.query;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Only allow users to see their own audit trail unless they're admin
      const userId = req.user?.role === 'admin' ? req.query.userId as string : req.user?.userId;

      const filters = {
        submissionId: submissionId as string,
        recommendationId: recommendationId as string,
        userId,
        action: action as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit,
        offset
      };

      const auditTrail = await this.confirmationService.getAuditTrail(filters);

      return res.status(200).json({
        success: true,
        data: auditTrail.items,
        pagination: {
          limit,
          offset,
          total: auditTrail.total,
          totalPages: Math.ceil(auditTrail.total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting audit trail:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUDIT_TRAIL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get audit trail'
        }
      });
    }
  }

  /**
   * Process webhook confirmation from university
   */
  async processWebhookConfirmation(req: Request, res: Response): Promise<Response> {
    try {
      const payload = req.body;
      const universityCode = req.params.universityCode;

      if (!universityCode) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_UNIVERSITY_CODE',
            message: 'University code is required'
          }
        });
      }

      // Add university code to payload
      payload.universityCode = universityCode;

      await this.confirmationService.handleWebhookConfirmation(payload);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Webhook confirmation processed successfully'
        }
      });
    } catch (error) {
      console.error('Error processing webhook confirmation:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'WEBHOOK_ERROR',
            message: error.message
          }
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Failed to process webhook confirmation'
        }
      });
    }
  }

  /**
   * Get confirmation summary for a recommendation
   */
  async getConfirmationSummary(req: Request, res: Response): Promise<Response> {
    try {
      const { recommendationId } = req.params;

      if (!recommendationId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_RECOMMENDATION_ID',
            message: 'Recommendation ID is required'
          }
        });
      }

      const summary = await this.confirmationService.generateConfirmationSummary(recommendationId);

      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting confirmation summary:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CONFIRMATION_SUMMARY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get confirmation summary'
        }
      });
    }
  }

  /**
   * Check pending confirmations (admin only)
   */
  async checkPendingConfirmations(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }

      await this.confirmationService.checkPendingConfirmations();

      return res.status(200).json({
        success: true,
        data: {
          message: 'Pending confirmations check initiated'
        }
      });
    } catch (error) {
      console.error('Error checking pending confirmations:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PENDING_CONFIRMATIONS_ERROR',
          message: 'Failed to check pending confirmations'
        }
      });
    }
  }

  /**
   * Manual confirmation processing (admin only)
   */
  async processManualConfirmation(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Admin access required'
          }
        });
      }

      const { submissionId, universityName, applicantName, externalReference, confirmationCode } = req.body;

      if (!submissionId || !universityName || !applicantName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Submission ID, university name, and applicant name are required'
          }
        });
      }

      await this.confirmationService.processConfirmationReceipt({
        submissionId,
        universityName,
        applicantName,
        externalReference: externalReference || `MANUAL-${Date.now()}`,
        confirmationCode,
        confirmedAt: new Date(),
        confirmationMethod: 'manual'
      });

      return res.status(200).json({
        success: true,
        data: {
          message: 'Manual confirmation processed successfully'
        }
      });
    } catch (error) {
      console.error('Error processing manual confirmation:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'MANUAL_CONFIRMATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to process manual confirmation'
        }
      });
    }
  }
}