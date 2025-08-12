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
 * Validation rules for sending invitations
 */
export const validateInvitation = [
  body('recommender_email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  
  body('custom_message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Custom message cannot exceed 1000 characters')
];

/**
 * Validation rules for invitation confirmation
 */
export const validateInvitationConfirmation = [
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Professional title is required and must be less than 255 characters'),
  
  body('organization')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Organization is required and must be less than 255 characters'),
  
  body('relationship_duration')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Relationship duration is required and must be less than 100 characters'),
  
  body('relationship_type')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Relationship type is required and must be less than 100 characters'),
  
  body('mobile_phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Invalid mobile phone number'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

/**
 * Validation rules for recommender login
 */
export const validateRecommenderLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

/**
 * Validation rules for recommender profile update
 */
export const validateRecommenderProfileUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('Title must be between 1 and 150 characters')
    .matches(/^[a-zA-Z0-9\s\-\.\,\/\&\(\)]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('organization')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Organization must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-\.\,\/\&\(\)]+$/)
    .withMessage('Organization contains invalid characters'),
  
  body('relationship_duration')
    .optional()
    .trim()
    .isIn([
      'Less than 6 months', 
      '6 months - 1 year', 
      '1 - 2 years', 
      '2 - 3 years', 
      '3 - 5 years', 
      'More than 5 years'
    ])
    .withMessage('Invalid relationship duration'),
  
  body('relationship_type')
    .optional()
    .trim()
    .isIn([
      'Academic Advisor', 
      'Professor/Instructor', 
      'Research Supervisor', 
      'Direct Manager', 
      'Colleague', 
      'Mentor',
      'Department Head',
      'Research Collaborator',
      'Thesis Committee Member',
      'Clinical Supervisor',
      'Other'
    ])
    .withMessage('Invalid relationship type'),
  
  body('mobile_phone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true; // Optional field
      
      // Remove all non-digit characters for validation
      const digitsOnly = value.replace(/\D/g, '');
      
      // Check if it's a valid length (10-15 digits)
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        throw new Error('Phone number must contain 10-15 digits');
      }
      
      // Check format - allow various international formats
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)\.]{8,18}$/;
      if (!phoneRegex.test(value)) {
        throw new Error('Invalid phone number format. Use format like +1 (555) 123-4567 or +44 20 1234 5678');
      }
      
      return true;
    })
];

/**
 * Validation rules for recommender invitation confirmation
 */
export const validateRecommenderInvitationConfirmation = [
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-\'\.]+$/)
    .withMessage('First name contains invalid characters'),
  
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-\'\.]+$/)
    .withMessage('Last name contains invalid characters'),
  
  body('title')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('Professional title is required and must be less than 150 characters')
    .matches(/^[a-zA-Z0-9\s\-\.\,\/\&\(\)]+$/)
    .withMessage('Title contains invalid characters'),
  
  body('organization')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Organization is required and must be less than 200 characters')
    .matches(/^[a-zA-Z0-9\s\-\.\,\/\&\(\)]+$/)
    .withMessage('Organization contains invalid characters'),
  
  body('relationship_duration')
    .trim()
    .isIn([
      'Less than 6 months', 
      '6 months - 1 year', 
      '1 - 2 years', 
      '2 - 3 years', 
      '3 - 5 years', 
      'More than 5 years'
    ])
    .withMessage('Please select a valid relationship duration'),
  
  body('relationship_type')
    .trim()
    .isIn([
      'Academic Advisor', 
      'Professor/Instructor', 
      'Research Supervisor', 
      'Direct Manager', 
      'Colleague', 
      'Mentor',
      'Department Head',
      'Research Collaborator',
      'Thesis Committee Member',
      'Clinical Supervisor',
      'Other'
    ])
    .withMessage('Please select a valid relationship type'),
  
  body('mobile_phone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true; // Optional field
      
      // Remove all non-digit characters for validation
      const digitsOnly = value.replace(/\D/g, '');
      
      // Check if it's a valid length (10-15 digits)
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        throw new Error('Phone number must contain 10-15 digits');
      }
      
      // Check format - allow various international formats
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)\.]{8,18}$/;
      if (!phoneRegex.test(value)) {
        throw new Error('Invalid phone number format. Use format like +1 (555) 123-4567 or +44 20 1234 5678');
      }
      
      return true;
    }),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

/**
 * Validation rules for discrepancy report
 */
export const validateDiscrepancyReport = [
  body('discrepancy_type')
    .trim()
    .isIn(['Student Name', 'Universities', 'Program Type', 'Application Term', 'Contact Information', 'Other'])
    .withMessage('Invalid discrepancy type'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('correct_information')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Correct information must be less than 500 characters')
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