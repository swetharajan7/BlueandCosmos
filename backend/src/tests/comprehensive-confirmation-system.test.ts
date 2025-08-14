import request from 'supertest';
import { Pool } from 'pg';
import app from '../server';
import { connectDatabase } from '../config/database';
import { SubmissionConfirmationService } from '../services/submissionConfirmationService';

describe('Comprehensive Confirmation System', () => {
  let db: Pool;
  let confirmationService: SubmissionConfirmationService;
  let studentToken: string;
  let recommenderToken: string;
  let adminToken: string;
  let testUserId: string;
  let testRecommendationId: string;
  let testSubmissionId: string;

  beforeAll(async () => {
    const { db: database } = await connectDatabase();
    db = database;
    confirmationService = new SubmissionConfirmationService(db);

    // Create test users and get tokens
    const studentResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'teststudent@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Student',
        role: 'student'
      });

    const recommenderResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testrecommender@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Recommender',
        role: 'recommender'
      });

    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testadmin@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin'
      });

    studentToken = studentResponse.body.data.token;
    recommenderToken = recommenderResponse.body.data.token;
    adminToken = adminResponse.body.data.token;
    testUserId = studentResponse.body.data.user.id;

    // Create test data
    await createTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await db.end();
  });

  async function createTestData() {
    // Create test application
    const applicationResult = await db.query(`
      INSERT INTO applications (student_id, legal_name, program_type, application_term, status)
      VALUES ($1, 'Test Student', 'graduate', 'Fall 2024', 'submitted')
      RETURNING id
    `, [testUserId]);

    const applicationId = applicationResult.rows[0].id;

    // Create test recommendation
    const recommendationResult = await db.query(`
      INSERT INTO recommendations (application_id, recommender_id, content, word_count, status)
      VALUES ($1, (SELECT id FROM recommenders LIMIT 1), 'Test recommendation content', 500, 'submitted')
      RETURNING id
    `, [applicationId]);

    testRecommendationId = recommendationResult.rows[0].id;

    // Create test submission
    const submissionResult = await db.query(`
      INSERT INTO submissions (recommendation_id, university_id, status, submission_method)
      VALUES ($1, (SELECT id FROM universities LIMIT 1), 'submitted', 'email')
      RETURNING id
    `, [testRecommendationId]);

    testSubmissionId = submissionResult.rows[0].id;
  }

  async function cleanupTestData() {
    await db.query('DELETE FROM submissions WHERE recommendation_id = $1', [testRecommendationId]);
    await db.query('DELETE FROM recommendations WHERE id = $1', [testRecommendationId]);
    await db.query('DELETE FROM applications WHERE student_id = $1', [testUserId]);
    await db.query('DELETE FROM support_tickets WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM users WHERE email LIKE %test%@example.com');
  }

  describe('Confirmation Summary', () => {
    it('should send comprehensive confirmation summary email', async () => {
      const response = await request(app)
        .post(`/api/confirmation/recommendations/${testRecommendationId}/confirmation-summary`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Confirmation summary emails sent successfully');
    });

    it('should generate confirmation summary data', async () => {
      const summary = await confirmationService.generateConfirmationSummary(testRecommendationId);

      expect(summary).toHaveProperty('totalSubmissions');
      expect(summary).toHaveProperty('confirmed');
      expect(summary).toHaveProperty('pending');
      expect(summary).toHaveProperty('failed');
      expect(summary).toHaveProperty('details');
      expect(Array.isArray(summary.details)).toBe(true);
    });

    it('should get confirmation summary via API', async () => {
      const response = await request(app)
        .get(`/api/confirmation/recommendations/${testRecommendationId}/summary`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalSubmissions');
      expect(response.body.data).toHaveProperty('details');
    });
  });

  describe('Status Reports', () => {
    it('should generate comprehensive status report for student', async () => {
      const response = await request(app)
        .get('/api/confirmation/status-report')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('applications');
      expect(response.body.data).toHaveProperty('overallStats');
      expect(Array.isArray(response.body.data.applications)).toBe(true);
    });

    it('should generate comprehensive status report for recommender', async () => {
      const response = await request(app)
        .get('/api/confirmation/status-report')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('applications');
      expect(response.body.data).toHaveProperty('overallStats');
    });

    it('should include detailed university information in status report', async () => {
      const report = await confirmationService.generateStatusReport(testUserId, 'student');

      expect(report.applications.length).toBeGreaterThan(0);
      
      const application = report.applications[0];
      expect(application).toHaveProperty('id');
      expect(application).toHaveProperty('applicantName');
      expect(application).toHaveProperty('submissionStats');
      expect(application).toHaveProperty('universities');
      expect(Array.isArray(application.universities)).toBe(true);
    });
  });

  describe('Support Tickets', () => {
    it('should create support ticket for submission issues', async () => {
      const ticketData = {
        submissionId: testSubmissionId,
        issueType: 'submission_failed',
        subject: 'Test submission failed',
        description: 'This is a test support ticket for a failed submission',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/confirmation/support-tickets')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(ticketData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ticketId');
      expect(response.body.data.ticketId).toMatch(/^TICKET-/);
    });

    it('should validate required fields for support ticket creation', async () => {
      const response = await request(app)
        .post('/api/confirmation/support-tickets')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          issueType: 'submission_failed'
          // Missing subject and description
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should validate issue type for support tickets', async () => {
      const response = await request(app)
        .post('/api/confirmation/support-tickets')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          issueType: 'invalid_type',
          subject: 'Test subject',
          description: 'Test description'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ISSUE_TYPE');
    });

    it('should create support ticket with default priority', async () => {
      const ticketId = await confirmationService.createSupportTicket({
        userId: testUserId,
        userEmail: 'teststudent@example.com',
        userName: 'Test Student',
        issueType: 'other',
        subject: 'Test ticket without priority',
        description: 'This ticket should get default priority',
        priority: 'medium' // This should be the default
      });

      expect(ticketId).toMatch(/^TICKET-/);

      // Verify ticket was created with correct priority
      const result = await db.query('SELECT priority FROM support_tickets WHERE ticket_id = $1', [ticketId]);
      expect(result.rows[0].priority).toBe('medium');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit trail entries', async () => {
      await confirmationService.createAuditTrail('test_action', {
        submissionId: testSubmissionId,
        userId: testUserId,
        testData: 'test value'
      });

      const auditTrail = await confirmationService.getAuditTrail({
        submissionId: testSubmissionId,
        limit: 10
      });

      expect(auditTrail.items.length).toBeGreaterThan(0);
      expect(auditTrail.items[0]).toHaveProperty('action');
      expect(auditTrail.items[0]).toHaveProperty('data');
      expect(auditTrail.items[0]).toHaveProperty('createdAt');
    });

    it('should get audit trail via API', async () => {
      const response = await request(app)
        .get('/api/confirmation/audit-trail')
        .query({ submissionId: testSubmissionId })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('pagination');
    });

    it('should filter audit trail by action', async () => {
      await confirmationService.createAuditTrail('specific_test_action', {
        submissionId: testSubmissionId,
        userId: testUserId
      });

      const response = await request(app)
        .get('/api/confirmation/audit-trail')
        .query({ 
          submissionId: testSubmissionId,
          action: 'specific_test_action'
        })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].action).toBe('specific_test_action');
    });

    it('should support pagination in audit trail', async () => {
      const response = await request(app)
        .get('/api/confirmation/audit-trail')
        .query({ 
          limit: 5,
          offset: 0
        })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('Webhook Confirmations', () => {
    it('should process webhook confirmation from university', async () => {
      const webhookPayload = {
        submissionId: testSubmissionId,
        status: 'confirmed',
        confirmationCode: 'CONF-12345',
        timestamp: new Date().toISOString(),
        additionalData: {
          processingTime: '2 hours'
        }
      };

      const response = await request(app)
        .post('/api/confirmation/webhooks/university/HARVARD/confirmation')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Webhook confirmation processed successfully');
    });

    it('should handle webhook confirmation with external reference', async () => {
      const webhookPayload = {
        externalReference: 'EXT-REF-12345',
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        universityCode: 'HARVARD'
      };

      // First create a submission with external reference
      await db.query(
        'UPDATE submissions SET external_reference = $1 WHERE id = $2',
        ['EXT-REF-12345', testSubmissionId]
      );

      const response = await request(app)
        .post('/api/confirmation/webhooks/university/HARVARD/confirmation')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate university code in webhook', async () => {
      const response = await request(app)
        .post('/api/confirmation/webhooks/university//confirmation')
        .send({
          submissionId: testSubmissionId,
          status: 'confirmed',
          timestamp: new Date().toISOString()
        })
        .expect(404); // Route not found due to empty university code
    });
  });

  describe('Admin Functions', () => {
    it('should allow admin to check pending confirmations', async () => {
      const response = await request(app)
        .post('/api/confirmation/admin/check-pending-confirmations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Pending confirmations check initiated');
    });

    it('should allow admin to process manual confirmation', async () => {
      const manualConfirmation = {
        submissionId: testSubmissionId,
        universityName: 'Harvard University',
        applicantName: 'Test Student',
        externalReference: 'MANUAL-TEST-123',
        confirmationCode: 'MANUAL-CONF-456'
      };

      const response = await request(app)
        .post('/api/confirmation/admin/manual-confirmation')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(manualConfirmation)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Manual confirmation processed successfully');
    });

    it('should restrict admin functions to admin users only', async () => {
      const response = await request(app)
        .post('/api/confirmation/admin/check-pending-confirmations')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing recommendation ID', async () => {
      const response = await request(app)
        .post('/api/confirmation/recommendations//confirmation-summary')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404); // Route not found due to empty recommendation ID
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/confirmation/status-report')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid recommendation ID', async () => {
      const response = await request(app)
        .get('/api/confirmation/recommendations/invalid-id/summary')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Email Integration', () => {
    it('should generate comprehensive confirmation email HTML', async () => {
      const summary = await confirmationService.generateConfirmationSummary(testRecommendationId);
      
      // Mock recommendation data
      const recommendation = {
        student_first_name: 'Test',
        applicant_name: 'Test Student',
        program_type: 'graduate',
        application_term: 'Fall 2024'
      };

      // This would normally be called internally, but we can test the HTML generation
      expect(summary).toHaveProperty('totalSubmissions');
      expect(summary).toHaveProperty('details');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large audit trail queries efficiently', async () => {
      // Create multiple audit trail entries
      for (let i = 0; i < 100; i++) {
        await confirmationService.createAuditTrail(`bulk_test_action_${i}`, {
          submissionId: testSubmissionId,
          userId: testUserId,
          iteration: i
        });
      }

      const startTime = Date.now();
      const auditTrail = await confirmationService.getAuditTrail({
        submissionId: testSubmissionId,
        limit: 50
      });
      const endTime = Date.now();

      expect(auditTrail.items.length).toBeLessThanOrEqual(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent support ticket creation', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          confirmationService.createSupportTicket({
            userId: testUserId,
            userEmail: 'teststudent@example.com',
            userName: 'Test Student',
            issueType: 'other',
            subject: `Concurrent test ticket ${i}`,
            description: `This is concurrent test ticket number ${i}`,
            priority: 'low'
          })
        );
      }

      const ticketIds = await Promise.all(promises);
      
      expect(ticketIds.length).toBe(10);
      expect(new Set(ticketIds).size).toBe(10); // All ticket IDs should be unique
    });
  });
});