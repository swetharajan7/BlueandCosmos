import { Router } from 'express';
import { monitoringController } from '../controllers/monitoringController';
import { auth } from '../middleware/auth';

const router = Router();

// Public health endpoints (no auth required)
router.get('/health', monitoringController.getHealthCheck);
router.get('/readiness', monitoringController.getReadiness);
router.get('/liveness', monitoringController.getLiveness);

// Protected monitoring endpoints (admin only)
router.get('/health/detailed', auth, monitoringController.getDetailedHealth);
router.get('/metrics', auth, monitoringController.getMetrics);
router.get('/metrics/users', auth, monitoringController.getUserMetrics);
router.get('/metrics/applications', auth, monitoringController.getApplicationMetrics);
router.get('/metrics/recommendations', auth, monitoringController.getRecommendationMetrics);
router.get('/metrics/system', auth, monitoringController.getSystemMetrics);
router.get('/uptime', auth, monitoringController.getUptimeHistory);
router.post('/metrics/custom', auth, monitoringController.recordCustomMetric);

// Business metrics dashboard endpoints
router.get('/dashboard', auth, monitoringController.getBusinessDashboard);
router.get('/dashboard/report', auth, monitoringController.getBusinessReport);
router.get('/alerts', auth, monitoringController.getAlerts);
router.get('/analytics/performance', auth, monitoringController.getPerformanceAnalytics);

export default router;