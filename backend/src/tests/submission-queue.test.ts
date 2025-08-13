import { Pool } from 'pg';
import { SubmissionQueueService, QueuedSubmission } from '../services/submissionQueueService';
import { SubmissionModel } from '../models/Submission';
import { UniversityIntegrationService } from '../services/universityIntegrationService';
import { Submission } from '../types';

// Mock the database
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
} as unknown as Pool;

// Mock the services
jest.mock('../models/Submission');
jest.mock('../services/universityIntegrationService');

const MockedSubmissionModel = SubmissionModel as jest.MockedClass<typeof SubmissionModel>;
const MockedUniversityIntegrationService = UniversityIntegrationService as jest.MockedClass<typeof UniversityIntegrationService>;

describe('SubmissionQueueService', () => {
  let service: SubmissionQueueService;
  let mockSubmissionModel: jest.Mocked<SubmissionModel>;
  let mockIntegrationService: jest.Mocked<UniversityIntegrationService>;

  const mockQueuedSubmission: QueuedSubmission = {
    id: 'sub-1',
    priority: 5,
    scheduledAt: new Date(),
    attempts: 0,
    maxAttempts: 5,
    backoffMultiplier: 2.0
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
    jest.useFakeTimers();
    
    mockSubmissionModel = new MockedSubmissionModel(mockDb) as jest.Mocked<SubmissionModel>;
    mockIntegrationService = new MockedUniversityIntegrationService(mockDb) as jest.Mocked<UniversityIntegrationService>;
    
    service = new SubmissionQueueService(mockDb);
    
    // Replace the services with mocked versions
    (service as any).submissionModel = mockSubmissionModel;
    (service as any).integrationService = mockIntegrationService;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('addToQueue', () => {
    it('should add submission to queue with default priority', async () => {
      const submissionId = 'sub-1';
      
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await service.addToQueue(submissionId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO submission_queue'),
        [submissionId, 5, 5, 2.0]
      );
    });

    it('should add submission to queue with custom priority', async () => {
      const submissionId = 'sub-1';
      const priority = 1;
      
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await service.addToQueue(submissionId, priority);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO submission_queue'),
        [submissionId, priority, 5, 2.0]
      );
    });
  });

  describe('addBulkToQueue', () => {
    it('should add multiple submissions to queue', async () => {
      const submissionIds = ['sub-1', 'sub-2', 'sub-3'];
      const priority = 3;
      
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await service.addBulkToQueue(submissionIds, priority);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO submission_queue'),
        expect.arrayContaining([
          'sub-1', priority, 5, 2.0,
          'sub-2', priority, 5, 2.0,
          'sub-3', priority, 5, 2.0
        ])
      );
    });

    it('should handle empty submission IDs array', async () => {
      await service.addBulkToQueue([]);

      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('processQueue', () => {
    it('should process queued submissions', async () => {
      const queuedItems = [mockQueuedSubmission];
      
      // Mock getNextQueueItems
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: queuedItems }) // getNextQueueItems
        .mockResolvedValueOnce({ rows: [] }) // updateQueueItemAttempt
        .mockResolvedValueOnce({ rows: [] }); // removeFromQueue

      mockIntegrationService.processSubmission.mockResolvedValue();

      await service.processQueue();

      expect(mockIntegrationService.processSubmission).toHaveBeenCalledWith('sub-1');
    });

    it('should handle processing failures with retry logic', async () => {
      const queuedItems = [mockQueuedSubmission];
      
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: queuedItems }) // getNextQueueItems
        .mockResolvedValueOnce({ rows: [] }) // updateQueueItemAttempt
        .mockResolvedValueOnce({ rows: [] }); // handleQueueItemFailure

      mockIntegrationService.processSubmission.mockRejectedValue(new Error('Processing failed'));

      await service.processQueue();

      expect(mockIntegrationService.processSubmission).toHaveBeenCalledWith('sub-1');
      // Should update queue item with failure
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE submission_queue'),
        expect.arrayContaining(['sub-1', 1])
      );
    });

    it('should remove submission from queue after max attempts', async () => {
      const failedQueuedItem = {
        ...mockQueuedSubmission,
        attempts: 4, // Will become 5 after increment
        maxAttempts: 5
      };
      
      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [failedQueuedItem] }) // getNextQueueItems
        .mockResolvedValueOnce({ rows: [] }) // updateQueueItemAttempt
        .mockResolvedValueOnce({ rows: [] }) // removeFromQueue
        .mockResolvedValueOnce({ rows: [] }); // updateStatus

      mockIntegrationService.processSubmission.mockRejectedValue(new Error('Processing failed'));
      mockSubmissionModel.updateStatus.mockResolvedValue(mockSubmission);

      await service.processQueue();

      // Should remove from queue and mark as permanently failed
      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM submission_queue WHERE submission_id = $1',
        ['sub-1']
      );
      expect(mockSubmissionModel.updateStatus).toHaveBeenCalledWith(
        'sub-1',
        'failed',
        { error_message: expect.stringContaining('Max retry attempts exceeded') }
      );
    });
  });

  describe('startProcessing and stopProcessing', () => {
    it('should start and stop queue processing', async () => {
      // Mock processQueue to avoid actual processing
      jest.spyOn(service, 'processQueue').mockResolvedValue();

      await service.startProcessing(1000);
      expect((service as any).isProcessing).toBe(true);
      expect((service as any).processingInterval).toBeDefined();

      await service.stopProcessing();
      expect((service as any).isProcessing).toBe(false);
      expect((service as any).processingInterval).toBeNull();
    });

    it('should not start processing if already processing', async () => {
      jest.spyOn(service, 'processQueue').mockResolvedValue();

      await service.startProcessing(1000);
      const firstInterval = (service as any).processingInterval;

      await service.startProcessing(1000);
      const secondInterval = (service as any).processingInterval;

      expect(firstInterval).toBe(secondInterval);
      
      await service.stopProcessing();
    });
  });

  describe('retrySubmission', () => {
    it('should retry a failed submission', async () => {
      const submissionId = 'sub-1';
      const priority = 1;

      mockSubmissionModel.updateStatus.mockResolvedValue(mockSubmission);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await service.retrySubmission(submissionId, priority);

      expect(mockSubmissionModel.updateStatus).toHaveBeenCalledWith(
        submissionId,
        'pending',
        { error_message: undefined }
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO submission_queue'),
        [submissionId, priority, 5, 2.0]
      );
    });
  });

  describe('retryAllFailed', () => {
    it('should retry all failed submissions', async () => {
      const failedSubmissions = [
        { ...mockSubmission, id: 'sub-1', status: 'failed' },
        { ...mockSubmission, id: 'sub-2', status: 'failed' }
      ];

      mockSubmissionModel.findFailedSubmissions.mockResolvedValue(failedSubmissions as any);
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await service.retryAllFailed();

      expect(result).toBe(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE submissions'),
        [['sub-1', 'sub-2']]
      );
    });

    it('should return 0 when no failed submissions exist', async () => {
      mockSubmissionModel.findFailedSubmissions.mockResolvedValue([]);

      const result = await service.retryAllFailed();

      expect(result).toBe(0);
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status statistics', async () => {
      const mockStats = {
        pending: '5',
        scheduled: '3',
        failed: '2',
        total: '10'
      };

      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [mockStats] });

      const result = await service.getQueueStatus();

      expect(result).toEqual({
        pending: 5,
        processing: 0,
        failed: 2,
        scheduled: 3
      });
    });
  });

  describe('getQueueItems', () => {
    it('should return paginated queue items', async () => {
      const mockItems = [
        {
          id: 'sub-1',
          priority: 5,
          scheduled_at: new Date(),
          attempts: 1,
          max_attempts: 5,
          backoff_multiplier: 2.0,
          last_error: null,
          university_name: 'Test University',
          applicant_name: 'John Doe',
          status: 'pending'
        }
      ];

      (mockDb.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }) // count query
        .mockResolvedValueOnce({ rows: mockItems }); // items query

      const result = await service.getQueueItems(10, 0);

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('sub-1');
    });
  });

  describe('setPriority', () => {
    it('should update submission priority', async () => {
      const submissionId = 'sub-1';
      const priority = 1;

      (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 1 });

      await service.setPriority(submissionId, priority);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE submission_queue'),
        [submissionId, priority]
      );
    });

    it('should throw error for invalid priority', async () => {
      const submissionId = 'sub-1';
      const invalidPriority = 15;

      await expect(service.setPriority(submissionId, invalidPriority))
        .rejects.toThrow('Priority must be between 1 (highest) and 10 (lowest)');
    });

    it('should throw error when submission not found', async () => {
      const submissionId = 'sub-1';
      const priority = 1;

      (mockDb.query as jest.Mock).mockResolvedValue({ rowCount: 0 });

      await expect(service.setPriority(submissionId, priority))
        .rejects.toThrow('Submission not found in queue');
    });
  });

  describe('clearQueue', () => {
    it('should clear all queue items', async () => {
      (mockDb.query as jest.Mock).mockResolvedValue({ rows: [] });

      await service.clearQueue();

      expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM submission_queue');
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const calculateBackoffDelay = (service as any).calculateBackoffDelay.bind(service);

      // Test exponential backoff: base * multiplier^(attempts-1)
      expect(calculateBackoffDelay(1, 2.0)).toBe(1000); // 1000 * 2^0 = 1000
      expect(calculateBackoffDelay(2, 2.0)).toBe(2000); // 1000 * 2^1 = 2000
      expect(calculateBackoffDelay(3, 2.0)).toBe(4000); // 1000 * 2^2 = 4000
    });

    it('should cap backoff delay at maximum', () => {
      const calculateBackoffDelay = (service as any).calculateBackoffDelay.bind(service);

      // Should cap at MAX_BACKOFF_MS (300000)
      const largeDelay = calculateBackoffDelay(20, 2.0);
      expect(largeDelay).toBe(300000);
    });
  });
});