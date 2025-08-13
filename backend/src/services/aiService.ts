import { getOpenAIClient, openaiConfig } from '../config/openai';
import { AppError } from '../utils/AppError';
import { createClient } from 'redis';

// Types for AI service
export interface OutlineRequest {
  applicantName: string;
  programType: string;
  universities: string[];
  relationshipType: string;
  relationshipDuration: string;
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
  lastRequest: Date;
}

class AIService {
  private redisClient: any;
  private usageTracker: Map<string, AIUsageStats> = new Map();

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redisClient = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });
      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis for AI service:', error);
    }
  }

  /**
   * Generate recommendation outline based on applicant and recommender information
   */
  async generateOutline(request: OutlineRequest): Promise<string> {
    try {
      await this.checkRateLimit('outline');
      
      const prompt = this.buildOutlinePrompt(request);
      
      const response = await this.makeOpenAIRequest(prompt, {
        maxTokens: 1000,
        temperature: 0.7
      });

      await this.trackUsage('outline', response.usage?.total_tokens || 0);
      
      return this.validateAndFilterResponse(response.choices[0]?.message?.content || '');
    } catch (error) {
      throw this.handleAIError(error, 'outline generation');
    }
  }

  /**
   * Suggest example phrases and structures for recommendations
   */
  async suggestExamples(applicantInfo: Partial<OutlineRequest>): Promise<string[]> {
    try {
      await this.checkRateLimit('examples');
      
      const prompt = this.buildExamplesPrompt(applicantInfo);
      
      const response = await this.makeOpenAIRequest(prompt, {
        maxTokens: 800,
        temperature: 0.8
      });

      await this.trackUsage('examples', response.usage?.total_tokens || 0);
      
      const content = response.choices[0]?.message?.content || '';
      return this.parseExamplesList(content);
    } catch (error) {
      throw this.handleAIError(error, 'example suggestions');
    }
  }

  /**
   * Provide writing improvement recommendations
   */
  async improveWriting(request: WritingImprovementRequest): Promise<string> {
    try {
      await this.checkRateLimit('improvement');
      
      const prompt = this.buildImprovementPrompt(request);
      
      const response = await this.makeOpenAIRequest(prompt, {
        maxTokens: 1200,
        temperature: 0.6
      });

      await this.trackUsage('improvement', response.usage?.total_tokens || 0);
      
      return this.validateAndFilterResponse(response.choices[0]?.message?.content || '');
    } catch (error) {
      throw this.handleAIError(error, 'writing improvement');
    }
  }

  /**
   * Analyze content quality and provide detailed feedback
   */
  async analyzeQuality(content: string): Promise<QualityAnalysis> {
    try {
      await this.checkRateLimit('analysis');
      
      const prompt = this.buildAnalysisPrompt(content);
      
      const response = await this.makeOpenAIRequest(prompt, {
        maxTokens: 800,
        temperature: 0.3
      });

      await this.trackUsage('analysis', response.usage?.total_tokens || 0);
      
      const analysisText = response.choices[0]?.message?.content || '';
      return this.parseQualityAnalysis(analysisText, content);
    } catch (error) {
      throw this.handleAIError(error, 'quality analysis');
    }
  }

  /**
   * Make OpenAI API request with retry logic
   */
  private async makeOpenAIRequest(prompt: string, options: any, retryCount = 0): Promise<any> {
    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: openaiConfig.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert academic writing assistant specializing in university recommendation letters. Provide professional, specific, and actionable advice.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || openaiConfig.maxTokens,
        temperature: options.temperature || openaiConfig.temperature,
      });

      return response;
    } catch (error: any) {
      if (retryCount < openaiConfig.retryConfig.maxRetries) {
        const delay = openaiConfig.retryConfig.retryDelay * 
                     Math.pow(openaiConfig.retryConfig.backoffMultiplier, retryCount);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeOpenAIRequest(prompt, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Build outline generation prompt
   */
  private buildOutlinePrompt(request: OutlineRequest): string {
    return `Generate a comprehensive outline for a university recommendation letter with the following details:

Applicant: ${request.applicantName}
Program Type: ${request.programType}
Universities: ${request.universities.join(', ')}
Relationship: ${request.relationshipType} for ${request.relationshipDuration}
Recommender: ${request.recommenderTitle}

Requirements:
- Create a structured outline with 4-5 main sections
- Include specific areas to address in each section
- Suggest types of examples and metrics to include
- Ensure content is university-agnostic (no specific university names)
- Focus on academic/professional strengths relevant to ${request.programType} programs
- Include guidance for a 800-1000 word recommendation

Format the response as a clear, numbered outline with bullet points for details.`;
  }

  /**
   * Build examples suggestion prompt
   */
  private buildExamplesPrompt(applicantInfo: Partial<OutlineRequest>): string {
    return `Suggest 8-10 specific example phrases and structures for a university recommendation letter:

Context:
- Program Type: ${applicantInfo.programType || 'graduate'}
- Relationship: ${applicantInfo.relationshipType || 'academic'}
- Recommender Role: ${applicantInfo.recommenderTitle || 'professor'}

Provide examples for:
1. Strong opening statements
2. Academic/professional achievement descriptions
3. Character and leadership qualities
4. Specific accomplishment phrases
5. Comparative statements (without naming specific universities)
6. Closing recommendations

Format each example as a complete sentence or phrase that can be directly used or adapted.`;
  }

  /**
   * Build writing improvement prompt
   */
  private buildImprovementPrompt(request: WritingImprovementRequest): string {
    const focusGuidance = request.focusArea ? 
      `Focus specifically on improving: ${request.focusArea}` : 
      'Provide general improvement suggestions';

    return `Analyze and improve the following recommendation letter content:

${request.content}

${focusGuidance}

Provide:
1. Specific suggestions for improvement
2. Enhanced versions of weak sentences
3. Areas where more specific examples are needed
4. Tone and professionalism feedback
5. Structure and flow recommendations

Ensure all suggestions maintain university-agnostic language and professional tone.`;
  }

  /**
   * Build quality analysis prompt
   */
  private buildAnalysisPrompt(content: string): string {
    return `Analyze the quality of this university recommendation letter:

${content}

Evaluate and provide scores (1-10) for:
1. Overall Quality Score
2. Specificity (concrete examples vs. generic statements)
3. Professional Tone
4. Structure and Flow
5. University-Agnostic Language (no specific university references)

Also identify:
- Key strengths of the letter
- Areas needing improvement
- Specific suggestions for enhancement
- Whether it includes concrete examples and metrics

Format response as structured analysis with clear sections.`;
  }

  /**
   * Parse quality analysis response into structured format
   */
  private parseQualityAnalysis(analysisText: string, originalContent: string): QualityAnalysis {
    const wordCount = originalContent.split(/\s+/).length;
    
    // Extract scores and feedback (simplified parsing)
    const scoreMatch = analysisText.match(/Overall Quality Score[:\s]*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
    
    // Extract strengths and improvements
    const strengths = this.extractListItems(analysisText, 'strengths?|strong');
    const improvements = this.extractListItems(analysisText, 'improvement|enhance|better');
    const suggestions = this.extractListItems(analysisText, 'suggest|recommend');
    
    // Basic content analysis
    const hasSpecificExamples = /\b(example|instance|case|specific|metric|number|percent)\b/i.test(originalContent);
    const isProfessional = !/\b(awesome|cool|amazing|super)\b/i.test(originalContent);
    const isUniversityAgnostic = !/\b(Harvard|Yale|Stanford|MIT|Princeton)\b/i.test(originalContent);
    
    return {
      score,
      strengths,
      improvements,
      suggestions,
      wordCount,
      hasSpecificExamples,
      isProfessional,
      isUniversityAgnostic
    };
  }

  /**
   * Extract list items from analysis text
   */
  private extractListItems(text: string, pattern: string): string[] {
    const regex = new RegExp(`${pattern}[^\\n]*\\n([^\\n]+(?:\\n[^\\n]+)*?)(?=\\n\\n|$)`, 'gi');
    const matches = text.match(regex);
    
    if (!matches) return [];
    
    return matches
      .map(match => match.split('\n').slice(1))
      .flat()
      .map(item => item.replace(/^[-•*]\s*/, '').trim())
      .filter(item => item.length > 0)
      .slice(0, 5); // Limit to 5 items
  }

  /**
   * Parse examples list from AI response
   */
  private parseExamplesList(content: string): string[] {
    const lines = content.split('\n')
      .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
      .filter(line => line.length > 10);
    
    return lines.slice(0, 10); // Limit to 10 examples
  }

  /**
   * Validate and filter AI response content
   */
  private validateAndFilterResponse(content: string): string {
    // Remove potentially inappropriate content
    const filtered = content
      .replace(/\b(specific university names?|Harvard|Yale|Stanford|MIT|Princeton)\b/gi, '[University Name]')
      .replace(/\b(fuck|shit|damn|hell)\b/gi, '')
      .trim();
    
    if (filtered.length < 50) {
      throw new AppError('AI response too short or invalid', 400);
    }
    
    return filtered;
  }

  /**
   * Check rate limits for AI requests
   */
  private async checkRateLimit(operation: string): Promise<void> {
    const key = `ai_rate_limit:${operation}:${new Date().getMinutes()}`;
    
    try {
      if (this.redisClient) {
        const current = await this.redisClient.get(key);
        const count = current ? parseInt(current) : 0;
        
        if (count >= openaiConfig.rateLimits.requestsPerMinute) {
          throw new AppError('Rate limit exceeded for AI requests', 429);
        }
        
        await this.redisClient.setex(key, 60, count + 1);
      }
    } catch (error) {
      console.warn('Rate limiting check failed:', error);
      // Continue without rate limiting if Redis is unavailable
    }
  }

  /**
   * Track AI usage for monitoring and cost control
   */
  private async trackUsage(operation: string, tokens: number): Promise<void> {
    const key = `ai_usage:${operation}:${new Date().toISOString().split('T')[0]}`;
    
    try {
      if (this.redisClient) {
        const usage = await this.redisClient.get(key);
        const stats = usage ? JSON.parse(usage) : {
          requestCount: 0,
          tokenUsage: 0,
          cost: 0,
          lastRequest: new Date()
        };
        
        stats.requestCount += 1;
        stats.tokenUsage += tokens;
        stats.cost += this.calculateCost(tokens);
        stats.lastRequest = new Date();
        
        await this.redisClient.setex(key, 86400, JSON.stringify(stats)); // 24 hour expiry
      }
    } catch (error) {
      console.warn('Usage tracking failed:', error);
    }
  }

  /**
   * Calculate estimated cost based on token usage
   */
  private calculateCost(tokens: number): number {
    // GPT-4 pricing (approximate): $0.03 per 1K tokens for input, $0.06 per 1K tokens for output
    // Using average of $0.045 per 1K tokens
    return (tokens / 1000) * 0.045;
  }

  /**
   * Get usage statistics for monitoring
   */
  async getUsageStats(operation?: string, date?: string): Promise<AIUsageStats[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const pattern = operation ? 
      `ai_usage:${operation}:${targetDate}` : 
      `ai_usage:*:${targetDate}`;
    
    try {
      if (this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        const stats = [];
        
        for (const key of keys) {
          const data = await this.redisClient.get(key);
          if (data) {
            stats.push(JSON.parse(data));
          }
        }
        
        return stats;
      }
    } catch (error) {
      console.warn('Failed to retrieve usage stats:', error);
    }
    
    return [];
  }

  /**
   * Handle AI service errors
   */
  private handleAIError(error: any, operation: string): AppError {
    console.error(`AI Service Error (${operation}):`, error);
    
    if (error.code === 'insufficient_quota') {
      return new AppError('AI service quota exceeded. Please try again later.', 503);
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return new AppError('Too many AI requests. Please wait a moment and try again.', 429);
    }
    
    if (error.code === 'invalid_api_key') {
      return new AppError('AI service configuration error', 500);
    }
    
    return new AppError(`AI service temporarily unavailable for ${operation}`, 503);
  }
}

export const aiService = new AIService();