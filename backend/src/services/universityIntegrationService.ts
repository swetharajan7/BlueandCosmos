import { Pool } from 'pg';
import { Submission, University } from '../types';
import { SubmissionModel } from '../models/Submission';
import { UniversityModel } from '../models/University';
import { AppError } from '../utils/AppError';
import { EmailService } from './emailService';
import { WebSocketService, SubmissionStatusUpdate } from './websocketService';
import { getNotificationService } from './notificationService';
import axios from 'axios';

// Abstract base class for university submission adapters
export abstract class UniversitySubmissionAdapter {
  protected university: University;

  constructor(university: University) {
    this.university = university;
  }

  abstract submitRecommendation(submissionData: {
    applicantName: string;
    programType: string;
    applicationTerm: string;
    recommendationContent: string;
    wordCount: number;
    submissionId: string;
  }): Promise<{
    success: boolean;
    externalReference?: string;
    errorMessage?: string;
  }>;

  abstract validateSubmission(submissionData: any): Promise<boolean>;

  protected formatRecommendationContent(data: {
    applicantName: string;
    programType: string;
    applicationTerm: string;
    recommendationContent: string;
    universityName: string;
  }): string {
    const header = `Recommendation Letter for ${data.applicantName}\n`;
    const programInfo = `Program: ${data.programType}\n`;
    const termInfo = `Application Term: ${data.applicationTerm}\n`;
    const universityInfo = `University: ${data.universityName}\n\n`;
    
    return header + programInfo + termInfo + universityInfo + data.recommendationContent;
  }
}

// Email-based submission adapter
export class EmailSubmissionAdapter extends UniversitySubmissionAdapter {
  private emailService: EmailService;

  constructor(university: University) {
    super(university);
    this.emailService = new EmailService();
  }

