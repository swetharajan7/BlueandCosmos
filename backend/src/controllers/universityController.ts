import { Request, Response } from 'express';
import { UniversityModel } from '../models/University';
import { db } from '../config/database';
import { AppError } from '../utils/AppError';

const universityModel = new UniversityModel(db);

export const universityController = {
  // Get all universities with advanced filtering
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const { search, program_type, submission_format, category } = req.query;
      let universities;

      if (category === 'grouped') {
        universities = await universityModel.getUniversityCategories();
      } else {
        const filters: any = {};
        
        if (program_type && typeof program_type === 'string') {
          filters.programType = program_type;
        }
        
        if (submission_format && typeof submission_format === 'string') {
          filters.submissionFormat = submission_format;
        }

        if (category && typeof category === 'string' && category !== 'all') {
          filters.category = category;
        }

        if (search && typeof search === 'string') {
          universities = await universityModel.search(search, filters);
        } else {
          universities = await universityModel.search('', filters);
        }
      }

      return res.json({
        success: true,
        data: universities,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching universities:', error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch universities'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Get university by ID
  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const university = await universityModel.findById(id);

      return res.json({
        success: true,
        data: university,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching university:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'UNIVERSITY_ERROR',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch university'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Validate university IDs
  async validateIds(req: Request, res: Response): Promise<Response> {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'IDs must be an array'
          },
          timestamp: new Date().toISOString()
        });
      }

      const validation = await universityModel.validateIds(ids);

      return res.json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error validating university IDs:', error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate university IDs'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Validate program availability for universities
  async validateProgramAvailability(req: Request, res: Response): Promise<Response> {
    try {
      const { university_ids, program_type } = req.body;

      if (!Array.isArray(university_ids)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'University IDs must be an array'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (!program_type || typeof program_type !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Program type is required'
          },
          timestamp: new Date().toISOString()
        });
      }

      const validation = await universityModel.validateProgramAvailability(university_ids, program_type);

      return res.json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error validating program availability:', error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to validate program availability'
        },
        timestamp: new Date().toISOString()
      });
    }
  },

  // Get universities by category
  async getCategories(req: Request, res: Response): Promise<Response> {
    try {
      const categories = await universityModel.getUniversityCategories();

      return res.json({
        success: true,
        data: categories,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching university categories:', error);
      
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch university categories'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
};