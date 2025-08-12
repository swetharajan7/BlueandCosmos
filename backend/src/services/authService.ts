import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, JwtPayload, AuthResponse } from '../types';
import { AppError } from '../utils/AppError';

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
   * Generate refresh token
   */
  generateRefreshToken(userId: string): string {
    const payload = {
      userId,
      tokenId: uuidv4(),
      type: 'refresh'
    };

    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiresIn,
      issuer: 'stellarrec',
      audience: 'stellarrec-users'
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokens(user: Omit<User, 'password_hash'>): { accessToken: string; refreshToken: string } {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user.id)
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
   * Verify refresh token
   */
  verifyRefreshToken(token: string): { userId: string; tokenId: string } {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret, {
        issuer: 'stellarrec',
        audience: 'stellarrec-users'
      }) as any;

      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid token type', 401);
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
}

export const authService = new AuthService();