import { OpenAIService } from '../services/aiService';
import { GoogleDocsService } from '../services/googleDocsService';
import { EmailService } from '../services/emailService';
import { UniversityIntegrationService } from '../services/universityIntegrationService';

// Mock external APIs for testing
jest.mock('openai');
jest.mock('googleapis');
jest.mock('@sendgrid/mail');
jest.mock('axios');

describe('External API Integration Tests', () => {
  describe('OpenAI API Integration', () => {
    let openAIService: OpenAIService;

    beforeEach(() => {
      openAIService = new OpenAIService();
    });

    test('should generate recommendation outline', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'I. Introduction\nII. Academic Performance\nIII. Research Skills\nIV. Conclusion'
          }
        }]
      };

      // Mock OpenAI response
      (openAIService as any).client.chat.completions.create = jest.fn().mockResolvedValue(mockResponse);

      const applicationData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        universities: ['Harvard', 'MIT'],
        relationshipType: 'Academic Advisor',
        relationshipDuration: '2-3 years'
      };

      const outline = await openAIService.generateOutline(applicationData);
      
      expect(outline).toBeDefined();
      expect(outline).toContain('Introduction');
      expect(outline).toContain('Academic Performance');
    });

    test('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).status = 429;

      (openAIService as any).client.chat.completions.create = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Success after retry' } }]
        });

      const applicationData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        universities: ['Harvard'],
        relationshipType: 'Academic Advisor',
        relationshipDuration: '2-3 years'
      };

      const result = await openAIService.generateOutline(applicationData);
      expect(result).toBe('Success after retry');
    });

    test('should validate content quality', async () => {
      const mockAnalysis = {
        choices: [{
          message: {
            content: JSON.stringify({
              score: 8,
              strengths: ['Professional tone', 'Specific examples'],
              improvements: ['Add more metrics'],
              hasSpecificExamples: true,
              isProfessional: true,
              isUniversityAgnostic: true
            })
          }
        }]
      };

      (openAIService as any).client.chat.completions.create = jest.fn().mockResolvedValue(mockAnalysis);

      const content = 'John is an exceptional student with strong analytical skills.';
      const analysis = await openAIService.analyzeQuality(content);

      expect(analysis.score).toBe(8);
      expect(analysis.strengths).toContain('Professional tone');
      expect(analysis.hasSpecificExamples).toBe(true);
    });

    test('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      (openAIService as any).client.chat.completions.create = jest.fn().mockRejectedValue(apiError);

      const applicationData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        universities: ['Harvard'],
        relationshipType: 'Academic Advisor',
        relationshipDuration: '2-3 years'
      };

      await expect(openAIService.generateOutline(applicationData)).rejects.toThrow('API Error');
    });
  });

  describe('Google Docs API Integration', () => {
    let googleDocsService: GoogleDocsService;

    beforeEach(() => {
      googleDocsService = new GoogleDocsService();
    });

    test('should create new document', async () => {
      const mockDoc = {
        data: {
          documentId: 'doc123',
          title: 'Test Document'
        }
      };

      (googleDocsService as any).docs.documents.create = jest.fn().mockResolvedValue(mockDoc);

      const applicationData = {
        studentName: 'John Doe',
        programType: 'Graduate',
        universities: ['Harvard University'],
        term: 'Fall 2024'
      };

      const docId = await googleDocsService.createDocument(applicationData);
      expect(docId).toBe('doc123');
    });

    test('should update document content', async () => {
      const mockUpdate = { data: {} };
      (googleDocsService as any).docs.documents.batchUpdate = jest.fn().mockResolvedValue(mockUpdate);

      const docId = 'doc123';
      const content = 'Updated recommendation content';

      await googleDocsService.updateDocument(docId, content);
      expect((googleDocsService as any).docs.documents.batchUpdate).toHaveBeenCalled();
    });

    test('should share document with permissions', async () => {
      const mockPermission = { data: { id: 'permission123' } };
      (googleDocsService as any).drive.permissions.create = jest.fn().mockResolvedValue(mockPermission);

      const docId = 'doc123';
      const email = 'admin@stellarrec.com';

      await googleDocsService.shareDocument(docId, email, 'reader');
      expect((googleDocsService as any).drive.permissions.create).toHaveBeenCalledWith({
        fileId: docId,
        requestBody: {
          role: 'reader',
          type: 'user',
          emailAddress: email
        }
      });
    });

    test('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).code = 401;

      (googleDocsService as any).docs.documents.create = jest.fn().mockRejectedValue(authError);

      const applicationData = {
        studentName: 'John Doe',
        programType: 'Graduate',
        universities: ['Harvard University'],
        term: 'Fall 2024'
      };

      await expect(googleDocsService.createDocument(applicationData)).rejects.toThrow('Authentication failed');
    });
  });

  describe('Email Service Integration', () => {
    let emailService: EmailService;

    beforeEach(() => {
      emailService = new EmailService();
    });

    test('should send email via SendGrid', async () => {
      const mockSend = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
      (emailService as any).sgMail.send = mockSend;

      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      const result = await emailService.sendEmail(emailData);
      
      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      }));
    });

    test('should handle email delivery failures', async () => {
      const deliveryError = new Error('Email delivery failed');
      (deliveryError as any).code = 400;

      (emailService as any).sgMail.send = jest.fn().mockRejectedValue(deliveryError);

      const emailData = {
        to: 'invalid@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>'
      };

      const result = await emailService.sendEmail(emailData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should retry failed email sends', async () => {
      const mockSend = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce([{ statusCode: 202 }]);

      (emailService as any).sgMail.send = mockSend;

      const emailData = {
        to: 'retry@example.com',
        subject: 'Retry Test',
        html: '<p>Retry content</p>'
      };

      const result = await emailService.sendEmailWithRetry(emailData, 2);
      
      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    test('should validate email templates', () => {
      const template = emailService.getTemplate('invitation');
      
      expect(template).toBeDefined();
      expect(template.subject).toBeDefined();
      expect(template.html).toBeDefined();
      expect(template.html).toContain('{{studentName}}');
      expect(template.html).toContain('{{invitationLink}}');
    });
  });

  describe('University Integration Service', () => {
    let universityService: UniversityIntegrationService;

    beforeEach(() => {
      universityService = new UniversityIntegrationService();
    });

    test('should submit via university API', async () => {
      const mockAxios = require('axios');
      mockAxios.post.mockResolvedValue({
        status: 200,
        data: { submissionId: 'sub123', status: 'received' }
      });

      const submissionData = {
        universityId: 'harvard',
        applicantName: 'John Doe',
        recommenderName: 'Prof Smith',
        recommendation: 'Excellent student...',
        programType: 'graduate'
      };

      const result = await universityService.submitViaAPI(submissionData);
      
      expect(result.success).toBe(true);
      expect(result.submissionId).toBe('sub123');
      expect(mockAxios.post).toHaveBeenCalled();
    });

    test('should fallback to email submission', async () => {
      const mockAxios = require('axios');
      mockAxios.post.mockRejectedValue(new Error('API not available'));

      const mockEmailService = {
        sendEmail: jest.fn().mockResolvedValue({ success: true })
      };
      (universityService as any).emailService = mockEmailService;

      const submissionData = {
        universityId: 'mit',
        applicantName: 'John Doe',
        recommenderName: 'Prof Smith',
        recommendation: 'Excellent student...',
        programType: 'graduate'
      };

      const result = await universityService.submitWithFallback(submissionData);
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('email');
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    test('should handle university-specific formatting', () => {
      const recommendation = 'John is an excellent student with strong research skills.';
      
      const harvardFormat = universityService.formatForUniversity(recommendation, 'harvard');
      const mitFormat = universityService.formatForUniversity(recommendation, 'mit');
      
      expect(harvardFormat).toBeDefined();
      expect(mitFormat).toBeDefined();
      // Formats may differ based on university requirements
    });

    test('should validate submission requirements', () => {
      const submissionData = {
        universityId: 'stanford',
        applicantName: 'John Doe',
        recommenderName: 'Prof Smith',
        recommendation: 'Short rec',
        programType: 'graduate'
      };

      const validation = universityService.validateSubmission(submissionData);
      
      expect(validation.isValid).toBeDefined();
      if (!validation.isValid) {
        expect(validation.errors).toBeDefined();
        expect(Array.isArray(validation.errors)).toBe(true);
      }
    });

    test('should track submission status', async () => {
      const submissionId = 'sub123';
      const mockAxios = require('axios');
      mockAxios.get.mockResolvedValue({
        status: 200,
        data: { status: 'processed', timestamp: new Date().toISOString() }
      });

      const status = await universityService.checkSubmissionStatus(submissionId);
      
      expect(status.status).toBe('processed');
      expect(status.timestamp).toBeDefined();
    });
  });

  describe('API Error Handling and Resilience', () => {
    test('should implement circuit breaker pattern', async () => {
      const mockService = {
        callCount: 0,
        call: jest.fn().mockImplementation(() => {
          mockService.callCount++;
          if (mockService.callCount <= 3) {
            throw new Error('Service unavailable');
          }
          return Promise.resolve('Success');
        })
      };

      const circuitBreaker = new (class {
        private failureCount = 0;
        private isOpen = false;
        private lastFailureTime = 0;
        private readonly threshold = 3;
        private readonly timeout = 60000; // 1 minute

        async call(fn: () => Promise<any>) {
          if (this.isOpen) {
            if (Date.now() - this.lastFailureTime > this.timeout) {
              this.isOpen = false;
              this.failureCount = 0;
            } else {
              throw new Error('Circuit breaker is open');
            }
          }

          try {
            const result = await fn();
            this.failureCount = 0;
            return result;
          } catch (error) {
            this.failureCount++;
            this.lastFailureTime = Date.now();
            
            if (this.failureCount >= this.threshold) {
              this.isOpen = true;
            }
            
            throw error;
          }
        }
      })();

      // First 3 calls should fail
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.call(() => mockService.call());
        } catch (error) {
          expect(error.message).toBe('Service unavailable');
        }
      }

      // Circuit should be open now
      try {
        await circuitBreaker.call(() => mockService.call());
      } catch (error) {
        expect(error.message).toBe('Circuit breaker is open');
      }
    });

    test('should implement exponential backoff retry', async () => {
      let attemptCount = 0;
      const mockService = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve('Success');
      });

      const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            return await fn();
          } catch (error) {
            if (attempt === maxRetries - 1) throw error;
            
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      const startTime = Date.now();
      const result = await retryWithBackoff(mockService);
      const endTime = Date.now();

      expect(result).toBe('Success');
      expect(attemptCount).toBe(3);
      expect(endTime - startTime).toBeGreaterThan(3000); // Should have waited for backoff
    });
  });
});