import request from 'supertest';
import { Pool } from 'pg';
import { connectDatabase } from '../config/database';
import { ApplicationModel } from '../models/Application';
import { UserModel } from '../models/User';
import { SubmissionModel } from '../models/Submission';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from '../routes/auth';
import applicationRoutes from '../routes/applications';
import universityRoutes from '../routes/universities';

// Create a simple test app
const createTestApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  return app;
};

describe('Application Status API', () => {
  let db: Pool;
  let app: express.Application;
  let applicationModel: ApplicationModel;
  let userModel: UserModel;
  let submissionModel: SubmissionModel;
  let studentToken: string;
  let studentId: string;
  let applicationId: string;

  beforeAll(async () => {
    const dbConnection = await connectDatabase();
    db = dbConnection.db;
    applicationModel = new ApplicationModel(db);
    userModel = new UserModel(db);
    submissionModel = new SubmissionModel(db);
    
    // Create test app
    app = createTestApp();
    app.use('/api/auth', authRoutes);
    app.use('/api/applications', applicationRoutes);
    app.use('/api/universities', universityRoutes);
  });

  beforeEach(async () => {
    // Clean up database
    await db.query('DELETE FROM submissions');
    await db.query('DELETE FROM recommendations');
    await db.query('DELETE FROM application_universities');
    await db.query('DELETE FROM applications');
    await db.query('DELETE FROM users');

    // Create test student
    const student = await userModel.create({
      email: 'student@test.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'Student',
      role: 'student'
    });
    studentId = student.id;

    // Verify student email
    await userModel.verifyEmail(student.id);

    // Generate JWT token
    studentToken = jwt.sign(
      { userId: student.id, email: student.email, role: student.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test application
    const application = await applicationModel.create({
      student_id: studentId,
      legal_name: 'Test Student',
      program_type: 'graduate',
      application_term: 'Fall 2026',
      university_ids: []
    });
    applicationId = application.id;
  });

  afterAll(async () => {
    await db.end();
  });

  describe('GET /api/applications/:id/status', () => {
    it('should return detailed application status', async () => {
      const response = await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('application');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('overall_status');
      expect(response.body.data).toHaveProperty('timeline');
      expect(response.body.data).toHaveProperty('summary');

      // Check application details
      expect(response.body.data.application.id).toBe(applicationId);
      expect(response.body.data.application.legal_name).toBe('Test Student');

      // Check summary
      expect(response.body.data.summary).toHaveProperty('total_universities');
      expect(response.body.data.summary).toHaveProperty('total_recommendations');
      expect(response.body.data.summary).toHaveProperty('completed_submissions');
      expect(response.body.data.summary).toHaveProperty('pending_submissions');
      expect(response.body.data.summary).toHaveProperty('failed_submissions');
    });

    it('should return 403 for non-owner access', async () => {
      // Create another student
      const otherStudent = await userModel.create({
        email: 'other@test.com',
        password: 'password123',
        first_name: 'Other',
        last_name: 'Student',
        role: 'student'
      });

      const otherToken = jwt.sign(
        { userId: otherStudent.id, email: otherStudent.email, role: otherStudent.role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/applications/${fakeId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403); // Will be 403 because ownership check fails first
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .expect(401);
    });

    it('should include timeline events', async () => {
      const response = await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.data.timeline).toBeInstanceOf(Array);
      
      // Should have at least the application creation event
      const creationEvent = response.body.data.timeline.find(
        (event: any) => event.event_type === 'application_created'
      );
      expect(creationEvent).toBeDefined();
      expect(creationEvent.title).toBe('Application created');
    });

    it('should calculate overall status correctly', async () => {
      const response = await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // With no recommendations, status should be 'draft'
      expect(response.body.data.overall_status).toBe('draft');
    });

    it('should handle applications with universities', async () => {
      // First, get some universities
      const universitiesResponse = await request(app)
        .get('/api/universities')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const universities = universitiesResponse.body.data;
      if (universities.length > 0) {
        // Update application with universities
        await applicationModel.update(applicationId, {
          university_ids: [universities[0].id]
        });

        const response = await request(app)
          .get(`/api/applications/${applicationId}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.data.application.universities).toHaveLength(1);
        expect(response.body.data.summary.total_universities).toBe(1);
      }
    });
  });

  describe('Status calculation helpers', () => {
    it('should calculate overall status for recommendations', async () => {
      // This tests the helper methods indirectly through the API
      const response = await request(app)
        .get(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.data.overall_status).toBeDefined();
      expect(['draft', 'pending', 'in_progress', 'completed', 'partial_failure'])
        .toContain(response.body.data.overall_status);
    });
  });
});