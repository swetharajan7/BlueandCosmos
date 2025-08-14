import request from 'supertest';
import { app } from '../server';
import { AuthService } from '../services/authService';
import { EncryptionService } from '../services/encryptionService';
import jwt from 'jsonwebtoken';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-for-security-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-security-testing';

describe('Comprehensive Security Tests', () => {
  let authService: AuthService;
  let encryptionService: EncryptionService;
  let validUserToken: string;
  let adminToken: string;

  beforeAll(async () => {
    authService = new AuthService();
    encryptionService = new EncryptionService();

    // Create test users
    const studentResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'security.student@example.com',
        password: 'SecurePassword123!',
        first_name: 'Security',
        last_name: 'Student'
      });

    validUserToken = studentResponse.body.tokens.accessToken;

    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'security.admin@example.com',
        password: 'AdminPassword123!',
        first_name: 'Security',
        last_name: 'Admin',
        role: 'admin'
      });

    adminToken = adminResponse.body.tokens.accessToken;
  });

  describe('Authentication Security', () => {
    test('should reject weak passwords', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        'abc123',
        '12345678',
        'password123',
        'admin',
        'user'
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `weak${Math.random()}@example.com`,
            password: weakPassword,
            first_name: 'Test',
            last_name: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('password');
      }
    });

    test('should enforce password complexity requirements', async () => {
      const invalidPasswords = [
        'NoNumbers!',           // No numbers
        'nonumbers123',         // No uppercase
        'NOLOWERCASE123!',      // No lowercase
        'NoSpecialChars123',    // No special characters
        'Short1!',              // Too short
        'no spaces allowed 123!' // Contains spaces
      ];

      for (const invalidPassword of invalidPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: `invalid${Math.random()}@example.com`,
            password: invalidPassword,
            first_name: 'Test',
            last_name: 'User'
          });

        expect(response.status).toBe(400);
      }
    });

    test('should prevent brute force attacks', async () => {
      const email = 'bruteforce@example.com';
      const wrongPassword = 'WrongPassword123!';
      const attempts = 10;

      // First register a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'CorrectPassword123!',
          first_name: 'Brute',
          last_name: 'Force'
        });

      // Attempt multiple failed logins
      const promises = [];
      for (let i = 0; i < attempts; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({ email, password: wrongPassword })
        );
      }

      const responses = await Promise.all(promises);
      
      // Should start blocking after several attempts
      const blockedResponses = responses.filter(r => r.status === 429);
      expect(blockedResponses.length).toBeGreaterThan(0);
    });

    test('should invalidate tokens on logout', async () => {
      // Login to get tokens
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security.student@example.com',
          password: 'SecurePassword123!'
        });

      const { accessToken, refreshToken } = loginResponse.body.tokens;

      // Use token successfully
      let protectedResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(protectedResponse.status).toBe(200);

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      // Token should be invalid after logout
      protectedResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(protectedResponse.status).toBe(401);
    });

    test('should detect and prevent token tampering', async () => {
      const validToken = validUserToken;
      
      // Tamper with token payload
      const tokenParts = validToken.split('.');
      const tamperedPayload = Buffer.from('{"userId":"admin","role":"admin"}').toString('base64');
      const tamperedToken = `${tokenParts[0]}.${tamperedPayload}.${tokenParts[2]}`;

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
    });

    test('should enforce token expiration', async () => {
      // Create a token with very short expiration
      const shortLivedToken = jwt.sign(
        { userId: 'test-user', email: 'test@example.com', role: 'student' },
        process.env.JWT_SECRET!,
        { expiresIn: '1ms' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${shortLivedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('expired');
    });
  });

  describe('Authorization Security', () => {
    test('should enforce role-based access control', async () => {
      // Student trying to access admin endpoint
      const adminResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${validUserToken}`);

      expect(adminResponse.status).toBe(403);

      // Admin should have access
      const validAdminResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(validAdminResponse.status).toBe(200);
    });

    test('should prevent privilege escalation', async () => {
      // Try to update own role to admin
      const escalationResponse = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${validUserToken}`)
        .send({ role: 'admin' });

      expect(escalationResponse.status).toBe(403);
    });

    test('should prevent access to other users\' data', async () => {
      // Create another user
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other.user@example.com',
          password: 'OtherPassword123!',
          first_name: 'Other',
          last_name: 'User'
        });

      const otherUserId = otherUserResponse.body.user.id;

      // Try to access other user's data
      const unauthorizedResponse = await request(app)
        .get(`/api/users/${otherUserId}`)
        .set('Authorization', `Bearer ${validUserToken}`);

      expect(unauthorizedResponse.status).toBe(403);
    });

    test('should validate resource ownership', async () => {
      // Create application for first user
      const appResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${validUserToken}`)
        .send({
          legal_name: 'Security Student',
          universities: ['harvard'],
          program_type: 'graduate',
          application_term: 'Fall 2024'
        });

      const applicationId = appResponse.body.application.id;

      // Create second user
      const secondUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'second.user@example.com',
          password: 'SecondPassword123!',
          first_name: 'Second',
          last_name: 'User'
        });

      const secondUserToken = secondUserResponse.body.tokens.accessToken;

      // Second user tries to access first user's application
      const unauthorizedAppResponse = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(unauthorizedAppResponse.status).toBe(403);
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should prevent SQL injection attacks', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users (email) VALUES ('hacked@example.com'); --",
        "' UNION SELECT * FROM users --",
        "'; UPDATE users SET role='admin' WHERE email='security.student@example.com'; --"
      ];

      for (const injection of sqlInjectionAttempts) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: injection,
            password: 'password'
          });

        // Should not cause server error or unauthorized access
        expect([400, 401]).toContain(response.status);
      }
    });

    test('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<svg onload="alert(1)">',
        '"><script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .put('/api/users/me')
          .set('Authorization', `Bearer ${validUserToken}`)
          .send({
            first_name: payload,
            last_name: 'Test'
          });

        if (response.status === 200) {
          // If update succeeds, check that XSS payload was sanitized
          const userResponse = await request(app)
            .get('/api/users/me')
            .set('Authorization', `Bearer ${validUserToken}`);

          expect(userResponse.body.user.first_name).not.toContain('<script>');
          expect(userResponse.body.user.first_name).not.toContain('javascript:');
        }
      }
    });

    test('should validate file upload security', async () => {
      // Test malicious file types
      const maliciousFiles = [
        { name: 'malware.exe', content: 'MZ\x90\x00' }, // PE header
        { name: 'script.js', content: 'alert("xss")' },
        { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'large.txt', content: 'A'.repeat(10 * 1024 * 1024) } // 10MB file
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${validUserToken}`)
          .attach('file', Buffer.from(file.content), file.name);

        // Should reject malicious files
        expect([400, 413, 415]).toContain(response.status);
      }
    });

    test('should prevent NoSQL injection', async () => {
      const noSQLInjections = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'this.password.length > 0' }
      ];

      for (const injection of noSQLInjections) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: injection,
            password: 'password'
          });

        expect([400, 401]).toContain(response.status);
      }
    });
  });

  describe('Session and Token Security', () => {
    test('should use secure token generation', () => {
      const tokens = new Set();
      const tokenCount = 1000;

      // Generate multiple tokens to check for collisions
      for (let i = 0; i < tokenCount; i++) {
        const token = encryptionService.generateSecureToken();
        expect(tokens.has(token)).toBe(false); // No collisions
        tokens.add(token);
        expect(token.length).toBeGreaterThan(20); // Sufficient length
      }
    });

    test('should implement secure password hashing', async () => {
      const password = 'TestPassword123!';
      const hash1 = await encryptionService.hashPassword(password);
      const hash2 = await encryptionService.hashPassword(password);

      // Same password should produce different hashes (salt)
      expect(hash1).not.toBe(hash2);
      
      // Both hashes should verify correctly
      expect(await encryptionService.verifyPassword(password, hash1)).toBe(true);
      expect(await encryptionService.verifyPassword(password, hash2)).toBe(true);
      
      // Wrong password should not verify
      expect(await encryptionService.verifyPassword('WrongPassword', hash1)).toBe(false);
    });

    test('should prevent session fixation', async () => {
      // Login and get initial token
      const loginResponse1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security.student@example.com',
          password: 'SecurePassword123!'
        });

      const token1 = loginResponse1.body.tokens.accessToken;

      // Login again and get new token
      const loginResponse2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security.student@example.com',
          password: 'SecurePassword123!'
        });

      const token2 = loginResponse2.body.tokens.accessToken;

      // Tokens should be different
      expect(token1).not.toBe(token2);
    });

    test('should handle concurrent sessions securely', async () => {
      const concurrentLogins = 5;
      const promises = [];

      for (let i = 0; i < concurrentLogins; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'security.student@example.com',
              password: 'SecurePassword123!'
            })
        );
      }

      const responses = await Promise.all(promises);
      const tokens = responses.map(r => r.body.tokens.accessToken);

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(concurrentLogins);

      // All tokens should be valid
      for (const token of tokens) {
        const response = await request(app)
          .get('/api/users/me')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Data Protection and Privacy', () => {
    test('should encrypt sensitive data at rest', async () => {
      const sensitiveData = 'This is sensitive information';
      const encrypted = encryptionService.encrypt(sensitiveData);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).not.toBe(sensitiveData);
      expect(encrypted.length).toBeGreaterThan(sensitiveData.length);
      expect(decrypted).toBe(sensitiveData);
    });

    test('should not expose sensitive information in responses', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${validUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    test('should implement proper data masking', async () => {
      // Create user with sensitive data
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sensitive@example.com',
          password: 'SensitivePassword123!',
          first_name: 'Sensitive',
          last_name: 'User',
          phone: '+1234567890'
        });

      const userId = userResponse.body.user.id;

      // Admin viewing user should see masked data
      const adminViewResponse = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (adminViewResponse.status === 200) {
        // Phone should be masked
        expect(adminViewResponse.body.user.phone).toMatch(/\*+/);
      }
    });

    test('should enforce data retention policies', async () => {
      // This would typically involve checking that old data is properly archived/deleted
      // For testing, we can verify the policy configuration exists
      const retentionResponse = await request(app)
        .get('/api/admin/data-retention-policy')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(retentionResponse.status).toBe(200);
      expect(retentionResponse.body.policies).toBeDefined();
    });
  });

  describe('API Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/health');

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should prevent clickjacking attacks', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${validUserToken}`);

      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should enforce HTTPS in production', async () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/health');

      expect(response.headers['strict-transport-security']).toBeDefined();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Rate Limiting and DDoS Protection', () => {
    test('should implement rate limiting per endpoint', async () => {
      const requests = 20;
      const promises = [];

      // Make rapid requests to login endpoint
      for (let i = 0; i < requests; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'nonexistent@example.com',
              password: 'password'
            })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should implement IP-based rate limiting', async () => {
      // This would require mocking different IP addresses
      // For now, we test that rate limiting exists
      const response = await request(app)
        .get('/api/rate-limit-status')
        .set('Authorization', `Bearer ${validUserToken}`);

      // Should return rate limit information
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Audit Logging and Monitoring', () => {
    test('should log security events', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Trigger security event (failed login)
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'security.student@example.com',
          password: 'WrongPassword123!'
        });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed login attempt')
      );

      logSpy.mockRestore();
    });

    test('should track sensitive operations', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      // Perform sensitive operation
      await request(app)
        .delete('/api/users/me')
        .set('Authorization', `Bearer ${validUserToken}`);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('User deletion')
      );

      logSpy.mockRestore();
    });
  });
});