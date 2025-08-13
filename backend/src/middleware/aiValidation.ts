import { body, query } from 'express-validator';

export const validateOutlineRequest = [
  body('applicantName')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Applicant name must be between 2 and 100 characters'),
  
  body('programType')
    .isIn(['undergraduate', 'graduate', 'mba', 'llm', 'medical', 'phd'])
    .withMessage('Invalid program type'),
  
  body('universities')
    .isArray({ min: 1, max: 20 })
    .withMessage('Must select between 1 and 20 universities'),
  
  body('universities.*')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each university name must be between 2 and 100 characters'),
  
  body('relationshipType')
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage('Relationship type must be between 2 and 50 characters'),
  
  body('relationshipDuration')
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage('Relationship duration must be between 2 and 50 characters'),
  
  body('recommenderTitle')
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Recommender title must be between 2 and 100 characters')
];

export const validateExamplesRequest = [
  body('programType')
    .optional()
    .isIn(['undergraduate', 'graduate', 'mba', 'llm', 'medical', 'phd'])
    .withMessage('Invalid program type'),
  
  body('relationshipType')
    .optional()
    .isString()
    .isLength({ min: 2, max: 50 })
    .withMessage('Relationship type must be between 2 and 50 characters'),
  
  body('recommenderTitle')
    .optional()
    .isString()
    .isLength({ min: 2, max: 100 })
    .withMessage('Recommender title must be between 2 and 100 characters')
];

export const validateImprovementRequest = [
  body('content')
    .isString()
    .isLength({ min: 50, max: 2000 })
    .withMessage('Content must be between 50 and 2000 characters'),
  
  body('focusArea')
    .optional()
    .isIn(['clarity', 'specificity', 'structure', 'tone'])
    .withMessage('Invalid focus area')
];

export const validateQualityAnalysisRequest = [
  body('content')
    .isString()
    .isLength({ min: 50, max: 2000 })
    .withMessage('Content must be between 50 and 2000 characters for analysis')
];

export const validateUsageStatsRequest = [
  query('operation')
    .optional()
    .isIn(['outline', 'examples', 'improvement', 'analysis'])
    .withMessage('Invalid operation type'),
  
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)')
];