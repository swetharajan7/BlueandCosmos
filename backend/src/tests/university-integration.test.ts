import { Pool } from 'pg';
import { UniversityIntegrationService, SubmissionAdapterFactory, EmailSubmissionAdapter, ApiSubmissionAdapter, ManualSubmissionAdapter } from '../services/universityIntegrationService';
import { SubmissionModel } from '../models/Submission';
import { UniversityModel } from '../models/University';
import { University, Submission } from '../types';

// Mock the database
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
} as unknown as Pool;

// Mock models
jest.mock('../models/Submission');
jest.mock('../models/University');

const MockedSubmissionModel = SubmissionModel as jest.MockedClass<typeof SubmissionModel>;
const MockedUniversityModel = UniversityModel as jest.MockedClass<typeof UniversityModel>;

describe('UniversityIntegrationService', () => {
  let service: UniversityIntegrationService;
  let mockSubmissionModel: jest.Mocked<SubmissionModel>;
  let mockUniversityModel: jest.Mocked<UniversityModel>;

  const mockUniversity: University = {
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

  const mockSubmission: Submission = {
    id: 'sub-1',
    recommendation_id: 'rec-1',
    university_id: 'univ-1',
    status: 'pending',
    submission_method: 'email',
    retry_count: 0,
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSubmissionModel = new MockedSubmissionModel(mockDb) as jest.Mocked<SubmissionModel>;
    mockUniversityModel = new MockedUniversityModel(mockDb) as jest.Mocked<UniversityModel>;
    
    service = new UniversityIntegrationService(mockDb);
    
    // Replace the models with mocked versions
    (service as any).submissionModel = mockSubmissionModel;
    (service as any).universityModel = mockUniversityModel;
  });

  describe('submitRecommendation', () => {
    it('should successfully submit recommendation to multiple universities', async () => {
      const universityIds = ['univ-1', 'univ-2'];
      const recommendationId = 'rec-1';

      mockSubmissionModel.createBulkSubmissions.mockResolvedValue([mockSubmission]);
      mockSubmissionModel.findById.mockResolvedValue({
        ...mockSubmission,
        applicant_name: 'John Doe',
        recommendation_content: 'Great student',
        program_type: 'graduate',
        application_term: 'Fall 2024',
        word_count: 500
      } as any);
      mockUniversityModel.findById.mockResolvedValue(mockUniversity);
      mockSubmissionModel.updateStatus.mockResolvedValue(mockSubmission);

      const result = await service.submitRecommendation(recommendationId, universityIds);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(mockSubmissionModel.createBulkSubmissions).toHaveBeenCalledWith(recommendationId, universityIds);
    });

    it('should handle submission failures gracefully', async () => {
      const universityIds = ['univ-1'];
      const recommendationId = 'rec-1';

      mockSubmissionModel.createBulkSubmissions.mockResolvedValue([mockSubmission]);
      mockSubmissionModel.findById.mockRejectedValue(new Error('Submission not found'));

      const result = await service.submitRecommendation(recommendationId, universityIds);

      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Submission not found');
    });
  });

  describe('processSubmission', () => {
    it('should process a valid submission successfully', async () => {
      const submissionId = 'sub-1';
      const submissionData = {
        ...mockSubmission,
        applicant_name: 'John Doe',
        recommendation_content: 'Great student',
        program_type: 'graduate',
        application_term: 'Fall 2024',
        word_count: 500
      };

      mockSubmissionModel.findById.mockResolvedValue(submissionData as any);
      mockUniversityModel.findById.mockResolvedValue(mockUniversity);
      mockSubmissionModel.updateStatus.mockResolvedValue(mockSubmission);

      await service.processSubmission(submissionId);

      expect(mockSubmissionModel.updateStatus).toHaveBeenCalledWith(
        submissionId,
        'submitted',
        expect.objectContaining({
          external_reference: expect.any(String),
          submitted_at: expect.any(Date)
        })
      );
    });

    it('should fail submission with invalid status', async () => {
      const submissionId = 'sub-1';
      const submissionData = {
        ...mockSubmission,
        status: 'submitted'
      };

      mockSubmissionModel.findById.mockResolvedValue(submissionData as any);

      await expect(service.processSubmission(submissionId)).rejects.toThrow('Submission is not in pending status');
    });

    it('should handle validation failures', async () => {
      const submissionId = 'sub-1';
      const submissionData = {
        ...mockSubmission,
        applicant_name: '', // Invalid - empty name
        recommendation_content: 'Great student',
        program_type: 'graduate',
        application_term: 'Fall 2024',
        word_count: 500
      };

      mockSubmissionModel.findById.mockResolvedValue(submissionData as any);
      mockUniversityModel.findById.mockResolvedValue(mockUniversity);
      mockSubmissionModel.updateStatus.mockResolvedValue(mockSubmission);

      await expect(service.processSubmission(submissionId)).rejects.toThrow('Submission validation failed');
      
      expect(mockSubmissionModel.updateStatus).toHaveBeenCalledWith(
        submissionId,
        'failed',
        { error_message: 'Submission validation failed' }
      );
    });
  });

  describe('retryFailedSubmission', () => {
    it('should retry a failed submission', async () => {
      const submissionId = 'sub-1';
      const failedSubmission = {
        ...mockSubmission,
        status: 'failed',
        retry_count: 2
      };

      mockSubmissionModel.findById.mockResolvedValue(failedSubmission as any);
      mockSubmissionModel.incrementRetryCount.mockResolvedValue(mockSubmission);
      mockSubmissionModel.updateStatus.mockResolvedValue(mockSubmission);
      mockUniversityModel.findById.mockResolvedValue(mockUniversity);

      await service.retryFailedSubmission(submissionId);

      expect(mockSubmissionModel.incrementRetryCount).toHaveBeenCalledWith(submissionId);
      expect(mockSubmissionModel.updateStatus).toHaveBeenCalledWith(
        submissionId,
        'pending',
        { error_message: null }
      );
    });

    it('should reject retry when max attempts exceeded', async () => {
      const submissionId = 'sub-1';
      const failedSubmission = {
        ...mockSubmission,
        status: 'failed',
        retry_count: 5
      };

      mockSubmissionModel.findById.mockResolvedValue(failedSubmission as any);

      await expect(service.retryFailedSubmission(submissionId)).rejects.toThrow('Maximum retry attempts exceeded');
    });
  });

  describe('validateUniversityRequirements', () => {
    it('should validate submission against university requirements', async () => {
      const universityWithRequirements: University = {
        ...mockUniversity,
        requirements: [
          {
            id: 'req-1',
            university_id: 'univ-1',
            requirement_type: 'min_word_count',
            requirement_value: '300',
            is_required: true,
            created_at: new Date()
          },
          {
            id: 'req-2',
            university_id: 'univ-1',
            requirement_type: 'program_type',
            requirement_value: 'graduate',
            is_required: true,
            created_at: new Date()
          }
        ]
      };

      mockUniversityModel.findById.mockResolvedValue(universityWithRequirements);

      const validSubmissionData = {
        programType: 'graduate',
        wordCount: 500,
        applicantName: 'John Doe',
        applicationTerm: 'Fall 2024'
      };

      const result = await service.validateUniversityRequirements('univ-1', validSubmissionData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid submission', async () => {
      const universityWithRequirements: University = {
        ...mockUniversity,
        requirements: [
          {
            id: 'req-1',
            university_id: 'univ-1',
            requirement_type: 'min_word_count',
            requirement_value: '500',
            is_required: true,
            created_at: new Date()
          },
          {
            id: 'req-2',
            university_id: 'univ-1',
            requirement_type: 'program_type',
            requirement_value: 'undergraduate',
            is_required: true,
            created_at: new Date()
          }
        ]
      };

      mockUniversityModel.findById.mockResolvedValue(universityWithRequirements);

      const invalidSubmissionData = {
        programType: 'graduate', // Wrong program type
        wordCount: 300, // Too few words
        applicantName: 'John Doe',
        applicationTerm: 'Fall 2024'
      };

      const result = await service.validateUniversityRequirements('univ-1', invalidSubmissionData);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Program type graduate not supported by Test University');
      expect(result.errors).toContain('Recommendation must be at least 500 words for Test University');
    });
  });
});

describe('SubmissionAdapterFactory', () => {
  const baseUniversity: University = {
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

  it('should create EmailSubmissionAdapter for email format', () => {
    const university: University = {
      ...baseUniversity,
      submission_format: 'email'
    };

    const adapter = SubmissionAdapterFactory.createAdapter(university);
    expect(adapter).toBeInstanceOf(EmailSubmissionAdapter);
  });

  it('should create ApiSubmissionAdapter for api format', () => {
    const university: University = {
      ...baseUniversity,
      submission_format: 'api'
    };

    const adapter = SubmissionAdapterFactory.createAdapter(university);
    expect(adapter).toBeInstanceOf(ApiSubmissionAdapter);
  });

  it('should create ManualSubmissionAdapter for manual format', () => {
    const university: University = {
      ...baseUniversity,
      submission_format: 'manual'
    };

    const adapter = SubmissionAdapterFactory.createAdapter(university);
    expect(adapter).toBeInstanceOf(ManualSubmissionAdapter);
  });

  it('should throw error for unsupported format', () => {
    const university: University = {
      ...baseUniversity,
      submission_format: 'unsupported' as any
    };

    expect(() => SubmissionAdapterFactory.createAdapter(university)).toThrow('Unsupported submission format');
  });
});

describe('EmailSubmissionAdapter', () => {
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

  describe('submitRecommendation', () => {
    it('should successfully submit via email', async () => {
      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Great student',
        wordCount: 500,
        submissionId: 'sub-1'
      };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(true);
      expect(result.externalReference).toMatch(/^EMAIL_/);
    });

    it('should fail when email address is missing', async () => {
      const universityWithoutEmail = {
        ...university,
        email_address: undefined
      };
      adapter = new EmailSubmissionAdapter(universityWithoutEmail);

      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Great student',
        wordCount: 500,
        submissionId: 'sub-1'
      };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('University email address not configured');
    });
  });

  describe('validateSubmission', () => {
    it('should validate complete submission data', async () => {
      const submissionData = {
        applicantName: 'John Doe',
        recommendationContent: 'Great student',
        programType: 'graduate',
        applicationTerm: 'Fall 2024'
      };

      const isValid = await adapter.validateSubmission(submissionData);
      expect(isValid).toBe(true);
    });

    it('should reject incomplete submission data', async () => {
      const submissionData = {
        applicantName: '',
        recommendationContent: 'Great student',
        programType: 'graduate',
        applicationTerm: 'Fall 2024'
      };

      const isValid = await adapter.validateSubmission(submissionData);
      expect(isValid).toBe(false);
    });
  });
});

