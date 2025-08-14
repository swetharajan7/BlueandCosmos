import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AppError } from '../utils/AppError';
import { UserConsentModel } from '../models/UserConsent';
import { ComplianceReportingService } from '../services/complianceReportingService';
import { db } from '../config/database';

// Extend Request interface to include compliance data
declare global {
  namespace Express {
    interface Request {
      compliance?: {
        consents: Record<string, boolean>;
        auditRequired: boolean;
        dataCategories: string[];
      };
    }
  }
}

export class ComplianceMiddleware {
  private static consentModel = new UserConsentModel(db);
  private static reportingService = new ComplianceReportingService(db);

  /**
   * Check if user has valid consent for data processing
   */
  static requireConsent(consentTypes: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        
        if (!userId) {
          throw new AppError('User not authenticated', 401);
        }

        // Check consent for each required type
        const consentChecks = await Promise.all(
          consentTypes.map(async (type) => {
            const hasConsent = await ComplianceMiddleware.consentModel.hasValidConsent(userId, type as any);
            return { type, hasConsent };
          })
        );

        const missingConsents = consentChecks
          .filter(check => !check.hasConsent)
          .map(check => check.type);

        if (missingConsents.length > 0) {
          return res.status(403).json({
            error: {
              code: 'CONSENT_REQUIRED',
              message: 'Valid consent required for this operation',
              details: {
                missing_consents: missingConsents,
                consent_url: '/api/compliance/consent'
              },
              timestamp: new Date().toISOString()
            }
          });
        }

        // Store consent status in request for later use
        req.compliance = {
          consents: consentChecks.reduce((acc, check) => {
            acc[check.type] = check.hasConsent;
            return acc;
          }, {} as Record<string, boolean>),
          auditRequired: true,
          dataCategories: consentTypes
        };

        next();
      } catch (error: any) {
        res.status(error.statusCode || 500).json({
          error: {
            code: error.code || 'CONSENT_CHECK_FAILED',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }

  /**
   * Audit data access and processing activities
   */
  static auditDataAccess(resourceType: string, dataCategories: string[] = []) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';

        if (userId) {
          // Log the data access
          await ComplianceMiddleware.reportingService.logAuditEvent(
            userId,
            `${req.method.toLowerCase()}_${resourceType}`,
            resourceType,
            req.params.id || userId,
            {
              endpoint: req.originalUrl,
              data_categories: dataCategories,
              query_params: req.query,
              body_keys: req.body ? Object.keys(req.body) : []
            },
            ipAddress,
            userAgent
          );
        }

        next();
      } catch (error) {
        // Don't fail the request if audit logging fails
        console.error('Audit logging failed:', error);
        next();
      }
    };
  }

  /**
   * Check data retention compliance
   */
  static checkRetentionCompliance() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        
        if (!userId) {
          return next();
        }

        // Check if user's data is subject to retention policies
        const userQuery = 'SELECT created_at FROM users WHERE id = $1';
        const result = await db.query(userQuery, [userId]);
        
        if (result.rows.length === 0) {
          return next();
        }

        const userCreatedAt = new Date(result.rows[0].created_at);
        const sevenYearsAgo = new Date();
        sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

