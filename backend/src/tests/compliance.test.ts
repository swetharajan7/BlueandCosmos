import request from 'supertest';
import { Pool } from 'pg';
import { app } from '../server';
import { db } from '../config/database';
import { UserConsentModel } from '../models/UserConsent';
import { DataRetentionService } from '../services/dataRetentionService';
import { DataDeletionService } from '../services/dataDeletionService';
import { ComplianceReportingService } from '../services/complianceReportingService';
import { EncryptionService } from '../services/encryptionService';
import jwt from 'jsonwebtoken';

describe('FERPA and GDPR Compliance System', () => {
  let testUserId: string;
  let testToken: string;
  let adminToken: string;
  let consentModel: UserConsentModel;
  let retentionService: DataRetentionService;
  let deletionService: DataDeletionService;
  let reportingService: ComplianceReportingService;

  beforeAll(async () => {
    // Initialize encryption service
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-compliance-testing';
    EncryptionService.initialize();

    // Initialize services
    consentModel = new UserConsentModel(db);
    retentionService = new DataRetentionService(db);
    deletionService = new DataDeletionService(db);
    reportingService = new ComplianceReportingService(db);

    // Create test user
    const userResult = await db.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified)
      VALUES (gen_random_uuid(), 'compliance.test@example.com', 'hashed_password', 'Test', 'User', 'student', true)
      RETURNING id
    `);
    testUserId = userResult.rows[0].id;

    // Create admin user
    const adminResult = await db.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_verified)
      VALUES (gen_random_uuid(), 'admin.compliance@example.com', 'hashed_password', 'Admin', 'User', 'admin', true)
      RETURNING id
    `);
    const adminUserId = adminResult.rows[0].id;

    // Generate JWT tokens
    testToken = jwt.sign(
      { id: testUserId, email: 'compliance.test@example.com', role: 'student' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { id: adminUserId, email: 'admin.compliance@example.com', role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Initialize retention policies
    await retentionService.initializeRetentionPolicies();
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM user_consents WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM deletion_requests WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM audit_logs WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM users WHERE email IN ($1, $2)', [
      'compliance.test@example.com',
      'admin.compliance@example.com'
    ]);
  });

  describe('Encryption Service', () => {
    test('should encrypt and decrypt data correctly', () => {
      const plaintext = 'Sensitive student information';
      const encrypted = EncryptionService.encrypt(plaintext);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
      expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
    });

    test('should encrypt PII fields in records', () => {
      const record = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const encrypted = EncryptionService.encryptPII(record, ['name', 'email']);
      expect(encrypted.name).not.toBe(record.name);
      expect(encrypted.email).not.toBe(record.email);
      expect(encrypted.age).toBe(record.age);
      expect(encrypted.id).toBe(record.id);
    });

    test('should generate secure tokens', () => {
      const token1 = EncryptionService.generateSecureToken();
      const token2 = EncryptionService.generateSecureToken();

      expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });
  });

  describe('User Consent Management', () => {
    test('should record user consent', async () => {
      const consentData = {
        user_id: testUserId,
        consent_type: 'data_processing' as const,
        consent_given: true,
        consent_version: '1.0',
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        legal_basis: 'consent' as const,
        purpose: 'Processing university applications',
        data_categories: ['personal_data', 'educational_records'],
        retention_period: '7 years'
      };

      const consent = await consentModel.recordConsent(consentData);

      expect(consent.id).toBeDefined();
      expect(consent.user_id).toBe(testUserId);
      expect(consent.consent_type).toBe('data_processing');
      expect(consent.consent_given).toBe(true);
      expect(consent.data_categories).toEqual(['personal_data', 'educational_records']);
    });

    test('should check valid consent', async () => {
      const hasConsent = await consentModel.hasValidConsent(testUserId, 'data_processing');
      expect(hasConsent).toBe(true);
    });

    test('should withdraw consent', async () => {
      const withdrawal = await consentModel.withdrawConsent(
        testUserId,
        'data_processing',
        '127.0.0.1',
        'Test Agent'
      );

      expect(withdrawal.consent_given).toBe(false);
      expect(withdrawal.purpose).toBe('Consent withdrawal');
    });

    test('should get user consent history', async () => {
      const consents = await consentModel.getUserConsents(testUserId);
      expect(consents.length).toBeGreaterThan(0);
      expect(consents[0].user_id).toBe(testUserId);
    });
  });

  describe('Data Retention Service', () => {
    test('should create retention policy', async () => {
      const policyData = {
        data_type: 'test_data',
        retention_period_days: 365,
        legal_basis: 'Test legal basis',
        description: 'Test retention policy',
        auto_delete: true
      };

      const policy = await retentionService.createOrUpdateRetentionPolicy(policyData);

      expect(policy.data_type).toBe('test_data');
      expect(policy.retention_period_days).toBe(365);
      expect(policy.auto_delete).toBe(true);
    });

    test('should get retention policy', async () => {
      const policy = await retentionService.getRetentionPolicy('test_data');
      expect(policy).toBeDefined();
      expect(policy?.data_type).toBe('test_data');
    });

    test('should generate data retention report', async () => {
      const report = await retentionService.getDataRetentionReport();

      expect(report.totalRecords).toBeGreaterThanOrEqual(0);
      expect(report.expiredRecords).toBeGreaterThanOrEqual(0);
      expect(report.policyCompliance).toBeDefined();
      expect(Array.isArray(report.policyCompliance)).toBe(true);
    });
  });

  describe('Data Deletion Service', () => {
    let deletionRequestId: string;

    test('should submit deletion request', async () => {
      const request = await deletionService.submitDeletionRequest(
        testUserId,
        'specific_data',
        ['profile_data', 'session_data'],
        'User requested data deletion for privacy reasons',
        '127.0.0.1',
        'Test Agent'
      );

      deletionRequestId = request.id;

      expect(request.user_id).toBe(testUserId);
      expect(request.request_type).toBe('specific_data');
      expect(request.status).toBe('pending');
      expect(request.verification_token).toBeDefined();
    });

    test('should get user deletion requests', async () => {
      const requests = await deletionService.getUserDeletionRequests(testUserId);
      expect(requests.length).toBeGreaterThan(0);
      expect(requests[0].user_id).toBe(testUserId);
    });

    test('should get deletion statistics', async () => {
      const stats = await deletionService.getDeletionStatistics();

      expect(stats.totalRequests).toBeGreaterThanOrEqual(1);
      expect(stats.pendingRequests).toBeGreaterThanOrEqual(1);
      expect(stats.completedRequests).toBeGreaterThanOrEqual(0);
      expect(stats.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Compliance Reporting Service', () => {
    test('should log audit event', async () => {
      await reportingService.logAuditEvent(
        testUserId,
        'test_action',
        'test_resource',
        'test_resource_id',
        { test: 'metadata' },
        '127.0.0.1',
        'Test Agent'
      );

      // Verify audit log was created
      const result = await db.query(
        'SELECT * FROM audit_logs WHERE user_id = $1 AND action = $2',
        [testUserId, 'test_action']
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].resource_type).toBe('test_resource');
    });

    test('should get audit logs with filters', async () => {
      const result = await reportingService.getAuditLogs({
        userId: testUserId,
        limit: 10,
        offset: 0
      });

      expect(result.logs).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.logs)).toBe(true);
    });

    test('should generate data inventory report', async () => {
      const report = await reportingService.generateDataInventoryReport(testUserId);

      expect(report.report_type).toBe('data_inventory');
      expect(report.status).toBe('completed');
      expect(report.report_data).toBeDefined();
      expect(report.report_data.total_data_types).toBeGreaterThan(0);
    });
  });

  describe('Compliance API Endpoints', () => {
    test('POST /api/compliance/consent - should record consent', async () => {
      const consentData = {
        consent_type: 'marketing',
        consent_given: true,
        legal_basis: 'consent',
        purpose: 'Marketing communications',
        data_categories: ['contact_information'],
        retention_period: '3 years'
      };

      const response = await request(app)
        .post('/api/compliance/consent')
        .set('Authorization', `Bearer ${testToken}`)
        .send(consentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.consent_type).toBe('marketing');
      expect(response.body.data.consent_given).toBe(true);
    });

    test('GET /api/compliance/consent - should get user consents', async () => {
      const response = await request(app)
        .get('/api/compliance/consent')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/compliance/consent/withdraw - should withdraw consent', async () => {
      const response = await request(app)
        .post('/api/compliance/consent/withdraw')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ consent_type: 'marketing' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.consent_given).toBe(false);
    });

    test('POST /api/compliance/deletion-request - should submit deletion request', async () => {
      const deletionData = {
        request_type: 'specific_data',
        data_categories: ['profile_data'],
        reason: 'No longer need the service'
      };

      const response = await request(app)
        .post('/api/compliance/deletion-request')
        .set('Authorization', `Bearer ${testToken}`)
        .send(deletionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.request_type).toBe('specific_data');
      expect(response.body.data.status).toBe('pending');
    });

    test('GET /api/compliance/deletion-requests - should get user deletion requests', async () => {
      const response = await request(app)
        .get('/api/compliance/deletion-requests')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/compliance/export-data - should export user data', async () => {
      const response = await request(app)
        .get('/api/compliance/export-data')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user_id).toBe(testUserId);
      expect(response.body.data.data).toBeDefined();
      expect(response.body.data.export_date).toBeDefined();
    });

    test('GET /api/compliance/dashboard - should get compliance dashboard (admin only)', async () => {
      const response = await request(app)
        .get('/api/compliance/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.compliance_overview).toBeDefined();
      expect(response.body.data.retention_compliance).toBeDefined();
    });

    test('GET /api/compliance/audit-logs - should get audit logs (admin only)', async () => {
      const response = await request(app)
        .get('/api/compliance/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    test('POST /api/compliance/reports/generate - should generate compliance report (admin only)', async () => {
      const reportData = {
        report_type: 'data_inventory'
      };

      const response = await request(app)
        .post('/api/compliance/reports/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.report_type).toBe('data_inventory');
      expect(response.body.data.status).toBe('completed');
    });

    test('GET /api/compliance/health - should return health status', async () => {
      const response = await request(app)
        .get('/api/compliance/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.database_connected).toBe(true);
      expect(response.body.data.compliance_tables_status).toBeDefined();
    });
  });

  describe('Compliance Middleware', () => {
    test('should require consent for protected endpoints', async () => {
      // First withdraw all consents
      await consentModel.withdrawConsent(testUserId, 'data_processing', '127.0.0.1', 'Test');

      // Try to access a protected endpoint without consent
      const response = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('CONSENT_REQUIRED');
      expect(response.body.error.details.missing_consents).toContain('data_processing');
    });

    test('should add compliance headers to responses', async () => {
      const response = await request(app)
        .get('/api/compliance/health')
        .expect(200);

      expect(response.headers['x-privacy-policy']).toBeDefined();
      expect(response.headers['x-data-protection']).toBe('GDPR-FERPA-Compliant');
      expect(response.headers['x-consent-management']).toBeDefined();
    });
  });

  describe('Data Encryption in Transit and at Rest', () => {
    test('should encrypt sensitive data before storage', async () => {
      const sensitiveData = 'Student Social Security Number: 123-45-6789';
      const encrypted = EncryptionService.encrypt(sensitiveData);
      
      // Verify data is encrypted
      expect(encrypted).not.toContain('123-45-6789');
      expect(encrypted).toMatch(/^[a-f0-9]+:[a-f0-9]+:[a-f0-9]+$/);
      
      // Verify data can be decrypted
      const decrypted = EncryptionService.decrypt(encrypted);
      expect(decrypted).toBe(sensitiveData);
    });

    test('should handle encryption errors gracefully', () => {
      expect(() => {
        EncryptionService.decrypt('invalid-encrypted-data');
      }).toThrow();
    });
  });

  describe('FERPA Compliance', () => {
    test('should protect educational records', async () => {
      // Create an application (educational record)
      const appResult = await db.query(`
        INSERT INTO applications (id, student_id, legal_name, program_type, application_term, status)
        VALUES (gen_random_uuid(), $1, 'Test Student', 'graduate', 'Fall 2024', 'draft')
        RETURNING id
      `, [testUserId]);

      const applicationId = appResult.rows[0].id;

      // Verify FERPA consent is required for access
      const response = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FERPA_CONSENT_REQUIRED');

      // Clean up
      await db.query('DELETE FROM applications WHERE id = $1', [applicationId]);
    });
  });

  describe('GDPR Compliance', () => {
    test('should handle right to be forgotten', async () => {
      const deletionRequest = await deletionService.submitDeletionRequest(
        testUserId,
        'full_account',
        [],
        'GDPR Article 17 - Right to erasure',
        '127.0.0.1',
        'Test Agent'
      );

      expect(deletionRequest.request_type).toBe('full_account');
      expect(deletionRequest.status).toBe('pending');
    });

    test('should provide data portability', async () => {
      const response = await request(app)
        .get('/api/compliance/export-data')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.data.data.profile).toBeDefined();
      expect(response.body.data.data.applications).toBeDefined();
      expect(response.body.data.data.consents).toBeDefined();
    });
  });
});

describe('Compliance Integration Tests', () => {
  test('should maintain audit trail for all data operations', async () => {
    // This test would verify that all CRUD operations are properly audited
    // Implementation would depend on specific audit requirements
  });

  test('should enforce data retention policies automatically', async () => {
    // This test would verify that expired data is automatically cleaned up
    // Implementation would depend on specific retention requirements
  });

  test('should handle consent withdrawal cascading effects', async () => {
    // This test would verify that withdrawing consent properly affects
    // all related data processing activities
  });
});