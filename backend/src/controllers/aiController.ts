import { Request, Response, NextFunction } from 'express';
import { aiService, OutlineRequest, WritingImprovementRequest } from '../services/aiService';
import { AppError } from '../utils/AppError';
import { validationResult } from 'express-validator';

export class AIController {
  /**
   * Generate recommendation outline
   */
  async generateOutline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input data', 400);
      }

      const outlineRequest: OutlineRequest = {
        applicantName: req.body.applicantName,
        programType: req.body.programType,
        universities: req.body.universities,
        relationshipType: req.body.relationshipType,
        relationshipDuration: req.body.relationshipDuration,
        recommenderTitle: req.body.recommenderTitle
      };

      const outline = await aiService.generateOutline(outlineRequest);

      res.status(200).json({
        success: true,
        data: {
          outline,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get example phrases and structures
   */
  async suggestExamples(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input data', 400);
      }

      const applicantInfo = {
        programType: req.body.programType,
        relationshipType: req.body.relationshipType,
        recommenderTitle: req.body.recommenderTitle
      };

      const examples = await aiService.suggestExamples(applicantInfo);

      res.status(200).json({
        success: true,
        data: {
          examples,
          count: examples.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Improve writing content
   */
  async improveWriting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input data', 400);
      }

      const improvementRequest: WritingImprovementRequest = {
        content: req.body.content,
        focusArea: req.body.focusArea
      };

      const improvements = await aiService.improveWriting(improvementRequest);

      res.status(200).json({
        success: true,
        data: {
          improvements,
          originalLength: req.body.content.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Analyze content quality
   */
  async analyzeQuality(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Invalid input data', 400);
      }

      const content = req.body.content;
      const analysis = await aiService.analyzeQuality(content);

      res.status(200).json({
        success: true,
        data: {
          analysis,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get AI usage statistics (admin only)
   */
  async getUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { operation, date } = req.query;
      
      const stats = await aiService.getUsageStats(
        operation as string, 
        date as string
      );

      res.status(200).json({
        success: true,
        data: {
          stats,
          totalRequests: stats.reduce((sum, stat) => sum + stat.requestCount, 0),
          totalTokens: stats.reduce((sum, stat) => sum + stat.tokenUsage, 0),
          totalCost: stats.reduce((sum, stat) => sum + stat.cost, 0),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Health check for AI service
   */
  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Simple test to verify AI service is working
      const testAnalysis = await aiService.analyzeQuality('This is a test recommendation letter.');
      
      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          aiServiceAvailable: true,
          testScore: testAnalysis.score,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          aiServiceAvailable: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });
    }
  }
}

export const aiController = new AIController();