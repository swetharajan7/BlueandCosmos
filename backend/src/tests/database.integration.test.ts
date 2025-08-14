import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database';
import { UserModel } from '../models/User';
import { ApplicationModel } from '../models/Application';
import { RecommenderModel } from '../models/Recommender';

describe('Database Integration Tests', () => {
  let db: Pool;

  beforeAll(async () => {
    // Use test database
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'stellarrec_test';
    
    db = new Pool(DatabaseConfig.getConfig());
    
    // Run migrations for test database
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES users(id) ON DELETE CASCADE,
        legal_name VARCHAR(255) NOT NULL,
        universities TEXT[] NOT NULL,
        program_type VARCHAR(50) NOT NULL,
        application_term VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'draft',
        google_doc_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS recommenders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        organization VARCHAR(255) NOT NULL,
        relationship_duration VARCHAR(50) NOT NULL,
        relationship_type VARCHAR(100) NOT NULL,
        mobile_phone VARCHAR(20),
        professional_email VARCHAR(255) NOT NULL,
        invitation_token VARCHAR(255) UNIQUE,
        invitation_expires TIMESTAMP,
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  afterAll(async () => {
    // Clean up test database
    await db.query('DROP TABLE IF EXISTS recommenders CASCADE');
    await db.query('DROP TABLE IF EXISTS applications CASCADE');
    await db.query('DROP TABLE IF EXISTS users CASCADE');
    await db.end();
  });

  beforeEach(async () => {
    // Clear tables before each test
    await db.query('DELETE FROM recommenders');
    await db.query('DELETE FROM applications');
    await db.query('DELETE FROM users');
  });

  describe('User Operations', () => {
    test('should create and retrieve user', async () => {
      const userData = {
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      };

      const result = await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [userData.email, userData.password_hash, userData.first_name, userData.last_name, userData.role]);

      expect(result.rows[0]).toBeDefined();
      expect(result.rows[0].email).toBe(userData.email);
      expect(result.rows[0].first_name).toBe(userData.first_name);

      // Retrieve user
      const retrieveResult = await db.query('SELECT * FROM users WHERE email = $1', [userData.email]);
      expect(retrieveResult.rows[0].email).toBe(userData.email);
    });

    test('should enforce unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      };

      // Insert first user
      await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, [userData.email, userData.password_hash, userData.first_name, userData.last_name, userData.role]);

      // Try to insert duplicate email
      await expect(
        db.query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role)
          VALUES ($1, $2, $3, $4, $5)
        `, [userData.email, userData.password_hash, 'Jane', 'Smith', 'student'])
      ).rejects.toThrow();
    });

    test('should update user information', async () => {
      const userData = {
        email: 'update@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      };

      const insertResult = await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [userData.email, userData.password_hash, userData.first_name, userData.last_name, userData.role]);

      const userId = insertResult.rows[0].id;

      // Update user
      await db.query(`
        UPDATE users SET first_name = $1, is_verified = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, ['Jane', true, userId]);

      // Verify update
      const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
      expect(result.rows[0].first_name).toBe('Jane');
      expect(result.rows[0].is_verified).toBe(true);
    });
  });

  describe('Application Operations', () => {
    let studentId: string;

    beforeEach(async () => {
      // Create a student user for application tests
      const result = await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['student@example.com', 'hashed_password', 'Student', 'User', 'student']);
      
      studentId = result.rows[0].id;
    });

    test('should create application with university array', async () => {
      const applicationData = {
        student_id: studentId,
        legal_name: 'Student User',
        universities: ['harvard', 'mit', 'stanford'],
        program_type: 'graduate',
        application_term: 'Fall 2024'
      };

      const result = await db.query(`
        INSERT INTO applications (student_id, legal_name, universities, program_type, application_term)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [applicationData.student_id, applicationData.legal_name, applicationData.universities, 
          applicationData.program_type, applicationData.application_term]);

      expect(result.rows[0]).toBeDefined();
      expect(result.rows[0].universities).toEqual(applicationData.universities);
      expect(result.rows[0].program_type).toBe(applicationData.program_type);
    });

    test('should retrieve applications with user data', async () => {
      // Create application
      await db.query(`
        INSERT INTO applications (student_id, legal_name, universities, program_type, application_term)
        VALUES ($1, $2, $3, $4, $5)
      `, [studentId, 'Student User', ['harvard'], 'graduate', 'Fall 2024']);

      // Retrieve with JOIN
      const result = await db.query(`
        SELECT a.*, u.email, u.first_name, u.last_name
        FROM applications a
        JOIN users u ON a.student_id = u.id
        WHERE a.student_id = $1
      `, [studentId]);

      expect(result.rows[0]).toBeDefined();
      expect(result.rows[0].email).toBe('student@example.com');
      expect(result.rows[0].universities).toEqual(['harvard']);
    });

    test('should cascade delete applications when user is deleted', async () => {
      // Create application
      await db.query(`
        INSERT INTO applications (student_id, legal_name, universities, program_type, application_term)
        VALUES ($1, $2, $3, $4, $5)
      `, [studentId, 'Student User', ['harvard'], 'graduate', 'Fall 2024']);

      // Verify application exists
      let result = await db.query('SELECT * FROM applications WHERE student_id = $1', [studentId]);
      expect(result.rows.length).toBe(1);

      // Delete user
      await db.query('DELETE FROM users WHERE id = $1', [studentId]);

      // Verify application was cascade deleted
      result = await db.query('SELECT * FROM applications WHERE student_id = $1', [studentId]);
      expect(result.rows.length).toBe(0);
    });
  });

  describe('Recommender Operations', () => {
    let userId: string;

    beforeEach(async () => {
      // Create a user for recommender tests
      const result = await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['recommender@example.com', 'hashed_password', 'Prof', 'Smith', 'recommender']);
      
      userId = result.rows[0].id;
    });

    test('should create recommender profile', async () => {
      const recommenderData = {
        user_id: userId,
        title: 'Professor',
        organization: 'Harvard University',
        relationship_duration: '2-3 years',
        relationship_type: 'Academic Advisor',
        professional_email: 'prof@harvard.edu',
        invitation_token: 'unique_token_123'
      };

      const result = await db.query(`
        INSERT INTO recommenders (user_id, title, organization, relationship_duration, 
                                relationship_type, professional_email, invitation_token)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [recommenderData.user_id, recommenderData.title, recommenderData.organization,
          recommenderData.relationship_duration, recommenderData.relationship_type,
          recommenderData.professional_email, recommenderData.invitation_token]);

      expect(result.rows[0]).toBeDefined();
      expect(result.rows[0].title).toBe(recommenderData.title);
      expect(result.rows[0].organization).toBe(recommenderData.organization);
    });

    test('should enforce unique invitation token', async () => {
      const token = 'unique_token_456';

      // Insert first recommender
      await db.query(`
        INSERT INTO recommenders (user_id, title, organization, relationship_duration, 
                                relationship_type, professional_email, invitation_token)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [userId, 'Professor', 'MIT', '1-2 years', 'Research Supervisor', 'prof@mit.edu', token]);

      // Try to insert duplicate token
      await expect(
        db.query(`
          INSERT INTO recommenders (user_id, title, organization, relationship_duration, 
                                  relationship_type, professional_email, invitation_token)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, 'Dr.', 'Stanford', '3+ years', 'Thesis Advisor', 'dr@stanford.edu', token])
      ).rejects.toThrow();
    });
  });

  describe('Transaction Handling', () => {
    test('should rollback transaction on error', async () => {
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');
        
        // Insert user
        const userResult = await client.query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, ['transaction@example.com', 'hashed_password', 'Trans', 'User', 'student']);
        
        const userId = userResult.rows[0].id;
        
        // Insert application
        await client.query(`
          INSERT INTO applications (student_id, legal_name, universities, program_type, application_term)
          VALUES ($1, $2, $3, $4, $5)
        `, [userId, 'Trans User', ['harvard'], 'graduate', 'Fall 2024']);
        
        // Simulate error - try to insert duplicate email
        await client.query(`
          INSERT INTO users (email, password_hash, first_name, last_name, role)
          VALUES ($1, $2, $3, $4, $5)
        `, ['transaction@example.com', 'hashed_password', 'Duplicate', 'User', 'student']);
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        
        // Verify rollback - user should not exist
        const result = await client.query('SELECT * FROM users WHERE email = $1', ['transaction@example.com']);
        expect(result.rows.length).toBe(0);
      } finally {
        client.release();
      }
    });
  });

  describe('Performance Tests', () => {
    test('should handle bulk inserts efficiently', async () => {
      const startTime = Date.now();
      const batchSize = 100;
      
      // Create bulk users
      const values = [];
      const params = [];
      for (let i = 0; i < batchSize; i++) {
        values.push(`($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`);
        params.push(`bulk${i}@example.com`, 'hashed_password', `User${i}`, 'Test', 'student');
      }
      
      await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ${values.join(', ')}
      `, params);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Verify all users were inserted
      const result = await db.query('SELECT COUNT(*) FROM users');
      expect(parseInt(result.rows[0].count)).toBe(batchSize);
    });

    test('should efficiently query with indexes', async () => {
      // Create test data
      await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
      `, ['indexed@example.com', 'hashed_password', 'Indexed', 'User', 'student']);
      
      const startTime = Date.now();
      
      // Query by indexed email field
      const result = await db.query('SELECT * FROM users WHERE email = $1', ['indexed@example.com']);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result.rows.length).toBe(1);
      expect(duration).toBeLessThan(100); // Should be very fast with index
    });
  });
});