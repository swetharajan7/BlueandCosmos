import express from 'express';
import { launchController } from '../controllers/launchController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/auth';

const router = express.Router();

// Initialize soft launch (admin only)
router.post('/initialize', 
  authenticateToken, 
  requireRole(['admin']), 
  launchController.initializeLaunch
);

// Get launch metrics (admin only)
router.get('/metrics', 
  authenticateToken, 
  requireRole(['admin']), 
  launchController.getLaunchMetrics
);

// Submit user feedback (authenticated users)
router.post('/feedback', 
  authenticateToken, 
  launchController.submitFeedback
);

// Get scaling recommendations (admin only)
router.get('/scaling', 
  authenticateToken, 
  requireRole(['admin']), 
  launchController.getScalingRecommendations
);

// Get launch report (admin only)
router.get('/report', 
  authenticateToken, 
  requireRole(['admin']), 
  launchController.getLaunchReport
);

// Check user registration limit (public)
router.get('/user-limit', 
  launchController.checkUserLimit
);

// Check feature status (public)
router.get('/feature/:feature', 
  launchController.checkFeatureStatus
);

export default router;