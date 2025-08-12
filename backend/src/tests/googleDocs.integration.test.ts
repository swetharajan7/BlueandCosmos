import { GoogleDocsService } from '../services/googleDocsService';
import { Application } from '../types';

// This test requires actual Google API credentials and should be run separately
// Skip by default to avoid failing CI/CD without credentials
describe.skip('Google Docs Service Integration', () => {
  let googleDocsService: GoogleDocsService;
  let testDocumentId: string;

  const mockApplication: Application = {
    id: 'test-app-id',
    student_id: 'test-student-id',
    legal_name: 'John Doe',
    program_type: 'graduate',
    application_term: 'Fall 2024',
    status: 'draft',
    universities: [
      {
        id: 'harvard-id',
        name: 'Harvard University',
        code: 'HARVARD',
        submission_format: 'email',
        is_active: true
      },
      {
        id: 'mit-id',
        name: 'Massachusetts Institute of Technology',
        code: 'MIT',
        submission_format: 'email',
        is_active: true
      }
    ],
    created_at: new Date(),
    updated_at: new Date()
  };

  beforeAll(() => {
    // Initialize Google Docs service with test credentials
    googleDocsService = new GoogleDocsService({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
      serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    });

    // Set test credentials if available
    if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
      googleDocsService.setCredentials({
        access_token: process.env.GOOGLE_ACCESS_TOKEN,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });
    }
  });

  afterAll(async () => {
    // Clean up test document
    if (testDocumentId) {
      try {
        await googleDocsService.deleteDocument(testDocumentId);
      } catch (error) {
        console.warn('Failed to delete test document:', error);
      }
    }
  });

  describe('Document Creation', () => {
    it('should create a new Google Doc for an application', async () => {
      testDocumentId = await googleDocsService.createApplicationDocument(mockApplication);
      
      expect(testDocumentId).toBeDefined();
      expect(typeof testDocumentId).toBe('string');
      expect(testDocumentId.length).toBeGreaterThan(0);
    });

    it('should create document with proper title format', async () => {
      const metadata = await googleDocsService.getDocumentMetadata(testDocumentId);
      
      expect(metadata.name).toContain('John Doe');
      expect(metadata.name).toContain('graduate');
      expect(metadata.name).toContain('Fall 2024');
    });
  });

  describe('Document Updates', () => {
    it('should update document with new application data', async () => {
      const updatedApplication = {
        ...mockApplication,
        legal_name: 'Jane Smith',
        application_term: 'Spring 2025'
      };

      await googleDocsService.updateApplicationDocument(testDocumentId, updatedApplication);
      
      // Verify update by checking document content or metadata
      const metadata = await googleDocsService.getDocumentMetadata(testDocumentId);
      expect(metadata.modifiedTime).toBeDefined();
    });

    it('should add recommendation content to document', async () => {
      await googleDocsService.addRecommendationContent(
        testDocumentId,
        'Harvard University',
        'This is a test recommendation for the student. The student has shown excellent academic performance and leadership skills.',
        'Dr. Test Recommender'
      );

      // Document should be updated successfully without throwing errors
      expect(true).toBe(true);
    });
  });

  describe('Document Permissions', () => {
    it('should set document permissions', async () => {
      const permissions = [
        {
          type: 'anyone' as const,
          role: 'reader' as const
        }
      ];

      await googleDocsService.setDocumentPermissions(testDocumentId, permissions);
      
      // Verify permissions were set by checking document metadata
      const metadata = await googleDocsService.getDocumentMetadata(testDocumentId);
      expect(metadata.permissions).toBeDefined();
    });
  });

  describe('Document Access', () => {
    it('should validate document access', async () => {
      const isAccessible = await googleDocsService.validateDocumentAccess(testDocumentId);
      expect(isAccessible).toBe(true);
    });

    it('should return false for non-existent document', async () => {
      const isAccessible = await googleDocsService.validateDocumentAccess('non-existent-doc-id');
      expect(isAccessible).toBe(false);
    });

    it('should get document URL', async () => {
      const url = await googleDocsService.getDocumentUrl(testDocumentId);
      
      expect(url).toBeDefined();
      expect(url).toContain('docs.google.com');
      expect(url).toContain(testDocumentId);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid document operations gracefully', async () => {
      await expect(
        googleDocsService.updateApplicationDocument('invalid-doc-id', mockApplication)
      ).rejects.toThrow();
    });

    it('should handle permission errors gracefully', async () => {
      const invalidPermissions = [
        {
          type: 'user' as const,
          role: 'owner' as const,
          emailAddress: 'invalid-email'
        }
      ];

      await expect(
        googleDocsService.setDocumentPermissions(testDocumentId, invalidPermissions)
      ).rejects.toThrow();
    });
  });
});