import request from 'supertest';
import app from '../server';
import { authService } from '../services/authService';
import { redisClient } from '../config/redis';

describe('Security Middleware Tests', () => {
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Create test user
    testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'student',
      first_name: 'Test',
      last_name: 'User',
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const tokens = await authService.generateTokens(testUser);
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
  });

  afterAll(async () => {
    // Clean up test data
    await redisClient.flushDb();
  });

  describe('HTTPS Enforcement', () => {
    it('should redirect HTTP to HTTPS in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/health')
        .set('x-forwarded-proto', 'http')
        .set('host', 'example.com');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('https://example.com/health');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not redirect in development', async () => {
      const response = await request(app)
        .get('/health')
        .set('x-forwarded-proto', 'http');

      expect(response.status).toBe(200);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should include HSTS header in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/health');

      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Rate Limiting', () => {
    it('should apply general rate limiting', async () => {
      // Make multiple requests to trigger rate limiting
      const requests = Array(102).fill(null).map(() => 
        request(app).get('/health')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should apply strict rate limiting to auth endpoints', async () => {
      // Make multiple requests to auth endpoint
      const requests = Array(6).fill(null).map(() => 
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'password' })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: maliciousInput,
          lastName: 'User'
        });

      // Should not contain script tags
      expect(JSON.stringify(response.body)).not.toContain('<script>');
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: sqlInjection,
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Token Security', () => {
    it('should validate access tokens', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should be authenticated (may fail due to other reasons but not auth)
      expect(response.status).not.toBe(401);
    });

    it('should validate refresh tokens against Redis', async () => {
      const decoded = await authService.verifyRefreshToken(refreshToken);
      expect(decoded.userId).toBe(testUser.id);
    });
  });

  describe('Session Management', () => {
    it('should handle session headers', async () => {
      const response = await request(app)
        .get('/api/applications')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Session-ID', 'test-session-id');

      // Should process the session header
      expect(response.status).not.toBe(500);
    });
  });

  describe('DDoS Protection', () => {
    it('should block suspicious user agents', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'malicious-bot/1.0');

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('SUSPICIOUS_ACTIVITY');
    });

    it('should allow legitimate search engine bots', async () => {
      const response = await request(app)
        .get('/health')
        .set('User-Agent', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');

      expect(response.status).toBe(200);
    });
  });

  describe('Request Size Limiting', () => {
    it('should reject oversized requests', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/auth/register')
        .send({ data: largePayload });

      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe('REQUEST_TOO_LARGE');
    });
  });

  describe('CORS Security', () => {
    it('should enforce CORS policy', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://malicious-site.com')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });

    it('should allow configured origins', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', process.env.FRONTEND_URL || 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
    });
  });
});

describe('Authentication Security Tests', () => {
  describe('JWT Security', () => {
    it('should use secure JWT configuration', () => {
      const token = authService.generateAccessToken({
        id: 'test-id',
        email: 'test@example.com',
        role: 'student',
        first_name: 'Test',
        last_name: 'User',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      const decoded = authService.verifyAccessToken(token);
      expect(decoded.userId).toBe('test-id');
      expect(decoded.email).toBe('test@example.com');
    });

    it('should have short access token expiry', () => {
      const token = authService.generateAccessToken({
        id: 'test-id',
        email: 'test@example.com',
        role: 'student',
        first_name: 'Test',
        last_name: 'User',
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      const decoded = authService.verifyAccessToken(token);
      const expiryTime = decoded.exp! - decoded.iat!;
      
      // Should expire in 15 minutes (900 seconds)
      expect(expiryTime).toBe(900);
    });
  });

  describe('Password Security', () => {
    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'qwerty',
        '12345678',
        'abc123'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password,
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
      }
    });
  });
});