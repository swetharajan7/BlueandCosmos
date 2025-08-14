import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Pool } from 'pg';
import { RecommenderModel } from '../models/Recommender';
import { ApplicationModel } from '../models/Application';
import { UserModel } from '../models/User';
import { authService } from '../services/authService';
import { emailService } from '../services/emailService';
import { contentQualityService } from '../services/contentQualityService';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest, LoginRequest, AuthResponse } from '../types';
import { getNotificationService } from '../services/notificationService';

export class RecommenderController {
  private recommenderModel: RecommenderModel;
  private applicationModel: ApplicationModel;
  private userModel: UserModel;

  constructor(db: Pool) {
    this.recommenderModel = new RecommenderModel(db);
    this.applicationModel = new ApplicationModel(db);
    this.userModel = new UserModel(db);
  }

  /**
   * Login recommender using email and password
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { email, password }: LoginRequest = req.body;

      // Find user by email
      const user = await this.userModel.findByEmail(email);
      if (!user || user.role !== 'recommender') {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify password
      const isValidPassword = await this.userModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if recommender profile exists and is confirmed
      const recommender = await this.recommenderModel.findByUserId(user.id);
      if (!recommender || !recommender.confirmed_at) {
        res.status(401).json({
          success: false,
          error: {
            code: 'ACCOUNT_NOT_CONFIRMED',
            message: 'Recommender account not confirmed. Please complete your invitation first.'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Remove password from user object
      const { password_hash, ...userWithoutPassword } = user;

      // Generate tokens
      const { accessToken, refreshToken } = await authService.generateTokens(userWithoutPassword);

      const response: AuthResponse = {
        user: userWithoutPassword,
        token: accessToken,
        refreshToken
      };

      res.status(200).json({
        success: true,
        data: response,
        message: 'Login successful',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Recommender login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        },
        timestamp: new Date().toISOString()
      });
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

      // Find recommender by invitation token
      const recommender = await this.recommenderModel.findByInvitationToken(token);
      if (!recommender) {
        throw new AppError('Invalid or expired invitation token', 404);
      }

      // Get applications for this recommender
      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      if (applicationIds.length === 0) {
        throw new AppError('No application found for recommender', 404);
      }

      // Get application details (assuming one application per invitation for now)
      const application = await this.applicationModel.findById(applicationIds[0]);

      // Get invitation status
      const { status } = await this.recommenderModel.getInvitationStatus(recommender.id);

      res.json({
        success: true,
        data: {
          recommender: {
            id: recommender.id,
            professional_email: recommender.professional_email,
            title: recommender.title,
            organization: recommender.organization
          },
          application: {
            id: application.id,
            legal_name: application.legal_name,
            program_type: application.program_type,
            application_term: application.application_term,
            universities: application.universities.map(u => ({
              id: u.id,
              name: u.name,
              code: u.code
            }))
          },
          status
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 404 ? 'INVALID_TOKEN' : 'INVITATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Get invitation details error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get invitation details'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Confirm invitation and create recommender profile (public endpoint)
   */
  confirmInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check validation errors first
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

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

      // Additional business logic validation
      const trimmedData = {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        title: title.trim(),
        organization: organization.trim(),
        relationship_duration: relationship_duration.trim(),
        relationship_type: relationship_type.trim(),
        mobile_phone: mobile_phone?.trim() || null,
        password
      };

      // Check if invitation token is still valid
      const existingRecommender = await this.recommenderModel.findByInvitationToken(token);
      if (!existingRecommender) {
        throw new AppError('Invalid or expired invitation token', 404);
      }

      if (existingRecommender.confirmed_at) {
        throw new AppError('This invitation has already been confirmed', 409);
      }

      // Confirm invitation
      const confirmedRecommender = await this.recommenderModel.confirmInvitation(token, trimmedData);

      // Send welcome email
      try {
        await this.sendWelcomeEmail(confirmedRecommender);
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }

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
        message: 'Invitation confirmed successfully. Welcome to StellarRec™!',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 404 ? 'INVALID_TOKEN' : 
                  error.statusCode === 409 ? 'ALREADY_CONFIRMED' :
                  error.statusCode === 400 ? 'VALIDATION_ERROR' : 'CONFIRMATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Confirm invitation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to confirm invitation'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Report discrepancy in applicant details
   */
  reportDiscrepancy = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { token } = req.params;
      const { discrepancy_type, description, correct_information } = req.body;

