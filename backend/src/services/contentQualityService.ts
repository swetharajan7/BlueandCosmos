import { aiService } from './aiService';

export interface QualityScore {
  overall: number; // 0-100
  specificity: number; // 0-100
  structure: number; // 0-100
  language: number; // 0-100
  completeness: number; // 0-100
  feedback: string[];
  suggestions: string[];
}

export interface ContentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  universityAgnostic: boolean;
  universityReferences: string[];
}

class ContentQualityService {
  /**
   * Analyze content quality and provide scoring
   */
  async analyzeQuality(content: string, applicationData: {
    applicantName: string;
    programType: string;
    relationshipType: string;
    relationshipDuration: string;
  }): Promise<QualityScore> {
    try {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      // Basic quality checks
      const scores = {
        specificity: this.analyzeSpecificity(content, applicationData),
        structure: this.analyzeStructure(content),
        language: this.analyzeLanguage(content),
        completeness: this.analyzeCompleteness(content, wordCount)
      };

      const overall = Math.round(
        (scores.specificity * 0.3 + 
         scores.structure * 0.25 + 
         scores.language * 0.25 + 
         scores.completeness * 0.2)
      );

      const feedback = this.generateFeedback(scores, wordCount);
      const suggestions = await this.generateSuggestions(content, scores, applicationData);

      return {
        overall,
        ...scores,
        feedback,
        suggestions
      };
    } catch (error) {
      console.error('Content quality analysis error:', error);
      // Return basic scoring if AI analysis fails
      return this.getBasicQualityScore(content);
    }
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
   * Auto-save content with quality analysis
   */
  async autoSaveWithQuality(content: string, applicationData: any): Promise<{
    saved: boolean;
    quality?: QualityScore;
    validation?: ContentValidation;
  }> {
    try {
      // Only analyze quality if content is substantial
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      if (wordCount < 50) {
        return { saved: true };
      }

      const [quality, validation] = await Promise.all([
        this.analyzeQuality(content, applicationData),
        this.validateContent(content)
      ]);

      return {
        saved: true,
        quality,
        validation
      };
    } catch (error) {
      console.error('Auto-save with quality analysis error:', error);
      return { saved: true };
    }
  }

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

  private generateFeedback(scores: any, wordCount: number): string[] {
    const feedback: string[] = [];

    if (scores.overall >= 90) {
      feedback.push('Excellent recommendation! This is comprehensive and well-written.');
    } else if (scores.overall >= 80) {
      feedback.push('Very good recommendation with strong content.');
    } else if (scores.overall >= 70) {
      feedback.push('Good recommendation that could be enhanced with more specific details.');
    } else if (scores.overall >= 60) {
      feedback.push('Adequate recommendation but needs improvement in several areas.');
    } else {
      feedback.push('This recommendation needs significant improvement to be effective.');
    }

    if (scores.specificity < 70) {
      feedback.push('Add more specific examples, metrics, and concrete achievements.');
    }

    if (scores.structure < 70) {
      feedback.push('Consider improving the structure with clear introduction, body, and conclusion.');
    }

    if (scores.language < 70) {
      feedback.push('Use more professional and impactful language.');
    }

    if (wordCount < 200) {
      feedback.push('Expand the content to at least 200 words for a comprehensive recommendation.');
    }

    if (wordCount > 900) {
      feedback.push('Consider condensing the content to stay within the 1000-word limit.');
    }

    return feedback;
  }

  private async generateSuggestions(content: string, scores: any, applicationData: any): Promise<string[]> {
    const suggestions: string[] = [];

    if (scores.specificity < 80) {
      suggestions.push('Include specific examples of the applicant\'s achievements or contributions');
      suggestions.push('Add quantifiable metrics (percentages, numbers, timeframes)');
      suggestions.push(`Mention specific instances where ${applicationData.applicantName.split(' ')[0]} demonstrated excellence`);
    }

    if (scores.structure < 80) {
      suggestions.push('Start with a clear statement of recommendation');
      suggestions.push('Organize content into distinct paragraphs covering different aspects');
      suggestions.push('End with a strong endorsement and willingness to discuss further');
    }

    if (scores.language < 80) {
      suggestions.push('Use more impactful adjectives (exceptional, outstanding, remarkable)');
      suggestions.push('Replace generic phrases with specific descriptors');
      suggestions.push('Ensure professional tone throughout');
    }

    return suggestions;
  }

  private getBasicQualityScore(content: string): QualityScore {
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
      feedback: ['Basic quality analysis - detailed scoring unavailable'],
      suggestions: ['Add specific examples and achievements', 'Ensure professional language throughout']
    };
  }
}

export const contentQualityService = new ContentQualityService();