import { Request, Response } from 'express';
import { ApplicationModel } from '../models/Application';
import { UniversityModel } from '../models/University';
import { db } from '../config/database';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest } from '../types';

const applicationModel = new ApplicationModel(db);
const universityModel = new UniversityModel(db);

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
  }
};