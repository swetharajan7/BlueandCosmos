import request from 'supertest';
import app from '../server';

describe('Basic Security Tests', () => {
  describe('Security Headers', () => {
    it('should include basic security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to endpoints', async () => {
      // Make a request to check rate limiting is active
      const response = await request(app).get('/health');
      
      // Should have rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should sanitize malicious input', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
          firstName: maliciousInput,
          lastName: 'User'
        });

      // Should not contain script tags in response
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });
  });

  describe('CORS Configuration', () => {
    it('should have CORS headers configured', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});