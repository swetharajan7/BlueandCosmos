import { Router } from 'express';
import { universityController } from '../controllers/universityController';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';

const router = Router();

/**
 * @route   GET /api/universities
 * @desc    Get all universities (with optional search and program type filter)
 * @access  Private
 */
router.get('/', 
  authenticate, 
  universityController.getAll
);

/**
 * @route   GET /api/universities/categories
 * @desc    Get universities grouped by categories
 * @access  Private
 */
router.get('/categories', 
  authenticate, 
  universityController.getCategories
);

/**
 * @route   GET /api/universities/:id
 * @desc    Get university by ID
 * @access  Private
 */
router.get('/:id', 
  authenticate, 
  universityController.getById
);

/**
 * @route   POST /api/universities/validate
 * @desc    Validate university IDs
 * @access  Private
 */
router.post('/validate', 
  authenticate,
  [
    body('ids')
      .isArray()
      .withMessage('IDs must be an array'),
    body('ids.*')
      .isUUID()
      .withMessage('Each ID must be a valid UUID')
  ],
  universityController.validateIds
);

/**
 * @route   POST /api/universities/validate-program
 * @desc    Validate program availability for universities
 * @access  Private
 */
router.post('/validate-program', 
  authenticate,
  [
    body('university_ids')
      .isArray()
      .withMessage('University IDs must be an array'),
    body('university_ids.*')
      .isUUID()
      .withMessage('Each university ID must be a valid UUID'),
    body('program_type')
      .isIn(['undergraduate', 'graduate', 'mba', 'llm', 'medical', 'phd'])
      .withMessage('Invalid program type')
  ],
  universityController.validateProgramAvailability
);

export default router;