import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';
import { 
  validateOutlineRequest,
  validateExamplesRequest,
  validateImprovementRequest,
  validateQualityAnalysisRequest,
  validateUsageStatsRequest
} from '../middleware/aiValidation';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for AI endpoints (more restrictive than general API)
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 AI requests per windowMs
  message: {
    error: 'Too many AI requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and rate limiting to all AI routes
router.use(authenticate);
router.use(aiRateLimit);

/**
 * @route   POST /api/ai/generate-outline
 * @desc    Generate recommendation outline using AI
 * @access  Private (Recommenders only)
 */
router.post('/generate-outline', validateOutlineRequest, aiController.generateOutline);

/**
 * @route   POST /api/ai/suggest-examples
 * @desc    Get example phrases and structures for recommendations
 * @access  Private (Recommenders only)
 */
router.post('/suggest-examples', validateExamplesRequest, aiController.suggestExamples);

/**
 * @route   POST /api/ai/improve-writing
 * @desc    Get writing improvement suggestions
 * @access  Private (Recommenders only)
 */
router.post('/improve-writing', validateImprovementRequest, aiController.improveWriting);

/**
 * @route   POST /api/ai/analyze-quality
 * @desc    Analyze recommendation content quality
 * @access  Private (Recommenders only)
 */
router.post('/analyze-quality', validateQualityAnalysisRequest, aiController.analyzeQuality);

/**
 * @route   GET /api/ai/usage-stats
 * @desc    Get AI usage statistics (admin only)
 * @access  Private (Admin only)
 */
router.get('/usage-stats', validateUsageStatsRequest, (req: any, res: any, next: any) => {
  // Check if user is admin
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
}, aiController.getUsageStats);

/**
 * @route   GET /api/ai/health
 * @desc    Health check for AI service
 * @access  Private
 */
router.get('/health', aiController.healthCheck);

export default router;