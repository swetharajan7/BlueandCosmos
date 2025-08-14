import { Router } from 'express';
import { Pool } from 'pg';
import { ConfirmationController } from '../controllers/confirmationController';
import { authenticate, authorize } from '../middleware/auth';
import { WebSocketService } from '../services/websocketService';

export function createConfirmationRoutes(db: Pool, websocketService?: WebSocketService): Router {
  const router = Router();
  const confirmationController = new ConfirmationController(db, websocketService);

  // Send comprehensive confirmation summary email
  router.post(
    '/recommendations/:recommendationId/confirmation-summary',
    authenticate,
    authorize('student', 'recommender', 'admin'),
    (req, res) => confirmationController.sendConfirmationSummary(req, res)
  );

  // Generate comprehensive status report
  router.get(
    '/status-report',
    authenticate,
    authorize('student', 'recommender'),
    (req, res) => confirmationController.generateStatusReport(req, res)
  );

  // Create support ticket for submission issues
  router.post(
    '/support-tickets',
    authenticate,
    authorize('student', 'recommender'),
    (req, res) => confirmationController.createSupportTicket(req, res)
  );

  // Get audit trail for submissions
  router.get(
    '/audit-trail',
    authenticate,
    authorize('student', 'recommender', 'admin'),
    (req, res) => confirmationController.getAuditTrail(req, res)
  );

  // Get confirmation summary for a recommendation
  router.get(
    '/recommendations/:recommendationId/summary',
    authenticate,
    authorize('student', 'recommender', 'admin'),
    (req, res) => confirmationController.getConfirmationSummary(req, res)
  );

  // Webhook endpoint for university confirmations (no auth required)
  router.post(
    '/webhooks/university/:universityCode/confirmation',
    (req, res) => confirmationController.processWebhookConfirmation(req, res)
  );

  // Admin-only routes
  router.post(
    '/admin/check-pending-confirmations',
    authenticate,
    authorize('admin'),
    (req, res) => confirmationController.checkPendingConfirmations(req, res)
  );

  router.post(
    '/admin/manual-confirmation',
    authenticate,
    authorize('admin'),
    (req, res) => confirmationController.processManualConfirmation(req, res)
  );

  return router;
}