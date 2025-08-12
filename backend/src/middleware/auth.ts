import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { UserModel } from '../models/User';
import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { JwtPayload } from '../types';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization);
    const decoded = authService.verifyAccessToken(token);
    
    // Verify user still exists and is active
    const userModel = new UserModel(pool);
    const user = await userModel.findById(decoded.userId);
    
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: error.message
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Authentication failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
};

/**
 * Authorization middleware - checks user roles
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = authService.extractTokenFromHeader(authHeader);
    const decoded = authService.verifyAccessToken(token);
    
    // Verify user still exists
    const userModel = new UserModel(pool);
    const user = await userModel.findById(decoded.userId);
    
    if (user) {
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
};

/**
 * Middleware to check if user's email is verified
 */
export const requireEmailVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const userModel = new UserModel(pool);
    const user = await userModel.findById(req.user.userId);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!user.is_verified) {
      res.status(403).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email verification required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'VERIFICATION_CHECK_FAILED',
        message: 'Failed to check email verification status'
      },
      timestamp: new Date().toISOString()
    });
  }
};