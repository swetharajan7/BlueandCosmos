import request from 'supertest';
import { app } from '../server';
import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database';

describe('Performance Tests', () => {
  let db: Pool;
  const testUsers: Array<{ token: string; userId: string }> = [];

  beforeAll(async () => {
    // Setup test database
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'stellarrec_performance_test';
    db = new Pool(DatabaseConfig.getConfig());
    
    // Create test users for performance testing
    for (let i = 0; i < 50; i++) {
      const userData = {
        email: `perfuser${i}@example.com`,
        password: 'PerformanceTest123!',
        first_name: `User${i}`,
        last_name: 'Performance'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      if (response.status === 201) {
        testUsers.push({
          token: response.body.tokens.accessToken,
          userId: response.body.user.id
        });
      }
    }
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM users WHERE email LIKE $1', ['perfuser%@example.com']);
    await db.end();
  });

  describe('Concurrent User Registration', () => {
    test('should handle 100 concurrent registrations', async () => {
      const concurrentUsers = 100;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentUsers; i++) {
        const userData = {
          email: `concurrent${i}@example.com`,
          password: 'ConcurrentTest123!',
          first_name: `Concurrent${i}`,
          last_name: 'User'
        };

        promises.push(
          request(app)
            .post('/api/auth/register')
            .send(userData)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Success rate should be high (allowing for some failures due to concurrency)
      const successfulRegistrations = responses.filter(r => r.status === 201).length;
      const successRate = successfulRegistrations / concurrentUsers;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate

      // Verify database consistency
      const userCount = await db.query('SELECT COUNT(*) FROM users WHERE email LIKE $1', ['concurrent%@example.com']);
      expect(parseInt(userCount.rows[0].count)).toBe(successfulRegistrations);

      console.log(`Concurrent Registration Performance:
        - Users: ${concurrentUsers}
        - Duration: ${duration}ms
        - Success Rate: ${(successRate * 100).toFixed(2)}%
        - Avg Response Time: ${(duration / concurrentUsers).toFixed(2)}ms`);
    });

    test('should maintain response time under load', async () => {
      const batchSize = 20;
      const batches = 5;
      const responseTimes: number[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = [];
        const batchStartTime = Date.now();

        for (let i = 0; i < batchSize; i++) {
          const userData = {
            email: `batch${batch}_user${i}@example.com`,
            password: 'BatchTest123!',
            first_name: `BatchUser${i}`,
            last_name: `Batch${batch}`
          };

          batchPromises.push(
            request(app)
              .post('/api/auth/register')
              .send(userData)
          );
        }

        await Promise.all(batchPromises);
        const batchEndTime = Date.now();
        const batchDuration = batchEndTime - batchStartTime;
        responseTimes.push(batchDuration / batchSize);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Response times should remain consistent
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
      expect(maxResponseTime - minResponseTime).toBeLessThan(1000); // Variance under 1s

      console.log(`Response Time Consistency:
        - Average: ${avgResponseTime.toFixed(2)}ms
        - Min: ${minResponseTime.toFixed(2)}ms
        - Max: ${maxResponseTime.toFixed(2)}ms
        - Variance: ${(maxResponseTime - minResponseTime).toFixed(2)}ms`);
    });
  });

  describe('Concurrent Application Creation', () => {
    test('should handle multiple applications simultaneously', async () => {
      const concurrentApplications = 25;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentApplications && i < testUsers.length; i++) {
        const applicationData = {
          legal_name: `Performance User ${i}`,
          universities: ['harvard', 'mit', 'stanford'],
          program_type: 'graduate',
          application_term: 'Fall 2024'
        };

        promises.push(
          request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${testUsers[i].token}`)
            .send(applicationData)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertions
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds
      
      const successfulApplications = responses.filter(r => r.status === 201).length;
      const successRate = successfulApplications / concurrentApplications;
      expect(successRate).toBeGreaterThan(0.9); // 90% success rate

      console.log(`Concurrent Application Creation Performance:
        - Applications: ${concurrentApplications}
        - Duration: ${duration}ms
        - Success Rate: ${(successRate * 100).toFixed(2)}%
        - Avg Response Time: ${(duration / concurrentApplications).toFixed(2)}ms`);
    });
  });

  describe('Database Query Performance', () => {
    test('should efficiently query users with pagination', async () => {
      const pageSize = 20;
      const pages = 5;
      const queryTimes: number[] = [];

      for (let page = 0; page < pages; page++) {
        const startTime = Date.now();
        
        const response = await request(app)
          .get(`/api/admin/users?page=${page}&limit=${pageSize}`)
          .set('Authorization', `Bearer ${testUsers[0].token}`);

        const endTime = Date.now();
        const queryTime = endTime - startTime;
        queryTimes.push(queryTime);

        expect(response.status).toBe(200);
        expect(response.body.users.length).toBeLessThanOrEqual(pageSize);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
      expect(avgQueryTime).toBeLessThan(200); // Average query under 200ms

      console.log(`Pagination Query Performance:
        - Average Query Time: ${avgQueryTime.toFixed(2)}ms
        - Query Times: ${queryTimes.map(t => t.toFixed(0)).join(', ')}ms`);
    });

    test('should handle complex joins efficiently', async () => {
      // Create applications for testing
      const applicationPromises = [];
      for (let i = 0; i < 10 && i < testUsers.length; i++) {
        applicationPromises.push(
          request(app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${testUsers[i].token}`)
            .send({
              legal_name: `Join Test User ${i}`,
              universities: ['harvard', 'mit'],
              program_type: 'graduate',
              application_term: 'Fall 2024'
            })
        );
      }
      await Promise.all(applicationPromises);

      const startTime = Date.now();
      
      // Complex query with joins
      const response = await request(app)
        .get('/api/admin/applications-with-users')
        .set('Authorization', `Bearer ${testUsers[0].token}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(queryTime).toBeLessThan(500); // Complex join under 500ms

      console.log(`Complex Join Query Performance: ${queryTime}ms`);
    });

    test('should maintain performance with large datasets', async () => {
      // Insert bulk test data
      const bulkSize = 1000;
      const values = [];
      const params = [];
      
      for (let i = 0; i < bulkSize; i++) {
        values.push(`($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`);
        params.push(`bulk${i}@example.com`, 'hashed_password', `Bulk${i}`, 'User', 'student');
      }

      const insertStartTime = Date.now();
      await db.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ${values.join(', ')}
      `, params);
      const insertEndTime = Date.now();
      const insertTime = insertEndTime - insertStartTime;

      expect(insertTime).toBeLessThan(5000); // Bulk insert under 5 seconds

      // Test search performance on large dataset
      const searchStartTime = Date.now();
      const searchResult = await db.query('SELECT * FROM users WHERE email LIKE $1 LIMIT 100', ['bulk%@example.com']);
      const searchEndTime = Date.now();
      const searchTime = searchEndTime - searchStartTime;

      expect(searchTime).toBeLessThan(100); // Search under 100ms
      expect(searchResult.rows.length).toBe(100);

      console.log(`Large Dataset Performance:
        - Bulk Insert (${bulkSize} records): ${insertTime}ms
        - Search Query: ${searchTime}ms`);

      // Cleanup
      await db.query('DELETE FROM users WHERE email LIKE $1', ['bulk%@example.com']);
    });
  });

  describe('API Rate Limiting and Throttling', () => {
    test('should enforce rate limits', async () => {
      const rapidRequests = 100;
      const promises = [];

      // Make rapid requests to test rate limiting
      for (let i = 0; i < rapidRequests; i++) {
        promises.push(
          request(app)
            .get('/api/universities')
            .set('Authorization', `Bearer ${testUsers[0].token}`)
        );
      }

      const responses = await Promise.all(promises);
      
      const successfulRequests = responses.filter(r => r.status === 200).length;
      const rateLimitedRequests = responses.filter(r => r.status === 429).length;

      // Should have some rate limited requests
      expect(rateLimitedRequests).toBeGreaterThan(0);
      expect(successfulRequests + rateLimitedRequests).toBe(rapidRequests);

      console.log(`Rate Limiting Test:
        - Total Requests: ${rapidRequests}
        - Successful: ${successfulRequests}
        - Rate Limited: ${rateLimitedRequests}
        - Rate Limit Effectiveness: ${(rateLimitedRequests / rapidRequests * 100).toFixed(2)}%`);
    });

    test('should handle burst traffic gracefully', async () => {
      const burstSize = 50;
      const burstInterval = 100; // ms
      const bursts = 3;

      for (let burst = 0; burst < bursts; burst++) {
        const burstPromises = [];
        const burstStartTime = Date.now();

        for (let i = 0; i < burstSize; i++) {
          burstPromises.push(
            request(app)
              .get('/api/universities')
              .set('Authorization', `Bearer ${testUsers[i % testUsers.length].token}`)
          );
        }

        const responses = await Promise.all(burstPromises);
        const burstEndTime = Date.now();
        const burstDuration = burstEndTime - burstStartTime;

        const successRate = responses.filter(r => r.status === 200).length / burstSize;
        
        // Should handle bursts reasonably well
        expect(successRate).toBeGreaterThan(0.7); // 70% success rate during burst
        expect(burstDuration).toBeLessThan(3000); // Burst should complete within 3 seconds

        console.log(`Burst ${burst + 1} Performance:
          - Duration: ${burstDuration}ms
          - Success Rate: ${(successRate * 100).toFixed(2)}%`);

        // Wait between bursts
        if (burst < bursts - 1) {
          await new Promise(resolve => setTimeout(resolve, burstInterval));
        }
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should not leak memory during concurrent operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const operations = 100;
      const promises = [];

      for (let i = 0; i < operations; i++) {
        promises.push(
          request(app)
            .post('/api/ai/analyze-quality')
            .set('Authorization', `Bearer ${testUsers[i % testUsers.length].token}`)
            .send({
              content: 'This is a test recommendation content for memory testing. '.repeat(100)
            })
        );
      }

      await Promise.all(promises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100;

      // Memory increase should be reasonable
      expect(memoryIncreasePercent).toBeLessThan(50); // Less than 50% increase

      console.log(`Memory Usage Test:
        - Initial Heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
        - Final Heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
        - Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)`);
    });

    test('should handle file upload performance', async () => {
      // Simulate large file upload (recommendation content)
      const largeContent = 'Large recommendation content. '.repeat(1000);
      const uploadCount = 10;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < uploadCount; i++) {
        promises.push(
          request(app)
            .post('/api/recommendations')
            .set('Authorization', `Bearer ${testUsers[i % testUsers.length].token}`)
            .send({
              application_id: 'test-app-id',
              content: largeContent
            })
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const avgUploadTime = duration / uploadCount;
      expect(avgUploadTime).toBeLessThan(1000); // Average upload under 1 second

      console.log(`File Upload Performance:
        - Uploads: ${uploadCount}
        - Total Duration: ${duration}ms
        - Average Upload Time: ${avgUploadTime.toFixed(2)}ms
        - Content Size: ${largeContent.length} characters`);
    });
  });

  describe('Database Connection Pool Performance', () => {
    test('should efficiently manage connection pool', async () => {
      const concurrentQueries = 50;
      const promises = [];

      const startTime = Date.now();

      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          db.query('SELECT COUNT(*) FROM users WHERE role = $1', ['student'])
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // All queries should succeed
      expect(results.length).toBe(concurrentQueries);
      results.forEach(result => {
        expect(result.rows[0].count).toBeDefined();
      });

      // Should complete efficiently
      expect(duration).toBeLessThan(2000); // Under 2 seconds

      console.log(`Connection Pool Performance:
        - Concurrent Queries: ${concurrentQueries}
        - Duration: ${duration}ms
        - Avg Query Time: ${(duration / concurrentQueries).toFixed(2)}ms`);
    });

    test('should handle connection pool exhaustion gracefully', async () => {
      // Create more connections than pool size
      const excessiveConnections = 100;
      const promises = [];

      for (let i = 0; i < excessiveConnections; i++) {
        promises.push(
          db.query('SELECT pg_sleep(0.1)') // Small delay to hold connections
        );
      }

      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should handle gracefully without crashing
      expect(successful + failed).toBe(excessiveConnections);
      expect(duration).toBeLessThan(10000); // Should not hang indefinitely

      console.log(`Connection Pool Exhaustion Test:
        - Attempted Connections: ${excessiveConnections}
        - Successful: ${successful}
        - Failed: ${failed}
        - Duration: ${duration}ms`);
    });
  });
});