        // If user account is older than 7 years, flag for review
        if (userCreatedAt < sevenYearsAgo) {
          req.compliance = {
            ...req.compliance,
            auditRequired: true,
            dataCategories: ['retention_review_required']
          };

          // Log retention compliance check
          await ComplianceMiddleware.reportingService.logAuditEvent(
            userId,
            'retention_compliance_check',
            'user_data',
            userId,
            {
              user_age_years: Math.floor((Date.now() - userCreatedAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
              retention_review_required: true
            },
            req.ip,
            req.get('User-Agent')
          );
        }

        next();
      } catch (error) {
        console.error('Retention compliance check failed:', error);
        next();
      }
    };
  }

  /**
   * Validate FERPA compliance for educational records
   */
  static requireFERPACompliance() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        
        if (!userId) {
          throw new AppError('User not authenticated', 401);
        }

        // Check if user has valid FERPA disclosure consent
        const hasFERPAConsent = await ComplianceMiddleware.consentModel.hasValidConsent(
          userId,
          'ferpa_disclosure'
        );

        if (!hasFERPAConsent) {
          return res.status(403).json({
            error: {
              code: 'FERPA_CONSENT_REQUIRED',
              message: 'FERPA disclosure consent required for educational record access',
              details: {
                ferpa_info: 'Educational records are protected under FERPA. Consent is required for disclosure.',
                consent_url: '/api/compliance/consent'
              },
              timestamp: new Date().toISOString()
            }
          });
        }

        // Log FERPA-protected data access
        await ComplianceMiddleware.reportingService.logAuditEvent(
          userId,
          'ferpa_protected_access',
          'educational_record',
          req.params.id || userId,
          {
            endpoint: req.originalUrl,
            ferpa_consent_verified: true
          },
          req.ip,
          req.get('User-Agent')
        );

        next();
      } catch (error: any) {
        res.status(error.statusCode || 500).json({
          error: {
            code: error.code || 'FERPA_COMPLIANCE_CHECK_FAILED',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }

  /**
   * Validate GDPR compliance for personal data processing
   */
  static requireGDPRCompliance(processingPurpose: string, dataCategories: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        
        if (!userId) {
          throw new AppError('User not authenticated', 401);
        }

        // Check if user has valid data processing consent
        const hasDataProcessingConsent = await ComplianceMiddleware.consentModel.hasValidConsent(
          userId,
          'data_processing'
        );

        if (!hasDataProcessingConsent) {
          return res.status(403).json({
            error: {
              code: 'GDPR_CONSENT_REQUIRED',
              message: 'Data processing consent required under GDPR',
              details: {
                processing_purpose: processingPurpose,
                data_categories: dataCategories,
                legal_basis: 'Article 6(1)(a) - Consent',
                consent_url: '/api/compliance/consent'
              },
              timestamp: new Date().toISOString()
            }
          });
        }

        // Log GDPR-compliant data processing
        await ComplianceMiddleware.reportingService.logAuditEvent(
          userId,
          'gdpr_compliant_processing',
          'personal_data',
          req.params.id || userId,
          {
            endpoint: req.originalUrl,
            processing_purpose: processingPurpose,
            data_categories: dataCategories,
            legal_basis: 'consent',
            gdpr_consent_verified: true
          },
          req.ip,
          req.get('User-Agent')
        );

        next();
      } catch (error: any) {
        res.status(error.statusCode || 500).json({
          error: {
            code: error.code || 'GDPR_COMPLIANCE_CHECK_FAILED',
            message: error.message,
            timestamp: new Date().toISOString()
          }
        });
      }
    };
  }

  /**
   * Check for data breach indicators
   */
  static monitorDataBreach() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.id;
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';

        // Monitor for suspicious activities that might indicate a breach
        const suspiciousPatterns = [
          // Multiple rapid requests
          { pattern: 'rapid_requests', threshold: 100, timeWindow: 60000 }, // 100 requests in 1 minute
          // Unusual data access patterns
          { pattern: 'bulk_data_access', threshold: 50, timeWindow: 300000 }, // 50 data access in 5 minutes
          // Failed authentication attempts
          { pattern: 'failed_auth', threshold: 10, timeWindow: 300000 } // 10 failed attempts in 5 minutes
        ];

        if (userId) {
          // Check recent activity for suspicious patterns
          const recentActivityQuery = `
            SELECT action, COUNT(*) as count, MAX(created_at) as latest
            FROM audit_logs 
            WHERE user_id = $1 AND created_at > NOW() - INTERVAL '5 minutes'
            GROUP BY action
          `;
          
          const activityResult = await db.query(recentActivityQuery, [userId]);
          
          for (const activity of activityResult.rows) {
            if (activity.count > 20) { // More than 20 actions in 5 minutes
              // Log potential security incident
              await ComplianceMiddleware.reportingService.logAuditEvent(
                userId,
                'potential_security_incident',
                'security_monitoring',
                userId,
                {
                  incident_type: 'suspicious_activity',
                  activity_pattern: activity.action,
                  activity_count: activity.count,
                  time_window: '5_minutes',
                  risk_level: 'medium'
                },
                ipAddress,
                userAgent
              );
            }
          }
        }

        next();
      } catch (error) {
        console.error('Data breach monitoring failed:', error);
        next();
      }
    };
  }

  /**
   * Ensure data minimization compliance
   */
  static enforceDataMinimization(allowedFields: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.body && typeof req.body === 'object') {
          // Filter request body to only include allowed fields
          const filteredBody: any = {};
          
          for (const field of allowedFields) {
            if (req.body.hasOwnProperty(field)) {
              filteredBody[field] = req.body[field];
            }
          }
          
          // Log if fields were filtered out
          const originalFields = Object.keys(req.body);
          const filteredFields = Object.keys(filteredBody);
          const removedFields = originalFields.filter(field => !filteredFields.includes(field));
          
          if (removedFields.length > 0 && req.user?.id) {
            ComplianceMiddleware.reportingService.logAuditEvent(
              req.user.id,
              'data_minimization_applied',
              'data_processing',
              req.user.id,
              {
                endpoint: req.originalUrl,
                removed_fields: removedFields,
                allowed_fields: allowedFields
              },
              req.ip,
              req.get('User-Agent')
            ).catch(error => console.error('Failed to log data minimization:', error));
          }
          
          req.body = filteredBody;
        }

        next();
      } catch (error) {
        console.error('Data minimization enforcement failed:', error);
        next();
      }
    };
  }

  /**
   * Add compliance headers to responses
   */
  static addComplianceHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add privacy and compliance headers
      res.setHeader('X-Privacy-Policy', 'https://stellarrec.com/privacy');
      res.setHeader('X-Data-Protection', 'GDPR-FERPA-Compliant');
      res.setHeader('X-Consent-Management', 'Available at /api/compliance/consent');
      res.setHeader('X-Data-Retention', 'Managed according to retention policies');
      res.setHeader('X-Right-To-Delete', 'Available at /api/compliance/deletion-request');
      
      next();
    };
  }
}

// Export individual middleware functions for easier use
export const requireConsent = ComplianceMiddleware.requireConsent;
export const auditDataAccess = ComplianceMiddleware.auditDataAccess;
export const checkRetentionCompliance = ComplianceMiddleware.checkRetentionCompliance;
export const requireFERPACompliance = ComplianceMiddleware.requireFERPACompliance;
export const requireGDPRCompliance = ComplianceMiddleware.requireGDPRCompliance;
export const monitorDataBreach = ComplianceMiddleware.monitorDataBreach;
export const enforceDataMinimization = ComplianceMiddleware.enforceDataMinimization;
export const addComplianceHeaders = ComplianceMiddleware.addComplianceHeaders;