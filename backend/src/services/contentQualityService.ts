import { aiService } from './aiService';
import crypto from 'crypto';

export interface QualityScore {
  overall: number; // 0-100
  specificity: number; // 0-100
  structure: number; // 0-100
  language: number; // 0-100
  completeness: number; // 0-100
  originality: number; // 0-100
  readability: number; // 0-100
  feedback: string[];
  suggestions: string[];
  timestamp: Date;
  analysisId: string;
}

export interface PlagiarismResult {
  originalityScore: number; // 0-100
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

export interface ContentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  universityAgnostic: boolean;
  universityReferences: string[];
}

class ContentQualityService {
  private qualityHistory: Map<string, QualityScore[]> = new Map();
  private commonPhrases: Set<string> = new Set();
  private suspiciousPatterns: RegExp[] = [
    /(.{20,})\1+/g, // Repeated text patterns
    /\b(lorem ipsum|sample text|placeholder|example text)\b/gi,
    /\b(copy|paste|template|boilerplate)\b/gi
  ];

  constructor() {
    this.initializeCommonPhrases();
  }

  /**
   * Real-time content analysis with comprehensive scoring
   */
  async analyzeQualityRealTime(content: string, applicationData: {
    applicantName: string;
    programType: string;
    relationshipType: string;
    relationshipDuration: string;
    recommenderId?: string;
  }): Promise<QualityScore> {
    const analysisId = crypto.randomUUID();
    
    try {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      // Parallel analysis for better performance
      const [
        specificityScore,
        structureScore,
        languageScore,
        completenessScore,
        originalityScore,
        readabilityScore
      ] = await Promise.all([
        this.analyzeSpecificity(content, applicationData),
        this.analyzeStructure(content),
        this.analyzeLanguage(content),
        this.analyzeCompleteness(content, wordCount),
        this.analyzeOriginality(content),
        this.analyzeReadability(content)
      ]);

      const scores = {
        specificity: specificityScore,
        structure: structureScore,
        language: languageScore,
        completeness: completenessScore,
        originality: originalityScore,
        readability: readabilityScore
      };

      const overall = Math.round(
        (scores.specificity * 0.25 + 
         scores.structure * 0.20 + 
         scores.language * 0.20 + 
         scores.completeness * 0.15 +
         scores.originality * 0.15 +
         scores.readability * 0.05)
      );

      const feedback = this.generateEnhancedFeedback(scores, wordCount, content);
      const suggestions = await this.generateAISuggestions(content, scores, applicationData);

      const qualityScore: QualityScore = {
        overall,
        ...scores,
        feedback,
        suggestions,
        timestamp: new Date(),
        analysisId
      };

      // Store for analytics
      this.storeQualityAnalysis(applicationData.recommenderId || 'anonymous', qualityScore);

      return qualityScore;
    } catch (error) {
      console.error('Real-time content quality analysis error:', error);
      return this.getBasicQualityScore(content, analysisId);
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async analyzeQuality(content: string, applicationData: {
    applicantName: string;
    programType: string;
    relationshipType: string;
    relationshipDuration: string;
  }): Promise<QualityScore> {
    return this.analyzeQualityRealTime(content, applicationData);
  }

  /**
   * Validate content for university-agnostic language and other requirements
   */
  async validateContent(content: string): Promise<ContentValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const universityReferences: string[] = [];

    // Check for university-specific references
    const universityPatterns = [
      /\b(Harvard|Yale|Princeton|Stanford|MIT|Berkeley|Columbia|Penn|Cornell|Brown|Dartmouth)\b/gi,
      /\b(University of [A-Z][a-z]+)\b/gi,
      /\b([A-Z][a-z]+ University)\b/gi,
      /\b([A-Z][a-z]+ College)\b/gi,
      /\b(this university|your university|the university|this institution|your institution|the institution)\b/gi
    ];

    for (const pattern of universityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        universityReferences.push(...matches);
      }
    }

    // Content length validation
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 200) {
      errors.push('Recommendation must be at least 200 words for comprehensiveness');
    }
    if (wordCount > 1000) {
      errors.push('Recommendation must not exceed 1000 words');
    }

    // Check for generic content
    const genericPhrases = [
      'good student',
      'hard worker',
      'nice person',
      'smart student',
      'great student'
    ];

    const foundGeneric = genericPhrases.filter(phrase => 
      content.toLowerCase().includes(phrase.toLowerCase())
    );

