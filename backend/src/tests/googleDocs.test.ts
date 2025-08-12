import request from 'supertest';
import app from '../server';
import { db } from '../config/database';
import { GoogleDocsService } from '../services/googleDocsService';

// Mock Google Docs Service
jest.mock('../services/googleDocsService');
jest.mock('../config/googleDocs', () => ({
  getGoogleDocsService: () => mockGoogleDocsService
}));

const mockGoogleDocsService = {
  createApplicationDocument: jest.fn(),
  updateApplicationDocument: jest.fn(),
  addRecommendationContent: jest.fn(),
  getDocumentUrl: jest.fn(),
  setDocumentPermissions: jest.fn(),
  getDocumentMetadata: jest.fn(),
  validateDocumentAccess: jest.fn(),
  deleteDocument: jest.fn()
};

describe('Google Docs Integration', () => {
  let authToken: string;
  let studentId: string;
  let applicationId: string;

  beforeAll(async () => {
    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testgoogledocs@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        phone: '1234567890'
      });

    studentId = registerResponse.body.data.user.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testgoogledocs@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // Create test application
    const applicationResponse = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        legal_name: 'Test Student',
        program_type: 'graduate',
        application_term: 'Fall 2024',
        university_ids: []
      });

    applicationId = applicationResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM applications WHERE student_id = $1', [studentId]);
    await db.query('DELETE FROM users WHERE email = $1', ['testgoogledocs@example.com']);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/google-docs/:applicationId/url', () => {
    it('should return Google Doc URL for valid application', async () => {
      mockGoogleDocsService.getDocumentUrl.mockResolvedValue('https://docs.google.com/document/d/test-doc-id/edit');

      const response = await request(app)
        .get(`/api/google-docs/${applicationId}/url`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.documentUrl).toBe('https://docs.google.com/document/d/test-doc-id/edit');
    });

    it('should return 404 if no Google Doc exists', async () => {
      // Update application to have no google_doc_id
      await db.query('UPDATE applications SET google_doc_id = NULL WHERE id = $1', [applicationId]);

      const response = await request(app)
        .get(`/api/google-docs/${applicationId}/url`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for unauthorized access', async () => {
      const response = await request(app)
        .get(`/api/google-docs/${applicationId}/url`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/google-docs/:applicationId/update', () => {
    it('should update Google Doc successfully', async () => {
      mockGoogleDocsService.updateApplicationDocument.mockResolvedValue(undefined);

      const response = await request(app)
        .put(`/api/google-docs/${applicationId}/update`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Google Doc updated successfully');
    });

    it('should handle Google Docs service errors', async () => {
      mockGoogleDocsService.updateApplicationDocument.mockRejectedValue(new Error('Google API error'));

      const response = await request(app)
        .put(`/api/google-docs/${applicationId}/update`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/google-docs/:applicationId/permissions', () => {
    it('should set document permissions successfully', async () => {
      mockGoogleDocsService.setDocumentPermissions.mockResolvedValue(undefined);

      const permissions = [
        {
          type: 'user',
          role: 'reader',
          emailAddress: 'test@example.com'
        }
      ];

      const response = await request(app)
        .post(`/api/google-docs/${applicationId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ permissions });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Document permissions updated successfully');
    });

    it('should validate permission format', async () => {
      const invalidPermissions = [
        {
          type: 'invalid-type',
          role: 'reader'
        }
      ];

      const response = await request(app)
        .post(`/api/google-docs/${applicationId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ permissions: invalidPermissions });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require email for user permissions', async () => {
      const invalidPermissions = [
        {
          type: 'user',
          role: 'reader'
          // Missing emailAddress
        }
      ];

      const response = await request(app)
        .post(`/api/google-docs/${applicationId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ permissions: invalidPermissions });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/google-docs/:applicationId/recommendation', () => {
    it('should add recommendation content successfully', async () => {
      mockGoogleDocsService.addRecommendationContent.mockResolvedValue(undefined);

      const recommendationData = {
        universityName: 'Harvard University',
        recommendationContent: 'This is a test recommendation content.',
        recommenderName: 'Dr. Test Recommender'
      };

      const response = await request(app)
        .post(`/api/google-docs/${applicationId}/recommendation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(recommendationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Recommendation added to Google Doc successfully');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        universityName: 'Harvard University'
        // Missing recommendationContent and recommenderName
      };

      const response = await request(app)
        .post(`/api/google-docs/${applicationId}/recommendation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate content length', async () => {
      const longContent = 'a'.repeat(10001); // Exceeds 10,000 character limit

      const recommendationData = {
        universityName: 'Harvard University',
        recommendationContent: longContent,
        recommenderName: 'Dr. Test Recommender'
      };

      const response = await request(app)
        .post(`/api/google-docs/${applicationId}/recommendation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(recommendationData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/google-docs/:applicationId/metadata', () => {
    it('should return document metadata', async () => {
      const mockMetadata = {
        id: 'test-doc-id',
        name: 'Test Application Document',
        createdTime: '2024-01-01T00:00:00.000Z',
        modifiedTime: '2024-01-01T12:00:00.000Z'
      };

      mockGoogleDocsService.getDocumentMetadata.mockResolvedValue(mockMetadata);

      const response = await request(app)
        .get(`/api/google-docs/${applicationId}/metadata`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockMetadata);
    });
  });

  describe('GET /api/google-docs/:applicationId/validate', () => {
    it('should validate document access', async () => {
      mockGoogleDocsService.validateDocumentAccess.mockResolvedValue(true);

      const response = await request(app)
        .get(`/api/google-docs/${applicationId}/validate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAccessible).toBe(true);
    });

    it('should handle inaccessible documents', async () => {
      mockGoogleDocsService.validateDocumentAccess.mockResolvedValue(false);

      const response = await request(app)
        .get(`/api/google-docs/${applicationId}/validate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isAccessible).toBe(false);
    });
  });
});