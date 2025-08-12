import request from 'supertest';
import { app } from '../server';
import { db } from '../config/database';

describe('University API Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Create a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'testuser@example.com',
        password: 'password123',
        first_name: 'Test',
        last_name: 'User',
        role: 'student'
      });

    if (registerResponse.status === 201) {
      authToken = registerResponse.body.data.token;
    } else {
      // Try to login if user already exists
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'password123'
        });
      
      authToken = loginResponse.body.data.token;
    }
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM users WHERE email = $1', ['testuser@example.com']);
  });

  describe('GET /api/universities', () => {
    it('should return all universities without filters', async () => {
      const response = await request(app)
        .get('/api/universities')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check university structure
      const university = response.body.data[0];
      expect(university).toHaveProperty('id');
      expect(university).toHaveProperty('name');
      expect(university).toHaveProperty('code');
      expect(university).toHaveProperty('submission_format');
      expect(university).toHaveProperty('requirements');
    });

    it('should search universities by name', async () => {
      const response = await request(app)
        .get('/api/universities?search=Harvard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should find Harvard University
      const harvard = response.body.data.find((u: any) => u.code === 'HARVARD');
      expect(harvard).toBeDefined();
      expect(harvard.name).toContain('Harvard');
    });

    it('should search universities by code', async () => {
      const response = await request(app)
        .get('/api/universities?search=MIT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should find MIT
      const mit = response.body.data.find((u: any) => u.code === 'MIT');
      expect(mit).toBeDefined();
    });

    it('should filter by submission format', async () => {
      const response = await request(app)
        .get('/api/universities?submission_format=email')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned universities should have email submission format
      response.body.data.forEach((university: any) => {
        expect(university.submission_format).toBe('email');
      });
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/universities?category=ivy_league')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Should return Ivy League universities
      const ivyLeagueCodes = ['HARVARD', 'YALE', 'PRINCETON', 'COLUMBIA', 'UPENN', 'CORNELL', 'BROWN', 'DARTMOUTH'];
      response.body.data.forEach((university: any) => {
        // Check if this university has ivy_league category in requirements
        const hasIvyLeagueCategory = university.requirements.some((req: any) => 
          req.requirement_type === 'category' && req.requirement_value === 'ivy_league'
        );
        expect(hasIvyLeagueCategory || ivyLeagueCodes.includes(university.code)).toBe(true);
      });
    });

    it('should filter by program type', async () => {
      const response = await request(app)
        .get('/api/universities?program_type=graduate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/universities?search=University&submission_format=email&category=ivy_league')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return grouped categories', async () => {
      const response = await request(app)
        .get('/api/universities?category=grouped')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ivy_league');
      expect(response.body.data).toHaveProperty('top_public');
      expect(response.body.data).toHaveProperty('top_private');
      expect(response.body.data).toHaveProperty('specialized');
      
      expect(Array.isArray(response.body.data.ivy_league)).toBe(true);
      expect(Array.isArray(response.body.data.top_public)).toBe(true);
      expect(Array.isArray(response.body.data.top_private)).toBe(true);
      expect(Array.isArray(response.body.data.specialized)).toBe(true);
    });
  });

  describe('GET /api/universities/:id', () => {
    it('should return a specific university by ID', async () => {
      // First get all universities to get a valid ID
      const universitiesResponse = await request(app)
        .get('/api/universities')
        .set('Authorization', `Bearer ${authToken}`);

      const universityId = universitiesResponse.body.data[0].id;

      const response = await request(app)
        .get(`/api/universities/${universityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', universityId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('code');
      expect(response.body.data).toHaveProperty('requirements');
    });

    it('should return 404 for non-existent university', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/universities/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('University not found');
    });
  });

  describe('POST /api/universities/validate', () => {
    it('should validate university IDs', async () => {
      // Get some valid university IDs
      const universitiesResponse = await request(app)
        .get('/api/universities')
        .set('Authorization', `Bearer ${authToken}`);

      const validId = universitiesResponse.body.data[0].id;
      const invalidId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .post('/api/universities/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ids: [validId, invalidId]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid');
      expect(response.body.data).toHaveProperty('invalid');
      expect(response.body.data.valid).toContain(validId);
      expect(response.body.data.invalid).toContain(invalidId);
    });

    it('should return validation error for invalid input', async () => {
      const response = await request(app)
        .post('/api/universities/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ids: 'not-an-array'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/universities/validate-program', () => {
    it('should validate program availability', async () => {
      // Get some university IDs
      const universitiesResponse = await request(app)
        .get('/api/universities')
        .set('Authorization', `Bearer ${authToken}`);

      const universityIds = universitiesResponse.body.data.slice(0, 3).map((u: any) => u.id);

      const response = await request(app)
        .post('/api/universities/validate-program')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          university_ids: universityIds,
          program_type: 'graduate'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('available');
      expect(response.body.data).toHaveProperty('unavailable');
      expect(Array.isArray(response.body.data.available)).toBe(true);
      expect(Array.isArray(response.body.data.unavailable)).toBe(true);
    });

    it('should return validation error for invalid program type', async () => {
      const response = await request(app)
        .post('/api/universities/validate-program')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          university_ids: ['00000000-0000-0000-0000-000000000000'],
          program_type: 'invalid-program'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/api/universities')
        .expect(401);

      await request(app)
        .post('/api/universities/validate')
        .send({ ids: [] })
        .expect(401);

      await request(app)
        .post('/api/universities/validate-program')
        .send({ university_ids: [], program_type: 'graduate' })
        .expect(401);
    });
  });
});