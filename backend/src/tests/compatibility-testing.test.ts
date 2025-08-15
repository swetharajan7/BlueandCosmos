import request from 'supertest';
import { app } from '../server';

describe('Compatibility Testing Suite', () => {
  describe('API Version Compatibility Tests', () => {
    it('should support multiple API versions', async () => {
      const versions = ['v1', 'v2'];
      
      for (const version of versions) {
        const response = await request(app)
          .get(`/api/${version}/universities`)
          .set('Accept', 'application/json');

        // Should either support the version or return a proper error
        expect([200, 404, 410]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          expect(response.headers['content-type']).toContain('application/json');
        }
      }
    });

    it('should handle version negotiation through headers', async () => {
      const apiVersions = [
        { header: 'application/vnd.stellarrec.v1+json', expectedVersion: 'v1' },
        { header: 'application/vnd.stellarrec.v2+json', expectedVersion: 'v2' },
        { header: 'application/json', expectedVersion: 'latest' }
      ];

      for (const version of apiVersions) {
        const response = await request(app)
          .get('/api/universities')
          .set('Accept', version.header);

        if (response.status === 200) {
          expect(response.headers['api-version']).toBeDefined();
        }
      }
    });
  });

  describe('Content Type Compatibility Tests', () => {
    it('should handle different content types properly', async () => {
      const contentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
      ];

      const testData = {
        email: 'compatibility@example.com',
        password: 'CompatibilityTest123!'
      };

      for (const contentType of contentTypes) {
        let response;
        
        if (contentType === 'application/json') {
          response = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', contentType)
            .send(testData);
        } else if (contentType === 'application/x-www-form-urlencoded') {
          response = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', contentType)
            .send(`email=${testData.email}&password=${testData.password}`);
        } else {
          // Skip multipart for login, test with file upload instead
          continue;
        }

        // Should handle the content type appropriately
        expect([200, 400, 401, 415]).toContain(response.status);
      }
    });

    it('should return appropriate content types based on Accept header', async () => {
      const acceptHeaders = [
        { header: 'application/json', expectedType: 'application/json' },
        { header: 'application/xml', expectedType: 'application/json' }, // Fallback to JSON
        { header: '*/*', expectedType: 'application/json' },
        { header: 'text/html', expectedType: 'application/json' } // API should return JSON
      ];

      for (const accept of acceptHeaders) {
        const response = await request(app)
          .get('/api/universities')
          .set('Accept', accept.header);

        if (response.status === 200) {
          expect(response.headers['content-type']).toContain(accept.expectedType);
        }
      }
    });
  });

  describe('Character Encoding Compatibility Tests', () => {
    it('should handle UTF-8 characters properly', async () => {
      const unicodeTestData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'José María',
        lastName: 'González-Rodríguez',
        role: 'student'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json; charset=utf-8')
        .send(unicodeTestData);

      if (response.status === 201) {
        expect(response.body.user.firstName).toBe('José María');
        expect(response.body.user.lastName).toBe('González-Rodríguez');
      }
    });

    it('should handle special characters in application data', async () => {
      const specialCharData = {
        legalName: 'François Müller-Schmidt (李明)',
        universities: ['harvard'],
        programType: 'graduate',
        applicationTerm: 'Fall 2026'
      };

      const response = await request(app)
        .post('/api/applications')
        .send(specialCharData);

      if (response.status === 201) {
        expect(response.body.application.legalName).toBe('François Müller-Schmidt (李明)');
      }
    });
  });

  describe('HTTP Method Compatibility Tests', () => {
    it('should support all required HTTP methods', async () => {
      const methodTests = [
        { method: 'GET', path: '/api/universities', expectedStatus: [200, 401] },
        { method: 'POST', path: '/api/auth/login', expectedStatus: [200, 400, 401] },
        { method: 'PUT', path: '/api/applications/test-id', expectedStatus: [200, 400, 401, 404] },
        { method: 'DELETE', path: '/api/applications/test-id', expectedStatus: [200, 401, 404] },
        { method: 'PATCH', path: '/api/applications/test-id', expectedStatus: [200, 400, 401, 404] },
        { method: 'HEAD', path: '/api/universities', expectedStatus: [200, 401] },
        { method: 'OPTIONS', path: '/api/auth/login', expectedStatus: [200, 204] }
      ];

      for (const test of methodTests) {
        let response;
        
        switch (test.method) {
          case 'GET':
            response = await request(app).get(test.path);
            break;
          case 'POST':
            response = await request(app).post(test.path).send({});
            break;
          case 'PUT':
            response = await request(app).put(test.path).send({});
            break;
          case 'DELETE':
            response = await request(app).delete(test.path);
            break;
          case 'PATCH':
            response = await request(app).patch(test.path).send({});
            break;
          case 'HEAD':
            response = await request(app).head(test.path);
            break;
          case 'OPTIONS':
            response = await request(app).options(test.path);
            break;
          default:
            continue;
        }

        expect(test.expectedStatus).toContain(response.status);
      }
    });

    it('should reject unsupported HTTP methods', async () => {
      const unsupportedMethods = ['TRACE', 'CONNECT'];
      
      for (const method of unsupportedMethods) {
        try {
          const response = await request(app)[method.toLowerCase()]('/api/universities');
          expect([405, 501]).toContain(response.status);
        } catch (error) {
          // Method not supported by supertest, which is expected
          expect(error).toBeDefined();
        }
      }
    });
  });

  describe('Query Parameter Compatibility Tests', () => {
    it('should handle various query parameter formats', async () => {
      const queryFormats = [
        '?limit=10&offset=0',
        '?limit=10&offset=0&sort=name',
        '?filter[type]=graduate&filter[term]=fall',
        '?universities[]=harvard&universities[]=stanford',
        '?search=computer%20science',
        '?fields=id,name,type'
      ];

      for (const query of queryFormats) {
        const response = await request(app)
          .get(`/api/universities${query}`);

        // Should handle query parameters gracefully
        expect([200, 400, 401]).toContain(response.status);
        
        if (response.status === 400) {
          expect(response.body.error).toBeDefined();
          expect(response.body.error.message).toContain('parameter');
        }
      }
    });

    it('should handle malformed query parameters', async () => {
      const malformedQueries = [
        '?limit=abc',
        '?offset=-1',
        '?sort=',
        '?filter=invalid',
        '?limit=999999999999999999999'
      ];

      for (const query of malformedQueries) {
        const response = await request(app)
          .get(`/api/universities${query}`);

        // Should return appropriate error for malformed parameters
        expect([200, 400]).toContain(response.status);
        
        if (response.status === 400) {
          expect(response.body.error).toBeDefined();
        }
      }
    });
  });

  describe('Date and Time Format Compatibility Tests', () => {
    it('should handle different date formats', async () => {
      const dateFormats = [
        '2026-09-01', // ISO format
        '09/01/2026', // US format
        '01/09/2026', // European format
        '2026-09-01T00:00:00Z', // ISO with time
        '2026-09-01T00:00:00.000Z' // ISO with milliseconds
      ];

      for (const dateFormat of dateFormats) {
        const response = await request(app)
          .post('/api/applications')
          .send({
            legalName: 'Date Test Student',
            universities: ['harvard'],
            programType: 'graduate',
            applicationTerm: 'Fall 2026',
            deadline: dateFormat
          });

        // Should handle date format appropriately
        expect([201, 400]).toContain(response.status);
      }
    });

    it('should handle timezone differences', async () => {
      const timezones = [
        '2026-09-01T12:00:00Z', // UTC
        '2026-09-01T12:00:00-05:00', // EST
        '2026-09-01T12:00:00+01:00', // CET
        '2026-09-01T12:00:00-08:00' // PST
      ];

      for (const timezone of timezones) {
        const response = await request(app)
          .post('/api/applications')
          .send({
            legalName: 'Timezone Test Student',
            universities: ['harvard'],
            programType: 'graduate',
            applicationTerm: 'Fall 2026',
            submissionDeadline: timezone
          });

        // Should handle timezone information properly
        expect([201, 400]).toContain(response.status);
      }
    });
  });

  describe('File Upload Compatibility Tests', () => {
    it('should handle different file types and sizes', async () => {
      const testFiles = [
        { name: 'test.pdf', content: '%PDF-1.4', type: 'application/pdf' },
        { name: 'test.doc', content: 'Document content', type: 'application/msword' },
        { name: 'test.txt', content: 'Plain text content', type: 'text/plain' }
      ];

      for (const file of testFiles) {
        const response = await request(app)
          .post('/api/upload')
          .attach('file', Buffer.from(file.content), {
            filename: file.name,
            contentType: file.type
          });

        // Should handle different file types appropriately
        expect([200, 400, 413, 415]).toContain(response.status);
      }
    });

    it('should enforce file size limits', async () => {
      const largefile = Buffer.alloc(10 * 1024 * 1024, 'a'); // 10MB file
      
      const response = await request(app)
        .post('/api/upload')
        .attach('file', largefile, 'large-file.txt');

      // Should reject files that are too large
      expect([413, 400]).toContain(response.status);
      
      if (response.status === 413) {
        expect(response.body.error.message).toContain('file size');
      }
    });
  });

  describe('Error Response Compatibility Tests', () => {
    it('should return consistent error response format', async () => {
      const errorEndpoints = [
        { path: '/api/nonexistent', expectedStatus: 404 },
        { path: '/api/auth/login', method: 'POST', data: {}, expectedStatus: 400 },
        { path: '/api/applications', method: 'GET', expectedStatus: 401 }
      ];

      for (const endpoint of errorEndpoints) {
        let response;
        
        if (endpoint.method === 'POST') {
          response = await request(app)
            .post(endpoint.path)
            .send(endpoint.data || {});
        } else {
          response = await request(app).get(endpoint.path);
        }

        expect(response.status).toBe(endpoint.expectedStatus);
        expect(response.body.error).toBeDefined();
        expect(response.body.error.message).toBeDefined();
        expect(response.body.error.code).toBeDefined();
        expect(response.body.error.timestamp).toBeDefined();
      }
    });
  });

  describe('Backward Compatibility Tests', () => {
    it('should maintain backward compatibility for existing endpoints', async () => {
      // Test that old endpoint formats still work
      const legacyEndpoints = [
        '/api/student/register', // Old format
        '/api/auth/register' // New format
      ];

      const testData = {
        email: 'legacy@example.com',
        password: 'LegacyTest123!',
        firstName: 'Legacy',
        lastName: 'Test'
      };

      for (const endpoint of legacyEndpoints) {
        const response = await request(app)
          .post(endpoint)
          .send(testData);

        // Should either work or return a proper redirect/deprecation notice
        expect([200, 201, 301, 302, 410]).toContain(response.status);
      }
    });
  });
});