import request from 'supertest';
import app from '../server';
import { pool } from '../config/database';

describe('Recommender Authentication', () => {
  let testToken: string;
  let testRecommenderId: string;
  let testApplicationId: string;
  let invitationToken: string;

  beforeAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM application_recommenders WHERE 1=1');
    await pool.query("DELETE FROM recommenders WHERE professional_email LIKE '%test%'");
    await pool.query("DELETE FROM applications WHERE legal_name LIKE '%Test%'");
    await pool.query("DELETE FROM users WHERE email LIKE '%test%'");
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM application_recommenders WHERE 1=1');
    await pool.query("DELETE FROM recommenders WHERE professional_email LIKE '%test%'");
    await pool.query("DELETE FROM applications WHERE legal_name LIKE '%Test%'");
    await pool.query("DELETE FROM users WHERE email LIKE '%test%'");
    await pool.end();
  });

  describe('POST /api/recommender/login', () => {
    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/recommender/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-recommender user', async () => {
      // Create a student user first
      const studentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'student@test.com',
          password: 'TestPass123!',
          first_name: 'Test',
          last_name: 'Student',
          role: 'student'
        });

      expect(studentResponse.status).toBe(201);

      // Try to login as recommender
      const response = await request(app)
        .post('/api/recommender/login')
        .send({
          email: 'student@test.com',
          password: 'TestPass123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/recommender/invitation/:token', () => {
    it('should return 404 for invalid token', async () => {
      const response = await request(app)
        .get('/api/recommender/invitation/invalid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/recommender/invitation/:token/confirm', () => {
    it('should return 404 for invalid token', async () => {
      const response = await request(app)
        .post('/api/recommender/invitation/invalid-token/confirm')
        .send({
          first_name: 'Test',
          last_name: 'Recommender',
          title: 'Professor',
          organization: 'Test University',
          relationship_duration: '2 - 3 years',
          relationship_type: 'Academic Advisor',
          password: 'TestPass123!'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/recommender/invitation/some-token/confirm')
        .send({
          first_name: 'Test'
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/recommender/invitation/:token/report-discrepancy', () => {
    it('should return 404 for invalid token', async () => {
      const response = await request(app)
        .post('/api/recommender/invitation/invalid-token/report-discrepancy')
        .send({
          discrepancy_type: 'Student Name',
          description: 'The student name is incorrect'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});