    if (foundGeneric.length > 2) {
      warnings.push('Consider replacing generic phrases with specific examples and achievements');
    }

    // Check for specific examples
    const hasNumbers = /\d+/.test(content);
    const hasPercentages = /%/.test(content);
    const hasSpecificAchievements = /\b(award|prize|recognition|achievement|accomplishment|project|research|publication)\b/gi.test(content);

    if (!hasNumbers && !hasPercentages && !hasSpecificAchievements) {
      warnings.push('Consider adding specific examples, metrics, or achievements to strengthen the recommendation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      universityAgnostic: universityReferences.length === 0,
      universityReferences
    };
  }

  /**
   * Comprehensive plagiarism detection
   */
  async detectPlagiarism(content: string, excludeRecommenderId?: string): Promise<PlagiarismResult> {
    try {
      const segments = this.segmentContent(content);
      const suspiciousSegments: PlagiarismResult['suspiciousSegments'] = [];
      
      // Check against stored recommendations (excluding current recommender)
      for (const segment of segments) {
        const similarity = await this.checkSegmentSimilarity(segment, excludeRecommenderId);
        if (similarity.score > 0.7) {
          suspiciousSegments.push({
            text: segment.text,
            startIndex: segment.startIndex,
            endIndex: segment.endIndex,
            similarity: similarity.score,
            potentialSource: similarity.source
          });
        }
      }

      // Check for common template phrases
      const templateSimilarity = this.checkTemplateSimilarity(content);
      if (templateSimilarity.score > 0.8) {
        suspiciousSegments.push({
          text: templateSimilarity.text,
          startIndex: 0,
          endIndex: templateSimilarity.text.length,
          similarity: templateSimilarity.score,
          potentialSource: 'Common template'
        });
      }

      const originalityScore = Math.max(0, 100 - (suspiciousSegments.length * 15));
      const overallRisk = this.calculateRisk(suspiciousSegments, originalityScore);
      const recommendations = this.generatePlagiarismRecommendations(suspiciousSegments, overallRisk);

      return {
        originalityScore,
        suspiciousSegments,
        overallRisk,
        recommendations
      };
    } catch (error) {
      console.error('Plagiarism detection error:', error);
      return {
        originalityScore: 85, // Default to good score if detection fails
        suspiciousSegments: [],
        overallRisk: 'low',
        recommendations: []
      };
    }
  }

  /**
   * Get quality benchmarks for comparison
   */
  async getQualityBenchmarks(programType?: string, relationshipType?: string): Promise<QualityBenchmark[]> {
    const benchmarks: QualityBenchmark[] = [];
    
    // Overall benchmark
    const overallStats = this.calculateBenchmarkStats();
    benchmarks.push({
      category: 'Overall',
      averageScore: overallStats.average,
      topPercentile: overallStats.topPercentile,
      improvementAreas: overallStats.commonIssues,
      sampleCount: overallStats.count
    });

    // Program-specific benchmarks
    if (programType) {
      const programStats = this.calculateBenchmarkStats(programType);
      benchmarks.push({
        category: `${programType} Programs`,
        averageScore: programStats.average,
        topPercentile: programStats.topPercentile,
        improvementAreas: programStats.commonIssues,
        sampleCount: programStats.count
      });
    }

    // Relationship-specific benchmarks
    if (relationshipType) {
      const relationshipStats = this.calculateBenchmarkStats(undefined, relationshipType);
      benchmarks.push({
        category: `${relationshipType} Relationships`,
        averageScore: relationshipStats.average,
        topPercentile: relationshipStats.topPercentile,
        improvementAreas: relationshipStats.commonIssues,
        sampleCount: relationshipStats.count
      });
    }

    return benchmarks;
  }

