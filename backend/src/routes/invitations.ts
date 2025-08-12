import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { InvitationController } from '../controllers/invitationController';
import { authenticate } from '../middleware/auth';
import { validateInvitation, validateInvitationConfirmation, validateRequest } from '../middleware/validation';

const router = Router();

// Initialize controller with database connection
const invitationController = new InvitationController(pool);

// Protected routes (require authentication)

/**
 * @route POST /api/applications/:applicationId/invitations
 * @desc Send invitation to recommender
 * @access Private (Student only)
 */
router.post(
  '/applications/:applicationId/invitations',
  authenticate,
  validateInvitation,
  validateRequest,
  (req: Request, res: Response) => invitationController.sendInvitation(req, res)
);

/**
 * @route GET /api/applications/:applicationId/invitations
 * @desc Get all recommenders for an application
 * @access Private (Student only)
 */
router.get(
  '/applications/:applicationId/invitations',
  authenticate,
  (req: Request, res: Response) => invitationController.getApplicationRecommenders(req, res)
);

/**
 * @route POST /api/applications/:applicationId/invitations/:recommenderId/resend
 * @desc Resend invitation to recommender
 * @access Private (Student only)
 */
router.post(
  '/applications/:applicationId/invitations/:recommenderId/resend',
  authenticate,
  (req: Request, res: Response) => invitationController.resendInvitation(req, res)
);

/**
 * @route DELETE /api/applications/:applicationId/invitations/:recommenderId
 * @desc Delete recommender invitation
 * @access Private (Student only)
 */
router.delete(
  '/applications/:applicationId/invitations/:recommenderId',
  authenticate,
  (req: Request, res: Response) => invitationController.deleteInvitation(req, res)
);

// Public routes (no authentication required)

/**
 * @route GET /api/invitations/:token
 * @desc Get invitation details by token
 * @access Public
 */
router.get(
  '/invitations/:token',
  (req: Request, res: Response) => invitationController.getInvitationDetails(req, res)
);

/**
 * @route POST /api/invitations/:token/confirm
 * @desc Confirm invitation and create recommender profile
 * @access Public
 */
router.post(
  '/invitations/:token/confirm',
  validateInvitationConfirmation,
  validateRequest,
  (req: Request, res: Response) => invitationController.confirmInvitation(req, res)
);

export default router;