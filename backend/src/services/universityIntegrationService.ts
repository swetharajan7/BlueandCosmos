import { Pool } from 'pg';
import { Submission, University } from '../types';
import { SubmissionModel } from '../models/Submission';
import { UniversityModel } from '../models/University';
import { AppError } from '../utils/AppError';

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

      // TODO: Integrate with email service (SendGrid)
      // For now, we'll simulate the email sending
      const emailReference = `EMAIL_${Date.now()}_${submissionData.submissionId.substring(0, 8)}`;
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

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

      // TODO: Implement actual API calls to university systems
      // For now, we'll simulate the API call
      const apiReference = `API_${Date.now()}_${submissionData.submissionId.substring(0, 8)}`;
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate occasional API failures for testing
      if (Math.random() < 0.1) {
        throw new Error('University API temporarily unavailable');
      }

      return {
        success: true,
        externalReference: apiReference
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
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

  constructor(db: Pool) {
    this.db = db;
    this.submissionModel = new SubmissionModel(db);
    this.universityModel = new UniversityModel(db);
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
      
      // Process each submission
      for (const submission of submissions) {
        try {
          await this.processSubmission(submission.id);
          successful.push(submission);
        } catch (error) {
          failed.push({
            universityId: submission.university_id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
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
      throw new AppError('Submission validation failed', 400);
    }

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
    } else {
      await this.submissionModel.updateStatus(submissionId, 'failed', {
        error_message: result.errorMessage
      });
      throw new AppError(result.errorMessage || 'Submission failed', 500);
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