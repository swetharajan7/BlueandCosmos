import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, JwtPayload } from '../types';
import { AppError } from '../utils/AppError';
import { redisClient } from '../config/redis';

export class AuthService {
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private jwtExpiresIn: string;
  private jwtRefreshExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.warn('⚠️  JWT secrets not set in environment variables. Using default values.');
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(user: Omit<User, 'password_hash'>): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'stellarrec',
      audience: 'stellarrec-users'
    });
  }

  /**
   * Generate refresh token and store in Redis
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const tokenId = uuidv4();
    const payload = {
      userId,
      tokenId,
      type: 'refresh'
    };

    const token = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
      issuer: 'stellarrec',
      audience: 'stellarrec-users'
    });

    // Store refresh token in Redis with expiration
    const expirationSeconds = 7 * 24 * 60 * 60; // 7 days
    await redisClient.setEx(`refresh_token:${tokenId}`, expirationSeconds, userId);

    return token;
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokens(user: Omit<User, 'password_hash'>): Promise<{ accessToken: string; refreshToken: string }> {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: await this.generateRefreshToken(user.id)
    };
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'stellarrec',
        audience: 'stellarrec-users'
      }) as JwtPayload;

      return decoded;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Access token expired', 401);
      } else if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid access token', 401);
      } else {
        throw new AppError('Token verification failed', 401);
      }
    }
  }

  /**
   * Verify refresh token and check Redis blacklist
   */
  async verifyRefreshToken(token: string): Promise<{ userId: string; tokenId: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret, {
        issuer: 'stellarrec',
        audience: 'stellarrec-users'
      }) as any;

      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid token type', 401);
      }

      // Check if token exists in Redis (not revoked)
      const storedUserId = await redisClient.get(`refresh_token:${decoded.tokenId}`);
      if (!storedUserId || storedUserId !== decoded.userId) {
        throw new AppError('Refresh token revoked or invalid', 401);
      }

      return {
        userId: decoded.userId,
        tokenId: decoded.tokenId
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Refresh token expired', 401);
      } else if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid refresh token', 401);
      } else {
        throw new AppError('Refresh token verification failed', 401);
      }
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new AppError('Authorization header missing', 401);
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('Invalid authorization header format', 401);
    }

    return parts[1];
  }

  /**
   * Generate password reset token
   */
  generatePasswordResetToken(userId: string, email: string): string {
    const payload = {
      userId,
      email,
      type: 'password-reset',
      tokenId: uuidv4()
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '1h', // Password reset tokens expire in 1 hour
      issuer: 'stellarrec',
      audience: 'stellarrec-users'
    });
  }

  /**
   * Verify password reset token
   */
  verifyPasswordResetToken(token: string): { userId: string; email: string; tokenId: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'stellarrec',
        audience: 'stellarrec-users'
      }) as any;

      if (decoded.type !== 'password-reset') {
        throw new AppError('Invalid token type', 401);
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        tokenId: decoded.tokenId
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Password reset token expired', 401);
      } else if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid password reset token', 401);
      } else {
        throw new AppError('Password reset token verification failed', 401);
      }
    }
  }

  /**
   * Generate email verification token
   */
  generateEmailVerificationToken(userId: string, email: string): string {
    const payload = {
      userId,
      email,
      type: 'email-verification',
      tokenId: uuidv4()
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '24h', // Email verification tokens expire in 24 hours
      issuer: 'stellarrec',
      audience: 'stellarrec-users'
    });
  }

  /**
   * Verify email verification token
   */
  verifyEmailVerificationToken(token: string): { userId: string; email: string; tokenId: string } {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'stellarrec',
        audience: 'stellarrec-users'
      }) as any;

      if (decoded.type !== 'email-verification') {
        throw new AppError('Invalid token type', 401);
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        tokenId: decoded.tokenId
      };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Email verification token expired', 401);
      } else if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid email verification token', 401);
      } else {
        throw new AppError('Email verification token verification failed', 401);
      }
    }
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await redisClient.del(`refresh_token:${tokenId}`);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const keys = await redisClient.keys('refresh_token:*');
    const pipeline = redisClient.multi();
    
    for (const key of keys) {
      const storedUserId = await redisClient.get(key);
      if (storedUserId === userId) {
        pipeline.del(key);
      }
    }
    
    await pipeline.exec();
  }

  /**
   * Blacklist access token (for logout)
   */
  async blacklistAccessToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
        if (expirationTime > 0) {
          await redisClient.setEx(`blacklist:${token}`, expirationTime, 'true');
        }
      }
    } catch (error) {
      // Token is invalid, no need to blacklist
    }
  }

  /**
   * Check if access token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await redisClient.get(`blacklist:${token}`);
    return result === 'true';
  }

  /**
   * Create secure session
   */
  async createSession(userId: string, userAgent?: string, ipAddress?: string): Promise<string> {
    const sessionId = uuidv4();
    const sessionData = {
      userId,
      userAgent: userAgent || 'unknown',
      ipAddress: ipAddress || 'unknown',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    // Store session for 7 days
    await redisClient.setEx(`session:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(sessionData));
    
    return sessionId;
  }

  /**
   * Validate session
   */
  async validateSession(sessionId: string, ipAddress?: string): Promise<any> {
    const sessionData = await redisClient.get(`session:${sessionId}`);
    
    if (!sessionData) {
      throw new AppError('Session not found or expired', 401);
    }

    const session = JSON.parse(sessionData);
    
    // Optional: Check IP address consistency
    if (ipAddress && session.ipAddress !== ipAddress && process.env.NODE_ENV === 'production') {
      throw new AppError('Session IP mismatch', 401);
    }

    // Update last activity
    session.lastActivity = new Date().toISOString();
    await redisClient.setEx(`session:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(session));

    return session;
  }

  /**
   * Destroy session
   */
  async destroySession(sessionId: string): Promise<void> {
    await redisClient.del(`session:${sessionId}`);
  }

  /**
   * Get all user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    const keys = await redisClient.keys('session:*');
    const sessions = [];

    for (const key of keys) {
      const sessionData = await redisClient.get(key);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.userId === userId) {
          sessions.push({
            sessionId: key.replace('session:', ''),
            ...session
          });
        }
      }
    }

    return sessions;
  }

  /**
   * Destroy all user sessions
   */
  async destroyAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    const pipeline = redisClient.multi();

    for (const session of sessions) {
      pipeline.del(`session:${session.sessionId}`);
    }

    await pipeline.exec();
  }
}

export const authService = new AuthService();