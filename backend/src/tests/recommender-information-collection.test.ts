import request from 'supertest';
import app from '../server';
import { pool } from '../config/database';

describe('Recommender Information Collection', () => {
  let testToken: string;
  let testRecommenderId: string;
  let testApplicationId: string;
  let invitationToken: string;

  beforeAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM application_recommenders WHERE 1=1');
    await pool.query('DELETE FROM recommenders WHERE professional_email LIKE %test%');
    await pool.query('DELETE FROM applications WHERE legal_name LIKE %Test%');
    await pool.query('DELETE FROM users WHERE email LIKE %test%');
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM application_recommenders WHERE 1=1');
    await pool.query('DELETE FROM recommenders WHERE professional_email LIKE %test%');
    await pool.query('DELETE FROM applications WHERE legal_name LIKE %Test%');
    await pool.query('DELETE FROM users WHERE email LIKE %test%');
    await pool.end();
  });

  describe('Invitation Confirmation with Enhanced Validation', () => {
    beforeEach(async () => {
      // Create test student and application
      const studentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Test',
          last_name: 'Student',
          email: 'test.student@example.com',
          password: 'TestPassword123!',
          phone: '+1 (555) 123-4567'
        });

      testToken = studentResponse.body.data.token;

      const applicationResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          legal_name: 'Test Student',
          program_type: 'graduate',
          application_term: 'Fall 2025',
          universities: ['harvard', 'stanford']
        });

      testApplicationId = applicationResponse.body.data.id;

      // Create invitation
      const invitationResponse = await request(app)
        .post(`/api/applications/${testApplicationId}/recommenders`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          professional_email: 'test.recommender@university.edu',
          title: 'Professor',
          organization: 'Test University'
        });

      invitationToken = invitationResponse.body.data.invitation_token;
    });

    it('should validate professional title format', async () => {
      const response = await request(app)
        .post(`/api/recommender/invitation/${invitationToken}/confirm`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          title: 'Prof@#$%', // Invalid characters
          organization: 'Test University',
          relationship_duration: '2 - 3 years',
          relationship_type: 'Academic Advisor',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'title',
            msg: 'Title contains invalid characters'
          })
        ])
      );
    });

    it('should validate organization format', async () => {
      const response = await request(app)
        .post(`/api/recommender/invitation/${invitationToken}/confirm`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          title: 'Professor',
          organization: 'Test@#$%University', // Invalid characters
          relationship_duration: '2 - 3 years',
          relationship_type: 'Academic Advisor',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'organization',
            msg: 'Organization contains invalid characters'
          })
        ])
      );
    });

    it('should validate enhanced relationship types', async () => {
      const validTypes = [
        'Academic Advisor',
        'Professor/Instructor',
        'Research Supervisor',
        'Direct Manager',
        'Colleague',
        'Mentor',
        'Department Head',
        'Research Collaborator',
        'Thesis Committee Member',
        'Clinical Supervisor',
        'Other'
      ];

      for (const type of validTypes) {
        const response = await request(app)
          .post(`/api/recommender/invitation/${invitationToken}/confirm`)
          .send({
            first_name: 'John',
            last_name: 'Doe',
            title: 'Professor',
            organization: 'Test University',
            relationship_duration: '2 - 3 years',
            relationship_type: type,
            password: 'TestPassword123!'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.recommender.relationship_type).toBe(type);

        // Clean up for next iteration
        await pool.query('DELETE FROM recommenders WHERE professional_email = $1', 
          ['test.recommender@university.edu']);
        await pool.query('DELETE FROM users WHERE email = $1', 
          ['test.recommender@university.edu']);
      }
    });

    it('should validate phone number format', async () => {
      const invalidPhones = [
        '123', // Too short
        '12345678901234567890', // Too long
        'abc-def-ghij', // Non-numeric
        '123-45-6789' // Invalid format
      ];

      for (const phone of invalidPhones) {
        const response = await request(app)
          .post(`/api/recommender/invitation/${invitationToken}/confirm`)
          .send({
            first_name: 'John',
            last_name: 'Doe',
            title: 'Professor',
            organization: 'Test University',
            relationship_duration: '2 - 3 years',
            relationship_type: 'Academic Advisor',
            mobile_phone: phone,
            password: 'TestPassword123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should accept valid phone number formats', async () => {
      const validPhones = [
        '+1 (555) 123-4567',
        '(555) 123-4567',
        '+44 20 1234 5678',
        '+1-555-123-4567'
      ];

      for (const phone of validPhones) {
        const response = await request(app)
          .post(`/api/recommender/invitation/${invitationToken}/confirm`)
          .send({
            first_name: 'John',
            last_name: 'Doe',
            title: 'Professor',
            organization: 'Test University',
            relationship_duration: '2 - 3 years',
            relationship_type: 'Academic Advisor',
            mobile_phone: phone,
            password: 'TestPassword123!'
          });

        expect(response.status).toBe(201);
        expect(response.body.data.recommender.mobile_phone).toBe(phone);

        // Clean up for next iteration
        await pool.query('DELETE FROM recommenders WHERE professional_email = $1', 
          ['test.recommender@university.edu']);
        await pool.query('DELETE FROM users WHERE email = $1', 
          ['test.recommender@university.edu']);
      }
    });

    it('should enforce enhanced password requirements', async () => {
      const weakPasswords = [
        'password', // No uppercase, no number
        'PASSWORD', // No lowercase, no number
        'Password', // No number
        '12345678', // No letters
        'Pass1' // Too short
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post(`/api/recommender/invitation/${invitationToken}/confirm`)
          .send({
            first_name: 'John',
            last_name: 'Doe',
            title: 'Professor',
            organization: 'Test University',
            relationship_duration: '2 - 3 years',
            relationship_type: 'Academic Advisor',
            password: password
          });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should successfully create recommender with valid data', async () => {
      const response = await request(app)
        .post(`/api/recommender/invitation/${invitationToken}/confirm`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          title: 'Professor of Computer Science',
          organization: 'Test University & Research Institute',
          relationship_duration: '3 - 5 years',
          relationship_type: 'Research Supervisor',
          mobile_phone: '+1 (555) 123-4567',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recommender).toMatchObject({
        professional_email: 'test.recommender@university.edu',
        title: 'Professor of Computer Science',
        organization: 'Test University & Research Institute',
        relationship_duration: '3 - 5 years',
        relationship_type: 'Research Supervisor',
        mobile_phone: '+1 (555) 123-4567'
      });
      expect(response.body.data.recommender.confirmed_at).toBeTruthy();
      expect(response.body.message).toContain('Welcome to StellarRec™');
    });

    it('should prevent duplicate confirmation', async () => {
      // First confirmation
      await request(app)
        .post(`/api/recommender/invitation/${invitationToken}/confirm`)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          title: 'Professor',
          organization: 'Test University',
          relationship_duration: '2 - 3 years',
          relationship_type: 'Academic Advisor',
          password: 'TestPassword123!'
        });

      // Second confirmation attempt
      const response = await request(app)
        .post(`/api/recommender/invitation/${invitationToken}/confirm`)
        .send({
          first_name: 'Jane',
          last_name: 'Smith',
          title: 'Associate Professor',
          organization: 'Another University',
          relationship_duration: '1 - 2 years',
          relationship_type: 'Mentor',
          password: 'AnotherPassword123!'
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('ALREADY_CONFIRMED');
    });
  });

  describe('Profile Update with Enhanced Validation', () => {
    let recommenderToken: string;

    beforeEach(async () => {
      // Create and confirm recommender
      const studentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Test',
          last_name: 'Student',
          email: 'test.student2@example.com',
          password: 'TestPassword123!',
          phone: '+1 (555) 123-4567'
        });

      const applicationResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentResponse.body.data.token}`)
        .send({
          legal_name: 'Test Student 2',
          program_type: 'graduate',
          application_term: 'Fall 2025',
          universities: ['harvard']
        });

      const invitationResponse = await request(app)
        .post(`/api/applications/${applicationResponse.body.data.id}/recommenders`)
        .set('Authorization', `Bearer ${studentResponse.body.data.token}`)
        .send({
          professional_email: 'test.recommender2@university.edu',
          title: 'Professor',
          organization: 'Test University'
        });

      await request(app)
        .post(`/api/recommender/invitation/${invitationResponse.body.data.invitation_token}/confirm`)
        .send({
          first_name: 'Jane',
          last_name: 'Smith',
          title: 'Professor',
          organization: 'Test University',
          relationship_duration: '2 - 3 years',
          relationship_type: 'Academic Advisor',
          password: 'TestPassword123!'
        });

      const loginResponse = await request(app)
        .post('/api/recommender/login')
        .send({
          email: 'test.recommender2@university.edu',
          password: 'TestPassword123!'
        });

      recommenderToken = loginResponse.body.data.token;
    });

    it('should update profile with enhanced relationship types', async () => {
      const response = await request(app)
        .put('/api/recommender/profile')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          title: 'Department Head & Professor',
          organization: 'Advanced Research University',
          relationship_duration: 'More than 5 years',
          relationship_type: 'Department Head',
          mobile_phone: '+44 20 1234 5678'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        title: 'Department Head & Professor',
        organization: 'Advanced Research University',
        relationship_duration: 'More than 5 years',
        relationship_type: 'Department Head',
        mobile_phone: '+44 20 1234 5678'
      });
    });

    it('should validate phone number format on update', async () => {
      const response = await request(app)
        .put('/api/recommender/profile')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          mobile_phone: '123-invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Information Collection Workflow', () => {
    it('should provide comprehensive invitation details', async () => {
      // Create test data
      const studentResponse = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Test',
          last_name: 'Student',
          email: 'test.student3@example.com',
          password: 'TestPassword123!',
          phone: '+1 (555) 123-4567'
        });

      const applicationResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentResponse.body.data.token}`)
        .send({
          legal_name: 'Test Student 3',
          program_type: 'mba',
          application_term: 'Spring 2026',
          universities: ['harvard', 'stanford', 'wharton']
        });

      const invitationResponse = await request(app)
        .post(`/api/applications/${applicationResponse.body.data.id}/recommenders`)
        .set('Authorization', `Bearer ${studentResponse.body.data.token}`)
        .send({
          professional_email: 'test.recommender3@company.com',
          title: 'Senior Manager',
          organization: 'Tech Company Inc.'
        });

      // Get invitation details
      const detailsResponse = await request(app)
        .get(`/api/recommender/invitation/${invitationResponse.body.data.invitation_token}`);

      expect(detailsResponse.status).toBe(200);
      expect(detailsResponse.body.data).toMatchObject({
        recommender: {
          professional_email: 'test.recommender3@company.com',
          title: 'Senior Manager',
          organization: 'Tech Company Inc.'
        },
        application: {
          legal_name: 'Test Student 3',
          program_type: 'mba',
          application_term: 'Spring 2026',
          universities: expect.arrayContaining([
            expect.objectContaining({ name: expect.any(String) })
          ])
        },
        status: 'invited'
      });
    });
  });
});