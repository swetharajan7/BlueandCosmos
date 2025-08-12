import { AuthService } from '../services/authService';
import { UserModel } from '../models/User';
import { AppError } from '../utils/AppError';

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  describe('Token Generation', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'student' as const,
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    test('should generate access token', () => {
      const token = authService.generateAccessToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should generate refresh token', () => {
      const token = authService.generateRefreshToken(mockUser.id);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should generate both tokens', () => {
      const tokens = authService.generateTokens(mockUser);
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });
  });

  describe('Token Verification', () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'student' as const,
      is_verified: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    test('should verify valid access token', () => {
      const token = authService.generateAccessToken(mockUser);
      const decoded = authService.verifyAccessToken(token);
      
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    test('should verify valid refresh token', () => {
      const token = authService.generateRefreshToken(mockUser.id);
      const decoded = authService.verifyRefreshToken(token);
      
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.tokenId).toBeDefined();
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        authService.verifyAccessToken('invalid-token');
      }).toThrow(AppError);
    });
  });

  describe('Special Tokens', () => {
    test('should generate password reset token', () => {
      const token = authService.generatePasswordResetToken('user-id', 'test@example.com');
      expect(token).toBeDefined();
      
      const decoded = authService.verifyPasswordResetToken(token);
      expect(decoded.userId).toBe('user-id');
      expect(decoded.email).toBe('test@example.com');
    });

    test('should generate email verification token', () => {
      const token = authService.generateEmailVerificationToken('user-id', 'test@example.com');
      expect(token).toBeDefined();
      
      const decoded = authService.verifyEmailVerificationToken(token);
      expect(decoded.userId).toBe('user-id');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('Token Extraction', () => {
    test('should extract token from valid header', () => {
      const token = 'valid-token';
      const header = `Bearer ${token}`;
      
      const extracted = authService.extractTokenFromHeader(header);
      expect(extracted).toBe(token);
    });

    test('should throw error for missing header', () => {
      expect(() => {
        authService.extractTokenFromHeader(undefined);
      }).toThrow(AppError);
    });

    test('should throw error for invalid header format', () => {
      expect(() => {
        authService.extractTokenFromHeader('invalid-format');
      }).toThrow(AppError);
    });
  });
});

describe('AppError', () => {
  test('should create error with correct properties', () => {
    const error = new AppError('Test error', 400);
    
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});