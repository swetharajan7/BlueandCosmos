// Common TypeScript type definitions for StellarRec™
import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'student' | 'recommender' | 'admin';
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface University {
  id: string;
  name: string;
  code: string;
  api_endpoint?: string;
  email_address?: string;
  submission_format: 'api' | 'email' | 'manual';
  requirements: UniversityRequirement[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Application {
  id: string;
  student_id: string;
  legal_name: string;
  universities: University[];
  program_type: 'undergraduate' | 'graduate' | 'mba' | 'llm' | 'medical' | 'phd';
  application_term: string;
  status: 'draft' | 'pending' | 'submitted' | 'completed';
  google_doc_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Recommender {
  id: string;
  user_id: string;
  title: string;
  organization: string;
  relationship_duration: string;
  relationship_type: string;
  mobile_phone?: string;
  professional_email: string;
  invitation_token: string;
  invitation_expires: Date;
  confirmed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Recommendation {
  id: string;
  application_id: string;
  recommender_id: string;
  content: string;
  word_count: number;
  status: 'draft' | 'submitted' | 'delivered';
  ai_assistance_used: boolean;
  created_at: Date;
  updated_at: Date;
  submitted_at?: Date;
}

export interface Submission {
  id: string;
  recommendation_id: string;
  university_id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  submission_method: 'api' | 'email' | 'manual';
  external_reference?: string;
  submitted_at?: Date;
  confirmed_at?: Date;
  error_message?: string;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface UniversityRequirement {
  id: string;
  university_id: string;
  requirement_type: string;
  requirement_value: string;
  is_required: boolean;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'student' | 'recommender';
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  token: string;
  refreshToken: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  iat: number;
  exp: number;
}

// Extended JWT Payload with user details
export interface ExtendedJwtPayload extends JwtPayload {
  id: string;
  first_name: string;
  last_name: string;
}

// Request with authenticated user
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Google Docs types
export interface GoogleDocumentPermission {
  type: 'user' | 'group' | 'domain' | 'anyone';
  role: 'owner' | 'writer' | 'commenter' | 'reader';
  emailAddress?: string;
}

export interface GoogleDocumentMetadata {
  id: string;
  name: string;
  createdTime: string;
  modifiedTime: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
  }>;
  permissions?: GoogleDocumentPermission[];
}

export interface GoogleDocsConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  serviceAccountKey?: string;
}

// Error types
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}