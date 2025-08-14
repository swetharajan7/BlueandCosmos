import request from 'supertest';
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { validationMiddleware } from '../middleware/validation';
import { securityMiddleware } from '../middleware/security';
import { complianceMiddleware } from '../middleware/compliance';
import { AuthService } from '../services/authService';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';

describe('Middleware Tests', () => {
  let app: express.Application;
  let authService: AuthService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    authService = new AuthService();
  });

  describe('Auth Middleware', () => {
    test('should allow access with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'student' as const,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const token = authService.generateAccessToken(mockUser);

      app.get('/protected', authMiddleware, (req, res) => {
        res.json({ message: 'Access granted', user: req.user });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Access granted');
      expect(response.body.user.userId).toBe(mockUser.id);
    });

    test('should reject request without token', async () => {
      app.get('/protected', authMiddleware, (req, res) => {
        res.json({ message: 'Access granted' });
      });

      const response = await request(app).get('/protected');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('token');
    });

    test('should reject request with invalid token', async () => {
      app.get('/protected', authMiddleware, (req, res) => {
        res.json({ message: 'Access granted' });
      });

      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    test('should enforce role-based access', async () => {
      const studentUser = {
        id: 'user-123',
        email: 'student@example.com',
        first_name: 'Student',
        last_name: 'User',
        role: 'student' as const,
        is_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const token = authService.generateAccessToken(studentUser);

      app.get('/admin-only', authMiddleware, (req, res, next) => {
        if (req.user?.role !== 'admin') {
          return res.status(403).json({ error: { message: 'Admin access required' } });
        }
        next();
      }, (req, res) => {
        res.json({ message: 'Admin access granted' });
      });

      const response = await request(app)
        .get('/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Admin access required');
    });
  });

  describe('Validation Middleware', () => {
    test('should validate required fields', async () => {
      const validationRules = [
        { field: 'email', required: true, type: 'email' },
        { field: 'password', required: true, minLength: 8 }
      ];

      app.post('/validate', validationMiddleware(validationRules), (req, res) => {
        res.json({ message: 'Validation passed' });
      });

      const response = await request(app)
        .post('/validate')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('validation');
    });

    test('should pass with valid data', async () => {
      const validationRules = [
        { field: 'email', required: true, type: 'email' },
        { field: 'password', required: true, minLength: 8 }
      ];

      app.post('/validate', validationMiddleware(validationRules), (req, res) => {
        res.json({ message: 'Validation passed' });
      });

      const response = await request(app)
        .post('/validate')
        .send({ 
          email: 'test@example.com',
          password: 'securePassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Validation passed');
    });

    test('should sanitize input data', async () => {
      const validationRules = [
        { field: 'name', required: true, sanitize: true }
      ];

      app.post('/validate', validationMiddleware(validationRules), (req, res) => {
        res.json({ sanitizedName: req.body.name });
      });

      const response = await request(app)
        .post('/validate')
        .send({ name: '<script>alert("xss")</script>John' });

      expect(response.status).toBe(200);
      expect(response.body.sanitizedName).not.toContain('<script>');
    });
  });

  describe('Security Middleware', () => {
    test('should add security headers', async () => {
      app.use(securityMiddleware);
      app.get('/test', (req, res) => {
        res.json({ message: 'Test' });
      });

      const response = await request(app).get('/test');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    test('should enforce HTTPS in production', async () => {
      process.env.NODE_ENV = 'production';
      
      app.use(securityMiddleware);
      app.get('/test', (req, res) => {
        res.json({ message: 'Test' });
      });

      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'http');

      expect(response.status).toBe(301);
      
      process.env.NODE_ENV = 'test';
    });
  });

  describe('Compliance Middleware', () => {
    test('should log data access for FERPA compliance', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      app.use(complianceMiddleware);
      app.get('/student-data/:id', (req, res) => {
        res.json({ studentId: req.params.id });
      });

      await request(app).get('/student-data/123');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Data access logged')
      );

      logSpy.mockRestore();
    });

    test('should track consent for data processing', async () => {
      app.use(complianceMiddleware);
      app.post('/process-data', (req, res) => {
        res.json({ processed: true });
      });

      const response = await request(app)
        .post('/process-data')
        .send({ consent: true, dataType: 'recommendation' });

      expect(response.status).toBe(200);
    });
  });
});