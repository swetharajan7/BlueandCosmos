import { Router } from 'express';
import { Pool } from 'pg';
import { SubmissionController } from '../controllers/submissionController';
import { WebSocketService } from '../services/websocketService';
import { authenticate } from '../middleware/auth';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';

export function createSubmissionRoutes(db: Pool, websocketService?: WebSocketService): Router {
  const router = Router();
  const submissionController = new SubmissionController(db, websocketService);

  // Submit recommendation to universities
  router.post(
    '/submit',
    authenticate,
    [
      body('recommendationId')
        .isUUID()
        .withMessage('Valid recommendation ID is required'),
      body('universityIds')
        .isArray({ min: 1 })
        .withMessage('At least one university ID is required'),
      body('universityIds.*')
        .isUUID()
        .withMessage('All university IDs must be valid UUIDs'),
      body('priority')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Priority must be between 1 and 10')
    ],
    validateRequest,
    submissionController.submitRecommendation.bind(submissionController)
  );

  // Get submission status by ID
  router.get(
    '/:submissionId/status',
    authenticate,
    [
      param('submissionId')
        .isUUID()
        .withMessage('Valid submission ID is required')
    ],
    validateRequest,
    submissionController.getSubmissionStatus.bind(submissionController)
  );

  // Get all submissions for a recommendation
  router.get(
    '/recommendation/:recommendationId',
    authenticate,
    [
      param('recommendationId')
        .isUUID()
        .withMessage('Valid recommendation ID is required')
    ],
    validateRequest,
    submissionController.getSubmissionsByRecommendation.bind(submissionController)
  );

  // Retry a failed submission
  router.post(
    '/:submissionId/retry',
    authenticate,
    [
      param('submissionId')
        .isUUID()
        .withMessage('Valid submission ID is required'),
      body('priority')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Priority must be between 1 and 10')
    ],
    validateRequest,
    submissionController.retrySubmission.bind(submissionController)
  );

  // Retry all failed submissions
  router.post(
    '/retry-all-failed',
    authenticate,
    submissionController.retryAllFailed.bind(submissionController)
  );

  // Get submission statistics
  router.get(
    '/stats',
    authenticate,
    submissionController.getSubmissionStats.bind(submissionController)
  );

  // Validate submission data against university requirements
  router.post(
    '/validate/:universityId',
    authenticate,
    [
      param('universityId')
        .isUUID()
        .withMessage('Valid university ID is required'),
      body('programType')
        .notEmpty()
        .withMessage('Program type is required'),
      body('wordCount')
        .isInt({ min: 1 })
        .withMessage('Word count must be a positive integer'),
      body('applicantName')
        .notEmpty()
        .withMessage('Applicant name is required'),
      body('applicationTerm')
        .notEmpty()
        .withMessage('Application term is required')
    ],
    validateRequest,
    submissionController.validateSubmission.bind(submissionController)
  );

  // Queue management endpoints
  router.get(
    '/queue/status',
    authenticate,
    submissionController.getQueueStatus.bind(submissionController)
  );

  router.get(
    '/queue/items',
    authenticate,
    [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be non-negative')
    ],
    validateRequest,
    submissionController.getQueueItems.bind(submissionController)
  );

  router.put(
    '/:submissionId/priority',
    authenticate,
    [
      param('submissionId')
        .isUUID()
        .withMessage('Valid submission ID is required'),
      body('priority')
        .isInt({ min: 1, max: 10 })
        .withMessage('Priority must be between 1 and 10')
    ],
    validateRequest,
    submissionController.setPriority.bind(submissionController)
  );

  // Admin endpoints for queue management
  router.post(
    '/queue/start',
    authenticate,
    [
      body('intervalMs')
        .optional()
        .isInt({ min: 5000, max: 300000 })
        .withMessage('Interval must be between 5 seconds and 5 minutes')
    ],
    validateRequest,
    submissionController.startQueueProcessing.bind(submissionController)
  );

  router.post(
    '/queue/stop',
    authenticate,
    submissionController.stopQueueProcessing.bind(submissionController)
  );

  return router;
}