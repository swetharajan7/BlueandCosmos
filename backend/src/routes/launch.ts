import express from 'express';
import { launchController, LaunchController } from '../controllers/launchController';
import { authenticateToken, requireRole } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { 
  sqlInjectionValidation, 
  xssValidation, 
  handleValidationErrors 
} from '../middleware/security';

const router = express.Router();

// Rate limiting for feedback submission
const feedbackRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each user to 5 feedback submissions per windowMs
  message: {
    success: false,
    message: 'Too many feedback submissions. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for public endpoints
const publicRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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
  feedbackRateLimit,
  authenticateToken,
  LaunchController.validateFeedback,
  sqlInjectionValidation,
  xssValidation,
  handleValidationErrors,
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
  publicRateLimit,
  launchController.checkUserLimit
);

// Check feature status (public)
router.get('/feature/:feature', 
  publicRateLimit,
  LaunchController.validateFeature,
  handleValidationErrors,
  launchController.checkFeatureStatus
);

export default router;