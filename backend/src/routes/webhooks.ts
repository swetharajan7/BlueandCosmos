import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { SubmissionConfirmationService } from '../services/submissionConfirmationService';
import { WebSocketService } from '../services/websocketService';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';

export function createWebhookRoutes(db: Pool, websocketService: WebSocketService): Router {
  const router = Router();
  const confirmationService = new SubmissionConfirmationService(db, websocketService);

  // Middleware to verify webhook signatures (for security)
  const verifyWebhookSignature = (req: Request, res: Response, next: any) => {
    const signature = req.headers['x-stellarrec-signature'] as string;
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('WEBHOOK_SECRET not configured, skipping signature verification');
      return next();
    }

    if (!signature) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Webhook signature required'
        }
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Invalid webhook signature'
        }
      });
    }

    next();
  };

  // University confirmation webhook
  router.post(
    '/university-confirmation',
    verifyWebhookSignature,
    [
      body('universityCode')
        .notEmpty()
        .withMessage('University code is required'),
      body('status')
        .isIn(['confirmed', 'received', 'rejected', 'failed'])
        .withMessage('Valid status is required'),
      body('timestamp')
        .isISO8601()
        .withMessage('Valid timestamp is required'),
      body('submissionId')
        .optional()
        .isUUID()
        .withMessage('Submission ID must be a valid UUID'),
      body('externalReference')
        .optional()
        .notEmpty()
        .withMessage('External reference cannot be empty if provided')
    ],
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid webhook payload',
              details: errors.array()
            }
          });
        }

        await confirmationService.handleWebhookConfirmation(req.body);

        return res.status(200).json({
          success: true,
          data: {
            message: 'Webhook processed successfully',
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Error processing university confirmation webhook:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'WEBHOOK_ERROR',
            message: error instanceof Error ? error.message : 'Failed to process webhook'
          }
        });
      }
    }
  );

  // Manual confirmation endpoint (for admin use)
  router.post(
    '/manual-confirmation',
    [
      body('submissionId')
        .isUUID()
        .withMessage('Valid submission ID is required'),
      body('confirmationCode')
        .optional()
        .notEmpty()
        .withMessage('Confirmation code cannot be empty if provided'),
      body('receiptUrl')
        .optional()
        .isURL()
        .withMessage('Receipt URL must be a valid URL'),
      body('notes')
        .optional()
        .isString()
        .withMessage('Notes must be a string')
    ],
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid confirmation data',
              details: errors.array()
            }
          });
        }

        const { submissionId, confirmationCode, receiptUrl, notes } = req.body;

        // Get submission details
        const submissionQuery = `
          SELECT s.*, u.name as university_name, app.legal_name as applicant_name
          FROM submissions s
          JOIN universities u ON s.university_id = u.id
          JOIN recommendations r ON s.recommendation_id = r.id
          JOIN applications app ON r.application_id = app.id
          WHERE s.id = $1
        `;

        const submissionResult = await db.query(submissionQuery, [submissionId]);
        
        if (submissionResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'SUBMISSION_NOT_FOUND',
              message: 'Submission not found'
            }
          });
        }

        const submission = submissionResult.rows[0];

        await confirmationService.processConfirmationReceipt({
          submissionId,
          universityName: submission.university_name,
          applicantName: submission.applicant_name,
          externalReference: submission.external_reference || `MANUAL_${Date.now()}`,
          confirmationCode,
          receiptUrl,
          confirmedAt: new Date(),
          confirmationMethod: 'manual',
          additionalData: { notes }
        });

        return res.status(200).json({
          success: true,
          data: {
            message: 'Manual confirmation processed successfully',
            submissionId
          }
        });
      } catch (error) {
        console.error('Error processing manual confirmation:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'CONFIRMATION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to process confirmation'
          }
        });
      }
    }
  );

  // Get confirmation summary for a recommendation
  router.get(
    '/confirmation-summary/:recommendationId',
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const { recommendationId } = req.params;

        if (!recommendationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ID',
              message: 'Invalid recommendation ID format'
            }
          });
        }

        const summary = await confirmationService.generateConfirmationSummary(recommendationId);

        return res.status(200).json({
          success: true,
          data: summary
        });
      } catch (error) {
        console.error('Error getting confirmation summary:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'SUMMARY_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get confirmation summary'
          }
        });
      }
    }
  );

  // Send confirmation summary email
  router.post(
    '/send-confirmation-summary/:recommendationId',
    async (req: Request, res: Response): Promise<Response> => {
      try {
        const { recommendationId } = req.params;

        if (!recommendationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ID',
              message: 'Invalid recommendation ID format'
            }
          });
        }

        await confirmationService.sendConfirmationSummaryEmail(recommendationId);

        return res.status(200).json({
          success: true,
          data: {
            message: 'Confirmation summary email sent successfully'
          }
        });
      } catch (error) {
        console.error('Error sending confirmation summary email:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'EMAIL_ERROR',
            message: error instanceof Error ? error.message : 'Failed to send confirmation email'
          }
        });
      }
    }
  );

  // Check pending confirmations (admin endpoint)
  router.post(
    '/check-pending-confirmations',
    async (req: Request, res: Response): Promise<Response> => {
      try {
        await confirmationService.checkPendingConfirmations();

        return res.status(200).json({
          success: true,
          data: {
            message: 'Pending confirmations check completed'
          }
        });
      } catch (error) {
        console.error('Error checking pending confirmations:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'CHECK_ERROR',
            message: error instanceof Error ? error.message : 'Failed to check pending confirmations'
          }
        });
      }
    }
  );

  // Health check for webhook endpoint
  router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        service: 'StellarRec Webhooks',
        timestamp: new Date().toISOString(),
        status: 'healthy'
      }
    });
  });

  return router;
}