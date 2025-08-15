import request from 'supertest';
import { app } from '../server';

describe('Usability Testing Suite', () => {
  describe('User Experience Flow Tests', () => {
    it('should complete student registration flow smoothly', async () => {
      const startTime = Date.now();
      
      // Step 1: Register new student
      const registrationResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'usability.test@example.com',
          password: 'TestPassword123!',
          firstName: 'Usability',
          lastName: 'Test',
          role: 'student'
        });

      expect(registrationResponse.status).toBe(201);
      expect(registrationResponse.body.user).toBeDefined();
      
      const registrationTime = Date.now() - startTime;
      expect(registrationTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Step 2: Login with new credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'usability.test@example.com',
          password: 'TestPassword123!'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.token).toBeDefined();
      
      const token = loginResponse.body.token;

      // Step 3: Create application
      const applicationResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({
          legalName: 'Usability Test Student',
          universities: ['harvard', 'stanford'],
          programType: 'graduate',
          applicationTerm: 'Fall 2026'
        });

      expect(applicationResponse.status).toBe(201);
      expect(applicationResponse.body.application).toBeDefined();

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(10000); // Complete flow should take less than 10 seconds
    });

    it('should handle recommender invitation flow intuitively', async () => {
      const startTime = Date.now();

      // Step 1: Student sends invitation
      const invitationResponse = await request(app)
        .post('/api/invitations')
        .send({
          applicationId: 'test-app-id',
          recommenderEmail: 'recommender@university.edu',
          recommenderName: 'Dr. Test Recommender'
        });

      expect(invitationResponse.status).toBe(201);
      expect(invitationResponse.body.invitation).toBeDefined();

      const invitationToken = invitationResponse.body.invitation.token;

      // Step 2: Recommender accesses invitation
      const accessResponse = await request(app)
        .get(`/api/recommenders/invitation/${invitationToken}`);

      expect(accessResponse.status).toBe(200);
      expect(accessResponse.body.application).toBeDefined();

      // Step 3: Recommender confirms details
      const confirmationResponse = await request(app)
        .post('/api/recommenders/confirm')
        .send({
          token: invitationToken,
          title: 'Professor',
          organization: 'Test University',
          relationshipDuration: '2 years',
          relationshipType: 'Academic Advisor'
        });

      expect(confirmationResponse.status).toBe(200);

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(8000); // Should complete within 8 seconds
    });
  });

  describe('Error Handling and User Feedback Tests', () => {
    it('should provide clear error messages for invalid input', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // Too short
          firstName: '',
          lastName: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('email');
      expect(response.body.error.message).toContain('password');
      expect(response.body.error.details).toBeDefined();
      
      // Error message should be user-friendly
      expect(response.body.error.message).not.toContain('SQL');
      expect(response.body.error.message).not.toContain('database');
      expect(response.body.error.message).not.toContain('undefined');
    });

    it('should provide helpful validation feedback', async () => {
      const response = await request(app)
        .post('/api/applications')
        .send({
          legalName: '',
          universities: [],
          programType: 'invalid-type',
          applicationTerm: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toBeDefined();
      
      const details = response.body.error.details;
      expect(details).toHaveProperty('legalName');
      expect(details).toHaveProperty('universities');
      expect(details).toHaveProperty('programType');
      expect(details).toHaveProperty('applicationTerm');
    });

    it('should handle network timeouts gracefully', async () => {
      // Simulate a slow request
      const response = await request(app)
        .post('/api/ai/generate-outline')
        .timeout(1000) // 1 second timeout
        .send({
          content: 'Test content for outline generation'
        })
        .catch(err => err);

      // Should either complete successfully or provide a timeout error
      if (response.status) {
        expect([200, 408, 504]).toContain(response.status);
      } else {
        expect(response.code).toBe('ECONNABORTED');
      }
    });
  });

  describe('Accessibility and Responsive Design Tests', () => {
    it('should return proper content types for different endpoints', async () => {
      const endpoints = [
        { path: '/api/universities', expectedType: 'application/json' },
        { path: '/api/health', expectedType: 'application/json' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint.path);
        
        if (response.status === 200) {
          expect(response.headers['content-type']).toContain(endpoint.expectedType);
        }
      }
    });

    it('should support CORS for frontend integration', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('Performance and Responsiveness Tests', () => {
    it('should respond quickly to common operations', async () => {
      const operations = [
        { method: 'GET', path: '/api/universities', maxTime: 1000 },
        { method: 'GET', path: '/api/health', maxTime: 500 },
        { method: 'POST', path: '/api/auth/verify-token', maxTime: 1000 }
      ];

      for (const operation of operations) {
        const startTime = Date.now();
        
        let response;
        if (operation.method === 'GET') {
          response = await request(app).get(operation.path);
        } else {
          response = await request(app).post(operation.path).send({});
        }

        const responseTime = Date.now() - startTime;
        
        console.log(`${operation.method} ${operation.path}: ${responseTime}ms`);
        expect(responseTime).toBeLessThan(operation.maxTime);
      }
    });

    it('should handle large data sets efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/universities')
        .query({ limit: 1000 });

      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        expect(responseTime).toBeLessThan(3000); // Should handle large datasets within 3 seconds
        expect(response.body.universities).toBeDefined();
      }
    });
  });

  describe('Data Consistency and Integrity Tests', () => {
    it('should maintain data consistency across operations', async () => {
      // Create an application
      const createResponse = await request(app)
        .post('/api/applications')
        .send({
          legalName: 'Consistency Test',
          universities: ['harvard', 'mit'],
          programType: 'graduate',
          applicationTerm: 'Fall 2026'
        });

      if (createResponse.status === 201) {
        const applicationId = createResponse.body.application.id;

        // Retrieve the application
        const getResponse = await request(app)
          .get(`/api/applications/${applicationId}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.application.legalName).toBe('Consistency Test');
        expect(getResponse.body.application.universities).toHaveLength(2);

        // Update the application
        const updateResponse = await request(app)
          .put(`/api/applications/${applicationId}`)
          .send({
            legalName: 'Updated Consistency Test',
            universities: ['harvard', 'mit', 'stanford'],
            programType: 'graduate',
            applicationTerm: 'Fall 2026'
          });

        if (updateResponse.status === 200) {
          // Verify the update
          const verifyResponse = await request(app)
            .get(`/api/applications/${applicationId}`);

          expect(verifyResponse.status).toBe(200);
          expect(verifyResponse.body.application.legalName).toBe('Updated Consistency Test');
          expect(verifyResponse.body.application.universities).toHaveLength(3);
        }
      }
    });

    it('should handle concurrent data modifications safely', async () => {
      const applicationId = 'test-concurrent-app-id';
      
      // Simulate concurrent updates
      const updates = Array(10).fill(null).map((_, index) =>
        request(app)
          .put(`/api/applications/${applicationId}`)
          .send({
            legalName: `Concurrent Test ${index}`,
            universities: ['harvard'],
            programType: 'graduate',
            applicationTerm: 'Fall 2026'
          })
      );

      const responses = await Promise.all(updates);
      
      // Should handle concurrent updates without data corruption
      const successfulUpdates = responses.filter(r => r.status === 200);
      const conflictResponses = responses.filter(r => r.status === 409);
      
      expect(successfulUpdates.length + conflictResponses.length).toBe(10);
    });
  });

  describe('User Journey Completion Tests', () => {
    it('should support complete end-to-end user journey', async () => {
      const journeyStartTime = Date.now();
      
      // 1. Student registers
      const studentRegister = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'journey.test@example.com',
          password: 'JourneyTest123!',
          firstName: 'Journey',
          lastName: 'Test',
          role: 'student'
        });

      expect(studentRegister.status).toBe(201);
      
      // 2. Student logs in
      const studentLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'journey.test@example.com',
          password: 'JourneyTest123!'
        });

      expect(studentLogin.status).toBe(200);
      const studentToken = studentLogin.body.token;

      // 3. Student creates application
      const createApp = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          legalName: 'Journey Test Student',
          universities: ['harvard', 'stanford'],
          programType: 'graduate',
          applicationTerm: 'Fall 2026'
        });

      expect(createApp.status).toBe(201);
      const applicationId = createApp.body.application.id;

      // 4. Student invites recommender
      const inviteRecommender = await request(app)
        .post('/api/invitations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          applicationId: applicationId,
          recommenderEmail: 'journey.recommender@university.edu',
          recommenderName: 'Dr. Journey Recommender'
        });

      expect(inviteRecommender.status).toBe(201);

      // 5. Student checks status
      const checkStatus = await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(checkStatus.status).toBe(200);
      expect(checkStatus.body.status).toBeDefined();

      const totalJourneyTime = Date.now() - journeyStartTime;
      console.log(`Complete user journey completed in: ${totalJourneyTime}ms`);
      
      expect(totalJourneyTime).toBeLessThan(15000); // Complete journey should take less than 15 seconds
    });
  });
});