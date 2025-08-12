import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation rules for user registration
 */
export const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('role')
    .isIn(['student', 'recommender'])
    .withMessage('Role must be either student or recommender')
];

/**
 * Validation rules for user login
 */
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for password reset request
 */
export const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

/**
 * Validation rules for password reset
 */
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

/**
 * Validation rules for email verification
 */
export const validateEmailVerification = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
];

/**
 * Validation rules for refresh token
 */
export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
];
/**

 * Validation rules for application creation
 */
export const validateApplication = [
  body('legal_name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Legal name is required and must be less than 255 characters'),
  
  body('program_type')
    .isIn(['undergraduate', 'graduate', 'mba', 'llm', 'medical', 'phd'])
    .withMessage('Program type must be one of: undergraduate, graduate, mba, llm, medical, phd'),
  
  body('application_term')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Application term is required and must be less than 50 characters'),
  
  body('university_ids')
    .optional()
    .isArray()
    .withMessage('University IDs must be an array')
    .custom((value) => {
      if (value && value.length > 20) {
        throw new Error('Cannot select more than 20 universities');
      }
      return true;
    }),
  
  body('university_ids.*')
    .optional()
    .isUUID()
    .withMessage('Each university ID must be a valid UUID'),
  
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'submitted', 'completed'])
    .withMessage('Status must be one of: draft, pending, submitted, completed')
];

/**
 * Validation rules for application update (all fields optional)
 */
export const validateApplicationUpdate = [
  body('legal_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Legal name must be less than 255 characters'),
  
  body('program_type')
    .optional()
    .isIn(['undergraduate', 'graduate', 'mba', 'llm', 'medical', 'phd'])
    .withMessage('Program type must be one of: undergraduate, graduate, mba, llm, medical, phd'),
  
  body('application_term')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Application term must be less than 50 characters'),
  
  body('university_ids')
    .optional()
    .isArray()
    .withMessage('University IDs must be an array')
    .custom((value) => {
      if (value && value.length > 20) {
        throw new Error('Cannot select more than 20 universities');
      }
      return true;
    }),
  
  body('university_ids.*')
    .optional()
    .isUUID()
    .withMessage('Each university ID must be a valid UUID'),
  
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'submitted', 'completed'])
    .withMessage('Status must be one of: draft, pending, submitted, completed')
];

/**
 * Middleware to handle validation results
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array()
      },
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};