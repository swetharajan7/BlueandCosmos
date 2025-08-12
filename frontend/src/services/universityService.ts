import axios from 'axios';
import { University, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
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

export interface UniversityFilters {
  search?: string;
  program_type?: string;
  submission_format?: string;
  category?: string;
}

export interface UniversityCategories {
  ivy_league: University[];
  top_public: University[];
  top_private: University[];
  specialized: University[];
}

export interface ProgramValidationResult {
  available: string[];
  unavailable: string[];
}

export const universityService = {
  // Get all universities with optional filters
  async getUniversities(filters?: UniversityFilters): Promise<University[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.program_type) {
        params.append('program_type', filters.program_type);
      }
      if (filters?.submission_format) {
        params.append('submission_format', filters.submission_format);
      }
      if (filters?.category) {
        params.append('category', filters.category);
      }

      const response = await api.get<ApiResponse<University[]>>(`/universities?${params.toString()}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error?.message || 'Failed to fetch universities');
    } catch (error) {
      console.error('Error fetching universities:', error);
      throw error;
    }
  },

  // Get universities grouped by categories
  async getUniversityCategories(): Promise<UniversityCategories> {
    try {
      const response = await api.get<ApiResponse<UniversityCategories>>('/universities/categories');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error?.message || 'Failed to fetch university categories');
    } catch (error) {
      console.error('Error fetching university categories:', error);
      throw error;
    }
  },

  // Get university by ID
  async getUniversityById(id: string): Promise<University> {
    try {
      const response = await api.get<ApiResponse<University>>(`/universities/${id}`);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error?.message || 'University not found');
    } catch (error) {
      console.error('Error fetching university:', error);
      throw error;
    }
  },

  // Validate university IDs
  async validateUniversityIds(ids: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    try {
      const response = await api.post<ApiResponse<{ valid: string[]; invalid: string[] }>>('/universities/validate', {
        ids
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error?.message || 'Failed to validate university IDs');
    } catch (error) {
      console.error('Error validating university IDs:', error);
      throw error;
    }
  },

  // Validate program availability for universities
  async validateProgramAvailability(universityIds: string[], programType: string): Promise<ProgramValidationResult> {
    try {
      const response = await api.post<ApiResponse<ProgramValidationResult>>('/universities/validate-program', {
        university_ids: universityIds,
        program_type: programType
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new Error(response.data.error?.message || 'Failed to validate program availability');
    } catch (error) {
      console.error('Error validating program availability:', error);
      throw error;
    }
  },

  // Search universities with advanced filtering
  async searchUniversities(searchTerm: string, filters?: Omit<UniversityFilters, 'search'>): Promise<University[]> {
    return this.getUniversities({ ...filters, search: searchTerm });
  },

  // Get universities by program type
  async getUniversitiesByProgram(programType: string): Promise<University[]> {
    return this.getUniversities({ program_type: programType });
  },

  // Get universities by submission format
  async getUniversitiesBySubmissionFormat(submissionFormat: string): Promise<University[]> {
    return this.getUniversities({ submission_format: submissionFormat });
  }
};

export default universityService;