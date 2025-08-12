import { Router } from 'express';
import { applicationController } from '../controllers/applicationController';
import { authenticate, authorize } from '../middleware/auth';
import { validateApplication, validateApplicationUpdate } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/applications
 * @desc    Create a new application
 * @access  Private (Student)
 */
router.post('/', 
  authenticate, 
  authorize('student'), 
  validateApplication, 
  applicationController.create
);

/**
 * @route   GET /api/applications
 * @desc    Get all applications for current student
 * @access  Private (Student)
 */
router.get('/', 
  authenticate, 
  authorize('student'), 
  applicationController.getMyApplications
);

/**
 * @route   GET /api/applications/:id
 * @desc    Get specific application by ID
 * @access  Private (Student - own applications only)
 */
router.get('/:id', 
  authenticate, 
  authorize('student'), 
  applicationController.getById
);

/**
 * @route   PUT /api/applications/:id
 * @desc    Update application
 * @access  Private (Student - own applications only)
 */
router.put('/:id', 
  authenticate, 
  authorize('student'), 
  validateApplicationUpdate, 
  applicationController.update
);

/**
 * @route   DELETE /api/applications/:id
 * @desc    Delete application
 * @access  Private (Student - own applications only)
 */
router.delete('/:id', 
  authenticate, 
  authorize('student'), 
  applicationController.delete
);

export default router;