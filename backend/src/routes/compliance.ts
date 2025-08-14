import express from 'express';
import { body, param, query } from 'express-validator';
import { ComplianceController } from '../controllers/complianceController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/security';
import { db } from '../config/database';

const router = express.Router();
const complianceController = new ComplianceController(db);

// Validation rules
const consentValidation = [
  body('consent_type')
    .isIn(['data_processing', 'marketing', 'analytics', 'third_party_sharing', 'ferpa_disclosure'])
    .withMessage('Invalid consent type'),
  body('consent_given')
    .isBoolean()
    .withMessage('Consent given must be a boolean'),
  body('legal_basis')
    .isIn(['consent', 'legitimate_interest', 'contract', 'legal_obligation', 'vital_interests', 'public_task'])
    .withMessage('Invalid legal basis'),
  body('purpose')
    .isString()
    .isLength({ min: 10, max: 500 })
    .withMessage('Purpose must be between 10 and 500 characters'),
  body('data_categories')
    .isArray()
    .withMessage('Data categories must be an array'),
  body('retention_period')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Retention period is required')
];

const deletionRequestValidation = [
  body('request_type')
    .isIn(['full_account', 'specific_data', 'anonymization'])
    .withMessage('Invalid request type'),
  body('data_categories')
    .isArray()
    .withMessage('Data categories must be an array'),
  body('reason')
    .isString()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Reason must be between 10 and 1000 characters')
];

const deletionVerificationValidation = [
  body('request_id')
    .isUUID()
    .withMessage('Invalid request ID'),
  body('verification_token')
    .isString()
    .isLength({ min: 32 })
    .withMessage('Invalid verification token'),
  body('verification_method')
    .isIn(['email', 'identity_document', 'security_questions'])
    .withMessage('Invalid verification method'),
  body('verification_data')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Verification data is required')
];

const reportGenerationValidation = [
  body('report_type')
    .isIn(['ferpa', 'gdpr', 'data_inventory', 'consent_audit', 'deletion_audit'])
    .withMessage('Invalid report type'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

const auditLogValidation = [
  query('user_id')
    .optional()
    .isUUID()
    .withMessage('Invalid user ID'),
  query('action')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Invalid action'),
  query('resource_type')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid resource type'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be non-negative')
];

// User consent management routes
router.post('/consent',
  authenticateToken,
  consentValidation,
  handleValidationErrors,
  complianceController.recordConsent
);

router.post('/consent/withdraw',
  authenticateToken,
  body('consent_type').isIn(['data_processing', 'marketing', 'analytics', 'third_party_sharing', 'ferpa_disclosure']),
  handleValidationErrors,
  complianceController.withdrawConsent
);

router.get('/consent',
  authenticateToken,
  complianceController.getUserConsents
);

// Data deletion (Right to be Forgotten) routes
router.post('/deletion-request',
  authenticateToken,
  deletionRequestValidation,
  handleValidationErrors,
  complianceController.submitDeletionRequest
);

router.post('/deletion-request/verify',
  deletionVerificationValidation,
  handleValidationErrors,
  complianceController.verifyDeletionRequest
);

router.get('/deletion-requests',
  authenticateToken,
  complianceController.getUserDeletionRequests
);

// Data export (GDPR Article 20 - Data Portability)
router.get('/export-data',
  authenticateToken,
  complianceController.exportUserData
);

// Data retention reporting
router.get('/retention-report',
  authenticateToken,
  requireRole(['admin']),
  complianceController.getDataRetentionReport
);

// Admin-only compliance management routes
router.post('/reports/generate',
  authenticateToken,
  requireRole(['admin']),
  reportGenerationValidation,
  handleValidationErrors,
  complianceController.generateComplianceReport
);

router.get('/audit-logs',
  authenticateToken,
  requireRole(['admin']),
  auditLogValidation,
  handleValidationErrors,
  complianceController.getAuditLogs
);

router.post('/deletion-request/:request_id/process',
  authenticateToken,
  requireRole(['admin']),
  param('request_id').isUUID().withMessage('Invalid request ID'),
  handleValidationErrors,
  complianceController.processDeletionRequest
);

router.post('/cleanup/automatic',
  authenticateToken,
  requireRole(['admin']),
  complianceController.performAutomaticCleanup
);

router.get('/dashboard',
  authenticateToken,
  requireRole(['admin']),
  complianceController.getComplianceDashboard
);

// Health check for compliance services
router.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await db.query('SELECT 1');
    
    // Check if compliance tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_consents', 'data_retention_policies', 'deletion_requests', 'compliance_reports')
    `;
    const tablesResult = await db.query(tablesQuery);
    
    const requiredTables = ['user_consents', 'data_retention_policies', 'deletion_requests', 'compliance_reports'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));
    
    res.json({
      success: true,
      data: {
        database_connected: true,
        compliance_tables_status: {
          required: requiredTables.length,
          existing: existingTables.length,
          missing: missingTables
        },
        timestamp: new Date().toISOString()
      },
      message: 'Compliance service health check completed'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'COMPLIANCE_HEALTH_CHECK_FAILED',
        message: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;