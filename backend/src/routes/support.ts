import { Router } from 'express';
import { supportController } from '../controllers/supportController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation schemas
const createTicketValidation = [
  body('subject')
    .isLength({ min: 1, max: 255 })
    .withMessage('Subject must be between 1 and 255 characters'),
  body('description')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('category')
    .optional()
    .isIn(['technical', 'account', 'application', 'billing', 'general'])
    .withMessage('Invalid category'),
];

const addMessageValidation = [
  param('ticketId').isUUID().withMessage('Invalid ticket ID'),
  body('message')
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters'),
];

const updateStatusValidation = [
  param('ticketId').isUUID().withMessage('Invalid ticket ID'),
  body('status')
    .isIn(['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'])
    .withMessage('Invalid status'),
];

const assignTicketValidation = [
  param('ticketId').isUUID().withMessage('Invalid ticket ID'),
  body('assigned_to').isUUID().withMessage('Invalid user ID'),
];

// User routes
router.post(
  '/tickets',
  authenticateToken,
  createTicketValidation,
  validateRequest,
  supportController.createTicket
);

router.get(
  '/tickets',
  authenticateToken,
  query('status').optional().isIn(['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed']),
  validateRequest,
  supportController.getUserTickets
);

router.get(
  '/tickets/:ticketId',
  authenticateToken,
  param('ticketId').isUUID().withMessage('Invalid ticket ID'),
  validateRequest,
  supportController.getTicket
);

router.post(
  '/tickets/:ticketId/messages',
  authenticateToken,
  addMessageValidation,
  validateRequest,
  supportController.addMessage
);

router.get(
  '/tickets/:ticketId/messages',
  authenticateToken,
  param('ticketId').isUUID().withMessage('Invalid ticket ID'),
  validateRequest,
  supportController.getTicketMessages
);

// Admin routes
router.get(
  '/admin/tickets',
  authenticateToken,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed']),
  query('category').optional().isIn(['technical', 'account', 'application', 'billing', 'general']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  validateRequest,
  supportController.getAllTickets
);

router.put(
  '/admin/tickets/:ticketId/status',
  authenticateToken,
  updateStatusValidation,
  validateRequest,
  supportController.updateTicketStatus
);

router.put(
  '/admin/tickets/:ticketId/assign',
  authenticateToken,
  assignTicketValidation,
  validateRequest,
  supportController.assignTicket
);

router.get(
  '/admin/tickets/stats',
  authenticateToken,
  supportController.getTicketStats
);

export default router;