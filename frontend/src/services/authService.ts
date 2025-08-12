import axios from 'axios';
import { LoginForm, RegisterForm, User, AuthResponse, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('stellarrec_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('stellarrec_refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('stellarrec_token', token);
          localStorage.setItem('stellarrec_refresh_token', newRefreshToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('stellarrec_token');
        localStorage.removeItem('stellarrec_refresh_token');
        localStorage.removeItem('stellarrec_user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export class AuthService {
  /**
   * Register a new user
   */
  static async register(userData: RegisterForm): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
      
      if (response.data.success && response.data.data) {
        const { user, token, refreshToken } = response.data.data;
        
        // Store tokens and user data
        localStorage.setItem('stellarrec_token', token);
        localStorage.setItem('stellarrec_refresh_token', refreshToken);
        localStorage.setItem('stellarrec_user', JSON.stringify(user));
        
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Registration failed');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Registration failed. Please try again.');
    }
  }

  /**
   * Login user
   */
  static async login(credentials: LoginForm): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
      
      if (response.data.success && response.data.data) {
        const { user, token, refreshToken } = response.data.data;
        
        // Store tokens and user data
        localStorage.setItem('stellarrec_token', token);
        localStorage.setItem('stellarrec_refresh_token', refreshToken);
        localStorage.setItem('stellarrec_user', JSON.stringify(user));
        
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Login failed. Please try again.');
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage
      localStorage.removeItem('stellarrec_token');
      localStorage.removeItem('stellarrec_refresh_token');
      localStorage.removeItem('stellarrec_user');
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<User> {
    try {
      const response = await api.get<ApiResponse<User>>('/auth/profile');
      
      if (response.data.success && response.data.data) {
        // Update stored user data
        localStorage.setItem('stellarrec_user', JSON.stringify(response.data.data));
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get profile');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to get profile. Please try again.');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  }): Promise<User> {
    try {
      const response = await api.put<ApiResponse<User>>('/auth/profile', updates);
      
      if (response.data.success && response.data.data) {
        // Update stored user data
        localStorage.setItem('stellarrec_user', JSON.stringify(response.data.data));
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to update profile. Please try again.');
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse>('/auth/forgot-password', { email });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to request password reset');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to request password reset. Please try again.');
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, password: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse>('/auth/reset-password', {
        token,
        password,
      });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to reset password');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to reset password. Please try again.');
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse>('/auth/verify-email', { token });
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to verify email');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to verify email. Please try again.');
    }
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(): Promise<void> {
    try {
      const response = await api.post<ApiResponse>('/auth/resend-verification');
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to resend verification email');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to resend verification email. Please try again.');
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('stellarrec_token');
    const user = localStorage.getItem('stellarrec_user');
    return !!(token && user);
  }

  /**
   * Get stored user data
   */
  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem('stellarrec_user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Get stored auth token
   */
  static getToken(): string | null {
    return localStorage.getItem('stellarrec_token');
  }

  /**
   * Login recommender
   */
  static async recommenderLogin(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await axios.post<ApiResponse<AuthResponse>>(`${API_BASE_URL}/recommender/login`, {
        email,
        password
      });

      if (response.data.success && response.data.data) {
        const { user, token, refreshToken } = response.data.data;
        
        // Store tokens and user data
        localStorage.setItem('stellarrec_token', token);
        localStorage.setItem('stellarrec_refresh_token', refreshToken);
        localStorage.setItem('stellarrec_user', JSON.stringify(user));
        
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Login failed. Please check your credentials and try again.');
    }
  }
}

export default AuthService;