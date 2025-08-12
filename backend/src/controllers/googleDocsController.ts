import { Request, Response } from 'express';
import { ApplicationModel } from '../models/Application';
import { getGoogleDocsService } from '../config/googleDocs';
import { AppError } from '../utils/AppError';
import { db } from '../config/database';

const applicationModel = new ApplicationModel(db);

export class GoogleDocsController {
  /**
   * Get Google Doc URL for an application
   */
  static async getDocumentUrl(req: Request, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate ownership
      if (!(await applicationModel.validateOwnership(applicationId, userId))) {
        throw new AppError('Access denied', 403);
      }

      const documentUrl = await applicationModel.getGoogleDocUrl(applicationId);
      
      if (!documentUrl) {
        throw new AppError('Google Doc not found for this application', 404);
      }

      res.json({
        success: true,
        data: {
          documentUrl
        }
      });
    } catch (error: any) {
      console.error('Error getting Google Doc URL:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get Google Doc URL'
      });
    }
  }

  /**
   * Update Google Doc with current application data
   */
  static async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate ownership
      if (!(await applicationModel.validateOwnership(applicationId, userId))) {
        throw new AppError('Access denied', 403);
      }

      await applicationModel.updateGoogleDoc(applicationId);

      res.json({
        success: true,
        message: 'Google Doc updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating Google Doc:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to update Google Doc'
      });
    }
  }

  /**
   * Set document permissions
   */
  static async setPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const { permissions } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate ownership
      if (!(await applicationModel.validateOwnership(applicationId, userId))) {
        throw new AppError('Access denied', 403);
      }

      // Validate permissions format
      if (!Array.isArray(permissions)) {
        throw new AppError('Permissions must be an array', 400);
      }

      for (const permission of permissions) {
        if (!permission.type || !permission.role) {
          throw new AppError('Each permission must have type and role', 400);
        }
        
        if (!['user', 'group', 'domain', 'anyone'].includes(permission.type)) {
          throw new AppError('Invalid permission type', 400);
        }
        
        if (!['owner', 'writer', 'commenter', 'reader'].includes(permission.role)) {
          throw new AppError('Invalid permission role', 400);
        }
        
        if (permission.type === 'user' && !permission.emailAddress) {
          throw new AppError('Email address required for user permissions', 400);
        }
      }

      await applicationModel.setGoogleDocPermissions(applicationId, permissions);

      res.json({
        success: true,
        message: 'Document permissions updated successfully'
      });
    } catch (error: any) {
      console.error('Error setting document permissions:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to set document permissions'
      });
    }
  }

  /**
   * Add recommendation content to Google Doc
   */
  static async addRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const { universityName, recommendationContent, recommenderName } = req.body;
      const userId = req.user?.userId;

      // Validate required fields
      if (!universityName || !recommendationContent || !recommenderName) {
        throw new AppError('University name, recommendation content, and recommender name are required', 400);
      }

      // For now, we'll allow both students and recommenders to add content
      // In a real implementation, you might want more specific access control
      const application = await applicationModel.findById(applicationId);
      if (!application) {
        throw new AppError('Application not found', 404);
      }

      await applicationModel.addRecommendationToDoc(
        applicationId,
        universityName,
        recommendationContent,
        recommenderName
      );

      res.json({
        success: true,
        message: 'Recommendation added to Google Doc successfully'
      });
    } catch (error: any) {
      console.error('Error adding recommendation to Google Doc:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to add recommendation to Google Doc'
      });
    }
  }

  /**
   * Get document metadata
   */
  static async getDocumentMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate ownership
      if (!(await applicationModel.validateOwnership(applicationId, userId))) {
        throw new AppError('Access denied', 403);
      }

      const application = await applicationModel.findById(applicationId);
      
      if (!application.google_doc_id) {
        throw new AppError('Google Doc not found for this application', 404);
      }

      const googleDocsService = getGoogleDocsService();
      const metadata = await googleDocsService.getDocumentMetadata(application.google_doc_id);

      res.json({
        success: true,
        data: metadata
      });
    } catch (error: any) {
      console.error('Error getting document metadata:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to get document metadata'
      });
    }
  }

  /**
   * Validate document access
   */
  static async validateAccess(req: Request, res: Response): Promise<void> {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate ownership
      if (!(await applicationModel.validateOwnership(applicationId, userId))) {
        throw new AppError('Access denied', 403);
      }

      const application = await applicationModel.findById(applicationId);
      
      if (!application.google_doc_id) {
        throw new AppError('Google Doc not found for this application', 404);
      }

      const googleDocsService = getGoogleDocsService();
      const isAccessible = await googleDocsService.validateDocumentAccess(application.google_doc_id);

      res.json({
        success: true,
        data: {
          isAccessible,
          documentId: application.google_doc_id
        }
      });
    } catch (error: any) {
      console.error('Error validating document access:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Failed to validate document access'
      });
    }
  }
}