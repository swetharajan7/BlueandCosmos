import { Router } from 'express';
import { emailController } from '../controllers/emailController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// User email preferences routes
router.get('/preferences', authenticateToken, emailController.getEmailPreferences);
router.put('/preferences', authenticateToken, emailController.updateEmailPreferences);

// Notification statistics
router.get('/stats', authenticateToken, emailController.getNotificationStats);

// Admin routes for email management
router.get('/templates', authenticateToken, emailController.getEmailTemplates);
router.put('/templates/:templateId', authenticateToken, emailController.updateEmailTemplate);
router.post('/retry-failed', authenticateToken, emailController.retryFailedEmails);
router.post('/test', authenticateToken, emailController.sendTestEmail);

// SendGrid webhook endpoint (no auth required)
router.post('/webhook/sendgrid', emailController.handleSendGridWebhook);

export default router;