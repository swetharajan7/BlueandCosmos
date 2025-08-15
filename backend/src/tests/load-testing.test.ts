import request from 'supertest';
import { app } from '../server';
import { performance } from 'perf_hooks';

describe('Load Testing Suite', () => {
  const CONCURRENT_USERS = 100;
  const TEST_DURATION_MS = 30000; // 30 seconds
  const MAX_RESPONSE_TIME_MS = 2000; // 2 seconds
  
  interface LoadTestResult {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    requestsPerSecond: number;
  }

  const simulateUserLoad = async (endpoint: string, method: 'GET' | 'POST' = 'GET', payload?: any): Promise<LoadTestResult> => {
    const results: number[] = [];
    const errors: Error[] = [];
    const startTime = performance.now();
    const endTime = startTime + TEST_DURATION_MS;
    
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const userPromise = (async () => {
        while (performance.now() < endTime) {
          const requestStart = performance.now();
          
          try {
            let response;
            if (method === 'GET') {
              response = await request(app).get(endpoint);
            } else {
              response = await request(app).post(endpoint).send(payload);
            }
            
            const requestEnd = performance.now();
            const responseTime = requestEnd - requestStart;
            results.push(responseTime);
            
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            errors.push(error as Error);
          }
        }
      })();
      
      promises.push(userPromise);
    }
    
    await Promise.all(promises);
    
    const totalTime = (performance.now() - startTime) / 1000; // Convert to seconds
    
    return {
      totalRequests: results.length + errors.length,
      successfulRequests: results.length,
      failedRequests: errors.length,
      averageResponseTime: results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 0,
      maxResponseTime: results.length > 0 ? Math.max(...results) : 0,
      minResponseTime: results.length > 0 ? Math.min(...results) : 0,
      requestsPerSecond: (results.length + errors.length) / totalTime
    };
  };

  describe('Authentication Endpoints Load Testing', () => {
    it('should handle concurrent login requests', async () => {
      const loginPayload = {
        email: 'test@example.com',
        password: 'testpassword123'
      };
      
      const result = await simulateUserLoad('/api/auth/login', 'POST', loginPayload);
      
      console.log('Login Load Test Results:', result);
      
      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      expect(result.requestsPerSecond).toBeGreaterThan(1);
    }, 60000);

    it('should handle concurrent registration requests', async () => {
      const registrationPayload = {
        email: 'newuser@example.com',
        password: 'newpassword123',
        firstName: 'Test',
        lastName: 'User'
      };
      
      const result = await simulateUserLoad('/api/auth/register', 'POST', registrationPayload);
      
      console.log('Registration Load Test Results:', result);
      
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    }, 60000);
  });

  describe('Application Endpoints Load Testing', () => {
    it('should handle concurrent application creation requests', async () => {
      const applicationPayload = {
        legalName: 'Test Student',
        universities: ['harvard', 'stanford'],
        programType: 'graduate',
        applicationTerm: 'Fall 2026'
      };
      
      const result = await simulateUserLoad('/api/applications', 'POST', applicationPayload);
      
      console.log('Application Creation Load Test Results:', result);
      
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
    }, 60000);

    it('should handle concurrent application status requests', async () => {
      const result = await simulateUserLoad('/api/applications/status');
      
      console.log('Application Status Load Test Results:', result);
      
      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeLessThan(MAX_RESPONSE_TIME_MS);
      expect(result.requestsPerSecond).toBeGreaterThan(5);
    }, 60000);
  });

  describe('AI Service Load Testing', () => {
    it('should handle concurrent AI writing assistance requests', async () => {
      const aiPayload = {
        content: 'This is a test recommendation letter content.',
        type: 'improve-writing'
      };
      
      const result = await simulateUserLoad('/api/ai/improve-writing', 'POST', aiPayload);
      
      console.log('AI Service Load Test Results:', result);
      
      expect(result.totalRequests).toBeGreaterThan(0);
      // AI requests may take longer due to external API calls
      expect(result.averageResponseTime).toBeLessThan(5000);
    }, 90000);
  });

  describe('Database Performance Under Load', () => {
    it('should maintain database performance under concurrent reads', async () => {
      const result = await simulateUserLoad('/api/universities');
      
      console.log('Database Read Load Test Results:', result);
      
      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeLessThan(1000);
      expect(result.requestsPerSecond).toBeGreaterThan(10);
    }, 60000);
  });

  describe('Memory and Resource Usage', () => {
    it('should not exceed memory limits during load testing', async () => {
      const initialMemory = process.memoryUsage();
      
      // Run multiple concurrent load tests
      const promises = [
        simulateUserLoad('/api/universities'),
        simulateUserLoad('/api/applications/status'),
        simulateUserLoad('/api/auth/verify-token', 'POST', { token: 'test-token' })
      ];
      
      await Promise.all(promises);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log('Memory Usage:', {
        initial: initialMemory.heapUsed / 1024 / 1024,
        final: finalMemory.heapUsed / 1024 / 1024,
        increase: memoryIncrease / 1024 / 1024
      });
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    }, 120000);
  });
});