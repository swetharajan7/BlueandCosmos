import request from 'supertest';
import app from '../server';
import { aiService } from '../services/aiService';
import { validateOpenAIConfig } from '../config/openai';

// Mock OpenAI to avoid actual API calls during testing
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'Mocked AI response for testing'
              }
            }],
            usage: {
              total_tokens: 100
            }
          })
        }
      }
    }))
  };
});

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([])
  }))
}));

describe('AI Service', () => {
  let authToken: string;

  beforeAll(async () => {
    // Create a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'Recommender',
        email: 'test.recommender@example.com',
        password: 'TestPassword123!',
        role: 'recommender'
      });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.recommender@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.data.token;
  });

  describe('Configuration', () => {
    it('should validate OpenAI configuration', () => {
      // Mock environment variables for testing
      process.env.OPENAI_API_KEY = 'test-api-key';
      process.env.OPENAI_MODEL = 'gpt-4';
      
      const isValid = validateOpenAIConfig();
      expect(isValid).toBe(true);
    });

    it('should fail validation with missing API key', () => {
      delete process.env.OPENAI_API_KEY;
      
      const isValid = validateOpenAIConfig();
      expect(isValid).toBe(false);
    });
  });

  describe('POST /api/ai/generate-outline', () => {
    const validOutlineRequest = {
      applicantName: 'John Doe',
      programType: 'graduate',
      universities: ['University of California', 'Stanford University'],
      relationshipType: 'Academic Advisor',
      relationshipDuration: '2 years',
      recommenderTitle: 'Professor of Computer Science'
    };

    it('should generate outline with valid request', async () => {
      const response = await request(app)
        .post('/api/ai/generate-outline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validOutlineRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.outline).toBeDefined();
      expect(typeof response.body.data.outline).toBe('string');
    });

    it('should reject request with missing required fields', async () => {
      const invalidRequest: any = { ...validOutlineRequest };
      delete invalidRequest.applicantName;

      const response = await request(app)
        .post('/api/ai/generate-outline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid program type', async () => {
      const invalidRequest = {
        ...validOutlineRequest,
        programType: 'invalid-program'
      };

      const response = await request(app)
        .post('/api/ai/generate-outline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/ai/generate-outline')
        .send(validOutlineRequest);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/ai/suggest-examples', () => {
    const validExamplesRequest = {
      programType: 'mba',
      relationshipType: 'Manager',
      recommenderTitle: 'Senior Director'
    };

    it('should suggest examples with valid request', async () => {
      const response = await request(app)
        .post('/api/ai/suggest-examples')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validExamplesRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.examples).toBeDefined();
      expect(Array.isArray(response.body.data.examples)).toBe(true);
    });

    it('should work with minimal request data', async () => {
      const response = await request(app)
        .post('/api/ai/suggest-examples')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/ai/improve-writing', () => {
    const validImprovementRequest = {
      content: 'This is a sample recommendation letter content that needs improvement. The student is very good and works hard. I recommend them for admission.',
      focusArea: 'specificity'
    };

    it('should provide writing improvements', async () => {
      const response = await request(app)
        .post('/api/ai/improve-writing')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validImprovementRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.improvements).toBeDefined();
    });

    it('should reject content that is too short', async () => {
      const invalidRequest = {
        content: 'Too short',
        focusArea: 'clarity'
      };

      const response = await request(app)
        .post('/api/ai/improve-writing')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should work without focus area', async () => {
      const requestWithoutFocus = {
        content: validImprovementRequest.content
      };

      const response = await request(app)
        .post('/api/ai/improve-writing')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestWithoutFocus);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/ai/analyze-quality', () => {
    const validAnalysisRequest = {
      content: 'I have known John Doe for three years as his academic advisor in the Computer Science department. During this time, he has consistently demonstrated exceptional analytical skills and leadership qualities. For example, he led a team of five students in developing a machine learning application that improved prediction accuracy by 25%. His technical expertise, combined with his ability to communicate complex concepts clearly, makes him an ideal candidate for graduate studies. I strongly recommend him for admission to your program.'
    };

    it('should analyze content quality', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-quality')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validAnalysisRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.analysis.score).toBeDefined();
      expect(response.body.data.analysis.wordCount).toBeDefined();
      expect(response.body.data.analysis.strengths).toBeDefined();
      expect(response.body.data.analysis.improvements).toBeDefined();
    });

    it('should reject content that is too short for analysis', async () => {
      const invalidRequest = {
        content: 'This content is too short for meaningful analysis.'
      };

      const response = await request(app)
        .post('/api/ai/analyze-quality')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/ai/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on AI endpoints', async () => {
      const requests = [];
      const validRequest = {
        programType: 'graduate',
        relationshipType: 'Professor',
        recommenderTitle: 'Associate Professor'
      };

      // Make multiple requests quickly to trigger rate limit
      for (let i = 0; i < 35; i++) {
        requests.push(
          request(app)
            .post('/api/ai/suggest-examples')
            .set('Authorization', `Bearer ${authToken}`)
            .send(validRequest)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('AI Service Unit Tests', () => {
    it('should calculate cost correctly', () => {
      // Access private method through any casting for testing
      const service = aiService as any;
      const cost = service.calculateCost(1000);
      expect(cost).toBe(0.045); // $0.045 per 1K tokens
    });

    it('should validate and filter response content', () => {
      const service = aiService as any;
      const content = 'This is a recommendation for Harvard University and Stanford.';
      const filtered = service.validateAndFilterResponse(content);
      expect(filtered).not.toContain('Harvard');
      expect(filtered).not.toContain('Stanford');
      expect(filtered).toContain('[University Name]');
    });

    it('should extract list items from analysis text', () => {
      const service = aiService as any;
      const text = `
        Strengths:
        - Strong analytical skills
        - Excellent communication
        - Leadership experience
        
        Improvements:
        - Add more specific examples
        - Include quantitative metrics
      `;
      
      const strengths = service.extractListItems(text, 'strengths?');
      expect(strengths).toContain('Strong analytical skills');
      expect(strengths).toContain('Excellent communication');
    });

    it('should parse examples list correctly', () => {
      const service = aiService as any;
      const content = `
        1. "John demonstrated exceptional leadership skills..."
        2. "His analytical abilities are evident in..."
        3. "I have observed his dedication to..."
      `;
      
      const examples = service.parseExamplesList(content);
      expect(examples.length).toBe(3);
      expect(examples[0]).toContain('John demonstrated exceptional');
    });
  });
});

describe('AI Service Integration', () => {
  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      // Mock OpenAI to throw an error
      const mockError = new Error('API Error');
      (mockError as any).code = 'rate_limit_exceeded';
      
      jest.spyOn(aiService as any, 'makeOpenAIRequest').mockRejectedValueOnce(mockError);
      
      await expect(aiService.generateOutline({
        applicantName: 'Test',
        programType: 'graduate',
        universities: ['Test University'],
        relationshipType: 'Professor',
        relationshipDuration: '1 year',
        recommenderTitle: 'Assistant Professor'
      })).rejects.toThrow();
    });

    it('should handle quota exceeded errors', async () => {
      const mockError = new Error('Quota exceeded');
      (mockError as any).code = 'insufficient_quota';
      
      jest.spyOn(aiService as any, 'makeOpenAIRequest').mockRejectedValueOnce(mockError);
      
      await expect(aiService.analyzeQuality('Test content for analysis')).rejects.toThrow();
    });
  });

  describe('Usage Tracking', () => {
    it('should track usage statistics', async () => {
      const stats = await aiService.getUsageStats('outline');
      expect(Array.isArray(stats)).toBe(true);
    });

    it('should handle Redis connection failures gracefully', async () => {
      // Mock Redis to fail
      jest.spyOn(aiService as any, 'redisClient', 'get').mockReturnValue(null);
      
      // Should not throw error even if Redis fails
      await expect(aiService.generateOutline({
        applicantName: 'Test',
        programType: 'graduate',
        universities: ['Test University'],
        relationshipType: 'Professor',
        relationshipDuration: '1 year',
        recommenderTitle: 'Assistant Professor'
      })).resolves.toBeDefined();
    });
  });
});