  async submitRecommendation(submissionData: {
    applicantName: string;
    programType: string;
    applicationTerm: string;
    recommendationContent: string;
    wordCount: number;
    submissionId: string;
  }): Promise<{
    success: boolean;
    externalReference?: string;
    errorMessage?: string;
  }> {
    try {
      if (!this.university.email_address) {
        throw new Error('University email address not configured');
      }

      const formattedContent = this.formatRecommendationContent({
        applicantName: submissionData.applicantName,
        programType: submissionData.programType,
        applicationTerm: submissionData.applicationTerm,
        recommendationContent: submissionData.recommendationContent,
        universityName: this.university.name
      });

      // Create professional email subject
      const subject = `Letter of Recommendation for ${submissionData.applicantName} - ${submissionData.programType} Program Application`;

      // Create HTML email content
      const htmlContent = this.createEmailHtml({
        applicantName: submissionData.applicantName,
        programType: submissionData.programType,
        applicationTerm: submissionData.applicationTerm,
        universityName: this.university.name,
        recommendationContent: submissionData.recommendationContent,
        wordCount: submissionData.wordCount
      });

      // Send email via email service
      await this.emailService.sendEmail({
        to: this.university.email_address,
        subject: subject,
        html: htmlContent,
        text: formattedContent
      });

      const emailReference = `EMAIL_${Date.now()}_${submissionData.submissionId.substring(0, 8)}`;
      
      return {
        success: true,
        externalReference: emailReference
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private createEmailHtml(data: {
    applicantName: string;
    programType: string;
    applicationTerm: string;
    universityName: string;
    recommendationContent: string;
    wordCount: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Letter of Recommendation - ${data.applicantName}</title>
        <style>
          body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1976d2; padding-bottom: 20px; }
          .header h1 { color: #1976d2; margin: 0; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .application-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .application-details h3 { margin-top: 0; color: #1976d2; }
          .application-details table { width: 100%; border-collapse: collapse; }
          .application-details td { padding: 8px 0; border-bottom: 1px solid #eee; }
          .application-details td:first-child { font-weight: bold; width: 150px; }
          .recommendation-content { margin: 30px 0; padding: 20px; background: white; border-left: 4px solid #1976d2; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          .metadata { font-size: 11px; color: #999; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Letter of Recommendation</h1>
          <p>Submitted via StellarRec™ Universal Recommendation System</p>
        </div>

        <div class="application-details">
          <h3>Application Details</h3>
          <table>
            <tr>
              <td>Applicant Name:</td>
              <td>${data.applicantName}</td>
            </tr>
            <tr>
              <td>University:</td>
              <td>${data.universityName}</td>
            </tr>
            <tr>
              <td>Program Type:</td>
              <td>${data.programType.charAt(0).toUpperCase() + data.programType.slice(1)}</td>
            </tr>
            <tr>
              <td>Application Term:</td>
              <td>${data.applicationTerm}</td>
            </tr>
            <tr>
              <td>Word Count:</td>
              <td>${data.wordCount} words</td>
            </tr>
            <tr>
              <td>Submission Date:</td>
              <td>${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              })}</td>
            </tr>
          </table>
        </div>

        <div class="recommendation-content">
          <h3>Letter of Recommendation</h3>
          ${data.recommendationContent.split('\n').map(paragraph => 
            paragraph.trim() ? `<p>${paragraph.trim()}</p>` : ''
          ).join('')}
        </div>

        <div class="footer">
          <p>This recommendation letter was submitted through StellarRec™, a secure university recommendation platform.</p>
          <p>For verification or inquiries, please contact the recommender directly.</p>
          
          <div class="metadata">
            <p>Submission ID: ${Date.now()}_${Math.random().toString(36).substring(2, 8)}</p>
            <p>Generated on: ${new Date().toISOString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async validateSubmission(submissionData: any): Promise<boolean> {
    // Validate required fields for email submission
    return !!(
      submissionData.applicantName &&
      submissionData.recommendationContent &&
      submissionData.programType &&
      submissionData.applicationTerm &&
      this.university.email_address
    );
  }
}

// API-based submission adapter
export class ApiSubmissionAdapter extends UniversitySubmissionAdapter {
  private readonly timeout = 30000; // 30 seconds
  private readonly maxRetries = 3;

  async submitRecommendation(submissionData: {
    applicantName: string;
    programType: string;
    applicationTerm: string;
    recommendationContent: string;
    wordCount: number;
    submissionId: string;
  }): Promise<{
    success: boolean;
    externalReference?: string;
    errorMessage?: string;
  }> {
    try {
      if (!this.university.api_endpoint) {
        throw new Error('University API endpoint not configured');
      }

      // Prepare API payload
      const payload = {
        applicant: {
          name: submissionData.applicantName,
          programType: submissionData.programType,
          applicationTerm: submissionData.applicationTerm
        },
        recommendation: {
          content: submissionData.recommendationContent,
          wordCount: submissionData.wordCount,
          submissionId: submissionData.submissionId,
          submittedAt: new Date().toISOString()
        },
        university: {
          name: this.university.name,
          code: this.university.code
        },
        metadata: {
          source: 'StellarRec',
          version: '1.0',
          format: 'json'
        }
      };

      // Make API call with retry logic
      const response = await this.makeApiCallWithRetry(payload);
      
      return {
        success: true,
        externalReference: response.referenceId || `API_${Date.now()}_${submissionData.submissionId.substring(0, 8)}`
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async makeApiCallWithRetry(payload: any, attempt: number = 1): Promise<any> {
    try {
      const response = await axios.post(this.university.api_endpoint!, payload, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'StellarRec/1.0',
          'X-Submission-Source': 'StellarRec',
          'X-University-Code': this.university.code,
          // Add authentication headers if configured
          ...(process.env.UNIVERSITY_API_KEY && {
            'Authorization': `Bearer ${process.env.UNIVERSITY_API_KEY}`
          })
        },
        validateStatus: (status) => status < 500 // Only retry on 5xx errors
      });

      // Check if the response indicates success
      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        throw new Error(`University API returned status ${response.status}: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      if (attempt < this.maxRetries && this.isRetryableError(error)) {
        console.log(`API call attempt ${attempt} failed, retrying... Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Exponential backoff: wait 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return this.makeApiCallWithRetry(payload, attempt + 1);
      }
      
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      // Retry on network errors, timeouts, and 5xx server errors
      return (
        error.code === 'ECONNABORTED' || // Timeout
        error.code === 'ENOTFOUND' ||   // DNS error
        error.code === 'ECONNREFUSED' || // Connection refused
        (error.response?.status !== undefined && error.response.status >= 500) // Server errors
      );
    }
    return false;
  }

  async validateSubmission(submissionData: any): Promise<boolean> {
    // Validate required fields for API submission
    return !!(
      submissionData.applicantName &&
      submissionData.recommendationContent &&
      submissionData.programType &&
      submissionData.applicationTerm &&
      this.university.api_endpoint
    );
  }
}

// Manual submission adapter (for universities that require manual processing)
export class ManualSubmissionAdapter extends UniversitySubmissionAdapter {
  async submitRecommendation(submissionData: {
    applicantName: string;
    programType: string;
    applicationTerm: string;
    recommendationContent: string;
    wordCount: number;
    submissionId: string;
  }): Promise<{
    success: boolean;
    externalReference?: string;
    errorMessage?: string;
  }> {
    try {
      // For manual submissions, we just mark them as requiring manual intervention
      const manualReference = `MANUAL_${Date.now()}_${submissionData.submissionId.substring(0, 8)}`;
      
      return {
        success: true,
        externalReference: manualReference
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async validateSubmission(submissionData: any): Promise<boolean> {
    // Manual submissions just need basic data
    return !!(
      submissionData.applicantName &&
      submissionData.recommendationContent &&
      submissionData.programType &&
      submissionData.applicationTerm
    );
  }
}

// Factory for creating submission adapters
export class SubmissionAdapterFactory {
  static createAdapter(university: University): UniversitySubmissionAdapter {
    switch (university.submission_format) {
      case 'email':
        return new EmailSubmissionAdapter(university);
      case 'api':
        return new ApiSubmissionAdapter(university);
      case 'manual':
        return new ManualSubmissionAdapter(university);
      default:
        throw new AppError(`Unsupported submission format: ${university.submission_format}`, 400);
    }
  }
}

// Main university integration service
export class UniversityIntegrationService {
  private db: Pool;
  private submissionModel: SubmissionModel;
  private universityModel: UniversityModel;
  private websocketService?: WebSocketService;

  constructor(db: Pool, websocketService?: WebSocketService) {
    this.db = db;
    this.submissionModel = new SubmissionModel(db);
    this.universityModel = new UniversityModel(db);
    this.websocketService = websocketService;
  }

  async submitRecommendation(recommendationId: string, universityIds: string[]): Promise<{
    successful: Submission[];
    failed: Array<{ universityId: string; error: string }>;
  }> {
    const successful: Submission[] = [];
    const failed: Array<{ universityId: string; error: string }> = [];

    try {
      // Create bulk submissions
      const submissions = await this.submissionModel.createBulkSubmissions(recommendationId, universityIds);
      
      // Send initial progress update
      if (this.websocketService) {
        await this.websocketService.broadcastBulkSubmissionProgress(recommendationId, {
          completed: 0,
          total: submissions.length,
          message: 'Starting submission process...'
        });
      }
      
      // Process each submission
      for (let i = 0; i < submissions.length; i++) {
        const submission = submissions[i];
        try {
          // Send progress update
          if (this.websocketService) {
            const university = await this.universityModel.findById(submission.university_id);
            await this.websocketService.broadcastBulkSubmissionProgress(recommendationId, {
              completed: i,
              total: submissions.length,
              currentUniversity: university.name,
              message: `Submitting to ${university.name}...`
            });
          }

          await this.processSubmission(submission.id);
          successful.push(submission);
        } catch (error) {
          failed.push({
            universityId: submission.university_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Send completion progress update
      if (this.websocketService) {
        await this.websocketService.broadcastBulkSubmissionProgress(recommendationId, {
          completed: submissions.length,
          total: submissions.length,
          message: `Completed: ${successful.length} successful, ${failed.length} failed`
        });
      }

      return { successful, failed };
    } catch (error) {
      throw new AppError(
        `Failed to submit recommendation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }

  async processSubmission(submissionId: string): Promise<void> {
    const submission = await this.submissionModel.findById(submissionId) as any;
    
    if (submission.status !== 'pending') {
      throw new AppError('Submission is not in pending status', 400);
    }

    const university = await this.universityModel.findById(submission.university_id);
    const adapter = SubmissionAdapterFactory.createAdapter(university);

    // Send status update: validation starting
    await this.broadcastStatusUpdate({
      submissionId,
      status: 'pending',
      universityName: university.name,
      applicantName: submission.applicant_name || 'Unknown',
      timestamp: new Date(),
      progress: { current: 1, total: 3, message: 'Validating submission data...' }
    });

    // Validate submission data
    const isValid = await adapter.validateSubmission({
      applicantName: submission.applicant_name,
      recommendationContent: submission.recommendation_content,
      programType: submission.program_type,
      applicationTerm: submission.application_term
    });

    if (!isValid) {
      await this.submissionModel.updateStatus(submissionId, 'failed', {
        error_message: 'Submission validation failed'
      });
      
      await this.broadcastStatusUpdate({
        submissionId,
        status: 'failed',
        universityName: university.name,
        applicantName: submission.applicant_name || 'Unknown',
        timestamp: new Date(),
        errorMessage: 'Submission validation failed'
      });
      
      throw new AppError('Submission validation failed', 400);
    }

    // Send status update: submission starting
    await this.broadcastStatusUpdate({
      submissionId,
      status: 'pending',
      universityName: university.name,
      applicantName: submission.applicant_name || 'Unknown',
      timestamp: new Date(),
      progress: { current: 2, total: 3, message: `Submitting to ${university.name}...` }
    });

    // Attempt submission
    const result = await adapter.submitRecommendation({
      applicantName: submission.applicant_name,
      programType: submission.program_type,
      applicationTerm: submission.application_term,
      recommendationContent: submission.recommendation_content,
      wordCount: submission.word_count,
      submissionId: submissionId
    });

    if (result.success) {
      await this.submissionModel.updateStatus(submissionId, 'submitted', {
        external_reference: result.externalReference,
        submitted_at: new Date()
      });

      await this.broadcastStatusUpdate({
        submissionId,
        status: 'submitted',
        universityName: university.name,
        applicantName: submission.applicant_name || 'Unknown',
        timestamp: new Date(),
        externalReference: result.externalReference,
        progress: { current: 3, total: 3, message: 'Successfully submitted!' }
      });
    } else {
      await this.submissionModel.updateStatus(submissionId, 'failed', {
        error_message: result.errorMessage
      });

      await this.broadcastStatusUpdate({
        submissionId,
        status: 'failed',
        universityName: university.name,
        applicantName: submission.applicant_name || 'Unknown',
        timestamp: new Date(),
        errorMessage: result.errorMessage
      });

      // Trigger failure notification
      try {
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
          
          const notificationService = getNotificationService();
          await notificationService.handleNotification({
            event: 'submission_failed',
            userId: student.user_id,
            data: {
              studentEmail: student.email,
              studentName: student.full_name,
              universityName: university.name,
              errorMessage: result.errorMessage || 'Submission failed',
              nextRetryAt: 'Soon', // Could be calculated based on retry schedule
              studentId: student.user_id
            }
          });
        }
      } catch (error) {
        console.error('Failed to send failure notification:', error);
        // Don't fail the submission process if notification fails
      }
      
      throw new AppError(result.errorMessage || 'Submission failed', 500);
    }
  }

  private async broadcastStatusUpdate(update: SubmissionStatusUpdate): Promise<void> {
    if (this.websocketService) {
      await this.websocketService.broadcastSubmissionUpdate(update);
    }
  }

  async retryFailedSubmission(submissionId: string): Promise<void> {
    const submission = await this.submissionModel.findById(submissionId);
    
    if (submission.retry_count >= 5) {
      throw new AppError('Maximum retry attempts exceeded', 400);
    }

    // Increment retry count
    await this.submissionModel.incrementRetryCount(submissionId);
    
    // Reset status to pending for retry
    await this.submissionModel.updateStatus(submissionId, 'pending', {
      error_message: undefined
    });

    // Process the submission again
    await this.processSubmission(submissionId);
  }

  async getSubmissionStatus(submissionId: string): Promise<Submission> {
    return await this.submissionModel.findById(submissionId);
  }

  async getSubmissionsByRecommendation(recommendationId: string): Promise<Submission[]> {
    return await this.submissionModel.findByRecommendationId(recommendationId);
  }

  async getSubmissionStats(): Promise<{
    pending: number;
    submitted: number;
    confirmed: number;
    failed: number;
    total: number;
  }> {
    return await this.submissionModel.getSubmissionStats();
  }

  async validateUniversityRequirements(universityId: string, submissionData: any): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const university = await this.universityModel.findById(universityId);
    const errors: string[] = [];

    // Check university-specific requirements
    for (const requirement of university.requirements) {
      if (requirement.is_required) {
        switch (requirement.requirement_type) {
          case 'program_type':
            if (submissionData.programType !== requirement.requirement_value) {
              errors.push(`Program type ${submissionData.programType} not supported by ${university.name}`);
            }
            break;
          case 'min_word_count':
            const minWords = parseInt(requirement.requirement_value);
            if (submissionData.wordCount < minWords) {
              errors.push(`Recommendation must be at least ${minWords} words for ${university.name}`);
            }
            break;
          case 'max_word_count':
            const maxWords = parseInt(requirement.requirement_value);
            if (submissionData.wordCount > maxWords) {
              errors.push(`Recommendation must not exceed ${maxWords} words for ${university.name}`);
            }
            break;
          case 'required_field':
            if (!submissionData[requirement.requirement_value]) {
              errors.push(`Required field ${requirement.requirement_value} missing for ${university.name}`);
            }
            break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}