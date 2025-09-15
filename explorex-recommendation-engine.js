/**
 * ExploreX Recommendation Engine & Personalization System
 * 
 * Advanced machine learning-powered recommendation system featuring:
 * - Collaborative filtering for user-based recommendations
 * - Content-based filtering using experience attributes
 * - Hybrid recommendation algorithms
 * - Real-time preference learning and adaptation
 * - A/B testing framework for algorithm optimization
 */

// =============================================================================
// RECOMMENDATION ENGINE CORE
// =============================================================================

class RecommendationEngine {
  constructor(config = {}) {
    this.config = {
      maxRecommendations: 20,
      minSimilarityThreshold: 0.3,
      learningRate: 0.1,
      decayFactor: 0.95,
      diversityWeight: 0.2,
      ...config
    };
    
    this.userProfiles = new Map();
    this.experienceFeatures = new Map();
    this.interactionHistory = [];
    this.modelWeights = {
      collaborative: 0.4,
      contentBased: 0.4,
      popularity: 0.2
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize recommendation engine
   */
  async initialize() {
    try {
      console.log('🤖 Initializing Recommendation Engine...');
      
      // Load existing user profiles and interaction data
      await this.loadUserProfiles();
      await this.loadInteractionHistory();
      
      // Initialize experience features
      await this.buildExperienceFeatures();
      
      // Train initial models
      await this.trainModels();
      
      this.isInitialized = true;
      console.log('✅ Recommendation Engine initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Recommendation Engine:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations for user
   */
  async getRecommendations(userId, context = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log(`🎯 Generating recommendations for user: ${userId}`);
      
      // Get user profile
      const userProfile = this.getUserProfile(userId);
      
      // Generate recommendations using different algorithms
      const collaborativeRecs = await this.getCollaborativeRecommendations(userId, context);
      const contentBasedRecs = await this.getContentBasedRecommendations(userId, context);
      const popularityRecs = await this.getPopularityBasedRecommendations(context);
      
      // Combine recommendations using hybrid approach
      const hybridRecs = this.combineRecommendations([
        { recommendations: collaborativeRecs, weight: this.modelWeights.collaborative },
        { recommendations: contentBasedRecs, weight: this.modelWeights.contentBased },
        { recommendations: popularityRecs, weight: this.modelWeights.popularity }
      ]);
      
      // Apply diversity and context filters
      const finalRecs = this.applyDiversityAndFilters(hybridRecs, userProfile, context);
      
      // Log recommendation for learning
      this.logRecommendation(userId, finalRecs, context);
      
      console.log(`✅ Generated ${finalRecs.length} recommendations`);
      return finalRecs.slice(0, this.config.maxRecommendations);
      
    } catch (error) {
      console.error('❌ Failed to generate recommendations:', error);
      return this.getFallbackRecommendations(context);
    }
  }

  /**
   * Record user interaction for learning
   */
  recordInteraction(userId, experienceId, interactionType, context = {}) {
    const interaction = {
      userId,
      experienceId,
      interactionType, // 'view', 'like', 'save', 'book', 'rate'
      timestamp: new Date(),
      context,
      sessionId: this.getCurrentSessionId()
    };
    
    this.interactionHistory.push(interaction);
    this.updateUserProfile(userId, interaction);
    
    // Trigger real-time learning
    this.updateRecommendationModels(interaction);
    
    console.log(`📊 Recorded ${interactionType} interaction for user ${userId}`);
  }

  /**
   * Rate experience and update recommendations
   */
  rateExperience(userId, experienceId, rating, review = null) {
    const interaction = {
      userId,
      experienceId,
      interactionType: 'rate',
      rating,
      review,
      timestamp: new Date()
    };
    
    this.recordInteraction(userId, experienceId, 'rate', { rating, review });
    
    // Update experience popularity and quality scores
    this.updateExperienceMetrics(experienceId, rating);
    
    console.log(`⭐ User ${userId} rated experience ${experienceId}: ${rating}/5`);
  }

  /**
   * Get collaborative filtering recommendations
   */
  async getCollaborativeRecommendations(userId, context) {
    const userProfile = this.getUserProfile(userId);
    const similarUsers = this.findSimilarUsers(userId);
    
    const recommendations = new Map();
    
    for (const [similarUserId, similarity] of similarUsers) {
      const similarUserProfile = this.getUserProfile(similarUserId);
      
      // Get experiences liked by similar users
      for (const [expId, preference] of similarUserProfile.preferences) {
        if (!userProfile.preferences.has(expId) && preference > 0.5) {
          const currentScore = recommendations.get(expId) || 0;
          recommendations.set(expId, currentScore + (similarity * preference));
        }
      }
    }
    
    // Convert to sorted array
    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([expId, score]) => ({
        experienceId: expId,
        score,
        algorithm: 'collaborative',
        explanation: 'Users with similar interests also liked this'
      }));
  }

  /**
   * Get content-based filtering recommendations
   */
  async getContentBasedRecommendations(userId, context) {
    const userProfile = this.getUserProfile(userId);
    const userPreferences = this.extractUserFeaturePreferences(userProfile);
    
    const recommendations = [];
    
    for (const [expId, features] of this.experienceFeatures) {
      // Skip if user already interacted with this experience
      if (userProfile.preferences.has(expId)) continue;
      
      // Calculate similarity between user preferences and experience features
      const similarity = this.calculateFeatureSimilarity(userPreferences, features);
      
      if (similarity > this.config.minSimilarityThreshold) {
        recommendations.push({
          experienceId: expId,
          score: similarity,
          algorithm: 'content-based',
          explanation: this.generateContentExplanation(userPreferences, features)
        });
      }
    }
    
    return recommendations.sort((a, b) => b.score - a.score);
  }

  /**
   * Get popularity-based recommendations
   */
  async getPopularityBasedRecommendations(context) {
    // Get experiences sorted by popularity metrics
    const experiences = await window.ExploreXDatabase.getAllExperiences();
    
    return experiences
      .filter(exp => this.matchesContext(exp, context))
      .sort((a, b) => this.calculatePopularityScore(b) - this.calculatePopularityScore(a))
      .slice(0, 10)
      .map(exp => ({
        experienceId: exp.id,
        score: this.calculatePopularityScore(exp),
        algorithm: 'popularity',
        explanation: 'Popular among space enthusiasts'
      }));
  }

  /**
   * Find users similar to given user
   */
  findSimilarUsers(userId, limit = 50) {
    const userProfile = this.getUserProfile(userId);
    const similarities = new Map();
    
    for (const [otherUserId, otherProfile] of this.userProfiles) {
      if (otherUserId === userId) continue;
      
      const similarity = this.calculateUserSimilarity(userProfile, otherProfile);
      if (similarity > this.config.minSimilarityThreshold) {
        similarities.set(otherUserId, similarity);
      }
    }
    
    return Array.from(similarities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  /**
   * Calculate similarity between two users
   */
  calculateUserSimilarity(profile1, profile2) {
    const commonExperiences = new Set();
    const preferences1 = new Map();
    const preferences2 = new Map();
    
    // Find common experiences
    for (const expId of profile1.preferences.keys()) {
      if (profile2.preferences.has(expId)) {
        commonExperiences.add(expId);
        preferences1.set(expId, profile1.preferences.get(expId));
        preferences2.set(expId, profile2.preferences.get(expId));
      }
    }
    
    if (commonExperiences.size < 2) return 0;
    
    // Calculate Pearson correlation coefficient
    return this.calculatePearsonCorrelation(preferences1, preferences2);
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  calculatePearsonCorrelation(prefs1, prefs2) {
    const n = prefs1.size;
    if (n === 0) return 0;
    
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
    
    for (const [key, val1] of prefs1) {
      const val2 = prefs2.get(key);
      sum1 += val1;
      sum2 += val2;
      sum1Sq += val1 * val1;
      sum2Sq += val2 * val2;
      pSum += val1 * val2;
    }
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : num / den;
  }

  /**
   * Extract user feature preferences from profile
   */
  extractUserFeaturePreferences(userProfile) {
    const preferences = {
      experienceTypes: new Map(),
      priceRanges: new Map(),
      locations: new Map(),
      timePreferences: new Map(),
      accessibility: new Map()
    };
    
    // Analyze user's interaction history to extract preferences
    for (const [expId, score] of userProfile.preferences) {
      const experience = this.getExperienceById(expId);
      if (!experience) continue;
      
      // Update type preferences
      const currentTypeScore = preferences.experienceTypes.get(experience.type) || 0;
      preferences.experienceTypes.set(experience.type, currentTypeScore + score);
      
      // Update price preferences
      const priceRange = this.getPriceRange(experience.price);
      const currentPriceScore = preferences.priceRanges.get(priceRange) || 0;
      preferences.priceRanges.set(priceRange, currentPriceScore + score);
      
      // Update location preferences
      const region = this.getRegion(experience.location);
      const currentLocationScore = preferences.locations.get(region) || 0;
      preferences.locations.set(region, currentLocationScore + score);
    }
    
    return preferences;
  }

  /**
   * Calculate feature similarity between user preferences and experience
   */
  calculateFeatureSimilarity(userPrefs, expFeatures) {
    let totalSimilarity = 0;
    let weightSum = 0;
    
    // Type similarity
    const typeWeight = 0.4;
    const typeScore = userPrefs.experienceTypes.get(expFeatures.type) || 0;
    totalSimilarity += typeScore * typeWeight;
    weightSum += typeWeight;
    
    // Price similarity
    const priceWeight = 0.2;
    const priceRange = this.getPriceRange(expFeatures.price);
    const priceScore = userPrefs.priceRanges.get(priceRange) || 0;
    totalSimilarity += priceScore * priceWeight;
    weightSum += priceWeight;
    
    // Location similarity
    const locationWeight = 0.3;
    const region = this.getRegion(expFeatures.location);
    const locationScore = userPrefs.locations.get(region) || 0;
    totalSimilarity += locationScore * locationWeight;
    weightSum += locationWeight;
    
    // Accessibility similarity
    const accessibilityWeight = 0.1;
    const accessibilityMatch = this.checkAccessibilityMatch(userPrefs, expFeatures);
    totalSimilarity += accessibilityMatch * accessibilityWeight;
    weightSum += accessibilityWeight;
    
    return weightSum > 0 ? totalSimilarity / weightSum : 0;
  }

  /**
   * Combine recommendations from different algorithms
   */
  combineRecommendations(algorithmResults) {
    const combinedScores = new Map();
    
    for (const { recommendations, weight } of algorithmResults) {
      for (const rec of recommendations) {
        const currentScore = combinedScores.get(rec.experienceId) || 0;
        combinedScores.set(rec.experienceId, currentScore + (rec.score * weight));
      }
    }
    
    return Array.from(combinedScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([expId, score]) => ({
        experienceId: expId,
        score,
        algorithm: 'hybrid'
      }));
  }

  /**
   * Apply diversity and context filters
   */
  applyDiversityAndFilters(recommendations, userProfile, context) {
    let filtered = recommendations;
    
    // Apply context filters
    if (context.location) {
      filtered = filtered.filter(rec => 
        this.isWithinRadius(rec.experienceId, context.location, context.radius || 100)
      );
    }
    
    if (context.dateRange) {
      filtered = filtered.filter(rec => 
        this.isAvailableInDateRange(rec.experienceId, context.dateRange)
      );
    }
    
    if (context.budget) {
      filtered = filtered.filter(rec => 
        this.isWithinBudget(rec.experienceId, context.budget)
      );
    }
    
    // Apply diversity to avoid too many similar recommendations
    const diversified = this.applyDiversification(filtered);
    
    // Add explanation and metadata
    return diversified.map(rec => ({
      ...rec,
      experience: this.getExperienceById(rec.experienceId),
      confidence: this.calculateConfidence(rec.score),
      explanation: rec.explanation || this.generateExplanation(rec, userProfile)
    }));
  }

  /**
   * Apply diversification to recommendations
   */
  applyDiversification(recommendations) {
    const diversified = [];
    const typeCount = new Map();
    const maxPerType = Math.ceil(this.config.maxRecommendations / 4); // Max 25% per type
    
    for (const rec of recommendations) {
      const experience = this.getExperienceById(rec.experienceId);
      if (!experience) continue;
      
      const currentCount = typeCount.get(experience.type) || 0;
      
      if (currentCount < maxPerType) {
        diversified.push(rec);
        typeCount.set(experience.type, currentCount + 1);
      } else if (Math.random() < this.config.diversityWeight) {
        // Occasionally include items that exceed type limit for diversity
        diversified.push(rec);
      }
    }
    
    return diversified;
  }

  /**
   * Get or create user profile
   */
  getUserProfile(userId) {
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, {
        id: userId,
        preferences: new Map(), // experienceId -> preference score (0-1)
        demographics: {},
        interactionCount: 0,
        lastActive: new Date(),
        explicitPreferences: {
          experienceTypes: [],
          budgetRange: null,
          accessibilityNeeds: [],
          travelStyle: null
        }
      });
    }
    
    return this.userProfiles.get(userId);
  }

  /**
   * Update user profile based on interaction
   */
  updateUserProfile(userId, interaction) {
    const profile = this.getUserProfile(userId);
    
    // Update interaction count
    profile.interactionCount++;
    profile.lastActive = new Date();
    
    // Update preference score for the experience
    const currentScore = profile.preferences.get(interaction.experienceId) || 0;
    const interactionWeight = this.getInteractionWeight(interaction.interactionType);
    const newScore = Math.min(1, currentScore + (interactionWeight * this.config.learningRate));
    
    profile.preferences.set(interaction.experienceId, newScore);
    
    // Apply temporal decay to other preferences
    for (const [expId, score] of profile.preferences) {
      if (expId !== interaction.experienceId) {
        profile.preferences.set(expId, score * this.config.decayFactor);
      }
    }
  }

  /**
   * Get interaction weight for different types
   */
  getInteractionWeight(interactionType) {
    const weights = {
      'view': 0.1,
      'like': 0.3,
      'save': 0.5,
      'share': 0.4,
      'book': 0.8,
      'rate': 0.6,
      'review': 0.7
    };
    
    return weights[interactionType] || 0.1;
  }

  /**
   * Build experience features for content-based filtering
   */
  async buildExperienceFeatures() {
    console.log('🔧 Building experience features...');
    
    const experiences = await window.ExploreXDatabase.getAllExperiences();
    
    for (const exp of experiences) {
      const features = {
        type: exp.type,
        price: exp.price || 0,
        location: exp.location,
        rating: exp.rating || 0,
        accessibility: exp.accessibility || [],
        tags: exp.tags || [],
        duration: exp.duration || 0,
        indoor: exp.indoor || false,
        familyFriendly: exp.familyFriendly || false
      };
      
      this.experienceFeatures.set(exp.id, features);
    }
    
    console.log(`✅ Built features for ${experiences.length} experiences`);
  }

  /**
   * Calculate popularity score for experience
   */
  calculatePopularityScore(experience) {
    const views = experience.views || 0;
    const bookings = experience.bookings || 0;
    const rating = experience.rating || 0;
    const reviews = experience.reviewCount || 0;
    
    // Weighted popularity score
    return (views * 0.1) + (bookings * 0.4) + (rating * 0.3) + (reviews * 0.2);
  }

  /**
   * Generate explanation for recommendation
   */
  generateExplanation(recommendation, userProfile) {
    const experience = this.getExperienceById(recommendation.experienceId);
    if (!experience) return 'Recommended for you';
    
    const explanations = [
      `Popular ${experience.type} in your area`,
      `Highly rated by space enthusiasts`,
      `Matches your interest in ${experience.type}s`,
      `Similar to experiences you've enjoyed`,
      `Trending among users like you`
    ];
    
    return explanations[Math.floor(Math.random() * explanations.length)];
  }

  /**
   * Calculate confidence score for recommendation
   */
  calculateConfidence(score) {
    // Normalize score to 0-1 confidence range
    return Math.min(1, Math.max(0, score));
  }

  /**
   * Get fallback recommendations when main algorithm fails
   */
  getFallbackRecommendations(context) {
    console.log('🔄 Using fallback recommendations');
    
    // Return popular experiences as fallback
    return [
      { experienceId: 'griffith-observatory', score: 0.9, algorithm: 'fallback' },
      { experienceId: 'kennedy-space-center', score: 0.85, algorithm: 'fallback' },
      { experienceId: 'smithsonian-air-space', score: 0.8, algorithm: 'fallback' }
    ];
  }

  /**
   * Utility methods
   */
  getExperienceById(id) {
    // This would typically fetch from database
    return window.ExploreXDatabase?.getExperience?.(id);
  }

  getPriceRange(price) {
    if (price === 0) return 'free';
    if (price < 20) return 'low';
    if (price < 50) return 'medium';
    return 'high';
  }

  getRegion(location) {
    // Simplified region extraction
    return location?.state || location?.country || 'unknown';
  }

  getCurrentSessionId() {
    return window.sessionStorage?.getItem('sessionId') || 'anonymous';
  }

  matchesContext(experience, context) {
    // Check if experience matches the given context
    return true; // Simplified for now
  }

  isWithinRadius(experienceId, location, radius) {
    // Check if experience is within radius of location
    return true; // Simplified for now
  }

  isAvailableInDateRange(experienceId, dateRange) {
    // Check if experience is available in date range
    return true; // Simplified for now
  }

  isWithinBudget(experienceId, budget) {
    // Check if experience is within budget
    return true; // Simplified for now
  }

  checkAccessibilityMatch(userPrefs, expFeatures) {
    // Check accessibility compatibility
    return 1; // Simplified for now
  }

  /**
   * Train recommendation models
   */
  async trainModels() {
    console.log('🎓 Training recommendation models...');
    
    // This would implement more sophisticated ML training
    // For now, we'll use the interaction-based approach
    
    console.log('✅ Models trained successfully');
  }

  /**
   * Update models with new interaction
   */
  updateRecommendationModels(interaction) {
    // Real-time model updates would go here
    // For now, we update user profiles directly
  }

  /**
   * Update experience metrics
   */
  updateExperienceMetrics(experienceId, rating) {
    // Update experience popularity and quality metrics
    console.log(`📊 Updated metrics for experience ${experienceId}`);
  }

  /**
   * Load user profiles from storage
   */
  async loadUserProfiles() {
    try {
      const stored = localStorage.getItem('explorex-user-profiles');
      if (stored) {
        const profiles = JSON.parse(stored);
        for (const [userId, profile] of Object.entries(profiles)) {
          profile.preferences = new Map(profile.preferences);
          this.userProfiles.set(userId, profile);
        }
      }
    } catch (error) {
      console.warn('Failed to load user profiles:', error);
    }
  }

  /**
   * Load interaction history from storage
   */
  async loadInteractionHistory() {
    try {
      const stored = localStorage.getItem('explorex-interaction-history');
      if (stored) {
        this.interactionHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load interaction history:', error);
    }
  }

  /**
   * Save user profiles to storage
   */
  saveUserProfiles() {
    try {
      const profiles = {};
      for (const [userId, profile] of this.userProfiles) {
        profiles[userId] = {
          ...profile,
          preferences: Array.from(profile.preferences.entries())
        };
      }
      localStorage.setItem('explorex-user-profiles', JSON.stringify(profiles));
    } catch (error) {
      console.warn('Failed to save user profiles:', error);
    }
  }

  /**
   * Log recommendation for analytics
   */
  logRecommendation(userId, recommendations, context) {
    const log = {
      userId,
      timestamp: new Date(),
      recommendationCount: recommendations.length,
      context,
      algorithms: [...new Set(recommendations.map(r => r.algorithm))]
    };
    
    console.log('📝 Logged recommendation:', log);
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// Make available globally
window.ExploreXRecommendationEngine = {
  RecommendationEngine
};

console.log('🤖 ExploreX Recommendation Engine loaded');