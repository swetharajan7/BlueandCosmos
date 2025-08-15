import { Request, Response } from 'express';
import { launchManagementService } from '../services/launchManagementService';
import { AppError } from '../utils/AppError';

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
        message: 'Failed to initialize launch'
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
        message: 'Failed to retrieve metrics'
      });
    }
  }

  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { rating, comments, category } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      if (!rating || !comments || !category) {
        throw new AppError('Missing required feedback fields', 400);
      }

      await launchManagementService.submitUserFeedback({
        userId,
        rating: parseInt(rating),
        comments,
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
        message: 'Failed to get scaling recommendations'
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
        message: 'Failed to generate launch report'
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
        message: 'Failed to check user limit'
      });
    }
  }

  async checkFeatureStatus(req: Request, res: Response): Promise<void> {
    try {
      const { feature } = req.params;
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
        message: 'Failed to check feature status'
      });
    }
  }
}

export const launchController = new LaunchController();