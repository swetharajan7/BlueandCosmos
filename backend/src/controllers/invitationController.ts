import { Request, Response } from 'express';
import { Pool } from 'pg';
import { InvitationService } from '../services/invitationService';
import { RecommenderModel } from '../models/Recommender';
import { ApplicationModel } from '../models/Application';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types';

export class InvitationController {
  private invitationService: InvitationService;
  private recommenderModel: RecommenderModel;
  private applicationModel: ApplicationModel;

  constructor(db: Pool) {
    this.invitationService = new InvitationService(db);
    this.recommenderModel = new RecommenderModel(db);
    this.applicationModel = new ApplicationModel(db);
  }

  /**
   * Send invitation to recommender
   */
  sendInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { applicationId } = req.params;
      const { recommender_email, custom_message } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Validate input
      if (!recommender_email) {
        throw new AppError('Recommender email is required', 400);
      }

      if (!applicationId) {
        throw new AppError('Application ID is required', 400);
      }

      // Verify application ownership
      const isOwner = await this.applicationModel.validateOwnership(applicationId, userId);
      if (!isOwner) {
        throw new AppError('Application not found or access denied', 404);
      }

      // Get application details for student name
      const application = await this.applicationModel.findById(applicationId);
      const studentName = application.legal_name;

      // Send invitation
      const { recommender } = await this.invitationService.sendInvitation(
        applicationId,
        recommender_email,
        studentName,
        custom_message
      );

      res.status(201).json({
        success: true,
        data: {
          recommender: {
            id: recommender.id,
            professional_email: recommender.professional_email,
            title: recommender.title,
            organization: recommender.organization,
            invitation_expires: recommender.invitation_expires,
            status: 'invited'
          }
        },
        message: 'Invitation sent successfully'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 409 ? 'ALREADY_INVITED' : 'INVITATION_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Send invitation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to send invitation'
          }
        });
      }
    }
  };

  /**
   * Get recommenders for an application
   */
  getApplicationRecommenders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Verify application ownership
      const isOwner = await this.applicationModel.validateOwnership(applicationId, userId);
      if (!isOwner) {
        throw new AppError('Application not found or access denied', 404);
      }

      // Get recommenders
      const recommenders = await this.recommenderModel.getByApplicationId(applicationId);

      // Format response with status information
      const formattedRecommenders = await Promise.all(
        recommenders.map(async (recommender) => {
          const { status } = await this.recommenderModel.getInvitationStatus(recommender.id);
          
          return {
            id: recommender.id,
            professional_email: recommender.professional_email,
            title: recommender.title,
            organization: recommender.organization,
            relationship_duration: recommender.relationship_duration,
            relationship_type: recommender.relationship_type,
            mobile_phone: recommender.mobile_phone,
            status,
            invitation_expires: recommender.invitation_expires,
            confirmed_at: recommender.confirmed_at,
            invited_at: (recommender as any).invited_at
          };
        })
      );

      res.json({
        success: true,
        data: formattedRecommenders
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'ACCESS_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Get recommenders error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get recommenders'
          }
        });
      }
    }
  };

  /**
   * Resend invitation to recommender
   */
  resendInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { applicationId, recommenderId } = req.params;
      const { custom_message } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Verify application ownership
      const isOwner = await this.applicationModel.validateOwnership(applicationId, userId);
      if (!isOwner) {
        throw new AppError('Application not found or access denied', 404);
      }

      // Get application details for student name
      const application = await this.applicationModel.findById(applicationId);
      const studentName = application.legal_name;

      // Resend invitation
      await this.invitationService.resendInvitation(
        recommenderId,
        applicationId,
        studentName,
        custom_message
      );

      res.json({
        success: true,
        message: 'Invitation resent successfully'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 404 ? 'NOT_FOUND' : 'RESEND_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Resend invitation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to resend invitation'
          }
        });
      }
    }
  };

  /**
   * Delete recommender invitation
   */
  deleteInvitation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { applicationId, recommenderId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      // Verify application ownership
      const isOwner = await this.applicationModel.validateOwnership(applicationId, userId);
      if (!isOwner) {
        throw new AppError('Application not found or access denied', 404);
      }

      // Delete invitation
      await this.recommenderModel.deleteInvitation(recommenderId, applicationId);

      res.json({
        success: true,
        message: 'Invitation deleted successfully'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 404 ? 'NOT_FOUND' : 
                  error.statusCode === 409 ? 'CANNOT_DELETE' : 'DELETE_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Delete invitation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete invitation'
          }
        });
      }
    }
  };

  /**
   * Get invitation details by token (public endpoint)
   */
  getInvitationDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      if (!token) {
        throw new AppError('Invitation token is required', 400);
      }

      // Get invitation details
      const details = await this.invitationService.getInvitationDetails(token);

      res.json({
        success: true,
        data: {
          recommender: {
            id: details.recommender.id,
            professional_email: details.recommender.professional_email,
            title: details.recommender.title,
            organization: details.recommender.organization
          },
          application: {
            id: details.application.id,
            legal_name: details.application.legal_name,
            program_type: details.application.program_type,
            application_term: details.application.application_term,
            universities: details.application.universities.map(u => ({
              id: u.id,
              name: u.name,
              code: u.code
            }))
          },
          status: details.status
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 404 ? 'INVALID_TOKEN' : 'INVITATION_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Get invitation details error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get invitation details'
          }
        });
      }
    }
  };

  /**
   * Confirm invitation and create recommender profile (public endpoint)
   */
  confirmInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;
      const {
        first_name,
        last_name,
        title,
        organization,
        relationship_duration,
        relationship_type,
        mobile_phone,
        password
      } = req.body;

      if (!token) {
        throw new AppError('Invitation token is required', 400);
      }

      // Validate required fields
      const requiredFields = {
        first_name,
        last_name,
        title,
        organization,
        relationship_duration,
        relationship_type,
        password
      };

      for (const [field, value] of Object.entries(requiredFields)) {
        if (!value || value.trim() === '') {
          throw new AppError(`${field.replace('_', ' ')} is required`, 400);
        }
      }

      // Validate password strength
      if (password.length < 8) {
        throw new AppError('Password must be at least 8 characters long', 400);
      }

      // Confirm invitation
      const confirmedRecommender = await this.invitationService.confirmInvitation(token, {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        title: title.trim(),
        organization: organization.trim(),
        relationship_duration: relationship_duration.trim(),
        relationship_type: relationship_type.trim(),
        mobile_phone: mobile_phone?.trim(),
        password
      });

      res.status(201).json({
        success: true,
        data: {
          recommender: {
            id: confirmedRecommender.id,
            professional_email: confirmedRecommender.professional_email,
            title: confirmedRecommender.title,
            organization: confirmedRecommender.organization,
            relationship_duration: confirmedRecommender.relationship_duration,
            relationship_type: confirmedRecommender.relationship_type,
            mobile_phone: confirmedRecommender.mobile_phone,
            confirmed_at: confirmedRecommender.confirmed_at
          }
        },
        message: 'Invitation confirmed successfully'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 404 ? 'INVALID_TOKEN' : 
                  error.statusCode === 400 ? 'VALIDATION_ERROR' : 'CONFIRMATION_ERROR',
            message: error.message
          }
        });
      } else {
        console.error('Confirm invitation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to confirm invitation'
          }
        });
      }
    }
  };
}