import { contentQualityService } from '../services/contentQualityService';

describe('ContentQualityService', () => {
  const mockApplicationData = {
    applicantName: 'John Smith',
    programType: 'MBA',
    relationshipType: 'Professor',
    relationshipDuration: '2 years'
  };

  describe('analyzeQuality', () => {
    it('should analyze content quality and return scores', async () => {
      const content = `I am pleased to recommend John Smith for admission to your MBA program. I have known John for 2 years as his professor in Advanced Marketing Strategy, where he consistently demonstrated exceptional analytical skills and leadership qualities.

      John's academic performance was outstanding, achieving a 95% average in my course. He led a team project that increased client engagement by 40% through innovative digital marketing strategies. His presentation skills are remarkable, and he has the ability to communicate complex ideas clearly to diverse audiences.

      John's character is exemplary. He shows integrity in all his dealings and has a strong work ethic. He volunteered 50 hours at the local business incubator, mentoring startup founders on marketing strategies. His dedication to helping others while maintaining his academic excellence is truly impressive.

      I recommend John without reservation. He has the intellectual capacity, leadership potential, and character to excel in your MBA program and make significant contributions to the business world.`;

      const result = await contentQualityService.analyzeQuality(content, mockApplicationData);

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('specificity');
      expect(result).toHaveProperty('structure');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('completeness');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('suggestions');

      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.feedback)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle short content appropriately', async () => {
      const content = 'John is a good student.';

      const result = await contentQualityService.analyzeQuality(content, mockApplicationData);

      expect(result.overall).toBeLessThan(70);
      expect(result.feedback.some(f => /needs.*improvement|expand.*content/i.test(f))).toBe(true);
    });

    it('should reward specific examples and metrics', async () => {
      const contentWithSpecifics = `John achieved a 95% average in my Advanced Marketing course. He led a team of 5 students and increased project efficiency by 30%. Over 2 years, he completed 3 major research projects and published 1 paper.`;

      const contentGeneric = `John is a very good student who works hard and gets good grades. He is nice and smart.`;

      const specificResult = await contentQualityService.analyzeQuality(contentWithSpecifics, mockApplicationData);
      const genericResult = await contentQualityService.analyzeQuality(contentGeneric, mockApplicationData);

      expect(specificResult.specificity).toBeGreaterThan(genericResult.specificity);
    });
  });

  describe('validateContent', () => {
    it('should detect university-specific references', async () => {
      const content = `I recommend John for Harvard University. He would be perfect for Stanford's program and would fit well at MIT.`;

      const result = await contentQualityService.validateContent(content);

      expect(result.universityAgnostic).toBe(false);
      expect(result.universityReferences).toContain('Harvard University');
      expect(result.universityReferences).toContain('Stanford');
      expect(result.universityReferences).toContain('MIT');
    });

    it('should validate word count requirements', async () => {
      const shortContent = 'John is good.';
      const longContent = 'word '.repeat(1001);

      const shortResult = await contentQualityService.validateContent(shortContent);
      const longResult = await contentQualityService.validateContent(longContent);

      expect(shortResult.errors.some(e => /at least 200 words/i.test(e))).toBe(true);
      expect(longResult.errors.some(e => /not exceed 1000 words/i.test(e))).toBe(true);
    });

    it('should warn about generic phrases', async () => {
      const genericContent = `John is a good student and a hard worker. He is a nice person and a smart student. He is a great student who works hard.`;

      const result = await contentQualityService.validateContent(genericContent);

      expect(result.warnings.some(w => /generic phrases/i.test(w))).toBe(true);
    });

    it('should pass validation for quality content', async () => {
      const qualityContent = `I am pleased to recommend John Smith for admission to your graduate program. I have known John for two years as his professor in Advanced Marketing Strategy, where he consistently demonstrated exceptional analytical skills and leadership qualities that set him apart from his peers.

      John's academic performance was outstanding, achieving a 95% average in my course. He led a team project that increased client engagement by 40% through innovative digital marketing strategies. His presentation skills are remarkable, and he has the ability to communicate complex ideas clearly to diverse audiences. Throughout the semester, he consistently submitted high-quality work that exceeded expectations and demonstrated deep understanding of marketing principles.

      John's character is exemplary. He shows integrity in all his dealings and has a strong work ethic that is evident in everything he does. He volunteered 50 hours at the local business incubator, mentoring startup founders on marketing strategies. His dedication to helping others while maintaining his academic excellence is truly impressive and speaks to his time management skills and commitment to service.

      Beyond academics, John demonstrated exceptional leadership abilities when he organized a student marketing conference that attracted over 200 participants. He managed a team of 15 volunteers and secured sponsorship from three major corporations. His ability to inspire and motivate others while maintaining attention to detail made the event a tremendous success.

      I recommend John without reservation. He has the intellectual capacity, leadership potential, and character to excel in your program and make significant contributions to his field. His combination of analytical skills, creativity, and interpersonal abilities make him an ideal candidate for advanced study.`;

      const result = await contentQualityService.validateContent(qualityContent);

      expect(result.errors).toHaveLength(0);
      expect(result.universityAgnostic).toBe(true);
    });
  });

  describe('autoSaveWithQuality', () => {
    it('should return basic response for short content', async () => {
      const shortContent = 'John is a student.';

      const result = await contentQualityService.autoSaveWithQuality(shortContent, mockApplicationData);

      expect(result.saved).toBe(true);
      expect(result.quality).toBeUndefined();
      expect(result.validation).toBeUndefined();
    });

    it('should return quality analysis for substantial content', async () => {
      const substantialContent = `I am pleased to recommend John Smith for admission to your program. I have known John for two years as his professor in Advanced Marketing Strategy, where he consistently demonstrated exceptional analytical skills and leadership qualities. John's academic performance was outstanding, achieving a 95% average in my course. He led multiple projects and showed remarkable dedication to his studies. His work ethic is exemplary and he consistently delivers high-quality results.`;

      const result = await contentQualityService.autoSaveWithQuality(substantialContent, mockApplicationData);

      expect(result.saved).toBe(true);
      expect(result.quality).toBeDefined();
      expect(result.validation).toBeDefined();
    });
  });

  describe('private methods behavior', () => {
    it('should analyze specificity correctly', async () => {
      const specificContent = `John Smith achieved a 95% average in my Advanced Marketing course. He led a team of 5 students and increased project efficiency by 30%. Over 2 years as a Professor, he completed 3 major research projects.`;

      const result = await contentQualityService.analyzeQuality(specificContent, mockApplicationData);

      expect(result.specificity).toBeGreaterThan(70);
    });

    it('should analyze structure correctly', async () => {
      const wellStructuredContent = `I am pleased to recommend John Smith for your program.

      John's academic performance was outstanding in my courses. He demonstrated exceptional analytical skills and leadership qualities throughout our two-year relationship.

      His character is exemplary, showing integrity in all dealings. He has a strong work ethic and dedication to excellence.

      I recommend John without reservation for your program.`;

      const result = await contentQualityService.analyzeQuality(wellStructuredContent, mockApplicationData);

      expect(result.structure).toBeGreaterThan(60);
    });

    it('should analyze language quality correctly', async () => {
      const professionalContent = `John demonstrates exceptional analytical capabilities, outstanding leadership qualities, remarkable presentation skills, innovative problem-solving abilities, and exemplary professional conduct.`;

      const informalContent = `John is pretty cool and awesome. He's okay at his work and seems nice enough.`;

      const professionalResult = await contentQualityService.analyzeQuality(professionalContent, mockApplicationData);
      const informalResult = await contentQualityService.analyzeQuality(informalContent, mockApplicationData);

      expect(professionalResult.language).toBeGreaterThan(informalResult.language);
    });
  });
});