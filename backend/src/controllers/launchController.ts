import { Request, Response } from 'express';
import { launchManagementService } from '../services/launchManagementService';
import { AppError } from '../utils/AppError';
import { body, param, validationResult } from 'express-validator';
import * as DOMPurify from 'isomorphic-dompurify';

export class LaunchController {
  async initializeLaunch(req: Request, res: Response): Promise<void> {
    try {
      await launchManagementService.initializeSoftLaunch();
      
      res.status(200).json({
        success: true,
        message: 'Soft launch initialized successfully'
      });
    } catch (error) {
      console.error('Launch initialization failed:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getLaunchMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await launchManagementService.collectMetrics();
      
      res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Failed to get launch metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { rating, comments, category } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Sanitize user input to prevent XSS
      const sanitizedComments = DOMPurify.sanitize(comments.trim());
      
      // Validate rating range
      const numericRating = parseInt(rating);
      if (numericRating < 1 || numericRating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }

      // Validate category
      const validCategories = ['bug', 'feature', 'usability', 'performance'];
      if (!validCategories.includes(category)) {
        throw new AppError('Invalid feedback category', 400);
      }

      // Validate comments length
      if (sanitizedComments.length < 10 || sanitizedComments.length > 1000) {
        throw new AppError('Comments must be between 10 and 1000 characters', 400);
      }

      await launchManagementService.submitUserFeedback({
        userId,
        rating: numericRating,
        comments: sanitizedComments,
        category
      });

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      res.status(500).json({
        success: false,
        message: error instanceof AppError ? error.message : 'Failed to submit feedback'
      });
    }
  }

  async getScalingRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const recommendations = await launchManagementService.scalingRecommendations();
      
      res.status(200).json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      console.error('Failed to get scaling recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getLaunchReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await launchManagementService.generateLaunchReport();
      
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Failed to generate launch report:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async checkUserLimit(req: Request, res: Response): Promise<void> {
    try {
      const canRegister = await launchManagementService.checkUserLimit();
      
      res.status(200).json({
        success: true,
        data: {
          canRegister,
          message: canRegister ? 'Registration available' : 'User limit reached for soft launch'
        }
      });
    } catch (error) {
      console.error('Failed to check user limit:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async checkFeatureStatus(req: Request, res: Response): Promise<void> {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { feature } = req.params;
      
      // Validate feature name format (alphanumeric and underscores only)
      if (!/^[a-zA-Z0-9_]+$/.test(feature)) {
        throw new AppError('Invalid feature name format', 400);
      }

      const isEnabled = await launchManagementService.isFeatureEnabled(feature);
      
      res.status(200).json({
        success: true,
        data: {
          feature,
          enabled: isEnabled
        }
      });
    } catch (error) {
      console.error('Failed to check feature status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Validation middleware for feedback submission
  static validateFeedback = [
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be an integer between 1 and 5'),
    body('comments')
      .isLength({ min: 10, max: 1000 })
      .withMessage('Comments must be between 10 and 1000 characters')
      .trim()
      .escape(),
    body('category')
      .isIn(['bug', 'feature', 'usability', 'performance'])
      .withMessage('Category must be one of: bug, feature, usability, performance')
  ];

  // Validation middleware for feature parameter
  static validateFeature = [
    param('feature')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Feature name must contain only alphanumeric characters and underscores')
      .isLength({ min: 1, max: 50 })
      .withMessage('Feature name must be between 1 and 50 characters')
  ];
}

export const launchController = new LaunchController();