import request from 'supertest';
import { app } from '../server';
import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database';

describe('End-to-End User Workflows', () => {
  let db: Pool;
  let studentToken: string;
  let recommenderToken: string;
  let applicationId: string;
  let invitationToken: string;

  beforeAll(async () => {
    // Setup test database
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'stellarrec_e2e_test';
    db = new Pool(DatabaseConfig.getConfig());
    
    // Clear test data
    await db.query('DELETE FROM submissions');
    await db.query('DELETE FROM recommendations');
    await db.query('DELETE FROM recommenders');
    await db.query('DELETE FROM applications');
    await db.query('DELETE FROM users');
  });

  afterAll(async () => {
    await db.end();
  });

  describe('Complete Student Application Workflow', () => {
    test('1. Student Registration and Login', async () => {
      // Student registration
      const registrationData = {
        email: 'student.e2e@example.com',
        password: 'SecurePassword123!',
        first_name: 'John',
        last_name: 'Doe',
        phone: '+1234567890'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(registrationData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.user.email).toBe(registrationData.email);
      expect(registerResponse.body.tokens.accessToken).toBeDefined();

      // Student login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.tokens.accessToken).toBeDefined();
      
      studentToken = loginResponse.body.tokens.accessToken;
    });

    test('2. Create Application with University Selection', async () => {
      const applicationData = {
        legal_name: 'John Doe',
        universities: ['harvard', 'mit', 'stanford'],
        program_type: 'graduate',
        application_term: 'Fall 2024'
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(applicationData);

      expect(response.status).toBe(201);
      expect(response.body.application.universities).toEqual(applicationData.universities);
      expect(response.body.application.google_doc_id).toBeDefined();
      
      applicationId = response.body.application.id;
    });

    test('3. Send Recommender Invitation', async () => {
      const invitationData = {
        recommender_email: 'professor.e2e@example.com',
        recommender_name: 'Prof. Smith',
        relationship_type: 'Academic Advisor',
        relationship_duration: '2-3 years'
      };

      const response = await request(app)
        .post(`/api/applications/${applicationId}/recommenders`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(invitationData);

      expect(response.status).toBe(201);
      expect(response.body.invitation.email).toBe(invitationData.recommender_email);
      expect(response.body.invitation.token).toBeDefined();
      
      invitationToken = response.body.invitation.token;
    });

    test('4. Check Application Status', async () => {
      const response = await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status.overall).toBe('pending_recommendations');
      expect(response.body.status.universities).toBeDefined();
      expect(response.body.status.recommendations).toBeDefined();
    });
  });

  describe('Complete Recommender Workflow', () => {
    test('1. Recommender Access via Invitation', async () => {
      const response = await request(app)
        .get(`/api/recommenders/invitation/${invitationToken}`);

      expect(response.status).toBe(200);
      expect(response.body.application.legal_name).toBe('John Doe');
      expect(response.body.application.universities).toEqual(['harvard', 'mit', 'stanford']);
    });

    test('2. Recommender Confirmation and Profile Setup', async () => {
      const confirmationData = {
        title: 'Professor',
        organization: 'Harvard University',
        mobile_phone: '+1987654321',
        professional_email: 'prof.smith@harvard.edu',
        applicant_confirmed: true
      };

      const response = await request(app)
        .post('/api/recommenders/confirm')
        .send({
          invitation_token: invitationToken,
          ...confirmationData
        });

      expect(response.status).toBe(200);
      expect(response.body.recommender.title).toBe(confirmationData.title);
      expect(response.body.tokens.accessToken).toBeDefined();
      
      recommenderToken = response.body.tokens.accessToken;
    });

    test('3. AI-Assisted Recommendation Writing', async () => {
      // Generate outline
      const outlineResponse = await request(app)
        .post('/api/ai/generate-outline')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          applicant_name: 'John Doe',
          program_type: 'graduate',
          relationship_type: 'Academic Advisor',
          relationship_duration: '2-3 years'
        });

      expect(outlineResponse.status).toBe(200);
      expect(outlineResponse.body.outline).toBeDefined();
      expect(outlineResponse.body.outline).toContain('Introduction');

      // Get example phrases
      const examplesResponse = await request(app)
        .post('/api/ai/suggest-examples')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          program_type: 'graduate',
          relationship_type: 'Academic Advisor'
        });

      expect(examplesResponse.status).toBe(200);
      expect(Array.isArray(examplesResponse.body.examples)).toBe(true);
    });

    test('4. Write and Submit Recommendation', async () => {
      const recommendationContent = `
        I am pleased to provide this strong recommendation for John Doe, whom I have known for over two years as his academic advisor. 
        
        John has consistently demonstrated exceptional analytical skills and research capabilities throughout his undergraduate studies. 
        His work on machine learning applications in healthcare resulted in a publication in a peer-reviewed journal, 
        showcasing his ability to conduct independent research at a graduate level.
        
        In my experience working with hundreds of students, John ranks in the top 5% for intellectual curiosity and academic performance. 
        His GPA of 3.9 reflects his consistent excellence across diverse coursework in computer science and mathematics.
        
        John's leadership qualities are evident through his role as president of the Computer Science Student Association, 
        where he organized technical workshops that benefited over 200 students. His communication skills, both written and verbal, 
        are exceptional, as demonstrated through his teaching assistant role in advanced algorithms.
        
        I recommend John without reservation for graduate study. His combination of technical expertise, research experience, 
        and leadership potential make him an ideal candidate for your program.
      `;

      // Create recommendation
      const createResponse = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          application_id: applicationId,
          content: recommendationContent
        });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.recommendation.content).toBe(recommendationContent);
      expect(createResponse.body.recommendation.word_count).toBeGreaterThan(0);

      const recommendationId = createResponse.body.recommendation.id;

      // Analyze quality
      const qualityResponse = await request(app)
        .post('/api/ai/analyze-quality')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({ content: recommendationContent });

      expect(qualityResponse.status).toBe(200);
      expect(qualityResponse.body.analysis.score).toBeGreaterThan(7);
      expect(qualityResponse.body.analysis.hasSpecificExamples).toBe(true);

      // Submit recommendation
      const submitResponse = await request(app)
        .post(`/api/recommendations/${recommendationId}/submit`)
        .set('Authorization', `Bearer ${recommenderToken}`);

      expect(submitResponse.status).toBe(200);
      expect(submitResponse.body.submissions).toBeDefined();
      expect(submitResponse.body.submissions.length).toBe(3); // Harvard, MIT, Stanford
    });
  });

  describe('University Submission and Status Tracking', () => {
    test('1. Check Submission Status', async () => {
      // Wait a moment for async processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status.overall).toBe('submitted');
      
      const universityStatuses = response.body.status.universities;
      expect(universityStatuses.harvard).toBeDefined();
      expect(universityStatuses.mit).toBeDefined();
      expect(universityStatuses.stanford).toBeDefined();
      
      // At least some submissions should be in progress or completed
      const statusValues = Object.values(universityStatuses);
      expect(statusValues.some((status: any) => 
        status.status === 'submitted' || status.status === 'confirmed'
      )).toBe(true);
    });

    test('2. Verify Email Notifications Sent', async () => {
      // Check that confirmation emails were triggered
      const notificationsResponse = await request(app)
        .get(`/api/applications/${applicationId}/notifications`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(notificationsResponse.status).toBe(200);
      expect(notificationsResponse.body.notifications.length).toBeGreaterThan(0);
      
      const confirmationEmails = notificationsResponse.body.notifications.filter(
        (n: any) => n.type === 'submission_confirmation'
      );
      expect(confirmationEmails.length).toBeGreaterThan(0);
    });

    test('3. Admin Dashboard Access', async () => {
      // Create admin user for testing
      const adminData = {
        email: 'admin.e2e@example.com',
        password: 'AdminPassword123!',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      };

      const adminRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(adminData);

      const adminToken = adminRegisterResponse.body.tokens.accessToken;

      // Check admin dashboard
      const dashboardResponse = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(dashboardResponse.status).toBe(200);
      expect(dashboardResponse.body.stats.totalApplications).toBeGreaterThan(0);
      expect(dashboardResponse.body.stats.totalSubmissions).toBeGreaterThan(0);
      expect(dashboardResponse.body.recentActivity).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('1. Handle Invalid Application Data', async () => {
      const invalidData = {
        legal_name: '', // Empty name
        universities: [], // No universities
        program_type: 'invalid_type',
        application_term: ''
      };

      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('validation');
    });

    test('2. Handle Expired Invitation Token', async () => {
      // Create expired invitation
      const expiredToken = 'expired_token_123';
      await db.query(`
        INSERT INTO recommenders (user_id, title, organization, relationship_duration, 
                                relationship_type, professional_email, invitation_token, invitation_expires)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['temp-user-id', 'Prof', 'University', '1 year', 'Advisor', 'prof@uni.edu', 
          expiredToken, new Date(Date.now() - 24 * 60 * 60 * 1000)]); // Expired yesterday

      const response = await request(app)
        .get(`/api/recommenders/invitation/${expiredToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('expired');
    });

    test('3. Handle Unauthorized Access', async () => {
      const response = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    test('4. Handle University Submission Failures', async () => {
      // Mock university API failure
      const mockFailureData = {
        university_id: 'mock_failure_university',
        error: 'API temporarily unavailable'
      };

      // This would typically be handled by the submission service
      // For testing, we can check the retry mechanism
      const retryResponse = await request(app)
        .post('/api/admin/retry-submission')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ submission_id: 'mock_submission_id' });

      // Should handle gracefully even if submission doesn't exist
      expect([200, 404]).toContain(retryResponse.status);
    });
  });

  describe('Performance and Concurrency', () => {
    test('1. Handle Multiple Concurrent Registrations', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const registrationData = {
          email: `concurrent${i}@example.com`,
          password: 'ConcurrentPassword123!',
          first_name: `User${i}`,
          last_name: 'Test'
        };

        promises.push(
          request(app)
            .post('/api/auth/register')
            .send(registrationData)
        );
      }

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all users were created
      const userCount = await db.query('SELECT COUNT(*) FROM users WHERE email LIKE $1', ['concurrent%@example.com']);
      expect(parseInt(userCount.rows[0].count)).toBe(concurrentRequests);
    });

    test('2. Handle Large Recommendation Content', async () => {
      // Create a large recommendation (close to 1000 words)
      const largeContent = 'This is a comprehensive recommendation. '.repeat(100) + 
                          'The student demonstrates exceptional capabilities in multiple areas. '.repeat(50);

      const response = await request(app)
        .post('/api/recommendations')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          application_id: applicationId,
          content: largeContent
        });

      expect(response.status).toBe(201);
      expect(response.body.recommendation.word_count).toBeGreaterThan(500);
    });

    test('3. Database Connection Pool Under Load', async () => {
      const concurrentQueries = 20;
      const promises = [];

      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          request(app)
            .get('/api/universities')
            .set('Authorization', `Bearer ${studentToken}`)
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('1. Verify Application-Recommendation Relationship', async () => {
      const applicationResponse = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(applicationResponse.status).toBe(200);
      
      const recommendationsResponse = await request(app)
        .get(`/api/applications/${applicationId}/recommendations`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(recommendationsResponse.status).toBe(200);
      expect(recommendationsResponse.body.recommendations.length).toBeGreaterThan(0);
      
      // Verify relationship integrity
      recommendationsResponse.body.recommendations.forEach((rec: any) => {
        expect(rec.application_id).toBe(applicationId);
      });
    });

    test('2. Verify Cascade Deletion', async () => {
      // Create a test user with application
      const testUserData = {
        email: 'cascade.test@example.com',
        password: 'TestPassword123!',
        first_name: 'Cascade',
        last_name: 'Test'
      };

      const userResponse = await request(app)
        .post('/api/auth/register')
        .send(testUserData);

      const testToken = userResponse.body.tokens.accessToken;
      const testUserId = userResponse.body.user.id;

      // Create application
      const appResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          legal_name: 'Cascade Test',
          universities: ['harvard'],
          program_type: 'graduate',
          application_term: 'Fall 2024'
        });

      const testAppId = appResponse.body.application.id;

      // Delete user
      await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${testToken}`);

      // Verify application was cascade deleted
      const deletedAppResponse = await request(app)
        .get(`/api/applications/${testAppId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(deletedAppResponse.status).toBe(404);
    });
  });
});