import { Router } from 'express';
import { AdminDashboardController } from '../controllers/adminDashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const adminDashboardController = new AdminDashboardController();

// Apply authentication and admin role requirement to all routes
router.use(authenticate);
router.use(authorize('admin'));

// System Overview and Health
router.get('/overview', adminDashboardController.getSystemOverview.bind(adminDashboardController));
router.get('/health', adminDashboardController.getSystemHealth.bind(adminDashboardController));

// Analytics and Metrics
router.get('/analytics', adminDashboardController.getAnalytics.bind(adminDashboardController));
router.get('/business-metrics', adminDashboardController.getBusinessMetrics.bind(adminDashboardController));

// User Management
router.get('/users', adminDashboardController.getUsers.bind(adminDashboardController));
router.get('/users/:userId', adminDashboardController.getUserDetails.bind(adminDashboardController));
router.put('/users/:userId/status', adminDashboardController.updateUserStatus.bind(adminDashboardController));
router.post('/users/:userId/reset-password', adminDashboardController.resetUserPassword.bind(adminDashboardController));

// Application Management
router.get('/applications', adminDashboardController.getApplications.bind(adminDashboardController));
router.get('/applications/:applicationId', adminDashboardController.getApplicationDetails.bind(adminDashboardController));

// System Configuration
router.get('/config', adminDashboardController.getSystemConfig.bind(adminDashboardController));
router.put('/config', adminDashboardController.updateSystemConfig.bind(adminDashboardController));

// Backup and Recovery
router.post('/backups', adminDashboardController.createBackup.bind(adminDashboardController));
router.get('/backups', adminDashboardController.getBackups.bind(adminDashboardController));
router.post('/backups/:backupId/restore', adminDashboardController.restoreBackup.bind(adminDashboardController));

export default router;