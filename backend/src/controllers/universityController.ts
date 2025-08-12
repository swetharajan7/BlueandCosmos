import { Request, Response } from 'express';
import { UniversityModel } from '../models/University';
import { db } from '../config/database';
import { AppError } from '../utils/AppError';

const universityModel = new UniversityModel(db);

export const universityController = {
  // Get all universities
  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const { search, program_type } = req.query;
      let universities;

      if (search && typeof search === 'string') {
        universities = await universityModel.search(search);
      } else if (program_type && typeof program_type === 'string') {
        universities = await universityModel.getByProgramType(program_type);
      } else {
        universities = await universityModel.findAll();
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
  }
};