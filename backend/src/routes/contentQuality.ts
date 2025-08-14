import express from 'express';
import { contentQualityService } from '../services/contentQualityService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, query, param } from 'express-validator';

const router = express.Router();

/**
 * Real-time content quality analysis
 */
router.post('/analyze/realtime',
  authenticateToken,
  [
    body('content').isString().isLength({ min: 10, max: 10000 }).withMessage('Content must be between 10 and 10000 characters'),
    body('applicationData.applicantName').isString().notEmpty().withMessage('Applicant name is required'),
    body('applicationData.programType').isString().notEmpty().withMessage('Program type is required'),
    body('applicationData.relationshipType').isString().notEmpty().withMessage('Relationship type is required'),
    body('applicationData.relationshipDuration').isString().notEmpty().withMessage('Relationship duration is required'),
    body('applicationData.recommenderId').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { content, applicationData } = req.body;
      
      // Add recommender ID from token if not provided
      if (!applicationData.recommenderId && req.user) {
        applicationData.recommenderId = req.user.id;
      }

      const qualityScore = await contentQualityService.analyzeQualityRealTime(content, applicationData);
      
      res.json({
        success: true,
        data: qualityScore
      });
    } catch (error) {
      console.error('Real-time quality analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze content quality'
      });
    }
  }
);

/**
 * Comprehensive plagiarism detection
 */
router.post('/plagiarism/detect',
  authenticateToken,
  [
    body('content').isString().isLength({ min: 50, max: 10000 }).withMessage('Content must be between 50 and 10000 characters'),
    body('excludeRecommenderId').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { content, excludeRecommenderId } = req.body;
      
      const plagiarismResult = await contentQualityService.detectPlagiarism(
        content, 
        excludeRecommenderId || req.user?.id
      );
      
      res.json({
        success: true,
        data: plagiarismResult
      });
    } catch (error) {
      console.error('Plagiarism detection error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect plagiarism'
      });
    }
  }
);

/**
 * Get quality benchmarks
 */
router.get('/benchmarks',
  authenticateToken,
  [
    query('programType').optional().isString(),
    query('relationshipType').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { programType, relationshipType } = req.query;
      
      const benchmarks = await contentQualityService.getQualityBenchmarks(
        programType as string,
        relationshipType as string
      );
      
      res.json({
        success: true,
        data: benchmarks
      });
    } catch (error) {
      console.error('Benchmarks retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality benchmarks'
      });
    }
  }
);

/**
 * Get quality analytics dashboard data
 */
router.get('/analytics',
  authenticateToken,
  [
    query('timeRange').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid time range')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { timeRange } = req.query;
      
      const analytics = await contentQualityService.getQualityAnalytics(
        timeRange as 'week' | 'month' | 'quarter' | 'year'
      );
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Analytics retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality analytics'
      });
    }
  }
);

/**
 * Enhanced auto-save with comprehensive analysis
 */
router.post('/autosave',
  authenticateToken,
  [
    body('content').isString().isLength({ min: 1, max: 10000 }).withMessage('Content must be between 1 and 10000 characters'),
    body('applicationData').isObject().withMessage('Application data is required'),
    body('applicationData.applicantName').isString().notEmpty().withMessage('Applicant name is required'),
    body('applicationData.programType').isString().notEmpty().withMessage('Program type is required'),
    body('applicationData.relationshipType').isString().notEmpty().withMessage('Relationship type is required'),
    body('applicationData.relationshipDuration').isString().notEmpty().withMessage('Relationship duration is required')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { content, applicationData } = req.body;
      
      // Add recommender ID from token
      if (req.user) {
        applicationData.recommenderId = req.user.id;
      }

      const result = await contentQualityService.autoSaveWithQuality(content, applicationData);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Enhanced auto-save error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-save with quality analysis'
      });
    }
  }
);

/**
 * Validate content for submission requirements
 */
router.post('/validate',
  authenticateToken,
  [
    body('content').isString().isLength({ min: 10, max: 10000 }).withMessage('Content must be between 10 and 10000 characters')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { content } = req.body;
      
      const validation = await contentQualityService.validateContent(content);
      
      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      console.error('Content validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate content'
      });
    }
  }
);

/**
 * Get quality score history for a recommender
 */
router.get('/history/:recommenderId?',
  authenticateToken,
  [
    param('recommenderId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const recommenderId = req.params.recommenderId || req.user?.id;
      const limit = parseInt(req.query.limit as string) || 10;
      
      if (!recommenderId) {
        return res.status(400).json({
          success: false,
          error: 'Recommender ID is required'
        });
      }

      // In a real implementation, this would fetch from database
      // For now, we'll return a placeholder response
      res.json({
        success: true,
        data: {
          recommenderId,
          analyses: [],
          totalCount: 0,
          averageScore: 0
        }
      });
    } catch (error) {
      console.error('Quality history retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality history'
      });
    }
  }
);

export default router;