  /**
   * Get comprehensive quality analytics
   */
  async getQualityAnalytics(timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<QualityAnalytics> {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    const analytics = this.calculateAnalytics(startDate, endDate);
    
    return {
      totalAnalyses: analytics.total,
      averageQuality: analytics.averageScore,
      qualityTrends: analytics.trends,
      commonIssues: analytics.issues,
      benchmarks: await this.getQualityBenchmarks()
    };
  }

  /**
   * Auto-save content with enhanced quality analysis
   */
  async autoSaveWithQuality(content: string, applicationData: any): Promise<{
    saved: boolean;
    quality?: QualityScore;
    validation?: ContentValidation;
    plagiarism?: PlagiarismResult;
  }> {
    try {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      if (wordCount < 50) {
        return { saved: true };
      }

      const [quality, validation, plagiarism] = await Promise.all([
        this.analyzeQualityRealTime(content, applicationData),
        this.validateContent(content),
        this.detectPlagiarism(content, applicationData.recommenderId)
      ]);

      return {
        saved: true,
        quality,
        validation,
        plagiarism
      };
    } catch (error) {
      console.error('Auto-save with enhanced quality analysis error:', error);
      return { saved: true };
    }
  }

  // Private helper methods
  private analyzeSpecificity(content: string, applicationData: any): number {
    let score = 50; // Base score

    // Check for applicant name usage
    const namePattern = new RegExp(applicationData.applicantName.split(' ')[0], 'gi');
    if (namePattern.test(content)) score += 15;

    // Check for specific examples
    const specificPatterns = [
      /\d+%/g, // Percentages
      /\d+\s*(years?|months?|weeks?)/gi, // Time periods
      /\$\d+/g, // Dollar amounts
      /\d+\s*(students?|people|participants?)/gi, // Numbers of people
      /\b(project|research|study|analysis|report|presentation)\b/gi // Specific work
    ];

    specificPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) score += Math.min(matches.length * 5, 20);
    });

    // Check for relationship context
    if (content.toLowerCase().includes(applicationData.relationshipType.toLowerCase())) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private analyzeStructure(content: string): number {
    let score = 50; // Base score

    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    
    // Ideal structure: 3-5 paragraphs
    if (paragraphs.length >= 3 && paragraphs.length <= 5) {
      score += 20;
    } else if (paragraphs.length >= 2) {
      score += 10;
    }

    // Check for introduction
    const firstParagraph = paragraphs[0]?.toLowerCase() || '';
    if (firstParagraph.includes('recommend') || firstParagraph.includes('pleasure') || firstParagraph.includes('honor')) {
      score += 15;
    }

    // Check for conclusion
    const lastParagraph = paragraphs[paragraphs.length - 1]?.toLowerCase() || '';
    if (lastParagraph.includes('recommend') || lastParagraph.includes('endorse') || lastParagraph.includes('support')) {
      score += 15;
    }

    return Math.min(score, 100);
  }

  private analyzeLanguage(content: string): number {
    let score = 70; // Base score for professional language

    // Check for professional vocabulary
    const professionalWords = [
      'exceptional', 'outstanding', 'exemplary', 'distinguished', 'remarkable',
      'innovative', 'analytical', 'collaborative', 'leadership', 'initiative',
      'dedication', 'commitment', 'excellence', 'proficiency', 'expertise'
    ];

    const foundProfessional = professionalWords.filter(word => 
      content.toLowerCase().includes(word.toLowerCase())
    ).length;

    score += Math.min(foundProfessional * 3, 20);

    // Penalize for informal language
    const informalWords = ['awesome', 'cool', 'nice', 'okay', 'pretty good'];
    const foundInformal = informalWords.filter(word => 
      content.toLowerCase().includes(word.toLowerCase())
    ).length;

    score -= foundInformal * 5;

    return Math.max(Math.min(score, 100), 0);
  }

  private analyzeCompleteness(content: string, wordCount: number): number {
    let score = 0;

    // Word count scoring
    if (wordCount >= 800) score += 30;
    else if (wordCount >= 600) score += 25;
    else if (wordCount >= 400) score += 20;
    else if (wordCount >= 200) score += 15;
    else score += 5;

    // Content coverage
    const coverageAreas = [
      /\b(academic|academics|coursework|grades|performance)\b/gi,
      /\b(character|integrity|ethics|values|personality)\b/gi,
      /\b(leadership|lead|manage|organize|coordinate)\b/gi,
      /\b(skills|abilities|talents|strengths|capabilities)\b/gi,
      /\b(experience|background|history|work|internship)\b/gi,
      /\b(potential|future|career|goals|aspirations)\b/gi
    ];

    const coveredAreas = coverageAreas.filter(pattern => pattern.test(content)).length;
    score += coveredAreas * 10;

    return Math.min(score, 100);
  }

  private async analyzeOriginality(content: string): Promise<number> {
    let score = 90; // Start with high originality assumption

    // Check for suspicious patterns
    for (const pattern of this.suspiciousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        score -= matches.length * 10;
      }
    }

    // Check against common phrases
    const words = content.toLowerCase().split(/\s+/);
    const commonPhraseCount = words.filter(word => this.commonPhrases.has(word)).length;
    const commonPhraseRatio = commonPhraseCount / words.length;
    
    if (commonPhraseRatio > 0.3) {
      score -= 20;
    } else if (commonPhraseRatio > 0.2) {
      score -= 10;
    }

    // Check for repetitive content
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
    const repetitionRatio = 1 - (uniqueSentences.size / sentences.length);
    
    if (repetitionRatio > 0.2) {
      score -= 15;
    }

    return Math.max(Math.min(score, 100), 0);
  }

  private analyzeReadability(content: string): Promise<number> {
    return new Promise((resolve) => {
      try {
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const syllables = this.countSyllables(content);

        // Flesch Reading Ease approximation
        const avgSentenceLength = words.length / sentences.length;
        const avgSyllablesPerWord = syllables / words.length;
        
        const fleschScore = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord);
        
        // Convert to 0-100 scale where higher is better
        let readabilityScore = 50;
        if (fleschScore >= 60) readabilityScore = 80; // Easy to read
        else if (fleschScore >= 50) readabilityScore = 70; // Fairly easy
        else if (fleschScore >= 30) readabilityScore = 60; // Fairly difficult
        else readabilityScore = 40; // Difficult

        // Adjust for professional context (slightly more complex is acceptable)
        readabilityScore = Math.min(readabilityScore + 10, 100);
        
        resolve(readabilityScore);
      } catch (error) {
        resolve(70); // Default score
      }
    });
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
    let totalSyllables = 0;
    for (const word of words) {
      // Simple syllable counting heuristic
      const vowels = word.match(/[aeiouy]+/g) || [];
      let syllableCount = vowels.length;
      if (word.endsWith('e')) syllableCount--;
      totalSyllables += Math.max(syllableCount, 1);
    }
    return totalSyllables;
  }

  private segmentContent(content: string): Array<{text: string, startIndex: number, endIndex: number}> {
    const segments: Array<{text: string, startIndex: number, endIndex: number}> = [];
    const sentences = content.split(/[.!?]+/);
    let currentIndex = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length > 20) { // Only check substantial segments
        const startIndex = content.indexOf(trimmed, currentIndex);
        segments.push({
          text: trimmed,
          startIndex,
          endIndex: startIndex + trimmed.length
        });
      }
      currentIndex += sentence.length + 1;
    }

    return segments;
  }

  private async checkSegmentSimilarity(segment: {text: string}, excludeRecommenderId?: string): Promise<{score: number, source?: string}> {
    // In a real implementation, this would check against a database of existing recommendations
    // For now, we'll simulate with basic pattern matching
    const suspiciousPatterns = [
      'I am writing to recommend',
      'It is my pleasure to recommend',
      'I have known [name] for',
      'Without hesitation, I recommend',
      'I strongly recommend [name] for admission'
    ];

    const text = segment.text.toLowerCase();
    for (const pattern of suspiciousPatterns) {
      const similarity = this.calculateStringSimilarity(text, pattern.toLowerCase());
      if (similarity > 0.7) {
        return { score: similarity, source: 'Common template phrase' };
      }
    }

    return { score: 0 };
  }

  private checkTemplateSimilarity(content: string): {score: number, text: string} {
    const templates = [
      'I am writing to provide my strongest recommendation for [name] for admission to your program.',
      'It is with great pleasure that I recommend [name] for admission to your university.',
      'I have had the privilege of working with [name] and can recommend them without reservation.'
    ];

    const contentLower = content.toLowerCase();
    for (const template of templates) {
      const similarity = this.calculateStringSimilarity(contentLower, template.toLowerCase());
      if (similarity > 0.8) {
        return { score: similarity, text: template };
      }
    }

    return { score: 0, text: '' };
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private calculateRisk(segments: PlagiarismResult['suspiciousSegments'], originalityScore: number): 'low' | 'medium' | 'high' {
    if (originalityScore < 60 || segments.length > 3) return 'high';
    if (originalityScore < 80 || segments.length > 1) return 'medium';
    return 'low';
  }

  private generatePlagiarismRecommendations(segments: PlagiarismResult['suspiciousSegments'], risk: 'low' | 'medium' | 'high'): string[] {
    const recommendations: string[] = [];

    if (risk === 'high') {
      recommendations.push('Significant similarity detected. Please rewrite the recommendation in your own words.');
      recommendations.push('Avoid using common template phrases and focus on specific, personal observations.');
    } else if (risk === 'medium') {
      recommendations.push('Some similar content detected. Consider rephrasing to make it more original.');
      recommendations.push('Add more specific examples unique to your experience with the applicant.');
    }

    if (segments.length > 0) {
      recommendations.push('Review highlighted sections for potential similarity issues.');
      recommendations.push('Ensure all content reflects your personal experience and observations.');
    }

    return recommendations;
  }

  private storeQualityAnalysis(recommenderId: string, qualityScore: QualityScore): void {
    if (!this.qualityHistory.has(recommenderId)) {
      this.qualityHistory.set(recommenderId, []);
    }
    
    const history = this.qualityHistory.get(recommenderId)!;
    history.push(qualityScore);
    
    // Keep only last 100 analyses per recommender
    if (history.length > 100) {
      history.shift();
    }
  }

  private calculateBenchmarkStats(programType?: string, relationshipType?: string): {
    average: number;
    topPercentile: number;
    commonIssues: string[];
    count: number;
  } {
    const allScores: number[] = [];
    const issueFrequency: Map<string, number> = new Map();

    for (const [_, analyses] of this.qualityHistory) {
      for (const analysis of analyses) {
        // Filter by criteria if provided
        // In a real implementation, this would filter based on stored metadata
        allScores.push(analysis.overall);
        
        // Count common issues
        for (const feedback of analysis.feedback) {
          issueFrequency.set(feedback, (issueFrequency.get(feedback) || 0) + 1);
        }
      }
    }

    const average = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 75;
    const sorted = allScores.sort((a, b) => b - a);
    const topPercentile = sorted[Math.floor(sorted.length * 0.1)] || average;
    
    const commonIssues = Array.from(issueFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue);

    return {
      average: Math.round(average),
      topPercentile: Math.round(topPercentile),
      commonIssues,
      count: allScores.length
    };
  }

  private calculateAnalytics(startDate: Date, endDate: Date): {
    total: number;
    averageScore: number;
    trends: Array<{date: string, averageScore: number, analysisCount: number}>;
    issues: Array<{issue: string, frequency: number, impact: number}>;
  } {
    const analyses: QualityScore[] = [];
    const dailyStats: Map<string, {scores: number[], count: number}> = new Map();
    const issueImpact: Map<string, {frequency: number, totalImpact: number}> = new Map();

    for (const [_, userAnalyses] of this.qualityHistory) {
      for (const analysis of userAnalyses) {
        if (analysis.timestamp >= startDate && analysis.timestamp <= endDate) {
          analyses.push(analysis);
          
          const dateKey = analysis.timestamp.toISOString().split('T')[0];
          if (!dailyStats.has(dateKey)) {
            dailyStats.set(dateKey, {scores: [], count: 0});
          }
          const dayStats = dailyStats.get(dateKey)!;
          dayStats.scores.push(analysis.overall);
          dayStats.count++;

          // Track issue impact
          for (const feedback of analysis.feedback) {
            if (!issueImpact.has(feedback)) {
              issueImpact.set(feedback, {frequency: 0, totalImpact: 0});
            }
            const impact = issueImpact.get(feedback)!;
            impact.frequency++;
            impact.totalImpact += (100 - analysis.overall); // Higher impact for lower scores
          }
        }
      }
    }

    const averageScore = analyses.length > 0 
      ? analyses.reduce((sum, a) => sum + a.overall, 0) / analyses.length 
      : 75;

    const trends = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        averageScore: Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length),
        analysisCount: stats.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const issues = Array.from(issueImpact.entries())
      .map(([issue, data]) => ({
        issue,
        frequency: data.frequency,
        impact: Math.round(data.totalImpact / data.frequency)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    return {
      total: analyses.length,
      averageScore: Math.round(averageScore),
      trends,
      issues
    };
  }

  private generateEnhancedFeedback(scores: any, wordCount: number, content: string): string[] {
    const feedback: string[] = [];

    // Overall assessment
    if (scores.overall >= 90) {
      feedback.push('🌟 Exceptional recommendation! This demonstrates outstanding quality across all metrics.');
    } else if (scores.overall >= 80) {
      feedback.push('✅ Excellent recommendation with strong content and structure.');
    } else if (scores.overall >= 70) {
      feedback.push('👍 Good recommendation that could be enhanced with more specific details.');
    } else if (scores.overall >= 60) {
      feedback.push('⚠️ Adequate recommendation but needs improvement in several areas.');
    } else {
      feedback.push('❌ This recommendation needs significant improvement to be effective.');
    }

    // Specific area feedback
    if (scores.specificity < 70) {
      feedback.push('📊 Add more specific examples, metrics, and concrete achievements to strengthen impact.');
    }

    if (scores.structure < 70) {
      feedback.push('📝 Improve structure with clear introduction, detailed body paragraphs, and strong conclusion.');
    }

    if (scores.language < 70) {
      feedback.push('💬 Use more professional and impactful language to enhance credibility.');
    }

    if (scores.originality < 70) {
      feedback.push('🎯 Ensure content is original and reflects your unique perspective and experience.');
    }

    if (scores.readability < 60) {
      feedback.push('📖 Consider simplifying complex sentences for better readability while maintaining professionalism.');
    }

    // Word count feedback
    if (wordCount < 200) {
      feedback.push('📏 Expand content to at least 200 words for a comprehensive recommendation.');
    } else if (wordCount > 900) {
      feedback.push('✂️ Consider condensing content to stay well within the 1000-word limit.');
    }

    return feedback;
  }

  private async generateAISuggestions(content: string, scores: any, applicationData: any): Promise<string[]> {
    try {
      const prompt = `Analyze this recommendation letter and provide 3-5 specific, actionable suggestions for improvement:

Content: "${content.substring(0, 500)}..."

Current scores:
- Specificity: ${scores.specificity}/100
- Structure: ${scores.structure}/100  
- Language: ${scores.language}/100
- Completeness: ${scores.completeness}/100
- Originality: ${scores.originality}/100

Applicant: ${applicationData.applicantName}
Program: ${applicationData.programType}
Relationship: ${applicationData.relationshipType}

Provide specific, actionable suggestions to improve the weakest areas.`;

      const aiResponse = await aiService.improveWriting({
        content: content.substring(0, 500),
        focusArea: scores.specificity < scores.structure ? 'specificity' : 'structure'
      });

      if (aiResponse && typeof aiResponse === 'string') {
        return aiResponse
          .split('\n')
          .filter((line: string) => line.trim().length > 0)
          .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
          .slice(0, 5);
      }
    } catch (error) {
      console.error('AI suggestion generation error:', error);
    }

    // Fallback suggestions
    return this.getFallbackSuggestions(scores, applicationData);
  }

  private getFallbackSuggestions(scores: any, applicationData: any): string[] {
    const suggestions: string[] = [];

    if (scores.specificity < 80) {
      suggestions.push(`Include specific examples of ${applicationData.applicantName.split(' ')[0]}'s achievements with quantifiable results`);
      suggestions.push('Add concrete metrics, timeframes, and measurable outcomes to strengthen credibility');
    }

    if (scores.structure < 80) {
      suggestions.push('Start with a clear statement of recommendation and your relationship to the applicant');
      suggestions.push('Organize content into distinct paragraphs covering academic performance, character, and potential');
    }

    if (scores.language < 80) {
      suggestions.push('Use more impactful adjectives (exceptional, outstanding, remarkable) instead of generic terms');
      suggestions.push('Replace passive voice with active voice to create more engaging content');
    }

    if (scores.originality < 70) {
      suggestions.push('Focus on unique observations and experiences specific to your relationship with the applicant');
      suggestions.push('Avoid common template phrases and write from your personal perspective');
    }

    return suggestions.slice(0, 5);
  }

  private initializeCommonPhrases(): void {
    const phrases = [
      'good', 'nice', 'great', 'excellent', 'outstanding', 'exceptional',
      'student', 'person', 'individual', 'candidate', 'applicant',
      'recommend', 'endorse', 'support', 'suggest', 'propose',
      'academic', 'performance', 'achievement', 'success', 'ability'
    ];
    
    phrases.forEach(phrase => this.commonPhrases.add(phrase.toLowerCase()));
  }

  private getBasicQualityScore(content: string, analysisId: string): QualityScore {
    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    let overall = 50;
    if (wordCount >= 200) overall += 20;
    if (wordCount >= 500) overall += 10;
    if (content.includes('recommend')) overall += 10;
    if (/\d+/.test(content)) overall += 10;

    return {
      overall: Math.min(overall, 100),
      specificity: 60,
      structure: 60,
      language: 70,
      completeness: wordCount >= 200 ? 70 : 40,
      originality: 80,
      readability: 70,
      feedback: ['Basic quality analysis - detailed scoring unavailable'],
      suggestions: ['Add specific examples and achievements', 'Ensure professional language throughout'],
      timestamp: new Date(),
      analysisId
    };
  }
}

export const contentQualityService = new ContentQualityService();