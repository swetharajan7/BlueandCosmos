import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/recommender/login';
    }
    throw error;
  }
);

export interface RecommenderProfile {
  id: string;
  professional_email: string;
  title: string;
  organization: string;
  relationship_duration: string;
  relationship_type: string;
  mobile_phone?: string;
  confirmed_at: string;
  created_at: string;
  updated_at: string;
}

export interface RecommenderApplication {
  id: string;
  legal_name: string;
  program_type: string;
  application_term: string;
  status: string;
  universities: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  created_at: string;
}

export interface ApplicationDetails {
  application: RecommenderApplication & {
    student: {
      id: string;
      first_name: string;
      last_name: string;
      email: string;
      phone?: string;
    };
  };
}

export interface DiscrepancyReport {
  discrepancy_type: 'Student Name' | 'Universities' | 'Program Type' | 'Application Term' | 'Contact Information' | 'Other';
  description: string;
  correct_information?: string;
}

export interface ProfileUpdateData {
  title?: string;
  organization?: string;
  relationship_duration?: string;
  relationship_type?: string;
  mobile_phone?: string;
}

class RecommenderService {
  /**
   * Login recommender
   */
  async login(email: string, password: string): Promise<{
    user: any;
    token: string;
    refreshToken: string;
  }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/recommender/login`, {
        email,
        password
      });

      if (response.data.success) {
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
   * Get recommender profile
   */
  async getProfile(): Promise<RecommenderProfile> {
    try {
      const response = await api.get('/recommender/profile');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get profile');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to get profile');
    }
  }

  /**
   * Update recommender profile
   */
  async updateProfile(updates: ProfileUpdateData): Promise<RecommenderProfile> {
    try {
      const response = await api.put('/recommender/profile', updates);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to update profile');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Get applications assigned to recommender
   */
  async getApplications(): Promise<RecommenderApplication[]> {
    try {
      const response = await api.get('/recommender/applications');
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get applications');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to get applications');
    }
  }

  /**
   * Get specific application details
   */
  async getApplicationDetails(applicationId: string): Promise<ApplicationDetails> {
    try {
      const response = await api.get(`/recommender/applications/${applicationId}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get application details');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to get application details');
    }
  }

  /**
   * Confirm application details are correct
   */
  async confirmApplicationDetails(applicationId: string): Promise<void> {
    try {
      const response = await api.post(`/recommender/applications/${applicationId}/confirm`);
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to confirm application details');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to confirm application details');
    }
  }

  /**
   * Get invitation details by token (public endpoint)
   */
  async getInvitationDetails(token: string): Promise<{
    recommender: {
      id: string;
      professional_email: string;
      title: string;
      organization: string;
    };
    application: {
      id: string;
      legal_name: string;
      program_type: string;
      application_term: string;
      universities: Array<{
        id: string;
        name: string;
        code: string;
      }>;
    };
    status: string;
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/recommender/invitation/${token}`);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get invitation details');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to get invitation details');
    }
  }

  /**
   * Confirm invitation and create profile (public endpoint)
   */
  async confirmInvitation(token: string, profileData: {
    first_name: string;
    last_name: string;
    title: string;
    organization: string;
    relationship_duration: string;
    relationship_type: string;
    mobile_phone?: string;
    password: string;
  }): Promise<{
    recommender: RecommenderProfile;
  }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/recommender/invitation/${token}/confirm`, profileData);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Failed to confirm invitation');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to confirm invitation');
    }
  }

  /**
   * Report discrepancy in applicant details (public endpoint)
   */
  async reportDiscrepancy(token: string, report: DiscrepancyReport): Promise<void> {
    try {
      const response = await axios.post(`${API_BASE_URL}/recommender/invitation/${token}/report-discrepancy`, report);
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Failed to report discrepancy');
      }
    } catch (error: any) {
      if (error.response?.data?.error?.message) {
        throw new Error(error.response.data.error.message);
      }
      throw new Error('Failed to report discrepancy');
    }
  }
}

export const recommenderService = new RecommenderService();