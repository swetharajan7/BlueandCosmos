import { Router } from 'express';
import { GoogleDocsController } from '../controllers/googleDocsController';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route GET /api/google-docs/:applicationId/url
 * @desc Get Google Doc URL for an application
 * @access Private (Student who owns the application)
 */
router.get('/:applicationId/url', GoogleDocsController.getDocumentUrl);

/**
 * @route PUT /api/google-docs/:applicationId/update
 * @desc Update Google Doc with current application data
 * @access Private (Student who owns the application)
 */
router.put('/:applicationId/update', GoogleDocsController.updateDocument);

/**
 * @route POST /api/google-docs/:applicationId/permissions
 * @desc Set document permissions
 * @access Private (Student who owns the application)
 */
router.post(
  '/:applicationId/permissions',
  [
    body('permissions')
      .isArray()
      .withMessage('Permissions must be an array'),
    body('permissions.*.type')
      .isIn(['user', 'group', 'domain', 'anyone'])
      .withMessage('Invalid permission type'),
    body('permissions.*.role')
      .isIn(['owner', 'writer', 'commenter', 'reader'])
      .withMessage('Invalid permission role'),
    body('permissions.*.emailAddress')
      .optional()
      .isEmail()
      .withMessage('Invalid email address')
  ],
  validateRequest,
  GoogleDocsController.setPermissions
);

/**
 * @route POST /api/google-docs/:applicationId/recommendation
 * @desc Add recommendation content to Google Doc
 * @access Private (Authenticated users)
 */
router.post(
  '/:applicationId/recommendation',
  [
    body('universityName')
      .notEmpty()
      .withMessage('University name is required'),
    body('recommendationContent')
      .notEmpty()
      .withMessage('Recommendation content is required')
      .isLength({ max: 10000 })
      .withMessage('Recommendation content must be less than 10,000 characters'),
    body('recommenderName')
      .notEmpty()
      .withMessage('Recommender name is required')
  ],
  validateRequest,
  GoogleDocsController.addRecommendation
);

/**
 * @route GET /api/google-docs/:applicationId/metadata
 * @desc Get document metadata
 * @access Private (Student who owns the application)
 */
router.get('/:applicationId/metadata', GoogleDocsController.getDocumentMetadata);

/**
 * @route GET /api/google-docs/:applicationId/validate
 * @desc Validate document access
 * @access Private (Student who owns the application)
 */
router.get('/:applicationId/validate', GoogleDocsController.validateAccess);

export default router;