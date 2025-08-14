import { Pool } from 'pg';
import { SubmissionModel } from '../models/Submission';
import { EmailService } from './emailService';
import { WebSocketService } from './websocketService';
import { AppError } from '../utils/AppError';
import { getNotificationService } from './notificationService';

export interface ConfirmationReceipt {
  submissionId: string;
  universityName: string;
  applicantName: string;
  externalReference: string;
  confirmationCode?: string;
  receiptUrl?: string;
  confirmedAt: Date;
  confirmationMethod: 'email' | 'api' | 'webhook' | 'manual';
  additionalData?: Record<string, any>;
}

export class SubmissionConfirmationService {
  private db: Pool;
  private submissionModel: SubmissionModel;
  private emailService: EmailService;
  private websocketService?: WebSocketService;

  constructor(db: Pool, websocketService?: WebSocketService) {
    this.db = db;
    this.submissionModel = new SubmissionModel(db);
    this.emailService = new EmailService();
    this.websocketService = websocketService;
  }

  /**
   * Process confirmation receipt from university
   */
  async processConfirmationReceipt(receipt: ConfirmationReceipt): Promise<void> {
    try {
      // Update submission status to confirmed
      await this.submissionModel.updateStatus(receipt.submissionId, 'confirmed', {
        external_reference: receipt.externalReference,
        confirmed_at: receipt.confirmedAt
      });

      // Store confirmation details
      await this.storeConfirmationDetails(receipt);

      // Send confirmation notifications
      await this.sendConfirmationNotifications(receipt);

      // Broadcast real-time update
      if (this.websocketService) {
        await this.websocketService.broadcastSubmissionUpdate({
          submissionId: receipt.submissionId,
          status: 'confirmed',
          universityName: receipt.universityName,
          applicantName: receipt.applicantName,
          timestamp: receipt.confirmedAt,
          externalReference: receipt.externalReference
        });
      }

      console.log(`✅ Processed confirmation for submission ${receipt.submissionId}`);
    } catch (error) {
      console.error(`❌ Failed to process confirmation for submission ${receipt.submissionId}:`, error);
      throw new AppError(
        `Failed to process confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  /**
   * Handle webhook confirmation from university
   */
  async handleWebhookConfirmation(payload: {
    submissionId?: string;
    externalReference?: string;
    status: string;
    confirmationCode?: string;
    receiptUrl?: string;
    timestamp: string;
    universityCode: string;
    additionalData?: Record<string, any>;
  }): Promise<void> {
    try {
      // Find submission by ID or external reference
      let submission;
      if (payload.submissionId) {
        submission = await this.submissionModel.findById(payload.submissionId);
      } else if (payload.externalReference) {
        submission = await this.findSubmissionByExternalReference(payload.externalReference);
      } else {
        throw new AppError('Either submissionId or externalReference is required', 400);
      }

      // Validate university code matches
      if (submission.university_code !== payload.universityCode) {
        throw new AppError('University code mismatch', 400);
      }

      // Process based on status
      if (payload.status === 'confirmed' || payload.status === 'received') {
        await this.processConfirmationReceipt({
          submissionId: submission.id,
          universityName: submission.university_name,
          applicantName: submission.applicant_name || 'Unknown',
          externalReference: payload.externalReference || submission.external_reference,
          confirmationCode: payload.confirmationCode,
          receiptUrl: payload.receiptUrl,
          confirmedAt: new Date(payload.timestamp),
          confirmationMethod: 'webhook',
          additionalData: payload.additionalData
        });
      } else if (payload.status === 'rejected' || payload.status === 'failed') {
        await this.handleSubmissionRejection(submission.id, payload.additionalData?.reason || 'Submission rejected by university');
      }
    } catch (error) {
      console.error('Error handling webhook confirmation:', error);
      throw error;
    }
  }

  /**
   * Check for pending confirmations and attempt to retrieve them
   */
  async checkPendingConfirmations(): Promise<void> {
    try {
      // Get submissions that are submitted but not confirmed (older than 1 hour)
      const query = `
        SELECT s.*, u.name as university_name, u.code as university_code, u.api_endpoint
        FROM submissions s
        JOIN universities u ON s.university_id = u.id
        WHERE s.status = 'submitted' 
          AND s.submitted_at < NOW() - INTERVAL '1 hour'
          AND u.api_endpoint IS NOT NULL
        ORDER BY s.submitted_at ASC
        LIMIT 50
      `;

      const result = await this.db.query(query);
      const pendingSubmissions = result.rows;

      console.log(`Checking ${pendingSubmissions.length} pending confirmations...`);

      for (const submission of pendingSubmissions) {
        try {
          await this.checkSubmissionStatus(submission);
        } catch (error) {
          console.error(`Failed to check status for submission ${submission.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error checking pending confirmations:', error);
    }
  }

  /**
   * Generate confirmation summary for student/recommender
   */
  async generateConfirmationSummary(recommendationId: string): Promise<{
    totalSubmissions: number;
    confirmed: number;
    pending: number;
    failed: number;
    details: Array<{
      universityName: string;
      status: string;
      submittedAt?: Date;
      confirmedAt?: Date;
      externalReference?: string;
      errorMessage?: string;
    }>;
  }> {
    const query = `
      SELECT s.*, u.name as university_name
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      WHERE s.recommendation_id = $1
      ORDER BY u.name ASC
    `;

    const result = await this.db.query(query, [recommendationId]);
    const submissions = result.rows;

    const summary = {
      totalSubmissions: submissions.length,
      confirmed: 0,
      pending: 0,
      failed: 0,
      details: submissions.map(s => ({
        universityName: s.university_name,
        status: s.status,
        submittedAt: s.submitted_at,
        confirmedAt: s.confirmed_at,
        externalReference: s.external_reference,
        errorMessage: s.error_message
      }))
    };

    // Count statuses
    submissions.forEach(s => {
      switch (s.status) {
        case 'confirmed':
          summary.confirmed++;
          break;
        case 'failed':
          summary.failed++;
          break;
        default:
          summary.pending++;
      }
    });

    return summary;
  }

  /**
   * Send comprehensive confirmation email to student and recommender
   */
  async sendConfirmationSummaryEmail(recommendationId: string): Promise<void> {
    try {
      // Get recommendation details
      const recommendationQuery = `
        SELECT r.*, a.legal_name as applicant_name, a.student_id, a.program_type, a.application_term,
               rec.user_id as recommender_user_id, rec.title as recommender_title, rec.organization as recommender_organization,
               u_student.email as student_email, u_student.first_name as student_first_name, u_student.last_name as student_last_name,
               u_recommender.email as recommender_email, u_recommender.first_name as recommender_first_name, u_recommender.last_name as recommender_last_name
        FROM recommendations r
        JOIN applications a ON r.application_id = a.id
        JOIN users u_student ON a.student_id = u_student.id
        LEFT JOIN recommenders rec ON r.recommender_id = rec.id
        LEFT JOIN users u_recommender ON rec.user_id = u_recommender.id
        WHERE r.id = $1
      `;

      const recommendationResult = await this.db.query(recommendationQuery, [recommendationId]);
      
      if (recommendationResult.rows.length === 0) {
        throw new AppError('Recommendation not found', 404);
      }

      const recommendation = recommendationResult.rows[0];
      const summary = await this.generateConfirmationSummary(recommendationId);

      // Create audit trail entry
      await this.createAuditTrail('confirmation_summary_sent', {
        recommendationId,
        studentEmail: recommendation.student_email,
        recommenderEmail: recommendation.recommender_email,
        summary
      });

      // Send email to student
      await this.sendConfirmationEmailToStudent(recommendation, summary);

      // Send email to recommender if exists
      if (recommendation.recommender_email) {
        await this.sendConfirmationEmailToRecommender(recommendation, summary);
      }

      console.log(`✅ Sent confirmation summary emails for recommendation ${recommendationId}`);
    } catch (error) {
      console.error(`❌ Failed to send confirmation summary for recommendation ${recommendationId}:`, error);
      throw error;
    }
  }

  /**
   * Generate comprehensive status report for students and recommenders
   */
  async generateStatusReport(userId: string, userRole: 'student' | 'recommender'): Promise<{
    applications: Array<{
      id: string;
      applicantName: string;
      programType: string;
      applicationTerm: string;
      status: string;
      totalUniversities: number;
      submissionStats: {
        pending: number;
        submitted: number;
        confirmed: number;
        failed: number;
      };
      universities: Array<{
        name: string;
        status: string;
        submittedAt?: Date;
        confirmedAt?: Date;
        externalReference?: string;
        errorMessage?: string;
      }>;
    }>;
    overallStats: {
      totalApplications: number;
      totalSubmissions: number;
      successRate: number;
      pendingCount: number;
      failedCount: number;
    };
  }> {
    let query: string;
    let params: any[];

    if (userRole === 'student') {
      query = `
        SELECT DISTINCT
          a.id as application_id,
          a.legal_name as applicant_name,
          a.program_type,
          a.application_term,
          a.status as application_status,
          r.id as recommendation_id,
          r.status as recommendation_status,
          r.submitted_at as recommendation_submitted_at,
          COUNT(s.id) OVER (PARTITION BY r.id) as total_universities,
          COUNT(s.id) FILTER (WHERE s.status = 'pending') OVER (PARTITION BY r.id) as pending_count,
          COUNT(s.id) FILTER (WHERE s.status = 'submitted') OVER (PARTITION BY r.id) as submitted_count,
          COUNT(s.id) FILTER (WHERE s.status = 'confirmed') OVER (PARTITION BY r.id) as confirmed_count,
          COUNT(s.id) FILTER (WHERE s.status = 'failed') OVER (PARTITION BY r.id) as failed_count
        FROM applications a
        LEFT JOIN recommendations r ON a.id = r.application_id
        LEFT JOIN submissions s ON r.id = s.recommendation_id
        WHERE a.student_id = $1
        ORDER BY a.created_at DESC
      `;
      params = [userId];
    } else {
      query = `
        SELECT DISTINCT
          a.id as application_id,
          a.legal_name as applicant_name,
          a.program_type,
          a.application_term,
          a.status as application_status,
          r.id as recommendation_id,
          r.status as recommendation_status,
          r.submitted_at as recommendation_submitted_at,
          COUNT(s.id) OVER (PARTITION BY r.id) as total_universities,
          COUNT(s.id) FILTER (WHERE s.status = 'pending') OVER (PARTITION BY r.id) as pending_count,
          COUNT(s.id) FILTER (WHERE s.status = 'submitted') OVER (PARTITION BY r.id) as submitted_count,
          COUNT(s.id) FILTER (WHERE s.status = 'confirmed') OVER (PARTITION BY r.id) as confirmed_count,
          COUNT(s.id) FILTER (WHERE s.status = 'failed') OVER (PARTITION BY r.id) as failed_count
        FROM recommendations r
        JOIN applications a ON r.application_id = a.id
        JOIN recommenders rec ON r.recommender_id = rec.id
        LEFT JOIN submissions s ON r.id = s.recommendation_id
        WHERE rec.user_id = $1
        ORDER BY a.created_at DESC
      `;
      params = [userId];
    }

    const result = await this.db.query(query, params);
    const applications = result.rows;

    // Get detailed university information for each recommendation
    const applicationsWithDetails = await Promise.all(
      applications.map(async (app) => {
        if (!app.recommendation_id) {
          return {
            id: app.application_id,
            applicantName: app.applicant_name,
            programType: app.program_type,
            applicationTerm: app.application_term,
            status: app.application_status,
            totalUniversities: 0,
            submissionStats: { pending: 0, submitted: 0, confirmed: 0, failed: 0 },
            universities: []
          };
        }

        const universityQuery = `
          SELECT 
            u.name as university_name,
            s.status,
            s.submitted_at,
            s.confirmed_at,
            s.external_reference,
            s.error_message
          FROM submissions s
          JOIN universities u ON s.university_id = u.id
          WHERE s.recommendation_id = $1
          ORDER BY u.name ASC
        `;

        const universityResult = await this.db.query(universityQuery, [app.recommendation_id]);

        return {
          id: app.application_id,
          applicantName: app.applicant_name,
          programType: app.program_type,
          applicationTerm: app.application_term,
          status: app.application_status,
          totalUniversities: parseInt(app.total_universities) || 0,
          submissionStats: {
            pending: parseInt(app.pending_count) || 0,
            submitted: parseInt(app.submitted_count) || 0,
            confirmed: parseInt(app.confirmed_count) || 0,
            failed: parseInt(app.failed_count) || 0
          },
          universities: universityResult.rows.map(u => ({
            name: u.university_name,
            status: u.status,
            submittedAt: u.submitted_at,
            confirmedAt: u.confirmed_at,
            externalReference: u.external_reference,
            errorMessage: u.error_message
          }))
        };
      })
    );

    // Calculate overall statistics
    const overallStats = {
      totalApplications: applicationsWithDetails.length,
      totalSubmissions: applicationsWithDetails.reduce((sum, app) => sum + app.totalUniversities, 0),
      successRate: 0,
      pendingCount: applicationsWithDetails.reduce((sum, app) => sum + app.submissionStats.pending, 0),
      failedCount: applicationsWithDetails.reduce((sum, app) => sum + app.submissionStats.failed, 0)
    };

    const confirmedCount = applicationsWithDetails.reduce((sum, app) => sum + app.submissionStats.confirmed, 0);
    overallStats.successRate = overallStats.totalSubmissions > 0 
      ? Math.round((confirmedCount / overallStats.totalSubmissions) * 100) 
      : 0;

    return {
      applications: applicationsWithDetails,
      overallStats
    };
  }

  /**
   * Create support ticket for submission issues
   */
  async createSupportTicket(ticketData: {
    userId: string;
    userEmail: string;
    userName: string;
    submissionId?: string;
    issueType: 'submission_failed' | 'confirmation_missing' | 'university_error' | 'other';
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<string> {
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const query = `
      INSERT INTO support_tickets (
        ticket_id, user_id, user_email, user_name, submission_id, 
        issue_type, subject, description, priority, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const result = await this.db.query(query, [
      ticketId,
      ticketData.userId,
      ticketData.userEmail,
      ticketData.userName,
      ticketData.submissionId,
      ticketData.issueType,
      ticketData.subject,
      ticketData.description,
      ticketData.priority
    ]);

    // Create audit trail
    await this.createAuditTrail('support_ticket_created', {
      ticketId,
      userId: ticketData.userId,
      issueType: ticketData.issueType,
      priority: ticketData.priority
    });

    // Send notification to support team
    await this.notifySupportTeam(ticketId, ticketData);

    // Send confirmation to user
    await this.sendSupportTicketConfirmation(ticketData.userEmail, ticketData.userName, ticketId);

    return ticketId;
  }

  /**
   * Create audit trail entry
   */
  async createAuditTrail(action: string, data: Record<string, any>): Promise<void> {
    const query = `
      INSERT INTO submission_audit_trail (
        action, data, ip_address, user_agent, created_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      action,
      JSON.stringify(data),
      data.ipAddress || null,
      data.userAgent || null
    ]);
  }

  /**
   * Get audit trail for a specific submission or recommendation
   */
  async getAuditTrail(filters: {
    submissionId?: string;
    recommendationId?: string;
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    items: Array<{
      id: string;
      action: string;
      data: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      createdAt: Date;
    }>;
    total: number;
  }> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters.submissionId) {
      whereConditions.push(`data->>'submissionId' = $${paramIndex}`);
      params.push(filters.submissionId);
      paramIndex++;
    }

    if (filters.recommendationId) {
      whereConditions.push(`data->>'recommendationId' = $${paramIndex}`);
      params.push(filters.recommendationId);
      paramIndex++;
    }

    if (filters.userId) {
      whereConditions.push(`data->>'userId' = $${paramIndex}`);
      params.push(filters.userId);
      paramIndex++;
    }

    if (filters.action) {
      whereConditions.push(`action = $${paramIndex}`);
      params.push(filters.action);
      paramIndex++;
    }

    if (filters.startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM submission_audit_trail ${whereClause}`;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get items with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const itemsQuery = `
      SELECT id, action, data, ip_address, user_agent, created_at
      FROM submission_audit_trail 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const itemsResult = await this.db.query(itemsQuery, params);

    return {
      items: itemsResult.rows.map(row => ({
        id: row.id,
        action: row.action,
        data: row.data,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at
      })),
      total
    };
  }

  private async storeConfirmationDetails(receipt: ConfirmationReceipt): Promise<void> {
    const query = `
      INSERT INTO submission_confirmations (
        submission_id, confirmation_code, receipt_url, confirmation_method, 
        confirmed_at, additional_data, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (submission_id) DO UPDATE SET
        confirmation_code = EXCLUDED.confirmation_code,
        receipt_url = EXCLUDED.receipt_url,
        confirmation_method = EXCLUDED.confirmation_method,
        confirmed_at = EXCLUDED.confirmed_at,
        additional_data = EXCLUDED.additional_data,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.db.query(query, [
      receipt.submissionId,
      receipt.confirmationCode,
      receipt.receiptUrl,
      receipt.confirmationMethod,
      receipt.confirmedAt,
      JSON.stringify(receipt.additionalData || {})
    ]);
  }

  private async sendConfirmationNotifications(receipt: ConfirmationReceipt): Promise<void> {
    try {
      // Get submission details for notification
      const submission = await this.submissionModel.findById(receipt.submissionId);
      
      if (submission) {
        // Get student details
        const studentQuery = `
          SELECT u.email, u.first_name || ' ' || u.last_name as full_name, u.id as user_id
          FROM users u
          JOIN applications app ON u.id = app.student_id
          JOIN recommendations r ON app.id = r.application_id
          WHERE r.id = $1
        `;
        const studentResult = await this.db.query(studentQuery, [submission.recommendation_id]);
        
        if (studentResult.rows.length > 0) {
          const student = studentResult.rows[0];
          
          // Trigger notification
          const notificationService = getNotificationService();
          await notificationService.handleNotification({
            event: 'submission_confirmed',
            userId: student.user_id,
            data: {
              studentEmail: student.email,
              studentName: student.full_name,
              universityName: receipt.universityName,
              confirmedAt: receipt.confirmedAt.toISOString(),
              externalReference: receipt.externalReference,
              studentId: student.user_id
            }
          });
        }
      }
      
      console.log(`Confirmation notification sent for submission ${receipt.submissionId}`);
    } catch (error) {
      console.error('Failed to send confirmation notification:', error);
      // Don't fail the confirmation process if notification fails
    }
  }

  private async findSubmissionByExternalReference(externalReference: string): Promise<any> {
    const query = `
      SELECT s.*, u.name as university_name, u.code as university_code,
             app.legal_name as applicant_name
      FROM submissions s
      JOIN universities u ON s.university_id = u.id
      JOIN recommendations r ON s.recommendation_id = r.id
      JOIN applications app ON r.application_id = app.id
      WHERE s.external_reference = $1
    `;

    const result = await this.db.query(query, [externalReference]);
    
    if (result.rows.length === 0) {
      throw new AppError('Submission not found', 404);
    }

    return result.rows[0];
  }

  private async checkSubmissionStatus(submission: any): Promise<void> {
    // This would make an API call to the university to check status
    // Implementation depends on university-specific APIs
    console.log(`Checking status for submission ${submission.id} at ${submission.university_name}`);
  }

  private async handleSubmissionRejection(submissionId: string, reason: string): Promise<void> {
    await this.submissionModel.updateStatus(submissionId, 'failed', {
      error_message: `Rejected by university: ${reason}`
    });

    // Broadcast rejection update
    if (this.websocketService) {
      const submission = await this.submissionModel.findById(submissionId);
      const submissionDetails = await this.submissionModel.findById(submissionId);
      await this.websocketService.broadcastSubmissionUpdate({
        submissionId,
        status: 'failed',
        universityName: (submissionDetails as any).university_name || 'Unknown',
        applicantName: (submissionDetails as any).applicant_name || 'Unknown',
        timestamp: new Date(),
        errorMessage: `Rejected by university: ${reason}`
      });
    }
  }

  private async sendConfirmationEmailToStudent(recommendation: any, summary: any): Promise<void> {
    const html = this.generateConfirmationEmailHtml(recommendation, summary, 'student');
    
    await this.emailService.sendEmail({
      to: recommendation.student_email,
      subject: `Recommendation Submission Confirmation - ${recommendation.applicant_name}`,
      html
    });
  }

  private async sendConfirmationEmailToRecommender(recommendation: any, summary: any): Promise<void> {
    const html = this.generateConfirmationEmailHtml(recommendation, summary, 'recommender');
    
    await this.emailService.sendEmail({
      to: recommendation.recommender_email,
      subject: `Recommendation Submission Confirmation - ${recommendation.applicant_name}`,
      html
    });
  }

  private generateConfirmationEmailHtml(recommendation: any, summary: any, recipient: 'student' | 'recommender'): string {
    const recipientName = recipient === 'student' ? recommendation.student_first_name : recommendation.recommender_first_name;
    const greeting = recipient === 'student' ? 
      `Your recommendation letters have been submitted` : 
      `Your recommendation letter has been submitted`;

    const supportContactInfo = `
      <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #1976d2;">Need Help?</h4>
        <p style="margin: 0;">If you have any questions or need assistance with your submissions:</p>
        <ul style="margin: 10px 0;">
          <li>Email: <a href="mailto:support@stellarrec.com">support@stellarrec.com</a></li>
          <li>Phone: 1-800-STELLAR (1-800-783-5527)</li>
          <li>Live Chat: Available in your dashboard</li>
        </ul>
        <p style="margin: 0; font-size: 12px; color: #666;">Our support team is available Monday-Friday, 9 AM - 6 PM EST</p>
      </div>
    `;

    const detailedSubmissionInfo = summary.details.map((detail: any) => {
      let statusIcon = '';
      let statusColor = '';
      let additionalInfo = '';

      switch (detail.status) {
        case 'confirmed':
          statusIcon = '✅';
          statusColor = '#4caf50';
          additionalInfo = detail.externalReference ? 
            `<div style="font-size: 12px; color: #666; margin-top: 5px;">Reference: ${detail.externalReference}</div>` : '';
          break;
        case 'submitted':
          statusIcon = '📤';
          statusColor = '#2196f3';
          additionalInfo = detail.submittedAt ? 
            `<div style="font-size: 12px; color: #666; margin-top: 5px;">Submitted: ${new Date(detail.submittedAt).toLocaleDateString()}</div>` : '';
          break;
        case 'pending':
          statusIcon = '⏳';
          statusColor = '#ff9800';
          additionalInfo = '<div style="font-size: 12px; color: #666; margin-top: 5px;">Processing...</div>';
          break;
        case 'failed':
          statusIcon = '❌';
          statusColor = '#f44336';
          additionalInfo = detail.errorMessage ? 
            `<div style="font-size: 12px; color: #f44336; margin-top: 5px;">Error: ${detail.errorMessage}</div>` : '';
          break;
      }

      return `
        <div class="status-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
          <div style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 5px;">${detail.universityName}</div>
            ${additionalInfo}
          </div>
          <div style="text-align: right;">
            <span style="color: ${statusColor}; font-weight: bold;">${statusIcon} ${detail.status.toUpperCase()}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comprehensive Submission Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background: #f9f9f9; }
          .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .status-item { display: flex; justify-content: space-between; align-items: flex-start; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .stat-number { font-size: 24px; font-weight: bold; color: #1976d2; }
          .application-details { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .next-steps { background: #e8f5e8; border: 1px solid #4caf50; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Comprehensive Submission Report</h1>
          <p>${greeting}</p>
        </div>

        <div class="content">
          <h2>Hi ${recipientName},</h2>
          <p>This comprehensive report provides the complete status of recommendation submissions for <strong>${recommendation.applicant_name}</strong>.</p>

          <div class="application-details">
            <h4 style="margin: 0 0 10px 0;">Application Details</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Applicant:</strong> ${recommendation.applicant_name}</li>
              <li><strong>Program:</strong> ${recommendation.program_type}</li>
              <li><strong>Term:</strong> ${recommendation.application_term}</li>
              ${recipient === 'student' && recommendation.recommender_first_name ? 
                `<li><strong>Recommender:</strong> ${recommendation.recommender_first_name} ${recommendation.recommender_last_name || ''}</li>` : ''}
              ${recipient === 'recommender' && recommendation.recommender_title ? 
                `<li><strong>Your Title:</strong> ${recommendation.recommender_title}</li>` : ''}
            </ul>
          </div>

          <div class="stats">
            <div class="stat">
              <div class="stat-number">${summary.totalSubmissions}</div>
              <div>Total Universities</div>
            </div>
            <div class="stat">
              <div class="stat-number" style="color: #4caf50;">${summary.confirmed}</div>
              <div>Confirmed</div>
            </div>
            <div class="stat">
              <div class="stat-number" style="color: #ff9800;">${summary.pending}</div>
              <div>Pending</div>
            </div>
            <div class="stat">
              <div class="stat-number" style="color: #f44336;">${summary.failed}</div>
              <div>Failed</div>
            </div>
          </div>

          <div class="summary">
            <h3>Detailed Submission Status</h3>
            ${detailedSubmissionInfo}
          </div>

          ${summary.confirmed === summary.totalSubmissions ? `
            <div class="next-steps">
              <h4 style="margin: 0 0 10px 0; color: #2e7d32;">🎉 All Submissions Successful!</h4>
              <p style="margin: 0;">Congratulations! All recommendation letters have been successfully submitted and confirmed by the universities. You can now track your application progress through each university's admissions portal.</p>
            </div>
          ` : ''}

          ${summary.failed > 0 ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <h4 style="margin: 0 0 10px 0; color: #f57c00;">⚠️ Action Required</h4>
              <p style="margin: 0 0 10px 0;"><strong>${summary.failed} submission(s) failed.</strong> Our support team has been automatically notified and will work to resolve these issues.</p>
              <p style="margin: 0;">We will retry failed submissions automatically. If issues persist, we will contact you with alternative submission methods.</p>
            </div>
          ` : ''}

          ${summary.pending > 0 ? `
            <div style="background: #fff8e1; border: 1px solid #ffb74d; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <h4 style="margin: 0 0 10px 0; color: #f57c00;">⏳ Submissions in Progress</h4>
              <p style="margin: 0;">${summary.pending} submission(s) are currently being processed. You will receive updates as confirmations are received from universities.</p>
            </div>
          ` : ''}

          ${supportContactInfo}

          <p><strong>Next Steps:</strong></p>
          <ul>
            <li>Monitor your dashboard for real-time status updates</li>
            <li>Check your email for confirmation receipts from universities</li>
            <li>Contact support if you have any questions or concerns</li>
            ${recipient === 'student' ? '<li>Follow up with universities directly if needed</li>' : ''}
          </ul>

          <p style="margin-top: 30px;">Thank you for using StellarRec™ to streamline your recommendation process!</p>
        </div>

        <div class="footer">
          <p>© 2024 StellarRec™. All rights reserved.</p>
          <p>This is an automated comprehensive confirmation report.</p>
          <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  private async notifySupportTeam(ticketId: string, ticketData: any): Promise<void> {
    try {
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@stellarrec.com';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New Support Ticket - ${ticketId}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9f9f9; }
            .ticket-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .priority-high { border-left: 4px solid #f44336; }
            .priority-urgent { border-left: 4px solid #d32f2f; background: #ffebee; }
            .priority-medium { border-left: 4px solid #ff9800; }
            .priority-low { border-left: 4px solid #4caf50; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎫 New Support Ticket</h1>
            <p>Ticket ID: ${ticketId}</p>
          </div>

          <div class="content">
            <div class="ticket-details priority-${ticketData.priority}">
              <h3>Ticket Details</h3>
              <ul>
                <li><strong>Priority:</strong> ${ticketData.priority.toUpperCase()}</li>
                <li><strong>Issue Type:</strong> ${ticketData.issueType.replace('_', ' ').toUpperCase()}</li>
                <li><strong>User:</strong> ${ticketData.userName} (${ticketData.userEmail})</li>
                <li><strong>Subject:</strong> ${ticketData.subject}</li>
                ${ticketData.submissionId ? `<li><strong>Submission ID:</strong> ${ticketData.submissionId}</li>` : ''}
              </ul>
              
              <h4>Description:</h4>
              <p style="background: #f5f5f5; padding: 15px; border-radius: 4px;">${ticketData.description}</p>
            </div>

            <p><strong>Action Required:</strong> Please review and respond to this support ticket within the appropriate SLA timeframe.</p>
          </div>
        </body>
        </html>
      `;

      await this.emailService.sendEmail({
        to: supportEmail,
        subject: `[${ticketData.priority.toUpperCase()}] New Support Ticket - ${ticketId}`,
        html
      });
    } catch (error) {
      console.error('Failed to notify support team:', error);
      // Don't throw error to avoid breaking ticket creation
    }
  }

  private async sendSupportTicketConfirmation(userEmail: string, userName: string, ticketId: string): Promise<void> {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Support Ticket Created - ${ticketId}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2196f3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; background: #f9f9f9; }
            .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎫 Support Ticket Created</h1>
            <p>We're here to help!</p>
          </div>

          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Thank you for contacting StellarRec™ support. We have received your support request and created a ticket for you.</p>

            <div class="ticket-info">
              <h3>Your Ticket Information</h3>
              <ul>
                <li><strong>Ticket ID:</strong> ${ticketId}</li>
                <li><strong>Status:</strong> Open</li>
                <li><strong>Created:</strong> ${new Date().toLocaleString()}</li>
              </ul>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                <li>Our support team will review your request</li>
                <li>You will receive a response within 24 hours</li>
                <li>We will keep you updated on the progress</li>
                <li>You can reply to this email to add more information</li>
              </ul>
            </div>

            <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0;">Need Immediate Help?</h4>
              <ul style="margin: 0;">
                <li>Email: <a href="mailto:support@stellarrec.com">support@stellarrec.com</a></li>
                <li>Phone: 1-800-STELLAR (1-800-783-5527)</li>
                <li>Live Chat: Available in your dashboard</li>
              </ul>
            </div>

            <p>Thank you for using StellarRec™!</p>
          </div>

          <div class="footer">
            <p>© 2024 StellarRec™. All rights reserved.</p>
            <p>Reference: ${ticketId}</p>
          </div>
        </body>
        </html>
      `;

      await this.emailService.sendEmail({
        to: userEmail,
        subject: `Support Ticket Created - ${ticketId}`,
        html
      });
    } catch (error) {
      console.error('Failed to send support ticket confirmation:', error);
      // Don't throw error to avoid breaking ticket creation
    }
  }
}

// Create the submission_confirmations table
export async function createSubmissionConfirmationsTable(db: Pool): Promise<void> {
  const query = `
    CREATE TABLE IF NOT EXISTS submission_confirmations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      confirmation_code VARCHAR(255),
      receipt_url TEXT,
      confirmation_method VARCHAR(50) NOT NULL CHECK (confirmation_method IN ('email', 'api', 'webhook', 'manual')),
      confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL,
      additional_data JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(submission_id)
    );

    CREATE INDEX IF NOT EXISTS idx_submission_confirmations_submission_id 
    ON submission_confirmations(submission_id);
    
    CREATE INDEX IF NOT EXISTS idx_submission_confirmations_confirmed_at 
    ON submission_confirmations(confirmed_at);

    CREATE TRIGGER IF NOT EXISTS update_submission_confirmations_updated_at 
    BEFORE UPDATE ON submission_confirmations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;

  await db.query(query);
}