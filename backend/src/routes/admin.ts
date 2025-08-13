import { Router } from 'express';
import { Pool } from 'pg';
import { AdminController } from '../controllers/adminController';
import { EmailService } from '../services/emailService';
import { WebSocketService } from '../services/websocketService';
import { authenticateToken, requireRole } from '../middleware/auth';

export function createAdminRoutes(
  db: Pool, 
  emailService: EmailService, 
  websocketService?: WebSocketService
): Router {
  const router = Router();
  const adminController = new AdminController(db, emailService, websocketService);

  // Apply authentication and admin role requirement to all routes
  router.use(authenticateToken);
  router.use(requireRole('admin'));

  // Dashboard and Monitoring
  router.get('/dashboard', adminController.getDashboard.bind(adminController));
  router.get('/health-report', adminController.getHealthReport.bind(adminController));
  router.post('/monitoring/start', adminController.startMonitoring.bind(adminController));
  router.post('/monitoring/stop', adminController.stopMonitoring.bind(adminController));
  router.get('/system/status', adminController.getSystemStatus.bind(adminController));

  // Analytics
  router.get('/analytics', adminController.getAnalytics.bind(adminController));
  router.get('/metrics/submissions', adminController.getSubmissionMetrics.bind(adminController));
  router.get('/universities/:universityId/performance', adminController.getUniversityPerformance.bind(adminController));

  // Error Management
  router.get('/errors', adminController.getErrorLogs.bind(adminController));
  router.get('/errors/metrics', adminController.getErrorMetrics.bind(adminController));
  router.put('/errors/:errorId/resolve', adminController.resolveError.bind(adminController));
  router.post('/errors/bulk-resolve', adminController.bulkResolveErrors.bind(adminController));

  // Notification Management
  router.get('/notifications/rules', adminController.getNotificationRules.bind(adminController));
  router.post('/notifications/rules', adminController.createNotificationRule.bind(adminController));
  router.put('/notifications/rules/:ruleId', adminController.updateNotificationRule.bind(adminController));
  router.delete('/notifications/rules/:ruleId', adminController.deleteNotificationRule.bind(adminController));
  router.get('/notifications/events', adminController.getNotificationEvents.bind(adminController));
  router.put('/notifications/events/:eventId/acknowledge', adminController.acknowledgeNotification.bind(adminController));

  // Submission Management
  router.post('/submissions/retry-failed', adminController.retryFailedSubmissions.bind(adminController));
  router.get('/queue/status', adminController.getQueueStatus.bind(adminController));
  router.get('/queue/items', adminController.getQueueItems.bind(adminController));

  // System Management
  router.post('/system/cleanup-logs', adminController.cleanupOldLogs.bind(adminController));

  return router;
}