      if (!token) {
        throw new AppError('Invitation token is required', 400);
      }

      // Find recommender by invitation token
      const recommender = await this.recommenderModel.findByInvitationToken(token);
      if (!recommender) {
        throw new AppError('Invalid or expired invitation token', 404);
      }

      // Get application details
      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      if (applicationIds.length === 0) {
        throw new AppError('No application found for recommender', 404);
      }

      const application = await this.applicationModel.findById(applicationIds[0]);
      const student = await this.userModel.findById(application.student_id);

      // Send discrepancy report email to student and admin
      await this.sendDiscrepancyReport({
        recommender,
        application,
        student: student!,
        discrepancy_type,
        description,
        correct_information
      });

      res.json({
        success: true,
        message: 'Discrepancy report submitted successfully. The student will be notified to review and correct the information.',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 404 ? 'INVALID_TOKEN' : 'DISCREPANCY_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Report discrepancy error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to report discrepancy'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Get current recommender profile
   */
  getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      res.json({
        success: true,
        data: {
          id: recommender.id,
          professional_email: recommender.professional_email,
          title: recommender.title,
          organization: recommender.organization,
          relationship_duration: recommender.relationship_duration,
          relationship_type: recommender.relationship_type,
          mobile_phone: recommender.mobile_phone,
          confirmed_at: recommender.confirmed_at,
          created_at: recommender.created_at,
          updated_at: recommender.updated_at
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'PROFILE_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Get recommender profile error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get profile'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Update recommender profile
   */
  updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { title, organization, relationship_duration, relationship_type, mobile_phone } = req.body;

      const updatedRecommender = await this.recommenderModel.updateProfile(req.user.userId, {
        title,
        organization,
        relationship_duration,
        relationship_type,
        mobile_phone
      });

      res.json({
        success: true,
        data: {
          id: updatedRecommender.id,
          professional_email: updatedRecommender.professional_email,
          title: updatedRecommender.title,
          organization: updatedRecommender.organization,
          relationship_duration: updatedRecommender.relationship_duration,
          relationship_type: updatedRecommender.relationship_type,
          mobile_phone: updatedRecommender.mobile_phone,
          confirmed_at: updatedRecommender.confirmed_at,
          updated_at: updatedRecommender.updated_at
        },
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'PROFILE_UPDATE_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Update recommender profile error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update profile'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Get applications assigned to recommender
   */
  getApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      const applications = await Promise.all(
        applicationIds.map(async (id) => {
          const app = await this.applicationModel.findById(id);
          return {
            id: app.id,
            legal_name: app.legal_name,
            program_type: app.program_type,
            application_term: app.application_term,
            status: app.status,
            universities: app.universities.map(u => ({
              id: u.id,
              name: u.name,
              code: u.code
            })),
            created_at: app.created_at
          };
        })
      );

      res.json({
        success: true,
        data: applications,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'APPLICATIONS_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Get applications error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get applications'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Get specific application details for recommender
   */
  getApplicationDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { applicationId } = req.params;
      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      // Verify recommender has access to this application
      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      if (!applicationIds.includes(applicationId)) {
        throw new AppError('Application not found or access denied', 404);
      }

      const application = await this.applicationModel.findById(applicationId);
      const student = await this.userModel.findById(application.student_id);

      res.json({
        success: true,
        data: {
          application: {
            id: application.id,
            legal_name: application.legal_name,
            program_type: application.program_type,
            application_term: application.application_term,
            status: application.status,
            universities: application.universities.map(u => ({
              id: u.id,
              name: u.name,
              code: u.code
            })),
            created_at: application.created_at
          },
          student: {
            id: student!.id,
            first_name: student!.first_name,
            last_name: student!.last_name,
            email: student!.email,
            phone: student!.phone
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'APPLICATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Get application details error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get application details'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Confirm application details are correct
   */
  confirmApplicationDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { applicationId } = req.params;
      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      // Verify recommender has access to this application
      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      if (!applicationIds.includes(applicationId)) {
        throw new AppError('Application not found or access denied', 404);
      }

      // Mark application details as confirmed by recommender
      await this.recommenderModel.confirmApplicationDetails(recommender.id, applicationId);

      res.json({
        success: true,
        message: 'Application details confirmed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'CONFIRMATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Confirm application details error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to confirm application details'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Get recommendation for specific application
   */
  getRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { applicationId } = req.params;
      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      // Verify recommender has access to this application
      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      if (!applicationIds.includes(applicationId)) {
        throw new AppError('Application not found or access denied', 404);
      }

      const recommendation = await this.recommenderModel.getRecommendationByApplicationId(applicationId);
      if (!recommendation) {
        throw new AppError('Recommendation not found', 404);
      }

      res.json({
        success: true,
        data: recommendation,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'RECOMMENDATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Get recommendation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get recommendation'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Create a new recommendation
   */
  createRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { application_id, content } = req.body;
      
      if (!application_id || !content) {
        throw new AppError('Application ID and content are required', 400);
      }

      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      // Verify recommender has access to this application
      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      if (!applicationIds.includes(application_id)) {
        throw new AppError('Application not found or access denied', 404);
      }

      // Check if recommendation already exists
      const existingRecommendation = await this.recommenderModel.getRecommendationByApplicationId(application_id);
      if (existingRecommendation) {
        throw new AppError('Recommendation already exists for this application', 409);
      }

      const recommendation = await this.recommenderModel.createRecommendation({
        application_id,
        recommender_id: recommender.id,
        content: content.trim(),
        word_count: content.trim().split(/\s+/).length,
        ai_assistance_used: false // This could be tracked based on AI service usage
      });

      res.status(201).json({
        success: true,
        data: recommendation,
        message: 'Recommendation created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 409 ? 'RECOMMENDATION_EXISTS' : 'RECOMMENDATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Create recommendation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create recommendation'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Update an existing recommendation
   */
  updateRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { recommendationId } = req.params;
      const { content } = req.body;
      
      if (!content) {
        throw new AppError('Content is required', 400);
      }

      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      // Verify recommender owns this recommendation
      const recommendation = await this.recommenderModel.getRecommendationById(recommendationId);
      if (!recommendation || recommendation.recommender_id !== recommender.id) {
        throw new AppError('Recommendation not found or access denied', 404);
      }

      // Check if recommendation is already submitted
      if (recommendation.status === 'submitted' || recommendation.status === 'delivered') {
        throw new AppError('Cannot update submitted recommendation', 409);
      }

      const updatedRecommendation = await this.recommenderModel.updateRecommendation(recommendationId, {
        content: content.trim(),
        word_count: content.trim().split(/\s+/).length
      });

      res.json({
        success: true,
        data: updatedRecommendation,
        message: 'Recommendation updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 409 ? 'RECOMMENDATION_SUBMITTED' : 'RECOMMENDATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Update recommendation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update recommendation'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Submit a recommendation
   */
  submitRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { recommendationId } = req.params;

      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      // Verify recommender owns this recommendation
      const recommendation = await this.recommenderModel.getRecommendationById(recommendationId);
      if (!recommendation || recommendation.recommender_id !== recommender.id) {
        throw new AppError('Recommendation not found or access denied', 404);
      }

      // Check if recommendation is already submitted
      if (recommendation.status === 'submitted' || recommendation.status === 'delivered') {
        throw new AppError('Recommendation already submitted', 409);
      }

      // Validate content length
      if (recommendation.word_count < 200) {
        throw new AppError('Recommendation must be at least 200 words', 400);
      }

      if (recommendation.word_count > 1000) {
        throw new AppError('Recommendation must be 1000 words or less', 400);
      }

      // Submit recommendation
      const submittedRecommendation = await this.recommenderModel.submitRecommendation(recommendationId);

      // Trigger notification for recommendation submission
      try {
        const application = await this.applicationModel.findById(recommendation.application_id);
        const studentQuery = `
          SELECT u.email, u.first_name || ' ' || u.last_name as full_name, u.id as user_id
          FROM users u
          WHERE u.id = $1
        `;
        const studentResult = await this.recommenderModel.db.query(studentQuery, [application.student_id]);
        
        if (studentResult.rows.length > 0) {
          const student = studentResult.rows[0];
          
          const notificationService = getNotificationService();
          await notificationService.handleNotification({
            event: 'recommendation_submitted',
            userId: student.user_id,
            data: {
              studentEmail: student.email,
              studentName: student.full_name,
              recommenderName: `${recommender.title} ${recommender.first_name} ${recommender.last_name}`,
              universities: application.universities.map(u => u.name),
              submittedAt: new Date().toISOString(),
              studentId: student.user_id
            }
          });
        }
      } catch (error) {
        console.error('Failed to send recommendation submission notification:', error);
        // Don't fail the submission if notification fails
      }

      // TODO: Integrate with university submission system
      // This would involve sending the recommendation to all selected universities
      // For now, we'll just mark it as submitted

      res.json({
        success: true,
        data: submittedRecommendation,
        message: 'Recommendation submitted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 409 ? 'RECOMMENDATION_ALREADY_SUBMITTED' : 
                  error.statusCode === 400 ? 'VALIDATION_ERROR' : 'RECOMMENDATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Submit recommendation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to submit recommendation'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Send welcome email to newly confirmed recommender
   */
  private async sendWelcomeEmail(recommender: any): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to StellarRec™</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .welcome-box { background: #e3f2fd; border-left: 4px solid #1976d2; padding: 15px; margin: 15px 0; }
          .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to StellarRec™!</h1>
            <p>Your recommender account is now active</p>
          </div>
          <div class="content">
            <div class="welcome-box">
              <p><strong>Congratulations!</strong> Your recommender profile has been successfully created.</p>
              <p>You can now log in to write recommendations and manage your applications.</p>
            </div>

            <h3>Your Profile Information:</h3>
            <div class="details">
              <p><strong>Name:</strong> ${recommender.title}</p>
              <p><strong>Organization:</strong> ${recommender.organization}</p>
              <p><strong>Email:</strong> ${recommender.professional_email}</p>
              <p><strong>Relationship Duration:</strong> ${recommender.relationship_duration}</p>
              <p><strong>Relationship Type:</strong> ${recommender.relationship_type}</p>
            </div>

            <h3>Next Steps:</h3>
            <ol>
              <li>Log in to your StellarRec™ account using your email and password</li>
              <li>Review the student application details</li>
              <li>Write your recommendation using our AI-powered writing assistant</li>
              <li>Submit your recommendation to all selected universities</li>
            </ol>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/recommender/login" class="button">
                Log In to StellarRec™
              </a>
            </div>

            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 StellarRec™. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailService.sendEmail({
      to: recommender.professional_email,
      subject: 'Welcome to StellarRec™ - Your Account is Ready!',
      html
    });
  }

  /**
   * Send discrepancy report email
   */
  private async sendDiscrepancyReport(data: {
    recommender: any;
    application: any;
    student: any;
    discrepancy_type: string;
    description: string;
    correct_information?: string;
  }): Promise<void> {
    const { recommender, application, student, discrepancy_type, description, correct_information } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Application Details Discrepancy Report - StellarRec™</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .info-box { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 15px 0; }
          .details { background: white; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Details Discrepancy</h1>
            <p>StellarRec™ - Discrepancy Report</p>
          </div>
          <div class="content">
            <div class="info-box">
              <p><strong>A recommender has reported a discrepancy in your application details.</strong></p>
              <p>Please review and correct the information as needed.</p>
            </div>

            <h3>Discrepancy Details:</h3>
            <div class="details">
              <p><strong>Type:</strong> ${discrepancy_type}</p>
              <p><strong>Description:</strong> ${description}</p>
              ${correct_information ? `<p><strong>Suggested Correction:</strong> ${correct_information}</p>` : ''}
            </div>

            <h3>Application Information:</h3>
            <div class="details">
              <p><strong>Student:</strong> ${application.legal_name}</p>
              <p><strong>Program:</strong> ${application.program_type}</p>
              <p><strong>Term:</strong> ${application.application_term}</p>
              <p><strong>Universities:</strong> ${application.universities.map((u: any) => u.name).join(', ')}</p>
            </div>

            <h3>Reported by:</h3>
            <div class="details">
              <p><strong>Recommender:</strong> ${recommender.title} at ${recommender.organization}</p>
              <p><strong>Email:</strong> ${recommender.professional_email}</p>
            </div>

            <p>Please log in to your StellarRec™ account to review and update your application details.</p>
          </div>
          <div class="footer">
            <p>© 2024 StellarRec™. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to student
    await emailService.sendEmail({
      to: student.email,
      subject: 'Application Details Discrepancy Report - StellarRec™',
      html
    });

    // Send to admin (if admin email is configured)
    if (process.env.ADMIN_EMAIL) {
      await emailService.sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Discrepancy Report - ${student.first_name} ${student.last_name}`,
        html
      });
    }
  }

  /**
   * Analyze content quality for recommendation
   */
  analyzeContentQuality = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { content, applicationId } = req.body;

      if (!content || !applicationId) {
        throw new AppError('Content and application ID are required', 400);
      }

      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      // Verify recommender has access to this application
      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      if (!applicationIds.includes(applicationId)) {
        throw new AppError('Application not found or access denied', 404);
      }

      // Get application details for context
      const application = await this.applicationModel.findById(applicationId);
      const student = await this.userModel.findById(application.student_id);

      const applicationData = {
        applicantName: `${student!.first_name} ${student!.last_name}`,
        programType: application.program_type,
        relationshipType: recommender.relationship_type,
        relationshipDuration: recommender.relationship_duration
      };

      const qualityScore = await contentQualityService.analyzeQuality(content, applicationData);

      res.json({
        success: true,
        data: qualityScore,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'QUALITY_ANALYSIS_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Content quality analysis error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to analyze content quality'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Validate content for university-agnostic language
   */
  validateContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { content } = req.body;

      if (!content) {
        throw new AppError('Content is required', 400);
      }

      const validation = await contentQualityService.validateContent(content);

      res.json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'CONTENT_VALIDATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Content validation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to validate content'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Auto-save recommendation with quality analysis
   */
  autoSaveRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const { content, applicationId } = req.body;

      if (!content || !applicationId) {
        throw new AppError('Content and application ID are required', 400);
      }

      const recommender = await this.recommenderModel.findByUserId(req.user.userId);
      if (!recommender) {
        throw new AppError('Recommender profile not found', 404);
      }

      // Verify recommender has access to this application
      const applicationIds = await this.recommenderModel.getApplicationsForRecommender(recommender.id);
      if (!applicationIds.includes(applicationId)) {
        throw new AppError('Application not found or access denied', 404);
      }

      // Check if recommendation exists
      let recommendation = await this.recommenderModel.getRecommendationByApplicationId(applicationId);
      
      const wordCount = content.trim().split(/\s+/).filter((word: string) => word.length > 0).length;

      if (recommendation) {
        // Update existing recommendation
        if (recommendation.status === 'submitted' || recommendation.status === 'delivered') {
          throw new AppError('Cannot update submitted recommendation', 409);
        }
        
        recommendation = await this.recommenderModel.updateRecommendation(recommendation.id, {
          content: content.trim(),
          word_count: wordCount
        });
      } else {
        // Create new recommendation
        recommendation = await this.recommenderModel.createRecommendation({
          application_id: applicationId,
          recommender_id: recommender.id,
          content: content.trim(),
          word_count: wordCount,
          ai_assistance_used: false
        });
      }

      // Get application data for quality analysis
      const application = await this.applicationModel.findById(applicationId);
      const student = await this.userModel.findById(application.student_id);

      const applicationData = {
        applicantName: `${student!.first_name} ${student!.last_name}`,
        programType: application.program_type,
        relationshipType: recommender.relationship_type,
        relationshipDuration: recommender.relationship_duration
      };

      // Perform quality analysis
      const qualityAnalysis = await contentQualityService.autoSaveWithQuality(content, applicationData);

      res.json({
        success: true,
        data: {
          recommendation,
          ...qualityAnalysis
        },
        message: 'Recommendation auto-saved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.statusCode === 409 ? 'RECOMMENDATION_SUBMITTED' : 'AUTO_SAVE_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Auto-save recommendation error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to auto-save recommendation'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };
}