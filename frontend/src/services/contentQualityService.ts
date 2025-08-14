import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface QualityScore {
  overall: number;
  specificity: number;
  structure: number;
  language: number;
  completeness: number;
  originality: number;
  readability: number;
  feedback: string[];
  suggestions: string[];
  timestamp: Date;
  analysisId: string;
}

export interface PlagiarismResult {
  originalityScore: number;
  suspiciousSegments: Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    similarity: number;
    potentialSource?: string;
  }>;
  overallRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface ContentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  universityAgnostic: boolean;
  universityReferences: string[];
}

export interface QualityBenchmark {
  category: string;
  averageScore: number;
  topPercentile: number;
  improvementAreas: string[];
  sampleCount: number;
}

export interface QualityAnalytics {
  totalAnalyses: number;
  averageQuality: number;
  qualityTrends: Array<{
    date: string;
    averageScore: number;
    analysisCount: number;
  }>;
  commonIssues: Array<{
    issue: string;
    frequency: number;
    impact: number;
  }>;
  benchmarks: QualityBenchmark[];
}

export interface ApplicationData {
  applicantName: string;
  programType: string;
  relationshipType: string;
  relationshipDuration: string;
  recommenderId?: string;
}

class ContentQualityService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Perform real-time content quality analysis
   */
  async analyzeRealTime(content: string, applicationData: ApplicationData): Promise<QualityScore> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/content-quality/analyze/realtime`,
        { content, applicationData },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return {
          ...response.data.data,
          timestamp: new Date(response.data.data.timestamp)
        };
      }

      throw new Error(response.data.error || 'Analysis failed');
    } catch (error) {
      console.error('Real-time quality analysis error:', error);
      throw error;
    }
  }

  /**
   * Detect plagiarism in content
   */
  async detectPlagiarism(content: string, excludeRecommenderId?: string): Promise<PlagiarismResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/content-quality/plagiarism/detect`,
        { content, excludeRecommenderId },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.error || 'Plagiarism detection failed');
    } catch (error) {
      console.error('Plagiarism detection error:', error);
      throw error;
    }
  }

  /**
   * Validate content for submission requirements
   */
  async validateContent(content: string): Promise<ContentValidation> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/content-quality/validate`,
        { content },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.error || 'Content validation failed');
    } catch (error) {
      console.error('Content validation error:', error);
      throw error;
    }
  }

  /**
   * Get quality benchmarks for comparison
   */
  async getBenchmarks(programType?: string, relationshipType?: string): Promise<QualityBenchmark[]> {
    try {
      const params = new URLSearchParams();
      if (programType) params.append('programType', programType);
      if (relationshipType) params.append('relationshipType', relationshipType);

      const response = await axios.get(
        `${API_BASE_URL}/content-quality/benchmarks?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.error || 'Failed to retrieve benchmarks');
    } catch (error) {
      console.error('Benchmarks retrieval error:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive quality analytics
   */
  async getAnalytics(timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<QualityAnalytics> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/content-quality/analytics?timeRange=${timeRange}`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.error || 'Failed to retrieve analytics');
    } catch (error) {
      console.error('Analytics retrieval error:', error);
      throw error;
    }
  }

  /**
   * Enhanced auto-save with comprehensive analysis
   */
  async autoSaveWithAnalysis(content: string, applicationData: ApplicationData): Promise<{
    saved: boolean;
    quality?: QualityScore;
    validation?: ContentValidation;
    plagiarism?: PlagiarismResult;
  }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/content-quality/autosave`,
        { content, applicationData },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        const result = response.data.data;
        
        // Convert timestamp if quality data is present
        if (result.quality) {
          result.quality.timestamp = new Date(result.quality.timestamp);
        }
        
        return result;
      }

      throw new Error(response.data.error || 'Auto-save failed');
    } catch (error) {
      console.error('Enhanced auto-save error:', error);
      throw error;
    }
  }

  /**
   * Get improvement suggestions based on current quality
   */
  async getImprovementSuggestions(
    content: string, 
    applicationData: ApplicationData, 
    currentScores: Partial<QualityScore>
  ): Promise<{
    suggestions: string[];
    priority: Array<{area: string, priority: 'high' | 'medium' | 'low', impact: number}>;
    estimatedImpact: {
      potentialIncrease: number;
      timeToImprove: string;
      effortLevel: 'low' | 'medium' | 'high';
    };
  }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/content-quality/suggestions`,
        { content, applicationData, currentScores },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.error || 'Failed to generate suggestions');
    } catch (error) {
      console.error('Suggestion generation error:', error);
      throw error;
    }
  }

  /**
   * Compare quality score with benchmarks
   */
  async compareWithBenchmarks(
    qualityScore: QualityScore, 
    programType?: string, 
    relationshipType?: string
  ): Promise<{
    overallRanking: string;
    strengths: string[];
    improvementAreas: string[];
    percentileRanking: number;
    comparisonDetails: Array<{
      category: string;
      yourScore: number;
      averageScore: number;
      topPercentile: number;
      percentileRanking: number;
      performance: string;
    }>;
  }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/content-quality/compare`,
        { qualityScore, programType, relationshipType },
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.error || 'Benchmark comparison failed');
    } catch (error) {
      console.error('Benchmark comparison error:', error);
      throw error;
    }
  }

  /**
   * Get quality trends for current user
   */
  async getQualityTrends(timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<{
    recommenderId: string;
    timeRange: string;
    dataPoints: Array<{
      date: string;
      score: number;
      analysisId: string;
    }>;
    averageImprovement: number;
    consistencyScore: number;
    recommendations: string[];
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/content-quality/trends?timeRange=${timeRange}`,
        { headers: this.getAuthHeaders() }
      );

      if (response.data.success) {
        return response.data.data;
      }

      throw new Error(response.data.error || 'Failed to retrieve quality trends');
    } catch (error) {
      console.error('Quality trends retrieval error:', error);
      throw error;
    }
  }

  /**
   * Debounced analysis for real-time feedback
   */
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  debouncedAnalyze(
    content: string, 
    applicationData: ApplicationData, 
    callback: (result: QualityScore) => void,
    delay: number = 2000
  ): void {
    const key = `${applicationData.recommenderId || 'anonymous'}_${Date.now()}`;
    
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      try {
        const result = await this.analyzeRealTime(content, applicationData);
        callback(result);
      } catch (error) {
        console.error('Debounced analysis error:', error);
      } finally {
        this.debounceTimers.delete(key);
      }
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * Cancel all pending debounced analyses
   */
  cancelPendingAnalyses(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Get quality score color based on score value
   */
  getScoreColor(score: number): string {
    if (score >= 90) return '#4caf50'; // Green
    if (score >= 80) return '#8bc34a'; // Light green
    if (score >= 70) return '#ffc107'; // Yellow
    if (score >= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  }

  /**
   * Get quality score label based on score value
   */
  getScoreLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  }

  /**
   * Get risk level color
   */
  getRiskColor(risk: 'low' | 'medium' | 'high'): string {
    switch (risk) {
      case 'low': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      default: return '#757575';
    }
  }

  /**
   * Format quality feedback for display
   */
  formatFeedback(feedback: string[]): Array<{
    type: 'success' | 'warning' | 'error' | 'info';
    message: string;
    icon: string;
  }> {
    return feedback.map(message => {
      let type: 'success' | 'warning' | 'error' | 'info' = 'info';
      let icon = 'ℹ️';

      if (message.includes('Excellent') || message.includes('Outstanding')) {
        type = 'success';
        icon = '✅';
      } else if (message.includes('needs improvement') || message.includes('significant')) {
        type = 'error';
        icon = '❌';
      } else if (message.includes('could be') || message.includes('consider')) {
        type = 'warning';
        icon = '⚠️';
      } else if (message.includes('Good') || message.includes('Very good')) {
        type = 'success';
        icon = '👍';
      }

      return { type, message, icon };
    });
  }
}

export const contentQualityService = new ContentQualityService();