describe('ApiSubmissionAdapter', () => {
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

  describe('submitRecommendation', () => {
    it('should successfully submit via API', async () => {
      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Great student',
        wordCount: 500,
        submissionId: 'sub-1'
      };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(true);
      expect(result.externalReference).toMatch(/^API_/);
    });

    it('should fail when API endpoint is missing', async () => {
      const universityWithoutApi = {
        ...university,
        api_endpoint: undefined
      };
      adapter = new ApiSubmissionAdapter(universityWithoutApi);

      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Great student',
        wordCount: 500,
        submissionId: 'sub-1'
      };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('University API endpoint not configured');
    });
  });
});

describe('ManualSubmissionAdapter', () => {
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

  describe('submitRecommendation', () => {
    it('should always succeed for manual submissions', async () => {
      const submissionData = {
        applicantName: 'John Doe',
        programType: 'graduate',
        applicationTerm: 'Fall 2024',
        recommendationContent: 'Great student',
        wordCount: 500,
        submissionId: 'sub-1'
      };

      const result = await adapter.submitRecommendation(submissionData);

      expect(result.success).toBe(true);
      expect(result.externalReference).toMatch(/^MANUAL_/);
    });
  });

  describe('validateSubmission', () => {
    it('should validate basic submission data', async () => {
      const submissionData = {
        applicantName: 'John Doe',
        recommendationContent: 'Great student',
        programType: 'graduate',
        applicationTerm: 'Fall 2024'
      };

      const isValid = await adapter.validateSubmission(submissionData);
      expect(isValid).toBe(true);
    });
  });
});