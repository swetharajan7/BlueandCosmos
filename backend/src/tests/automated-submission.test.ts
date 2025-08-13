import { Pool } from 'pg';
import { UniversityIntegrationService, EmailSubmissionAdapter, ApiSubmissionAdapter, ManualSubmissionAdapter } from '../services/universityIntegrationService';
import { SubmissionConfirmationService } from '../services/submissionConfirmationService';
import { WebSocketService } from '../services/websocketService';
import { University } from '../types';

// Mock axios
jest.mock('axios');

// Mock email service
jest.mock('../services/emailService', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock the database
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
} as unknown as Pool;

// Mock WebSocket service
const mockWebSocketService = {
  broadcastSubmissionUpdate: jest.fn(),
  broadcastBulkSubmissionProgress: jest.fn()
} as unknown as WebSocketService;

describe('Automated Submission System', () => {
  describe('Email Submission Adapter', () => {
    let adapter: EmailSubmissionAdapter;
    let university: University;

    beforeEach(() => {
      university = {
        id: 'univ-1',
        name: 'Test University',
        code: 'TEST',
        submission_format: 'email',
        email_address: 'admissions@test.edu',
        requirements: [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      adapter = new EmailSubmissionAdapter(university);
    });

    it('should create properly formatted email content', async () => {
      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'This is a test recommendation letter for John Doe.',
        wordCount: 100,
        submissionId: 'sub-1'
      };

      // Mock the email service to capture the email content
      const mockSendEmail = jest.fn();
      (adapter as any).emailService = { sendEmail: mockSendEmail };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(true);
      expect(result.externalReference).toMatch(/^EMAIL_/);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admissions@test.edu',
          subject: expect.stringContaining('John Doe'),
          html: expect.stringContaining('John Doe'),
          text: expect.stringContaining('John Doe')
        })
      );
    });

    it('should fail when university email is not configured', async () => {
      const universityWithoutEmail = {
        ...university,
        email_address: undefined
      };
      adapter = new EmailSubmissionAdapter(universityWithoutEmail);

      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Test content',
        wordCount: 100,
        submissionId: 'sub-1'
      };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('University email address not configured');
    });
  });

  describe('API Submission Adapter', () => {
    let adapter: ApiSubmissionAdapter;
    let university: University;

    beforeEach(() => {
      university = {
        id: 'univ-1',
        name: 'Test University',
        code: 'TEST',
        submission_format: 'api',
        api_endpoint: 'https://api.test.edu/submissions',
        requirements: [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      adapter = new ApiSubmissionAdapter(university);
    });

    it('should handle API submission with retry logic', async () => {
      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Test content',
        wordCount: 100,
        submissionId: 'sub-1'
      };

      // Mock axios to simulate successful API call
      const axios = require('axios');
      axios.post = jest.fn().mockResolvedValue({
        status: 200,
        data: { referenceId: 'API_REF_123' }
      });

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(true);
      expect(result.externalReference).toBe('API_REF_123');
    });

    it('should fail when API endpoint is not configured', async () => {
      const universityWithoutApi = {
        ...university,
        api_endpoint: undefined
      };
      adapter = new ApiSubmissionAdapter(universityWithoutApi);

      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Test content',
        wordCount: 100,
        submissionId: 'sub-1'
      };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('University API endpoint not configured');
    });
  });

  describe('Manual Submission Adapter', () => {
    let adapter: ManualSubmissionAdapter;
    let university: University;

    beforeEach(() => {
      university = {
        id: 'univ-1',
        name: 'Test University',
        code: 'TEST',
        submission_format: 'manual',
        requirements: [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      adapter = new ManualSubmissionAdapter(university);
    });

    it('should always succeed for manual submissions', async () => {
      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Test content',
        wordCount: 100,
        submissionId: 'sub-1'
      };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(true);
      expect(result.externalReference).toMatch(/^MANUAL_/);
    });
  });

  describe('Submission Confirmation Service', () => {
    let confirmationService: SubmissionConfirmationService;

    beforeEach(() => {
      confirmationService = new SubmissionConfirmationService(mockDb, mockWebSocketService);
    });

    it('should process confirmation receipt correctly', async () => {
      const receipt = {
        submissionId: 'sub-1',
        universityName: 'Test University',
        applicantName: 'John Doe',
        externalReference: 'EXT_REF_123',
        confirmedAt: new Date(),
        confirmationMethod: 'email' as const
      };

      // Mock the submission model methods
      const mockSubmissionModel = {
        updateStatus: jest.fn().mockResolvedValue({}),
        findById: jest.fn().mockResolvedValue({})
      };

      // Replace the submission model in the service
      (confirmationService as any).submissionModel = mockSubmissionModel;

      // Mock database operations for storing confirmation details
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await confirmationService.processConfirmationReceipt(receipt);

      expect(mockSubmissionModel.updateStatus).toHaveBeenCalledWith(
        'sub-1',
        'confirmed',
        expect.objectContaining({
          external_reference: 'EXT_REF_123',
          confirmed_at: receipt.confirmedAt
        })
      );

      expect(mockWebSocketService.broadcastSubmissionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: 'sub-1',
          status: 'confirmed',
          universityName: 'Test University',
          applicantName: 'John Doe'
        })
      );
    });

    it('should generate confirmation summary correctly', async () => {
      const recommendationId = 'rec-1';
      
      // Mock database query for submissions
      (mockDb.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'sub-1',
            university_name: 'Test University 1',
            status: 'confirmed',
            submitted_at: new Date(),
            confirmed_at: new Date(),
            external_reference: 'EXT_REF_1'
          },
          {
            id: 'sub-2',
            university_name: 'Test University 2',
            status: 'pending',
            submitted_at: new Date(),
            external_reference: 'EXT_REF_2'
          },
          {
            id: 'sub-3',
            university_name: 'Test University 3',
            status: 'failed',
            error_message: 'Submission failed'
          }
        ]
      });

      const summary = await confirmationService.generateConfirmationSummary(recommendationId);

      expect(summary.totalSubmissions).toBe(3);
      expect(summary.confirmed).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.details).toHaveLength(3);
    });
  });

  describe('Real-time Status Updates', () => {
    let integrationService: UniversityIntegrationService;

    beforeEach(() => {
      integrationService = new UniversityIntegrationService(mockDb, mockWebSocketService);
    });

    it('should broadcast status updates during submission process', async () => {
      const submissionId = 'sub-1';
      
      // Mock submission data
      const mockSubmission = {
        id: submissionId,
        status: 'pending',
        university_id: 'univ-1',
        applicant_name: 'John Doe',
        recommendation_content: 'Test content',
        program_type: 'graduate',
        application_term: 'Fall 2024',
        word_count: 100
      };

      const mockUniversity = {
        id: 'univ-1',
        name: 'Test University',
        submission_format: 'email',
        email_address: 'admissions@test.edu'
      };

      // Mock model methods
      (integrationService as any).submissionModel = {
        findById: jest.fn().mockResolvedValue(mockSubmission),
        updateStatus: jest.fn().mockResolvedValue(mockSubmission)
      };

      (integrationService as any).universityModel = {
        findById: jest.fn().mockResolvedValue(mockUniversity)
      };

      // Mock the email service to avoid actual email sending
      const EmailService = require('../services/emailService').EmailService;
      EmailService.mockImplementation(() => ({
        sendEmail: jest.fn().mockResolvedValue(undefined)
      }));

      await integrationService.processSubmission(submissionId);

      // Verify that WebSocket updates were sent (validation start, submission start, completion, and possibly error handling)
      expect(mockWebSocketService.broadcastSubmissionUpdate).toHaveBeenCalled();
      expect(mockWebSocketService.broadcastSubmissionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: 'sub-1',
          status: 'submitted',
          universityName: 'Test University',
          applicantName: 'John Doe'
        })
      );
    });
  });
});