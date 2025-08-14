import { UserModel } from '../models/User';
import { ApplicationModel } from '../models/Application';
import { RecommenderModel } from '../models/Recommender';
import { UniversityModel } from '../models/University';
import { SubmissionModel } from '../models/Submission';

describe('Data Models', () => {
  describe('UserModel', () => {
    test('should validate user data correctly', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'securePassword123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      };

      expect(() => UserModel.validate(validUser)).not.toThrow();
    });

    test('should reject invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'securePassword123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      };

      expect(() => UserModel.validate(invalidUser)).toThrow();
    });

    test('should reject weak password', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: '123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'student'
      };

      expect(() => UserModel.validate(invalidUser)).toThrow();
    });

    test('should sanitize user input', () => {
      const userWithScript = {
        email: 'test@example.com',
        password: 'securePassword123',
        first_name: '<script>alert("xss")</script>John',
        last_name: 'Doe',
        role: 'student'
      };

      const sanitized = UserModel.sanitize(userWithScript);
      expect(sanitized.first_name).not.toContain('<script>');
      expect(sanitized.first_name).toBe('John');
    });
  });

  describe('ApplicationModel', () => {
    test('should validate application data correctly', () => {
      const validApplication = {
        student_id: 'student-123',
        legal_name: 'John Doe',
        universities: ['harvard', 'mit'],
        program_type: 'graduate',
        application_term: 'Fall 2024'
      };

      expect(() => ApplicationModel.validate(validApplication)).not.toThrow();
    });

    test('should reject empty university list', () => {
      const invalidApplication = {
        student_id: 'student-123',
        legal_name: 'John Doe',
        universities: [],
        program_type: 'graduate',
        application_term: 'Fall 2024'
      };

      expect(() => ApplicationModel.validate(invalidApplication)).toThrow();
    });

    test('should validate program type', () => {
      const invalidApplication = {
        student_id: 'student-123',
        legal_name: 'John Doe',
        universities: ['harvard'],
        program_type: 'invalid',
        application_term: 'Fall 2024'
      };

      expect(() => ApplicationModel.validate(invalidApplication)).toThrow();
    });
  });

  describe('RecommenderModel', () => {
    test('should validate recommender data correctly', () => {
      const validRecommender = {
        user_id: 'user-123',
        title: 'Professor',
        organization: 'Harvard University',
        relationship_duration: '2-3 years',
        relationship_type: 'Academic Advisor',
        professional_email: 'prof@harvard.edu'
      };

      expect(() => RecommenderModel.validate(validRecommender)).not.toThrow();
    });

    test('should validate professional email format', () => {
      const invalidRecommender = {
        user_id: 'user-123',
        title: 'Professor',
        organization: 'Harvard University',
        relationship_duration: '2-3 years',
        relationship_type: 'Academic Advisor',
        professional_email: 'invalid-email'
      };

      expect(() => RecommenderModel.validate(invalidRecommender)).toThrow();
    });
  });

  describe('UniversityModel', () => {
    test('should validate university data correctly', () => {
      const validUniversity = {
        name: 'Harvard University',
        code: 'HARVARD',
        submission_format: 'api',
        api_endpoint: 'https://api.harvard.edu/admissions',
        is_active: true
      };

      expect(() => UniversityModel.validate(validUniversity)).not.toThrow();
    });

    test('should require API endpoint for API submission format', () => {
      const invalidUniversity = {
        name: 'Harvard University',
        code: 'HARVARD',
        submission_format: 'api',
        is_active: true
      };

      expect(() => UniversityModel.validate(invalidUniversity)).toThrow();
    });
  });

  describe('SubmissionModel', () => {
    test('should validate submission data correctly', () => {
      const validSubmission = {
        recommendation_id: 'rec-123',
        university_id: 'uni-123',
        status: 'pending',
        submission_method: 'api',
        retry_count: 0
      };

      expect(() => SubmissionModel.validate(validSubmission)).not.toThrow();
    });

    test('should validate status values', () => {
      const invalidSubmission = {
        recommendation_id: 'rec-123',
        university_id: 'uni-123',
        status: 'invalid',
        submission_method: 'api',
        retry_count: 0
      };

      expect(() => SubmissionModel.validate(invalidSubmission)).toThrow();
    });
  });
});