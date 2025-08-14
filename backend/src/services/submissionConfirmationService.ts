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
        SELECT r.*, a.legal_name as applicant_name, a.student_id, 
               rec.user_id as recommender_user_id,
               u_student.email as student_email, u_student.first_name as student_first_name,
               u_recommender.email as recommender_email, u_recommender.first_name as recommender_first_name
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

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Recommendation Submission Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background: #f9f9f9; }
          .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .status-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .status-confirmed { color: #4caf50; font-weight: bold; }
          .status-pending { color: #ff9800; font-weight: bold; }
          .status-failed { color: #f44336; font-weight: bold; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; color: #1976d2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Submission Confirmation</h1>
          <p>${greeting}</p>
        </div>

        <div class="content">
          <h2>Hi ${recipientName},</h2>
          <p>This email confirms the submission status of recommendation letters for <strong>${recommendation.applicant_name}</strong>.</p>

          <div class="stats">
            <div class="stat">
              <div class="stat-number">${summary.totalSubmissions}</div>
              <div>Total</div>
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
            <h3>Submission Details</h3>
            ${summary.details.map((detail: any) => `
              <div class="status-item">
                <span>${detail.universityName}</span>
                <span class="status-${detail.status}">${detail.status.toUpperCase()}</span>
              </div>
            `).join('')}
          </div>

          ${summary.failed > 0 ? `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <p><strong>Action Required:</strong> Some submissions failed. Please contact support for assistance with failed submissions.</p>
            </div>
          ` : ''}

          <p>You can track the real-time status of your submissions by logging into your StellarRec™ dashboard.</p>
        </div>

        <div class="footer">
          <p>© 2024 StellarRec™. All rights reserved.</p>
          <p>This is an automated confirmation email.</p>
        </div>
      </body>
      </html>
    `;
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