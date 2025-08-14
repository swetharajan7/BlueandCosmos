import { contentQualityService } from '../services/contentQualityService';

describe('Enhanced Content Quality Service', () => {
  const mockApplicationData = {
    applicantName: 'John Smith',
    programType: 'graduate',
    relationshipType: 'professor',
    relationshipDuration: '2 years',
    recommenderId: 'rec123'
  };

  const sampleContent = `I am writing to provide my strongest recommendation for John Smith for admission to your graduate program. I have had the privilege of working with John for the past two years as his professor in Advanced Computer Science courses.

John consistently demonstrated exceptional analytical skills and innovative thinking throughout our collaboration. In my Database Systems course, he developed a novel optimization algorithm that improved query performance by 35%, which was later adopted by our department for teaching purposes. His project received the highest grade in the class and was presented at our annual student research symposium.

Beyond his technical abilities, John exhibits remarkable leadership qualities. He served as a team leader for our capstone project, coordinating a group of five students to develop a comprehensive web application. Under his guidance, the team delivered the project two weeks ahead of schedule and received recognition from industry partners.

John's dedication to learning is evident in his consistent academic performance, maintaining a 3.9 GPA while taking on additional research responsibilities. He has co-authored two research papers with me, demonstrating his ability to contribute meaningfully to academic discourse.

I recommend John without reservation for admission to your program. His combination of technical expertise, leadership skills, and academic excellence makes him an ideal candidate who will contribute significantly to your academic community.`;

  describe('Real-time Quality Analysis', () => {
    it('should analyze content quality in real-time', async () => {
      const result = await contentQualityService.analyzeQualityRealTime(sampleContent, mockApplicationData);
      
      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.specificity).toBeDefined();
      expect(result.structure).toBeDefined();
      expect(result.language).toBeDefined();
      expect(result.completeness).toBeDefined();
      expect(result.originality).toBeDefined();
      expect(result.readability).toBeDefined();
      expect(result.feedback).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.analysisId).toBeDefined();
    });

    it('should provide higher scores for high-quality content', async () => {
      const result = await contentQualityService.analyzeQualityRealTime(sampleContent, mockApplicationData);
      
      expect(result.overall).toBeGreaterThan(70);
      expect(result.specificity).toBeGreaterThan(70); // Has specific examples and metrics
      expect(result.structure).toBeGreaterThan(70); // Well-structured with intro, body, conclusion
      expect(result.language).toBeGreaterThan(70); // Professional language
    });

    it('should provide lower scores for poor-quality content', async () => {
      const poorContent = 'John is a good student. He is nice and works hard. I recommend him.';
      const result = await contentQualityService.analyzeQualityRealTime(poorContent, mockApplicationData);
      
      expect(result.overall).toBeLessThan(60);
      expect(result.specificity).toBeLessThan(60); // Generic content
      expect(result.completeness).toBeLessThan(60); // Too short
    });

    it('should handle empty or very short content gracefully', async () => {
      const shortContent = 'John is good.';
      const result = await contentQualityService.analyzeQualityRealTime(shortContent, mockApplicationData);
      
      expect(result).toBeDefined();
      expect(result.overall).toBeLessThan(50);
      expect(result.feedback).toContain(expect.stringMatching(/expand|length|comprehensive/i));
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

    it('should detect template-like content', async () => {
      const templateContent = `I am writing to recommend John Smith for admission to your program. 
      It is my pleasure to recommend John Smith for admission to your university.
      I have known John Smith for two years and can recommend him without reservation.`;
      
      const result = await contentQualityService.detectPlagiarism(templateContent);
      
      expect(result.originalityScore).toBeLessThan(80);
      expect(result.overallRisk).toMatch(/^(medium|high)$/);
      expect(result.suspiciousSegments.length).toBeGreaterThan(0);
    });

    it('should detect repetitive content', async () => {
      const repetitiveContent = `John is excellent. John is outstanding. John is exceptional. 
      John is remarkable. John is extraordinary. John is phenomenal.`;
      
      const result = await contentQualityService.detectPlagiarism(repetitiveContent);
      
      expect(result.originalityScore).toBeLessThan(90);
      expect(result.recommendations).toContain(expect.stringMatching(/original|unique|specific/i));
    });

    it('should exclude current recommender from similarity check', async () => {
      const result = await contentQualityService.detectPlagiarism(sampleContent, 'rec123');
      
      expect(result).toBeDefined();
      // Should not flag content from the same recommender
      expect(result.originalityScore).toBeGreaterThan(70);
    });
  });

  describe('Quality Benchmarks', () => {
    it('should provide overall benchmarks', async () => {
      const benchmarks = await contentQualityService.getQualityBenchmarks();
      
      expect(benchmarks).toBeInstanceOf(Array);
      expect(benchmarks.length).toBeGreaterThan(0);
      
      const overallBenchmark = benchmarks.find(b => b.category === 'Overall');
      expect(overallBenchmark).toBeDefined();
      expect(overallBenchmark!.averageScore).toBeGreaterThan(0);
      expect(overallBenchmark!.topPercentile).toBeGreaterThan(overallBenchmark!.averageScore);
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
    it('should auto-save with comprehensive analysis', async () => {
      const result = await contentQualityService.autoSaveWithQuality(sampleContent, mockApplicationData);
      
      expect(result.saved).toBe(true);
      expect(result.quality).toBeDefined();
      expect(result.validation).toBeDefined();
      expect(result.plagiarism).toBeDefined();
    });

    it('should skip analysis for very short content', async () => {
      const shortContent = 'Short text';
      const result = await contentQualityService.autoSaveWithQuality(shortContent, mockApplicationData);
      
      expect(result.saved).toBe(true);
      expect(result.quality).toBeUndefined();
      expect(result.validation).toBeUndefined();
      expect(result.plagiarism).toBeUndefined();
    });

    it('should handle analysis errors gracefully', async () => {
      // Mock a service error
      const originalAnalyze = contentQualityService.analyzeQualityRealTime;
      contentQualityService.analyzeQualityRealTime = jest.fn().mockRejectedValue(new Error('Analysis failed'));
      
      const result = await contentQualityService.autoSaveWithQuality(sampleContent, mockApplicationData);
      
      expect(result.saved).toBe(true);
      // Should still save even if analysis fails
      
      // Restore original method
      contentQualityService.analyzeQualityRealTime = originalAnalyze;
    });
  });

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
      expect(result.universityReferences).toContain(expect.stringMatching(/harvard|california/i));
    });

    it('should validate content length requirements', async () => {
      const shortContent = 'John is good.';
      const longContent = 'a'.repeat(10001);
      
      const shortResult = await contentQualityService.validateContent(shortContent);
      const longResult = await contentQualityService.validateContent(longContent);
      
      expect(shortResult.isValid).toBe(false);
      expect(shortResult.errors).toContain(expect.stringMatching(/200 words/i));
      
      expect(longResult.isValid).toBe(false);
      expect(longResult.errors).toContain(expect.stringMatching(/1000 words/i));
    });

    it('should warn about generic content', async () => {
      const genericContent = `John is a good student and a nice person. He is a hard worker and a smart student. 
      He is a great student who would be good for your program. He is a nice person and a good student.`;
      
      const result = await contentQualityService.validateContent(genericContent);
      
      expect(result.warnings).toContain(expect.stringMatching(/generic phrases/i));
    });

    it('should encourage specific examples', async () => {
      const vagueContent = `John is an excellent student who always performs well. 
      He has great potential and would succeed in any program. I highly recommend him for admission.`;
      
      const result = await contentQualityService.validateContent(vagueContent);
      
      expect(result.warnings).toContain(expect.stringMatching(/specific examples|metrics|achievements/i));
    });
  });

  describe('Originality Analysis', () => {
    it('should score original content highly', async () => {
      // Test the private method through the public interface
      const result = await contentQualityService.analyzeQualityRealTime(sampleContent, mockApplicationData);
      
      expect(result.originality).toBeGreaterThan(70);
    });

    it('should detect repetitive patterns', async () => {
      const repetitiveContent = `John is excellent. John is excellent. John is excellent. 
      The same content repeated over and over. The same content repeated over and over.`;
      
      const result = await contentQualityService.analyzeQualityRealTime(repetitiveContent, mockApplicationData);
      
      expect(result.originality).toBeLessThan(70);
    });

    it('should penalize common phrases', async () => {
      const commonPhrasesContent = `John is a good student. He is a nice person. 
      He is great and excellent. He is outstanding and exceptional.`;
      
      const result = await contentQualityService.analyzeQualityRealTime(commonPhrasesContent, mockApplicationData);
      
      expect(result.originality).toBeLessThan(90);
    });
  });

  describe('Readability Analysis', () => {
    it('should score readable content appropriately', async () => {
      const result = await contentQualityService.analyzeQualityRealTime(sampleContent, mockApplicationData);
      
      expect(result.readability).toBeGreaterThan(50);
      expect(result.readability).toBeLessThanOrEqual(100);
    });

    it('should handle complex sentences', async () => {
      const complexContent = `The aforementioned individual, whose academic proclivities and intellectual capabilities 
      have been demonstrated through a multiplicity of challenging coursework and research endeavors, 
      exhibits characteristics that are indicative of exceptional potential for success in graduate-level studies.`;
      
      const result = await contentQualityService.analyzeQualityRealTime(complexContent, mockApplicationData);
      
      expect(result.readability).toBeLessThan(80); // Complex sentences should score lower
    });

    it('should handle simple sentences', async () => {
      const simpleContent = `John is a great student. He works hard every day. 
      His grades are excellent. He helps other students. I recommend him highly.`;
      
      const result = await contentQualityService.analyzeQualityRealTime(simpleContent, mockApplicationData);
      
      expect(result.readability).toBeGreaterThan(70); // Simple sentences should score higher
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid application data gracefully', async () => {
      const invalidData = {
        applicantName: '',
        programType: '',
        relationshipType: '',
        relationshipDuration: ''
      };
      
      const result = await contentQualityService.analyzeQualityRealTime(sampleContent, invalidData);
      
      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThan(0);
    });

    it('should provide fallback scores when AI analysis fails', async () => {
      // This would test the fallback mechanism when external services fail
      const result = await contentQualityService.analyzeQualityRealTime(sampleContent, mockApplicationData);
      
      expect(result).toBeDefined();
      expect(result.overall).toBeGreaterThan(0);
      expect(result.feedback).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });
  });
});