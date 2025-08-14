import { Request, Response } from 'express';
import { contentQualityService, QualityScore, PlagiarismResult, QualityAnalytics, QualityBenchmark } from '../services/contentQualityService';

export class ContentQualityController {
  /**
   * Perform real-time content quality analysis
   */
  async analyzeRealTime(req: Request, res: Response): Promise<void> {
    try {
      const { content, applicationData } = req.body;
      
      // Add recommender ID from authenticated user
      if (!applicationData.recommenderId && req.user) {
        applicationData.recommenderId = req.user.id;
      }

      const qualityScore: QualityScore = await contentQualityService.analyzeQualityRealTime(
        content, 
        applicationData
      );
      
      res.json({
        success: true,
        data: qualityScore,
        message: 'Content quality analyzed successfully'
      });
    } catch (error) {
      console.error('Real-time quality analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze content quality',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Detect plagiarism in content
   */
  async detectPlagiarism(req: Request, res: Response): Promise<void> {
    try {
      const { content, excludeRecommenderId } = req.body;
      
      const plagiarismResult: PlagiarismResult = await contentQualityService.detectPlagiarism(
        content,
        excludeRecommenderId || req.user?.id
      );
      
      res.json({
        success: true,
        data: plagiarismResult,
        message: 'Plagiarism detection completed successfully'
      });
    } catch (error) {
      console.error('Plagiarism detection error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to detect plagiarism',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get quality benchmarks for comparison
   */
  async getBenchmarks(req: Request, res: Response): Promise<void> {
    try {
      const { programType, relationshipType } = req.query;
      
      const benchmarks: QualityBenchmark[] = await contentQualityService.getQualityBenchmarks(
        programType as string,
        relationshipType as string
      );
      
      res.json({
        success: true,
        data: benchmarks,
        message: 'Quality benchmarks retrieved successfully'
      });
    } catch (error) {
      console.error('Benchmarks retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality benchmarks',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get comprehensive quality analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = 'month' } = req.query;
      
      const analytics: QualityAnalytics = await contentQualityService.getQualityAnalytics(
        timeRange as 'week' | 'month' | 'quarter' | 'year'
      );
      
      res.json({
        success: true,
        data: analytics,
        message: 'Quality analytics retrieved successfully'
      });
    } catch (error) {
      console.error('Analytics retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality analytics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Enhanced auto-save with comprehensive analysis
   */
  async autoSaveWithAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { content, applicationData } = req.body;
      
      // Add recommender ID from authenticated user
      if (req.user) {
        applicationData.recommenderId = req.user.id;
      }

      const result = await contentQualityService.autoSaveWithQuality(content, applicationData);
      
      res.json({
        success: true,
        data: result,
        message: 'Content auto-saved with quality analysis'
      });
    } catch (error) {
      console.error('Enhanced auto-save error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-save with quality analysis',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Validate content for submission requirements
   */
  async validateContent(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body;
      
      const validation = await contentQualityService.validateContent(content);
      
      res.json({
        success: true,
        data: validation,
        message: 'Content validation completed'
      });
    } catch (error) {
      console.error('Content validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate content',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get quality improvement suggestions
   */
  async getImprovementSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { content, applicationData, currentScores } = req.body;
      
      // Generate targeted suggestions based on current quality scores
      const suggestions = await this.generateTargetedSuggestions(content, applicationData, currentScores);
      
      res.json({
        success: true,
        data: {
          suggestions,
          priority: this.prioritizeSuggestions(currentScores),
          estimatedImpact: this.estimateImprovementImpact(currentScores)
        },
        message: 'Improvement suggestions generated successfully'
      });
    } catch (error) {
      console.error('Suggestion generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate improvement suggestions',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Compare content quality against benchmarks
   */
  async compareWithBenchmarks(req: Request, res: Response): Promise<void> {
    try {
      const { qualityScore, programType, relationshipType } = req.body;
      
      const benchmarks = await contentQualityService.getQualityBenchmarks(programType, relationshipType);
      const comparison = this.generateBenchmarkComparison(qualityScore, benchmarks);
      
      res.json({
        success: true,
        data: comparison,
        message: 'Benchmark comparison completed successfully'
      });
    } catch (error) {
      console.error('Benchmark comparison error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare with benchmarks',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get quality trends for a recommender
   */
  async getQualityTrends(req: Request, res: Response): Promise<void> {
    try {
      const { recommenderId } = req.params;
      const { timeRange = 'month' } = req.query;
      
      const userId = recommenderId || req.user?.id;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Recommender ID is required'
        });
      }

      // In a real implementation, this would fetch actual trend data from database
      const trends = {
        recommenderId: userId,
        timeRange,
        dataPoints: [],
        averageImprovement: 0,
        consistencyScore: 0,
        recommendations: []
      };
      
      res.json({
        success: true,
        data: trends,
        message: 'Quality trends retrieved successfully'
      });
    } catch (error) {
      console.error('Quality trends retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve quality trends',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate targeted improvement suggestions
   */
  private async generateTargetedSuggestions(content: string, applicationData: any, currentScores: any): Promise<string[]> {
    const suggestions: string[] = [];
    
    // Analyze weakest areas and provide specific suggestions
    const scoreEntries = Object.entries(currentScores).filter(([key]) => 
      ['specificity', 'structure', 'language', 'completeness', 'originality'].includes(key)
    );
    
    const sortedScores = scoreEntries.sort(([,a], [,b]) => (a as number) - (b as number));
    
    for (const [area, score] of sortedScores.slice(0, 3)) {
      if ((score as number) < 80) {
        suggestions.push(...this.getAreaSpecificSuggestions(area, content, applicationData));
      }
    }
    
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Get area-specific improvement suggestions
   */
  private getAreaSpecificSuggestions(area: string, content: string, applicationData: any): string[] {
    const applicantFirstName = applicationData.applicantName?.split(' ')[0] || 'the applicant';
    
    switch (area) {
      case 'specificity':
        return [
          `Include specific examples of ${applicantFirstName}'s achievements with quantifiable results`,
          'Add concrete metrics, percentages, or timeframes to strengthen credibility',
          `Describe a particular project or situation where ${applicantFirstName} excelled`
        ];
      
      case 'structure':
        return [
          'Start with a clear opening statement about your recommendation',
          'Organize content into distinct paragraphs covering different aspects',
          'End with a strong concluding statement and offer for further discussion'
        ];
      
      case 'language':
        return [
          'Use more impactful adjectives (exceptional, outstanding, remarkable)',
          'Replace passive voice with active voice for more engaging content',
          'Ensure consistent professional tone throughout the recommendation'
        ];
      
      case 'completeness':
        return [
          'Expand on academic performance and intellectual capabilities',
          'Include information about character and personal qualities',
          'Discuss potential for success in the target program'
        ];
      
      case 'originality':
        return [
          'Focus on unique observations specific to your experience',
          'Avoid common template phrases and generic statements',
          'Write from your personal perspective and relationship with the applicant'
        ];
      
      default:
        return ['Consider reviewing and enhancing this area of the recommendation'];
    }
  }

  /**
   * Prioritize suggestions based on impact potential
   */
  private prioritizeSuggestions(currentScores: any): Array<{area: string, priority: 'high' | 'medium' | 'low', impact: number}> {
    const priorities: Array<{area: string, priority: 'high' | 'medium' | 'low', impact: number}> = [];
    
    Object.entries(currentScores).forEach(([area, score]) => {
      if (['specificity', 'structure', 'language', 'completeness', 'originality'].includes(area)) {
        const numScore = score as number;
        let priority: 'high' | 'medium' | 'low' = 'low';
        let impact = 0;
        
        if (numScore < 60) {
          priority = 'high';
          impact = 100 - numScore;
        } else if (numScore < 80) {
          priority = 'medium';
          impact = (100 - numScore) * 0.7;
        } else {
          priority = 'low';
          impact = (100 - numScore) * 0.3;
        }
        
        priorities.push({ area, priority, impact: Math.round(impact) });
      }
    });
    
    return priorities.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Estimate improvement impact
   */
  private estimateImprovementImpact(currentScores: any): {
    potentialIncrease: number;
    timeToImprove: string;
    effortLevel: 'low' | 'medium' | 'high';
  } {
    const overallScore = currentScores.overall || 70;
    const lowestScores = Object.values(currentScores)
      .filter((score): score is number => typeof score === 'number')
      .sort((a, b) => a - b)
      .slice(0, 3);
    
    const averageLowest = lowestScores.reduce((sum, score) => sum + score, 0) / lowestScores.length;
    const potentialIncrease = Math.min(25, Math.max(5, Math.round((85 - averageLowest) * 0.6)));
    
    let timeToImprove = '15-30 minutes';
    let effortLevel: 'low' | 'medium' | 'high' = 'low';
    
    if (overallScore < 60) {
      timeToImprove = '45-60 minutes';
      effortLevel = 'high';
    } else if (overallScore < 75) {
      timeToImprove = '30-45 minutes';
      effortLevel = 'medium';
    }
    
    return { potentialIncrease, timeToImprove, effortLevel };
  }

  /**
   * Generate benchmark comparison
   */
  private generateBenchmarkComparison(qualityScore: QualityScore, benchmarks: QualityBenchmark[]): any {
    const comparison = {
      overallRanking: 'average',
      strengths: [] as string[],
      improvementAreas: [] as string[],
      percentileRanking: 50,
      comparisonDetails: [] as any[]
    };
    
    benchmarks.forEach(benchmark => {
      const scoreDiff = qualityScore.overall - benchmark.averageScore;
      const percentile = scoreDiff > 0 ? Math.min(90, 50 + (scoreDiff * 2)) : Math.max(10, 50 + (scoreDiff * 2));
      
      comparison.comparisonDetails.push({
        category: benchmark.category,
        yourScore: qualityScore.overall,
        averageScore: benchmark.averageScore,
        topPercentile: benchmark.topPercentile,
        percentileRanking: Math.round(percentile),
        performance: scoreDiff > 10 ? 'above average' : scoreDiff < -10 ? 'below average' : 'average'
      });
    });
    
    // Determine overall ranking
    const avgPercentile = comparison.comparisonDetails.reduce((sum: number, detail: any) => 
      sum + detail.percentileRanking, 0) / comparison.comparisonDetails.length;
    
    comparison.percentileRanking = Math.round(avgPercentile);
    
    if (avgPercentile >= 80) {
      comparison.overallRanking = 'excellent';
    } else if (avgPercentile >= 60) {
      comparison.overallRanking = 'above average';
    } else if (avgPercentile >= 40) {
      comparison.overallRanking = 'average';
    } else {
      comparison.overallRanking = 'below average';
    }
    
    return comparison;
  }
}

export const contentQualityController = new ContentQualityController();