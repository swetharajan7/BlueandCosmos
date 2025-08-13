import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance with auth token
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/recommender/login';
    }
    return Promise.reject(error);
  }
);

export interface OutlineRequest {
  applicantName: string;
  programType: string;
  universities: string[];
  relationshipType: string;
  relationshipDuration: string;
  recommenderTitle: string;
}

export interface ExamplesRequest {
  programType: string;
  relationshipType: string;
  recommenderTitle: string;
}

export interface WritingImprovementRequest {
  content: string;
  focusArea?: 'clarity' | 'specificity' | 'structure' | 'tone';
}

export interface QualityAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  wordCount: number;
  hasSpecificExamples: boolean;
  isProfessional: boolean;
  isUniversityAgnostic: boolean;
}

export interface AIUsageStats {
  requestCount: number;
  tokenUsage: number;
  cost: number;
  lastRequest: string;
}

class AIService {
  /**
   * Generate recommendation outline based on applicant and recommender information
   */
  async generateOutline(request: OutlineRequest): Promise<string> {
    try {
      const response = await apiClient.post('/ai/generate-outline', request);
      return response.data.data.outline;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to generate outline. Please try again.'
      );
    }
  }

  /**
   * Suggest example phrases and structures for recommendations
   */
  async suggestExamples(request: ExamplesRequest): Promise<string[]> {
    try {
      const response = await apiClient.post('/ai/suggest-examples', request);
      return response.data.data.examples;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to get example suggestions. Please try again.'
      );
    }
  }

  /**
   * Provide writing improvement recommendations
   */
  async improveWriting(request: WritingImprovementRequest): Promise<string> {
    try {
      const response = await apiClient.post('/ai/improve-writing', request);
      return response.data.data.improvements;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to get writing improvements. Please try again.'
      );
    }
  }

  /**
   * Analyze content quality and provide detailed feedback
   */
  async analyzeQuality(content: string): Promise<QualityAnalysis> {
    try {
      const response = await apiClient.post('/ai/analyze-quality', { content });
      return response.data.data.analysis;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to analyze content quality. Please try again.'
      );
    }
  }

  /**
   * Get AI usage statistics (admin only)
   */
  async getUsageStats(operation?: string, date?: string): Promise<{
    stats: AIUsageStats[];
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (operation) params.append('operation', operation);
      if (date) params.append('date', date);

      const response = await apiClient.get(`/ai/usage-stats?${params.toString()}`);
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to get usage statistics. Please try again.'
      );
    }
  }

  /**
   * Check AI service health
   */
  async healthCheck(): Promise<{
    status: string;
    aiServiceAvailable: boolean;
    testScore?: number;
  }> {
    try {
      const response = await apiClient.get('/ai/health');
      return response.data.data;
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || 
        'Failed to check AI service health. Please try again.'
      );
    }
  }
}

export const aiService = new AIService();