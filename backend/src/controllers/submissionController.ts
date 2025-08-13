import { Request, Response } from 'express';
import { Pool } from 'pg';
import { UniversityIntegrationService } from '../services/universityIntegrationService';
import { SubmissionQueueService } from '../services/submissionQueueService';
import { SubmissionModel } from '../models/Submission';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types';

export class SubmissionController {
  private integrationService: UniversityIntegrationService;
  private queueService: SubmissionQueueService;
  private submissionModel: SubmissionModel;

  constructor(db: Pool) {
    this.integrationService = new UniversityIntegrationService(db);
    this.queueService = new SubmissionQueueService(db);
    this.submissionModel = new SubmissionModel(db);
  }

  async submitRecommendation(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { recommendationId, universityIds, priority } = req.body;

      if (!recommendationId || !Array.isArray(universityIds) || universityIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Recommendation ID and university IDs are required'
          }
        });
      }

      // Submit recommendation to universities
      const result = await this.integrationService.submitRecommendation(recommendationId, universityIds);

      // Add successful submissions to queue for processing
      if (result.successful.length > 0) {
        const submissionIds = result.successful.map(s => s.id);
        await this.queueService.addBulkToQueue(submissionIds, priority || 5);
      }

      return res.status(200).json({
        success: true,
        data: {
          successful: result.successful.length,
          failed: result.failed.length,
          details: {
            successful: result.successful,
            failed: result.failed
          }
        }
      });
    } catch (error) {
      console.error('Error submitting recommendation:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUBMISSION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to submit recommendation'
        }
      });
    }
  }

  async getSubmissionStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { submissionId } = req.params;

      const submission = await this.integrationService.getSubmissionStatus(submissionId);

      return res.status(200).json({
        success: true,
        data: submission
      });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBMISSION_NOT_FOUND',
            message: 'Submission not found'
          }
        });
      }

      console.error('Error getting submission status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_ERROR',
          message: 'Failed to get submission status'
        }
      });
    }
  }

  async getSubmissionsByRecommendation(req: Request, res: Response): Promise<Response> {
    try {
      const { recommendationId } = req.params;

      const submissions = await this.integrationService.getSubmissionsByRecommendation(recommendationId);

      return res.status(200).json({
        success: true,
        data: submissions
      });
    } catch (error) {
      console.error('Error getting submissions by recommendation:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'SUBMISSIONS_ERROR',
          message: 'Failed to get submissions'
        }
      });
    }
  }

  async retrySubmission(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { submissionId } = req.params;
      const { priority } = req.body;

      await this.queueService.retrySubmission(submissionId, priority || 1);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Submission queued for retry'
        }
      });
    } catch (error) {
      console.error('Error retrying submission:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'RETRY_ERROR',
          message: error instanceof Error ? error.message : 'Failed to retry submission'
        }
      });
    }
  }

  async retryAllFailed(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const retriedCount = await this.queueService.retryAllFailed();

      return res.status(200).json({
        success: true,
        data: {
          message: `${retriedCount} failed submissions queued for retry`
        }
      });
    } catch (error) {
      console.error('Error retrying all failed submissions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'RETRY_ALL_ERROR',
          message: 'Failed to retry failed submissions'
        }
      });
    }
  }

  async getSubmissionStats(req: Request, res: Response): Promise<Response> {
    try {
      const stats = await this.integrationService.getSubmissionStats();

      return res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting submission stats:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get submission statistics'
        }
      });
    }
  }

  async getQueueStatus(req: Request, res: Response): Promise<Response> {
    try {
      const status = await this.queueService.getQueueStatus();

      return res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting queue status:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_STATUS_ERROR',
          message: 'Failed to get queue status'
        }
      });
    }
  }

  async getQueueItems(req: Request, res: Response): Promise<Response> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.queueService.getQueueItems(limit, offset);

      return res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          limit,
          offset,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting queue items:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_ITEMS_ERROR',
          message: 'Failed to get queue items'
        }
      });
    }
  }

  async setPriority(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { submissionId } = req.params;
      const { priority } = req.body;

      if (!priority || priority < 1 || priority > 10) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PRIORITY',
            message: 'Priority must be between 1 (highest) and 10 (lowest)'
          }
        });
      }

      await this.queueService.setPriority(submissionId, priority);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Priority updated successfully'
        }
      });
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'SUBMISSION_NOT_FOUND',
            message: 'Submission not found in queue'
          }
        });
      }

      console.error('Error setting priority:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PRIORITY_ERROR',
          message: 'Failed to set priority'
        }
      });
    }
  }

  async validateSubmission(req: Request, res: Response): Promise<Response> {
    try {
      const { universityId } = req.params;
      const submissionData = req.body;

      const validation = await this.integrationService.validateUniversityRequirements(
        universityId,
        submissionData
      );

      return res.status(200).json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Error validating submission:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Failed to validate submission'
        }
      });
    }
  }

  async startQueueProcessing(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { intervalMs } = req.body;
      
      await this.queueService.startProcessing(intervalMs || 30000);

      return res.status(200).json({
        success: true,
        data: {
          message: 'Queue processing started'
        }
      });
    } catch (error) {
      console.error('Error starting queue processing:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_START_ERROR',
          message: 'Failed to start queue processing'
        }
      });
    }
  }

  async stopQueueProcessing(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      await this.queueService.stopProcessing();

      return res.status(200).json({
        success: true,
        data: {
          message: 'Queue processing stopped'
        }
      });
    } catch (error) {
      console.error('Error stopping queue processing:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'QUEUE_STOP_ERROR',
          message: 'Failed to stop queue processing'
        }
      });
    }
  }
}