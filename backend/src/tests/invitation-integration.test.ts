import request from 'supertest';
import { Pool } from 'pg';
import app from '../server';
import { pool } from '../config/database';
import { UserModel } from '../models/User';
import { ApplicationModel } from '../models/Application';
import jwt from 'jsonwebtoken';

describe('Invitation System Integration', () => {
  let db: Pool;
  let userModel: UserModel;
  let applicationModel: ApplicationModel;
  let studentToken: string;
  let studentId: string;
  let applicationId: string;

  beforeAll(async () => {
    db = pool;
    userModel = new UserModel(db);
    applicationModel = new ApplicationModel(db);
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

  describe('Complete Invitation Flow', () => {
    it('should complete the full invitation workflow', async () => {
      // Step 1: Send invitation
      const invitationResponse = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com',
          custom_message: 'Please write a recommendation for me.'
        });

      expect(invitationResponse.status).toBe(201);
      expect(invitationResponse.body.success).toBe(true);
      expect(invitationResponse.body.data.recommender.professional_email).toBe('recommender@test.com');

      const recommenderId = invitationResponse.body.data.recommender.id;

      // Step 2: Get application recommenders
      const recommendersResponse = await request(app)
        .get(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(recommendersResponse.status).toBe(200);
      expect(recommendersResponse.body.success).toBe(true);
      expect(recommendersResponse.body.data).toHaveLength(1);
      expect(recommendersResponse.body.data[0].status).toBe('invited');

      // Step 3: Get invitation details (simulate recommender clicking link)
      // First, we need to get the invitation token from the database
      const tokenQuery = await db.query(
        'SELECT invitation_token FROM recommenders WHERE id = $1',
        [recommenderId]
      );
      const invitationToken = tokenQuery.rows[0].invitation_token;

      const detailsResponse = await request(app)
        .get(`/api/invitations/${invitationToken}`);

      expect(detailsResponse.status).toBe(200);
      expect(detailsResponse.body.success).toBe(true);
      expect(detailsResponse.body.data.recommender.professional_email).toBe('recommender@test.com');
      expect(detailsResponse.body.data.application.legal_name).toBe('Test Student');
      expect(detailsResponse.body.data.status).toBe('invited');

      // Step 4: Confirm invitation (simulate recommender completing profile)
      const confirmResponse = await request(app)
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

      expect(confirmResponse.status).toBe(201);
      expect(confirmResponse.body.success).toBe(true);
      expect(confirmResponse.body.data.recommender.title).toBe('Professor');
      expect(confirmResponse.body.data.recommender.organization).toBe('Test University');
      expect(confirmResponse.body.data.recommender.confirmed_at).toBeTruthy();

      // Step 5: Verify recommender status is updated
      const updatedRecommendersResponse = await request(app)
        .get(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(updatedRecommendersResponse.status).toBe(200);
      expect(updatedRecommendersResponse.body.data[0].status).toBe('confirmed');
      expect(updatedRecommendersResponse.body.data[0].title).toBe('Professor');
      expect(updatedRecommendersResponse.body.data[0].organization).toBe('Test University');
    });

    it('should handle resend invitation', async () => {
      // Send initial invitation
      const invitationResponse = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      const recommenderId = invitationResponse.body.data.recommender.id;

      // Resend invitation
      const resendResponse = await request(app)
        .post(`/api/applications/${applicationId}/invitations/${recommenderId}/resend`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          custom_message: 'Reminder: Please write my recommendation.'
        });

      expect(resendResponse.status).toBe(200);
      expect(resendResponse.body.success).toBe(true);
      expect(resendResponse.body.message).toBe('Invitation resent successfully');
    });

    it('should handle delete invitation', async () => {
      // Send invitation
      const invitationResponse = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      const recommenderId = invitationResponse.body.data.recommender.id;

      // Delete invitation
      const deleteResponse = await request(app)
        .delete(`/api/applications/${applicationId}/invitations/${recommenderId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe('Invitation deleted successfully');

      // Verify invitation is deleted
      const recommendersResponse = await request(app)
        .get(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(recommendersResponse.body.data).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should prevent duplicate invitations', async () => {
      // Send first invitation
      await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      // Try to send duplicate invitation
      const duplicateResponse = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error.code).toBe('ALREADY_INVITED');
    });

    it('should handle invalid invitation token', async () => {
      const response = await request(app)
        .get('/api/invitations/invalid-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should validate required fields in confirmation', async () => {
      // Send invitation first
      const invitationResponse = await request(app)
        .post(`/api/applications/${applicationId}/invitations`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          recommender_email: 'recommender@test.com'
        });

      const recommenderId = invitationResponse.body.data.recommender.id;
      const tokenQuery = await db.query(
        'SELECT invitation_token FROM recommenders WHERE id = $1',
        [recommenderId]
      );
      const invitationToken = tokenQuery.rows[0].invitation_token;

      // Try to confirm with missing fields
      const confirmResponse = await request(app)
        .post(`/api/invitations/${invitationToken}/confirm`)
        .send({
          first_name: 'John',
          // Missing other required fields
        });

      expect(confirmResponse.status).toBe(400);
      expect(confirmResponse.body.success).toBe(false);
      expect(confirmResponse.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});