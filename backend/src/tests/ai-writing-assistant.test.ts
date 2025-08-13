import { aiService } from '../services/aiService';

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

describe('AI Writing Assistant', () => {
  describe('generateOutline', () => {
    it('should generate an outline for a recommendation', async () => {
      const request = {
        applicantName: 'John Doe',
        programType: 'graduate',
        universities: ['Harvard University', 'MIT'],
        relationshipType: 'Academic Advisor',
        relationshipDuration: '2-3 years',
        recommenderTitle: 'Professor'
      };

      const outline = await aiService.generateOutline(request);
      
      expect(outline).toBeDefined();
      expect(typeof outline).toBe('string');
      expect(outline.length).toBeGreaterThan(0);
    });
  });

  describe('suggestExamples', () => {
    it('should suggest example phrases', async () => {
      const request = {
        programType: 'graduate',
        relationshipType: 'Academic Advisor',
        recommenderTitle: 'Professor'
      };

      const examples = await aiService.suggestExamples(request);
      
      expect(examples).toBeDefined();
      expect(Array.isArray(examples)).toBe(true);
    });
  });

  describe('improveWriting', () => {
    it('should provide writing improvements', async () => {
      const request = {
        content: 'John is a good student. He works hard and gets good grades.',
        focusArea: 'specificity' as const
      };

      const improvements = await aiService.improveWriting(request);
      
      expect(improvements).toBeDefined();
      expect(typeof improvements).toBe('string');
      expect(improvements.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeQuality', () => {
    it('should analyze content quality', async () => {
      const content = 'John Doe is an exceptional student who has demonstrated remarkable academic prowess and leadership skills throughout our two-year working relationship. As his academic advisor, I have observed his dedication to research and his ability to tackle complex problems with innovative solutions.';

      const analysis = await aiService.analyzeQuality(content);
      
      expect(analysis).toBeDefined();
      expect(analysis.score).toBeGreaterThanOrEqual(1);
      expect(analysis.score).toBeLessThanOrEqual(10);
      expect(analysis.wordCount).toBeGreaterThan(0);
      expect(Array.isArray(analysis.strengths)).toBe(true);
      expect(Array.isArray(analysis.improvements)).toBe(true);
      expect(Array.isArray(analysis.suggestions)).toBe(true);
      expect(typeof analysis.hasSpecificExamples).toBe('boolean');
      expect(typeof analysis.isProfessional).toBe('boolean');
      expect(typeof analysis.isUniversityAgnostic).toBe('boolean');
    });
  });
});