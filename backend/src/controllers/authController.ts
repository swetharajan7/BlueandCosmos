import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { authService } from '../services/authService';
import { emailService } from '../services/emailService';
import { pool } from '../config/database';
import { AppError } from '../utils/AppError';
import { LoginRequest, RegisterRequest, AuthResponse, User } from '../types';

export class AuthController {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel(pool);
  }

  /**
   * Register a new user
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const userData: RegisterRequest = req.body;

      // Create user
      const user = await this.userModel.create(userData);

      // Generate tokens
      const { accessToken, refreshToken } = await authService.generateTokens(user);

      // Generate email verification token
      const verificationToken = authService.generateEmailVerificationToken(user.id, user.email);

      // Send verification email
      try {
        await emailService.sendEmailVerification(user.email, user.first_name, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail registration if email fails
      }

      const response: AuthResponse = {
        user,
        token: accessToken,
        refreshToken
      };

      res.status(201).json({
        success: true,
        data: response,
        message: 'User registered successfully. Please check your email for verification.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'REGISTRATION_FAILED',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Registration error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Registration failed'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Login user
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { email, password }: LoginRequest = req.body;

      // Find user
      const user = await this.userModel.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify password
      const isValidPassword = await this.userModel.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Remove password from user object
      const { password_hash, ...userWithoutPassword } = user;

      // Generate tokens
      const { accessToken, refreshToken } = await authService.generateTokens(userWithoutPassword);

      const response: AuthResponse = {
        user: userWithoutPassword,
        token: accessToken,
        refreshToken
      };

      res.status(200).json({
        success: true,
        data: response,
        message: 'Login successful',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Refresh access token
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify refresh token
      const { userId } = await authService.verifyRefreshToken(refreshToken);

      // Get user
      const user = await this.userModel.findById(userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = await authService.generateTokens(user);

      res.status(200).json({
        success: true,
        data: {
          token: accessToken,
          refreshToken: newRefreshToken
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Token refresh error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Token refresh failed'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Request password reset
   */
  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { email } = req.body;

      // Find user
      const user = await this.userModel.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not
        res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate password reset token
      const resetToken = authService.generatePasswordResetToken(user.id, user.email);

      // Send password reset email
      try {
        await emailService.sendPasswordReset(user.email, user.first_name, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        throw new AppError('Failed to send password reset email', 500);
      }

      res.status(200).json({
        success: true,
        message: 'Password reset link has been sent to your email.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'PASSWORD_RESET_FAILED',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Password reset request error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Password reset request failed'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Reset password
   */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { token, password } = req.body;

      // Verify reset token
      const { userId, email } = authService.verifyPasswordResetToken(token);

      // Update password
      await this.userModel.updatePassword(userId, password);

      // Get user for confirmation email
      const user = await this.userModel.findById(userId);
      if (user) {
        try {
          await emailService.sendPasswordResetConfirmation(user.email, user.first_name);
        } catch (emailError) {
          console.error('Failed to send password reset confirmation:', emailError);
          // Don't fail the password reset if email fails
        }
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successful. You can now log in with your new password.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'PASSWORD_RESET_FAILED',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Password reset error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Password reset failed'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Verify email
   */
  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Verification token is required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Verify email verification token
      const { userId } = authService.verifyEmailVerificationToken(token);

      // Mark email as verified
      await this.userModel.verifyEmail(userId);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'EMAIL_VERIFICATION_FAILED',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Email verification error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Email verification failed'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Resend email verification
   */
  resendEmailVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Get user
      const user = await this.userModel.findById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (user.is_verified) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ALREADY_VERIFIED',
            message: 'Email is already verified'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Generate new verification token
      const verificationToken = authService.generateEmailVerificationToken(user.id, user.email);

      // Send verification email
      try {
        await emailService.sendEmailVerification(user.email, user.first_name, verificationToken);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        throw new AppError('Failed to send verification email', 500);
      }

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'EMAIL_VERIFICATION_FAILED',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Resend verification error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to resend verification email'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Get current user profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = await this.userModel.findById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user profile'
        },
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Update user profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors.array()
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const { first_name, last_name, phone } = req.body;
      const updates: Partial<Pick<User, 'first_name' | 'last_name' | 'phone'>> = {};

      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      if (phone !== undefined) updates.phone = phone;

      // Update profile
      const updatedUser = await this.userModel.updateProfile(req.user.userId, updates);

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: 'PROFILE_UPDATE_FAILED',
            message: error.message
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Profile update error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Profile update failed'
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  /**
   * Logout user (client-side token removal)
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    });
  };
}

export const authController = new AuthController();