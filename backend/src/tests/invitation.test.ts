import request from 'supertest';
import { Pool } from 'pg';
import app from '../server';
import { pool } from '../config/database';
import { UserModel } from '../models/User';
import { ApplicationModel } from '../models/Application';
import { RecommenderModel } from '../models/Recommender';
import jwt from 'jsonwebtoken';

describe('Invitation System', () => {
  let db: Pool;
  let userModel: UserModel;
  let applicationModel: ApplicationModel;
  let recommenderModel: RecommenderModel;
  let studentToken: string;
  let studentId: string;
  let applicationId: string;

  beforeAll(async () => {
    db = pool;
    userModel = new UserModel(db);
    applicationModel = new ApplicationModel(db);
    recommenderModel = new RecommenderModel(db);
  });

  beforeEach(async () => {
    // Clean up test data
    await db.query('DELETE FROM application_recommenders');
    await db.query('DELETE FROM recommenders');
    await db.query('DELETE FROM application_universities');
    await db.query('DELETE FROM applications');
    await db.query("DELETE FROM users WHERE email LIKE '%test%'");

    // Create test student
    const student = await userModel.create({
      email: 'student@test.com',
      password: 'TestPassword123!',
      first_name: 'Test',
      last_name: 'Student',
      role: 'student'
    });
    studentId = student.id;

    // Generate JWT token for student
    studentToken = jwt.sign(
      { userId: student.id, email: student.email, role: student.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test application
    const application = await applicationModel.create({
      student_id: studentId,
      legal_name: 'Test Student',
      program_type: 'graduate',
      application_term: 'Fall 2025',
      university_ids: []
    });
    applicationId = application.id;
  });

  afterAll(async () => {
    await db.end();
  });

  describe('POST /api/applications/:applicationId/invitations', () => {
    it('should send invitation to recommender', async () => {
      const response = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com',
          custom_message: 'Please write a recommendation for me.'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recommender).toHaveProperty('id');
      expect(response.body.data.recommender.professional_email).toBe('recommender@test.com');
      expect(response.body.data.recommender.status).toBe('invited');
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'invalid-email',
          custom_message: 'Please write a recommendation for me.'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate invitation', async () => {
      // Send first invitation
      await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      // Try to send duplicate invitation
      const response = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALREADY_INVITED');
    });

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/applications/:applicationId/invitations', () => {
    it('should get all recommenders for application', async () => {
      // Send invitation first
      await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      const response = await request(app)
        .get(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].professional_email).toBe('recommender@test.com');
      expect(response.body.data[0].status).toBe('invited');
    });

    it('should return empty array for application with no invitations', async () => {
      const response = await request(app)
        .get(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/invitations/:token', () => {
    let invitationToken: string;

    beforeEach(async () => {
      // Create invitation to get token
      const { invitation_token } = await recommenderModel.createInvitation({
        application_id: applicationId,
        professional_email: 'recommender@test.com'
      });
      invitationToken = invitation_token;
    });

    it('should get invitation details by token', async () => {
      const response = await request(app)
        .get(`/api/invitations/${invitationToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recommender.professional_email).toBe('recommender@test.com');
      expect(response.body.data.application.legal_name).toBe('Test Student');
      expect(response.body.data.status).toBe('invited');
    });

    it('should return 404 for invalid token', async () => {
      const response = await request(app)
        .get('/api/invitations/invalid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/invitations/:token/confirm', () => {
    let invitationToken: string;

    beforeEach(async () => {
      // Create invitation to get token
      const { invitation_token } = await recommenderModel.createInvitation({
        application_id: applicationId,
        professional_email: 'recommender@test.com'
      });
      invitationToken = invitation_token;
    });

    it('should confirm invitation and create recommender profile', async () => {
      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/confirm`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          title: 'Professor',
          organization: 'Test University',
          relationship_duration: '2 years',
          relationship_type: 'Academic Advisor',
          mobile_phone: '+1234567890',
          password: 'TestPassword123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recommender.title).toBe('Professor');
      expect(response.body.data.recommender.organization).toBe('Test University');
      expect(response.body.data.recommender.confirmed_at).toBeTruthy();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/confirm`)
        .send({
          first_name: 'John',
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post(`/api/invitations/${invitationToken}/confirm`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          title: 'Professor',
          organization: 'Test University',
          relationship_duration: '2 years',
          relationship_type: 'Academic Advisor',
          password: 'weak'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/applications/:applicationId/invitations/:recommenderId/resend', () => {
    let recommenderId: string;

    beforeEach(async () => {
      // Create invitation
      const { recommender } = await recommenderModel.createInvitation({
        application_id: applicationId,
        professional_email: 'recommender@test.com'
      });
      recommenderId = recommender.id;
    });

    it('should resend invitation', async () => {
      const response = await request(app)
        .post(`/api/applications/${applicationId}/invitations/${recommenderId}/resend`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          custom_message: 'Reminder: Please write my recommendation.'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation resent successfully');
    });
  });

  describe('DELETE /api/applications/:applicationId/invitations/:recommenderId', () => {
    let recommenderId: string;

    beforeEach(async () => {
      // Create invitation
      const { recommender } = await recommenderModel.createInvitation({
        application_id: applicationId,
        professional_email: 'recommender@test.com'
      });
      recommenderId = recommender.id;
    });

    it('should delete invitation', async () => {
      const response = await request(app)
        .delete(`/api/applications/${applicationId}/invitations/${recommenderId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation deleted successfully');
    });

    it('should return 404 for non-existent invitation', async () => {
      const response = await request(app)
        .delete(`/api/applications/${applicationId}/invitations/non-existent-id`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
});