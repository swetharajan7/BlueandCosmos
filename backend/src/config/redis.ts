import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis client configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
};

// Create Redis client
export const redisClient: RedisClientType = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
  },
  password: redisConfig.password,
  database: redisConfig.db,
});

// Redis connection function
export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
    
    // Test the connection
    await redisClient.ping();
    console.log('🏓 Redis ping successful');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    throw error;
  }
};

// Redis error handling
redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('🔗 Redis Client Connected');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis Client Reconnecting');
});

redisClient.on('ready', () => {
  console.log('✅ Redis Client Ready');
});

// Cache helper functions
export class CacheService {
  // Set cache with expiration
  static async set(key: string, value: any, expireInSeconds: number = 3600): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.setEx(key, expireInSeconds, serializedValue);
    } catch (error) {
      console.error('❌ Cache set error:', error);
      throw error;
    }
  }

  // Get cache
  static async get(key: string): Promise<any | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  }

  // Delete cache
  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      throw error;
    }
  }

  // Check if key exists
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Cache exists error:', error);
      return false;
    }
  }

  // Set cache with no expiration
  static async setPermanent(key: string, value: any): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await redisClient.set(key, serializedValue);
    } catch (error) {
      console.error('❌ Cache setPermanent error:', error);
      throw error;
    }
  }

  // Increment counter
  static async increment(key: string, expireInSeconds?: number): Promise<number> {
    try {
      const result = await redisClient.incr(key);
      if (expireInSeconds && result === 1) {
        await redisClient.expire(key, expireInSeconds);
      }
      return result;
    } catch (error) {
      console.error('❌ Cache increment error:', error);
      throw error;
    }
  }

  // Get multiple keys
  static async mget(keys: string[]): Promise<(any | null)[]> {
    try {
      const values = await redisClient.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('❌ Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  // Set multiple keys
  static async mset(keyValuePairs: Record<string, any>, expireInSeconds?: number): Promise<void> {
    try {
      const serializedPairs: string[] = [];
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        serializedPairs.push(key, JSON.stringify(value));
      });
      
      await redisClient.mSet(serializedPairs);
      
      if (expireInSeconds) {
        const promises = Object.keys(keyValuePairs).map(key => 
          redisClient.expire(key, expireInSeconds)
        );
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('❌ Cache mset error:', error);
      throw error;
    }
  }

  // Clear all cache (use with caution)
  static async flushAll(): Promise<void> {
    try {
      await redisClient.flushAll();
      console.log('🗑️ All cache cleared');
    } catch (error) {
      console.error('❌ Cache flush error:', error);
      throw error;
    }
  }
}

// Session management functions
export class SessionService {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly SESSION_EXPIRY = 24 * 60 * 60; // 24 hours

  // Create session
  static async createSession(userId: string, sessionData: any): Promise<string> {
    const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    
    await CacheService.set(sessionKey, {
      userId,
      ...sessionData,
      createdAt: new Date().toISOString(),
    }, this.SESSION_EXPIRY);
    
    return sessionId;
  }

  // Get session
  static async getSession(sessionId: string): Promise<any | null> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    return await CacheService.get(sessionKey);
  }

  // Update session
  static async updateSession(sessionId: string, sessionData: any): Promise<void> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    const existingSession = await this.getSession(sessionId);
    
    if (existingSession) {
      await CacheService.set(sessionKey, {
        ...existingSession,
        ...sessionData,
        updatedAt: new Date().toISOString(),
      }, this.SESSION_EXPIRY);
    }
  }

  // Delete session
  static async deleteSession(sessionId: string): Promise<void> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    await CacheService.del(sessionKey);
  }

  // Extend session expiry
  static async extendSession(sessionId: string): Promise<void> {
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    await redisClient.expire(sessionKey, this.SESSION_EXPIRY);
  }
}

// Graceful shutdown
export const closeRedis = async (): Promise<void> => {
  try {
    await redisClient.quit();
    console.log('✅ Redis connection closed');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
};

// Handle process termination
process.on('SIGINT', closeRedis);
process.on('SIGTERM', closeRedis);