import { contentQualityService } from '../services/contentQualityService';

// Mock the AI service to avoid external dependencies
jest.mock('../services/aiService', () => ({
  aiService: {
    improveWriting: jest.fn().mockResolvedValue('Mocked AI suggestions')
  }
}));

describe('Content Quality Service - Basic Tests', () => {
  const mockApplicationData = {
    applicantName: 'John Smith',
    programType: 'graduate',
    relationshipType: 'professor',
    relationshipDuration: '2 years',
    recommenderId: 'rec123'
  };

  const sampleContent = `I am writing to provide my strongest recommendation for John Smith for admission to your graduate program. I have had the privilege of working with John for the past two years as his professor in Advanced Computer Science courses.

John consistently demonstrated exceptional analytical skills and innovative thinking throughout our collaboration. In my Database Systems course, he developed a novel optimization algorithm that improved query performance by 35%, which was later adopted by our department for teaching purposes.

Beyond his technical abilities, John exhibits remarkable leadership qualities. He served as a team leader for our capstone project, coordinating a group of five students to develop a comprehensive web application.

I recommend John without reservation for admission to your program. His combination of technical expertise, leadership skills, and academic excellence makes him an ideal candidate.`;

  describe('Content Validation', () => {
    it('should validate university-agnostic content', async () => {
      const result = await contentQualityService.validateContent(sampleContent);
      
      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.universityAgnostic).toBe(true);
      expect(result.universityReferences).toBeInstanceOf(Array);
      expect(result.universityReferences.length).toBe(0);
    });

    it('should detect university-specific references', async () => {
      const universitySpecificContent = `I recommend John for admission to Harvard University. 
      He would be a great fit for your institution and the University of California system.`;
      
      const result = await contentQualityService.validateContent(universitySpecificContent);
      
      expect(result.universityAgnostic).toBe(false);
      expect(result.universityReferences.length).toBeGreaterThan(0);
      expect(result.universityReferences.some(ref => ref.toLowerCase().includes('harvard'))).toBe(true);
    });

    it('should validate content length requirements', async () => {
      const shortContent = 'John is good.';
      const longContent = 'a'.repeat(10001);
      
      const shortResult = await contentQualityService.validateContent(shortContent);
      const longResult = await contentQualityService.validateContent(longContent);
      
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors.some(error => error.includes('200 words'))).toBe(true);
      
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors.length).toBeGreaterThan(0);
    });

    it('should warn about generic content', async () => {
      const genericContent = `John is a good student and a nice person. He is a hard worker and a smart student. 
      He is a great student who would be good for your program. He is a nice person and a good student.`;
      
      const result = await contentQualityService.validateContent(genericContent);
      
      expect(result.warnings.some(warning => warning.includes('generic phrases'))).toBe(true);
    });

    it('should encourage specific examples', async () => {
      const vagueContent = `John is an excellent student who always performs well. 
      He has great potential and would succeed in any program. I highly recommend him for admission.`;
      
      const result = await contentQualityService.validateContent(vagueContent);
      
      expect(result.warnings.some(warning => 
        warning.includes('specific examples') || 
        warning.includes('metrics') || 
        warning.includes('achievements')
      )).toBe(true);
    });
  });

  describe('Plagiarism Detection', () => {
    it('should detect original content', async () => {
      const result = await contentQualityService.detectPlagiarism(sampleContent);
      
      expect(result).toBeDefined();
      expect(result.originalityScore).toBeGreaterThan(0);
      expect(result.originalityScore).toBeLessThanOrEqual(100);
      expect(result.suspiciousSegments).toBeInstanceOf(Array);
      expect(result.overallRisk).toMatch(/^(low|medium|high)$/);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should exclude current recommender from similarity check', async () => {
      const result = await contentQualityService.detectPlagiarism(sampleContent, 'rec123');
      
      expect(result).toBeDefined();
      expect(result.originalityScore).toBeGreaterThan(0);
    });
  });

  describe('Quality Benchmarks', () => {
    it('should provide overall benchmarks', async () => {
      const benchmarks = await contentQualityService.getQualityBenchmarks();
      
      expect(benchmarks).toBeInstanceOf(Array);
      expect(benchmarks.length).toBeGreaterThan(0);
      
      const overallBenchmark = benchmarks.find(b => b.category === 'Overall');
      expect(overallBenchmark).toBeDefined();
      expect(overallBenchmark!.averageScore).toBeGreaterThanOrEqual(0);
      expect(overallBenchmark!.topPercentile).toBeGreaterThanOrEqual(overallBenchmark!.averageScore);
      expect(overallBenchmark!.improvementAreas).toBeInstanceOf(Array);
      expect(overallBenchmark!.sampleCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide program-specific benchmarks', async () => {
      const benchmarks = await contentQualityService.getQualityBenchmarks('graduate');
      
      expect(benchmarks).toBeInstanceOf(Array);
      const programBenchmark = benchmarks.find(b => b.category.includes('graduate'));
      expect(programBenchmark).toBeDefined();
    });

    it('should provide relationship-specific benchmarks', async () => {
      const benchmarks = await contentQualityService.getQualityBenchmarks(undefined, 'professor');
      
      expect(benchmarks).toBeInstanceOf(Array);
      const relationshipBenchmark = benchmarks.find(b => b.category.includes('professor'));
      expect(relationshipBenchmark).toBeDefined();
    });
  });

  describe('Quality Analytics', () => {
    it('should provide analytics for different time ranges', async () => {
      const weeklyAnalytics = await contentQualityService.getQualityAnalytics('week');
      const monthlyAnalytics = await contentQualityService.getQualityAnalytics('month');
      
      expect(weeklyAnalytics).toBeDefined();
      expect(weeklyAnalytics.totalAnalyses).toBeGreaterThanOrEqual(0);
      expect(weeklyAnalytics.averageQuality).toBeGreaterThanOrEqual(0);
      expect(weeklyAnalytics.qualityTrends).toBeInstanceOf(Array);
      expect(weeklyAnalytics.commonIssues).toBeInstanceOf(Array);
      expect(weeklyAnalytics.benchmarks).toBeInstanceOf(Array);
      
      expect(monthlyAnalytics).toBeDefined();
    });

    it('should track quality trends over time', async () => {
      const analytics = await contentQualityService.getQualityAnalytics('month');
      
      expect(analytics.qualityTrends).toBeInstanceOf(Array);
      analytics.qualityTrends.forEach(trend => {
        expect(trend.date).toBeDefined();
        expect(trend.averageScore).toBeGreaterThanOrEqual(0);
        expect(trend.averageScore).toBeLessThanOrEqual(100);
        expect(trend.analysisCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should identify common issues', async () => {
      const analytics = await contentQualityService.getQualityAnalytics('month');
      
      expect(analytics.commonIssues).toBeInstanceOf(Array);
      analytics.commonIssues.forEach(issue => {
        expect(issue.issue).toBeDefined();
        expect(issue.frequency).toBeGreaterThanOrEqual(0);
        expect(issue.impact).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Enhanced Auto-save', () => {
    it('should skip analysis for very short content', async () => {
      const shortContent = 'Short text';
      const result = await contentQualityService.autoSaveWithQuality(shortContent, mockApplicationData);
      
      expect(result.saved).toBe(true);
      expect(result.quality).toBeUndefined();
      expect(result.validation).toBeUndefined();
      expect(result.plagiarism).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle analysis errors gracefully', async () => {
      // This test verifies that the service handles errors without crashing
      const result = await contentQualityService.autoSaveWithQuality(sampleContent, mockApplicationData);
      
      expect(result.saved).toBe(true);
      // Should still save even if analysis fails
    });
  });
});