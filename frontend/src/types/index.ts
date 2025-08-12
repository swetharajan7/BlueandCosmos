// Frontend TypeScript type definitions for StellarRec™

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'student' | 'recommender' | 'admin';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface University {
  id: string;
  name: string;
  code: string;
  submission_format: 'api' | 'email' | 'manual';
  is_active: boolean;
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
  created_at: string;
  updated_at: string;
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
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  id: string;
  application_id: string;
  recommender_id: string;
  content: string;
  word_count: number;
  status: 'draft' | 'submitted' | 'delivered';
  ai_assistance_used: boolean;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

export interface Submission {
  id: string;
  recommendation_id: string;
  university_id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  submission_method: 'api' | 'email' | 'manual';
  external_reference?: string;
  submitted_at?: string;
  confirmed_at?: string;
  error_message?: string;
  retry_count: number;
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

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'student' | 'recommender';
}

export interface ApplicationForm {
  legal_name: string;
  universities: University[];
  program_type: 'undergraduate' | 'graduate' | 'mba' | 'llm' | 'medical' | 'phd';
  application_term: string;
}

export interface ApplicationCreateRequest {
  legal_name: string;
  university_ids: string[];
  program_type: 'undergraduate' | 'graduate' | 'mba' | 'llm' | 'medical' | 'phd';
  application_term: string;
  status?: string;
}

export interface RecommenderForm {
  title: string;
  organization: string;
  relationship_duration: string;
  relationship_type: string;
  mobile_phone?: string;
  professional_email: string;
}

// Authentication types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// Application state types
export interface ApplicationState {
  applications: Application[];
  currentApplication: Application | null;
  isLoading: boolean;
  error: string | null;
}

// UI types
export interface NotificationState {
  notifications: Notification[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Route types
export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'recommender' | 'admin';
}

// Component prop types
export interface HeaderProps {
  user?: User;
  onLogout: () => void;
}

export interface FooterProps {
  // No specific props for now
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  values: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isValid: boolean;
}

// AI Assistant types
export interface AIAssistanceRequest {
  type: 'outline' | 'examples' | 'improve' | 'analyze';
  content?: string;
  context?: {
    applicant_name: string;
    program_type: string;
    universities: string[];
  };
}

export interface AIAssistanceResponse {
  suggestions: string[];
  feedback?: string;
  quality_score?: number;
}

// University selection types
export interface UniversitySelectionProps {
  selectedUniversities: string[];
  onUniversityChange: (universities: string[]) => void;
  programType: string;
}

// Status tracking types
export interface StatusIndicatorProps {
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  label: string;
}

export interface SubmissionStatus {
  university: University;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  submitted_at?: string;
  confirmed_at?: string;
  error_message?: string;
}