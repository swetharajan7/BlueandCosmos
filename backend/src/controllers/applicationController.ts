import { Request, Response } from 'express';
import { ApplicationModel } from '../models/Application';
import { UniversityModel } from '../models/University';
import { SubmissionModel } from '../models/Submission';
import { db } from '../config/database';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types';
import { getNotificationService } from '../services/notificationService';

const applicationModel = new ApplicationModel(db);
const universityModel = new UniversityModel(db);
const submissionModel = new SubmissionModel(db);

export const applicationController = {
  // Create new application
  async create(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { legal_name, program_type, application_term, university_ids, status } = req.body;
      const student_id = req.user!.userId;

      // Validate university IDs
      if (university_ids && university_ids.length > 0) {
        const validation = await universityModel.validateIds(university_ids);
        if (validation.invalid.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_UNIVERSITIES',
              message: 'Some university IDs are invalid',
              details: { invalid_ids: validation.invalid }
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      const application = await applicationModel.create({
        student_id,
        legal_name,
        program_type,
        application_term,
        university_ids: university_ids || [],
        status
      });

      return res.status(201).json({
        success: true,
        data: application,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating application:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'APPLICATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create application'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Get all applications for current student
  async getMyApplications(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const student_id = req.user!.userId;
      const applications = await applicationModel.findByStudentId(student_id);

      return res.json({
        success: true,
        data: applications,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch applications'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Get specific application by ID
  async getById(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const student_id = req.user!.userId;

      // Verify ownership
      const isOwner = await applicationModel.validateOwnership(id, student_id);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this application'
          },
          timestamp: new Date().toISOString()
        });
      }

      const application = await applicationModel.findById(id);

      return res.json({
        success: true,
        data: application,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching application:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'APPLICATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch application'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Update application
  async update(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { legal_name, program_type, application_term, university_ids, status } = req.body;
      const student_id = req.user!.userId;

      // Get current application for status comparison
      const currentApplication = await applicationModel.findById(id);
      if (!currentApplication) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Application not found'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Verify ownership
      const isOwner = await applicationModel.validateOwnership(id, student_id);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this application'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Validate university IDs if provided
      if (university_ids && university_ids.length > 0) {
        const validation = await universityModel.validateIds(university_ids);
        if (validation.invalid.length > 0) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_UNIVERSITIES',
              message: 'Some university IDs are invalid',
              details: { invalid_ids: validation.invalid }
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      const application = await applicationModel.update(id, {
        legal_name,
        program_type,
        application_term,
        university_ids,
        status
      });

      // Trigger notification if status changed
      if (status && status !== currentApplication.status) {
        try {
          const notificationService = getNotificationService();
          await notificationService.handleNotification({
            event: 'application_status_changed',
            userId: student_id,
            data: {
              applicationId: id,
              oldStatus: currentApplication.status,
              newStatus: status,
              studentId: student_id
            }
          });
        } catch (error) {
          console.error('Failed to send status change notification:', error);
          // Don't fail the entire update if notification fails
        }
      }

      // Update Google Doc with new application data
      try {
        await applicationModel.updateGoogleDoc(id);
      } catch (error) {
        console.error('Failed to update Google Doc:', error);
        // Don't fail the entire update if Google Docs update fails
      }

      return res.json({
        success: true,
        data: application,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating application:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'APPLICATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update application'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Delete application
  async delete(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const student_id = req.user!.userId;

      // Verify ownership
      const isOwner = await applicationModel.validateOwnership(id, student_id);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this application'
          },
          timestamp: new Date().toISOString()
        });
      }

      await applicationModel.delete(id);

      return res.json({
        success: true,
        data: { message: 'Application deleted successfully' },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting application:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'APPLICATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete application'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Get detailed application status with submission tracking
  async getApplicationStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const student_id = req.user!.userId;

      // Verify ownership
      const isOwner = await applicationModel.validateOwnership(id, student_id);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied to this application'
          },
          timestamp: new Date().toISOString()
        });
      }

      // Get application details
      const application = await applicationModel.findById(id);

      // Get recommendations for this application
      const recommendationsQuery = `
        SELECT 
          r.*,
          u.first_name || ' ' || u.last_name as recommender_name,
          rec.title as recommender_title,
          rec.organization as recommender_organization
        FROM recommendations r
        JOIN recommenders rec ON r.recommender_id = rec.id
        JOIN users u ON rec.user_id = u.id
        WHERE r.application_id = $1
        ORDER BY r.created_at DESC
      `;
      
      const recommendationsResult = await db.query(recommendationsQuery, [id]);
      const recommendations = recommendationsResult.rows;

      // Get submission status for each recommendation
      const recommendationsWithStatus = await Promise.all(
        recommendations.map(async (recommendation) => {
          const submissions = await submissionModel.findByRecommendationId(recommendation.id);
          
          // Create submission status for each university
          const universityStatuses = application.universities.map(university => {
            const submission = submissions.find(s => s.university_id === university.id);
            
            return {
              university: {
                id: university.id,
                name: university.name,
                code: university.code
              },
              status: submission?.status || 'not_started',
              submitted_at: submission?.submitted_at || null,
              confirmed_at: submission?.confirmed_at || null,
              error_message: submission?.error_message || null,
              retry_count: submission?.retry_count || 0,
              external_reference: submission?.external_reference || null
            };
          });

          return {
            ...recommendation,
            university_statuses: universityStatuses,
            overall_status: this.calculateOverallStatus(universityStatuses)
          };
        })
      );

      // Calculate overall application status
      const overallStatus = this.calculateApplicationOverallStatus(recommendationsWithStatus);

      // Get timeline events
      const timeline = await this.getApplicationTimeline(id);

      return res.json({
        success: true,
        data: {
          application,
          recommendations: recommendationsWithStatus,
          overall_status: overallStatus,
          timeline,
          summary: {
            total_universities: application.universities.length,
            total_recommendations: recommendations.length,
            completed_submissions: recommendationsWithStatus.reduce((acc, rec) => 
              acc + rec.university_statuses.filter((s: any) => s.status === 'confirmed').length, 0
            ),
            pending_submissions: recommendationsWithStatus.reduce((acc, rec) => 
              acc + rec.university_statuses.filter((s: any) => s.status === 'pending' || s.status === 'submitted').length, 0
            ),
            failed_submissions: recommendationsWithStatus.reduce((acc, rec) => 
              acc + rec.university_statuses.filter((s: any) => s.status === 'failed').length, 0
            )
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching application status:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'APPLICATION_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch application status'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Helper method to calculate overall status for a recommendation
  calculateOverallStatus(universityStatuses: any[]): string {
    if (universityStatuses.length === 0) return 'not_started';
    
    const statusCounts = universityStatuses.reduce((acc, status) => {
      acc[status.status] = (acc[status.status] || 0) + 1;
      return acc;
    }, {});

    if (statusCounts.confirmed === universityStatuses.length) return 'completed';
    if (statusCounts.failed > 0) return 'partial_failure';
    if (statusCounts.submitted > 0 || statusCounts.pending > 0) return 'in_progress';
    return 'not_started';
  },

  // Helper method to calculate overall application status
  calculateApplicationOverallStatus(recommendations: any[]): string {
    if (recommendations.length === 0) return 'draft';
    
    const overallStatuses = recommendations.map(r => r.overall_status);
    
    if (overallStatuses.every(s => s === 'completed')) return 'completed';
    if (overallStatuses.some(s => s === 'partial_failure')) return 'partial_failure';
    if (overallStatuses.some(s => s === 'in_progress')) return 'in_progress';
    if (overallStatuses.some(s => s === 'not_started')) return 'pending';
    return 'draft';
  },

  // Helper method to get application timeline
  async getApplicationTimeline(applicationId: string): Promise<any[]> {
    const timelineQuery = `
      SELECT 
        'application_created' as event_type,
        a.created_at as timestamp,
        'Application created' as title,
        'Application was created and saved as draft' as description,
        null as metadata
      FROM applications a
      WHERE a.id = $1
      
      UNION ALL
      
      SELECT 
        'recommendation_submitted' as event_type,
        r.submitted_at as timestamp,
        'Recommendation submitted' as title,
        'Recommendation by ' || u.first_name || ' ' || u.last_name || ' was submitted' as description,
        json_build_object('recommender_name', u.first_name || ' ' || u.last_name) as metadata
      FROM recommendations r
      JOIN recommenders rec ON r.recommender_id = rec.id
      JOIN users u ON rec.user_id = u.id
      WHERE r.application_id = $1 AND r.submitted_at IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'submission_completed' as event_type,
        s.confirmed_at as timestamp,
        'Submission confirmed' as title,
        'Recommendation submitted to ' || uni.name as description,
        json_build_object('university_name', uni.name, 'university_code', uni.code) as metadata
      FROM submissions s
      JOIN recommendations r ON s.recommendation_id = r.id
      JOIN universities uni ON s.university_id = uni.id
      WHERE r.application_id = $1 AND s.confirmed_at IS NOT NULL
      
      ORDER BY timestamp DESC
    `;

    const result = await db.query(timelineQuery, [applicationId]);
    return result.rows;
  }
};