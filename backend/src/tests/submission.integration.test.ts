import request from 'supertest';
import { Pool } from 'pg';
import app from '../server';
import { connectDatabase } from '../config/database';
import { createSubmissionQueueTable } from '../services/submissionQueueService';
import jwt from 'jsonwebtoken';

describe('Submission Integration Tests', () => {
  let db: Pool;
  let authToken: string;
  let studentUserId: string;
  let recommenderId: string;
  let applicationId: string;
  let recommendationId: string;
  let universityId: string;

  beforeAll(async () => {
    // Connect to test database
    const connection = await connectDatabase();
    db = connection.db;

    // Initialize submission queue table
    await createSubmissionQueueTable(db);

    // Create test user and get auth token
    const userResult = await db.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified)
      VALUES ('test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'User', 'student', true)
      RETURNING id
    `);
    studentUserId = userResult.rows[0].id;

    // Create auth token
    authToken = jwt.sign(
      { userId: studentUserId, email: 'test@example.com', role: 'student' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test university
    const universityResult = await db.query(`
      INSERT INTO universities (name, code, submission_format, email_address, is_active)
      VALUES ('Test University', 'TEST', 'email', 'admissions@test.edu', true)
      RETURNING id
    `);
    universityId = universityResult.rows[0].id;

    // Create test application
    const applicationResult = await db.query(`
      INSERT INTO applications (student_id, legal_name, program_type, application_term, status)
      VALUES ($1, 'Test Student', 'graduate', 'Fall 2024', 'draft')
      RETURNING id
    `, [studentUserId]);
    applicationId = applicationResult.rows[0].id;

    // Link application to university
    await db.query(`
      INSERT INTO application_universities (application_id, university_id)
      VALUES ($1, $2)
    `, [applicationId, universityId]);

    // Create test recommender
    const recommenderUserResult = await db.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_verified)
      VALUES ('recommender@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Recommender', 'recommender', true)
      RETURNING id
    `);

    const recommenderResult = await db.query(`
      INSERT INTO recommenders (user_id, title, organization, relationship_duration, relationship_type, professional_email, invitation_token, confirmed_at)
      VALUES ($1, 'Professor', 'Test University', '2 years', 'Academic', 'recommender@example.com', 'test-token', NOW())
      RETURNING id
    `, [recommenderUserResult.rows[0].id]);
    recommenderId = recommenderResult.rows[0].id;

    // Create test recommendation
    const recommendationResult = await db.query(`
      INSERT INTO recommendations (application_id, recommender_id, content, word_count, status)
      VALUES ($1, $2, 'This is a test recommendation letter.', 100, 'draft')
      RETURNING id
    `, [applicationId, recommenderId]);
    recommendationId = recommendationResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM submissions WHERE recommendation_id = $1', [recommendationId]);
    await db.query('DELETE FROM submission_queue');
    await db.query('DELETE FROM recommendations WHERE id = $1', [recommendationId]);
    await db.query('DELETE FROM application_universities WHERE application_id = $1', [applicationId]);
    await db.query('DELETE FROM applications WHERE id = $1', [applicationId]);
    await db.query('DELETE FROM recommenders WHERE id = $1', [recommenderId]);
    await db.query('DELETE FROM universities WHERE id = $1', [universityId]);
    await db.query('DELETE FROM users WHERE id = $1 OR email IN (\'test@example.com\', \'recommender@example.com\')', [studentUserId]);
    
    await db.end();
  });

  describe('POST /api/submissions/submit', () => {
    it('should submit recommendation to universities', async () => {
      const response = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recommendationId,
          universityIds: [universityId],
          priority: 5
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.successful).toBe(1);
      expect(response.body.data.failed).toBe(0);
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recommendationId: 'invalid-id',
          universityIds: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/submissions/submit')
        .send({
          recommendationId,
          universityIds: [universityId]
        })
        .expect(401);
    });
  });

  describe('GET /api/submissions/recommendation/:recommendationId', () => {
    it('should get submissions for a recommendation', async () => {
      const response = await request(app)
        .get(`/api/submissions/recommendation/${recommendationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for invalid recommendation ID', async () => {
      const response = await request(app)
        .get('/api/submissions/recommendation/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/submissions/stats', () => {
    it('should return submission statistics', async () => {
      const response = await request(app)
        .get('/api/submissions/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('submitted');
      expect(response.body.data).toHaveProperty('confirmed');
      expect(response.body.data).toHaveProperty('failed');
      expect(response.body.data).toHaveProperty('total');
    });
  });

  describe('GET /api/submissions/queue/status', () => {
    it('should return queue status', async () => {
      const response = await request(app)
        .get('/api/submissions/queue/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('pending');
      expect(response.body.data).toHaveProperty('processing');
      expect(response.body.data).toHaveProperty('failed');
      expect(response.body.data).toHaveProperty('scheduled');
    });
  });

  describe('GET /api/submissions/queue/items', () => {
    it('should return paginated queue items', async () => {
      const response = await request(app)
        .get('/api/submissions/queue/items?limit=10&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/submissions/queue/items?limit=200&offset=-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/submissions/validate/:universityId', () => {
    it('should validate submission data', async () => {
      const response = await request(app)
        .post(`/api/submissions/validate/${universityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          programType: 'graduate',
          wordCount: 500,
          applicantName: 'Test Student',
          applicationTerm: 'Fall 2024'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid');
      expect(response.body.data).toHaveProperty('errors');
    });

    it('should return validation errors for invalid data', async () => {
      const response = await request(app)
        .post(`/api/submissions/validate/${universityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          programType: '',
          wordCount: -1,
          applicantName: '',
          applicationTerm: ''
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/submissions/retry-all-failed', () => {
    it('should retry all failed submissions', async () => {
      const response = await request(app)
        .post('/api/submissions/retry-all-failed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('failed submissions queued for retry');
    });
  });

  describe('Queue Management', () => {
    it('should start queue processing', async () => {
      const response = await request(app)
        .post('/api/submissions/queue/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ intervalMs: 30000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Queue processing started');
    });

    it('should stop queue processing', async () => {
      const response = await request(app)
        .post('/api/submissions/queue/stop')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Queue processing stopped');
    });

    it('should validate queue processing interval', async () => {
      const response = await request(app)
        .post('/api/submissions/queue/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ intervalMs: 1000 }) // Too short
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Submission Status and Retry', () => {
    let submissionId: string;

    beforeAll(async () => {
      // Create a test submission
      const submissionResult = await db.query(`
        INSERT INTO submissions (recommendation_id, university_id, status, submission_method)
        VALUES ($1, $2, 'failed', 'email')
        RETURNING id
      `, [recommendationId, universityId]);
      submissionId = submissionResult.rows[0].id;
    });

    afterAll(async () => {
      await db.query('DELETE FROM submissions WHERE id = $1', [submissionId]);
    });

    it('should get submission status', async () => {
      const response = await request(app)
        .get(`/api/submissions/${submissionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(submissionId);
    });

    it('should retry failed submission', async () => {
      const response = await request(app)
        .post(`/api/submissions/${submissionId}/retry`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Submission queued for retry');
    });

    it('should set submission priority', async () => {
      // First add to queue
      await db.query(`
        INSERT INTO submission_queue (submission_id, priority, scheduled_at, attempts, max_attempts, backoff_multiplier)
        VALUES ($1, 5, CURRENT_TIMESTAMP, 0, 5, 2.0)
        ON CONFLICT (submission_id) DO NOTHING
      `, [submissionId]);

      const response = await request(app)
        .put(`/api/submissions/${submissionId}/priority`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ priority: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Priority updated successfully');
    });

    it('should return 404 for non-existent submission', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/submissions/${fakeId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUBMISSION_NOT_FOUND');
    });
  });

  describe('Input Validation', () => {
    it('should validate UUID parameters', async () => {
      const response = await request(app)
        .get('/api/submissions/invalid-uuid/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate priority range', async () => {
      const response = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          recommendationId,
          universityIds: [universityId],
          priority: 15 // Invalid priority
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/submissions/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});