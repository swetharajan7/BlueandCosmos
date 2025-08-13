import axios from 'axios';
import { Application, ApplicationCreateRequest, University, ApiResponse } from '../types';

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
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const applicationService = {
  // Create new application
  async createApplication(applicationData: ApplicationCreateRequest): Promise<Application> {
    const response = await api.post<ApiResponse<Application>>('/applications', applicationData);
    return response.data.data!;
  },

  // Get all applications for current user
  async getMyApplications(): Promise<Application[]> {
    const response = await api.get<ApiResponse<Application[]>>('/applications');
    return response.data.data!;
  },

  // Get application by ID
  async getApplicationById(id: string): Promise<Application> {
    const response = await api.get<ApiResponse<Application>>(`/applications/${id}`);
    return response.data.data!;
  },

  // Update application
  async updateApplication(id: string, updateData: Partial<ApplicationCreateRequest>): Promise<Application> {
    const response = await api.put<ApiResponse<Application>>(`/applications/${id}`, updateData);
    return response.data.data!;
  },

  // Delete application
  async deleteApplication(id: string): Promise<void> {
    await api.delete(`/applications/${id}`);
  },

  // Get all universities
  async getUniversities(search?: string, programType?: string): Promise<University[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (programType) params.append('program_type', programType);
    
    const response = await api.get<ApiResponse<University[]>>(`/universities?${params.toString()}`);
    return response.data.data!;
  },

  // Get university by ID
  async getUniversityById(id: string): Promise<University> {
    const response = await api.get<ApiResponse<University>>(`/universities/${id}`);
    return response.data.data!;
  },

  // Validate university IDs
  async validateUniversityIds(ids: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const response = await api.post<ApiResponse<{ valid: string[]; invalid: string[] }>>('/universities/validate', { ids });
    return response.data.data!;
  },

  // Get detailed application status with submission tracking
  async getApplicationStatus(id: string): Promise<ApplicationStatusResponse> {
    const response = await api.get<ApiResponse<ApplicationStatusResponse>>(`/applications/${id}/status`);
    return response.data.data!;
  }
};