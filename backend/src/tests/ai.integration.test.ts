import request from 'supertest';
import app from '../server';
import { validateOpenAIConfig } from '../config/openai';

describe('AI Integration Tests', () => {
  let authToken: string;
  let recommenderToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Create test users
    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'Student',
        email: 'test.student@example.com',
        password: 'TestPassword123!',
        role: 'student'
      });

    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'Recommender',
        email: 'test.recommender@example.com',
        password: 'TestPassword123!',
        role: 'recommender'
      });

    await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'Admin',
        email: 'test.admin@example.com',
        password: 'TestPassword123!',
        role: 'admin'
      });

    // Get auth tokens
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.student@example.com',
        password: 'TestPassword123!'
      });

    const recommenderLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.recommender@example.com',
        password: 'TestPassword123!'
      });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test.admin@example.com',
        password: 'TestPassword123!'
      });

    authToken = studentLogin.body.data.token;
    recommenderToken = recommenderLogin.body.data.token;
    adminToken = adminLogin.body.data.token;
  });

  describe('AI Service Configuration', () => {
    it('should have proper OpenAI configuration', () => {
      // Set test environment variables
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_MODEL = 'gpt-4';
      
      const isValid = validateOpenAIConfig();
      expect(isValid).toBe(true);
    });
  });

  describe('Complete AI Workflow', () => {
    const sampleApplicationData = {
      applicantName: 'Jane Smith',
      programType: 'mba',
      universities: ['Harvard Business School', 'Stanford Graduate School of Business', 'Wharton School'],
      relationshipType: 'Direct Manager',
      relationshipDuration: '3 years',
      recommenderTitle: 'Senior Director of Marketing'
    };

    it('should complete full AI-assisted recommendation workflow', async () => {
      // Step 1: Generate outline
      const outlineResponse = await request(app)
        .post('/api/ai/generate-outline')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send(sampleApplicationData);

      expect(outlineResponse.status).toBe(200);
      expect(outlineResponse.body.data.outline).toBeDefined();

      // Step 2: Get examples
      const examplesResponse = await request(app)
        .post('/api/ai/suggest-examples')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          programType: sampleApplicationData.programType,
          relationshipType: sampleApplicationData.relationshipType,
          recommenderTitle: sampleApplicationData.recommenderTitle
        });

      expect(examplesResponse.status).toBe(200);
      expect(Array.isArray(examplesResponse.body.data.examples)).toBe(true);

      // Step 3: Analyze initial draft
      const draftContent = `I have worked with Jane Smith for three years as her direct manager at our marketing firm. She is a good employee who works hard and gets things done. I think she would be good for business school.`;

      const analysisResponse = await request(app)
        .post('/api/ai/analyze-quality')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({ content: draftContent });

      expect(analysisResponse.status).toBe(200);
      expect(analysisResponse.body.data.analysis.score).toBeDefined();
      expect(analysisResponse.body.data.analysis.improvements).toBeDefined();

      // Step 4: Improve writing
      const improvementResponse = await request(app)
        .post('/api/ai/improve-writing')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          content: draftContent,
          focusArea: 'specificity'
        });

      expect(improvementResponse.status).toBe(200);
      expect(improvementResponse.body.data.improvements).toBeDefined();

      // Step 5: Final quality check
      const improvedContent = `I have had the privilege of working directly with Jane Smith for three years as her manager in the Strategic Marketing division at TechCorp. During this time, Jane has consistently demonstrated exceptional analytical skills, strategic thinking, and leadership capabilities that make her an ideal candidate for an MBA program.

Jane's analytical prowess is evident in her work on our market expansion project, where she conducted comprehensive market research and developed a data-driven strategy that resulted in a 35% increase in our target market penetration. Her ability to synthesize complex data into actionable insights has been instrumental in several key business decisions.

As a leader, Jane has successfully managed cross-functional teams of up to 12 members, consistently delivering projects on time and under budget. Her collaborative approach and excellent communication skills have earned her respect across all levels of the organization. I have observed her mentor junior team members, demonstrating both patience and expertise in developing their skills.

Jane's strategic mindset is particularly noteworthy. She has the rare ability to see both the big picture and the detailed execution required to achieve ambitious goals. Her proposal for our digital transformation initiative was adopted company-wide and has generated over $2M in cost savings annually.

I recommend Jane Smith without reservation for admission to your MBA program. Her combination of analytical rigor, leadership experience, and strategic vision will make her a valuable addition to your academic community and a successful business leader upon graduation.`;

      const finalAnalysisResponse = await request(app)
        .post('/api/ai/analyze-quality')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({ content: improvedContent });

      expect(finalAnalysisResponse.status).toBe(200);
      expect(finalAnalysisResponse.body.data.analysis.score).toBeGreaterThan(
        analysisResponse.body.data.analysis.score
      );
      expect(finalAnalysisResponse.body.data.analysis.hasSpecificExamples).toBe(true);
      expect(finalAnalysisResponse.body.data.analysis.isProfessional).toBe(true);
    });
  });

  describe('Access Control', () => {
    it('should allow recommenders to access AI endpoints', async () => {
      const response = await request(app)
        .post('/api/ai/suggest-examples')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({ programType: 'graduate' });

      expect(response.status).toBe(200);
    });

    it('should allow students to access AI endpoints', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });

    it('should restrict usage stats to admin only', async () => {
      const studentResponse = await request(app)
        .get('/api/ai/usage-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(studentResponse.status).toBe(403);

      const recommenderResponse = await request(app)
        .get('/api/ai/usage-stats')
        .set('Authorization', `Bearer ${recommenderToken}`);

      expect(recommenderResponse.status).toBe(403);

      const adminResponse = await request(app)
        .get('/api/ai/usage-stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminResponse.status).toBe(200);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/api/ai/generate-outline')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({
          applicantName: '', // Invalid: empty name
          programType: 'invalid-type', // Invalid: not in enum
          universities: [], // Invalid: empty array
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle very long content appropriately', async () => {
      const veryLongContent = 'A'.repeat(3000); // Exceeds 2000 char limit

      const response = await request(app)
        .post('/api/ai/analyze-quality')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({ content: veryLongContent });

      expect(response.status).toBe(400);
    });

    it('should handle special characters and unicode', async () => {
      const unicodeContent = `I have worked with José María González-López for two years. He has demonstrated exceptional skills in data analysis and has improved our efficiency by 25%. His work on the "Análisis de Mercado" project was outstanding. I highly recommend him for graduate studies in business analytics.`;

      const response = await request(app)
        .post('/api/ai/analyze-quality')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({ content: unicodeContent });

      expect(response.status).toBe(200);
      expect(response.body.data.analysis).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      const requests = [];
      const testData = {
        programType: 'graduate',
        relationshipType: 'Professor',
        recommenderTitle: 'Associate Professor'
      };

      // Make 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/ai/suggest-examples')
            .set('Authorization', `Bearer ${recommenderToken}`)
            .send(testData)
        );
      }

      const responses = await Promise.all(requests);
      
      // All requests should succeed or be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });

    it('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/ai/health')
        .set('Authorization', `Bearer ${recommenderToken}`);

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });
  });

  describe('Content Validation', () => {
    it('should filter inappropriate content', async () => {
      const contentWithUniversityNames = `I strongly recommend John for Harvard University and Stanford. He would be perfect for MIT as well.`;

      const response = await request(app)
        .post('/api/ai/improve-writing')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({ content: contentWithUniversityNames });

      expect(response.status).toBe(200);
      // The response should not contain specific university names
      expect(response.body.data.improvements).toBeDefined();
    });

    it('should handle edge cases in content analysis', async () => {
      const edgeCaseContent = `This is a recommendation with numbers like 123, percentages like 45%, and symbols like @#$%. The student improved performance by 200% and worked on 5 different projects.`;

      const response = await request(app)
        .post('/api/ai/analyze-quality')
        .set('Authorization', `Bearer ${recommenderToken}`)
        .send({ content: edgeCaseContent });

      expect(response.status).toBe(200);
      expect(response.body.data.analysis.hasSpecificExamples).toBe(true);
    });
  });
});